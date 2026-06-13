# Test Teardown Guard Skill

This skill governs the implementation and maintenance of the asynchronous background task tracking system, which prevents module reference errors and connection leaks during Jest test runs.

## When to Use
- When writing tests or services that deploy background callbacks using `setImmediate`, `setTimeout`, or unawaited `Promise` runs.
- When debugging "ReferenceError: You are trying to import a file after the Jest environment has been torn down" or open handles force-exiting Jest tests.

## Key Invariants
- **Draining Tasks:** All background tasks must be tracked by `TestAsyncTaskTracker` and awaited in test cleanup hooks (`afterEach`).
- **Graceful Shutdown:** During test teardown, new tasks registered must print warning logs and resolve immediately instead of hanging or starting executions after the environment is torn down.
- **Production Safety:** The tracker must have minimal runtime overhead when running in a normal production environment (`process.env.NODE_ENV !== 'test'`).

## Target Files
- [TestAsyncTaskTracker](file:///c:/Users/MennoDrescher/Source/Repos/adpa/server/src/utils/testAsyncTaskTracker.ts) — Core tracking registry.
- [AIGenerationJobService](file:///c:/Users/MennoDrescher/Source/Repos/adpa/server/src/services/jobs/AIGenerationJobService.ts) — Background setImmediate callbacks.
- [Test Setup](file:///c:/Users/MennoDrescher/Source/Repos/adpa/server/src/__tests__/setup.ts) — Teardown hook.

## Verification Commands
- `npm run verify:governed-features`
- `npm run test:features -- test-teardown-guard`
