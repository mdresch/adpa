---
name: adpa-data-infrastructure-pillar5
description: Pillar 5 Data Infrastructure & Reliability. Use when working on database circuit breakers, connection leak prevention, and asynchronous lifecycle management.
---

# ADPA Data Infrastructure (Pillar 5)

## Purpose
Pillar 5 hardens the low-level processing, connection management, and system-level error handling of the ADPA platform. This ensures database connection pools are preserved and outages do not destabilize the Node.js runtime environment.

## Invariants
- Must always: Monitor database connection pools and trip the circuit breaker (DBGuard) to "Open" if errors exceed the threshold.
- Must always: Return HTTP 503 instantly when the circuit breaker is open, bypassing the Node Event Loop queue.
- Must always: Track active database handles, timers, and promises (TestTeardownGuard) to fail any test/job execution leaving open handles.

## Interaction Rules
- Protects all external state connections.
- Middleware (`dbCircuitBreakerMiddleware`) must inject early in the request lifecycle.

## Key Files
| File | Role |
|------|------|
| `server/src/modules/infrastructure/DBGuard.ts` | Circuit breaker logic |
| `server/src/modules/infrastructure/TestTeardownGuard.ts` | Async lifecycle tracker |
| `server/src/__tests__/modules/infrastructure/pillar5-invariants.test.ts` | Contract Guards |

## Commands
```powershell
cd server
npm run test:features -- infrastructure
```
