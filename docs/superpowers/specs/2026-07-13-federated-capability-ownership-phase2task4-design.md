# federated-capability-ownership (Phase 2 task 4: override path) Design Spec

**Date**: 2026-07-13
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as prior phases)

---

## Problem

Phase 6 built the first human-triggerable write path to `promote_capability_status` (`POST /api/v1/capability-registry/:moduleId/:portfolioId/promote`), but its own docstring flagged a known, deliberate gap: `isOverride`/`overrideExpiresAt` are accepted and passed straight through to the stored procedure, which only verifies an override was *recorded* (non-empty justification, a set expiry), never *who* is allowed to grant one. The implementation plan calls this "TaskApprovalGate's override path" — text written before Phase 6 existed.

**Confirmed against running code before implementation**: `orchestrator/Adpa.Orchestrator/Services/TaskApprovalGate.cs` (`EnsureJitApproval`) has zero connection to `capability_registry` writes — it only ever calls `CapabilityRegistryClient.GetAsync` (read-only), to authorize the caller for the OLDER, unrelated `BusinessCase`/`RtmAmendment` JIT-approval flow (`phase0/approve`, `rtm/apply-amendment` in `RitualController.cs`). There is no code path, anywhere, where a `BusinessCase`/`RtmAmendment` decision triggers `promote_capability_status`. The plan's "TaskApprovalGate... override path" framing predates Phase 6's discovery that Node, not the orchestrator, is `capability_registry`'s sole write authority — building the override check in the orchestrator would mean either (a) giving `TaskApprovalGate` a new write capability it has never had, routed through `CapabilityRegistryClient.PromoteAsync` (which already exists but is wired to a *different*, non-`TaskApprovalGate` controller), or (b) accepting real architectural inconsistency. Building it Node-side instead avoids both, and needs no cross-tier HTTP hop at all, since `promote_capability_status`, `user_departments`, and `users` are already colocated there.

**Also confirmed**: `TaskApprovalAttestation`'s existing shape (`Scope`, `TaskId`, `HumanDecisionId`, `DecidedBy`, `ExpiresAt`) is a *single-request, self-asserted* freshness check, not a two-distinct-identity mechanism — one HTTP call carries one JWT, so it cannot itself prove two different people signed off. This codebase's own precedent for "requires two distinct, separately-authenticated actions" is `rtm_amendments`' propose/decide split (`RitualController.cs:287-377`), not a single-call attestation object — the override path follows that shape instead.

## Decision

### `capability_override_requests` (migration 440)

A two-step, two-distinct-caller flow: any active department member of the target capability's `functional_owner_department` (in that exact `portfolio_id` — never department name alone) may `POST .../override/request` with a `justification` and the transition they want. A **different** active member of the *same* department must then `POST .../override/:requestId/approve` (or `/deny`) — enforced both at the app layer (explicit identity comparison) and by a DB `CHECK (approved_by IS DISTINCT FROM requested_by)` constraint, so a future code path can't accidentally let someone approve their own request.

Deliberately **no admin bypass** on either step, unlike the plain `promote` endpoint — the entire point of this path is two genuine department signatures, not an administrative shortcut. If the department has fewer than two active members in this portfolio, the `approve` step will always 403 for lack of a distinct member — this is the intended funnel into Phase 3 task 6's break-glass path, not a bug.

On approval: `promote_capability_status(capability_id, requestedNewStatus, approverId, justification, dracoVerdictId, isOverride=true, overrideExpiresAt)` fires directly (same database, no token relay needed). `overrideExpiresAt` is `now() + CAPABILITY_OVERRIDE_WINDOW_HOURS` (default 72h, configurable — matches Phase 4's own test precedent as the default, never hardcoded per CLAUDE.md's env-var convention).

### Override-expiry revert + 24h/12h warnings

Phase 3 task 5 explicitly deferred this half: "nothing sets `capability_activation_history.is_override` yet." Phase 2 task 4 is the first thing that does, so this sweep is built now, in the *same* job (`capabilityAttestationJob.ts`) per the plan's own "the same job also finds..." framing — not a new scheduled job. `overrideExpiryCheck.ts` (pure logic) finds `active` capabilities whose latest `capability_activation_history` row has `is_override=true` and a lapsed `override_expires_at` with no subsequent normal approval, and reverts them to `pending_re_approval`. Idempotent 24h/12h pre-expiry warnings use `warned_24h_at`/`warned_12h_at` (Phase 3 schema, previously unused) so an hourly poll doesn't re-send the same warning every tick. Notifications go through the existing `notificationService.sendNotification` (already used for drift/quality alerts elsewhere — not a new outbox), addressed to every active member of the capability's `functional_owner_department`.

## Deferred / not built

- Firebase `iat`-vs-`tokensValidAfterTime` revocation checking on either attestation (same deferral as Phase 2 tasks 1-3, no service-account credentials provisioned).
- Any UI for requesting/approving an override (consistent with Phase 6's own deferred Governor Portal UI — ADR-009 covers the prerequisite auth work).

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE2T4-001 | An active department member can create a pending override request. | P0 |
| REQ-PHASE2T4-002 | A non-member cannot create a request. | P0 |
| REQ-PHASE2T4-003 | The same person who created the request cannot approve or deny it. | P0 |
| REQ-PHASE2T4-004 | A different active member of the same department can approve, firing `promote_capability_status` with `isOverride=true` and a set `overrideExpiresAt`. | P0 |
| REQ-PHASE2T4-005 | A different active member can deny, recording a reason, without touching `activation_status`. | P0 |
| REQ-PHASE2T4-006 | An already-decided request cannot be decided again. | P1 |
| REQ-PHASE2T4-007 | `findOverrideExpiryActions` reverts an `active` capability once its override lapses with no subsequent normal approval. | P0 |
| REQ-PHASE2T4-008 | `findOverrideExpiryActions` emits an idempotent `warn24h`/`warn12h` decision only once per threshold, respecting `warned_24h_at`/`warned_12h_at`. | P0 |
| REQ-PHASE2T4-009 | A capability that is not `active`, or has no override on its latest history row, is never touched by the sweep. | P1 |

## Verification

- Unit (DB-free): `overrideExpiryCheck.test.ts` — REQ-PHASE2T4-007..009.
- Integration (real Postgres, currently blocked by the same pre-existing Jest ESM harness issue as every prior phase's integration suite): `federated-capability-ownership-phase2task4.test.ts` — REQ-PHASE2T4-001..006.
- Standalone real-DB scratch script exercising the full request/approve/deny flow and the expiry sweep end-to-end (same pattern as every prior phase).
