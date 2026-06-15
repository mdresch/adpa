# test-teardown-guard Design Spec

**Date**: 2026-06-13  
**Status**: Approved  
**Feature ID**: test-teardown-guard  

---

## Problem

During integration and unit test execution for asynchronous document generation (`AIGenerationJobService`), several background tasks are scheduled using `setImmediate` or detached promises (such as saving summaries, updating template entity profiles, or ingesting document fragments into RAG indexes). 

Because these tasks run outside the main promise lifecycle of the tests, Jest tears down the mock registry, db connection pool, and global variables *before* these background tasks complete. This triggers:
1. `ReferenceError: You are trying to import a file after the Jest environment has been torn down` from dynamic import calls.
2. `A worker process has failed to exit gracefully and has been force exited` due to open database/network handles or active timers.

## Success Criteria
- [ ] Implement a central tracking utility to register and track active background promises.
- [ ] Wrap `setImmediate` calls in `AIGenerationJobService` with a timezone-aware or test-aware tracking handler.
- [ ] Expose an `awaitAllPending()` method to dynamically await all scheduled background tasks in test teardown hooks (`afterEach` or `afterAll`).
- [ ] Pass all unit and integration tests with zero teardown leaks, `ReferenceError` warnings, or force-exit notices.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Create `TestAsyncTaskTracker` registry to track pending background tasks. | P0 |
| REQ-002 | Wrap background `setImmediate` tasks in `AIGenerationJobService` using the tracker. | P0 |
| REQ-003 | Integrate tracker drainage `awaitAllPending()` into global test setup (`afterEach`). | P0 |
| REQ-004 | Prevent registration of new tasks during shutdown/teardown states. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `doc-gen` — Background tasks must still execute in normal non-blocking production execution.
- `rag` — RAG document ingestion must continue to execute asynchronously.

## Risks

| Risk | Mitigation |
|------|------------|
| Infinite wait loops during test teardown if background tasks spawn indefinitely | Implement safety checks and a maximum iteration threshold (e.g. 5 batches) in `awaitAllPending()`. |
| Performance overhead in production | Only perform lightweight tracking tracking or bypass it when outside the test environment. |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-001 | `teardownGuard.test.ts` → "TestAsyncTaskTracker should track and await pending promises" |
| REQ-002 | `teardownGuard.test.ts` → "runTrackedDeferred should queue and execute setImmediate tasks" |
| REQ-003 | `teardownGuard.test.ts` → "awaitAllPending should drain multiple batches of spawned tasks" |
| REQ-004 | `teardownGuard.test.ts` → "should reject new tasks if shutdown is active" |
