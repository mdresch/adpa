---
name: adpa-federated-capability-ownership
description: Department-scoped ownership registry and activation gating for governed modules (ADR-005). Load when touching user_departments, capability_registry, Firebase department claims, TaskApprovalGate department checks, or company creation (created_by).
---

# ADPA Federated Capability Ownership

## Purpose

Every governed module gets three declared owners (platform operator, functional owner department, control definition owner department), scoped per-portfolio, enforced at activation time rather than left as an unenforced convention. Phase 0 (this skill's scope) gives ADPA identity a department attribute and syncs it into Firebase custom claims, since the .NET orchestrator (`TaskApprovalGate`, `RitualController`) has no local user table and trusts only the validated JWT. Phase 1 (sibling skill [adpa-capability-registry](../adpa-capability-registry/SKILL.md), same manifest packet) builds the ownership registry itself. Later phases (see [the implementation plan](../../../docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md)) build the approval gate, the activation lifecycle, DRACO wiring, ledger hash-chaining, the Governor Portal UI, and the final partial-delivery lockout on top of it.

**ADR-012 PR1 addition (2026-07-17, shipped):** [ADR-012](../../../docs/07-architecture/ADR-012-capability-register-and-request-lifecycle.md) / [its implementation plan](../../../docs/implementation/CAPABILITY_REGISTER_AND_REQUEST_LIFECYCLE_IMPLEMENTATION_PLAN.md) (PR1, Action Item 1) closes a gap this skill's own Phase 0 work left open: `GET /api/v1/auth/me` (`AuthController.getMe`) resolved `users.id`/`role`/`permissions` but never included the caller's `user_departments` memberships — the Governor Portal (`Adpa.Web`) had no client-side way to know which departments a signed-in user belongs to, which is why `Approvals.razor` couldn't hide an action the caller isn't authorized for (see `adpa-governor-portal-auth`'s matching addition). PR1 adds `resolveCurrentUserDepartments(userId, deps)` — a pure shaping function, not a new query (it composes `UserDepartmentRepository.listByUser`'s existing active-only rows into the `{portfolioId, department, departmentRole}` shape this ADR's downstream consumers key their gating on) — and wires it into `getMe`'s response as a `departments` field. Deliberately trusts its `deps.listActiveDepartmentsByUser` to have already filtered to active rows (mirrors `listByUser`'s `WHERE is_active = true`) rather than re-filtering — same trust-the-query-layer posture `departmentMembershipService.ts` already takes. Landed test-first: REQ-DEPT-012's Contract Guard was written and confirmed red (`Cannot find module`) before `currentUserProfile.ts` existed, per the Governed Feature Loop.

## Invariants

- Must always: scope department membership by `portfolio_id`, not `company_id`/`tenant_id`, and not department name alone — a department can exist identically-named across multiple portfolios; `portfolio_id` is what carries governance semantics in this codebase.
- Must always: build the Firebase claims payload from **active** `user_departments` rows only. A deactivated row must never appear in a synced claim (`buildDepartmentClaims`).
- Must always: treat an active→inactive transition as requiring `revokeRefreshTokens`. Add/update transitions must not revoke.
- Must always: write claims changes through a job (DB row + queue), never call the Firebase Admin SDK inline from the request path — this is a dual-write (Postgres + external Firebase API); a job is what makes retry-until-success possible instead of the two systems silently diverging.
- Must always: mark a claims-sync job complete only after `setCustomUserClaims` (and, for removals, `revokeRefreshTokens`) actually resolves. A thrown/rejected call must leave the job retryable, not falsely marked done.
- Must always: when a single `user_departments` row changes, recompute claims from a fresh query of **all** of that user's active rows before enqueueing — never build the payload from just the changed row, or an unrelated existing membership silently drops out of the synced claim on the next sync.
- Must always: validate department codes against the fixed seed list (`IT`, `Compliance`, `Legal`, `Finance`, `HR`, `Risk`, `Internal Audit`) before trusting them anywhere claims are built — domain integrity has to exist where the string is first captured, not three phases downstream at a DB FK.
- Must always: capture `created_by` on `companies` at insert time, in **both** existing creation code paths (`AuthRepository.createCompany`, `CompanyRepository.create`) — two insertion points is exactly how this kind of capture gets missed in one path and not the other.
- Must always: resolve the `companies.created_by` (→ `users.id`) / `users.company_id` (→ `companies.id`) circular FK by inserting the company first (`created_by` NULL), then the user (with a pre-generated id so it's known before commit), then calling `AuthRepository.setCompanyCreatedBy` — never by relaxing either FK to deferrable, which would change behavior for every other insert against these tables too.
- Must never: import the `uuid` package in code paths reachable from a governed-feature test. `uuid@14`'s `package.json` declares `"type": "module"` with no CJS override anywhere in `dist-node/`, and `run-governed-features.mjs` runs Jest with `NODE_OPTIONS=--experimental-vm-modules`, which makes Jest's module loader strictly enforce ESM/CJS classification — so *even* the repo-wide `import { v4 as uuidv4 } from 'uuid'` convention (which `tsconfig.json`'s `commonjs` target compiles to a plain `require("uuid")`) throws `Must use import to load ES Module` the moment that file is pulled into a governed-feature test. This is latent everywhere else in the codebase too (10+ files use that import), just not yet triggered because no other registered packet's test transitively imports one of them. `CompanyRepository.create`'s id-generation fallback was fixed by switching to the built-in `crypto.randomUUID()` instead — already the convention in 10 other files in this codebase, and it has no external-package ESM resolution at all.
- Must never: treat "FK resolves to a valid department" as equivalent to "the requesting user is actually an active member of that department in that portfolio" — the former is a schema constraint, the latter is the actual authorization check (Phase 2's job, not this packet's).
- Must always (ADR-012 PR1): shape any HTTP-facing department-membership payload (`/auth/me`'s `departments` field, and anything downstream that consumes it) through `resolveCurrentUserDepartments`'s `{portfolioId, department, departmentRole}` field names — not an inline ad hoc map at the call site. ADR-012 PR4/PR5/PR6d's action-visibility gating (Capability Register buttons, request-creation forms, My Requests) reads exactly this shape; a second, differently-named shape introduced at a different call site would silently break that gating instead of failing loudly.

## Interaction Rules

- Must not break `projects` (Pillar 7) tenant/portfolio scoping conventions — `portfolio_id` here and `company_id` there are both real scoping columns for different concerns; this feature doesn't replace `company_id` scoping, it adds a governance-specific scoping column alongside it.
- Depends on: nothing yet (Phase 0 is the foundation). Later phases depend on this one — Phase 2's `TaskApprovalGate` reads the exact claim shape `buildDepartmentClaims` produces, so changing that shape requires an overlap guard once Phase 2 lands.

## Key Files

| File | Role |
|------|------|
| `server/src/modules/departments/departmentClaims.ts` | Pure logic: department code validation, active-rows-only claims builder, revoke-on-removal decision |
| `server/src/modules/departments/departmentClaimsSyncJob.ts` | Dual-write-safe job: enqueue (DB row + queue, never inline Firebase) and worker processing (complete-only-on-success) |
| `server/src/modules/departments/departmentMembershipService.ts` | `syncDepartmentMembershipChange()` — on a `user_departments` row change, re-queries the user's full active-row set and calls `enqueueClaimsSyncJob` once with the correct `isRemoval` |
| `server/src/modules/departments/UserDepartmentRepository.ts` / `UserDepartmentsController.ts` / `routes.ts` | The real HTTP entrypoint (`/api/v1/departments/...`, admin-gated) that actually exercises create/deactivate → `syncDepartmentMembershipChange` — this is what makes the dual-write-safe job pipeline reachable at all, not just unit-tested in isolation |
| `server/src/modules/departments/firebaseClaimsAdmin.ts` | Real `admin.auth()` implementation of `ClaimsSyncFirebaseAdmin` (the interface itself has no other implementation) |
| `server/src/modules/departments/claimsSyncQueueAdapter.ts` | Adapts the real RabbitMQ-backed `IQueue` to `ClaimsSyncQueue`'s `.enqueue` shape; `department-claims-sync` queue registered in `server/src/services/queue/queueClient.ts`, processor in `registerWorkers.ts` |
| `server/migrations/434_federated_capability_ownership_phase0.sql` | `departments`, `user_departments`, `department_claims_sync_jobs` tables + `trg_companies_create_portfolio` trigger + backfill |
| `server/tests/integration/federated-capability-ownership-phase0.test.ts` | Real-Postgres proof: FK/CHECK rejection, trigger idempotency, `setActive` transition reporting, end-to-end claims-sync job processing |
| `server/src/modules/identity/CompanyRepository.ts` | `create()` must persist `created_by`; id-generation fallback uses `crypto.randomUUID()`, not `uuid` |
| `server/src/modules/auth/AuthRepository.ts` | `createCompany()` persists `created_by`; `createUser()` accepts a caller-supplied `id`; `setCompanyCreatedBy()` back-fills `created_by` after the user row exists |
| `server/src/modules/auth/AuthController.ts` | `register()` pre-generates the new user's id only when also creating a new company, so it can become that company's `created_by` |
| `server/migrations/432_companies_created_by.sql` | Adds `companies.created_by uuid REFERENCES users(id)`, nullable, not backfillable for pre-existing companies |
| `server/src/__tests__/modules/federated-capability-ownership/departmentClaims.test.ts` | Contract Guards: REQ-DEPT-001..003 |
| `server/src/__tests__/modules/federated-capability-ownership/departmentClaimsSyncJob.test.ts` | Contract Guards: REQ-DEPT-004..005 |
| `server/src/__tests__/modules/federated-capability-ownership/departmentMembershipService.test.ts` | Contract Guard: REQ-DEPT-011 |
| `server/src/__tests__/modules/federated-capability-ownership/companyAdmin.test.ts` | Contract Guards: REQ-DEPT-006..010 |
| `server/src/modules/departments/currentUserProfile.ts` | ADR-012 PR1: `resolveCurrentUserDepartments(userId, deps)` — pure shaping of `UserDepartmentRepository.listByUser`'s active-only rows into `{portfolioId, department, departmentRole}`, consumed by `AuthController.getMe` |
| `server/src/__tests__/modules/federated-capability-ownership/currentUserProfile.test.ts` | Contract Guard: REQ-DEPT-012 |
| `server/src/modules/auth/AuthController.ts` (`getMe`) | ADR-012 PR1: calls `resolveCurrentUserDepartments` and adds a `departments` field to the `GET /api/v1/auth/me` response, alongside its existing `users.id`/`role`/`permissions` |
| `server/src/modules/departments/UserDepartmentRepository.ts` (`listByUser`) | Already existed, unchanged by PR1 — the real active-only query (`WHERE user_id = $1 AND is_active = true`) `resolveCurrentUserDepartments` is wired against |

## Commands

```powershell
cd server
npm run test:features -- federated-capability-ownership   # this packet only
npm run test:features                                      # all governed packets (CI)
npm run verify:governed-features
```

## Related Skills

- `adpa-capability-registry` — Phase 1, the ownership-registry sibling under the same packet
- `adpa-capability-activation-lifecycle` — Phase 3, the state-machine built on top of the registry this packet feeds
- `adpa-governed-feature-loop` — the process this packet follows
- `adpa-projects-pillar7` — sibling tenant/portfolio scoping conventions
- `adpa-compliance-layer-pillar4` — sibling dual-write / audit discipline
- `adpa-aev-workflow` — required for the Phase 2/3/6/7 orchestrator-side work this packet precedes
- `adpa-governor-portal-auth` — ADR-012 PR1's orchestrator/Blazor-side consumer of this packet's new `departments` field (`CurrentUserClient`/`CurrentUserService`)
