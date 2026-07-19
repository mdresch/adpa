---
name: adpa-typeset-markdown-styling
description: Apply or extend shadcn/typeset (app/typeset.css) for styling rendered markdown surfaces. Use when adding a new .typeset-* preset, wrapping a new markdown/rich-content surface in typeset, or editing MarkdownRenderer's variant behavior.
---

# ADPA Typeset Markdown Styling

**typeset** ([shadcn/typeset](https://ui.shadcn.com/docs/typeset)) is a single stylesheet (`app/typeset.css`) that styles rendered markdown: wrap output in a `.typeset` container and everything inside (headings, lists, tables, code, blockquotes, math) is styled with **zero classes needed on the content itself**. Everything outside the container is untouched.

This is ADPA's answer to nine-plus surfaces each hand-rolling their own Tailwind Typography (`prose prose-*`) configuration with no shared baseline. See [ADR-008: Markdown to Styling](../../../docs/07-architecture/ADR-008-markdown-to-styling.md) for the architectural decision and rollout sequencing, and `docs/superpowers/specs/2026-07-11-typeset-document-viewer-design.md` for the first (and, as of this skill's writing, only) adopted surface.

## When to use this skill

- Adding typeset to a **new** markdown/rich-content surface (a second surface after the Document Viewer).
- Adding or editing a `.typeset-*` preset in `app/globals.css` (e.g. a `.typeset-chat` preset for a denser chat-bubble surface).
- Editing `MarkdownRenderer`'s `variant` behavior (`components/documents/MarkdownRenderer.tsx`) or its `buildMarkdownComponents` factory.
- Debugging why a markdown surface looks unstyled, double-styled, or has a font mismatch.

## Current state (as of this skill's writing)

| Piece | File | Status |
|---|---|---|
| Stylesheet | `app/typeset.css` | Downloaded from `https://ui.shadcn.com/typeset.css`, then **required one deliberate edit**: both `@layer components { ... }` wrappers stripped (contents unwrapped to plain top-level rules). If you re-download to pick up an upstream change, you must re-apply this — see the Turbopack pitfall below. |
| Import | `app/globals.css` | `@import "./typeset.css";` as the literal first line of the file — **not** after the `@tailwind` directives, despite shadcn's own docs (written for Tailwind v4's `@import "tailwindcss"`) showing it that way. Under this project's Tailwind v3 `@tailwind base/components/utilities` directives, those expand into plain CSS rules by build time; the CSS spec requires `@import` to precede all other rules, and Turbopack enforces this at the compiled-CSS level, not just source order — `@import` after `@tailwind` throws "`@import` rules must precede all rules aside from `@charset` and `@layer` statements" at build time. |
| Preset | `app/globals.css` `.typeset-docs` | Space Grotesk (body+heading) / Geist Mono (code), `15px` / `1.6` leading / `1em` flow. |
| Fonts | `app/layout.tsx` | `Space_Grotesk` → `--font-space-grotesk`, `Geist_Mono` → `--font-geist-mono`, both via `next/font/google`, appended to `<html className>` alongside the existing `inter`/`roboto` variables (additive — the site's default fonts are unchanged). |
| Adopted surface | `app/documents/[id]/view/page.tsx` full-screen reading mode | `<div className="typeset typeset-docs max-w-[42em] mx-auto" style={{ '--typeset-size': ..., '--typeset-leading': ... }}><MarkdownRenderer variant="typeset" .../></div>` |
| Component support | `components/documents/MarkdownRenderer.tsx` | `buildMarkdownComponents(variant)` factory; `variant="typeset"` strips the hardcoded `p`/`table`/`th`/`td` Tailwind classes and wraps `code`'s Mermaid/syntax-highlighter paths in `not-typeset`. `variant="default"` (the default) is byte-for-byte the historical behavior. |

**Not yet adopted** (deliberately, per ADR-008): OpenUI chat's `ProseComponent.tsx`/`TwoColumnProseComponent.tsx`, Morphic chat (`components/morphic/markdown-message.tsx`, uses `Streamdown`), `MarkdownDocumentViewer.tsx` (entity-highlighting dialog, regex-based markdown-to-HTML, not `react-markdown`), `VersionViewerDialog.tsx`. Each still uses its own `prose`/`prose-*` classes untouched.

## Core mechanics

- **The container.** `<div className="typeset typeset-docs">...</div>` (or another preset instead of `typeset-docs`). The base `.typeset` class alone has no real font/size fallback (`--typeset-font-heading: var(--font-heading)` etc. are undefined in this project) — **always** pair it with a preset class, or define one.
- **Presets are CSS custom-property bundles**, not new selectors — `.typeset-docs { --typeset-font-body: ...; --typeset-size: ...; ... }`. Adding a preset never requires touching `typeset.css` itself.
- **Per-instance overrides** go on the wrapping element's inline `style`, not a new preset, when the override is data-driven (e.g. a user's font-size preference) rather than a fixed second surface — see the Document Viewer's `--typeset-size`/`--typeset-leading` inline overrides.
- **Escape hatches**: `.not-typeset` class or `data-not-typeset` attribute on any descendant (or its wrapper) opts it out of typeset's styling entirely. Use this for embedded non-prose components (syntax highlighters, diagrams, badges/pills) that already own their own styling — never let typeset's heading/paragraph/table rules apply to something that isn't actually flowing document prose.
- **Variable-name mismatch, by design, not a bug**: typeset.css reads Tailwind-v4-style bare color variables (`--color-foreground`, `--color-muted`, `--color-border`, `--color-primary`) with `currentColor`/`color-mix` fallbacks. This project is Tailwind v3 and defines HSL-triple variables under different names (`--foreground`, `--muted`, …, consumed via `hsl(var(--foreground))` in `tailwind.config.js`) — those don't bridge automatically, so typeset's color-dependent rules (muted text, table/rule borders, link focus ring) fall back to `currentColor`/`color-mix(in oklab, currentColor …)` rather than the project's actual theme palette. `--radius` is the one variable that *does* bridge, since this project already defines `--radius: 0.75rem` at `:root` under that exact name. If a future adopted surface needs typeset's muted/border colors to actually match the theme (not just inherit text color), that's a deliberate follow-up — define `--color-muted-foreground`/`--color-border`/etc. as aliases in `globals.css`, don't hand-edit `typeset.css`.

## Adding a new preset

1. Pick a name: `.typeset-<surface>` (e.g. `.typeset-chat`).
2. Add it to `app/globals.css`, immediately after the `@import "./typeset.css";` line, next to `.typeset-docs` — never inside `typeset.css` itself.
3. Only set the `--typeset-*` variables you need to differ from `.typeset` cascade defaults; anything unset falls through.
4. Do not touch an existing preset's values for an unrelated surface — presets are separate surfaces by design (per this skill's own governing instruction). If two surfaces would end up with identical values, that's a signal to reuse the existing preset, not proof you should merge them silently — confirm with whoever owns the other surface first.

## Adopting a new surface (checklist)

Mirrors `docs/superpowers/specs/2026-07-11-typeset-document-viewer-design.md`'s pattern:

1. **Read the spec workflow, don't skip contract-first.** Write/extend the design spec (`docs/superpowers/specs/<date>-typeset-<surface>-design.md`) describing which surface, why, and what existing typography (`prose`/`prose-*` classes, custom component overrides) it currently has.
2. **List what has to be removed or excluded.** If the surface has its own hardcoded classes/components (like `MarkdownRenderer`'s old `p`/`table`/`th`/`td` overrides), decide per-element: strip the class (let typeset style it), or mark it `not-typeset` (it's not real prose — a highlighter, a badge, a diagram).
3. **Write the Jest contract first (red).** Prefer testing the pure logic (a `buildMarkdownComponents`-style factory, or equivalent) over shallow-rendering a giant page component — see `__tests__/components/MarkdownRenderer.test.tsx`'s `buildMarkdownComponents` describe block for the pattern: one assertion set per variant, plus an explicit regression-guard describe block proving other, unmigrated consumers are untouched.
4. **Implement**, wrapping only the chosen surface: `<div className="typeset typeset-docs max-w-[42em]">{content}</div>` (adjust width/preset per surface).
5. **Run the contract test to green.** Then verify manually: headings, lists, tables, code inside the container render styled with no classes on the content itself; anything wrapped `not-typeset` is visually untouched by typeset.
6. **Update this skill's "Current state" table and "Not yet adopted" list.**

## Common pitfalls

- **Wrapping an editable surface.** `NovelEditor` (WYSIWYG, contenteditable-based) on the Document Viewer's non-full-screen tab must never get a `typeset` wrapper — an editor owns its own styling in sync with its editing model; typeset's margin/heading resets fighting that will produce inconsistent cursor/selection behavior, not just a visual issue.
- **Forgetting the preset.** `typeset` alone (no `typeset-docs` or equivalent) silently falls back to unstyled/inherited fonts for headings and code — always pair the two classes.
- **Double-styling a component that already renders its own markup.** `react-syntax-highlighter` and `MermaidDiagram` are not typeset's concern — mark their wrapper `not-typeset`, don't let typeset's `pre`/`code` rules try to restyle output that's already fully themed.
- **Assuming `--color-*`/`--radius` fallbacks match the theme.** They mostly don't (see "Variable-name mismatch" above) — check rendered output against the actual design system before assuming a color is "just working."
- **Tailwind v3 + Turbopack rejects `typeset.css`'s native `@layer components` wrapper.** shadcn's stock `typeset.css` wraps its rules in `@layer components { ... }`, written for Tailwind v4 (native CSS cascade layers). Under this project's Tailwind v3 + Turbopack (`next dev`'s default bundler in this Next.js 16 project), that fails at build time — `CssSyntaxError: @layer components is used but no matching @tailwind components directive is present` — because Turbopack runs Tailwind's PostCSS plugin against `typeset.css` as its own file, independent of whatever `@tailwind` directives exist in `globals.css`. This is why `app/typeset.css` has both `@layer components { ... }` wrappers stripped (contents unwrapped to plain top-level rules) rather than left verbatim — Tailwind v3's own generated output is unlayered plain CSS anyway, so this is a correct adaptation, not just a workaround. Relatedly: `@import "./typeset.css"` must be the literal first line of `globals.css`, not after the `@tailwind` directives as shadcn's v4-oriented docs show — see the Import row above.
