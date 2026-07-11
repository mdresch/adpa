# ADR 008: Markdown to Styling — Adopting shadcn/typeset

## 1. Status
**Accepted (2026-07-11)** — infrastructure landed (stylesheet, fonts, preset) and the first pilot surface (Document Viewer full-screen reading mode) is implemented. Whether/how to migrate the remaining 17 surfaces in Appendix A is still open — see §6 item 7.

Deciders: Owner(s) of the Experience Tier (Next.js frontend / Researcher Dashboard).

## 2. Context
The frontend already renders Markdown/rich content in at least 15 places, using at least four different mechanisms and no single consistent styling convention:

- **`react-markdown` + `@tailwindcss/typography`**, applied ad hoc with inconsistent variants: `prose prose-lg max-w-none` ([app/demo-document-viewer/page.tsx:360](app/demo-document-viewer/page.tsx#L360)), dynamic `prose-{sm,lg,xl}`/`prose-{tight,relaxed}` sizing driven by user preference ([app/documents/[id]/view/page.tsx:922-926](app/documents/[id]/view/page.tsx#L922)), `prose prose-sm` with no dark-mode variant ([components/drift/DriftResolutionDialog.tsx:249](components/drift/DriftResolutionDialog.tsx#L249)), and `prose prose-sm dark:prose-invert` ([components/documents/VersionViewerDialog.tsx:204](components/documents/VersionViewerDialog.tsx#L204)).
- **`streamdown`**, used only in the Morphic chat surfaces, each wrapping its own `prose-sm`/`prose-neutral` variant independently ([components/morphic/markdown-message.tsx:19](components/morphic/markdown-message.tsx#L19), [components/morphic/artifact/reasoning-content.tsx:10](components/morphic/artifact/reasoning-content.tsx#L10)).
- **Regex-based Markdown → HTML via `dangerouslySetInnerHTML`**, bypassing any Markdown library entirely, still wrapped in `prose prose-sm max-w-none` ([components/documents/MarkdownDocumentViewer.tsx:224-232](components/documents/MarkdownDocumentViewer.tsx#L224), [components/documents/DynamicDocumentViewer.tsx:249-257](components/documents/DynamicDocumentViewer.tsx#L249)).
- **A fully bespoke, hand-rolled `<style>` block** injected at render time as an alternative to `prose` altogether, hardcoding `line-height: 1.75` and font stacks for `.markdown-content-wrapper` ([components/documents/DriftHighlighter.tsx:187-192](components/documents/DriftHighlighter.tsx#L187)) — the exact "reinvent typography per surface" failure mode a shared stylesheet is meant to prevent.

`@tailwindcss/typography` is already a dependency (`package.json`, `tailwindcss-animate` + `@tailwindcss/typography` registered as plugins in [tailwind.config.ts:114](tailwind.config.ts#L114)), so the fragmentation isn't a missing-tool problem — it's that `prose`'s size/invert/color modifiers are applied independently at each call site with no shared source of truth, and at least one surface opted out of it entirely.

shadcn's `typeset` is a single-stylesheet alternative: wrap output in a `.typeset` container (with a named preset like `.typeset-docs` for variant tuning) and headings, lists, tables, code, blockquotes, task lists, footnotes, and print rules are all styled from one file, with a `.not-typeset` / `data-not-typeset` escape hatch for embedded components. It does not replace `@tailwindcss/typography` — both can coexist — but it centralizes the styling decision in one file instead of N call sites.

**Two technical constraints are load-bearing for this decision and are not obvious from the shadcn docs, which are written for Tailwind v4:**

1. **This project pins Tailwind v3** (`tailwind.config.ts:3`, `// all in fixtures is set to tailwind v3 as interims solutions`; `app/globals.css:1-3` uses `@tailwind base/components/utilities`, not v4's `@import "tailwindcss"`). `typeset.css` itself is plain CSS (`@layer components`, native CSS nesting via `&:where(...)`, `color-mix()`, `oklch()`) and works under v3 without a build-tool change — it does not require Tailwind v4.
2. **The color-token bridge is incomplete.** `typeset.css` reads theme colors through v4-idiom variables — `var(--color-foreground, currentColor)`, `var(--color-muted-foreground, ...)`, `var(--color-border, ...)`, `var(--color-primary, ...)`, `var(--color-ring, ...)` — which Tailwind v4's `@theme inline` generates automatically. This project defines the equivalent tokens *without* the `--color-` prefix, as bare HSL triplets consumed via `hsl(var(--foreground))` etc. in `tailwind.config.ts:19-51` (e.g. `--foreground: 222.2 84% 4.9%`, not `--color-foreground: oklch(...)`). Because none of `--color-foreground` / `--color-muted-foreground` / `--color-border` / `--color-primary` / `--color-ring` exist in this project, every one of those `var(..., fallback)` lookups silently resolves to its CSS fallback (`currentColor`, `color-mix(in oklab, currentColor 20%, transparent)`, etc.) instead of the project's actual brand palette. The one exception is `--radius`, which *is* defined bare (`app/globals.css:37`, `--radius: 0.75rem`) and therefore correctly drives typeset's border-radius on code blocks, `<kbd>`, and images. Net effect: typeset renders correctly and legibly today, but its link/mute/border/rule colors track `currentColor` approximations rather than this project's theme, and won't shift with the `--primary` brand color the rest of the UI uses. Bridging this (defining `--color-foreground: hsl(var(--foreground))` etc. under `:root`/`.dark`) is a follow-up, not a blocker — see §6.

## 3. Decision
Adopt `typeset` as an available, opt-in styling primitive for Markdown-rendered content, installed once and applied incrementally — not as an immediate repo-wide replacement for `@tailwindcss/typography`. Concretely:

- `typeset.css` is vendored at [app/typeset.css](app/typeset.css) (downloaded from `https://ui.shadcn.com/typeset.css`, unmodified) and imported in [app/globals.css:5](app/globals.css#L5), directly after the Tailwind directives.
- `Space_Grotesk` and `Geist_Mono` are loaded via `next/font/google` in [app/layout.tsx](app/layout.tsx) as `--font-space-grotesk` / `--font-geist-mono`, and added to the root `<html>` `className` alongside the existing `--font-inter` / `--font-roboto` variables — additive, not a replacement of the app-wide sans/mono stack (`tailwind.config.ts`'s `fontFamily.sans`/`fontFamily.mono` are untouched).
- A `.typeset-docs` preset is defined in `app/globals.css` (font-body/heading → Space Grotesk, font-mono → Geist Mono, `15px`/`1.6`/`1em` size/leading/flow) as the first named variant, reserved for prose-heavy document-reading surfaces specifically — future presets for other surfaces (e.g. a denser chat-message variant) are expected to be added alongside it, not to redefine it.
- **Pilot surface chosen and implemented: the Document Viewer's full-screen reading mode** ([app/documents/[id]/view/page.tsx](app/documents/[id]/view/page.tsx), Appendix A row 1) — the clearest "long-form document reading" surface in the app, as opposed to that same page's default (non-full-screen) tab, which embeds `NovelEditor` (an editable, contenteditable-based surface that must never receive a `typeset` wrapper — an editor owns its own styling in sync with its editing model).
  - The reading container is now `<div className="typeset typeset-docs max-w-[42em] mx-auto" style={{ '--typeset-size': ..., '--typeset-leading': ... }}>`, replacing the old `prose ${fontSize-modifier} ${lineHeight-modifier}` class string. The existing reader controls (font-size sm/base/lg/xl, line-height tight/normal/relaxed) still work — they now set `--typeset-size`/`--typeset-leading` as per-instance inline CSS custom-property overrides (via `TYPESET_FONT_SIZE_MAP`/`TYPESET_LINE_HEIGHT_MAP`) instead of swapping Tailwind `prose-*` modifier classes, since typeset has no modifier-class equivalent.
  - [components/documents/MarkdownRenderer.tsx](components/documents/MarkdownRenderer.tsx) — the component the Document Viewer's full-screen mode actually renders through — gained an opt-in `variant="typeset"` prop (default `"default"`, byte-for-byte the historical output). In `variant="typeset"`, the custom `p`/`table`/`th`/`td` overrides stop emitting hardcoded Tailwind classes (`mb-4`, `border-gray-300`, `bg-gray-50`, …) so typeset's own CSS styles them instead; the `code` path wraps both the Mermaid-diagram and syntax-highlighted-code branches in `not-typeset`, since `MermaidDiagram`/`SyntaxHighlighter` already own their rendering; the inline-entity-pill match wraps `EntityPill` in `not-typeset` for the same reason.
  - Existing `MarkdownRenderer` consumers that never pass `variant` — OpenUI chat's `ProseComponent.tsx`/`TwoColumnProseComponent.tsx`/`DynamicComponentRenderer.tsx` — are unaffected by construction, guarded by a regression test (§7).
  - Design spec: [docs/superpowers/specs/2026-07-11-typeset-document-viewer-design.md](../../superpowers/specs/2026-07-11-typeset-document-viewer-design.md). Operating skill for adopting further surfaces: [.agents/skills/adpa-typeset-markdown-styling/SKILL.md](../../../.agents/skills/adpa-typeset-markdown-styling/SKILL.md).
- The other 17 surfaces in Appendix A are **deliberately untouched** — `@tailwindcss/typography`'s `prose` classes remain exactly as they were. This is explicitly a pilot, not a migration mandate. A later ADR (or an update to this one) would be needed to decide whether/how to migrate them onto `typeset`.

## 4. Options Considered

### Option A: Do nothing — leave `prose` usage as-is
| Dimension | Assessment |
|---|---|
| Complexity | None |
| Consistency | Status quo — fragmented `prose` variants, one surface with hand-rolled CSS instead |

Cheapest option; does nothing to address the inconsistency documented in §2, and each new Markdown surface continues to pick its own `prose-*` combination or reinvent styling from scratch (as `DriftHighlighter.tsx` already did).

### Option B: Consolidate on `@tailwindcss/typography` alone
| Dimension | Assessment |
|---|---|
| Complexity | Low-Medium — no new dependency, extend `theme.extend.typography` in `tailwind.config.ts` with a named `DEFAULT`/`docs` variant, then migrate call sites to use it |
| Consistency | Good, if migration is actually completed across all 15+ surfaces |
| Token fidelity | Full — `prose` is already wired through this project's real Tailwind color config, no `--color-*` gap |

Avoids introducing a second typography system and has no color-token bridging problem (§2, constraint 2). Realistic cost is the same as any consolidation: someone has to touch all 15+ call sites, not just add a config block, or the fragmentation persists exactly as today.

### Option C (Chosen): Install `typeset`, adopt incrementally starting with one pilot surface
| Dimension | Assessment |
|---|---|
| Complexity | Low to install (single CSS file + two fonts, both done); migration cost is deferred and incremental, one surface at a time |
| Consistency | Centralizes styling in one file for *any surface that opts in*, but does not by itself fix the other 14 `prose` surfaces |
| Token fidelity | Partial today — `--radius` is correctly wired, color tokens (`--color-foreground` etc.) are not (§2), falling back to `currentColor`/`color-mix` approximations rather than the project's HSL palette |

Lets one real surface (chosen in §6) prove out the pattern — including the print styles, GFM task lists, and footnote handling `@tailwindcss/typography` doesn't give out of the box — without committing to touching every existing call site up front. The coexistence with `prose` is a deliberate, temporary state, not an oversight.

### Trade-off analysis
Option A was already rejected implicitly by the existence of this ADR request. Between B and C: B is the lower-risk, single-system choice, since it has no color-token gap and no new dependency. C was chosen because `typeset`'s value (one file, `not-typeset` escape hatch, first-class print/footnote/task-list support) is worth piloting on a real surface before deciding whether to commit to a full migration either direction — and because the color-token gap (§2) is a fixable follow-up, not a fundamental incompatibility. If the pilot surface reveals the token-fidelity gap is unacceptable in practice, Option B remains available as a fallback with no sunk cost beyond the (small, self-contained) files already added.

## 5. Consequences

### Positive
- One canonical file (`app/typeset.css`) defines Markdown typography instead of each call site choosing its own `prose-*` combination — for any surface that adopts it.
- Built-in support this project's ad hoc `prose` usage doesn't get uniformly today: `not-typeset`/`data-not-typeset` opt-out for embedded components, GFM task lists, footnotes, `<kbd>`, definition lists, and `@media print` rules (`break-inside: avoid` on tables/code blocks).
- `.typeset-docs` gives document-reading surfaces a distinct, intentional display typeface (Space Grotesk) separate from the app's UI sans-serif (Inter), without touching the global `font-sans` stack other components rely on.
- Installing the infrastructure (§6 items 1-4) changed no existing surface's rendering. The pilot (§3) intentionally changed exactly one surface's rendering, guarded by a Jest regression test proving every other `MarkdownRenderer` consumer is byte-for-byte unaffected (§7).

### Negative
- **Two typography systems now coexist** (`@tailwindcss/typography`'s `prose` on 17 remaining surfaces, `typeset` on the one pilot surface). Left unresolved, this is a worse fragmentation than today's, not a better one — the follow-up decision in §6 and a future migration-or-not call are required, not optional.
- **Color-token fidelity gap** (§2): `typeset`'s link/muted/border/rule colors resolve to `currentColor`-based approximations, not this project's actual `--primary`/`--muted-foreground`/`--border` HSL tokens, until a bridging block is added. Visually close in the default theme, but will not track future brand-color changes the rest of the UI does pick up.
- **Print/GFM features are unproven here** — footnote and task-list rendering depend on `remark-gfm`, which is already a dependency (`package.json`), but no current surface exercises `typeset`'s footnote/task-list CSS end-to-end yet.
- Two new font files (Space Grotesk, Geist Mono) added to the app's font-loading waterfall via `next/font/google`, even before any surface uses them — `next/font` self-hosts and subsets, so the cost is bounded, but it is not zero.

## 6. Action Items
1. ~~Vendor `app/typeset.css` from `https://ui.shadcn.com/typeset.css`.~~ **Done.**
2. ~~Import it in `app/globals.css` after the Tailwind directives.~~ **Done** ([app/globals.css:5](app/globals.css#L5)).
3. ~~Load `Space_Grotesk`/`Geist_Mono` in `app/layout.tsx` and add both variables to the root `<html>` className.~~ **Done.**
4. ~~Define the `.typeset-docs` preset in `app/globals.css`.~~ **Done** ([app/globals.css:7-14](app/globals.css#L7)).
5. ~~Pick and implement the pilot surface.~~ **Done** — Document Viewer full-screen reading mode ([app/documents/[id]/view/page.tsx](app/documents/[id]/view/page.tsx)); see §3 for what changed and §7 for the design spec, skill, and test references. Appendix A row 1 updated accordingly.
6. **Optional follow-up — bridge the color-token gap.** Define `--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-primary`, `--color-ring` (as `hsl(var(--foreground))` etc.) under the existing `:root`/`.dark` blocks in `app/globals.css`, so `typeset`'s fallback-driven colors resolve to this project's actual theme instead of `currentColor` approximations. Not required for the pilot to render correctly, but required before treating `typeset` as visually equivalent to `prose` in dark mode or under a future brand-color change.
7. **Not yet decided — full migration.** Whether the other 14 `prose` surfaces (and `DriftHighlighter.tsx`'s hand-rolled `<style>` block) should eventually move to `typeset` is out of scope for this ADR and depends on how the pilot in item 5 goes.

## 7. References
- Vendored stylesheet: [app/typeset.css](app/typeset.css) (from `https://ui.shadcn.com/typeset.css`)
- Import + preset: [app/globals.css](app/globals.css)
- Font loading: [app/layout.tsx](app/layout.tsx)
- Pilot surface: [app/documents/[id]/view/page.tsx](app/documents/[id]/view/page.tsx), [components/documents/MarkdownRenderer.tsx](components/documents/MarkdownRenderer.tsx)
- Pilot regression test: [__tests__/components/MarkdownRenderer.test.tsx](../../__tests__/components/MarkdownRenderer.test.tsx)
- Design spec: [docs/superpowers/specs/2026-07-11-typeset-document-viewer-design.md](../../superpowers/specs/2026-07-11-typeset-document-viewer-design.md)
- Operating skill: [.agents/skills/adpa-typeset-markdown-styling/SKILL.md](../../../.agents/skills/adpa-typeset-markdown-styling/SKILL.md)
- Tailwind v3 pin: [tailwind.config.ts:3](tailwind.config.ts#L3)
- Existing theme tokens (bare, non-`--color-`-prefixed): [app/globals.css:16-71](app/globals.css#L16)
- `@tailwindcss/typography` plugin registration: [tailwind.config.ts:114](tailwind.config.ts#L114)
- Fragmented `prose` usage: [app/demo-document-viewer/page.tsx:360](app/demo-document-viewer/page.tsx#L360), [app/documents/[id]/view/page.tsx:922](app/documents/[id]/view/page.tsx#L922), [components/drift/DriftResolutionDialog.tsx:249](components/drift/DriftResolutionDialog.tsx#L249), [components/documents/VersionViewerDialog.tsx:204](components/documents/VersionViewerDialog.tsx#L204)
- Hand-rolled alternative to `prose`: [components/documents/DriftHighlighter.tsx:187](components/documents/DriftHighlighter.tsx#L187)
- Streamdown-based chat surfaces: [components/morphic/markdown-message.tsx](components/morphic/markdown-message.tsx), [components/morphic/artifact/reasoning-content.tsx](components/morphic/artifact/reasoning-content.tsx)
- shadcn typeset docs: `https://ui.shadcn.com/docs/typeset`

## 8. Note on numbering
This ADR is numbered 008, not 006, because `ADR-006` (`itwin-digital-twin-mcp-integration.md`) and `ADR-007` (`xai-developer-tools-suite.md`) already exist as untracked files in this working tree at the time of writing, unrelated to this topic. `ADR-002`/`ADR-003` are gaps in the existing sequence (not reused here to avoid ambiguity with any prior, since-removed content).

## Appendix A: Full Markdown-Rendering Surface Inventory
Full result of the survey referenced in §2, kept here as the canonical list for §6 item 5 (pilot selection) and any future migration decision (§6 item 7), so the next person doesn't have to re-run the search. Grouped by domain, since domain is the more useful signal for *which preset* a surface should eventually use — `typeset-docs` (long-form reading) is not necessarily the right preset for dense chat or inline GenUI content.

### Document domain (candidates for `.typeset-docs`)
| # | File | Mechanism | Renders | Current styling |
|---|---|---|---|---|
| 1 | [app/documents/[id]/view/page.tsx:922](app/documents/[id]/view/page.tsx#L922) | `react-markdown` (via `MarkdownRenderer variant="typeset"`) | Main document viewer page, full-screen reading mode | **Adopted (pilot, §3/§6 item 5)** — `typeset typeset-docs`, `--typeset-size`/`--typeset-leading` set per the font-size/line-height reader controls. *(The page's default, non-full-screen tab uses `NovelEditor`, not this renderer, and is out of scope — editors must not receive a `typeset` wrapper.)* |
| 2 | [app/demo-document-viewer/page.tsx:360](app/demo-document-viewer/page.tsx#L360) | `react-markdown` | Demo document viewer preview | `prose prose-lg max-w-none` |
| 3 | [app/process-flow/page.tsx:2408](app/process-flow/page.tsx#L2408) | `react-markdown` | Process-flow generated content preview | `prose prose-lg max-w-none p-4` |
| 4 | [components/drift/DriftResolutionDialog.tsx:250](components/drift/DriftResolutionDialog.tsx#L250) | `react-markdown` | AI-resolved drift/document content in a dialog | `prose prose-sm max-w-none` (no dark variant) |
| 5 | [components/documents/DriftHighlighter.tsx:542-872](components/documents/DriftHighlighter.tsx#L542) | `react-markdown` | Document content with entity/drift highlighting | **Bespoke hand-rolled `<style>` block**, not `prose` at all |
| 6 | [components/documents/EntityHighlighter.tsx](components/documents/EntityHighlighter.tsx) | `react-markdown` | Document content with entity highlighting overlay | None found |
| 7 | [components/documents/VersionViewerDialog.tsx:204](components/documents/VersionViewerDialog.tsx#L204) | `react-markdown` | Document version comparison/preview dialog | `prose prose-sm dark:prose-invert max-w-none` |
| 8 | [components/documents/MarkdownDocumentViewer.tsx:226](components/documents/MarkdownDocumentViewer.tsx#L226) | regex → `dangerouslySetInnerHTML` | Document `content` field (bypasses any real MD parser) | `prose prose-sm max-w-none` |
| 9 | [components/documents/DynamicDocumentViewer.tsx:251](components/documents/DynamicDocumentViewer.tsx#L251) | regex → `dangerouslySetInnerHTML` | "Highlighted content" variant of #8 | `prose prose-sm max-w-none` |
| 10 | [components/portfolioDomains/DomainCard.tsx:12](components/portfolioDomains/DomainCard.tsx#L12) | raw HTML injection | Domain `description` field | `prose prose-sm text-gray-700` |
| 11 | [app/projects/[id]/documents/view/page.tsx:868](app/projects/[id]/documents/view/page.tsx#L868) | `react-markdown` (assumed) | Project document view page | `prose prose-slate prose-sm max-w-none` |

### Chat domain (Morphic — likely wants its own preset, not `typeset-docs`)
| # | File | Mechanism | Renders | Current styling |
|---|---|---|---|---|
| 12 | [components/morphic/markdown-message.tsx:19](components/morphic/markdown-message.tsx#L19) | `Streamdown` | Morphic AI chat assistant messages (citations, KaTeX math) | `prose-sm prose-neutral prose-a:text-accent-foreground/50` (+ glass styling) |
| 13 | [components/morphic/artifact/reasoning-content.tsx:10](components/morphic/artifact/reasoning-content.tsx#L10) | `Streamdown` | Morphic "reasoning" panel content | `prose-sm dark:prose-invert max-w-none` |
| 14 | [components/morphic/message.tsx:48-57](components/morphic/message.tsx#L48) | `Streamdown` | Morphic chat message body (general) | `prose-sm`-style classes via `cn(...)` |

### GenUI / OpenUI chat domain (dense, inline content — likely wants its own preset)
| # | File | Mechanism | Renders | Current styling |
|---|---|---|---|---|
| 15 | [components/documents/MarkdownRenderer.tsx](components/documents/MarkdownRenderer.tsx) | `react-markdown` | Shared generic renderer, used by GenUI chat | None itself — caller wraps it |
| 16 | [components/openui-chat/DynamicComponentRenderer.tsx:220](components/openui-chat/DynamicComponentRenderer.tsx#L220) | uses #15 | GenUI chat content | `prose prose-slate prose-sm max-w-none` (wrapper) |
| 17 | [components/openui-chat/InlineMarkdown.tsx](components/openui-chat/InlineMarkdown.tsx) | custom inline parser | Inline bold/italic/links/code in chat lists/tables/headers | None — custom span overrides |
| 18 | [components/openui-chat/AssistantMessage.tsx:182](components/openui-chat/AssistantMessage.tsx#L182) | `react-markdown` (assumed) | OpenUI chat assistant messages | `prose prose-slate max-w-none text-sm leading-relaxed text-slate-700` |

### Not real Markdown renderers — flagged for completeness only
These wrap raw/preformatted text in `prose` without an actual Markdown parser in the chain. Not candidates for `typeset` as-is; listed so they aren't mistaken for gaps in the survey.
| File | Wraps |
|---|---|
| [app/projects/[id]/components/ProjectContextTab.tsx:912](app/projects/[id]/components/ProjectContextTab.tsx#L912) | Raw `<pre>` in `prose dark:prose-invert max-w-none` |
| [app/projects/[id]/components/ProjectDataExtraction.tsx:836](app/projects/[id]/components/ProjectDataExtraction.tsx#L836) | Raw `<div>` with `whitespace-pre-wrap` in `prose prose-sm max-w-none dark:prose-invert` |
| [app/projects/[id]/components/BaselineManagement.tsx:1519](app/projects/[id]/components/BaselineManagement.tsx#L1519) | Raw `<pre>` in `prose prose-sm max-w-none`, inside a `TabsContent` |
