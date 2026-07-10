# federated-capability-ownership (Phase 0) Design Spec

**Date**: 2026-07-09
**Status**: Draft
**Feature ID**: federated-capability-ownership

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) and its [implementation plan](../../implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md) require every ADPA identity to carry a department/accountable-role attribute before any activation gating can exist. Today nothing plays this role — `resource_capacity_settings.department` and `stakeholders.department` are free-text, per-record fields, not identity. Phase 0 introduces `departments` / `user_departments` as the source of truth, syncs department membership into Firebase custom claims (the only identity mechanism the .NET orchestrator trusts), and records who created each company (`companies.created_by`) so a Company Admin exists for the break-glass path in Phase 3.

This packet covers only the Node-side, DB-independent contract: the claims payload shape, the dual-write-safe sync job pattern, the revoke-on-removal rule, and the `created_by` capture at company-creation time. Raw DDL correctness (FK rejection, trigger firing, backfill) is out of scope for this fast unit packet — it belongs to `npm run test:integration` against a real Postgres instance, consistent with how this repo already separates fast governed-feature unit packets from DB-backed integration tests.

## Success Criteria

- [ ] A pure module computes the Firebase claims payload from `user_departments` rows, including only active rows and carrying `portfolioId` alongside `department`/`role` (per-portfolio scoping, not global).
- [ ] Department codes are validated against the fixed seed list before being trusted anywhere claims are built.
- [ ] The claims-sync write path is a job (DB row + queue enqueue), never a direct inline Firebase Admin SDK call — closing the dual-write gap called out in the implementation plan.
- [ ] The sync worker only marks a job complete after a successful Firebase call; a thrown/rejected call leaves the job incomplete for retry.
- [ ] A transition to `is_active = false` (removal) additionally revokes refresh tokens; add/update transitions do not.
- [ ] Both existing company-creation code paths (`AuthRepository.createCompany`, `CompanyRepository.create`) capture `created_by` from the authenticated user at insert time.
- [ ] `CompanyRepository.create` generates its fallback id without crashing (discovered while writing REQ-DEPT-006's contract guard, not a pre-existing requirement of the ADR — folded into this packet since the fix touches the same method).
- [ ] A `user_departments` row change (add/update/deactivate) recomputes the affected user's full claims set from all their currently-active rows — not just the changed row — and enqueues exactly one sync job carrying the correct `isRemoval` flag for that specific transition.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-DEPT-001 | Reject department codes outside the fixed seed list (`IT`, `Compliance`, `Legal`, `Finance`, `HR`, `Risk`, `Internal Audit`). | P0 |
| REQ-DEPT-002 | Build claims from active `user_departments` rows only, one entry per `{portfolioId, department, role}`; never include inactive rows. | P0 |
| REQ-DEPT-003 | A `user_departments` transition from active→inactive must be classified as requiring `revokeRefreshTokens`; add/update transitions must not. | P0 |
| REQ-DEPT-004 | Enqueueing a claims sync must never call the Firebase Admin SDK directly — it must persist a job row and hand off to a worker. | P0 |
| REQ-DEPT-005 | The sync worker marks a job complete only after `setCustomUserClaims` (and, for removals, `revokeRefreshTokens`) resolves; a rejection must propagate without marking completion. | P0 |
| REQ-DEPT-006 | `CompanyRepository.create` persists `created_by` from the caller-supplied creator id. | P1 |
| REQ-DEPT-007 | `AuthRepository.createCompany` persists `created_by` from the caller-supplied creator id. | P1 |
| REQ-DEPT-008 | `CompanyRepository.create` must not crash when `id` is omitted — id generation must not depend on the `uuid` package at all (it is ESM-only and breaks under `run-governed-features.mjs`'s `--experimental-vm-modules` flag regardless of `require`-vs-`import` syntax); use the built-in `crypto.randomUUID()` instead. | P0 |
| REQ-DEPT-009 | `AuthRepository.createUser` persists a caller-supplied `id` when given one (and still generates one when omitted), so the id can be reused as a new company's `created_by` before the user row commits. | P1 |
| REQ-DEPT-010 | `AuthRepository.setCompanyCreatedBy(companyId, userId)` back-fills `companies.created_by` after the referenced user row exists. | P1 |
| REQ-DEPT-011 | A `user_departments` row change re-queries all of the user's currently-active rows (not just the changed one), builds claims from that full set via `buildDepartmentClaims`, and calls `enqueueClaimsSyncJob` exactly once with `isRemoval` derived from `shouldRevokeRefreshTokens` on the specific row's transition. | P0 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `projects` (Pillar 7) — tenant/portfolio scoping conventions must stay consistent; `portfolio_id` is the new scoping column here, `company_id` remains the projects packet's existing scoping column, not a competing convention.
- `compliance` (Pillar 4) — the claims-sync job pattern follows the same "never call an external system inline from a request path" rule as existing audit/compliance dual-write guards.

New interaction tests required when:
- Phase 2 (`TaskApprovalGate`) starts reading the `departments`/`portfolio_id` claim shape defined here — a Phase 2 overlap guard must assert against `buildDepartmentClaims`'s actual output shape, not a re-guessed one.

## Risks

| Risk | Mitigation |
|------|------------|
| Claims payload silently includes a stale/deactivated membership | REQ-DEPT-002 contract guard asserts inactive rows are always excluded |
| Firebase call succeeds but DB job bookkeeping lies about it (or vice versa) | REQ-DEPT-004/005 contract guards assert enqueue-then-process separation and completion-only-on-success |
| A department typo reaches Firebase claims undetected | REQ-DEPT-001 contract guard against the fixed seed list, mirrored in the future DDL as a real FK |
| `created_by` capture forgotten in one of the two insertion code paths | REQ-DEPT-006/007 separate contract guards, one per code path, so fixing one can't be mistaken for fixing both |
| `companies.created_by` (→ `users.id`) and `users.company_id` (→ `companies.id`) form a circular FK — no single insert order satisfies both when a registration creates a brand-new company | Insert company first with `created_by` NULL, insert the user (pre-generated id, so it exists before referenced), then `setCompanyCreatedBy` back-fills it — all inside the same transaction, so no other session ever observes the intermediate NULL (REQ-DEPT-009/010) |
| `CompanyRepository.create`'s id-generation fallback throws under the actual `npm run test:features` command (`uuid@14` is ESM-only; `run-governed-features.mjs` sets `NODE_OPTIONS=--experimental-vm-modules`, which makes Jest refuse to `require()` it regardless of `require`-vs-static-`import` syntax) whenever a caller omits `id` | REQ-DEPT-008 contract guard exercises the no-`id` path directly; fixed by dropping the `uuid` package for this call site in favor of the built-in `crypto.randomUUID()`. This same landmine is latent in every other file that imports `uuid` (10+ across the codebase) — not fixed here, out of this packet's scope, but worth a follow-up ticket since any future governed-feature test that transitively imports one of them will trip it too. |
| A membership-change handler builds claims only from the single changed row instead of the user's full active set, so an unrelated existing membership silently drops out of the synced claim | REQ-DEPT-011 contract guard asserts the DB is re-queried for all active rows before building claims, using a fixture where the changed row is a different department than an existing untouched membership |
| A membership-change handler enqueues once per changed field instead of once per logical transition, causing duplicate Firebase calls | REQ-DEPT-011 contract guard asserts `enqueueClaimsSyncJob`'s underlying `queue.enqueue` is called exactly once per invocation |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-DEPT-001 | `departmentClaims.test.ts` → "REQ-DEPT-001: department code validation" |
| REQ-DEPT-002 | `departmentClaims.test.ts` → "REQ-DEPT-002: claims built only from active rows" |
| REQ-DEPT-003 | `departmentClaims.test.ts` → "REQ-DEPT-003: revoke only on active→inactive transition" |
| REQ-DEPT-004 | `departmentClaimsSyncJob.test.ts` → "REQ-DEPT-004: enqueue never calls Firebase directly" |
| REQ-DEPT-005 | `departmentClaimsSyncJob.test.ts` → "REQ-DEPT-005: job completes only after successful Firebase call" |
| REQ-DEPT-006 | `companyAdmin.test.ts` → "REQ-DEPT-006: CompanyRepository.create captures created_by" |
| REQ-DEPT-007 | `companyAdmin.test.ts` → "REQ-DEPT-007: AuthRepository.createCompany captures created_by" |
| REQ-DEPT-008 | `companyAdmin.test.ts` → "REQ-DEPT-008: create() does not crash when id is omitted" |
| REQ-DEPT-009 | `companyAdmin.test.ts` → "REQ-DEPT-009: AuthRepository.createUser persists a caller-supplied id" |
| REQ-DEPT-010 | `companyAdmin.test.ts` → "REQ-DEPT-010: AuthRepository.setCompanyCreatedBy back-fills created_by" |
| REQ-DEPT-011 | `departmentMembershipService.test.ts` → "REQ-DEPT-011: membership change recomputes full claims set and enqueues once" |
