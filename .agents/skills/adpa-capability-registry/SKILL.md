---
name: adpa-capability-registry
description: Capability ownership registry reconciliation for governed modules (ADR-005 Phase 1) — which (module_id, portfolio_id) pairs need a capability_registry row, which existing rows are orphaned, and the owner-column defaults a seed must never guess. Load when touching capability_registry, governed-features.manifest.json cross-referencing, or attestation cadence.
---

# ADPA Capability Registry

## Purpose

Every governed module needs three declared owners (`platformOperator`, `functionalOwnerDepartment`, `controlDefinitionOwnerDepartment`) as a runtime-queryable, constraint-enforceable table — `capability_registry` — not just an entry in the build-time `governed-features.manifest.json`. This packet's current scope is the pure reconciliation contract: given the manifest's module ids, the current set of portfolio ids, and the registry's existing rows, decide which `(module_id, portfolio_id)` pairs are missing a row and which existing rows no longer correspond to anything in the manifest. See [the Phase 1 design spec](../../../docs/superpowers/specs/2026-07-10-federated-capability-ownership-phase1-design.md) and [the implementation plan](../../../docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md#phase-1-action-item-2-capability-ownership-registry).

Sibling skill: [adpa-federated-capability-ownership](../adpa-federated-capability-ownership/SKILL.md) covers Phase 0 (department identity, Firebase claims sync, `companies.created_by`) under the same governed-feature packet.

This skill also now covers the read-only HTTP lookup (`CapabilityRegistryRepository`/`CapabilityRegistryController`, `GET /api/v1/capability-registry/:moduleId/:portfolioId`) that Phase 2's .NET `TaskApprovalGate` calls to resolve a module's declared owner — the orchestrator's `GovernanceDbContext` is a physically separate Postgres database (Aspire-provisioned `governance-ledger`) and cannot query `capability_registry` directly. See `adpa-task-approval-gate` for the orchestrator-side consumer.

## Invariants

- Must always: scope `capability_registry` by `portfolio_id`, not `company_id`/`tenant_id` alone — activation is per-portfolio, matching Phase 0's identity scoping.
- Must always: treat "missing a row" and "row exists but has no owner assigned" as distinct states. Reconciliation (this packet) only detects the former. Populating a real `functionalOwnerDepartment`/`controlDefinitionOwnerDepartment` value is a business decision, never guessed by a migration or the row builder.
- Must always: detect drift in both directions — a module added to the manifest with no row yet, *and* a portfolio created after the initial seed with no rows for any existing module. Checking only "new module" misses the second case.
- Must always: detect orphaned rows (a `module_id` no longer present in the manifest) as a distinct check from missing rows — a retired module's stale row must not be mistaken for a still-governed one.
- Must always: default `platformOperator` to `'IT'` and `functionalOwnerType` to `'department'` in the row builder — these are Phase 1's documented defaults, not placeholders that happen to work.
- Must always: read attestation cadence from configuration (`CAPABILITY_ATTESTATION_CADENCE_DAYS`), never hardcode the cadence as a literal at a call site.
- Must never: treat this packet's reconciliation as the actual DB-side enforcement. The live check (querying real Postgres, actually inserting missing rows, alerting on orphans) is a separate operational job that calls this pure logic — not built in this packet, same scoping discipline Phase 0 applied to its own DDL.
- Must never: extend `server/scripts/verify-governed-features.mjs` to do this reconciliation — that script is a static, filesystem-only checker with no DB access; conflating the two would give it a dependency it doesn't have today.
- Must always: keep the `GET /api/v1/capability-registry/:moduleId/:portfolioId` lookup read-only and unauthenticated-by-design (no user JWT exists on this service-to-service call) — matches the existing no-auth-header convention already used by the orchestrator's other typed HttpClients (`GovernanceApiClient`, `IntelligenceClient`); trust is via the internal network boundary, not a credential.

## Interaction Rules

- Must not break `projects` (Pillar 7) tenant/portfolio scoping — `portfolio_id` here is additive, not a replacement for `company_id`.
- Shares a manifest packet id (`federated-capability-ownership`) and test directory (`server/src/__tests__/modules/federated-capability-ownership/`) with Phase 0's `adpa-federated-capability-ownership` skill — this packet's tests must not alter Phase 0's existing test files or their asserted shapes.
- Depends on: nothing yet (additive to Phase 0, no cross-dependency per the implementation plan's sequencing note). Later phases depend on this one — Phase 2's `TaskApprovalGate` and Phase 7's `NOT NULL` constraint both read `capability_registry`'s actual row shape.

## Key Files

| File | Role |
|------|------|
| `server/src/modules/capabilityRegistry/capabilityRegistryReconciliation.ts` | Pure logic: `reconcileCapabilityRegistry` (missing/orphaned rows), `buildCapabilityRegistryRow` (owner-column defaults), `getAttestationCadenceDays` (config-driven cadence) |
| `server/migrations/433_capability_registry.sql` | Creates `capability_registry` (FK to `portfolio_governance`, `UNIQUE (module_id, portfolio_id)`) — DDL correctness itself is integration-test territory |
| `server/src/__tests__/modules/federated-capability-ownership/capabilityRegistry.test.ts` | Contract Guards: REQ-CAP-001..006 |
| `server/src/modules/capabilityRegistry/CapabilityRegistryRepository.ts` | DB-backed lookup: `findByModuleAndPortfolio(moduleId, portfolioId)` — scoped by both, never module_id alone |
| `server/src/modules/capabilityRegistry/CapabilityRegistryController.ts` / `routes.ts` | `GET /api/v1/capability-registry/:moduleId/:portfolioId` — Phase 2's only way to read `capability_registry` from the orchestrator |
| `server/src/__tests__/modules/federated-capability-ownership/capabilityRegistryRepository.test.ts` | Contract Guards: REQ-CAP-007..008 |

## Commands

```powershell
cd server
npm run test:features -- federated-capability-ownership   # this packet only (Phase 0 + Phase 1 tests)
npm run test:features                                      # all governed packets (CI)
npm run verify:governed-features
```

## Related Skills

- `adpa-federated-capability-ownership` — Phase 0, the identity/claims-sync sibling under the same packet
- `adpa-task-approval-gate` — Phase 2, the orchestrator-side consumer of the lookup endpoint this skill documents
- `adpa-governed-feature-loop` — the process this packet follows
- `adpa-projects-pillar7` — sibling tenant/portfolio scoping conventions
- `adpa-aev-workflow` — required for the Phase 2/3/6/7 orchestrator-side work this packet precedes
