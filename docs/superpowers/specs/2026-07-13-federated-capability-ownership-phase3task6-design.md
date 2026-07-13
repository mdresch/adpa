# federated-capability-ownership (Phase 3 task 6: break-glass) Design Spec

**Date**: 2026-07-13
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as prior phases)

---

## Problem

Phase 2 task 4's override path requires two distinct active members of the target department in the capability's own portfolio. A department with fewer than two active members there cannot satisfy that requirement no matter how legitimate the need — a structural, not transient, deadlock (distinct from Open Question §1(a)'s "temporarily unreachable department," which Phase 0's `deputy` role partially addresses). This is the plan's Open Question §1(b), resolved via a five-party review group substituting for the normal two-signature requirement.

**Confirmed before implementation**: the "account-recovery break-glass procedure that already exists elsewhere in the organization" the plan references as prior art is **not present in this repository** — searched the full working tree, including the untracked reference clones (`AI-Foundry-Projects/`, `langfuse-repo/`, `open-webui-repo/`); no `break-glass-intervention-request.js` or equivalent exists anywhere in-repo. The plan's description of its actual behavior (raises a ticket, never self-activates) is taken as given and adapted here, not independently re-derived from code in this repo.

## Decision

### Schema (migration 441)

`portfolio_governance` gains `escalation_manager_id` (the "manager" reviewer) and `external_auditor_contacts` (jsonb array of `{label}` objects — no ADPA account exists for an external auditor, so this is a bare contact record, not a `users` row). `capability_override_exceptions` (one row per break-glass request) and `override_exception_reviews` (one row per reviewer, `decision` starts `NULL`) hold the request and its five-party review.

**Deadlock precondition enforced by a `BEFORE INSERT` trigger** (`guard_capability_override_exception_requires_deadlock`), not just an app-layer check — counts active `user_departments` members for the target department/portfolio and rejects the INSERT outright if there are ≥2, per the plan's own stated contract guard ("initiating this path when the department has ≥2 active members fails"). This is specifically the deadlock substitute, never a general-purpose bypass of Phase 2 task 4's two-signature requirement.

**Reviewer population, confirmed with the ADR owner before implementation**: account_owner (`companies.created_by`, via `portfolio_governance.company_id`) and manager (`escalation_manager_id`, brand new in this same migration) both **degrade gracefully when unset** — the request proceeds with whichever of the five categories actually have someone to notify, rather than blocking break-glass entirely for a legacy company or a portfolio that's never had a manager assigned. Internal Audit and Super Admin can each resolve to *multiple* real reviewers (every active Internal Audit member in that portfolio; every user with `role IN ('super_admin','admin')`, case-insensitive, cross-tenant per the existing convention at `server/src/middleware/auth.ts`) — `buildReviewerSet.ts` (pure logic) produces one reviewer row per actual person, not one row per category.

**A decline has two enforced consequences, both DB-trigger-guaranteed** (`guard_override_exception_review_decision`, `AFTER UPDATE OF decision`): the capability is `disabled` immediately via `promote_capability_status` (the same enforced write path as any other transition), and the parent exception's `exception_review_status` reflects it — so a future code path that writes `decision` directly can't forget either half. **Escalation *notification* dispatch stays app-level** (the endpoint handling the decline, not the trigger) — Postgres cannot make outbound HTTP/SMTP calls, and every other notification in this codebase (drift alerts, SLA breaches, the Phase 2 task 4 expiry warnings above) already dispatches app-side, not from a DB trigger. The trigger guarantees the state mutation that must never be skippable; notification delivery is a different kind of guarantee this codebase has never expressed at the DB layer.

**Only a Super Admin's own pickup may activate** — enforced at the endpoint (`activate`), checking `users.role` the same case-insensitive way as everywhere else in this codebase. Raising a request never itself activates anything (request-then-pickup, matching the plan's own confirmed behavior for the out-of-repo reference procedure) — a Super Admin must explicitly call `POST .../exceptions/:exceptionId/activate`. Activation sets `isOverride=true` with the same configurable window Phase 2 task 4 uses, so a break-glass-granted activation is also subject to the expiry sweep — it does not get a permanent, unreviewed pass.

**Timeout escalation is a separate failure mode from decline**, per the plan's explicit distinction: a reviewer who never replies leaves the exception silently open with nothing to notice, which is not the same signal as an active decline (silence isn't evidence of a problem the way a decline is). `breakGlassEscalationJob.ts` (new scheduled sweep, every 6h, configurable `BREAK_GLASS_ESCALATION_TIMEOUT_HOURS` default 48h) finds reviews still `decision IS NULL` past the threshold and marks them + the parent exception `escalated` — **notification only, never forces `disabled`**. Escalation notices name the specific outstanding `reviewer_category`, not a generic alert, matching the plan's explicit requirement.

**External escalation contact list is configurable, deliberately not hardcoded** (`BREAK_GLASS_ESCALATION_CONTACTS` env var) — which law-enforcement/fraud/integrity body applies is a legal decision, not an engineering one. No real contacts are populated by this change; the mechanism exists with nothing configured, matching Phase 3's own precedent for the drift-detection mechanism shipping with no modules attached yet.

## Deferred / not built

- Actual delivery integration for the external contact list beyond a structured log warning (no email/SMS/webhook integration exists for this specific audience in this codebase yet — populating it is a business decision, not an engineering gap this pass closes).
- Any Governor Portal UI for raising/reviewing/activating a break-glass exception (same reasoning as every other deferred UI in this ADR).

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE3T6-001 | `buildReviewerSet` produces one candidate per real internal_audit/super_admin member, and omits account_owner/manager entirely when unset. | P0 |
| REQ-PHASE3T6-002 | Raising an exception when the department has ≥2 active members in that portfolio is rejected (the DB trigger, not just app logic). | P0 |
| REQ-PHASE3T6-003 | Raising an exception when the department has 0 or 1 active members succeeds and creates one review row per resolved reviewer. | P0 |
| REQ-PHASE3T6-004 | A decline from any one reviewer both disables the capability and updates the exception's status, verified as one outcome, not two separately-passing halves. | P0 |
| REQ-PHASE3T6-005 | A non-super_admin caller cannot activate an exception. | P0 |
| REQ-PHASE3T6-006 | A super_admin activating a pending exception fires `promote_capability_status` with `isOverride=true` and a set expiry. | P0 |
| REQ-PHASE3T6-007 | A review left `decision IS NULL` past the timeout threshold escalates (notification-only) without disabling — verified as a distinct case from the decline path. | P1 |
| REQ-PHASE3T6-008 | An `external_auditor` review can be decided by an active Internal Audit member on the auditor's behalf, but not by an arbitrary caller. | P1 |

## Verification

- Unit (DB-free): `buildReviewerSet.test.ts` — REQ-PHASE3T6-001.
- Integration (real Postgres, blocked by the same pre-existing harness issue as every prior phase): `federated-capability-ownership-phase3task6.test.ts` — REQ-PHASE3T6-002..008.
- Standalone real-DB scratch script exercising the deadlock-trigger rejection, a full request→decline→disable cycle, and a full request→activate cycle.
