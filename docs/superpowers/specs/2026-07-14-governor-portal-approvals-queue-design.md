# Governor Portal Approvals Queue + Layout Design Spec

**Date**: 2026-07-14
**Status**: Draft
**Related**: [ADR-011](../../07-architecture/ADR-011-governor-portal-design-system.md), [the component library design spec](2026-07-14-governor-portal-component-library-design.md)

---

## Problem

Everything built this session (ADR-009's auth, the six orchestrator proxy actions, the ADR-011 component library) exists to make one thing possible: a real person, signed in, looking at real pending decisions, acting on them. Nothing before this built that page. It also surfaced a real gap: neither `CapabilityOverrideController` nor `CapabilityOverrideExceptionController` could *list* pending items — only act on one by ID, given a `moduleId`/`portfolioId`/`requestId` the caller would have to already know from somewhere else. A queue page needs a queue endpoint, which didn't exist.

## Decision

### Node: two new list-pending endpoints

`GET /api/v1/capability-registry/overrides/pending` and `GET /api/v1/capability-registry/exceptions/pending` — both authenticated, both scoped by caller (not a flat "everything" dump):

- **Overrides**: an admin/super_admin sees every pending request; a plain user sees only requests raised against a department they're an active member of, in that request's own portfolio — the same "portfolio_id and department, never department name alone" rule this ADR has enforced everywhere else, reusing the exact scoping logic `approve`/`deny` already apply.
- **Exceptions**: an admin sees every still-open (`pending`/`escalated`) exception; a plain user sees only exceptions where they are a *named reviewer* with an undecided review row — matching `decide`'s own authorization exactly (only the assigned reviewer, or an Internal Audit member proxying for `external_auditor`, may act).

**Route registration order matters and is called out explicitly in code**: both new routes are literal 2-segment GET paths (`/overrides/pending`, `/exceptions/pending`), and the pre-existing `GET /:moduleId/:portfolioId` is also a 2-segment GET route. Express matches in registration order — the new routes had to be added *before* the generic one, or a request to `/overrides/pending` would have been silently (and wrongly) matched as `moduleId=overrides, portfolioId=pending`.

### Orchestrator: matching GET proxies

`CapabilityRegistryClient` gained a `GetRelayAsync` helper (deliberately not named `GetAsync` — that name already exists on the class for the original capability lookup, and `string` vs `string?` are the same type post-erasure, so a same-named overload differing only in nullability would be an ambiguous duplicate signature). `CapabilityController` gained a `RelayList` helper (the same relay/pass-through pattern as `Relay`, minus the `moduleId`/`portfolioId` context that doesn't exist for a cross-capability list).

### Blazor: a real shared layout, finally

`Components/Layout/MainLayout.razor` replaces the nav that used to be hardcoded directly in `App.razor` — the gap ADR-011's own Consequences section flagged. `Routes.razor`'s `AuthorizeRouteView` now specifies `DefaultLayout`, so every page gets the shared chrome automatically.

**The component styles moved from Blazor CSS isolation to a global stylesheet** (`wwwroot/gp-components.css`), reversing the component library spec's original choice. Reason, discovered while wiring the nav's sign-out button: Blazor CSS isolation scopes a class to *only* the component that defines it. The sign-out action deliberately renders as a plain `<button>` inside a plain `<form method="post" action="/logout">` (not a `<PillButton>`) — mirroring `Login.razor`'s own established reasoning that an auth-cookie-writing action must be a genuine browser POST navigation, not a SignalR-relayed Blazor event. That plain button still needs `.gp-btn`/`.gp-btn-secondary` styling, which an isolated `PillButton.razor.css` cannot provide to markup outside `PillButton.razor`. Once one consumer legitimately needs the classes outside their defining component, isolation stops being the right tool — the five `.razor.css` files were deleted and their content consolidated into one global file.

### Blazor: `/approvals`, the actual payoff page

Loads both pending lists on init via `IHttpClientFactory.CreateClient("api")` (bearer-token-attached automatically per ADR-009's `FirebaseBearerTokenHandler` — no manual auth wiring needed in the page itself). Renders each override request as a `GovernorCard` with `JustificationBlock` + Approve/Deny `PillButton`s; each break-glass exception with a `ReviewerStrip` showing all five reviewer categories' current state, plus per-review Approve/Decline buttons and an Activate button.

**Deliberately does not pre-filter which buttons a given signed-in user can click.** Adpa.Web's session only knows the caller's Firebase UID/email — it has no way to know their Node `users.id`, `role`, or department memberships without an extra profile-lookup call (which doesn't exist yet). Rather than build that lookup now, every action button is always shown, and Node's existing, already-correct authorization is the real gate: a click that isn't the caller's to make comes back as a `403`/`400`, shown inline. This is a real, acknowledged UX gap (a non-admin sees an "Activate (Super Admin)" button that will visibly fail if clicked) — not silently accepted, see Deferred below.

## Deferred / not done

- **No current-user profile/role lookup in Adpa.Web.** This is why the Approvals page can't pre-hide actions the signed-in user isn't authorized for. A `/api/v1/auth/me`-style endpoint (the Next.js frontend already has one) proxied through the orchestrator would resolve this.
- **`Ledger`, `Requirements`, `RPASGovernanceCenter`, `AIWorkspace` are still unmigrated** to the new design system — they render under the new `MainLayout` (so they get the new nav for free) but their own page content is untouched. `AIWorkspace`'s duplication of `RPASGovernanceCenter`'s workflow tab is also still unresolved.
- **No pixel-level visual confirmation**, same limitation as the component library spec — no screenshot/browser tool available. Verified structurally: real HTTP requests against a running process, correct status codes (200 for public pages, 302 redirect-to-login for `[Authorize]` pages when unauthenticated), and correct content/class markers in the response bodies.
- **The Approvals page's own visual layout** (two stacked full-width sections) is a first pass, not informed by real usage yet — once break-glass/override volume is non-trivial, this may need pagination, filtering, or a denser list view rather than full `GovernorCard`s per item.

## Verification

- Node: standalone real-DB scratch script (7/7 assertions: admin sees all, department member sees own, non-member/outsider sees nothing, for both overrides and exceptions), `npm run test:features -- federated-capability-ownership` (81/81 unit tests, no regressions). The new integration test file (`federated-capability-ownership-approvals-queue.test.ts`) is written but blocked by the same pre-existing Jest ESM harness issue (`server.ts`'s full module graph) that has blocked every prior phase's integration suite in this session — confirmed unrelated to this change (fails at bootstrap, before any new route is reached).
- Orchestrator: `dotnet build -c Release` clean across `Adpa.Web`, `Adpa.Orchestrator`, `Adpa.AppHost`.
- Runtime (real running `Adpa.Web` process): `GET /` → `200` with correct new-design content markers and nav links present; `GET /style-guide` → `200`; `GET /approvals` and `GET /ledger` (both now `[Authorize]`, unauthenticated) → `302`; `GET /gp-components.css` → `200`.
