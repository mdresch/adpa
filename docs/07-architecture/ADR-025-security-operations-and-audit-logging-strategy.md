# ADR 025: Security Operations & Audit Logging Strategy

## 1. Status
**Proposed (2026-07-23)** — the security controls and audit logging described here are implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA has multiple security controls spread across the codebase: Firebase and legacy JWT authentication, parameterized SQL queries, JSON schema validation on inputs, path-traversal guards, tenant isolation middleware, and an immutability-candidate audit log (`audit_log` with hash-chain triggers). None of these are documented as a unified security operations model. Verified against running code:

- **Authentication**: dual path (Firebase ID tokens detected via JWT `kid` claim, or legacy ADPA JWTs). Legacy fallback has a hardcoded secret risk in development.
- **Input validation**: Joi / express-validator for route inputs; strict TypeScript types at the service layer.
- **SQL injection prevention**: parameterized queries via `pool.query` throughout `server/src/`.
- **Path traversal guards**: file-serving routes validate paths against allowed directories.
- **Tenant isolation**: `verifyTenantAccess` middleware enforces `tenantId` / `projectId` boundaries.
- **Audit log**: `audit_log` table with hash-chain trigger (`trg_audit_log_before_insert`). Used by ADR-005 capability-registry decisions and ADR-012 override request/decision lifecycle.
- **Credential storage**: API keys for integrations (Confluence, GitHub, SharePoint, etc.) are stored in `project_integrations` or the `ai_providers` table.

## 3. Decision

We adopt a **defense-in-depth security model** where the trust boundary is at the API gateway (Express + `authenticateToken`), every internal data access is parameterized and tenant-scoped, and every write to high-integrity state (capability activation, override decisions, override requests) passes through the hash-chain audit log in the same transaction.

### 3.1 Authentication Boundary

The edge of the system is Express. Every route that mutates state or reads sensitive data uses `authenticateToken` (or `optionalAuth` for public reads). The dual-path verifier is a deliberate design choice:

- **Firebase path**: preferred in production. `isFirebaseIdToken()` detects the `kid` claim and calls `admin.auth().verifyIdToken()`.
- **Legacy path**: retained for development and demo mode (`demoLogin`, `register`). Uses `jwt.verify` with `JWT_SECRET`.

The hardcoded fallback secret (`"your-secret-key"`) must fail startup in production if `JWT_SECRET` is unset. This is an open item being tracked as a code fix, not a design decision.

### 3.2 Input Validation

All route handlers validate input via Joi / express-validator before passing to service code. Service code uses strict TypeScript types. This two-layer model means:

- Route layer: rejects malformed requests with 400 before service logic runs.
- Service layer: type errors are caught by `tsc --strict` at build time, not at runtime.

No service method accepts `any` unless explicitly justified (e.g., JSONB column reads that legitimately accept arbitrary shapes).

### 3.3 Query Safety

All database access uses parameterized queries via `pool.query($1, $2, ...)`. Raw SQL is used for complex joins (project+program+portfolio) but never with string concatenation. This is enforced by code review and linted via rules that flag `pool.query` calls with string interpolation.

### 3.4 Tenant Isolation Enforcement

`verifyTenantAccess` is the single gateway for tenant and project isolation. It must be applied to every route that reads or writes project or company data. The middleware stores `tenantId` and `projectId` in the user's permissions object at login time and rejects mismatches with 403. Super admin bypasses the check but the bypass is logged.

### 3.5 Audit Logging for High-Integrity State

The `audit_log` table records tamper-evident entries via a hash-chain trigger (`trg_audit_log_before_insert`). Currently used for:

- Capability activation decisions (ADR-005).
- Capability override request creation, approval, denial, withdrawal (ADR-012).

Every entry to `audit_log` includes `old_values` / `new_values` (JSONB digest, never raw justification text) and `created_by` / `created_at`.

The digest-only approach means the hash proves a write existed and was not altered after the fact, without disclosing write contents outside the access-controlled row.

## 4. Options Considered

### Option A: Perimeter-only security (auth at the edge, trusts internal calls)
| Dimension | Assessment |
|---|---|
| Complexity | Lowest |
| Risk | High — internal service calls can bypass auth and tenant checks |

Rejected: internal calls are not a guaranteed threat model, but defense-in-depth is cheaper than retrofitting isolation after a bug.

### Option B (Recommended): Auth at the edge + parameterized queries + tenant isolation + hash-chain audit log
| Dimension | Assessment |
|---|---|
| Complexity | Medium — four layers to maintain, each is a small, focused piece |
| Risk | Low — failure of one layer does not break the others |

The current implementation. Chosen because every component is already in production and the only open gaps are code-level fixes, not design additions.

### Option C: External WAF and SIEM
| Dimension | Assessment |
|---|---|
| Coverage | High — external traffic filtering, anomaly detection |
| Cost | High — third-party SaaS |
| Operational burden | Medium — rules maintenance, alert tuning |

Not chosen now. The current threat model prioritizes application-layer controls (auth, tenant isolation, parameterized queries). An external WAF is a reasonable future addition for production DDoS and anomaly detection but is not required to make the security model sound.

## 5. Consequences

### Positive
- **Defense-in-depth**: four independent layers mean a bug in one does not expose data.
- **Hash-chain audit trail**: high-integrity writes are tamper-evident without relying on application-layer trust.
- **Tenant isolation as middleware**: new routes inherit isolation by adding one middleware call.

### Negative
- **Auth complexity**: the dual-path verifier (`isFirebaseIdToken` → Firebase or legacy) adds cognitive load to new developers. A cleanup to use Firebase exclusively in production would simplify it.
- **Audit log scope creep**: currently only capability lifecycle writes go through the hash chain. Expanding it to cover all document mutations, generation jobs, and integration syncs would require significant migration work.

### Risks
- **Credential exposure in logs**: integration credentials (Confluence tokens, GitHub PATs) are logger-friendly at some code paths. A single `logger.info(config)` call in an integration client could write secrets to the log stream. Mitigated by adding a secret-redaction middleware to the logger configuration.
- **Legacy JWT fallback secret**: if `JWT_SECRET` is unset in a production environment, the legacy path silently falls back to the hardcoded `"your-secret-key"`. This is a live risk, not a hypothetical — the server starts successfully in this state. Must be fixed as a security patch before the next release.

## 6. Action Items

1. Close the hardcoded fallback secret risk: `authenticateToken` must fail startup (or reject all legacy-path requests) when `JWT_SECRET` is unset and `NODE_ENV !== "development"`.
2. Add secret redaction to the logger configuration (`server/src/utils/logger.ts`) so no integration credential is written to `info` or `debug` logs.
3. Expand `audit_log` hash-chain coverage to document mutations and generation jobs, tracking as follow-up to ADR-005/012 (not a blocker for this ADR's scope).
4. Document the security boundary model in `docs/07-architecture/SECURITY-MODEL.md` with a simple diagram showing the four layers.

## 7. References

- `server/src/middleware/auth.ts` — `authenticateToken`, `requireRole`, `requirePermission`, `verifyTenantAccess`
- `server/migrations/000_baseline.sql` — `audit_log` table and `trg_audit_log_before_insert` trigger
- `server/src/modules/auth/AuthController.ts` — demo login, bootstrap super admin (auth edge cases)
- `server/src/modules/capabilityRegistry/CapabilityOverrideRequestRepository.ts` — `decide_capability_request` stored procedure (hash-chain consumer)
- `server/src/services/extraction/ExtractionRegistry.ts` — input validation via deterministic parsing
- [ADR-005: Federated Capability Ownership](ADR-005-federated-capability-ownership.md) — hash-chain trigger design
- [ADR-009: Unified Authentication Across Tiers](ADR-009-unified-authentication.md) — Firebase identity boundary
- [ADR-019: RBAC & Authorization Model](ADR-019-rbac-and-authorization-model.md) — permission enforcement layer
