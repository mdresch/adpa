/**
 * GenUI workspace prompts — full-document render, optional dark variant, and focused widgets.
 * Used by conversation starters and the "Render document" CTA. Layout behavior is driven by
 * `buildLayoutPlan()` in `lib/openui/layoutPlan.ts` from the user's message text (not doc id).
 */

/** One-click full report: layout planner + light OpenUI theme (no forced dark mode). */
export const GENUI_RENDER_FULL_DOCUMENT_PROMPT =
  "Render the full document: cover page, table of contents, then one Card per numbered chapter (### subsections nested inside each chapter Card). Use Bullets for lists; Team only for named rosters; Table for registers and matrices. root = Stack with intro Card + section Cards (no Report component). Professional light presentation-ready layout."

/** Optional starter — user must choose dark theme explicitly. */
export const GENUI_RENDER_FULL_DOCUMENT_DARK_PROMPT =
  "Render the full document with dark report theme: black background, gray sunk cards — cover page, table of contents, then one Card per numbered chapter (### subsections inside chapters). Use Bullets for lists; Team only for named rosters."

/** Focused: single Timeline from a schedule-style section (no cover / TOC). */
export const GENUI_TIMELINE_FROM_SCHEDULE_PROMPT =
  "Generate a timeline from the Schedule Management Plan section. No cover, no table of contents."

/** Focused: schedule register table (planner treats as table shell; not a bar-chart Gantt). */
export const GENUI_GANTT_REGISTER_PROMPT =
  "Render a Gantt chart from the Schedule Management Plan showing activities, start dates, finish dates, and dependencies. No cover, no table of contents."

/** Focused: kanban-style columns via Table until a Kanban Lang component exists. */
export const GENUI_KANBAN_STYLE_PROMPT =
  "From the Schedule Management Plan, show work packages on a kanban-style board (Upcoming / In progress / Completed). No cover, no table of contents."
