# Document Generation Resiliency

Date: 2026-06-15
Status: Approved

## Problem
The core document generation engine was vulnerable to volatility from LLM providers, edge-case infrastructure failures, and dynamic prompt leakage. Without hardened invariants, transient 429 rate limit errors would permanently deactivate primary providers, process restarts would orphan active generation jobs, and unresolved prompt variables could leak raw syntax into executive outputs.

## Success Criteria
- [x] Unresolved variables never reach the LLM API.
- [x] Orphan jobs automatically recover upon server restart.
- [x] Rate limit errors (429) do not trigger auto-deactivation of AI providers.
- [x] A redelivered or reprocessed `ai-generate` job cannot mint a second document.
- [x] A job whose document was never persisted is never recorded as `completed`.
- [x] A stuck job that can never succeed (e.g. targets an inactive AI provider) is marked `failed`, not parked or requeued.
- [x] The DRACO Review Board only runs when the Tier-1 policy audit didn't already clear the document.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Orphan jobs MUST be reset to `pending` upon queue initialization. | P0 |
| REQ-002 | Generation jobs MUST explicitly bypass `REQUEUE_ENABLED` for forced timeouts. | P0 |
| REQ-003 | The AI API payload MUST NOT contain unresolved `{{VARIABLES}}` and MUST mitigate leaks by substituting with `[Not Provided]`. | P0 |
| REQ-004 | `429 Too Many Requests` MUST trigger exponential backoff instead of automatic provider deactivation. | P0 |
| REQ-005 | Before generating, `AIGenerationJobService` MUST check for a document already tagged with the current job id and skip reprocessing (mark `completed` against the existing document) if one exists, so at-least-once broker redelivery cannot mint duplicate documents. | P0 |
| REQ-006 | If document persistence itself fails (no document row was created), the failure MUST be rethrown so the job is recorded `failed`, never `completed`. Failures in post-persistence side effects (approval request, entity sync, RAG ingestion, template analytics) after the document row exists MAY still be swallowed-and-logged, since the document itself was produced. | P0 |
| REQ-007 | `StuckJobMonitor` MUST classify a stuck job as permanently failed (never requeued, never left parked as `stuck`) when its payload references an AI provider that isn't configured/active in `ai_providers`, since retrying or requeuing such a job fails identically every time. | P1 |
| REQ-008 | The post-generation DRACO Review Board trigger (`documentGeneration.ts` → `dracoService.runFullReview()`) MUST be skipped when the Tier-1 policy-audit score is at or above `DRACO_ESCALATION_SCORE_THRESHOLD` (default 90, matching the existing `PENDING_HUMAN_APPROVAL` cutoff), for `draco_enabled` templates. | P1 |

## Interaction Rules (Overlap)
This feature MUST NOT break:
- `adpa-doc-gen-queue` — The core job resumption flow and template paragraphs execution must remain unaffected.
- `adpa-rag-context-injection` — RAG operations running in the aiService must continue to work normally under exponential backoffs.

## Risks

| Risk | Mitigation |
|------|------------|
| Prompt scanner regex is too broad | Test thoroughly in Contract Guards to only match exact `{{VAR}}` format. |
| Backoff triggers on empty wallets | Explicitly separate `isRateLimit` from `isInsufficientFunds` in logic. |
| Idempotency check (REQ-005) itself fails (DB unavailable) and blocks generation | Check is wrapped so a lookup error logs a warning and falls through to normal generation rather than blocking the job. |
| REQ-006 rethrow is too broad and masks recoverable post-persistence errors as job failures | Rethrow is scoped to `!createdDocumentId` only — errors after the document row exists (approval request, entity sync, RAG ingestion, template analytics) are still swallowed-and-logged. |
| REQ-007 classifier misfires on non-AI job types that happen to have a `provider`-shaped field | Classifier only activates when `jobData.provider` is a non-empty string; the `ai_providers` lookup itself is wrapped so a DB error falls through to the existing transient-failure path rather than blocking the monitor loop. |
| REQ-008 threshold gate skips DRACO for a document that later turns out to need it (score computed wrong, or edited post-audit) | Threshold defaults to 90, matching the pre-existing `PENDING_HUMAN_APPROVAL` cutoff that already routes low-scoring documents to human review — DRACO coverage and human-review coverage stay aligned by construction. The on-demand `/api/quality-audits/draco-review` endpoint is untouched, so any document can still get a manual DRACO run regardless of score. |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-001 | `documentGenerationResiliency.test.ts` → "asserts orphan job recovery during initialization" |
| REQ-002 | `documentGenerationResiliency.test.ts` → "asserts explicit stuck job prioritization" |
| REQ-003 | `documentGenerationResiliency.test.ts` → "asserts zero unresolved templates in generated payload" |
| REQ-004 | `documentGenerationResiliency.test.ts` → "asserts 429 rate limits trigger backoff without deactivation" |
| REQ-005 | `documentGenerationResiliency.test.ts` → "asserts a job already tagged to a document is skipped instead of reprocessed" |
| REQ-006 | `documentGenerationResiliency.test.ts` → "asserts a failed document persistence rethrows instead of masking as completed" |
| REQ-007 | `documentGenerationResiliency.test.ts` → "asserts a stuck job targeting an inactive/unconfigured AI provider is classified permanent" |
| REQ-008 | `documentGenerationResiliency.test.ts` → "asserts DRACO escalation is skipped once the Tier-1 audit score clears the threshold" |

## Incident Addendum (2026-07-06)

REQ-005 and REQ-006 were added in response to a real production incident, not proactively: an `ai-generate` job for the "Defense - 24/7 SOCs Architecture" project looped for hours, producing 36+ duplicate documents, because (a) reprocessing the same job always minted a new document and (b) a swallowed post-generation error let a degraded job report `completed`. Full root-cause writeup: `docs/07-architecture/DOCUMENT_GENERATION_PIPELINE_REVIEW_CORRECTED.md`.

REQ-007 (permanent-error classification in `stuckJobMonitor.ts`) and REQ-008 (conditional DRACO escalation) implement two further recommendations from that same review (§2.4 item 3, §5 item 2). Two smaller items from the review were addressed directly in `GenerateDocumentModal.tsx` without a formal REQ, following the same precedent as the provider-default fix: it now derives its default AI provider/model from the environment's active providers instead of a hardcoded label, and no longer forces `async: true` unconditionally — prompt-only (no-template) generations now run synchronously per the route's own `shouldRunAsync` logic, with the modal handling both the synchronous (`document`) and asynchronous (`jobId`) response shapes.

Fixing or retiring the visual pipeline (`app/process-flow/visual-pipeline`, §3 of the review — a broken live feature submitting to a queue with 0 consumers) was explicitly deferred as its own follow-up investigation, per the review's own recommendation.
