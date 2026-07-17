# Governor Portal Shared Component Library (ADR-011 implementation) Design Spec

**Date**: 2026-07-14
**Status**: Draft
**Related**: [ADR-011: Governor Portal Visual Design System](../../07-architecture/ADR-011-governor-portal-design-system.md)

---

## Problem

ADR-011 accepted Direction D ("Humanist") as the Governor Portal's design system and documented concrete tokens — but flagged its own biggest risk explicitly: "none of this is implemented as reusable Blazor components yet... a follow-on implementation task still needs to turn these tokens into actual shared components... or the fragmentation problem this ADR exists to close reappears one page later." This is that follow-on task.

## Decision

### Tokens: one CSS file, `--gp-` prefixed

`wwwroot/design-tokens.css` defines every color/type token from ADR-011's palette table as a `:root` custom property, prefixed `--gp-` to avoid colliding with Bootstrap's own `--bs-*` properties (Bootstrap 5.3.2 stays loaded for layout primitives — this file only owns color/type/spacing, not a Bootstrap replacement). Loaded via a `<link>` in `App.razor`, alongside the existing Bootstrap CDN link and `app.css`.

### Components: Blazor CSS isolation, not a component library dependency

Five components under `Components/Shared/`, each with a paired `.razor.css` file (Blazor's native scoped-CSS mechanism — no MudBlazor/Radzen dependency introduced):

- **`StatusChip`** — a pill-shaped status signal. `ChipState` enum (`Approved`/`Pending`/`Declined`/`Neutral`) drives a background+ink color pair, never hue alone.
- **`PillButton`** — the action button. `ButtonVariant` enum (`Primary`/`Secondary`/`Approve`/`Deny`) — Approve/Deny are kept visually distinct from generic Primary/Secondary so a reviewer's eye is drawn to the decision itself, not just "a button." Renders as `<a>` instead of `<button>` when `Href` is set, for navigation actions.
- **`GovernorCard`** — the card container. `ShowBloom` (default `false`) opts into the decorative blurred-gradient-circle background (the nod to microsoft.ai's watercolor illustration) — deliberately opt-in, not default, since a dense list of many cards would drown in blooms if every card had them.
- **`ReviewerStrip`** — a row of `StatusChip`s from a `ReviewerStatus(Label, State)` list. One component shared by both the two-signature override flow (requester/approver) and break-glass's five reviewer categories (account_owner/manager/internal_audit/external_auditor/super_admin) — the visual pattern ("who's signed off, who hasn't") is identical between them, so it isn't duplicated.
- **`JustificationBlock`** — a soft inset-background paragraph, visually distinguishing "what the requester wrote" (free text) from "what the system recorded" (structured fields).

All five are exposed via `@using Adpa.Web.Components.Shared` in `_Imports.razor`, so any page can consume them without a per-file using statement.

### Verification surface: `/style-guide`

A new page (`[AllowAnonymous]`, not gated behind ADR-009 auth — a dev/design-QA tool, not governance data) renders all five components with the *exact* sample content from ADR-011's comparison mockup (the `ip-governance` override-review card, the same five break-glass reviewer categories) so the component library's actual rendered output can be checked against the accepted design, not just visually imagined.

## Deferred / not verified

- **No pixel-level visual confirmation.** No screenshot/browser-automation tool was available in this session. Verification was structural: `dotnet build -c Release` clean, and a real running `Adpa.Web` process returned `200` for `/style-guide` and `/design-tokens.css`, with the rendered HTML confirmed to contain the correct Blazor-scoped CSS classes (`gp-chip-approved`, `gp-btn-approve`, `gp-card-frame`, etc.) and the expected sample content ("Approve override", "Internal audit", "Pending review"). Whether the blooms, shadows, and spacing actually *look* like the accepted mockup has not been independently confirmed — the CSS values were copied directly from the already-approved artifact mockup, not re-derived, which is the strongest available substitute for a live visual check.
- **The existing five pages are not yet migrated** to use these components — `Ledger`, `Requirements`, `RPASGovernanceCenter`, `AIWorkspace`, and `Home` still render their pre-ADR-011 Bootstrap/dark-navy styling untouched. This is deliberately the next task, not this one.
- **No override-request or break-glass-review page exists yet** — `/style-guide` demonstrates the components with static sample data; wiring them to the real `CapabilityOverrideController`/`CapabilityOverrideExceptionController` proxy endpoints (via the `"api"` `HttpClient`, now bearer-token-attached per ADR-009) is separate, future work.

## Verification

- `dotnet build -c Release` (`orchestrator/Adpa.Web`) — clean, 0 warnings/0 errors.
- Runtime: `GET /style-guide` → `200`, `GET /design-tokens.css` → `200`, response body contains all expected component-scoped CSS classes and sample content strings.
