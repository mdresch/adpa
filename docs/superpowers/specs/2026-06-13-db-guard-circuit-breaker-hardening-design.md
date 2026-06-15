# DB-GUARD Circuit Breaker Hardening

Date: 2026-06-13
Status: Implemented

## Problem
The `DB-GUARD` circuit breaker was tripping prematurely due to application-level SQL errors (e.g., schema mismatches) and a retry multiplier effect between `lib/db.ts` and `connection.ts`. This caused the entire database to become "temporarily unavailable" for all users when a single worker or route executed a broken query. Additionally, the Supabase transaction pooler was experiencing `ECHECKOUTTIMEOUT` errors under load due to a conservative default pool size of 5, which lacked proper error handling during the connection probe phase, leading to process crashes.

## Success Criteria
- [x] Application-level SQL errors (e.g., syntax, missing columns) fail the individual query but do not trip the global circuit breaker.
- [x] True connectivity and availability issues (e.g., connection refused, timeouts) correctly trip the circuit breaker.
- [x] Redundant query retry logic is removed to prevent the failure multiplier.
- [x] Default pool size is increased for transaction pooler environments to reduce starvation.
- [x] Startup database probes handle unexpected connection drops gracefully without crashing the server.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | Circuit breaker must only record failures for connection or system-level exceptions (Class 08, 57, 58, and transient pool errors). | P0 |
| REQ-002 | `lib/db.ts` must default to 1 retry to delegate transient retry logic to `connection.ts`. | P0 |
| REQ-003 | Default pool `max` for transaction poolers must be increased from 5 to 10. | P1 |
| REQ-004 | Default connection attempts for non-production environments must be increased from 1 to 3. | P1 |
| REQ-005 | The startup database probe must attach an `error` listener to the client to prevent unhandled exceptions on disconnect. | P0 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `Database connection pooling` — `pg` pool lifecycle and release mechanics remain unchanged.
- `CircuitBreaker state tracking` — The underlying `CircuitBreaker` utility logic is unchanged, only the criteria for calling `recordFailure()` is modified.

## Risks

| Risk | Mitigation |
|------|------------|
| Legitimate database outages are ignored by the circuit breaker | `isCircuitBreakingError` explicitly includes all standard PostgreSQL network/system error classes and common node-postgres timeout messages. |
| Increased pool size overwhelms Supabase | A max of 10 is still very conservative for a transaction pooler (which typically supports hundreds of connections), but provides enough buffer for concurrent workers. |

## Test Plan

*(No new automated tests are required for this infrastructure resilience fix, but it is verified through manual fault injection and observing worker heartbeat stability under load.)*
