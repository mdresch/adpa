---
name: adpa-capability-activation-lifecycle
description: Module activation state machine for governed modules (ADR-005 Phase 3) — capability_registry.activation_status, promote_capability_status, the stored-procedure-only lockdown trigger, and the drift-detection mechanism (module_drift_sources / attach_module_drift_trigger). Load when touching activation_status, capability_activation_history, or wiring a module's config/control table into drift detection.
---

# ADPA Capability Activation Lifecycle

## Purpose

`capability_registry` rows move through a real state machine — `draft → pending_department_approval → active → pending_re_approval → disabled` — instead of being a feature-flag-style toggle. Every transition is written through one stored procedure, `promote_capability_status`, which is also the only place a transition can be attempted, validated, and recorded (`capability_activation_history`) — modeled on `template-lifecycle`'s `promote_template_status` / `template_status_history` pattern (`server/migrations/000_baseline.sql` ~13036-13146 / ~7769-7781), with one deliberate deviation (see next section). See [the Phase 3 design spec](../../../docs/superpowers/specs/2026-07-11-federated-capability-ownership-phase3-design.md) and [the implementation plan](../../../docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md#phase-3-action-item-4-module-activation-lifecycle).

**Deferred, not part of this skill's scope**: the five-party "break-glass" escalation subsystem for structurally-deadlocked departments (plan task 6), Phase 2 task 4's `TaskApprovalGate` override path, and the override-expiry warning/revert half of the scheduled sweep. All three depend on something setting `capability_activation_history.is_override = true`, which nothing does yet. When one of them is built, it should extend this skill, not duplicate it.

## Invariants

- Must always: change `activation_status` only through `promote_capability_status(p_capability_id, p_new_status, p_changed_by, p_reason, p_draco_verdict_id, p_is_override, p_override_expires_at)`. There is no other sanctioned write path.
- Must never: assume `template-lifecycle`'s lockdown pattern is a `REVOKE`-based DB-privilege separation — it isn't, in this codebase or in this feature. `000_baseline.sql` and every migration were grepped for `REVOKE`: zero hits. This app also connects to Postgres via one `DATABASE_URL`/role for both migrations and runtime — there's no separate low-privilege app role to revoke from without rewiring deployment credentials. This packet's lockdown is a `BEFORE UPDATE` trigger (`guard_capability_registry_activation_status`) checking a session-local guard variable (`current_setting('adpa.allow_activation_status_write', true)`) that only `promote_capability_status` sets — enforced even against a superuser session, no role separation required.
- Must always: keep the transition graph in `promote_capability_status` exactly as narrow as the plan's stated flow — `draft→{pending_department_approval}`, `pending_department_approval→{active,disabled}`, `active→{pending_re_approval,disabled}`, `pending_re_approval→{active,disabled}`, `disabled→{}` (terminal). A future phase adding a precondition (Phase 4's DRACO-verdict-required-for-`→active`, Phase 7's `functional_owner_department NOT NULL`-required) extends this same procedure's validation step — it does not bypass it or duplicate the transition graph elsewhere.
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
- New interaction tests required when: Phase 4 (DRACO) starts requiring `draco_verdict_id` for `→active`, or Phase 7 adds the `functional_owner_department NOT NULL` precondition — both extend `promote_capability_status`'s validation step, and existing Phase 3 contract guards asserting "a legal transition succeeds" must be re-verified against the tightened precondition, not assumed to still pass.

## Key Files

| File | Role |
|------|------|
| `server/migrations/435_module_activation_lifecycle.sql` | `activation_status` column + CHECK, `capability_activation_history`, `module_drift_sources`, the lockdown trigger, `promote_capability_status`, `capability_drift_trigger_fn`, `attach_module_drift_trigger` |
| `server/src/modules/capabilityRegistry/attestationLapseCheck.ts` | Pure logic: `findLapsedAttestations` — which active rows have a past-due `attestation_due_at` |
| `server/src/jobs/capabilityAttestationJob.ts` | Scheduled sweep (hourly `setInterval`, mirrors `qualitySLAJob.ts`'s structure) calling `promote_capability_status` for each lapsed row |
| `server/src/startup/serverBootstrap.ts` | Registers `scheduleCapabilityAttestationSweep()`, gated by `!SKIP_JOBS && !VERCEL`, same convention as `templateAnalysisJob`/`stuckJobMonitor` |
| `server/src/__tests__/modules/federated-capability-ownership/attestationLapseCheck.test.ts` | Contract Guards: REQ-PHASE3-ATT-001..005 |
| `server/tests/integration/federated-capability-ownership-phase3.test.ts` | Real-Postgres proof: lockdown rejection, legal/illegal transitions, terminal-state rejection, drift mechanism against a scratch table (monitored-column fire, non-monitored-column no-fire, non-active-capability no-fire) |

## Commands

```powershell
cd server
npm run test:features -- federated-capability-ownership   # pure-logic regression (all Phase 0-3 unit tests)
npm run verify:governed-features
npm run test:integration                                    # real Azure test DB — Phase 3's actual proof
```

## Related Skills

- `adpa-capability-registry` — Phase 1, the registry this packet's state machine is built on
- `adpa-task-approval-gate` — Phase 2, the gate this packet's lifecycle plugs into
- `adpa-federated-capability-ownership` — Phase 0, department identity underlying the eventual approval gate
- `adpa-governed-feature-loop` — the process this packet follows
- `adpa-aev-workflow` — required for the Phase 4/6/7 orchestrator-and-DRACO work still ahead
