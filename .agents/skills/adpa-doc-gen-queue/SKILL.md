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
| `server/src/__tests__/documentGenerationService.templateParagraphs.test.ts` | Template paragraphs, concurrency, job resumption, LLM snapshots |
