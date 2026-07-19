# federated-capability-ownership (Phase 1) Design Spec

**Date**: 2026-07-10
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as [Phase 0](2026-07-09-federated-capability-ownership-phase0-design.md))

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) Action Item 2 (implementation plan Phase 1) requires every governed module to have three declared owners — `platformOperator`, `functionalOwnerDepartment`, `controlDefinitionOwnerDepartment` — as a runtime-queryable, constraint-enforceable table, not the static `governed-features.manifest.json` (a build-time file with no way to enforce a `NOT NULL` FK at activation time; that's Phase 7's job). Phase 0 gave ADPA identity a department attribute; Phase 1 gives every module an owner to check that identity against.

This packet covers only the Node-side, DB-independent contract: the reconciliation logic that decides which `(module_id, portfolio_id)` pairs need a `capability_registry` row and which existing rows no longer correspond to anything in the manifest, the row-builder that applies Phase 1's documented defaults, and attestation-cadence configuration. Raw DDL correctness (FK rejection, the `(module_id, portfolio_id)` uniqueness constraint, actual seeding against a live `portfolio_governance` table) is out of scope for this fast unit packet — it belongs to `npm run test:integration` against a real Postgres instance, consistent with how Phase 0 scoped its own DDL out. Likewise, wiring the reconciliation function into a real script/job that queries live Postgres and the manifest file is deferred — this packet ships the pure decision logic the future job calls, not the job itself.

## Success Criteria

- [ ] A pure function computes which `(module_id, portfolio_id)` combinations are missing a `capability_registry` row, given the current manifest's module ids and the current set of portfolio ids — covering both directions of drift: a new module added to the manifest, and a new portfolio created after the initial seed (implementation plan Phase 1 task 3).
- [ ] The same reconciliation also identifies "orphaned" registry rows — rows whose `module_id` no longer corresponds to any manifest packet — so a retired module doesn't leave a permanently-ungated row silently trusted forever (the "or vice versa" half of Action Item 2 / plan task 5).
- [ ] A row-builder applies Phase 1's documented defaults (`platform_operator: 'IT'`, `functional_owner_type: 'department'`) and leaves both owner-department columns unset until a business decision assigns them (plan task 3: "which department actually owns `compliance` is a business decision, not something to guess in a migration").
- [ ] Attestation cadence is read from configuration, not a hardcoded literal (plan task 4), with a documented fallback default.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-CAP-001 | Reconciliation reports a missing row for every `(manifest module_id, portfolio_id)` pair that has no matching existing `capability_registry` row — covering a new module against existing portfolios *and* an existing module against a newly-created portfolio. | P0 |
| REQ-CAP-002 | Reconciliation reports an existing row as orphaned when its `module_id` does not appear in the current manifest module id list, regardless of which portfolio it belongs to. | P0 |
| REQ-CAP-003 | Reconciliation reports no missing and no orphaned rows when the existing row set exactly matches the manifest-module × portfolio cross product — the baseline that proves the check doesn't false-positive on a fully-synced registry. | P1 |
| REQ-CAP-004 | The row builder defaults `platformOperator` to `'IT'` and `functionalOwnerType` to `'department'`, and leaves `functionalOwnerDepartment`/`controlDefinitionOwnerDepartment` as `null` unless explicitly supplied — a seed migration must never guess a real owner. | P0 |
| REQ-CAP-005 | Attestation cadence is resolved from `CAPABILITY_ATTESTATION_CADENCE_DAYS` when set to a positive number, and falls back to a documented default (90 days / quarterly) otherwise — proving it is configuration, not a migration literal. | P1 |
| REQ-CAP-006 | Reconciling against the actual `governed-features.manifest.json` module ids (not a fabricated fixture) with an empty existing-row set reports exactly one missing row per manifest feature per portfolio — grounds the abstraction in the real registry state, not just a synthetic example. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `projects` (Pillar 7) — `portfolio_id` here is a new, additive scoping column; it does not replace or compete with `company_id` scoping used by the projects packet.
- Phase 0's `federated-capability-ownership` contract — this packet adds a sibling module (`capabilityRegistry`) under the same manifest packet id and test directory; it does not modify `departmentClaims`/`departmentClaimsSyncJob`/`departmentMembershipService`'s existing behavior or shape.

New interaction tests required when:
- Phase 2 (`TaskApprovalGate`) starts reading `capability_registry.functional_owner_department`/`portfolio_id` — an overlap guard must assert against this packet's actual row shape, not a re-guessed one.
- Phase 7 adds the `NOT NULL` constraint on `functional_owner_department` — that migration must confirm every module has been assigned an owner first (this packet's reconciliation reports "missing," never "unowned"; the two are different states and must not be conflated).

## Risks

| Risk | Mitigation |
|------|------------|
| A new governed-feature packet ships (satisfying CI) with no corresponding `capability_registry` row, running permanently ungated | REQ-CAP-001/006 contract guards assert the reconciliation catches every manifest module with no matching row |
| A new portfolio is created after the initial seed and its modules are silently never gated | REQ-CAP-001 contract guard includes a portfolio-only-is-new fixture, not just a module-only-is-new one |
| A retired module's stale `capability_registry` row is mistaken for a still-governed one | REQ-CAP-002 contract guard asserts orphan detection independent of missing-row detection |
| A migration or ad-hoc script guesses a real department for `functional_owner_department` instead of leaving ownership assignment as an explicit business decision | REQ-CAP-004 contract guard asserts the builder's default leaves owner columns `null` |
| Attestation cadence hardcoded as a magic number scattered across call sites, unable to change without a code deploy | REQ-CAP-005 contract guard asserts cadence is read from environment configuration with a documented fallback |

## Out of scope (explicit)

- The `capability_registry` table's actual DDL correctness (FK to `portfolio_governance`, `UNIQUE (module_id, portfolio_id)`) — belongs to `npm run test:integration`.
- Wiring `reconcileCapabilityRegistry` into a real script/job that queries live Postgres — this packet ships the pure function the job will call, not the job.
- Extending `verify:governed-features` (`server/scripts/verify-governed-features.mjs`) to fail on missing registry rows — that script is a static, manifest/filesystem-only checker with no DB access today; a DB-aware reconciliation check is a separate operational job, not a change to that script's contract.
- Populating real `functional_owner_department`/`control_definition_owner_department` values — a business decision (plan task 3), not an engineering task.

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-CAP-001 | `capabilityRegistry.test.ts` → "REQ-CAP-001: missing rows across both drift directions" |
| REQ-CAP-002 | `capabilityRegistry.test.ts` → "REQ-CAP-002: orphaned rows" |
| REQ-CAP-003 | `capabilityRegistry.test.ts` → "REQ-CAP-003: fully-synced registry reports nothing" |
| REQ-CAP-004 | `capabilityRegistry.test.ts` → "REQ-CAP-004: row builder defaults" |
| REQ-CAP-005 | `capabilityRegistry.test.ts` → "REQ-CAP-005: attestation cadence configuration" |
| REQ-CAP-006 | `capabilityRegistry.test.ts` → "REQ-CAP-006: reconciles against the real manifest" |
