---
name: adpa-doc-gen-queue
description: Use when working on document generation code in ADPA — modifying the generate route, AIGenerationJobService, documentGenerationService, or handleCreateDocument in page.tsx. Use when tempted to make generation synchronous, bypass the queue, or add a "fast path" that awaits the full generation inline.
---

# ADPA Document Generation — Job Queue Discipline

## Core Rule

**ALL template-based document generation MUST go through the RabbitMQ job queue.**

Never `await documentGenerationService.generateDocument(...)` directly inside an HTTP request handler for template-based generation. Templates always go async.

## Why This Rule Exists

The agentic document generation pipeline (plan → parallel section drafting → assemble) takes **3–10+ minutes** even for small templates. The Next.js proxy has a hard socket timeout shorter than that. Synchronous generation causes:

- `ECONNRESET` / `socket hang up` on the frontend proxy
- `HTTP error! status: 500` surfaced to the user  
- No recoverable error — the job is simply lost

This was the exact failure mode that caused this rule to be written.

## API Contract & Validation Schema

The backend Express route (`POST /api/document-generation/generate`) enforces a strict validation schema via Joi. The schema defaults to stripping or rejecting unknown fields (`stripUnknown: false` effectively, meaning unlisted fields cause validation errors).

**Required Payload Structure:**
```typescript
{
  projectId: string; // Required (UUID)
  name: string;      // Required
  userPrompt: string; // Required (NOT "prompt")
  provider: string;  // Required
  templateId?: string; // Optional (NOT "template_id")
  model?: string;
  temperature?: number;
  max_tokens?: number; // Permitted explicitly
  generation_metadata?: object; // Permitted explicitly for additional job tracing context
  async?: boolean; // Must be true for background queueing
}
```

*Note: Frontend clients must use exactly these camelCase keys (e.g. `templateId`, not `template_id`) to avoid `400 Validation failed` errors before the job even reaches the queue.*

## Architecture (Do Not Change Without Good Reason)

```
POST /api/document-generation/generate
  └─ templateId present?
       YES → getQueueService().addJob('ai-generate', payload) → return 202 { jobId }
       NO  → documentGenerationService.generateDocument() synchronously (fast, no template)

RabbitMQ worker (AIGenerationJobService)
  └─ template_id present in job?
       YES → documentGenerationService.generateDocument() (agentic pipeline)
       NO  → ContextAwareAIService (legacy path)

Frontend (handleCreateDocument in page.tsx)
  └─ response.async === true?
       YES → subscribe to job:status / job:completed / job:failed WebSocket events
       NO  → treat response.document as the created document (sync path)
```

**Key files:**
- `server/src/routes/documentGeneration.ts` — routing decision (`shouldRunAsync = forceAsync || !!templateId`)
- `server/src/services/jobs/AIGenerationJobService.ts` — `generateContent()` agentic bridge
- `app/projects/[id]/page.tsx` — `handleCreateDocument()` async/sync branching

## When You Might Be Tempted to Bypass the Queue

These are rationalisations. All of them are wrong for template-based generation:

| Temptation | Why It Fails |
|---|---|
| "This template only has 1 section, it'll be fast" | The planning phase alone takes 30–60s. Still times out. |
| "I'll add a timeout and retry on the client" | Retrying a timed-out generation creates duplicate jobs. |
| "The user wants to see the result immediately" | The modal stays open and shows live progress via WebSocket. |
| "RabbitMQ is down so I'll fall back to sync" | Return a clean 503 instead. Never fall back to sync for templates. |
| "I just need a quick test endpoint" | Use `async: true` flag in the payload — the queue path handles it. |
| "The frontend can handle a 2-minute fetch" | It can't — the Next.js proxy timeout is outside our control. |

## Queue Payload Schema (`ai-generate`)

The `aiGenerationJobDataSchema` in `server/src/services/jobs/validation.ts` validates all payloads. Required fields:

```typescript
{
  jobId: string           // UUID — generate with uuidv4()
  userId: string | null   // from req.user?.id
  projectId: string       // UUID
  prompt: string          // the user's prompt (NOT "userPrompt")
  provider: string        // normalised provider name (e.g. "mistral")
  template_id: string     // UUID — triggers the agentic pipeline in the worker
  // Optional:
  model?: string | null
  temperature?: number
  name?: string           // document name
  description?: string
  use_context?: boolean   // always true for template jobs
  template_name?: string  // resolved from templates table — non-fatal if missing
}
```

> ⚠️ The field is `prompt`, not `userPrompt`. Using the wrong key causes silent validation failure → `JobValidationError` → crash before 202 is sent → ECONNRESET on the frontend.

## Adding the Queue Error Guard

Always wrap `addJob` in try-catch. A missing/restarting RabbitMQ instance must never take down the HTTP connection:

```typescript
try {
  await getQueueService().addJob('ai-generate', jobPayload)
} catch (queueErr) {
  log.error('[DOC-GEN] Failed to enqueue ai-generate job', queueErr)
  return res.status(503).json({
    error: 'Job queue is unavailable. Please try again shortly.',
    details: queueErr instanceof Error ? queueErr.message : String(queueErr),
  })
}
return res.status(202).json({ jobId, async: true, message: '...' })
```

## Frontend WebSocket Contract

The frontend modal subscribes to `job:status`, `job:completed`, `job:failed` events filtered by `jobId`. The WebSocket context (`contexts/WebSocketContext.tsx`) already broadcasts these globally. The component cleans up listeners on resolve/reject — no leaks.

Do **not** poll `GET /api/jobs/:id` from the frontend for document generation progress. WebSocket events are the source of truth.

## Avoiding Job Service Crash (The "id argument must be a string" error)

Job services (like `AIGenerationJobService` and `BaselineExtractionJobService`) often need to lazy-load other complex services to break circular dependencies. 
**NEVER** use dynamic string variables in `require()` calls inside job processors.

**INCORRECT (will crash Webpack/Node):**
```typescript
const serviceName = '../documentGenerationService'
const { documentGenerationService } = require(serviceName) // Crash: id argument must be of type string
```

**CORRECT:**
```typescript
const { documentGenerationService } = require('../documentGenerationService')
```

## Testing Document Generation Queues

When writing Jest tests for governed features involving queues:
1. Ensure `shutdownQueues()` from `queueService` and `disconnectRedis()` from `utils/redis` are executed in the global `afterAll` hook (`setup.ts`).
2. Always pass `--forceExit` to `npm run test:features` to forcefully exit the worker. RabbitMQ heartbeats and underlying socket connections often outlive the Jest test completion threshold despite being correctly instructed to close.

## Job Cancellation Is a Terminal State — It Must Cascade and Must Not Be Resurrected

**The bug this section guards against**: the 15-minute `ai-generate` timeout in `registerWorkers.ts` used to `UPDATE jobs SET status = 'failed' ...` directly and reject the racing `Promise.race`. Rejecting the race does **not** stop the underlying `AIGenerationJobService.processJob()` call — Node cannot cancel an in-flight promise. That orphaned call kept running, and its own progress-heartbeat/completion writes (`QueueService.updateJobStatus`) silently flipped the job's status right back to `processing`. Observed live: the same job flapping `failed → processing → failed → processing` for over an hour, each cycle re-running the draft-placeholder pre-insert and minting another duplicate document row for the same generation request.

**The fix, as two hard rules:**

1. **`QueueService.updateJobStatus()` must never write over a `cancelled` job.** Every status write it issues includes `WHERE id = $N AND status != 'cancelled'` in the SQL. This is what actually stops the zombie-resurrection: once cancelled, no heartbeat, no completion write, no failure write from an orphaned execution can revive the job.
2. **`QueueService.cancelJob(jobId, reason?)` cascades to the document it owns.** The `UPDATE jobs SET status = 'cancelled' ...` is itself guarded (`WHERE status NOT IN ('cancelled', 'completed', 'failed')`, `RETURNING data`) so a cancel can only apply once, to a job still in flight. If the returned row has `data.documentId`, the document is also updated to `status = 'cancelled'` (itself guarded against overwriting an already-`completed`/`approved` document). This means:
   - A user hitting **Cancel** on a running generation, and
   - The 15-minute timeout in `registerWorkers.ts` firing (it now calls `cancelJob(jobId, reason)` instead of writing `status='failed'` directly)

   both go through the **same** cancellation path, and both leave the document in an honest `cancelled` state instead of a stale empty `draft` placeholder or a misleading `failed` row that then flips back to alive.

**Contract test**: `server/src/__tests__/services/jobs/AIGenerationJobService.cancellation.test.ts` — verifies the guarded SQL shape on both `cancelJob` and `updateJobStatus`, verifies the document cascade only fires when the job UPDATE actually returned a row (i.e., was genuinely non-terminal), and verifies a job that's already terminal leaves its document untouched. Run it whenever you touch cancellation, the 15-minute timeout, or `QueueService`'s status-write methods.

## Only One Live Invocation May Ever Process a Job — Enforced at the DB, Not the Broker

**The bug this guards against**: a single `ai-generate` job was observed running concurrently on the *same unchanged worker process* (no restart) for ~2 hours. Its own `llm_insights` log showed `Plan Document Structure` and `Draft Section 1` each captured **twice**, with entries as little as **822ms apart** — proof of two live invocations racing on the same job, not sequential retries. Its `llmProgressSteps` array (what the Job Monitor UI's step list renders from) got wholesale overwritten mid-flight: sections already drafted flipped back to `pending` when a second invocation reset the array — this is the "sections build up, then fall back and disappear" symptom.

**Why this happens regardless of what you do to RabbitMQ config**: a message can reach more than one live handler invocation for reasons that have nothing to do with your queue settings — `amqp-connection-manager` (this app's Rabbit client) auto-reconnects on a dropped channel and redelivers any unacked message to the new connection, while the *original* handler's JS promise chain has no idea its channel died and keeps running to completion. Same root shape as a broker `consumer_timeout`, a manual retry racing an in-flight attempt, or (in a future multi-node deployment) two separate workers entirely. **You cannot fix this by tuning prefetch, acks, or timeouts** — those all still allow a window where two invocations of the handler exist at once.

**The fix**: don't try to prevent duplicate delivery — make duplicate *processing* impossible. `AIGenerationJobService.processJob()` opens with an atomic claim, before any other work:

```sql
UPDATE jobs
SET status = 'processing', worker_id = $2, processing_started_at = CURRENT_TIMESTAMP
WHERE id = $1
  AND status NOT IN ('cancelled', 'completed', 'failed')
  AND (processing_started_at IS NULL OR processing_started_at < NOW() - ($3::int * INTERVAL '1 second'))
RETURNING id
```

If zero rows come back, another invocation holds a live lease — this invocation returns `{ skipped: true, reason: 'job already claimed by an in-flight attempt' }` immediately, **before** calling `generateContent`, before the progress heartbeat, before anything. No new columns or migration: `processing_started_at` is reused as both the liveness heartbeat (already refreshed every 4s by `startProgressHeartbeat`) and the staleness threshold (`AI_GENERATE_CLAIM_STALE_SECONDS`, default 30s) — a lease with no heartbeat in that window is presumed dead and may be reclaimed, so a genuinely crashed holder doesn't block the job forever.

**Why this is airtight regardless of broker state**: the guarantee comes from Postgres's row-level `UPDATE` semantics, not from anything about message delivery. Two concurrent `UPDATE ... WHERE ...` statements targeting the same row are serialized by Postgres itself — the second one blocks until the first commits, then re-evaluates its `WHERE` clause against the now-committed row. It doesn't matter *why* a duplicate invocation exists; it only matters that exactly one `UPDATE` can win the race for a given job id at a time. Do not replace this with a `SELECT`-then-`UPDATE` check, an in-memory lock, or anything that isn't a single atomic statement — those all reopen the exact race this closes.

**Contract test**: `server/src/__tests__/services/jobs/AIGenerationJobService.concurrency.test.ts` — verifies a fresh job gets claimed and processed normally, verifies a job with a live (non-expired) lease is skipped **without ever calling `generateDocument`**, and verifies the claim SQL includes the staleness fallback so a dead holder's lease is reclaimable. Run it whenever you touch `processJob()`'s entry sequence, the progress heartbeat, or `AI_GENERATE_CLAIM_STALE_SECONDS`.

## If RabbitMQ Is Down

Return 503. Do not fall back to synchronous generation. Surface a clear error to the user:
> "Job queue is unavailable — please try again in a moment."

This is better UX than a cryptic `socket hang up` after 2 minutes of waiting.

## Governed feature packet (`doc-gen`)

Registered in `server/governed-features.manifest.json` with `testPathPattern: documentGenerationService`. Paired skill: `adpa-template-driven-generation`. Load `adpa-governed-feature-loop` when adding new doc-gen tests or registering another packet.

```powershell
cd server
npm run test:features -- doc-gen
npm run test:doc-gen          # alias
npm run verify:governed-features
```

Key test files:

| File | Covers |
| ---- | ------ |
| `server/src/__tests__/documentGenerationService.rag.test.ts` | Section-scoped RAG, `sourceDocumentIds`, entity JSON in prompts |
| `server/src/__tests__/documentGenerationService.templateParagraphs.test.ts` | Template paragraphs, concurrency, job resumption, LLM snapshots, section-count safety ceiling |
| `server/src/__tests__/services/jobs/AIGenerationJobService.cancellation.test.ts` | Job cancellation cascades to its document; cancelled jobs can't be resurrected by orphaned status writes |
