/**
 * Layout plan types for strict OpenUI Lang execution.
 * ADPA assigns components per text segment; the LLM fills props only.
 */

/** OpenUI Lang / GenUI component names used in plans */
export type PlanComponentName =
  | "Stack"
  | "Card"
  | "CardHeader"
  | "Accordion"
  | "AccordionItem"
  | "Table"
  | "Bullets"
  | "Timeline"
  | "Team"
  | "Comparison"
  | "TableOfContents"
  | "ReportCoverHero"
  | "TwoColumnProse"
  | "TextContent"
  | "Callout"
  | "Steps"
  | "Tabs"
  | "Tab"
  | "BarChart"
  | "LineChart"
  | "PieChart"

export type SegmentMapping = "widget" | "typography-fallback"

export type LayoutPlanNode = {
  id: string
  component: PlanComponentName
  mapping: SegmentMapping
  /** Verbatim (or section) source text this node must preserve in output */
  sourceText: string
  label?: string
  fallbackReason?: string
  /** Optional hints for the executor (table columns, accordion parent, etc.) */
  hints?: Record<string, string | string[]>
  children?: LayoutPlanNode[]
}

export type LayoutShellId =
  | "charter"
  | "status"
  | "risk"
  | "timeline"
  | "team"
  | "comparison"
  | "table"
  | "dashboard"
  | "generic"

export type LayoutPlan = {
  shell: LayoutShellId
  root: PlanComponentName
  intentPrimary: string
  confidence: number
  nodes: LayoutPlanNode[]
  /** All source characters that must appear in the final Lang output */
  sourceCoverage: { segmentCount: number; totalChars: number }
}

export type TextSegment = {
  id: string
  title?: string
  /** Markdown heading depth: # = 1, ## = 2, etc. */
  headingLevel?: 1 | 2 | 3 | 4
  body: string
  kind: "preamble" | "section" | "table-block" | "list-block"
}

export type BuildLayoutPlanInput = {
  prompt: string
  /** Document body, RAG blob, or combined text used for segmentation */
  sourceText?: string
  /** Stable id for cover image selection (same doc → same hero) */
  documentId?: string
  /**
   * Optional AI- or heuristic-generated cover teaser (short).
   * When set, doc-cover summary uses this instead of the full document summary lead.
   */
  coverSummary?: string
}
