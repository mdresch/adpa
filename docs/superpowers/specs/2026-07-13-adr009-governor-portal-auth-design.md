# ADR-009 (Governor Portal auth): Implementation Design Spec

**Date**: 2026-07-13
**Status**: Draft
**Related**: [ADR-009: Unified Authentication Across Tiers](../../07-architecture/ADR-009-unified-authentication.md), [ADR-005 Phase 6](2026-07-12-federated-capability-ownership-phase6-design.md) (the endpoint this unblocks)

---

## Problem

ADR-009 was drafted and proposed, but nothing was built from it. The concrete trigger: the user asked for a full redesign of the Governor Portal (`orchestrator/Adpa.Web`) pages, incorporating ADR-005's new override/break-glass functionality — but every one of those write endpoints requires a real Firebase-authenticated caller, and `Adpa.Web` has never attached a bearer token to anything. Redesigning the pages first would produce buttons that 401 the moment they're clicked. Per the user's explicit direction, auth is the prerequisite and ships first; the visual redesign is deliberately deferred to a follow-up.

## Decision

Implements ADR-009 decision items 3-5 for `Adpa.Web` specifically (items 1-2, 6-7 were already true of Node/Next.js/the orchestrator's JWT Bearer validation before this work, and item 6 — the orchestrator keeping `[Authorize]` unused — is unchanged by this work, which touches `Adpa.Web` only, a separate ASP.NET Core app from `Adpa.Orchestrator`).

### Server-side Firebase sign-in (no client SDK)

`FirebaseAuthService` (`orchestrator/Adpa.Web/Services/FirebaseAuthService.cs`) calls Firebase's Identity Toolkit REST API directly — `POST identitytoolkit.googleapis.com/v1/accounts:signInWithPassword` for sign-in, `POST securetoken.googleapis.com/v1/token` (a different host, different request/response casing — these are two distinct Google Identity Platform APIs, confirmed before implementation) for token refresh. Requires `FIREBASE_WEB_API_KEY`, a **public** client-config key — the same value already used by the Next.js frontend's `NEXT_PUBLIC_FIREBASE_API_KEY`, not a service-account secret. No Firebase JS SDK ships to the browser; Blazor Server renders and executes entirely server-side, so the SPA client-SDK pattern Node/Next.js uses doesn't apply.

### Session = the auth cookie itself, not a separate store

ADR-009 called for "an encrypted, `HttpOnly`, server-side session." Implemented as: the Firebase ID token, refresh token, and expiry timestamp are held directly as claims on the `ClaimsPrincipal` inside a standard ASP.NET Core authentication cookie (`AddCookie`, cookie name `adpa_governor_session`, `HttpOnly`, `SameSite=Lax`, `Secure` outside Development). ASP.NET Core's cookie authentication already encrypts and signs the cookie payload via Data Protection by default — this satisfies "encrypted, server-side session" without introducing a separate session store (Redis, a DB table) as new infrastructure. `ExpireTimeSpan` (14 days, sliding) is the outer session bound; the Firebase ID token inside it is refreshed far more often and independently (below).

### Token refresh via `CookieAuthenticationEvents.ValidatePrincipal`

`FirebaseCookieEvents` (`orchestrator/Adpa.Web/Services/FirebaseCookieEvents.cs`) runs on every request presenting the cookie. If the embedded Firebase ID token is within 5 minutes of its (typically ~1h) expiry, it calls `FirebaseAuthService.RefreshAsync` and replaces the principal's claims with the new token/refresh-token/expiry, extending the session transparently. **Fail-closed, matching every other credential check in this ADR**: a refresh failure (revoked refresh token, Firebase outage) rejects the principal and signs the user out immediately, rather than letting a stale token keep being relayed to endpoints that would just 401 deep inside some workflow.

### Bearer-token relay to the `"api"` `HttpClient`

`FirebaseBearerTokenHandler` (a `DelegatingHandler`) reads the current `HttpContext`'s `ClaimsPrincipal` for the `firebase_id_token` claim and attaches it as `Authorization: Bearer` on every request the shared, DI-registered `"api"` named `HttpClient` makes — the same client every existing page (`Ledger.razor`, `Requirements.razor`, etc.) already injects via `IHttpClientFactory.CreateClient("api")`. An anonymous/unauthenticated context sends no header at all, matching pre-ADR-009 behavior for any page that stays public. This mirrors `CapabilityController.Promote`'s existing per-request relay pattern one hop earlier, at the point `Adpa.Web` calls the orchestrator.

### Login page and endpoints — deliberately not Blazor components

`Login.razor` renders a **plain HTML `<form method="post" action="/login">`** — no `EditForm`, no `@onsubmit`. The actual sign-in logic lives in `app.MapPost("/login", ...)` (`AuthEndpoints.cs`), a minimal-API endpoint outside Blazor's render pipeline entirely. This is deliberate, not incidental: `App.razor` globally sets `<Routes @rendermode="RenderMode.InteractiveServer" />`, meaning every routed page (including `Login.razor`) renders over a persistent SignalR circuit — and `HttpContext.SignInAsync` needs to write a `Set-Cookie` header on a real HTTP response, which an interactive circuit cannot provide mid-session. A plain HTML form submission is always a genuine browser-level POST navigation regardless of the enclosing page's render mode, so routing the actual credential exchange through a minimal-API endpoint sidesteps the render-mode/HttpContext-lifetime problem entirely rather than fighting it. `/logout` follows the same shape (a plain form POST, not a Blazor event handler).

`returnUrl` round-trips through both endpoints; `IsSafeLocalReturnUrl` explicitly rejects `//host` and `/\host` values (open-redirect vectors that still satisfy a naive `StartsWith("/")` check) before ever passing it to `Results.Redirect`.

### Authorization on pages

`Routes.razor`'s `<Router>` now wraps its `Found` branch in `<AuthorizeRouteView>` with a `<NotAuthorized>` template that renders `RedirectToLogin` (a small component that force-navigates to `/login?returnUrl=...`). `Ledger.razor`, `Requirements.razor`, `RPASGovernanceCenter.razor`, and `AIWorkspace.razor` each gained `@attribute [Authorize]`. `Home.razor` and `Login.razor` (`[AllowAnonymous]`) stay public. No `DefaultLayout` was introduced on `AuthorizeRouteView` — `Adpa.Web` has no shared `LayoutComponentBase` today (nav is hardcoded directly in `App.razor`); adding one is layout-redesign scope, explicitly deferred to the follow-up visual redesign, not a side effect of wiring auth.

### `Adpa.Orchestrator` is unchanged

Per ADR-009 decision item 6: `AddAuthorization()`/`[Authorize]` are **not** retroactively added to `Adpa.Orchestrator`'s controllers. That reasoning (dev-bypass ordering for `Governance:ApprovalsEnforced=false`, downstream fail-closed checks) still holds and this work doesn't reopen it. `Adpa.Web` is a separate ASP.NET Core app; nothing here touches the orchestrator's own authentication pipeline.

## Deferred / not verified

- **No live end-to-end login test against real Firebase** — no test account credentials available in this session. Verified instead: the app boots cleanly with `FIREBASE_WEB_API_KEY` unset (lazy-evaluated, doesn't crash startup), an unauthenticated request to a protected page redirects (302) rather than 500ing, a `POST /login` with no configured key fails closed (500) without crashing the process, and public pages remain reachable throughout. The actual Firebase REST call shapes (`signInWithPassword`, `securetoken.googleapis.com` refresh) are implemented per Google's published Identity Toolkit API contract, not independently re-derived from a working call in this session.
- **Data Protection key persistence** — ASP.NET Core's default Data Protection key storage is per-machine/ephemeral unless explicitly configured otherwise (`PersistKeysToFileSystem`, a Redis-backed provider, etc.). Fine for a single-instance dev/Aspire-local deployment; a real multi-instance or frequently-redeployed production environment would invalidate all sessions on restart until this is configured. Out of scope for this pass — an infra/ops decision, not part of the auth flow itself.
- **The visual redesign the user actually asked for** — this work exists specifically to unblock it. No page content, layout, or design changed in this pass beyond the `[Authorize]` attribute and the nav bar's sign-in/sign-out affordance.
- **The six new orchestrator-side proxy actions** (override request/approve/deny, break-glass request/decide/activate) still don't exist — only `CapabilityController.Promote` is proxied today. A redesigned page calling override/break-glass functionality needs these built first; auth alone doesn't create them.

## Verification

- `dotnet build -c Release` — both `orchestrator/Adpa.Web` and `orchestrator/Adpa.AppHost` build clean, 0 warnings/0 errors.
- Runtime HTTP verification against a real, standalone-launched `Adpa.Web` process (Kestrel, `ASPNETCORE_ENVIRONMENT=Development`, no Aspire orchestration — Aspire's own AppHost was separately confirmed to boot its dashboard/DCP host cleanly with the updated `Adpa.AppHost` project, though full multi-resource startup wasn't observed to completion within the bounded verification window):
  - `GET /` (public) → `200`
  - `GET /login` (public) → `200`
  - `GET /ledger` (`[Authorize]`, unauthenticated) → `302` (redirected to login, not a raw 401 or an exception)
  - `POST /login` with `FIREBASE_WEB_API_KEY` unset → `500` (fails closed on missing config, does not silently proceed)
  - `GET /` immediately after the failed login attempt → `200` (the process survived the failed request; the exception was scoped to that one request, not fatal to the app)
