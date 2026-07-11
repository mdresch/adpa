# typeset-document-viewer Design Spec

**Date**: 2026-07-11
**Status**: Draft
**Feature ID**: typeset-markdown-styling (frontend; not a `server/governed-features.manifest.json` packet — see [ADR-008](../../07-architecture/ADR-008-markdown-to-styling.md))

---

## Problem

ADPA renders markdown in at least nine distinct surfaces (`MarkdownRenderer`, `MarkdownDocumentViewer`, `VersionViewerDialog`, Morphic chat, OpenUI chat's `ProseComponent`/`TwoColumnProseComponent`, etc.), each with its own hand-tuned Tailwind Typography (`prose`) configuration — some inline (`prose prose-sm max-w-none`), some heavily overridden with dozens of `prose-*` modifier classes (`components/openui-chat/components/ProseComponent.tsx`). Every surface re-solves the same problem (headings, lists, tables, code blocks need consistent, readable styling) with its own bespoke class list, and there's no shared baseline — a heading looks different in the document viewer than it does in an OpenUI report.

[shadcn/typeset](https://ui.shadcn.com/docs/typeset) is a single stylesheet that styles rendered markdown by wrapping output in a `.typeset` container — everything inside (headings, lists, tables, code, blockquotes, math) is styled with zero classes needed on the content itself. This spec covers the **first application** of typeset: the Document Viewer's full-screen reading mode (`app/documents/[id]/view/page.tsx`), which is the most clearly "long-form document reading" surface in the app (as opposed to the same page's default mode, which embeds `NovelEditor`, an editable rich-text surface that typeset must not touch — editors need to own their own styling in sync with their editing model).

Applying typeset to any *other* surface (OpenUI chat's `ProseComponent`, Morphic chat, etc.) is explicitly out of scope for this packet — see [ADR-008](../../07-architecture/ADR-008-markdown-to-styling.md)'s "Consequences" for the rollout sequencing rationale.

## Success Criteria

- [ ] `app/typeset.css` is imported once, globally, after Tailwind's directives in `app/globals.css`; `.typeset-docs` is the one preset defined so far, using Space Grotesk (heading/body) and Geist Mono (code) — both loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables on `<html>`, additive to the existing Inter/Roboto variables (no existing font usage elsewhere in the app is affected).
- [ ] `MarkdownRenderer` (`components/documents/MarkdownRenderer.tsx`) — the component actually used by the Document Viewer's full-screen mode — gains an opt-in `variant="typeset"` prop. Existing consumers (`ProseComponent.tsx`, `TwoColumnProseComponent.tsx`, `DynamicComponentRenderer.tsx`, and the Document Viewer's own non-full-screen `NovelEditor` path, which doesn't use `MarkdownRenderer` at all) are unaffected: omitting `variant` (or passing `"default"`) must reproduce today's exact output.
- [ ] In `variant="typeset"`, `MarkdownRenderer`'s custom `p`/`table`/`th`/`td` overrides stop emitting their hardcoded Tailwind classes (`mb-4`, `border-gray-300`, `bg-gray-50`, …), which would otherwise visually fight typeset's own paragraph-flow and table styling. The `code`/`pre` path (syntax-highlighted code blocks and Mermaid diagrams) is left functionally identical but wrapped with `not-typeset` in typeset mode, since `SyntaxHighlighter` and `MermaidDiagram` already own their own rendering and aren't markdown prose typeset should restyle.
- [ ] The Document Viewer's full-screen reading container wraps `MarkdownRenderer` in `typeset typeset-docs max-w-[42em] mx-auto`, replacing the old `prose ${fontSize}-modifier ${lineHeight}-modifier` class string.
- [ ] The existing font-size (sm/base/lg/xl) and line-height (tight/normal/relaxed) reader controls keep working — they now set `--typeset-size`/`--typeset-leading` as inline CSS custom properties on the wrapper (overriding `.typeset-docs`'s defaults) instead of swapping Tailwind `prose-*` modifier classes, since typeset has no modifier-class equivalent.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-TYPESET-001 | `buildMarkdownComponents("typeset")`'s `table`/`th`/`td` renderers return bare `<table>`/`<th>`/`<td>` elements with no `className` — proving typeset's own table CSS is what styles them, not a leftover Tailwind class. | P0 |
| REQ-TYPESET-002 | `buildMarkdownComponents("default")`'s `table`/`th`/`td`/`p` renderers are byte-for-byte unchanged from today (`overflow-x-auto` wrapper, `border-gray-300`, `bg-gray-50`, `mb-4`) — the regression guard proving OpenUI chat's `ProseComponent`/`TwoColumnProseComponent` and `DynamicComponentRenderer` (all of which call `MarkdownRenderer` without a `variant`) are untouched by this change. | P0 |
| REQ-TYPESET-003 | `buildMarkdownComponents("typeset")`'s `p` renderer emits a plain `<p>` with no `className` for ordinary paragraphs (letting typeset's flow-margin rules apply), and still detects the `######## <entityType>: <json>` inline-entity marker exactly as today, wrapping the resulting `EntityPill` in `className="not-typeset"` so typeset's link/paragraph styling doesn't bleed into the pill. | P0 |
| REQ-TYPESET-004 | `buildMarkdownComponents("typeset")`'s `code` renderer wraps both the Mermaid-diagram path and the syntax-highlighted fenced-code path in a `not-typeset` container; the `default` variant's output for both paths is unchanged (no extra wrapper element). | P0 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `adpa-genui-workspace` / `adpa-openui-chat` — both render markdown through `MarkdownRenderer` via `ProseComponent.tsx`/`TwoColumnProseComponent.tsx`/`DynamicComponentRenderer.tsx` without ever passing `variant`. REQ-TYPESET-002 is the guard proving those surfaces' `prose prose-slate ...` styling (defined in those components, not in `MarkdownRenderer`) keeps working unchanged.
- The Document Viewer's non-full-screen editing path (`NovelEditor`) — untouched; it does not render through `MarkdownRenderer` and this change does not add typeset classes to it.

New interaction tests required when: a second surface adopts `variant="typeset"` — at that point, add a case proving the two surfaces' `--typeset-*` custom-property overrides (if any) don't leak into each other (they're scoped per-element via inline `style`, but this should be asserted once a second consumer exists, not assumed).

## Verification

- Contract guard (frontend Jest, `__tests__/components/MarkdownRenderer.test.tsx`): see REQ-TYPESET-001–004 above.
- Manual: open a governed document's `/documents/{id}/view` page, enter full-screen reading mode, confirm headings/lists/tables/code render styled with the Space Grotesk / Geist Mono fonts and no visual regression versus the previous `prose` rendering; confirm the font-size and line-height controls still visibly change the reading surface; confirm the non-full-screen `NovelEditor` tab is visually unaffected.
