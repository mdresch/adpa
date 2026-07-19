# Beacon DocGen-1: RAG Upsert Concurrency & Backpressure

## Owner
Backend Agent (document generation / RAG pipeline)

## Duration
30-45 minutes

## Dependencies
None — self-contained within `ragService.ts` and `testAsyncTaskTracker.ts`. Complements the already-shipped sibling fix in `documentGenerationService.ts` (source-document RAG ingest: skip-if-unchanged + bounded concurrency, shipped 2026-07-02).

## Epic
Document Generation Performance (system lockup investigation, 2026-07-02)

## Description
After a document finishes generating, `AIGenerationJobService.ts` fires a deferred RAG-ingest of the newly created document via `TestAsyncTaskTracker.runTrackedDeferred('RAGIngestDocument', ...)`. That helper has **zero concurrency cap** — every document that finishes generation immediately triggers a full chunk + embed + insert cycle in the background, with no limit on how many can run at once. Under bursts (several documents finishing close together, or bulk/batch generation), this fans out unbounded: each ingestion holds a full document's worth of embedding vectors in memory before writing anything, and opens its own Postgres transaction.

This is the *outbound* half of the RAG-ingestion problem. The *inbound* half (source documents re-ingested on the way into generation) was already fixed — see `ensureSourceDocumentsIngested` / `filterAlreadySyncedDocumentIds` in `documentGenerationService.ts`.

## Requirements
1. Add a concurrency cap specific to deferred RAG ingestion — not to `runTrackedDeferred` generically, since other deferred tasks (`SaveInBandSummaries`, `UpdateTemplateEntityProfile`) don't share this problem and shouldn't be throttled by the same limiter.
2. Evaluate two approaches:
   - (a) A small in-process semaphore/queue wrapping calls to `ragService.ingestDocument` (fast, minimal blast radius).
   - (b) Route RAG ingestion through a proper queue job (Bull/Rabbit), matching the existing `save-inline-entities` pattern (concurrency 1, durable, survives process restarts) — more consistent with how the rest of the post-generation pipeline already works.
3. Confirm the batched multi-row insert in `ragService.ts`'s `ingestDocument` (added 2026-07-02, `INSERT_BATCH_SIZE`) is still in place — this fix should build on it, not replace it.
4. Apply the same skip-if-unchanged idea used for source documents: if a document's `sync_status`/`processing_time` already reflect its current `updated_at`, don't re-ingest.

## Reference Files
- `server/src/services/jobs/AIGenerationJobService.ts` (~line 698, `RAGIngestDocument` deferred call)
- `server/src/utils/testAsyncTaskTracker.ts` (`runTrackedDeferred` — no concurrency control today)
- `server/src/services/ragService.ts` (`ingestDocument` — chunk/embed/insert; already has batched insert as of 2026-07-02)
- `server/src/services/documentGenerationService.ts` (`ensureSourceDocumentsIngested` / `filterAlreadySyncedDocumentIds` — sibling fix for the inbound path; reuse the same skip-if-unchanged pattern here)
- `server/src/services/queue/registerWorkers.ts` (pattern for a properly queued, concurrency-1 job processor, e.g. `save-inline-entities` at line ~101)

## Testing
- `cd server && npm run test:features -- doc-gen`
- `cd server && npm run test:features -- rag`
- Manual: trigger several document generations in the same project close together (or a batch generation) and confirm `TestAsyncTaskTracker.getPendingCount()` / queue depth stays bounded instead of growing with each completion.

## Success Criteria
- [ ] Concurrent post-generation RAG ingestions are bounded (semaphore or queue-based dispatch)
- [ ] No regression to `save-inline-entities` or other deferred background tasks
- [ ] `npm run test:features -- doc-gen` and `-- rag` pass
- [ ] Bulk/batch document generation no longer shows unbounded background-task growth

## Context
Investigated as part of a "document generation locks up the system" report (2026-07-02). Root cause was primarily the *inbound* source-document re-ingestion path, which is now fixed. This beacon captures the remaining *outbound* half of the same RAG-ingestion code path (`ragService.ingestDocument`) that is still unthrottled.

---

**Status:** Ready for dispatch
**Priority:** Medium — secondary to the already-fixed inbound path; matters most under bulk/batch generation load.
