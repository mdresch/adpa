# federated-capability-ownership (Phase 5) Design Spec

**Date**: 2026-07-12
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as [Phase 0](2026-07-09-federated-capability-ownership-phase0-design.md)/[Phase 1](2026-07-10-federated-capability-ownership-phase1-design.md)/[Phase 3](2026-07-11-federated-capability-ownership-phase3-design.md)/[Phase 4](2026-07-12-federated-capability-ownership-phase4-design.md))

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) Action Item 6 (implementation plan Phase 5) asks for tamper-evidence on the orchestrator's `governance_ledger`, matching `audit_log`'s existing SHA-256 hash-chain pattern, plus a privilege lockdown and an independent reconciliation job. Two scoping findings, confirmed against running code before implementation:

1. **`governance_ledger` has no real in-repo writer.** `GovernanceLedgerRow` is explicitly documented in its own source as "owned by RPAS.Governance.Api writes" — an external service referenced by config (`RPAS_GOVERNANCE_URL`) that does not exist anywhere in this repository. The orchestrator's in-repo dev fallback path (`Governance:ApprovalsEnforced=false`) mutates `BusinessCases.ApprovalStatus` directly instead. No `GovernanceLedgerRows.Add(...)`/`SaveChangesAsync` call site touching this table exists in-repo. This rules out an EF `SaveChanges` interceptor (task 1's stated fallback) — it would only catch writes from this repo's own code, which today is none, defeating the tamper-evidence goal. A Postgres trigger is used instead specifically because it protects the table at the DB layer regardless of which writer (in-repo or the external service) eventually inserts into it.
2. **The orchestrator has the same single-DB-role limitation Node had.** `Adpa.AppHost/Program.cs` provisions one Postgres container/role for both migrations and runtime, via one Aspire-injected connection string — confirmed no second, lower-privilege credential exists anywhere in the orchestrator's configuration. Task 2's `REVOKE`-based lockdown is infeasible here for the identical structural reason `435_module_activation_lifecycle.sql` found on the Node side. Unlike the Node side, though, there is also **no existing legitimate in-repo writer** to gate a session-guard-style lockdown trigger through (finding 1) — a write-lockdown trigger for `governance_ledger` is therefore deliberately deferred, not attempted with a placeholder exception carved for a writer that doesn't exist.

**Verification limitation, disclosed rather than silently worked around**: this authoring session has no reachable Docker/Aspire container, so the orchestrator-side migration could be written and compiled (`dotnet build -c Release`, confirmed 0 errors/0 warnings) but not applied against a live `governance-ledger` Postgres or observed firing end-to-end. This is a materially different situation from the Node side, which has a real, externally-reachable Azure test DB credential (`server/.env.test`) this session used for full end-to-end proof of every other task in this phase.

**Scope, decided explicitly with the user before implementation**: build task 1 (governance_ledger hash-chain trigger) compile-verified only; build the Node-side half of task 2 (capability_activation_history lockdown, which **is** real — confirmed no existing lockdown on this table at all, unlike `activation_status`), task 3 (presence-check reconciliation only, not the content-hash-vs-`config_snapshot_hash` half — nothing populates `config_snapshot_hash` yet, the same wall Phase 3/4 hit), and task 4 (liveness monitoring).

## Success Criteria

- [ ] `governance_ledger` gains `PrevHash`/`Hash` columns and a `BEFORE INSERT` trigger computing a SHA-256 chain over row content + prior hash, mirroring `audit_log_before_insert()`'s pattern exactly (adapted for this table's PascalCase-quoted columns and `Guid` primary key). Compiles cleanly (`dotnet build -c Release`); not applied/observed against a live DB in this session.
- [ ] `capability_activation_history` cannot be written to except via `promote_capability_status` (INSERT) — and never via `UPDATE`/`DELETE`, not even by that procedure, since there is no legitimate reason to ever modify or remove a written history row.
- [ ] A reconciliation sweep flags any `capability_registry` row whose `activation_status` disagrees with (or has no) matching `capability_activation_history` entry — the presence-check half of task 3.
- [ ] Scheduled jobs record their own heartbeat on every run (success or failure); a stale job (no success within 2x its expected interval) is detectable.
- [ ] The new reconciliation job's own liveness is monitored — by the already-running `capabilityAttestationJob`, not a third scheduled job whose own liveness would then also need monitoring.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE5-LOCK-001 | A direct `INSERT` into `capability_activation_history` bypassing `promote_capability_status` is rejected. | P0 |
| REQ-PHASE5-LOCK-002 | A direct `UPDATE` of an existing `capability_activation_history` row is rejected, unconditionally. | P0 |
| REQ-PHASE5-LOCK-003 | A direct `DELETE` of an existing `capability_activation_history` row is rejected, unconditionally. | P0 |
| REQ-PHASE5-LOCK-004 | `promote_capability_status`'s own INSERT into `capability_activation_history` still succeeds — the lockdown does not break the sanctioned write path. | P0 |
| REQ-PHASE5-RECON-001..006 | `reconcileActivationHistory` (pure logic): no flag when status matches; no flag for `draft` with no history at all; flag an `active`/etc. row with no history; flag a status/history mismatch; a `draft` row *with* a disagreeing history row is still flagged (the no-history exemption is narrow); mixed-batch reconciliation only flags the genuinely drifted rows. | P0/P1 |
| REQ-PHASE5-LIVE-001..006 | `findStaleJobs` (pure logic): not stale within the interval; not stale within 2x the interval; stale beyond 2x; stale with no heartbeat row at all; stale with a heartbeat row that has never succeeded; accepts string dates from raw DB rows. | P0/P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- Phase 3/4's `promote_capability_status` — this packet only wraps its existing `INSERT INTO capability_activation_history` with a new session-guard variable (`adpa.allow_activation_history_write`), set immediately before and reset immediately after, mirroring the existing `activation_status` guard pattern exactly. The transition graph, DRACO verdict gate, and `activation_status` lockdown are otherwise unchanged.
- `capabilityAttestationJob`'s existing behavior — it gains a heartbeat-recording call and a reconciliation-liveness check at the start of each tick, but its own attestation-lapse logic (Phase 3 task 5) is untouched.
- `GovernanceDbContext`'s other entities (`BusinessCase`, `IdeationSummary`, `MsrfEvaluation`, `RtmAmendment`, `RtmRequirement`, `AuthorityTokenRow`) — the new migration only adds columns to `governance_ledger` and a trigger scoped to that table.

New interaction tests required when:
- Phase 2 task 4 or Phase 3 task 6 (whichever first sets `capability_activation_history.is_override = true`) lands — the append-only lockdown must be re-verified to still permit `promote_capability_status`'s INSERT when override fields are populated, not just the bare-minimum case this packet tested.
- A real writer for `governance_ledger` is established (either this repo gains a real write path, or `RPAS.Governance.Api` is reachable from a test environment) — at that point the hash-chain trigger should get the same real-DB, end-to-end proof this session could only compile-check, and the deferred write-lockdown (task 2's governance_ledger half) should be revisited now that a legitimate writer exists to gate a session-guard trigger through.

## Verification

- Contract guards (backend Jest): REQ-PHASE5-RECON-001..006 (`activationHistoryReconciliation.test.ts`), REQ-PHASE5-LIVE-001..006 (`jobLivenessCheck.test.ts`) — pure logic, no DB.
- Integration/standalone (real Azure test DB): REQ-PHASE5-LOCK-001..004, plus the reconciliation job and heartbeat table exercised end-to-end via a one-off script (same pattern as Phases 0/1/3/4), run once during implementation and discarded.
- Orchestrator: `dotnet build -c Release` (confirmed 0 errors/0 warnings). **Not verified**: the trigger has not been applied against, or observed firing correctly on, a live `governance-ledger` Postgres — no Docker/Aspire container was reachable in this authoring session. Flagged explicitly rather than claimed as tested.
