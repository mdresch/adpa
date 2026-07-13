---
name: adpa-governor-portal-design-system
description: The Governor Portal's shared visual design system (ADR-011 "Humanist") — design-tokens.css and the five Components/Shared/*.razor components (StatusChip, PillButton, GovernorCard, ReviewerStrip, JustificationBlock). Load when building or touching any Adpa.Web page, especially anything showing an override/break-glass review card, a status signal, or an action button.
---

# ADPA Governor Portal Design System

## Purpose

Before this, `orchestrator/Adpa.Web` had five pages each styling themselves independently — no shared tokens, no component library, two pages with their own bespoke `<style>` blocks. [ADR-011](../../../docs/07-architecture/ADR-011-governor-portal-design-system.md) picked a visual direction ("Humanist," checked against microsoft.ai's actual current design and adapted for an operational tool); this skill covers the concrete implementation of that decision — see [the implementation design spec](../../../docs/superpowers/specs/2026-07-14-governor-portal-component-library-design.md) for the full reasoning.

**Any new Adpa.Web page or component should consume these tokens/components, not invent its own styling** — that's the exact fragmentation this system exists to close.

## Invariants

- Must always: read colors from `--gp-*` custom properties (`wwwroot/design-tokens.css`), never hardcode a hex value in a new component's CSS. If a needed color doesn't have a token yet, add it to `design-tokens.css` first, don't inline it.
- Must always: keep semantic status colors (approved/pending/declined) at clearly separated hues, not variations of one pastel — `StatusChip`/`ReviewerStrip` carry a real decision signal, and the "warm humanist" brand influence must not make that signal ambiguous. This is the one place ADR-011 explicitly said the source brand's aesthetic does *not* transfer wholesale.
- Must always: use Blazor CSS isolation (`ComponentName.razor.css`) for any new shared component, not a global stylesheet class — this is what lets each component's styles stay scoped and composable, matching the pattern already established by all five existing components.
- Must always: treat `GovernorCard`'s `ShowBloom` as opt-in (default `false`) — reserve the decorative gradient blooms for single-focus review surfaces (a promote/override/break-glass decision card), never a dense list/table view, where many blooms would compete with each other and the content.
- Must always: reuse `ReviewerStrip` for any "who has/hasn't signed off" display — it's already generic over an arbitrary list of `(Label, State)` pairs, covering both the two-signature override flow and break-glass's five categories. Don't build a second, page-specific version of the same pattern.
- Must never: add a component-library dependency (MudBlazor, Radzen, etc.) as a shortcut — ADR-011's Options Considered section rejected the "fast but generic" direction deliberately; the bespoke component set is the accepted decision, not a placeholder for one.
- Must never: assume `dotnet build` succeeding is sufficient verification for a visual change here — no screenshot/browser-automation tool is available in this environment as of this skill's writing; verify via a real running process (`dotnet bin/Release/net10.0/Adpa.Web.dll`) and check HTTP status + presence of expected CSS classes/content in the response body, and say explicitly if pixel-level appearance wasn't independently confirmed.

## Interaction Rules

- Depends on: `adpa-governor-portal-auth` (ADR-009) — pages built with these components will typically also need `[Authorize]` and the bearer-token-attached `"api"` `HttpClient`, both covered by that skill.
- Must not break: the existing five pages' current (pre-ADR-011) rendering while they're unmigrated — `design-tokens.css` and `app.css` coexist; adding tokens doesn't retroactively restyle anything until a page is deliberately migrated.
- New work when: the existing five pages (`Ledger`, `Requirements`, `RPASGovernanceCenter`, `AIWorkspace`, `Home`) get migrated to these components, and when the override-request/break-glass-review pages are actually built (wiring `Components/Shared/*` to the real `CapabilityController` proxy endpoints via `IHttpClientFactory.CreateClient("api")`) — neither has happened yet.

## Key Files

| File | Role |
|------|------|
| `orchestrator/Adpa.Web/wwwroot/design-tokens.css` | The `--gp-*` token definitions — palette, font stack |
| `orchestrator/Adpa.Web/Components/Shared/StatusChip.razor` (+ `.razor.css`) | Pill status signal — `ChipState`: Approved/Pending/Declined/Neutral |
| `orchestrator/Adpa.Web/Components/Shared/PillButton.razor` (+ `.razor.css`) | Action button — `ButtonVariant`: Primary/Secondary/Approve/Deny; renders as `<a>` when `Href` is set |
| `orchestrator/Adpa.Web/Components/Shared/GovernorCard.razor` (+ `.razor.css`) | Card container — `ShowBloom` opts into the decorative gradient background |
| `orchestrator/Adpa.Web/Components/Shared/ReviewerStrip.razor` (+ `.razor.css`) | Row of `StatusChip`s from a `ReviewerStatus` list — shared by override and break-glass review UI |
| `orchestrator/Adpa.Web/Components/Shared/JustificationBlock.razor` (+ `.razor.css`) | Soft inset-background block for requester-authored free text |
| `orchestrator/Adpa.Web/Components/Pages/StyleGuide.razor` | `/style-guide` — renders all five components with real ADR-005 field-shaped sample content; `[AllowAnonymous]`, a dev/QA page, not governance data |
| `orchestrator/Adpa.Web/Components/App.razor` | Loads `design-tokens.css` alongside Bootstrap and `app.css` |
| `orchestrator/Adpa.Web/_Imports.razor` | `@using Adpa.Web.Components.Shared` — components usable with no per-file using |

## Commands

```powershell
dotnet build orchestrator/Adpa.Web -c Release
# Runtime check (no Aspire/DB dependency needed for /style-guide itself):
dotnet orchestrator/Adpa.Web/bin/Release/net10.0/Adpa.Web.dll
# then GET http://localhost:<port>/style-guide
```

## Related Skills

- `adpa-governor-portal-auth` — ADR-009, the auth layer new pages built with this system will typically also need.
- `adpa-capability-registry` — the endpoints an override/break-glass review page built with these components will eventually call.
