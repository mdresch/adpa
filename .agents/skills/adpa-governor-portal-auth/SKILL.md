---
name: adpa-governor-portal-auth
description: Server-side Firebase authentication for the Governor Portal (orchestrator/Adpa.Web, ADR-009) — cookie-based session with embedded Firebase ID/refresh tokens, automatic refresh, bearer-token relay to the orchestrator's "api" HttpClient, and [Authorize]-protected pages. Load when touching Adpa.Web auth, Login.razor, the "api" HttpClient, or adding a new Adpa.Web page that needs to call an authenticated endpoint.
---

# ADPA Governor Portal Auth

## Purpose

`orchestrator/Adpa.Web` (the Blazor Server Governor Portal) had zero authentication before this — no login, no `AuthenticationStateProvider`, no bearer token ever attached to its calls into the orchestrator. This blocked ADR-005 Phase 6's UI entirely: every write endpoint it would need to call (`promote`, and the still-unproxied override/break-glass endpoints) requires a real Firebase-authenticated caller.

Firebase is the identity provider (per [ADR-009](../../../docs/07-architecture/ADR-009-unified-authentication.md)), already used by Node and the orchestrator's own JWT Bearer validation — this packet extends that to `Adpa.Web` specifically, via a server-side sign-in flow (no client SDK — Blazor Server executes entirely server-side). See [the implementation design spec](../../../docs/superpowers/specs/2026-07-13-adr009-governor-portal-auth-design.md) for the full reasoning.

## Invariants

- Must always: treat `Adpa.Web` and `Adpa.Orchestrator` as separate ASP.NET Core apps with separate authentication models. `Adpa.Orchestrator` deliberately never uses `[Authorize]` (see `adpa-task-approval-gate`) — that reasoning is unchanged and does not apply here. `Adpa.Web` **does** use `[Authorize]` on its own pages; the two are not in tension because they're different apps.
- Must always: call Firebase's Identity Toolkit REST API directly (`FirebaseAuthService`) for sign-in/refresh — there is no Firebase Admin SDK for .NET, and no client JS SDK ships to the browser (Blazor Server, not a SPA). `signInWithPassword` (`identitytoolkit.googleapis.com`) and the refresh endpoint (`securetoken.googleapis.com`) are two different hosts with two different request/response shapes (camelCase JSON vs. snake_case form-encoded) — do not assume one call shape covers both.
- Must always: keep `FIREBASE_WEB_API_KEY` a public, client-config value (same as `NEXT_PUBLIC_FIREBASE_API_KEY`), never a service-account secret — it's meant to be embedded in a request URL/query string.
- Must always: hold the session as claims on the standard ASP.NET Core auth cookie (`AddCookie`), not a separate session store — the cookie is already encrypted/signed via Data Protection by default. Do not introduce Redis/a DB table for this without a real reason the cookie can't satisfy.
- Must always: refresh the Firebase ID token via `FirebaseCookieEvents.ValidatePrincipal`, not by asking the user to re-authenticate every ~1h. Fail closed on a refresh failure (`RejectPrincipal` + `SignOutAsync`) — never let a stale/expired token keep being relayed to downstream endpoints that will just 401 deep inside some workflow.
- Must always: attach the bearer token via `FirebaseBearerTokenHandler`, a `DelegatingHandler` on the shared `"api"` named `HttpClient` — never hand-attach an `Authorization` header per-page. Every page already injects this client via `IHttpClientFactory.CreateClient("api")`; the handler makes token attachment automatic and consistent.
- Must always: route the actual credential exchange through minimal-API endpoints (`AuthEndpoints.cs`), never through a Blazor `EditForm`/`@onsubmit` handler. `App.razor` sets `<Routes @rendermode="RenderMode.InteractiveServer" />` globally, so every routed page (including `Login.razor`) renders over a persistent SignalR circuit — `HttpContext.SignInAsync` needs to write a `Set-Cookie` header on a real HTTP response, which an interactive circuit cannot provide. `Login.razor`'s form is plain HTML (no `EditForm`) specifically so submitting it is a genuine browser POST navigation regardless of the page's render mode.
- **Must always (bugfix, 2026-07-14): the sign-in/sign-out POST endpoints live at `/auth/login`/`/auth/logout`, never at the exact same literal path as a Blazor `@page` route.** `Login.razor` owns `@page "/login"` (a GET-navigable route); `MapRazorComponents` registers a route match for that literal path that isn't restricted to GET. The original implementation mapped the POST handler to `/login` too — same path — which produced a real `AmbiguousMatchException` ("The request matched multiple endpoints") on every login attempt, 500ing at the ASP.NET Core routing layer *before any handler code ran*, and left the user stuck on a blank `/login` page with no visible error. This is a general rule, not a one-off fix: never give a raw `MapPost`/`MapGet` endpoint the exact same literal path as an existing `@page` directive.
- Must always: validate `returnUrl` with `AuthEndpoints.IsSafeLocalReturnUrl` before redirecting to it — reject `//host` and `/\host`, not just check `StartsWith("/")`, which both satisfy naively and are open-redirect vectors.
- **Resolved (2026-07-14)**: `MainLayout.razor` now exists (`adpa-governor-portal-design-system`) and is `AuthorizeRouteView`'s `DefaultLayout` — the "no shared layout yet" gap this invariant used to flag is closed.
- Must never: trust a `500` status code alone as proof of *which* code path failed. The routing-collision bug above was originally masked for exactly this reason — an early verification pass saw `POST /login` return `500` when `FIREBASE_WEB_API_KEY` was unset and concluded "fails closed on missing config," without checking that the response body was actually an `AmbiguousMatchException` from the routing layer, not `FirebaseAuthService`'s own config check. Always read the actual exception type/message on an unexpected `500`, don't infer the cause from context.
- Must never: assume a successful `dotnet build` is sufficient verification for this packet — verify against a real running process, and when a request returns an unexpected status code, capture and read the actual response body, not just the code.

## Interaction Rules

- Depends on: the shared Firebase project already used by Node (`FIREBASE_PROJECT_ID`) and the orchestrator's JWT Bearer validation (`Program.cs`'s `AddJwtBearer` against `securetoken.google.com/{FIREBASE_PROJECT_ID}`) — this packet reuses that same project, not a new one.
- Must not break: `Adpa.Orchestrator`'s existing non-`[Authorize]` posture (see `adpa-task-approval-gate`) — this packet doesn't touch the orchestrator's own `Program.cs` authentication setup at all.
- **Resolved (2026-07-13)**: all six override/break-glass `CapabilityController` proxy actions now exist (see `adpa-capability-registry`'s orchestrator-proxy addition) — this packet's token is no longer stranded with nothing to call.
- The pending visual redesign (explicitly deferred, not this packet's scope) will consume `FirebaseBearerTokenHandler`/`[Authorize]` as-is — new pages just inject `IHttpClientFactory.CreateClient("api")` the same way existing pages do, and get bearer-token attachment for free.

## Key Files

| File | Role |
|------|------|
| `orchestrator/Adpa.Web/Services/FirebaseAuthService.cs` | `SignInWithPasswordAsync`/`RefreshAsync` — the two Identity Toolkit REST calls |
| `orchestrator/Adpa.Web/Services/FirebaseCookieEvents.cs` | `ValidatePrincipal` — refreshes the ID token within 5 minutes of expiry, fail-closed on refresh failure |
| `orchestrator/Adpa.Web/Services/FirebaseBearerTokenHandler.cs` | `DelegatingHandler` attaching the session's Firebase ID token to every `"api"` `HttpClient` request |
| `orchestrator/Adpa.Web/Services/AuthEndpoints.cs` | `MapFirebaseAuthEndpoints` — the real `/auth/login`/`/auth/logout` minimal-API handlers (`SignInAsync`/`SignOutAsync`), plus `IsSafeLocalReturnUrl` |
| `orchestrator/Adpa.Web/Components/Pages/Login.razor` | `@page "/login"` (GET), `[AllowAnonymous]`; its plain HTML form posts to `/auth/login` (a different path — see the routing-collision invariant above) |
| `orchestrator/Adpa.Web/Components/RedirectToLogin.razor` | `AuthorizeRouteView`'s `NotAuthorized` template — force-navigates to `/login?returnUrl=...` (the GET page route) |
| `orchestrator/Adpa.Web/Components/Routes.razor` | `AuthorizeRouteView DefaultLayout="@typeof(Layout.MainLayout)"` wiring |
| `orchestrator/Adpa.Web/Components/Layout/MainLayout.razor` | Nav bar's `<AuthorizeView>` sign-in/sign-out affordance (moved here from `App.razor` — see `adpa-governor-portal-design-system`) |
| `orchestrator/Adpa.Web/Program.cs` | `AddAuthentication().AddCookie(...)`, `AddAuthorization()`, `AddCascadingAuthenticationState()`, the `"api"` `HttpClient`'s `AddHttpMessageHandler<FirebaseBearerTokenHandler>()`, `UseAuthentication()`/`UseAuthorization()` ordering, `MapFirebaseAuthEndpoints()` |
| `orchestrator/Adpa.AppHost/Program.cs` | Injects `FIREBASE_WEB_API_KEY` into the `webfrontend` project resource |
| `.env.example` | `FIREBASE_WEB_API_KEY` — same value as `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `Ledger.razor` / `Requirements.razor` / `RPASGovernanceCenter.razor` / `AIWorkspace.razor` | `@attribute [Authorize]` added; `Home.razor` stays public |

## Commands

```powershell
dotnet build orchestrator/Adpa.Web -c Release
dotnet build orchestrator/Adpa.AppHost -c Release
dotnet watch run --project orchestrator/Adpa.AppHost   # Aspire dashboard: http://localhost:18888
```

## Related Skills

- `adpa-task-approval-gate` — the orchestrator's own, deliberately different (`[Authorize]`-free) authentication posture; read this to understand why the two apps diverge, not to copy its pattern here.
- `adpa-capability-registry` — the endpoints this packet's tokens are relayed to (all seven `CapabilityController` proxy actions now exist).
- `adpa-governor-portal-design-system` — `MainLayout`, the shared nav, and the component library `/approvals` (the first real consumer of this packet's bearer-token relay) is built from.
- `adpa-aev-workflow` — the validation workflow this packet follows (`dotnet build -c Release`, orchestration boot check).
