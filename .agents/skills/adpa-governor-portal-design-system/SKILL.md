---
name: adpa-governor-portal-design-system
description: The Governor Portal's shared visual design system (ADR-011 "Humanist") — design-tokens.css, gp-components.css (global styles, not CSS isolation), MainLayout.razor, and the five Components/Shared/*.razor components (StatusChip, PillButton, GovernorCard, ReviewerStrip, JustificationBlock). Load when building or touching any Adpa.Web page, especially anything showing an override/break-glass review card, a status signal, or an action button.
---

# ADPA Governor Portal Design System

## Purpose

Before this, `orchestrator/Adpa.Web` had five pages each styling themselves independently — no shared tokens, no component library, no shared layout, two pages with their own bespoke `<style>` blocks. [ADR-011](../../../docs/07-architecture/ADR-011-governor-portal-design-system.md) picked a visual direction ("Humanist," checked against microsoft.ai's actual current design and adapted for an operational tool); this skill covers the concrete implementation — see [the component library design spec](../../../docs/superpowers/specs/2026-07-14-governor-portal-component-library-design.md) and [the layout/Approvals-page design spec](../../../docs/superpowers/specs/2026-07-14-governor-portal-approvals-queue-design.md) for the full reasoning, including why the components moved off Blazor CSS isolation.

**Any new Adpa.Web page or component should consume these tokens/components/layout, not invent its own styling** — that's the exact fragmentation this system exists to close.

## Invariants

- Must always: read colors from `--gp-*` custom properties (`wwwroot/design-tokens.css`), never hardcode a hex value in a new component's CSS.
- Must always: keep semantic status colors (approved/pending/declined) at clearly separated hues, not variations of one pastel — `StatusChip`/`ReviewerStrip` carry a real decision signal. This is the one place ADR-011 explicitly said the source brand's aesthetic does *not* transfer wholesale.
- Must always: define `.gp-*` component classes in `wwwroot/gp-components.css` (a **global** stylesheet), never Blazor CSS isolation (`ComponentName.razor.css`) for these five components. **Resolved, was the opposite call originally**: isolation was tried first, then abandoned when the nav's sign-out button needed `.gp-btn` styling on a plain `<button>` outside `PillButton.razor` entirely (the sign-out form must be a genuine browser POST, not a SignalR-relayed Blazor click — same reasoning as `Login.razor`). A class scoped to one component can't serve a consumer outside that component; a global class can.
- Must always: treat `GovernorCard`'s `ShowBloom` as opt-in (default `false`) — reserve the decorative gradient blooms for single-focus review surfaces, never a dense list/table view.
- Must always: reuse `ReviewerStrip` for any "who has/hasn't signed off" display — generic over an arbitrary `(Label, State)` list, covering both the two-signature override flow and break-glass's five categories.
- Must always: render pages inside `MainLayout` (the default via `Routes.razor`'s `AuthorizeRouteView DefaultLayout`) — don't hardcode a per-page nav the way `App.razor` used to.
- Must never: add a component-library dependency (MudBlazor, Radzen, etc.) as a shortcut — ADR-011 rejected the "fast but generic" direction deliberately.
- Must never: use `<PillButton>` (or any component that binds `@onclick`) for an action that must be a genuine browser POST navigation independent of the SignalR circuit (sign-in, sign-out, anything writing the auth cookie) — use a plain `<button type="submit">`/`<form>` styled with the same global `.gp-btn` classes instead, matching the nav's sign-out button and `Login.razor`.
- Must never: assume `dotnet build` succeeding is sufficient verification for a visual change here — no screenshot/browser-automation tool is available in this environment as of this skill's writing; verify via a real running process and check HTTP status + presence of expected CSS classes/content in the response body, and say explicitly if pixel-level appearance wasn't independently confirmed.

## Interaction Rules

- Depends on: `adpa-governor-portal-auth` (ADR-009) — pages built with these components typically also need `[Authorize]` and the bearer-token-attached `"api"` `HttpClient`.
- Must not break: the existing unmigrated pages' own content (`Ledger`, `Requirements`, `RPASGovernanceCenter`, `AIWorkspace`) — they now render inside the new `MainLayout`/nav (automatic, since it's the router's default layout), but their page bodies are untouched and still pre-ADR-011 styled internally.
- New work when: those four pages get their own content migrated, and when `/approvals` gains a current-user profile/role lookup (see the Approvals design spec's Deferred section) so it can stop showing every action button to every signed-in user regardless of whether Node will actually allow it.

## Key Files

| File | Role |
|------|------|
| `orchestrator/Adpa.Web/wwwroot/design-tokens.css` | The `--gp-*` token definitions — palette, font stack |
| `orchestrator/Adpa.Web/wwwroot/gp-components.css` | **Global** (not CSS-isolated) styles for `.gp-chip*`, `.gp-btn*`, `.gp-card*`, `.gp-reviewer-strip`, `.gp-justification`, and the nav (`.gp-shell`/`.gp-nav*`/`.gp-main`) |
| `orchestrator/Adpa.Web/Components/Shared/StatusChip.razor` | Pill status signal — `ChipState`: Approved/Pending/Declined/Neutral |
| `orchestrator/Adpa.Web/Components/Shared/PillButton.razor` | Action button — `ButtonVariant`: Primary/Secondary/Approve/Deny; renders as `<a>` when `Href` is set |
| `orchestrator/Adpa.Web/Components/Shared/GovernorCard.razor` | Card container — `ShowBloom` opts into the decorative gradient background |
| `orchestrator/Adpa.Web/Components/Shared/ReviewerStrip.razor` | Row of `StatusChip`s from a `ReviewerStatus` list |
| `orchestrator/Adpa.Web/Components/Shared/JustificationBlock.razor` | Soft inset-background block for requester-authored free text |
| `orchestrator/Adpa.Web/Components/Layout/MainLayout.razor` | The shared nav (`Approvals`/`Ledger`/`Requirements`/`Governance Center` links, sign-in/out via `<AuthorizeView>`) + `@Body` — replaces the nav that used to be hardcoded in `App.razor` |
| `orchestrator/Adpa.Web/Components/Routes.razor` | `AuthorizeRouteView DefaultLayout="@typeof(Layout.MainLayout)"` — every routed page gets the shared chrome by default |
| `orchestrator/Adpa.Web/Components/Pages/Approvals.razor` | `/approvals` — the real Approvals queue, `[Authorize]`; see `adpa-capability-registry` for the endpoints it calls |
| `orchestrator/Adpa.Web/Components/Pages/Home.razor` | `/` — migrated to the new design (first of the five original pages to be) |
| `orchestrator/Adpa.Web/Components/Pages/StyleGuide.razor` | `/style-guide` — renders all five shared components with sample content; `[AllowAnonymous]`, dev/QA only |
| `orchestrator/Adpa.Web/Components/App.razor` | Loads `design-tokens.css` + `gp-components.css`; no longer contains any nav markup itself |

## Commands

```powershell
dotnet build orchestrator/Adpa.Web -c Release
dotnet orchestrator/Adpa.Web/bin/Release/net10.0/Adpa.Web.dll
# then GET http://localhost:<port>/style-guide or /approvals
```

## Related Skills

- `adpa-governor-portal-auth` — ADR-009, the auth layer new pages built with this system will typically also need.
- `adpa-capability-registry` — the list-pending and action endpoints `/approvals` calls.
