---
name: adpa-compliance-layer-pillar4
description: Pillar 4 Security, Governance & Audit. Use when working on DRACO execution blocks, human overrides, immutable auditing, or automated tenant isolation.
---

# ADPA Compliance Layer (Pillar 4)

## Purpose
Pillar 4 enforces human accountability, cryptographic validation, and immutable auditing over automated operations. It prevents unauthorized actions and guarantees that all high-risk operations leave an unalterable audit trail.

## Invariants
- Must always: Suspend execution on high-risk actions until a cryptographically signed human override payload is provided via DRACO.
- Must always: Flush audit logs to the database *before* resolving an HTTP 200/201 response.
- Must always: Reject unauthorized cross-tenant data requests with HTTP 401/403.
- Must never: Handle IAM configuration or Identity Provider configuration.

## Interaction Rules
- Depends on: None directly, but governs all state-mutating endpoints.
- Must not break: Baseline API request parsing.

## Key Files
| File | Role |
|------|------|
| `server/src/modules/compliance/DRACOEngine.ts` | Execution block & payload verification |
| `server/src/modules/compliance/AuditLogger.ts` | Pre-response state persistence |
| `server/src/__tests__/modules/compliance/pillar4-invariants.test.ts` | Contract Guards |

## Commands
```powershell
cd server
npm run test:features -- compliance
```
