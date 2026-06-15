# Implementation Plan: Batch Generation

## Goal Description
Implement multi-document batch generation capabilities to allow users to generate 5-50 documents in a single request. This is critical for generating entire project kickoff suites (e.g., all 10 PMBOK plans) simultaneously. The feature requires parallel processing via the Redis Job Queue, real-time progress tracking via WebSockets, and graceful handling of partial failures.

## Proposed Changes

### `server/src/modules/documents/BatchGenerationController.ts`
- [NEW] Create a new controller to handle `POST /api/documents/batch-generate`.
- [NEW] Validate `BatchGenerationRequest` payload (project ID, template array, concurrency options).
- [NEW] Map requests into individual `DocumentGenerationJob` entities and push them to the Bull queue.

### `server/src/modules/queue/JobOrchestrator.ts`
- [MODIFY] Enhance the Bull queue setup to support `max_concurrency` settings per batch.
- [MODIFY] Implement a parent-child job relationship to track the overall `batch_id` status (`queued`, `in_progress`, `completed`, `partial_failure`).

### `server/src/modules/websockets/ProgressTracker.ts`
- [NEW] Implement real-time WebSocket events emitting progress updates (e.g., `completed: 4`, `failed: 1`, `pending: 5`) grouped by `batch_id`.

### `server/src/modules/documents/ExportService.ts`
- [MODIFY] Add a "Download All as ZIP" function that aggregates all successful document generation artifacts associated with a specific `batch_id`.

## Verification Plan

### Automated Tests
- Unit test: `npm run test -- BatchGenerationController` to ensure payload validation and queue dispatching works.
- Integration test: Mock Bull queue and verify partial failure scenarios (e.g., 2 succeed, 1 fails) correctly resolve the parent batch to `partial_failure`.

### Manual Verification
- Execute a batch generation request via Postman requesting 10 templates.
- Verify WebSocket progress events stream correctly to the frontend.
- Verify the "Download ZIP" endpoint correctly packages all 10 documents.
