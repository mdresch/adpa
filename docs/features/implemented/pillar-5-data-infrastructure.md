# Implementation Plan: Pillar 5 - Data Infrastructure & Reliability (The Foundation)

## Goal Description
Implement Pillar 5 to harden the low-level processing, connection management, and system-level error handling of the ADPA platform. This ensures database connection pools are preserved and outages do not destabilize the Node.js runtime environment.

## Proposed Changes

### `server/src/modules/infrastructure/`
#### [NEW] `DBGuard.ts`
- Implement DB-GUARD Circuit Breakers.
- Monitor database connection pools. If errors exceed 15% threshold over a 10-second window, trip to "Open" state.
- Instantly return HTTP 503 responses to incoming API requests, bypassing the Node Event Loop queue.

#### [NEW] `TestTeardownGuard.ts`
- Enforce strict asynchronous lifecycle management.
- Track active database handles, timers, and unresolved promises during job/test execution.
- Fail the AEV gate if handles are left open upon completion.

### `server/src/middlewares/`
#### [MODIFY] `dbCircuitBreakerMiddleware.ts`
- Inject the DB-GUARD check into the main API router to instantly reject requests when the breaker is open.

### `server/src/__tests__/modules/infrastructure/`
#### [NEW] `pillar5-invariants.test.ts`
- Implement Contract Guards for the DB-GUARD circuit breaker and the teardown-guard asynchronous tracker.

```typescript
describe('Pillar 5: Infrastructure & DB-GUARD Invariants', () => {
  afterEach(async () => {
    // Assert 0 open handles
  });

  it('should trip the DB-GUARD circuit breaker on database failure and reject requests instantly', async () => {
    // Implement exact invariant block provided in the project charter.
  });
});
```

### `server/governed-features.manifest.json`
#### [MODIFY] `governed-features.manifest.json`
- Update the `infrastructure` feature packet (which already exists but must encompass these exact rules).

## Verification Plan
### Automated Tests
- `npm run test:features -- infrastructure`

### Manual Verification
- Simulate a database failure locally by shutting down PostgreSQL.
- Fire rapid API requests. The first few should fail with timeout/connection errors, after which the circuit breaker should trip and instantly return HTTP 503 for all subsequent requests.
