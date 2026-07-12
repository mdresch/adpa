# federated-capability-ownership (Phase 4) Design Spec

**Date**: 2026-07-12
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as [Phase 0](2026-07-09-federated-capability-ownership-phase0-design.md)/[Phase 1](2026-07-10-federated-capability-ownership-phase1-design.md)/[Phase 3](2026-07-11-federated-capability-ownership-phase3-design.md))

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) Action Item 5 (implementation plan Phase 4) requires a DRACO board review before a module can reach `active` — not just displayed, actually required. `promote_capability_status` (Phase 3) already accepts `p_draco_verdict_id`/`p_is_override`/`p_override_expires_at` parameters and writes them into `capability_activation_history`, but validates none of them: a transition to `active` succeeds today with a `NULL` verdict, a fabricated verdict ID, or a `REJECT`/`CONDITIONAL_PASS` verdict with no override at all.

**Scoping finding, confirmed against running code before implementation**: DRACO's `runFullReview()` (`server/src/services/dracoService.ts:245-253`) requires a real `documentId: string` and `content: string` — `draco_reviews.document_id` and `draco_overrides.document_id` both hard-FK to `documents(id)`. There is no generic "review any artifact" mode. Combined with Phase 3's own finding that `module_drift_sources` is empty (no module has real config/control content wired up yet), plan task 1 ("enqueue a DRACO board review... scoped to the module's config/control artifact") has nothing real to review today. **Decision, made explicitly with the user before implementation**: defer task 1 (auto-enqueue) and task 4 (per-finding accept/override attestation, which depends on task 1's real findings existing, and is UI-adjacent in the same way Phase 3 task 6 was) to their own follow-up. This packet builds tasks 2, 3, and 5 — the procedure-level enforcement — which don't depend on solving that problem and close a gap already confirmed live in shipped code (see below).

**A second finding, also confirmed against running code**: `server/src/routes/approvals.ts:141-176`'s existing DRACO governance gate (`POST /api/approvals`) only blocks on `verdict === 'REJECT'`. `CONDITIONAL_PASS` — which `dracoVerdictEngine.ts`'s `buildPublicationAdvisory` sets `advisable_to_publish: true` for, while still carrying unresolved `conditions_for_approval` — silently passes that gate today. This is exactly the loophole plan task 3 describes, not a hypothetical: this migration closes it for capability activation specifically (a new, separate gate), it does not modify `approvals.ts`'s existing document-approval behavior, which is out of scope for ADR-005.

## Success Criteria

- [ ] `promote_capability_status`'s transition to `active` requires a non-null `p_draco_verdict_id` that resolves to a real, existing `draco_reviews` row — not merely a non-null UUID.
- [ ] A `PASS` verdict allows activation with no override required.
- [ ] A `CONDITIONAL_PASS` or `REJECT` verdict requires `p_is_override = true`, a non-empty `p_reason` (justification), and a non-null `p_override_expires_at` (mandatory expiry) — the same requirement for both verdicts, not `REJECT` alone.
- [ ] The DRACO gate applies only to transitions targeting `active` — `draft → pending_department_approval`, `pending_department_approval/pending_re_approval → disabled`, etc. are unaffected.
- [ ] `capability_activation_history.draco_verdict_id` has a real FK to `draco_reviews(id)` — nullable (not every transition carries a verdict), but non-null values must reference a real row.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE4-DRACO-001 | Activation to `active` with `draco_verdict_id IS NULL` fails. | P0 |
| REQ-PHASE4-DRACO-002 | Activation to `active` with a `draco_verdict_id` that doesn't reference an existing `draco_reviews` row fails. | P0 |
| REQ-PHASE4-DRACO-003 | Activation to `active` with a real `PASS` verdict and no override succeeds, recording the verdict ID. | P0 |
| REQ-PHASE4-DRACO-004 | Activation to `active` with a `CONDITIONAL_PASS` **or** `REJECT` verdict and no override fails — both verdicts, not `REJECT` only. | P0 |
| REQ-PHASE4-DRACO-005 | An override attempt (`p_is_override = true`) for `CONDITIONAL_PASS`/`REJECT` with an empty/null justification fails. | P1 |
| REQ-PHASE4-DRACO-006 | An override attempt for `CONDITIONAL_PASS`/`REJECT` with no `override_expires_at` fails. | P1 |
| REQ-PHASE4-DRACO-007 | Activation to `active` with a `CONDITIONAL_PASS`/`REJECT` verdict plus a valid override (justification + expiry) succeeds, recording `draco_verdict_id`, `is_override = true`, and `override_expires_at`. | P0 |
| REQ-PHASE4-DRACO-008 | Non-`active` transitions (`draft→pending_department_approval`, `→disabled`, etc.) require no verdict at all — the gate does not leak into transitions it shouldn't apply to. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- Phase 3's transition graph and lockdown trigger — this packet only adds validation logic *inside* `promote_capability_status`'s existing `IF p_new_status = 'active'` path; the transition graph itself, the session-guard lockdown, and non-`active` transitions are unchanged. Phase 3's own contract guards (REQ-PHASE3-TRANS-001, "every legal transition succeeds") must be re-verified against this tightened procedure — done via this packet's REQ-PHASE4-DRACO-003/007, which prove `pending_department_approval → active` (a Phase 3-legal transition) still succeeds given a satisfying verdict.
- `approvals.ts`'s existing document-approval DRACO gate — untouched. This is a separate, new gate on `capability_registry` activation, not a change to document/change-request approval.
- `draco_reviews`/`draco_overrides` schema — no columns added or changed; only a new FK from `capability_activation_history.draco_verdict_id` to `draco_reviews.id`, which is additive and doesn't affect any existing DRACO consumer.

New interaction tests required when:
- Task 1 (auto-enqueue) is eventually built — it must produce a `draco_reviews.id` this procedure's gate can consume; the "what artifact" question resolved then determines whether `document_id` synthesis or a schema relaxation is needed, per the three options identified during Phase 4 planning.
- Phase 2 task 4 (`TaskApprovalGate`'s override path) is built — it becomes the actual authorization check for *who* may set `p_is_override = true`; this packet's procedure-level check (an override was recorded with justification + expiry) is necessary but not sufficient once that authorization layer exists, matching the same "NOT NULL is a backstop, not the validator" pattern the plan's Open Question §4 already flags for Phase 7.

## Verification

- Integration test (real Azure test DB, `server/tests/integration/federated-capability-ownership-phase4.test.ts`): REQ-PHASE4-DRACO-001..008. `draco_reviews` rows are inserted directly via SQL with `document_id = NULL` (the schema allows this) — this packet tests the DB-level gate, not DRACO's board-review pipeline itself.
- Manual/standalone: a one-off script (same pattern as Phases 0/1/3) exercising `promote_capability_status`'s DRACO gate against a scratch database built from the real migration chain, run once during implementation and discarded.
