# federated-capability-ownership (Phase 3) Design Spec

**Date**: 2026-07-11
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as [Phase 0](2026-07-09-federated-capability-ownership-phase0-design.md)/[Phase 1](2026-07-10-federated-capability-ownership-phase1-design.md))

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) Action Item 4 (implementation plan Phase 3) requires `capability_registry` rows to move through a real, enforced state machine — `draft → pending_department_approval → active → pending_re_approval → disabled` — rather than being a free-form status column any code path can set. Phase 1 gave every module an owner; Phase 3 gives the registry the lifecycle that owner actually approves against, modeled on `template-lifecycle`'s stored-procedure + audit-trail pattern.

Two scope decisions, made explicitly rather than inherited silently from the plan text:

1. **Lockdown mechanism.** The plan assumes a `REVOKE UPDATE ... FROM <app_role>` approach, copying `template-lifecycle`. That pattern doesn't actually exist anywhere in this codebase — `template_status_history`'s "lockdown" is convention-only (grepped `000_baseline.sql` and every migration for `REVOKE`: zero hits), and this app connects to Postgres via a single `DATABASE_URL`/role for both migrations and runtime, so there's no separate low-privilege role to revoke from without rewiring deployment credentials. This packet uses a `BEFORE UPDATE` trigger + session-local guard variable instead (see Decision).
2. **Scope cut.** Plan task 6 (a five-party "break-glass" escalation subsystem for structurally-deadlocked departments) is confirmed net-new with no in-repo precedent and no verifiable external reference from this codebase. Deferred to its own follow-up. This packet covers plan tasks 1-5. The override-expiry half of task 5 (24h/12h warnings, auto-revert) is further deferred within task 5 itself, since nothing sets `capability_activation_history.is_override = true` yet — building that sweep now would have nothing real to exercise it against, the same reasoning Phase 2 already applied when it deferred its own override path to land with Phase 3.

## Success Criteria

- [ ] `capability_registry.activation_status` can only be changed by calling `promote_capability_status` — a direct `UPDATE` is rejected, enforced by a `BEFORE UPDATE` trigger checking a session-local guard variable, not by DB role privileges (see Problem #1).
- [ ] `promote_capability_status` validates the transition against a fixed graph before writing anything — an illegal hop (e.g. `draft → active`, skipping approval) raises and leaves no `capability_activation_history` row.
- [ ] Every successful transition writes exactly one `capability_activation_history` row recording `old_status`/`new_status`/`changed_by`/`reason` (plus `draco_verdict_id`/`is_override`/`override_expires_at` fields Phase 4/a future override-writer will populate).
- [ ] A module's linked config/control table can opt into drift detection via `attach_module_drift_trigger(module_id, table_name, monitored_columns)`, which safely (identifier-quoted, no string concatenation of caller input) attaches a trigger that reverts an `active` capability to `pending_re_approval` when a monitored column changes — and does nothing when a non-monitored column changes, or the capability isn't currently `active`.
- [ ] A scheduled job reverts `active` capabilities whose `attestation_due_at` has lapsed to `pending_re_approval`, via the same `promote_capability_status` path as any other transition.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE3-LOCK-001 | A direct `UPDATE capability_registry SET activation_status = ...` is rejected by the `BEFORE UPDATE` trigger, regardless of the calling role's privilege level. | P0 |
| REQ-PHASE3-TRANS-001 | `promote_capability_status` succeeds on every transition in the fixed graph (`draft→pending_department_approval`, `pending_department_approval→{active,disabled}`, `active→{pending_re_approval,disabled}`, `pending_re_approval→{active,disabled}`) and writes exactly one matching `capability_activation_history` row. | P0 |
| REQ-PHASE3-TRANS-002 | `promote_capability_status` rejects any transition not in the graph (including out of the terminal `disabled` state) and writes no history row. | P0 |
| REQ-PHASE3-DRIFT-001 | `attach_module_drift_trigger` on a table with `module_id`/`portfolio_id` columns, once a matching `capability_registry` row is `active`: a monitored-column `UPDATE` reverts that capability to `pending_re_approval` with a `capability_activation_history` row recording the drift. | P0 |
| REQ-PHASE3-DRIFT-002 | The same trigger does not fire when a *non*-monitored column changes on the linked table (native `AFTER UPDATE OF <cols>` filtering). | P0 |
| REQ-PHASE3-DRIFT-003 | The same trigger does not fire, and raises no error, when the matching capability is not currently `active` (e.g. still `draft`). | P1 |
| REQ-PHASE3-ATT-001..005 | `findLapsedAttestations` (pure logic) flags only `active` rows with a past-due, non-null `attestation_due_at`; leaves `draft`/`pending_department_approval`/`pending_re_approval`/`disabled` rows alone even if overdue; accepts both `Date` and raw string DB values. | P0 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- Phase 1's `capability_registry` row shape (`UNIQUE (module_id, portfolio_id)`, owner columns, `insertMissing`'s `ON CONFLICT DO NOTHING`) — this packet only adds `activation_status` and a lockdown trigger; it does not alter existing column semantics or the seed/reconciliation path.
- `template-lifecycle`'s own `templates.development_status`/`template_status_history` — a structurally similar but entirely separate table/procedure pair; this packet's trigger/procedure names are namespaced to `capability_registry`/`capability_activation_history` and do not touch `templates`.

New interaction tests required when:
- Phase 4 (DRACO) adds a `draco_verdict_id NOT NULL`-for-`→active` precondition inside `promote_capability_status` — this packet's REQ-PHASE3-TRANS-001 ("every graph transition succeeds") must be re-verified against the tightened procedure, not assumed to still hold unmodified.
- Phase 7 adds the `functional_owner_department NOT NULL` precondition for the same procedure.
- Any feature starts setting `capability_activation_history.is_override = true` (Phase 2 task 4 or Phase 3 task 6) — the deferred override-expiry sweep half of task 5 lands then, with its own contract guards.

## Verification

- Contract guard (backend Jest, `server/src/__tests__/modules/federated-capability-ownership/attestationLapseCheck.test.ts`): REQ-PHASE3-ATT-001..005, pure logic, no DB.
- Integration test (real Azure test DB, `server/tests/integration/federated-capability-ownership-phase3.test.ts`): REQ-PHASE3-LOCK-001, REQ-PHASE3-TRANS-001..002, REQ-PHASE3-DRIFT-001..003 — the DDL/trigger/dynamic-SQL correctness this fast unit packet cannot cover, consistent with how Phase 0/1 scoped their own DDL out of the fast packet.
- Manual/standalone: a one-off script (same pattern as Phase 0/1's real-DB verification) exercising `promote_capability_status` and `attach_module_drift_trigger` against a scratch database built from the real migration chain, run once during implementation and discarded — not part of the committed test suite.
