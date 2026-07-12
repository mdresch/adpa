---
name: adpa-capability-activation-lifecycle
description: Module activation state machine for governed modules (ADR-005 Phases 3-4) — capability_registry.activation_status, promote_capability_status (including its DRACO verdict gate), the stored-procedure-only lockdown trigger, and the drift-detection mechanism (module_drift_sources / attach_module_drift_trigger). Load when touching activation_status, capability_activation_history, DRACO-gated activation, or wiring a module's config/control table into drift detection.
---

# ADPA Capability Activation Lifecycle

## Purpose

`capability_registry` rows move through a real state machine — `draft → pending_department_approval → active → pending_re_approval → disabled` — instead of being a feature-flag-style toggle. Every transition is written through one stored procedure, `promote_capability_status`, which is also the only place a transition can be attempted, validated, and recorded (`capability_activation_history`) — modeled on `template-lifecycle`'s `promote_template_status` / `template_status_history` pattern (`server/migrations/000_baseline.sql` ~13036-13146 / ~7769-7781), with one deliberate deviation (see next section). Phase 4 layers a DRACO verdict gate onto the same procedure's `→active` path. See [the Phase 3 design spec](../../../docs/superpowers/specs/2026-07-11-federated-capability-ownership-phase3-design.md), [the Phase 4 design spec](../../../docs/superpowers/specs/2026-07-12-federated-capability-ownership-phase4-design.md), and [the implementation plan](../../../docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md#phase-3-action-item-4-module-activation-lifecycle).

**Deferred, not part of this skill's scope**:
- The five-party "break-glass" escalation subsystem for structurally-deadlocked departments (Phase 3 plan task 6), Phase 2 task 4's `TaskApprovalGate` override path, and the override-expiry warning/revert half of the scheduled sweep. All three depend on something setting `capability_activation_history.is_override = true`, which nothing does yet.
- Phase 4 plan task 1 (auto-enqueueing a DRACO review when a module transitions to `pending_department_approval`) and task 4 (per-finding accept/override attestation). **Confirmed scoping blocker, not just deferred for convenience**: DRACO's `runFullReview()` (`server/src/services/dracoService.ts`) requires a real `documents.id` — `draco_reviews.document_id`/`draco_overrides.document_id` both hard-FK to `documents`. There is no generic "review any artifact" mode, and no module has real config/control content to review yet (`module_drift_sources` is still empty). Resolving this needs one of: synthesizing a placeholder `documents` row per module, relaxing DRACO's schema to a generic subject reference, or some other explicit decision — not something to silently paper over when task 1 is eventually picked up.

When one of these is built, it should extend this skill, not duplicate it.

## Invariants

- Must always: change `activation_status` only through `promote_capability_status(p_capability_id, p_new_status, p_changed_by, p_reason, p_draco_verdict_id, p_is_override, p_override_expires_at)`. There is no other sanctioned write path.
- Must never: assume `template-lifecycle`'s lockdown pattern is a `REVOKE`-based DB-privilege separation — it isn't, in this codebase or in this feature. `000_baseline.sql` and every migration were grepped for `REVOKE`: zero hits. This app also connects to Postgres via one `DATABASE_URL`/role for both migrations and runtime — there's no separate low-privilege app role to revoke from without rewiring deployment credentials. This packet's lockdown is a `BEFORE UPDATE` trigger (`guard_capability_registry_activation_status`) checking a session-local guard variable (`current_setting('adpa.allow_activation_status_write', true)`) that only `promote_capability_status` sets — enforced even against a superuser session, no role separation required.
- Must always: keep the transition graph in `promote_capability_status` exactly as narrow as the plan's stated flow — `draft→{pending_department_approval}`, `pending_department_approval→{active,disabled}`, `active→{pending_re_approval,disabled}`, `pending_re_approval→{active,disabled}`, `disabled→{}` (terminal). Phase 4's DRACO gate and Phase 7's future `functional_owner_department NOT NULL` precondition extend this same procedure's validation step — they do not bypass it or duplicate the transition graph elsewhere.
- Must always (Phase 4): require `p_draco_verdict_id` to be non-null **and** resolve to a real `draco_reviews` row for any transition to `active` — `capability_activation_history.draco_verdict_id` has a real FK to `draco_reviews(id)` (migration 436) so this is enforced at INSERT time too, but the procedure checks explicitly first for a clear exception message rather than a raw FK-violation.
- Must always (Phase 4): require an override (`p_is_override = true`, non-empty `p_reason`, non-null `p_override_expires_at`) for **both** `CONDITIONAL_PASS` and `REJECT` verdicts, not `REJECT` alone — confirmed against `dracoVerdictEngine.ts`'s `buildPublicationAdvisory` that `CONDITIONAL_PASS` sets `advisable_to_publish: true` while still carrying unresolved `conditions_for_approval`, and confirmed against `server/src/routes/approvals.ts:141-176` that the existing document-approval DRACO gate has exactly this gap today (checks `REJECT` only) — this procedure closes it for capability activation, it does not fix `approvals.ts`.
- Must never (Phase 4): treat this procedure's override check as authorization. It only verifies an override was *recorded* (flag + justification + expiry) — it does not verify *who* recorded it or their department membership. That authorization check is `TaskApprovalGate`'s job (Phase 2 task 4, not yet built) layered on top of this same procedure, the same "NOT NULL is a backstop, not the validator" pattern the plan's Open Question §4 already flags for Phase 7's precondition.
- Must always: reset the session guard to `'off'` immediately after `promote_capability_status`'s own `UPDATE`, not leave it `'on'` for the rest of the calling transaction — `set_config(..., true)` (is_local) only reverts at transaction end by default, and closing the window right after the one sanctioned write is what keeps a same-transaction raw `UPDATE` piggyback from also slipping through.
- Must always: treat the drift mechanism as opt-in, metadata-driven infrastructure, not a mechanism tied to any specific existing module — `module_drift_sources` starts empty because no governed module currently has a config/control table wired into this system. A table adopts drift detection by calling `attach_module_drift_trigger(module_id, table_name, monitored_columns)`; it must carry `module_id`/`portfolio_id` columns matching `capability_registry`'s own scoping (by convention — there is no other precedent to match against yet).
- Must always: build dynamic trigger/column SQL in `attach_module_drift_trigger` using `format()`'s `%I` (identifier quoting) and `quote_ident()` per column — never string-concatenate a caller-supplied table/column name into executable SQL.
- Must always: rely on `AFTER UPDATE OF <monitored_columns>` (native Postgres column-filtered trigger firing) for "don't fire on metadata-only writes" — this is simpler than, and equivalent to, a manual `WHEN` clause comparing OLD/NEW per excluded column.
- Must always: no-op the drift trigger (not error) when the matching `capability_registry` row isn't currently `active`, or when the row doesn't carry a resolvable `module_id`/`portfolio_id` pair — a config edit on a non-active module isn't a failure worth surfacing here.
- Must never: fold the attestation-lapse sweep's override-expiry half into this pass — `is_override`/`override_expires_at`/`warned_24h_at`/`warned_12h_at` columns exist on `capability_activation_history` (part of this packet's own schema), but nothing populates `is_override` yet, so a sweep reading it would always find zero rows. Build that sweep together with whichever feature starts setting `is_override = true`.
- Must never: treat "shared-table storm" (one config-table change re-opening several modules' approvals at once) as N independent, unrelated transitions when investigating — it's visible today via `capability_activation_history` rows sharing a `changed_at`/reason; no separate alerting channel is wired (deferred hardening item, not core mechanism).

## Interaction Rules

- Depends on: `adpa-capability-registry` (Phase 1 — the table this packet adds `activation_status` to) and `adpa-task-approval-gate` (Phase 2 — the gate this state machine plugs into, per the plan's own sequencing note).
- Must not break: Phase 1's `capability_registry` row shape (`UNIQUE (module_id, portfolio_id)`, owner columns) — this packet only adds a column and a lockdown trigger, it doesn't change existing columns' semantics.
- New interaction tests required when: Phase 7 adds the `functional_owner_department NOT NULL` precondition — extends `promote_capability_status`'s validation step the same way Phase 4 did, and existing Phase 3/4 contract guards asserting "a legal, verdict-satisfying transition succeeds" must be re-verified against the further-tightened precondition, not assumed to still pass. Also when Phase 4 task 1 is eventually built — it must produce a `draco_reviews.id` this procedure's gate can consume as-is; no change to the gate itself should be needed, only to how a verdict ID gets created.

## Key Files

| File | Role |
|------|------|
| `server/migrations/435_module_activation_lifecycle.sql` | `activation_status` column + CHECK, `capability_activation_history`, `module_drift_sources`, the lockdown trigger, `promote_capability_status`, `capability_drift_trigger_fn`, `attach_module_drift_trigger` |
| `server/migrations/436_draco_activation_gate.sql` | FK from `capability_activation_history.draco_verdict_id` to `draco_reviews(id)`; redefines `promote_capability_status` to add the DRACO verdict gate on `→active` (verdict required, `CONDITIONAL_PASS`/`REJECT` require a recorded override) |
| `server/src/modules/capabilityRegistry/attestationLapseCheck.ts` | Pure logic: `findLapsedAttestations` — which active rows have a past-due `attestation_due_at` |
| `server/src/jobs/capabilityAttestationJob.ts` | Scheduled sweep (hourly `setInterval`, mirrors `qualitySLAJob.ts`'s structure) calling `promote_capability_status` for each lapsed row |
| `server/src/startup/serverBootstrap.ts` | Registers `scheduleCapabilityAttestationSweep()`, gated by `!SKIP_JOBS && !VERCEL`, same convention as `templateAnalysisJob`/`stuckJobMonitor` |
| `server/src/__tests__/modules/federated-capability-ownership/attestationLapseCheck.test.ts` | Contract Guards: REQ-PHASE3-ATT-001..005 |
| `server/tests/integration/federated-capability-ownership-phase3.test.ts` | Real-Postgres proof: lockdown rejection, legal/illegal transitions, terminal-state rejection, drift mechanism against a scratch table |
| `server/tests/integration/federated-capability-ownership-phase4.test.ts` | Real-Postgres proof: REQ-PHASE4-DRACO-001..008 — verdict-required, verdict-must-exist, `PASS` needs no override, `CONDITIONAL_PASS`/`REJECT` both need one, override needs justification + expiry, non-`active` transitions unaffected. `draco_reviews` rows inserted directly via SQL (`document_id = NULL`, which the schema allows) — this tests the DB gate, not DRACO's board-review pipeline |

## Commands

```powershell
cd server
npm run test:features -- federated-capability-ownership   # pure-logic regression (all Phase 0-4 unit tests)
npm run verify:governed-features
npm run test:integration                                    # real Azure test DB — Phases 0-4's actual proof
```

## Related Skills

- `adpa-capability-registry` — Phase 1, the registry this packet's state machine is built on
- `adpa-task-approval-gate` — Phase 2, the gate this packet's lifecycle plugs into
- `adpa-federated-capability-ownership` — Phase 0, department identity underlying the eventual approval gate
- `adpa-governed-feature-loop` — the process this packet follows
- `adpa-aev-workflow` — required for the Phase 6/7 orchestrator work still ahead, and for whichever future work resolves Phase 4 task 1's DRACO-artifact scoping question
