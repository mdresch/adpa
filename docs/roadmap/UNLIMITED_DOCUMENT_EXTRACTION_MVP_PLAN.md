# Unlimited Documents Extraction - MVP Implementation Plan

**Date:** March 2, 2026  
**Status:** Planned  
**Priority:** High  
**Target:** Q1 2026  
**Estimated Effort:** 5-8 engineering days

## 1. Objective

Enable reliable AI extraction for large projects (50-200+ documents) while preserving current extraction quality and queue stability.

## 2. MVP Scope

### In Scope
- Token-budgeted smart batching for extraction input documents.
- Batch-aware progress/status surfaced by API and UI.
- Scalable document selection UI (windowed/virtualized rendering).

### Out of Scope (MVP)
- New AI providers or model-routing logic.
- Major extraction prompt redesign.
- Full domain/entity architecture rewrite.
- Cross-project extraction federation.

## 3. Current Baseline (Code)

- Extraction trigger and status APIs:
  - `server/src/routes/projectDataExtraction.ts`
- Parent-child extraction orchestration:
  - `server/src/services/jobs/ExtractionOrchestrationService.ts`
- Entity extraction service:
  - `server/src/services/projectDataExtractionService.ts`
- Extraction UI:
  - `app/projects/[id]/components/ProjectDataExtraction.tsx`

## 4. Technical Approach

### Design Principle
Keep the existing parent-child orchestration pattern intact and add batching inside entity extraction flow to minimize risk.

### Core Implementation Strategy
1. Introduce a reusable batch planner utility that partitions document IDs by estimated token budget and max docs per batch.
2. Update entity extraction path to process document batches sequentially per entity type:
   - extract batch
   - persist/dedupe batch results
   - update batch progress metadata
3. Extend extraction status contract to return batch progress.
4. Render document selection with windowing in UI to avoid large-list slowdowns.

## 5. Work Plan (3 PRs)

## PR 1 - Backend Smart Batching (Core)

### Files
- `server/src/services/projectDataExtractionService.ts`
- `server/src/services/jobs/ExtractionOrchestrationService.ts`
- `server/src/routes/projectDataExtraction.ts`
- `server/src/services/extraction/` (new batch planner utility)

### Tasks
- Add extraction options (with defaults):
  - `batchingEnabled` (default true)
  - `maxBatchTokens` (default from env)
  - `maxDocsPerBatch` (default from env)
- Add batch planner:
  - Estimate doc token size (char heuristic)
  - Partition docs by `maxBatchTokens` and `maxDocsPerBatch`
  - Handle oversized single docs with safe truncation fallback
- Execute extraction in batches for each entity type.
- Merge/dedupe across batch outputs before final completion.

### Acceptance Criteria
- Extraction runs successfully with 200+ docs.
- No single batch exceeds configured token budget.
- Jobs complete without queue deadlocks/stalls.

## PR 2 - Progress and Status Contract

### Files
- `server/src/routes/projectDataExtraction.ts`
- `server/src/services/jobs/ExtractionOrchestrationService.ts`
- `server/src/services/projectDataExtractionService.ts`

### Tasks
- Persist structured batch progress in job metadata:
  - `totalDocuments`
  - `totalBatches`
  - `currentBatch`
  - `processedDocuments`
  - `estimatedRemainingSeconds`
  - `activeEntityType`
- Extend `/api/project-data-extraction/status/:jobId` response with `progressMeta`.
- Emit periodic progress updates aligned with existing polling and websocket patterns.

### Acceptance Criteria
- Status endpoint reflects batch progress while extraction is running.
- UI can display meaningful step text beyond a flat percent.

## PR 3 - UI Scalability and Batch UX

### Files
- `app/projects/[id]/components/ProjectDataExtraction.tsx`

### Tasks
- Replace full list rendering with windowed rendering for document checkbox list.
- Keep filter/search and select-all behavior correct for filtered subsets.
- Display batch progress details from `progressMeta`:
  - Batch `X/Y`
  - Docs processed/total
  - ETA

### Acceptance Criteria
- Selection dialog remains responsive with 200+ docs.
- Selection and filtering semantics remain correct.
- Batch progress is visible during extraction.

## 6. Data Contract (Proposed)

`GET /api/project-data-extraction/status/:jobId` adds:

```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "status": "processing",
    "progress": 47
  },
  "progressMeta": {
    "activeEntityType": "risks",
    "totalDocuments": 186,
    "processedDocuments": 84,
    "totalBatches": 12,
    "currentBatch": 6,
    "estimatedRemainingSeconds": 420
  }
}
```

## 7. Testing Plan

### Unit Tests
- Batch planner partitioning logic:
  - normal distribution
  - oversized docs
  - edge cases (empty docs, exact token fit)

### Integration Tests
- Extraction API with large synthetic document sets (50/100/200 docs).
- Status endpoint assertions for `progressMeta` updates.

### UI Tests
- Document list render performance sanity check (large list).
- Filter + select-all behavior under windowed rendering.
- Progress UI binding to `progressMeta`.

## 8. Rollout and Safety

- Add env flags:
  - `EXTRACTION_BATCHING_ENABLED=true`
  - `EXTRACTION_MAX_BATCH_TOKENS`
  - `EXTRACTION_MAX_DOCS_PER_BATCH`
- Keep fallback path:
  - if batching fails, gracefully fall back to current single-pass extraction.
- Instrument logs/metrics for:
  - batch counts
  - extraction duration
  - failure causes
  - queue retries

## 9. Risks and Mitigations

- Duplicate entities across batches:
  - use deterministic dedupe before final persist and rely on DB upsert constraints.
- Long-running parent jobs:
  - preserve heartbeat and progress updates; enforce existing timeout policies.
- UI behavior regressions in selector:
  - isolate windowed list logic; preserve checkbox state in a Set-based model.

## 10. Definition of Done (MVP)

- Users can run extraction against 200+ project documents.
- UI remains responsive during selection and extraction.
- Progress shows batch-level detail.
- No increase in extraction failure rate after rollout.
- Docs updated with final status and runbook notes.

