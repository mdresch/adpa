---
title: "Design Tokens & Theming"
labels: ["phase:1","week:1","area:design","type:task","priority:high"]
assignees: []
---

# Design Tokens & Theming

**Context**

Implement the project's design tokens and theming foundation so components and pages can consume consistent values (colors, spacing, typography, elevation, breakpoints).

## Goals

- Add a typesafe token file at `lib/theme/maturity-portal-theme.ts`.
- Provide helper accessors for maturity-level palettes and chart colors.
- Ensure tokens are exportable for CSS-in-JS and static CSS consumption.

## Acceptance Criteria

- `lib/theme/maturity-portal-theme.ts` exists and exports tokens and helper functions.
- Tokens include color palette, typography scale, spacing, radii, shadows, and z-index layers.
- Basic usage documented in `docs/design-tokens.md` (short README).

## Tasks

- [ ] Define color palette (primary deep navy + semantic accents).
- [ ] Define typography scale and web-safe fallback fonts.
- [ ] Add spacing and layout tokens.
- [ ] Add maturity-level palettes and safe accessor function.
- [ ] Write a short README with usage examples.

## Estimate

Owner role: Frontend Specialist
Estimate: 8 - 12 hours
