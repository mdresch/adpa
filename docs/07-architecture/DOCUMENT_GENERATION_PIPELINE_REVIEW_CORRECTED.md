# ADPA Document Generation Pipeline — Corrected Review

**Status:** Supersedes the prior static-only review ("ADPA Document Generation Pipeline: Step-by-Step Review & Final-Audit Simplification Assessment", 2026-07-06, v1)
**Date:** 2026-07-06
**Method:** Static code review (as v1) **plus** live incident investigation of an active production bug, direct verification of every factual claim in v1 against the working tree, and cross-checking against real job/queue state (Postgres `jobs` table + RabbitMQ management API).

---

## 1. Why This Version Exists

v1 was a static, read-only review. It answered "can the final audits be simplified?" reasonably well, but it was written without knowledge of — and does not explain — the actual incident that prompted this work: a document generation job for the "Defense - 24/7 SOCs Architecture" project got stuck in a loop, producing 36+ duplicate "Ideation Template" documents over several hours on 2026-07-06. That loop was stopped today by manually purging the RabbitMQ queue — the same manual fix that was already applied once before, on **2026-07-01**, for the same project, with no code change behind it either time.

This version:
- Leads with the incident and its actual root cause (Section 2) — the piece v1 was missing entirely.
- Corrects several factual errors in v1, found by independently verifying every claim against the current code (Section 4, with a full changelog in Section 7).
- Keeps what v1 got right: the audit/DRACO architecture description and the recommendation to make DRACO conditional are both confirmed accurate.

---

## 2. Root Cause: The Recurring Stuck-Job Loop

### 2.1 What happened

On 2026-07-06, a document-generation job (`ai-generate`, id `b135468f-...`) for project `983b7230-...` ("Defense - 24/7 SOCs Architecture") never reached a stable terminal state. Over several hours it was reprocessed repeatedly, producing 36 duplicate "Ideation Template" documents and piling up 11+ duplicate copies of the same message in the `ai-processing` RabbitMQ queue. Stopping it required: cancelling the DB-tracked job rows, then purging the live queue directly via the RabbitMQ management API (the message was cycling faster than a live purge could catch it, requiring a brief consumer pause).

**This is not a new failure mode.** A job for the *same project* (`2cf02144-...`, dated 2026-07-01) carries this exact error message, written in at the time:

> *"Permanently terminated: infinite retry loop creating duplicate blank documents. Queue messages purged 2026-07-01. Start a new generation manually if this document is still needed."*

That is direct evidence someone manually diagnosed and fixed the identical symptom five days earlier, the same way — by hand, at the ops level, with no code fix. It was guaranteed to recur, and did.

### 2.2 The actual mechanism (verified against source)

Three cooperating defects, found by direct code reading, not inference:

1. **`server/src/services/jobs/AIGenerationJobService.ts:716-718`** — the block that persists a generated document and triggers its side effects (approval-request creation, entity-sync enqueue, RAG ingestion, template analytics) is wrapped in:
   ```ts
   } catch (docErr: any) {
     log.error(`Failed to create document for job ${jobId}:`, docErr)
   }
   ```
   This catches and logs but **never rethrows**. Execution falls through to the unconditional `UPDATE jobs SET status = 'completed', ...` a few lines later (L205-216). A job whose post-generation side effects failed — or, more importantly for this incident, a job whose generation itself produced a degraded/partial result — can still be recorded as `completed`, masking the real outcome.

2. **`server/src/services/jobs/AIGenerationJobService.ts:660-669`** — every time this job is *processed*, it unconditionally creates a **new** document row and enqueues a **new** `save-inline-entities` child job (`parentJobId: jobId, autoTriggered: true, triggeredBy: 'ai-generate'`). There is no check for "does this project already have a document from this job." That's why the incident produced dozens of distinct child job IDs and dozens of distinct documents all tracing back to one parent job — the handler is not idempotent across repeated invocations of the same job.

3. **`server/src/services/stuckJobMonitor.ts:140-182`** — when a job sits at `status = 'processing'` past a 30-minute threshold, this monitor republishes it to RabbitMQ **reusing the same job ID**, resets its DB status to `pending`, and lets a worker pick it up again — bounded by a `MAX_REQUEUE` cap and an `isNeverRequeueJob` exclusion list. The comment at line 140 reads:
   > *"...which is how a near-identical runaway loop happened twice."*

   This is not a hypothesis — it's the codebase's own documented institutional memory of this exact bug class. The cap limits how many times *this specific monitor* will requeue a job, but does nothing to make the underlying handler idempotent, and does nothing to stop a job from being reprocessed by other means (e.g., a genuinely new submission through the UI hitting the same permanently-broken code path).

Separately, `server/src/services/jobs/queue/RabbitQueueAdapter.ts` has a *correct*, bounded retry-then-dead-letter mechanism (3 attempts with exponential backoff, then to `<queue>.dlq`) — but it only engages when the registered handler **throws**. Given defect #1 above, a failure inside the document-persistence path is swallowed rather than thrown, so this safety net can be silently bypassed by exactly the kind of error this incident involved.

`server/src/services/queue/registerWorkers.ts:61-70` already contains a recently-added guard — checking whether a job is already `cancelled/failed/completed` in the DB before processing a delivered message — explicitly to defend against "broker redelivery after a dropped connection, or an orphan-recovery republish." This confirms the team has been iterating on this exact problem already; it just isn't sufficient on its own, since a job that was never marked terminal (per defect #1) won't be caught by this check either.

### 2.3 What triggered this specific job

Not fully provable after the fact (the poison message was purged before its exact fields could be captured), but one concrete lead: **`app/projects/components/dialogs/GenerateDocumentModal.tsx`** — the real, user-facing "Generate Document" dialog — is the literal source of the default prompt text found in the job payload ("Generate a comprehensive document for the {project} project using the {framework} framework. Include project overview, objectives, timeline, and key deliverables."). Two things in this file are worth fixing regardless of whether they caused this specific incident:

- **L170: `async: true` is hardcoded**, sent on every submission regardless of whether a template is selected. Combined with `documentGeneration.ts`'s `shouldRunAsync = forceAsync || !!templateId` (route logic), this means *every* generation from this dialog goes through the queue, even simple prompt-only requests that the route was designed to run synchronously.
- **L40/65-66: default provider is `"Groq AI"`** (a display label, not the canonical provider key `"groq"`), with default model `llama-3.1-8b-instant`. This environment's active AI providers (confirmed via server startup log) are Google Gemini, Ollama (x2), and Foundry Local — **no Groq provider is configured here.** `aiService.ts:858-878` looks up the provider by `provider_type = $1 OR LOWER(name) = LOWER($1)`; if that lookup and the env-map fallback both miss, it throws a clear `Provider not found or inactive: Groq AI` — which is *not* the error actually observed (`AI_APICallError: Not Found` from `OpenAIResponsesLanguageModel`). So either a provider *was* configured for this project at some point and later removed/deactivated, or a different provider/model combination was actually selected for this specific job. Either way, this default is a live footgun: submitting this dialog without changing the provider dropdown in an environment where Groq isn't configured will fail every single time — a permanent, not transient, failure, which is exactly the kind of error that should never be handed to a requeue-and-retry mechanism.

### 2.4 Recommended fix (not yet applied — pending your go-ahead)

1. **`AIGenerationJobService.ts:716-718`** — rethrow (or explicitly mark the job `failed` with the real error) instead of swallowing. A failure here must not be recorded as `completed`.
2. **`AIGenerationJobService.ts:660-669`** — before creating a new document + child job, check whether this specific job ID has already produced one (e.g., a `WHERE parent_job_id = $1` guard, or an idempotency key), so reprocessing the same job can't multiply documents.
3. **`stuckJobMonitor.ts`** — classify errors before requeueing: a 404/"model not found"/"provider not found"-class error is permanent and should route straight to `failed` (and ideally straight to the DLQ), never back into `pending`. Reserve requeue for genuinely transient conditions (connection drops, timeouts, 429s).
4. **`GenerateDocumentModal.tsx`** — default `provider`/`model` should be validated against this environment's actually-active providers (or simply default to whichever provider the backend reports as active), not a hardcoded label that may not exist in every environment. Consider also not forcing `async: true` unconditionally — let the route's own `templateId`-based logic decide.

None of these four changes have been made yet. They're scoped narrowly enough to be a single, reviewable change to the `document-generation-resiliency` governed feature (Contract Guards already exist at `server/src/__tests__/modules/document-generation-resiliency/documentGenerationResiliency.test.ts` and should be extended, not bypassed, per that packet's own rules).

---

## 3. The Visual Pipeline: Broken, Not Dead

v1 concluded `multiStageDocumentProcessor` (and its routes/worker) should be deleted outright as dead code with zero callers. **That conclusion doesn't hold.** Independent verification found:

- **`app/process-flow/visual-pipeline/page.tsx`** is a real, navigable Next.js page. It uses `app/process-flow/visual-pipeline/hooks/usePipelineAPI.ts`, which calls `/api/pipeline${...}` — the exact route v1 wanted removed. You confirmed this yourself: *"its a nice page."*
- **4 test files (~1,900 lines)** exercise this module — `server/src/tests/e2e/pipeline.test.ts`, `pipeline-e2e.test.ts`, `stress.test.ts`, `performance.test.ts` — v1's file inventory didn't mention any of them. They instantiate `MultiStageDocumentProcessor` directly in-process, though, so they don't exercise (or protect) the real queue/worker path.
- **`server/src/services/documentFormatService.ts`** imports `MultiFormatOutputEngine` from inside this module — a live dependency that a blanket directory deletion would have broken.

What v1 got right, and actually understated: the **worker-side consumer really is missing** from the live path, just not for the reason claimed. `registerPipelineWorker()` (in `server/src/workers/pipelineWorker.ts`) is only ever called from `server/temp/worker.ts` — a file with a broken relative import (`./src/tracing`, which doesn't resolve from `server/temp/`), not referenced by any npm script, Dockerfile, or `render.yaml`. The real worker bootstrap path (`registerWorkers.ts` → the actual `queueService.ts`/`worker.ts` used in production) never registers a `pipeline-processing` consumer at all. Confirmed independently via the RabbitMQ management API: the `pipeline-processing` queue shows **0 consumers**.

**Net effect:** a real frontend page submits real jobs to a real queue that nothing is listening to. Those jobs sit forever (or get swept up by the same StuckJobMonitor/requeue mechanism described in Section 2, likely with the same consequences at smaller scale). This is a **broken feature**, not dead code — the fix is almost certainly to wire `registerPipelineWorker()` into the real worker bootstrap path (`registerWorkers.ts`), not to delete the module. Recommend treating this as its own follow-up investigation before committing to either path — in particular, confirming that `qualityAssuranceStage.ts`'s hardcoded placeholder scores (see Section 4) are acceptable to ship live, or need real implementations first.

---

## 4. Corrected Audit-Surface Findings

Everything below was independently re-verified against the current working tree (not re-derived from v1's text). Only material corrections are called out; unlisted claims from v1 checked out as written.

| Area | v1 claim | Correction |
|---|---|---|
| `documentGenerationService.ts` audit/patch loop | Function end-lines L2081, L2275 | Functions actually run to L2118 and L2300 (30±7 lines longer than stated); an *additional* undocumented guard exists — patches are discarded wholesale if they'd shrink the document by more than 20% (L2290-2293). Everything else (single audit call, `MAX_AUDIT_CHARS=40000` sampling, default-1 retry, H8 tag protection, PENDING_HUMAN_APPROVAL at score<90) is accurate. |
| DRACO Board unconditional execution | "Runs all three judges regardless of audit outcome" | **Confirmed accurate**, and confirmed there is no hidden score-based gate anywhere (`dracoService.ts`, `documentGeneration.ts`, `dracoRegistryConsumer.ts`, `template-lifecycle/` all searched — none found). The only gate is the per-template `draco_enabled` boolean. This directly supports recommendation 6.2 (make it conditional) — you already confirmed you want this change regardless of the rest of this review. |
| `multiStageDocumentProcessor` total size | "~3,300 lines total" | The whole module is **12,527 lines** across 14 files. 3,300 doesn't correspond to any natural subset that includes the QA stage the claim discusses in the same breath. `qualityAssuranceStage.ts` alone is correctly stated at 2,679 lines. |
| `multiStageDocumentProcessor` callers | "No frontend code calls it" / fully dead | **Wrong** — see Section 3. It's a broken production path with a real caller, not dead code. |
| QA stage "13 assessments, most placeholders" | Exact count of 13 | The top-level entry point calls 7 sub-assessments (one of which fans out to 4 more); counting every `assess*`-prefixed method yields ~21-22. The exact figure "13" doesn't match any natural grouping — likely imprecise. The *substance* (many hardcoded placeholder scores, e.g. `return 0.85 // Would be calculated`-style patterns) is real and confirmed at multiple locations (L752-768, L847, L893-897, L957-958, L1044-1047). |
| `complianceValidationEngine.ts` | "(1,339 lines) implements BABOK/DMBOK/PMBOK hardcoded rulesets" | The 1,339-line figure and "on-demand only, never touched during generation" are both confirmed accurate. But the engine itself contains **zero** BABOK/DMBOK/PMBOK rule text (verified by direct grep) — it's a generic DB-driven validator. The actual hardcoded rule content lives in three separate files: `rulesets/babokRuleset.ts` (524 lines), `dmbokRuleset.ts` (564), `pmbokRuleset.ts` (583) — 1,671 combined lines not counted in the original figure — seeded into the database via `seedRulesets.ts`. |
| `DRACOEngine.ts` / `dracoDebateEngine.ts` naming confusion | Three unrelated DRACO-named components | **Confirmed accurate in full** — `DRACOEngine.ts` (61 lines) is referenced only by its own contract-guard test; `dracoDebateEngine.ts` (243 lines) is a genuinely separate meta-governance tribunal for renegotiating a compliance rule's own threshold over time (triggered via Postgres LISTEN/NOTIFY from `effectivenessWorker.ts`, not from the document pipeline at all); the real per-document board is `dracoService.ts` + `dracoReviewBoard.ts` (765 lines, confirmed 3 rotated-provider judges) + `dracoVerdictEngine.ts` (482) + `dracoStrategicValueAssessor.ts` (190) + `dracoRegistryConsumer.ts` (152) + `dracoProgressEmitter.ts` (193) — all file sizes verified exact. |

---

## 5. Recommendations

Unchanged from v1 where confirmed accurate; revised where the facts above require it.

1. **Fix the stuck-job loop first** (Section 2.4) — this is the actual production incident, is a governed feature (`document-generation-resiliency`), and has concrete, narrowly-scoped code changes identified. Highest priority; not yet implemented.
2. **Make the DRACO Board conditional, not blanket** — confirmed correct in v1 and confirmed by you as wanted independent of the rest of this review. Trigger on: Tier-1 audit score below an escalation threshold, high-risk template flag, or periodic sampling — not every generation.
3. **Fix or retire the visual pipeline, don't blanket-delete it** — it has a real frontend caller. Decide between (a) wiring `registerPipelineWorker()` into the real worker bootstrap and hardening `QualityAssuranceStage`'s placeholder assessments, or (b) a deliberate, coordinated removal that also updates the frontend page and the 4 test files. Not a "free win" either way.
4. **Reconcile or clearly separate the two compliance rule systems** — Policy Audit (`policy_library` table, automatic, every generation) vs. `complianceValidationEngine.ts` + its 3 ruleset files (on-demand, `/api/compliance` only). Confirmed genuinely independent with no shared vocabulary.
5. **Disambiguate the three DRACO-named components** — confirmed real, not a false alarm. A one-line header comment in each file cross-referencing the other two would resolve most of the confusion.

---

## 6. What This Review Did Not Fully Resolve

- The exact provider/model that caused the specific `AI_APICallError: Not Found` in today's incident — the message was purged before its full payload could be captured. Section 2.3 identifies a plausible, fixable contributing factor (the `GenerateDocumentModal.tsx` default) but this is not proven to be the exact trigger.
- Whether other queues/job types share the same three-defect pattern from Section 2.2 — this review only traced the `ai-generate` path in depth. `stuckJobMonitor.ts`'s requeue logic is generic across queues, so the same risk likely applies wherever a handler can swallow a permanent error without marking the job terminal.

---

## 7. Changelog vs. v1

- Added Section 2 (root cause of the actual incident) in full — absent from v1.
- Added Section 3 (visual pipeline is broken-but-live, not dead) — corrects v1's core deletion recommendation.
- Corrected function end-line numbers for the audit/patch loop (Section 4, row 1).
- Corrected `multiStageDocumentProcessor` total line count from ~3,300 to 12,527 (Section 4, row 3).
- Corrected "no frontend caller" claim for the pipeline (Section 4, row 4).
- Softened the exact "13 assessments" figure to a verified range while confirming the placeholder-score substance (Section 4, row 5).
- Corrected the location of BABOK/DMBOK/PMBOK rule content — separate ruleset files, not inline in `complianceValidationEngine.ts` (Section 4, row 6).
- Confirmed (not corrected) the DRACO naming-confusion and unconditional-execution findings — these held up under independent verification.
