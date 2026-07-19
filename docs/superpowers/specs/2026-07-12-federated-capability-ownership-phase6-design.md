# federated-capability-ownership (Phase 6, write-endpoint half) Design Spec

**Date**: 2026-07-12
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as [Phase 0](2026-07-09-federated-capability-ownership-phase0-design.md)/[Phase 1](2026-07-10-federated-capability-ownership-phase1-design.md)/[Phase 3](2026-07-11-federated-capability-ownership-phase3-design.md)/[Phase 4](2026-07-12-federated-capability-ownership-phase4-design.md)/[Phase 5](2026-07-12-federated-capability-ownership-phase5-design.md))

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) Action Item 7 (implementation plan Phase 6) asks for the Governor Portal's dead "Approve"/"Review"/"View Audit" buttons to be wired to real endpoints. Two structural gaps, confirmed against running code before implementation, meant this couldn't be scoped as originally written:

1. **No write endpoint exists anywhere (Node or .NET) to trigger a `capability_registry.activation_status` transition.** Grepped all of `server/src` for callers of `promote_capability_status`: the only one is `capabilityAttestationJob.ts`, an automated hourly cron sweep. There was no human-triggerable path at all — the plan's "wire to the Phase 2 endpoints" cannot literally mean `RitualController`'s `phase0/approve`/`rtm/apply-amendment`, since those approve a different, older concept (`BusinessCase`/`RtmAmendment` in the orchestrator's own `GovernanceDbContext`), not `capability_registry`.
2. **`orchestrator/Adpa.Web` (the Blazor Governor Portal) has no authentication infrastructure at all.** No login page, no `AuthenticationStateProvider`, no claims access, and its one `HttpClient` never attaches a bearer token. Task 2's "scoped to the logged-in user's `(portfolio_id, department)` claims" has no logged-in user to read claims from.

**Scope, decided explicitly with the user before implementation**: build the write endpoint (gap 1) as real, tested, authenticated infrastructure — Node endpoint + a thin orchestrator proxy, matching `CapabilityRegistryClient`'s existing read-side pattern. Defer the actual Blazor UI (the buttons, the approval queue, DRACO verdict surfacing) — building real authentication for Adpa.Web is a security-sensitive, product-level decision (which Firebase project, whether it mirrors the Next.js frontend's login flow, session vs. token-relay model) that shouldn't be bootstrapped as a side effect of wiring some buttons.

## Decision

### Node: `POST /api/v1/capability-registry/:moduleId/:portfolioId/promote`

The first human-triggerable path to `promote_capability_status` in the codebase.

- **Authenticated** (`authenticateToken`, real Firebase JWT verification — unlike the existing sibling `GET` route, which is deliberately unauthenticated service-to-service).
- **Authorized**: the caller must be an active member (`user_departments`, any role — `member`/`deputy`/`head`) of the target capability's `functional_owner_department`, scoped to that exact `portfolio_id` — never department name alone, matching every other department check in this ADR. `admin`/`super_admin` bypass, matching the codebase's existing role-check convention (`server/src/middleware/auth.ts`'s `requirePermission` bypass). A module with no assigned `functional_owner_department` is rejected (403) even for an admin-adjacent department member, since there's no department to be a member of.
- **Does not implement Phase 2 task 4's override authorization.** `isOverride`/`overrideExpiresAt` are passed straight through to `promote_capability_status`, which (per Phase 4) only verifies an override was *recorded* (justification + expiry) — not who is allowed to grant one. That's still `TaskApprovalGate`'s unbuilt job.
- Resolves `(moduleId, portfolioId)` to the row's `id` internally via a new `CapabilityRegistryRepository.findFullByModuleAndPortfolio` — the existing read-only `findByModuleAndPortfolio` (consumed by the orchestrator's `GET`) deliberately doesn't expose the primary key or `activation_status`, so a second, fuller read method was added rather than changing the first one's shape (which the orchestrator's `TaskApprovalGate` already depends on).
- Stored-procedure rejections (illegal transition, missing/invalid verdict, missing override justification/expiry) surface as `400` with the procedure's own message — matched against a fixed set of known prefixes so only recognized business-rule rejections are exposed verbatim; anything else is a generic `500`.

### Orchestrator: `POST api/capability/{moduleId}/{portfolioId}/promote`

A new `CapabilityController`, deliberately separate from `RitualController` (which owns the `BusinessCase`/`RtmAmendment` ritual concept — this has no relationship to that JIT-approval flow). `CapabilityRegistryClient.PromoteAsync` is a thin proxy: it relays whatever `Authorization` header the caller presented to Node's endpoint on a per-request `HttpRequestMessage` (never the shared, DI-scoped `HttpClient`'s default headers, to avoid one caller's token leaking into another's request), and returns Node's raw `(statusCode, body)` pass-through rather than remodeling the response shape in C# — one system (Node) defines what success/failure looks like, not two.

**Deliberately not `[Authorize]`-decorated**, for the same reason already documented for `RitualController`'s `phase0/approve`/`rtm/apply-amendment`: this codebase has never exercised ASP.NET Core's attribute-based authorization (confirmed: zero `[Authorize]` usages anywhere before this), and the real enforcement point is downstream — Node's `authenticateToken` middleware rejects a missing/invalid token with `401`, which this proxy relays unchanged. Adding `[Authorize]` here without ever having tested it in this codebase would be new, unverified risk for no behavioral gain, since the fail-closed outcome is identical either way.

## Deferred (explicitly out of scope, tracked for follow-up)

- Any Adpa.Web/Blazor UI change — the actual "Approve" button, a new `ApprovalQueue.razor`, DRACO verdict surfacing (plan tasks 1-3 as originally written). Blocked on Adpa.Web gaining real authentication first, which is a separate, security-sensitive decision.
- Phase 4's DRACO-verdict auto-enqueue (plan task 1) remains unbuilt, so even once a UI exists, there's no live verdict data for task 3 to surface without that piece too.
- Phase 2 task 4's override authorization (who may set `isOverride = true`) — this endpoint mechanically accepts the fields but doesn't authorize them beyond what `promote_capability_status` itself already checks.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE6-PROMOTE-001 | An unauthenticated request is rejected (401). | P0 |
| REQ-PHASE6-PROMOTE-002 | A caller who is not an active member of the target capability's functional owner department (and not admin) is rejected (403). | P0 |
| REQ-PHASE6-PROMOTE-003 | An active department member (any role) can promote. | P0 |
| REQ-PHASE6-PROMOTE-004 | An admin/super_admin can promote regardless of department membership. | P0 |
| REQ-PHASE6-PROMOTE-005 | A module with no assigned functional owner department is rejected (403), even for a plain-user caller. | P1 |
| REQ-PHASE6-PROMOTE-006 | A stored-procedure rejection (e.g. illegal transition) surfaces as 400 with the procedure's message. | P0 |
| REQ-PHASE6-PROMOTE-007 | An unknown `(moduleId, portfolioId)` pair returns 404. | P1 |

## Verification

- Integration/standalone (real Azure test DB): REQ-PHASE6-PROMOTE-001..007, via a one-off script calling `CapabilityRegistryController.promote` directly (bypassing Express routing/real Firebase auth, which needs credentials this environment doesn't have — the controller method itself, including its authorization branch, is what's under test). A Jest integration test file exists with the same coverage (`federated-capability-ownership-phase6.test.ts`, using the established `jest.mock('.../middleware/auth', ...)` pattern from `OpenUIChatController.test.ts`) but is currently blocked by the same pre-existing ESM harness issue that blocked the Phase 3/4 integration suites.
- Orchestrator: `dotnet build -c Release`. **Not verified end-to-end**: no live orchestrator instance was exercised against a real bearer token in this session — the proxy's relay logic is reviewed and compiled, not observed handling a live request.
