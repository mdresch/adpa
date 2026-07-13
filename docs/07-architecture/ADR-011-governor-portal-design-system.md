# ADR 011: Governor Portal Visual Design System — "Humanist"

## 1. Status
**Accepted (2026-07-14)**

Deciders: Owner(s) of the Governor Portal (`orchestrator/Adpa.Web`).

## 2. Context

`orchestrator/Adpa.Web` has no design system today — confirmed before this decision, not assumed. Five pages (`Home`, `Ledger`, `Requirements`, `RPASGovernanceCenter`, `AIWorkspace`) each style themselves independently: Bootstrap 5.3.2 pulled from a CDN `<link>`, one shared `wwwroot/app.css` (a dark navy/cyan theme), and two pages additionally embed their own large page-local `<style>` blocks with no shared tokens. No component library, no CSS isolation files, no typography scale, no documented palette. This was tolerable while the portal was five read-mostly pages with dead approve/review buttons (ADR-005's original state) — it stops being tolerable now that [ADR-009](ADR-009-unified-authentication.md) and the orchestrator-side proxy work have made every ADR-005 write action (promote, override request/approve/deny, break-glass request/decide/activate) actually callable from here, and a real redesign is about to add workflow surfaces (an approval queue, an override-review card, a break-glass review panel) that don't exist yet in any form.

The user asked, with no starting visual direction of their own, to see concrete options rather than choose from a text description. Four directions were built as working HTML/CSS applied to the *same* real content (an actual override-review card using `CapabilityOverrideController`'s real field shapes and the five real break-glass reviewer categories — not placeholder content) and compared side by side:

- **A · Console** — Inter/system sans, blue accent, rounded cards, pill badges. Fast and familiar; deliberately the least distinctive (generic enterprise SaaS is the explicit tradeoff for speed).
- **B · Ledger** — dark ink-green + brass, serif headers, monospace for every ID/timestamp, square "seal" status marks. Most subject-grounded (this product *is* a tamper-evident ledger) but the most build effort and the coldest read.
- **C · Terminal** — near-black, fully monospace, single cyan signal color, zero decoration. A NOC/operator-console read, optimized for scanning speed over warmth.
- **D · Humanist** — checked against microsoft.ai's actual current design before building (fetched live, not guessed: the site uses watercolor illustration, a warm pastel palette over a light neutral base, generous whitespace, and large confident sans headlines under a "Humanist Superintelligence" brand). Adapted rather than transplanted for this specific use — see Decision.

**D was selected.**

## 3. Decision

Adopt Direction D ("Humanist") as `Adpa.Web`'s design system, with the adaptation already built into the comparison concept made explicit as a standing rule: **microsoft.ai's aesthetic is a marketing site's language; this is where someone decides whether to grant emergency access to a compliance system.** The warmth, confidence, and whitespace transfer; illustration and ambiguous-hue pastel status signaling do not.

### Palette

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fbf8f3` | Page ground — warm off-white, not cold grey |
| `--surface` | `#fffefb` | Card/panel background |
| `--border` | `#ece4d6` | Card borders, dividers |
| `--ink` | `#2b2620` | Primary text |
| `--soft` | `#7a7266` | Secondary text, metadata |
| `--bloom-coral` | `#f0b8ae` | Soft background accent bloom (decorative only) |
| `--bloom-sky` | `#a9c7dd` | Soft background accent bloom (decorative only) |
| `--pending-bg` / `--pending-ink` | `#fbe9cd` / `#a5711c` | Pending-state badge |
| `--approve` | `#6f9e6b` | Approve button, approved chip background `#e5f0e2` / ink `#4f7a4c` |
| `--decline` | `#c9584a` | Deny button border/ink, declined chip background `#fbe5e1` / ink `#b8503f` |

**Must always** keep semantic status colors (approved/pending/declined) at clearly separated hues, not variations of one pastel — the source brand uses color for warmth and mood; this system uses it for warmth *and* for a real decision signal, and the second job doesn't get to lose to the first.

### Typography

System sans throughout (`-apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif`) — Segoe UI is literally Microsoft's own family, and using the system stack avoids a webfont dependency Blazor Server would otherwise need to self-host. Headlines are large and confident (18px+/700 weight for card titles, no separate display face) rather than the smaller, denser type scale a data-table-first system (Console, Terminal) would use.

### Component treatment

- Cards: `border-radius: 20px`, soft two-layer shadow, generous padding (22-24px).
- Buttons: full pill (`border-radius: 999px`), bold weight, no icon-only affordances.
- Status/reviewer chips: pill-shaped, semantic-hue background tints (never grey-on-grey for a real state).
- Decorative blurred gradient "blooms" (radial-gradient circles, `filter: blur(38px)`, low opacity) behind card content as the nod to the source's watercolor illustration — kept off to the edges, never behind text, never so saturated they compete with the content or the status chips.
- Justification/free-text fields get a soft rounded inset background (`#f8f3ea`), not a plain paragraph — visually distinguishing "what the requester wrote" from "what the system recorded."

### Scope

Applies to `Adpa.Web` going forward: the existing five pages (as they're touched during the redesign) and the new workflow surfaces the redesign adds (override-review queue, break-glass review panel). Does not apply to the Next.js Researcher Dashboard (`app/`), which has its own design system question tracked separately (see [ADR-008](ADR-008-markdown-to-styling.md) for that tier's styling decision) or to the .NET orchestrator's API responses (no visual surface).

## 4. Options Considered

See the four built comparison directions in Context — **A (Console)** was rejected as the "safe but generic" option with no reason to differentiate; **B (Ledger)** was rejected as thematically strong but colder and higher-build-effort than the chosen direction, and a closer fit for a pure audit-trail viewer than for a workflow tool people also need to *act* through; **C (Terminal)** was rejected as optimizing for operator density at the cost of the "human accountability" framing ADR-005's own Context section argues for (a terminal aesthetic reads as automated/impersonal, in some tension with a design meant to reinforce that a real person is accountable for this decision).

## 5. Consequences

- **Positive:** A real, documented token set exists before the redesign's page work starts, rather than each new page inventing its own palette the way the current five do.
- **Negative:** The decorative gradient blooms and pill-heavy component language add visual surface area that a denser, more data-table-forward page (e.g., a long override-request history list) will need to deliberately restrain, or density suffers. This system was chosen for its warmth on decision-making surfaces, not because it's the best fit for every future page — a future high-density table view may need a documented, scoped exception (e.g., tighter row padding, smaller chip scale) rather than abandoning the tokens wholesale.
- **Risks:** None of this is implemented as reusable Blazor components yet (no shared `.razor`/CSS-isolation component library exists in `Adpa.Web` — see ADR-009's design spec, which already flagged the lack of a `LayoutComponentBase`). This ADR fixes the *visual* decision; a follow-on implementation task still needs to turn these tokens into actual shared components rather than copy-pasted inline styles per page, or the fragmentation problem this ADR exists to close reappears one page later.

## Related ADRs

- [ADR-009: Unified Authentication Across Tiers](ADR-009-unified-authentication.md) — the prerequisite that made a real, functional Governor Portal redesign possible in the first place.
- [ADR-005: Federated Capability Ownership](ADR-005-federated-capability-ownership.md) — Action Item 7's "working front door," which this design system is being built to finally deliver.
- [ADR-008: Markdown to Styling](ADR-008-markdown-to-styling.md) — the equivalent styling-adoption decision for the Next.js tier; a separate surface, not superseded or extended by this one.
