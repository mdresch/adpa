/**
 * Text → UI layout planner: segment source text, assign components, typography fallback.
 * Produces a strict LayoutPlan for the executor LLM (no free-form component choice).
 */

import {
  selectComponentType,
  type ComponentType,
} from "@/lib/openui/componentSelector"
import type {
  BuildLayoutPlanInput,
  LayoutPlan,
  LayoutPlanNode,
  LayoutShellId,
  PlanComponentName,
  SegmentMapping,
  TextSegment,
} from "@/lib/openui/layoutPlanTypes"
import { compactLayoutPlanForExecutor } from "@/lib/llm/genuiPromptBudget"
import {
  bulletsCallHasCompleteItems,
  findMatchingParen,
  replaceLangNodeAssignment,
  sanitizeOpenUILang,
  tableOfContentsCallHasEntries,
} from "@/lib/openui/sanitizeOpenUILang"
import {
  buildCoverBlurbFromSources,
  COVER_SUMMARY_MAX_CHARS,
} from "@/lib/openui/coverSummary"
import {
  coerceReportCoverImageUrl,
  pickReportCoverImage,
  pickReportSectionImage,
  pickReportThumbImage,
  type ReportCoverPick,
} from "@/lib/openui/reportCoverImages"
import {
  isBoldKeyValueOverviewBody,
  splitProjectOverviewContent,
} from "@/lib/openui/projectOverviewLayout"

export type { BuildLayoutPlanInput, LayoutPlan, LayoutPlanNode, TextSegment } from "@/lib/openui/layoutPlanTypes"

const MIN_SEGMENT_CHARS = 12

/**
 * When false, layout plans only place ReportCoverHero on doc-cover (catalog P0 focus).
 * Section banners and thumb pairs are omitted — see docs/implementation/GENUI_COMPONENT_CATALOG_AUDIT.md.
 */
export const GENUI_BODY_REPORT_IMAGES_ENABLED = false

/** Map legacy selector types to GenUI / ADPA Lang names */
export function toGenUIComponentName(type: ComponentType): PlanComponentName {
  switch (type) {
    case "Table":
      return "Table"
    case "Timeline":
      return "Timeline"
    case "Team":
      return "Team"
    case "Comparison":
      return "Comparison"
    case "Bullets":
      return "Bullets"
    case "Accordion":
      return "Accordion"
    case "Card":
      return "Card"
    case "Alert":
      return "Callout"
    case "Steps":
      return "Steps"
    case "Tabs":
      return "Tabs"
    case "Chart":
      return "BarChart"
    case "Text":
      return "TextContent"
    default:
      return "TextContent"
  }
}

/** Whether to call the cover-summary API before layout planning (full report renders). */
export function wantsAiCoverSummary(prompt: string): boolean {
  if (
    process.env.GENUI_AI_COVER_SUMMARY === "false" ||
    process.env.NEXT_PUBLIC_GENUI_AI_COVER_SUMMARY === "false"
  ) {
    return false
  }
  return wantsGenuiFullDocumentLayout(prompt)
}

/** Full governance report (cover + TOC + chapter cards), not a single-table answer. */
export function wantsGenuiFullDocumentLayout(prompt: string): boolean {
  const p = prompt.toLowerCase()
  if (/\b(render\s+(?:the\s+)?full\s+document|full\s+document|required\s+layout\s+plan)\b/.test(p)) {
    return true
  }
  if (/\b(one\s+card\s+per\s+chapter|chapter\s+cards?|numbered\s+chapters?)\b/.test(p)) {
    return true
  }
  if (
    /\b(cover\s+page|table\s+of\s+contents)\b/.test(p) &&
    /\b(chapter|layout|structure|report|pdf)\b/.test(p)
  ) {
    return true
  }
  return false
}

/**
 * Section-scoped or single-widget render (timeline only, one paragraph, etc.).
 * Suppresses cover page and table of contents even when source text is a full governance doc.
 */
export function wantsGenuiFocusedDetailRender(prompt: string): boolean {
  if (wantsGenuiFullDocumentLayout(prompt)) return false
  const p = prompt.trim()
  if (!p) return false

  if (
    /\b(no|without|skip|omit|exclude)\s+(a\s+)?(cover(\s+page)?|table\s+of\s+contents|toc)\b/i.test(
      p
    )
  ) {
    return true
  }

  const explicitPartial = [
    /\b(only|just)\s+(the\s+)?(paragraph|timeline|table|section|schedule|milestone)/i,
    /\brender\s+(only\s+)?(a|an|the)\s+(timeline|table|paragraph|gantt)\b/i,
    /\b(timeline|paragraph|table)\s+from\b/i,
    /\bfrom\s+the\s+.+\s+section\s+only\b/i,
    /\bsingle\s+(detail|component|widget|paragraph)\b/i,
    /\b(one|a)\s+(paragraph|timeline|table)\s+only\b/i,
    /\b(single|one)\s+paragraph\b/i,
    /\b(gantt\s+chart|kanban(?:-style)?\s+board)\b/i,
    /\b(generate|render|show|create|build)\s+(a\s+)?(gantt|kanban|timeline)\b/i,
  ]
  if (explicitPartial.some((re) => re.test(p))) return true

  if (
    /\b(timeline|roadmap|milestone|schedule)\b/i.test(p) &&
    /\bfrom\b/i.test(p) &&
    !/\b(full|entire|whole)\s+document\b/i.test(p)
  ) {
    return true
  }

  /** Follow-up on a prior assistant report: "from this report, show a gantt chart" */
  if (
    /\b(from|based\s+on|using)\s+(this\s+)?(report|answer|response|visualization)\b/i.test(p) &&
    /\b(gantt|kanban|timeline|chart|table|milestone|schedule|activities?|dependencies)\b/i.test(p) &&
    !/\b(full|entire|whole)\s+document\b/i.test(p) &&
    !/\b(all\s+chapters?|complete\s+report|cover\s+page)\b/i.test(p)
  ) {
    return true
  }

  if (/\b(gantt|kanban)\b/i.test(p) && !/\b(full|entire|whole)\s+document\b/i.test(p)) {
    return true
  }

  return false
}

function normalizeSectionNeedle(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

/** When focused, narrow segmentation to the section the user named (e.g. schedule management plan). */
function filterSegmentsForFocusedPrompt(
  sectionSegments: TextSegment[],
  prompt: string
): TextSegment[] {
  const quoted = prompt.match(/\bfrom\s+(?:the\s+)?["']([^"']+)["']/i)
  const sectionMatch = prompt.match(
    /\bfrom\s+(?:the\s+)?(.+?)\s+(?:section|part|chapter)\b/i
  )
  const needleRaw =
    quoted?.[1]?.trim() ||
    sectionMatch?.[1]?.trim() ||
    (/\bschedule\s+management\s+plan\b/i.test(prompt) ? "schedule management plan" : undefined) ||
    (/\bgantt\b/i.test(prompt) ? "schedule development" : undefined) ||
    (/\bmilestone\s+schedule\b/i.test(prompt) ? "milestone schedule" : undefined)
  if (!needleRaw) return sectionSegments

  const needle = normalizeSectionNeedle(needleRaw)
  const byTitle = sectionSegments.filter((s) => {
    const title = s.title ? normalizeSectionNeedle(s.title) : ""
    return title.includes(needle) || needle.includes(title)
  })
  if (byTitle.length > 0) return byTitle
  return sectionSegments
}

function resolveShellId(prompt: string, primary: ComponentType): LayoutShellId {
  const p = prompt.toLowerCase()
  if (wantsGenuiFullDocumentLayout(prompt)) return "charter"
  if (
    wantsGenuiFocusedDetailRender(prompt) &&
    (/\bgantt\b/i.test(p) ||
      (/\b(activities?|start|finish|dependencies)\b/i.test(p) && /\b(date|schedule)\b/i.test(p)))
  ) {
    return "table"
  }
  if (p.includes("charter") || p.includes("initiation")) return "charter"
  if (p.includes("status") || p.includes("leadership") || p.includes("progress report")) {
    return "status"
  }
  if (p.includes("risk") || p.includes("raid")) return "risk"
  if (p.includes("timeline") || p.includes("roadmap") || p.includes("milestone")) {
    return "timeline"
  }
  if (p.includes("stakeholder") && (p.includes("team") || p.includes("roster"))) {
    return "team"
  }
  if (p.includes("compare") || p.includes("in-scope") || p.includes("out-of-scope")) {
    return "comparison"
  }
  if (p.includes("table") || p.includes("matrix") || p.includes("register")) return "table"
  if (p.includes("dashboard") || p.includes("overview")) return "dashboard"
  if (primary === "Table") return "table"
  if (primary === "Timeline") return "timeline"
  if (primary === "Accordion") return "charter"
  return "generic"
}

function isMarkdownTableBlock(text: string): boolean {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length < 2) return false
  const pipeRows = lines.filter((l) => /^\|.+\|/.test(l.trim()))
  if (pipeRows.length >= 2) {
    const sepIndex = pipeRows.findIndex((l) => /^\|[\s:|-]+\|/.test(l.trim()))
    if (sepIndex >= 0) {
      return pipeRows.slice(sepIndex + 1).some((row) => pipeRowHasContentCells(row))
    }
    return pipeRows.length >= 3 && pipeRows.slice(1).some((row) => pipeRowHasContentCells(row))
  }
  return false
}

function pipeRowHasContentCells(row: string): boolean {
  if (/^\|[\s:|-]+\|/.test(row.trim())) return false
  const cells = row.split("|").slice(1, -1)
  return cells.some((cell) => cell.trim().length > 0)
}

function isEmptyMarkdownTablePlaceholder(text: string): boolean {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  const pipeRows = lines.filter((l) => /^\|.+\|/.test(l.trim()))
  if (pipeRows.length < 2) return false
  const sepIndex = pipeRows.findIndex((l) => /^\|[\s:|-]+\|/.test(l.trim()))
  if (sepIndex < 0) return false
  return !pipeRows.slice(sepIndex + 1).some((row) => pipeRowHasContentCells(row))
}

function isBulletListBlock(text: string): boolean {
  const lines = text.trim().split("\n").filter(Boolean)
  if (lines.length === 0) return false
  const bulletLines = lines.filter((l) => /^\s*([-*•]|\d+\.)\s+\S/.test(l))
  return bulletLines.length >= 2 && bulletLines.length >= lines.length * 0.45
}

function promptRequestsAccordion(prompt: string): boolean {
  return /\b(accordion|expandable|collapse|collapsible|faq|toggle\s+sections)\b/i.test(
    prompt
  )
}

/** Accordion only when the user asked for collapsible sections and Bullets is not the better fit. */
function shouldUseAccordionForSection(seg: TextSegment, prompt: string): boolean {
  if (!promptRequestsAccordion(prompt)) return false
  if (isBulletListBlock(seg.body)) return false
  return true
}

function isTimelineBlock(text: string): boolean {
  if (isMarkdownTableBlock(text)) {
    const hay = text.toLowerCase()
    return /\b(milestone|target date|target\s+date|dependencies|status)\b/.test(hay)
  }
  const lines = text.trim().split("\n").filter(Boolean)
  const milestoneLines = lines.filter((l) =>
    /^\s*(\d{4}-\d{2}-\d{2}|phase\s+\d|milestone\s*:)/i.test(l.trim())
  )
  return milestoneLines.length >= 3
}

/** User asked for a dark report shell (host CSS — not OpenUI Lang props). */
export function wantsGenuiReportDarkTheme(prompt: string): boolean {
  return /\b(black\s+background|charcoal|dark\s+background|dark\s+report|dark\s+theme|gray\s+sunk|grey\s+sunk|shades?\s+of\s+(?:gray|grey))\b/i.test(
    prompt
  )
}

function isTeamRosterBlock(text: string): boolean {
  const lines = text.trim().split("\n").filter(Boolean)
  if (lines.length > 20) return false

  const roleLinePattern =
    /\b(pm|sponsor|project\s+manager|product\s+owner|accountable|director)\b|\b(?:role|responsible|owner)\s*:/i
  const roleLines = lines.filter((l) => roleLinePattern.test(l))

  const namedPersonRows = lines.filter((l) =>
    /^[A-Z][\w'.-]+(\s+[A-Z][\w'.-]+)+\s*[-–—,(]/.test(l.trim())
  )

  return roleLines.length >= 2 || namedPersonRows.length >= 3
}

function isComparisonBlock(text: string, title?: string): boolean {
  const hay = `${title ?? ""}\n${text}`.toLowerCase()
  const hasIn = /\bin[- ]?scope\b/.test(hay)
  const hasOut = /\bout[- ]?of[- ]?scope\b/.test(hay)
  if (hasIn && hasOut) return true
  return (
    /\b(versus|vs\.|option\s+a|option\s+b)\b/.test(hay) ||
    (/\b(pros|cons|advantages|disadvantages)\b/.test(hay) && !isBulletListBlock(text))
  )
}

/** Numbered outline (1. Purpose:, 2. …) — not a data table. */
function isNumberedSectionOutlineList(text: string): boolean {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length < 2) return false
  if (isMarkdownTableBlock(text)) return false
  const numbered = lines.filter((l) => /^\s*\d+\.\s+/.test(l))
  if (numbered.length < 2) return false
  const bulletSub = lines.filter((l) => /^\s*[•\-*]\s+/.test(l))
  if (numbered.length >= 2 && (bulletSub.length >= 2 || numbered.length >= lines.length * 0.35)) {
    return true
  }
  return numbered.length >= lines.length * 0.5
}

function isStructuredTabularLines(text: string): boolean {
  if (isNumberedSectionOutlineList(text)) return false
  if (isBoldKeyValueOverviewBody(text)) return false
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length < 3) return false
  const colonRows = lines.filter((l) => /^[^|]+\|[^|]+/.test(l) || /^[^:]+:\s*\S/.test(l))
  return colonRows.length >= lines.length * 0.5
}

function isOverviewMetadataTableMarkdown(text: string): boolean {
  return /^\|\s*Attribute\s*\|\s*Value\s*\|/im.test(text.trim())
}

const TWO_COLUMN_MIN_CHARS = 360

function shouldUseTwoColumnProse(body: string): boolean {
  const trimmed = stripProseDividers(body)
  if (!trimmed) return false
  if (isMarkdownTableBlock(trimmed) || isBulletListBlock(trimmed)) return false
  if (isNumberedSectionOutlineList(trimmed)) return false
  const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.trim())
  if (paragraphs.length === 2) {
    const [a, b] = paragraphs
    if (a.length >= 80 && b.length >= 80 && trimmed.length >= 200) return true
  }
  if (paragraphs.length >= 2 && trimmed.length >= 280) return true
  return trimmed.length >= TWO_COLUMN_MIN_CHARS
}

const SENTENCE_BOUNDARY_RE = /[.!?](?:["')\]]{0,3})?(?:\s+|\n+)/g

const ABBREV_BEFORE_PERIOD_RE =
  /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|Inc|Ltd|vs|eg|ie|Fig|Vol|Ed|Sec|Ch|St|Dept|Corp|Co|Approx|Est|Avg|Min|Max)\.$/i

/** Period is part of a decimal or section number (e.g. 3.1), not end of sentence. */
function isDecimalOrOutlinePeriod(text: string, periodIndex: number): boolean {
  const before = text[periodIndex - 1] ?? ""
  const after = text[periodIndex + 1] ?? ""
  if (/\d/.test(before) && /\d/.test(after)) return true
  return false
}

/** Common abbreviations and citations — do not treat as sentence end. */
function isAbbreviationPeriod(text: string, periodIndex: number): boolean {
  if (isDecimalOrOutlinePeriod(text, periodIndex)) return true
  const ctx = text.slice(Math.max(0, periodIndex - 20), periodIndex + 1)
  return ABBREV_BEFORE_PERIOD_RE.test(ctx)
}

/**
 * Index after punctuation where the right column should start (whitespace trimmed).
 * Returns null when no suitable sentence boundary exists in range.
 */
export function findSentenceBoundarySplitIndex(
  text: string,
  targetRatio = 0.5,
  minColumnChars = 40
): number | null {
  const len = text.length
  if (len < minColumnChars * 2) return null

  const target = Math.floor(len * targetRatio)
  const minIdx = Math.max(minColumnChars, Math.floor(len * 0.22))
  const maxIdx = Math.min(len - minColumnChars, Math.floor(len * 0.78))

  const candidates: number[] = []
  let match: RegExpExecArray | null
  SENTENCE_BOUNDARY_RE.lastIndex = 0
  while ((match = SENTENCE_BOUNDARY_RE.exec(text)) !== null) {
    const periodIndex = match.index
    if (isAbbreviationPeriod(text, periodIndex)) continue
    const endIdx = periodIndex + match[0].length
    if (endIdx < minIdx || endIdx > maxIdx) continue
    candidates.push(endIdx)
  }

  if (candidates.length === 0) return null

  let best = candidates[0]
  let bestDist = Math.abs(best - target)
  for (const idx of candidates) {
    const dist = Math.abs(idx - target)
    if (dist < bestDist) {
      bestDist = dist
      best = idx
    }
  }

  const leftLen = best
  const rightLen = len - best
  if (leftLen < minColumnChars || rightLen < minColumnChars) return null
  return best
}

/** Remove horizontal rules and other non-prose dividers before column split. */
export function stripProseDividers(body: string): string {
  return body
    .replace(/^---+$/gm, "")
    .replace(/^\s*[*_]{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

type SectionContentBlock = { kind: "prose" | "table" | "list"; text: string }

function pushProseAndListBlocks(chunk: string, blocks: SectionContentBlock[]): void {
  const subChunks = chunk
    .split(/\n(?=\*\*[^*\n]+\*\*:?\s*(?:\n|$))/)
    .map((c) => c.trim())
    .filter(Boolean)

  for (const sub of subChunks.length > 0 ? subChunks : [chunk]) {
    const lines = sub.split("\n")
    const listStart = lines.findIndex((l) => /^\s*([-*•]|\d+\.)\s+\S/.test(l))
    const bulletCount = lines.filter((l) => /^\s*([-*•]|\d+\.)\s+\S/.test(l)).length

    if (listStart >= 0 && bulletCount >= 2) {
      const before = lines.slice(0, listStart).join("\n").trim()
      if (before) blocks.push({ kind: "prose", text: before })

      const list = lines.slice(listStart).join("\n").trim()
      blocks.push({ kind: isBulletListBlock(list) ? "list" : "prose", text: list })
      continue
    }

    blocks.push({ kind: isBulletListBlock(sub) ? "list" : "prose", text: sub })
  }
}

/** Split subsection body into prose blocks and markdown tables (keeps intro + table + tail prose). */
export function splitBodyIntoContentBlocks(body: string): SectionContentBlock[] {
  const text = body.trim()
  if (!text) return []

  const lines = text.split("\n")
  const blocks: SectionContentBlock[] = []
  let proseBuf: string[] = []
  let tableBuf: string[] = []
  let inTable = false

  const flushProse = () => {
    const chunk = proseBuf.join("\n").trim()
    proseBuf = []
    if (!chunk) return
    pushProseAndListBlocks(chunk, blocks)
  }

  const flushTable = () => {
    const chunk = tableBuf.join("\n").trim()
    tableBuf = []
    inTable = false
    if (chunk && isMarkdownTableBlock(chunk)) {
      blocks.push({ kind: "table", text: chunk })
    } else if (chunk && isEmptyMarkdownTablePlaceholder(chunk)) {
      return
    } else if (chunk) {
      proseBuf.push(chunk)
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim()
    const isPipeRow = /^\|.+\|/.test(trimmedLine)
    const isTableSep = /^\|[\s:|-]+\|/.test(trimmedLine)
    if (isPipeRow) {
      if (!inTable) {
        flushProse()
        inTable = true
      }
      tableBuf.push(line)
      continue
    }
    if (inTable && isTableSep) {
      tableBuf.push(line)
      continue
    }
    if (inTable) flushTable()
    proseBuf.push(line)
  }
  if (inTable) flushTable()
  else flushProse()

  if (blocks.length === 0) {
    if (isEmptyMarkdownTablePlaceholder(text)) return []
    return [{ kind: "prose", text }]
  }
  return blocks
}

/** Split long prose for side-by-side TextContent columns (paragraph, then sentence boundaries). */
export function splitProseIntoTwoColumns(body: string): [string, string] {
  const trimmed = stripProseDividers(body)
  if (!trimmed) return ["", ""]

  const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.trim())
  if (paragraphs.length >= 2) {
    const mid = Math.ceil(paragraphs.length / 2)
    const col1 = paragraphs.slice(0, mid).join("\n\n").trim()
    const col2 = paragraphs.slice(mid).join("\n\n").trim()
    if (col1.length >= 60 && col2.length >= 60) return [col1, col2]
  }

  if (paragraphs.length === 1 && trimmed.includes("\n")) {
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length >= 2) {
      const mid = Math.ceil(lines.length / 2)
      const col1 = lines.slice(0, mid).join("\n").trim()
      const col2 = lines.slice(mid).join("\n").trim()
      if (col1.length >= 60 && col2.length >= 60) return [col1, col2]
    }
  }

  const sentenceIdx = findSentenceBoundarySplitIndex(trimmed, 0.5, 40)
  if (sentenceIdx !== null) {
    const left = trimmed.slice(0, sentenceIdx).trim()
    const right = trimmed.slice(sentenceIdx).trim()
    if (left.length >= 40 && right.length >= 40) return [left, right]
  }

  const mid = Math.floor(trimmed.length / 2)
  const space = trimmed.lastIndexOf(" ", mid)
  const at = space > mid - 120 ? space : mid
  return [trimmed.slice(0, at).trim(), trimmed.slice(at).trim()]
}

function classifySegmentBody(
  body: string,
  title?: string
): { component: PlanComponentName; mapping: SegmentMapping; fallbackReason?: string; hints?: LayoutPlanNode["hints"] } {
  const trimmed = body.trim()
  if (!trimmed) {
    return {
      component: "TextContent",
      mapping: "typography-fallback",
      fallbackReason: "empty segment",
    }
  }

  if (isNumberedSectionOutlineList(trimmed)) {
    return {
      component: "Bullets",
      mapping: "widget",
      hints: { note: "numbered outline or mixed numbered + bullet lines from source" },
    }
  }

  if (isMarkdownTableBlock(trimmed) || isStructuredTabularLines(trimmed)) {
    const pipeRows = trimmed.split("\n").filter((l) => /^\|/.test(l.trim())).length
    const pipeHeader = trimmed.split("\n").find((l) => /^\|/.test(l.trim())) ?? ""
    const pipeCols = pipeHeader.split("|").filter((c) => c.trim().length > 0).length
    const overviewMeta = isOverviewMetadataTableMarkdown(trimmed)
    const wbsLike =
      /\bwbs\s+dictionary\b/i.test(`${title ?? ""}\n${trimmed}`) ||
      (/\blevel\s*1\b/i.test(trimmed) && /\blevel\s*2\b/i.test(trimmed))
    const attributeLike =
      /\bactivity\s+attributes\b/i.test(`${title ?? ""}\n${trimmed}`) ||
      (pipeCols >= 6 && /constraints|deliverable|activity\s+name/i.test(pipeHeader))
    return {
      component: "Table",
      mapping: "widget",
      hints: {
        note: wbsLike
          ? "WBS Dictionary — preserve all hierarchy columns and rows from source (Level 1–4); use Table widget"
          : overviewMeta
            ? "Project overview metadata only (short Attribute|Value rows) — do not add Purpose/Business Value rows; narrative is a separate node"
            : attributeLike
              ? "Activity attributes — preserve every row and full cell text from source; do not truncate cells"
              : "derive columns and rows from source",
        ...(wbsLike ? { wbsDictionary: "true" } : {}),
        ...(attributeLike ? { attributeTable: "true" } : {}),
        ...(overviewMeta ? { overviewMetadataTable: "true" } : {}),
        ...(pipeRows >= 8 ? { wideTable: "true", rowCount: String(pipeRows) } : {}),
      },
    }
  }
  if (isTimelineBlock(trimmed)) {
    return { component: "Timeline", mapping: "widget", hints: { note: "milestones from dated lines" } }
  }
  if (isTeamRosterBlock(trimmed)) {
    return { component: "Team", mapping: "widget" }
  }
  if (isComparisonBlock(trimmed, title)) {
    return { component: "Comparison", mapping: "widget" }
  }
  if (isBulletListBlock(trimmed)) {
    return { component: "Bullets", mapping: "widget" }
  }

  const lineCount = trimmed.split("\n").filter(Boolean).length
  if (lineCount === 1 && trimmed.length <= 320) {
    return {
      component: "TextContent",
      mapping: "typography-fallback",
      fallbackReason: "short unstructured paragraph",
      hints: { variant: "default" },
    }
  }

  if (lineCount >= 2 && trimmed.length < 4000 && isBulletListBlock(trimmed)) {
    return {
      component: "Bullets",
      mapping: "widget",
      hints: { note: "list items from source bullets or lines" },
    }
  }

  return {
    component: "TextContent",
    mapping: "typography-fallback",
    fallbackReason: "long unstructured narrative",
    hints: {
      variant: "default",
      ...(shouldUseTwoColumnProse(trimmed) ? { twoColumn: "true" } : {}),
    },
  }
}

function normalizeTitle(title: string): string {
  return title
    .replace(/^#{1,4}\s+/, "")
    .replace(/\*\*/g, "")
    .trim()
}

function isHeadingOnlySegment(seg: TextSegment): boolean {
  const title = normalizeTitle(seg.title ?? "")
  const body = seg.body.trim()
  if (!body) return true
  if (isEmptyMarkdownTablePlaceholder(body)) return true
  if (body === title) return true
  if (normalizeTitle(body) === title) return true
  if (body.length < 60 && !body.includes("\n\n") && !isMarkdownTableBlock(body)) {
    const firstLine = body.split("\n")[0]?.trim() ?? ""
    if (firstLine === title || firstLine.replace(/^#{1,4}\s+/, "").trim() === title) {
      return true
    }
  }
  return false
}

/** Document metadata lines (Project:/Date:/Version:) — not chapter boundaries. */
function isReportMetadataHeading(seg: TextSegment): boolean {
  const level = seg.headingLevel ?? 2
  const title = normalizeTitle(seg.title ?? "")
  if (level !== 2) return false
  if (/^\d+\.\s/.test(title)) return false
  return /^(Project|Date|Version|Author|Document|Prepared\s+by|Status):/i.test(title)
}

/** Major report chapter (H1 or numbered ## like "1. Introduction") — not metadata or ###. */
function isChapterBoundary(seg: TextSegment): boolean {
  const level = seg.headingLevel ?? 2
  const title = seg.title ?? ""
  if (isReportMetadataHeading(seg)) return false
  if (level === 1) return true
  if (level === 2) {
    if (/^\d+\.\d+/.test(title)) return false
    if (/^\d+\.\s/.test(title)) return true
    return false
  }
  return false
}

/** Subsection (### or numbered 1.1) nests inside a chapter Card. */
function isSubsectionBoundary(seg: TextSegment): boolean {
  const level = seg.headingLevel ?? 2
  const title = seg.title ?? ""
  if (level >= 3) return true
  if (/^\d+\.\d+/.test(title)) return true
  return false
}

function isDocumentTitleSegment(seg: TextSegment, sectionSegments: TextSegment[]): boolean {
  if (seg.headingLevel !== 1) return false
  const numberedChapters = sectionSegments.filter(
    (s) => s.headingLevel === 2 && /^\d+\.\s/.test(s.title ?? "")
  )
  return numberedChapters.length >= 2
}

type ReportChapter = {
  id: string
  title: string
  leadSegment?: TextSegment
  subsections: TextSegment[]
}

function formatReportMetadataBlurb(metadata: TextSegment[]): string {
  const parts: string[] = []
  for (const seg of metadata) {
    const title = normalizeTitle(seg.title ?? "")
    if (!title) continue
    const body = seg.body.trim()
    if (!body || isHeadingOnlySegment(seg)) {
      parts.push(title)
      continue
    }
    const oneLine = body.replace(/\s+/g, " ").trim()
    if (oneLine.length <= 140) {
      parts.push(`${title} — ${oneLine}`)
    } else {
      parts.push(title)
    }
  }
  return parts.join("\n").slice(0, COVER_SUMMARY_MAX_CHARS)
}

function groupSegmentsIntoChapters(sectionSegments: TextSegment[]): ReportChapter[] {
  const contentSegments = sectionSegments.filter((s) => !isDocumentTitleSegment(s, sectionSegments))
  const bodySegments = contentSegments.filter((s) => !isReportMetadataHeading(s))
  const chapters: ReportChapter[] = []
  let current: ReportChapter | null = null

  for (const seg of bodySegments) {
    if (isChapterBoundary(seg) && !isSubsectionBoundary(seg)) {
      if (current) chapters.push(current)
      current = {
        id: seg.id.replace(/^section-/, "chapter-"),
        title: normalizeTitle(seg.title ?? seg.id),
        leadSegment: isHeadingOnlySegment(seg) ? undefined : seg,
        subsections: [],
      }
      continue
    }

    if (!current) {
      current = {
        id: `chapter-${slugId(seg.title ?? seg.id)}`,
        title: normalizeTitle(seg.title ?? "Content"),
        subsections: [],
      }
    }

    if (isHeadingOnlySegment(seg)) continue
    current.subsections.push(seg)
  }

  if (current) chapters.push(current)
  return chapters
}

/** Split markdown-ish source into segments (headings, tables, lists). */
export function segmentSourceText(sourceText: string): TextSegment[] {
  const text = sourceText.replace(/\r\n/g, "\n").trim()
  if (!text) return []

  const segments: TextSegment[] = []
  const headingRe = /^(#{1,4})\s+(.+)$/gm
  const matches = [...text.matchAll(headingRe)]

  if (matches.length === 0) {
    if (isMarkdownTableBlock(text)) {
      segments.push({ id: "block-table-0", body: text, kind: "table-block" })
    } else if (isBulletListBlock(text)) {
      segments.push({ id: "block-list-0", body: text, kind: "list-block" })
    } else {
      segments.push({ id: "block-0", body: text, kind: "preamble" })
    }
    return segments
  }

  const firstIndex = matches[0].index ?? 0
  if (firstIndex > 0) {
    const preamble = text.slice(0, firstIndex).trim()
    if (preamble.length >= MIN_SEGMENT_CHARS) {
      segments.push({ id: "preamble", body: preamble, kind: "preamble" })
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const start = m.index ?? 0
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length
    const chunk = text.slice(start, end).trim()
    const title = m[2].trim()
    const level = Math.min(4, m[1].length) as 1 | 2 | 3 | 4
    const body = chunk.replace(/^#{1,4}\s+.+$/m, "").trim() || title
    const id = `section-${slugId(title)}-${i}`
    segments.push({
      id,
      title,
      headingLevel: level,
      body: body.length >= MIN_SEGMENT_CHARS ? body : chunk,
      kind: "section",
    })
  }

  return segments
}

function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "untitled"
}

function buildLeafNodeFromBody(
  seg: TextSegment,
  body: string,
  idSuffix = "",
  gapImages?: SectionImagePlanContext
): LayoutPlanNode {
  const overviewBlocks = splitProjectOverviewContent(body, seg.title)
  const hasOverviewNarrative =
    overviewBlocks?.some((b) => b.kind === "prose" && b.text.trim().length > 0) ?? false
  if (overviewBlocks && hasOverviewNarrative) {
    const subSeg: TextSegment = { ...seg, body }
    const asSectionBlocks: SectionContentBlock[] = overviewBlocks.map((b) => ({
      kind: b.kind,
      text: b.text,
    }))
    return buildCompositeSegmentNode(subSeg, asSectionBlocks, gapImages)
  }

  const subSeg: TextSegment = { ...seg, id: `${seg.id}${idSuffix}`, body }
  const classified = classifySegmentBody(body, seg.title)
  if (
    classified.component === "TextContent" &&
    classified.mapping === "typography-fallback" &&
    shouldUseTwoColumnProse(body)
  ) {
    return buildTwoColumnTextNode(subSeg, gapImages)
  }
  return {
    id: subSeg.id,
    component: classified.component,
    mapping: classified.mapping,
    sourceText: body,
    label: seg.title,
    fallbackReason: classified.fallbackReason,
    hints: classified.hints,
  }
}

function buildThumbImageNode(
  nodeId: string,
  ctx: SectionImagePlanContext,
  seedSuffix: string,
  sectionTitle: string,
  slot: 0 | 1
): LayoutPlanNode {
  const image = pickReportThumbImage({
    seed: `${ctx.documentId ?? "doc"}::${seedSuffix}::${slot}`,
    sectionTitle,
    prompt: ctx.prompt,
    documentTitle: ctx.documentTitle,
    slot,
  })
  return {
    id: nodeId,
    component: "ReportCoverHero",
    mapping: "widget",
    sourceText: image.alt,
    label: sectionTitle,
    hints: {
      imageUrl: image.url,
      alt: image.alt,
      variant: "thumb",
      note: "small inline thumbnail — copy imageUrl and variant=thumb exactly",
    },
  }
}

/** Two small images in a row (under split prose or for visual gap tests). */
function buildThumbPairRowNode(
  nodeId: string,
  ctx: SectionImagePlanContext,
  seedSuffix: string,
  sectionTitle: string
): LayoutPlanNode {
  return {
    id: nodeId,
    component: "Stack",
    mapping: "widget",
    sourceText: sectionTitle,
    label: `${sectionTitle} illustrations`,
    hints: {
      note: 'emit Stack([ReportCoverHero thumb, ReportCoverHero thumb], "row", "m", "stretch", "start", true) — two small images below prose or in table gaps',
    },
    children: [
      buildThumbImageNode(`${nodeId}-l`, ctx, `${seedSuffix}-l`, sectionTitle, 0),
      buildThumbImageNode(`${nodeId}-r`, ctx, `${seedSuffix}-r`, sectionTitle, 1),
    ],
  }
}

function buildCompositeSegmentNode(
  seg: TextSegment,
  blocks: SectionContentBlock[],
  gapImages?: SectionImagePlanContext
): LayoutPlanNode {
  const children: LayoutPlanNode[] = []
  const title = normalizeTitle(seg.title ?? seg.id)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    children.push(buildLeafNodeFromBody(seg, block.text, `-part-${i}`, gapImages))

    if (
      gapImages?.enabled &&
      block.kind === "table" &&
      i + 1 < blocks.length
    ) {
      children.push(
        buildThumbImageNode(
          `${seg.id}-gap-${i}`,
          gapImages,
          `${seg.id}-between-${i}`,
          `${title} (between tables)`,
          i % 2 === 0 ? 0 : 1
        )
      )
    }
  }

  return {
    id: seg.id,
    component: "Stack",
    mapping: "widget",
    sourceText: seg.body,
    label: seg.title,
    hints: {
      note: "subsection with multiple blocks (prose and/or tables) — emit in order; do not merge or drop blocks",
    },
    children,
  }
}

function buildTwoColumnTextNode(
  seg: TextSegment,
  gapImages?: SectionImagePlanContext
): LayoutPlanNode {
  const [left, right] = splitProseIntoTwoColumns(stripProseDividers(seg.body))
  const twoCol: LayoutPlanNode = {
    id: seg.id,
    component: "TwoColumnProse",
    mapping: "widget",
    sourceText: seg.body,
    label: seg.title,
    hints: {
      twoColumn: "true",
      left,
      right,
      note: "emit exactly TwoColumnProse(\"left\", \"right\") as two positionals — never Stack row or three stacked TextContent blocks",
    },
  }

  if (!gapImages?.enabled) return twoCol

  const title = normalizeTitle(seg.title ?? seg.id)
  return {
    id: `${seg.id}-with-thumbs`,
    component: "Stack",
    mapping: "widget",
    sourceText: seg.body,
    label: title,
    hints: {
      note: "TwoColumnProse then a row of two thumb images — preserve child order",
    },
    children: [twoCol, buildThumbPairRowNode(`${seg.id}-thumbs`, gapImages, seg.id, title)],
  }
}

function buildNodeFromSegment(
  seg: TextSegment,
  gapImages?: SectionImagePlanContext
): LayoutPlanNode {
  const blocks = splitBodyIntoContentBlocks(seg.body)
  if (blocks.length > 1) {
    return buildCompositeSegmentNode(seg, blocks, gapImages)
  }
  const body = blocks[0]?.text ?? seg.body
  return buildLeafNodeFromBody(seg, body, "", gapImages)
}

function buildSubsectionBlock(
  seg: TextSegment,
  gapImages?: SectionImagePlanContext
): LayoutPlanNode {
  const inner = buildNodeFromSegment(seg, gapImages)
  const title = normalizeTitle(seg.title ?? seg.id)
  return {
    id: `sub-${seg.id}`,
    component: "Stack",
    mapping: "widget",
    sourceText: title,
    label: title,
    hints: { note: "subsection inside chapter Card — not a separate top-level Card" },
    children: [
      {
        id: `sub-h-${seg.id}`,
        component: "CardHeader",
        mapping: "widget",
        sourceText: title,
        label: title,
        hints: { note: "subsection header — CardHeader(\"...\") positional only; max 2 args" },
      },
      inner,
    ],
  }
}

type SectionImagePlanContext = {
  enabled: boolean
  documentId?: string
  prompt: string
  documentTitle?: string
}

function buildSectionImageNode(
  nodeId: string,
  image: ReportCoverPick,
  sectionTitle: string
): LayoutPlanNode {
  return {
    id: nodeId,
    component: "ReportCoverHero",
    mapping: "widget",
    sourceText: image.alt,
    label: `${sectionTitle} illustration`,
    hints: {
      imageUrl: image.url,
      alt: image.alt,
      variant: "section",
      note: "ReportCoverHero after CardHeader — copy imageUrl and variant=section exactly",
    },
  }
}

function appendPrimarySectionImage(
  children: LayoutPlanNode[],
  ctx: SectionImagePlanContext,
  sectionId: string,
  sectionTitle: string,
  nodeIdPrefix: string
): void {
  if (!ctx.enabled) return

  const primary = pickReportSectionImage({
    seed: `${ctx.documentId ?? "doc"}::${sectionId}`,
    sectionTitle,
    prompt: ctx.prompt,
    documentTitle: ctx.documentTitle,
  })
  children.push(buildSectionImageNode(`${nodeIdPrefix}-img`, primary, sectionTitle))
}

/** One major chapter: rounded Card containing ### subsections (not one Card per heading). */
function buildChapterCardNode(
  chapter: ReportChapter,
  prompt: string,
  sectionImages?: SectionImagePlanContext
): LayoutPlanNode {
  const children: LayoutPlanNode[] = [
    {
      id: `ch-h-${chapter.id}`,
      component: "CardHeader",
      mapping: "widget",
      sourceText: chapter.title,
      label: chapter.title,
    },
  ]

  appendPrimarySectionImage(
    children,
    sectionImages ?? { enabled: false, prompt },
    chapter.id,
    chapter.title,
    `ch-${chapter.id}`
  )

  if (chapter.leadSegment && !isHeadingOnlySegment(chapter.leadSegment)) {
    children.push(buildNodeFromSegment(chapter.leadSegment, sectionImages))
  }

  let subsectionIndex = 0
  const midImageAfter = sectionImages?.enabled && chapter.subsections.length >= 3 ? 2 : -1

  for (const sub of chapter.subsections) {
    if (shouldUseAccordionForSection(sub, prompt)) {
      const inner = buildNodeFromSegment(sub, sectionImages)
      children.push({
        id: `acc-wrap-${sub.id}`,
        component: "Accordion",
        mapping: "widget",
        sourceText: normalizeTitle(sub.title ?? sub.id),
        label: sub.title,
        children: [
          {
            id: `acc-${sub.id}`,
            component: "AccordionItem",
            mapping: "widget",
            sourceText: normalizeTitle(sub.title ?? sub.id),
            label: normalizeTitle(sub.title ?? sub.id),
            children: [inner],
          },
        ],
      })
    } else {
      children.push(buildSubsectionBlock(sub, sectionImages))
    }

    subsectionIndex++
    if (subsectionIndex === midImageAfter) {
      const mid = pickReportSectionImage({
        seed: `${sectionImages!.documentId ?? "doc"}::${chapter.id}::mid`,
        sectionTitle: `${chapter.title} (continued)`,
        prompt: sectionImages!.prompt,
        documentTitle: sectionImages!.documentTitle,
      })
      children.push(buildSectionImageNode(`ch-${chapter.id}-img-mid`, mid, chapter.title))
    }
  }

  return {
    id: `card-${chapter.id}`,
    component: "Card",
    mapping: "widget",
    sourceText: chapter.title,
    label: chapter.title,
    hints: {
      note: "primary report chapter (H1 or numbered ##) — single rounded Card; subsections nested inside",
    },
    children,
  }
}

/** Flat Card for simple docs with only ## sections and no ### hierarchy. */
function buildSectionCardNode(
  seg: TextSegment,
  prompt: string,
  sectionImages?: SectionImagePlanContext
): LayoutPlanNode {
  const inner = buildNodeFromSegment(seg, sectionImages)
  const title = normalizeTitle(seg.title ?? seg.id)

  if (shouldUseAccordionForSection(seg, prompt)) {
    return {
      id: `acc-wrap-${seg.id}`,
      component: "Accordion",
      mapping: "widget",
      sourceText: title,
      label: title,
      children: [
        {
          id: `acc-${seg.id}`,
          component: "AccordionItem",
          mapping: "widget",
          sourceText: title,
          label: title,
          children: [inner],
        },
      ],
    }
  }

  const sectionChildren: LayoutPlanNode[] = [
    {
      id: `card-h-${seg.id}`,
      component: "CardHeader",
      mapping: "widget",
      sourceText: title,
      label: title,
    },
  ]
  appendPrimarySectionImage(
    sectionChildren,
    sectionImages ?? { enabled: false, prompt },
    seg.id,
    title,
    `sec-${seg.id}`
  )
  sectionChildren.push(inner)

  return {
    id: `card-${seg.id}`,
    component: "Card",
    mapping: "widget",
    sourceText: title,
    label: title,
    hints: { note: "report section Card with CardHeader + body widget" },
    children: sectionChildren,
  }
}

function usesHierarchicalChapters(sectionSegments: TextSegment[]): boolean {
  return sectionSegments.some(isSubsectionBoundary)
}

function documentTitleFromSegments(sectionSegments: TextSegment[]): string | undefined {
  const titleSeg = sectionSegments.find((s) => isDocumentTitleSegment(s, sectionSegments))
  return titleSeg ? normalizeTitle(titleSeg.title ?? "") : undefined
}

/** Preamble is often only a markdown horizontal rule before the first ## heading. */
function preambleBodyIsSubstantive(body: string | undefined): boolean {
  if (!body?.trim()) return false
  const stripped = body
    .replace(/^---+$/gm, "")
    .replace(/^\s*[*_#]+\s*$/gm, "")
    .trim()
  return stripped.length >= 20
}

function extractCoverTitleAndSubtitle(
  preamble: string | undefined,
  docTitle: string | undefined
): { title: string; subtitle?: string } {
  if (docTitle?.trim()) {
    return { title: normalizeTitle(docTitle) }
  }
  if (!preamble?.trim()) {
    return { title: "Document" }
  }
  const lines = preamble
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^---+$/.test(l))
  const title = lines[0]?.replace(/^#{1,4}\s+/, "").slice(0, 200) || "Document"
  if (lines.length < 2) return { title }

  const second = lines[1].replace(/^#{1,4}\s+/, "")
  const third = lines[2]?.replace(/^#{1,4}\s+/, "")

  const looksLikeSubtitle = (line: string) =>
    line.length >= 4 &&
    line.length <= 120 &&
    !/^[-*•]/.test(line) &&
    (line.split(/\s+/).length <= 12 || !line.includes("."))

  if (third && looksLikeSubtitle(second) && looksLikeSubtitle(third)) {
    return { title, subtitle: `${second} ${third}`.trim().slice(0, 160) }
  }
  if (looksLikeSubtitle(second) && !second.startsWith("A ")) {
    return { title, subtitle: second }
  }
  return { title }
}

function extractDocumentSummary(
  segments: TextSegment[],
  sectionSegments: TextSegment[],
  chapters: ReportChapter[],
  prompt: string
): string {
  const preambleSeg = segments.find((s) => s.id === "preamble")
  const substantiveSeg = (pred: (s: TextSegment) => boolean) =>
    sectionSegments.find((s) => pred(s) && !isHeadingOnlySegment(s))

  const raw =
    (preambleSeg?.body && preambleBodyIsSubstantive(preambleSeg.body)
      ? preambleSeg.body
      : undefined) ??
    substantiveSeg((s) => /business need|value proposition/i.test(s.title ?? ""))?.body?.slice(0, 1200) ??
    substantiveSeg((s) => /executive summary/i.test(s.title ?? ""))?.body?.slice(0, 1200) ??
    chapters[0]?.subsections.find((s) => !isHeadingOnlySegment(s))?.body?.slice(0, 1200) ??
    chapters[0]?.leadSegment?.body?.slice(0, 1200) ??
    (sectionSegments.length === 0
      ? prompt
      : (sectionSegments.find((s) => !isHeadingOnlySegment(s))?.body.slice(0, 400) ?? prompt))

  const docTitle = documentTitleFromSegments(sectionSegments)
  const { title, subtitle } = extractCoverTitleAndSubtitle(preambleSeg?.body, docTitle)
  let summary = raw.trim()
  if (preambleSeg?.body && preambleBodyIsSubstantive(preambleSeg.body)) {
    const lines = preambleSeg.body
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^---+$/.test(l))
    const skip = new Set<string>([title, subtitle].filter(Boolean) as string[])
    const bodyLines = lines.filter((l) => {
      const norm = l.replace(/^#{1,4}\s+/, "")
      return !skip.has(norm) && norm !== title
    })
    if (bodyLines.length > 0) {
      summary = bodyLines.join("\n").trim()
    }
  }
  return summary.slice(0, 1200)
}

function shouldIncludeDocumentCover(
  sectionSegments: TextSegment[],
  segments: TextSegment[],
  chapters: ReportChapter[]
): boolean {
  if (sectionSegments.length === 0) return false
  const preamble = segments.find((s) => s.id === "preamble")
  if (preambleBodyIsSubstantive(preamble?.body)) return true
  if (documentTitleFromSegments(sectionSegments)) return true
  if (chapters.length >= 1) return true
  if (sectionSegments.filter((s) => isChapterBoundary(s)).length >= 2) return true
  return sectionSegments.length >= 2
}

function executiveSummaryBodyFromChapters(chapters: ReportChapter[]): string | undefined {
  const ch = chapters.find((c) => /executive summary/i.test(c.title))
  const body =
    ch?.subsections.find((s) => !isHeadingOnlySegment(s))?.body ??
    ch?.leadSegment?.body
  return body?.trim() || undefined
}

function buildCoverNode(
  title: string,
  coverBlurb: string,
  subtitle?: string,
  coverImage?: ReportCoverPick
): LayoutPlanNode {
  const headerSource = subtitle ? `${title}\n${subtitle}` : title
  const heroChild: LayoutPlanNode | undefined = coverImage
    ? {
        id: "cover-hero",
        component: "ReportCoverHero",
        mapping: "widget",
        sourceText: coverImage.alt,
        label: "Cover image",
        hints: {
          imageUrl: coverImage.url,
          alt: coverImage.alt,
          note: "ReportCoverHero first inside cover Card — copy imageUrl exactly",
        },
      }
    : undefined

  return {
    id: "doc-cover",
    component: "Card",
    mapping: "widget",
    sourceText: [title, subtitle, coverBlurb].filter(Boolean).join("\n\n").slice(0, 2400),
    label: "Cover",
    hints: {
      note: "report cover — first item in root Stack; ReportCoverHero + CardHeader + TextContent summary",
      ...(subtitle ? { subtitle } : {}),
    },
    children: [
      ...(heroChild ? [heroChild] : []),
      {
        id: "cover-header",
        component: "CardHeader",
        mapping: "widget",
        sourceText: headerSource,
        label: title,
        hints: subtitle ? { subtitle, note: "CardHeader with two positional string args" } : undefined,
      },
      {
        id: "cover-summary",
        component: "TextContent",
        mapping: "typography-fallback",
        sourceText: coverBlurb,
        fallbackReason: "short cover blurb (not full executive summary)",
        hints: {
          variant: "default",
          coverBlurb: "true",
          maxChars: String(COVER_SUMMARY_MAX_CHARS),
          note: "2-4 sentence teaser only; chapter 1 holds the full executive summary",
        },
      },
    ],
  }
}

function buildShellNodes(
  shell: LayoutShellId,
  segments: TextSegment[],
  prompt: string,
  documentId?: string,
  coverSummaryOverride?: string,
  focusedDetail = false
): LayoutPlanNode[] {
  const preambleSeg = segments.find((s) => s.id === "preamble")
  let sectionSegments = segments.filter((s) => s.id !== "preamble")
  if (focusedDetail) {
    sectionSegments = filterSegmentsForFocusedPrompt(sectionSegments, prompt)
  }
  const docTitle = documentTitleFromSegments(sectionSegments)
  const hierarchical = usesHierarchicalChapters(sectionSegments)
  const chapters = hierarchical ? groupSegmentsIntoChapters(sectionSegments) : []

  const substantiveSeg = (pred: (s: TextSegment) => boolean) =>
    sectionSegments.find((s) => pred(s) && !isHeadingOnlySegment(s))

  const summarySource = extractDocumentSummary(segments, sectionSegments, chapters, prompt)
  const useCover =
    !focusedDetail && shouldIncludeDocumentCover(sectionSegments, segments, chapters)
  const { title: coverTitle, subtitle: coverSubtitle } = extractCoverTitleAndSubtitle(
    preambleSeg?.body,
    docTitle
  )
  const metadataBlurb = formatReportMetadataBlurb(
    sectionSegments.filter(isReportMetadataHeading)
  )
  let coverBlurb =
    coverSummaryOverride?.trim() ||
    buildCoverBlurbFromSources({
      fullSummary: summarySource,
      preambleBody: preambleSeg?.body,
      executiveSummaryBody: executiveSummaryBodyFromChapters(chapters),
    })
  if (metadataBlurb) {
    const combined = [metadataBlurb, coverBlurb].filter(Boolean).join("\n\n").trim()
    coverBlurb = combined.slice(0, COVER_SUMMARY_MAX_CHARS)
  }
  const coverImage = useCover
    ? pickReportCoverImage({
        seed: documentId,
        prompt,
        documentTitle: coverTitle,
      })
    : undefined
  const coverCard = useCover
    ? buildCoverNode(coverTitle, coverBlurb, coverSubtitle, coverImage)
    : null

  const sectionCardCount =
    chapters.length > 0
      ? chapters.length
      : sectionSegments.filter((s) => isChapterBoundary(s) && !isHeadingOnlySegment(s)).length

  const sectionImageCtx: SectionImagePlanContext = {
    enabled:
      GENUI_BODY_REPORT_IMAGES_ENABLED && !focusedDetail && sectionCardCount >= 1,
    documentId,
    prompt,
    documentTitle: docTitle ?? coverTitle,
  }

  const introChildren: LayoutPlanNode[] = [
    {
      id: "intro-header",
      component: "CardHeader",
      mapping: "widget",
      sourceText: docTitle ?? (shell === "charter" ? "Project charter" : "Executive summary"),
      label: "Summary",
    },
  ]
  if (sectionImageCtx.enabled && !useCover) {
    appendPrimarySectionImage(
      introChildren,
      sectionImageCtx,
      "intro",
      introChildren[0]!.label ?? "Summary",
      "intro"
    )
  }
  introChildren.push({
    id: "intro-text",
    component: "TextContent",
    mapping: "typography-fallback",
    sourceText: summarySource.slice(0, 1200),
    fallbackReason: "executive summary lead",
    hints: { variant: "default" },
  })

  const introCard: LayoutPlanNode = {
    id: "intro-card",
    component: "Card",
    mapping: "widget",
    sourceText: summarySource.slice(0, 1200),
    label: "Summary",
    children: introChildren,
  }

  const frontCard = coverCard ?? introCard
  const withFront = (nodes: LayoutPlanNode[]) =>
    focusedDetail ? nodes : [frontCard, ...nodes]

  if (sectionSegments.length === 0) {
    const single = classifySegmentBody(prompt)
    return withFront([
      {
        id: "answer-primary",
        component: single.component,
        mapping: single.mapping,
        sourceText: prompt,
        fallbackReason: single.fallbackReason,
        hints: single.hints,
      },
    ])
  }

  const preferHierarchicalReport =
    !focusedDetail &&
    (wantsGenuiFullDocumentLayout(prompt) ||
      (hierarchical && chapters.length >= 2))

  if (!preferHierarchicalReport && (shell === "risk" || shell === "table")) {
    const tableSeg = sectionSegments.find(
      (s) => classifySegmentBody(s.body, s.title).component === "Table"
    )
    if (tableSeg) {
      return withFront([buildNodeFromSegment(tableSeg)])
    }
    const merged = sectionSegments.map((s) => s.body).join("\n\n").slice(0, 12_000)
    return withFront([
      {
        id: "primary-table",
        component: "Table",
        mapping: "widget",
        sourceText: merged,
        hints: { note: "risk or register columns from context" },
      },
    ])
  }

  if (shell === "timeline") {
    const tl = sectionSegments.find(
      (s) => classifySegmentBody(s.body, s.title).component === "Timeline"
    )
    const timelineNode = tl
      ? buildNodeFromSegment(tl)
      : {
          id: "primary-timeline",
          component: "Timeline" as const,
          mapping: "widget" as const,
          sourceText: sectionSegments.map((s) => s.body).join("\n").slice(0, 12_000),
        }
    return withFront([timelineNode])
  }

  if (hierarchical && chapters.length > 0) {
    const tocEntries = chapters.map((c) => c.title)
    const chapterNodes = chapters.map((ch) =>
      buildChapterCardNode(ch, prompt, sectionImageCtx)
    )
    const nodes: LayoutPlanNode[] = [frontCard, ...chapterNodes]
    const tocMinChapters = useCover ? 2 : 4
    if (chapters.length >= tocMinChapters) {
      nodes.splice(1, 0, {
        id: "doc-toc",
        component: "TableOfContents",
        mapping: "widget",
        sourceText: tocEntries.join("\n"),
        hints: { entries: tocEntries, note: "chapter-level entries only (not every subsection)" },
      })
    }
    return nodes
  }

  const flatSections = sectionSegments.filter(
    (s) => !isDocumentTitleSegment(s, sectionSegments) && !isHeadingOnlySegment(s)
  )

  const flatTocMin = useCover ? 2 : 4
  if (flatSections.length >= flatTocMin) {
    const tocEntries = flatSections
      .filter(isChapterBoundary)
      .map((s) => normalizeTitle(s.title ?? s.id))
    const nodes: LayoutPlanNode[] = [frontCard]
    if (tocEntries.length >= flatTocMin) {
      nodes.push({
        id: "doc-toc",
        component: "TableOfContents",
        mapping: "widget",
        sourceText: tocEntries.join("\n"),
        hints: { entries: tocEntries },
      })
    }
    nodes.push(...flatSections.map((seg) => buildSectionCardNode(seg, prompt, sectionImageCtx)))
    return nodes
  }

  if (flatSections.length >= 1) {
    return withFront(
      flatSections.map((seg) => buildSectionCardNode(seg, prompt, sectionImageCtx))
    )
  }

  return withFront(sectionSegments.map((seg) => buildNodeFromSegment(seg)))
}

function planConfidence(shell: LayoutShellId, segments: TextSegment[], nodes: LayoutPlanNode[]): number {
  let score = 0.55
  if (segments.length > 0) score += 0.15
  if (shell !== "generic") score += 0.1
  const widgetCount = nodes.filter((n) => n.mapping === "widget").length
  const fallbackCount = nodes.filter((n) => n.mapping === "typography-fallback").length
  if (widgetCount > fallbackCount) score += 0.1
  if (widgetCount >= 2) score += 0.05
  return Math.min(0.98, score)
}

/**
 * Build a strict layout plan from user intent + optional source text.
 */
export function buildLayoutPlan(input: BuildLayoutPlanInput): LayoutPlan {
  const prompt = input.prompt.trim()
  const sourceText = (input.sourceText ?? "").trim()
  const focusedDetail = wantsGenuiFocusedDetailRender(prompt)
  const primary = selectComponentType({ prompt })
  const shell = resolveShellId(prompt, primary)
  const segments = sourceText ? segmentSourceText(sourceText) : []
  const nodes = buildShellNodes(
    shell,
    segments,
    prompt,
    input.documentId,
    input.coverSummary,
    focusedDetail
  )
  const totalChars = nodes.reduce((sum, n) => sum + n.sourceText.length, 0)

  return {
    shell,
    root: "Stack",
    intentPrimary: toGenUIComponentName(primary),
    confidence: planConfidence(shell, segments, nodes),
    focusedDetail,
    nodes,
    sourceCoverage: {
      segmentCount: segments.length || 1,
      totalChars: totalChars || prompt.length,
    },
  }
}

function escapeLangString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function twoColumnProseRequiredLang(n: LayoutPlanNode, pad: string): string {
  if (n.component !== "TwoColumnProse" || n.hints?.twoColumn !== "true") return ""
  const left = n.hints.left
  const right = n.hints.right
  if (typeof left !== "string" || typeof right !== "string") return ""
  return `${pad}  REQUIRED_LANG: ${buildTwoColumnProseLang(left, right)}`
}

/** OpenUI TwoColumnProse: two positionals — left string, right string. */
function buildTwoColumnProseLang(left: string, right: string): string {
  return `TwoColumnProse("${escapeLangString(left)}", "${escapeLangString(right)}")`
}

function flattenNodes(nodes: LayoutPlanNode[], depth = 0): string[] {
  const lines: string[] = []
  for (const n of nodes) {
    const pad = "  ".repeat(depth)
    const headerLabel = n.label?.trim()
    const twoColLang = twoColumnProseRequiredLang(n, pad)
    const bulletsLang = bulletsRequiredLang(n, pad)
    const comparisonLang = comparisonRequiredLang(n, pad)
    lines.push(
      `${pad}- id: ${n.id}`,
      `${pad}  component: ${n.component}`,
      `${pad}  mapping: ${n.mapping}`,
      `${pad}  label: ${n.label ?? "(none)"}`,
      twoColLang,
      bulletsLang,
      comparisonLang,
      n.component === "CardHeader" && headerLabel
        ? typeof n.hints?.subtitle === "string"
          ? `${pad}  REQUIRED_LANG: CardHeader("${escapeLangString(headerLabel)}", "${escapeLangString(n.hints.subtitle)}")`
          : `${pad}  REQUIRED_LANG: CardHeader("${escapeLangString(headerLabel)}")`
        : "",
      n.component === "ReportCoverHero" && typeof n.hints?.imageUrl === "string"
        ? `${pad}  REQUIRED_LANG: ${buildReportCoverHeroLang(
            String(n.hints.imageUrl),
            String(n.hints.alt ?? "Report cover"),
            n.hints.variant === "section" || n.hints.variant === "thumb"
              ? n.hints.variant
              : undefined
          )}`
        : "",
      n.component === "Stack" &&
      n.children?.length === 2 &&
      n.children.every((c) => c.component === "ReportCoverHero" && c.hints?.variant === "thumb")
        ? `${pad}  REQUIRED_LANG: Stack([${buildReportCoverHeroLang(String(n.children[0]!.hints?.imageUrl ?? ""), String(n.children[0]!.hints?.alt ?? ""), "thumb")}, ${buildReportCoverHeroLang(String(n.children[1]!.hints?.imageUrl ?? ""), String(n.children[1]!.hints?.alt ?? ""), "thumb")}], "row", "m", "stretch", "start", true)`
        : "",
      `${pad}  sourceTextChars: ${n.sourceText.length}`,
      n.fallbackReason ? `${pad}  fallbackReason: ${n.fallbackReason}` : "",
      n.hints ? `${pad}  hints: ${JSON.stringify(n.hints)}` : "",
      `${pad}  sourceText: """`,
      ...n.sourceText.split("\n").map((l) => `${pad}    ${l}`),
      `${pad}  """`
    )
    if (n.children?.length) {
      if (twoColLang) {
        lines.push(
          `${pad}  children: (none — emit only REQUIRED_LANG TwoColumnProse above; do NOT add TextContent or Stack)`
        )
      } else {
        lines.push(`${pad}  children:`)
        lines.push(...flattenNodes(n.children, depth + 2))
      }
    }
  }
  return lines.filter(Boolean)
}

/** Instructions + plan JSON for the executor LLM (user message appendix). */
export function formatLayoutPlanForExecutor(
  plan: LayoutPlan,
  options?: { reportDarkTheme?: boolean }
): string {
  const cappedPlan = compactLayoutPlanForExecutor(plan)
  const focused = cappedPlan.focusedDetail === true
  const hasCover = collectAllPlanNodes(cappedPlan.nodes).some((n) => n.id === "doc-cover")
  const shellHints: Record<LayoutShellId, string> = {
    charter:
      "root = Stack([TableOfContents?, intro Card, one Card per major chapter; ### subsections nested inside chapter Card])",
    status: "root = Stack([intro Card, section Cards, Bullets or Table for blockers])",
    risk: "root = Stack([intro Card, Table or section Cards per risk area])",
    timeline: focused
      ? "root = Stack([Timeline]) — no cover Card, no TableOfContents"
      : "root = Stack([intro Card, Timeline or section Cards])",
    team: "root = Stack([intro Card, Team or section Cards])",
    comparison: "root = Stack([intro Card, Comparison])",
    table: focused
      ? "root = Stack([Table]) — no cover Card, no TableOfContents"
      : "root = Stack([intro Card, Table])",
    dashboard: "root = Stack([intro Card, section Cards or Tabs])",
    generic: focused
      ? "root = Stack([requested section Card or widget only]) — no cover Card, no TableOfContents"
      : "root = Stack([intro Card, one Card per document section — not Accordion unless user asked])",
  }

  const hasSectionImages = collectAllPlanNodes(cappedPlan.nodes).some(
    (n) => n.component === "ReportCoverHero" && n.hints?.variant === "section"
  )
  const hasThumbImages = collectAllPlanNodes(cappedPlan.nodes).some(
    (n) => n.component === "ReportCoverHero" && n.hints?.variant === "thumb"
  )

  const coverRules = hasCover
    ? [
        "- When node id doc-cover is present: root Stack MUST start with cover Card (ReportCoverHero with exact imageUrl from cover-hero hints, then CardHeader, then TextContent cover blurb) before TableOfContents and chapter Cards.",
        "- Node cover-summary is a SHORT cover teaser (see hints.maxChars). Do NOT paste the full executive summary from chapter 1; preserve cover sourceText only (may tighten wording, not expand).",
      ]
    : []

  const sectionImageRules = hasSectionImages
    ? [
        "- Chapter/section Cards include ReportCoverHero nodes with hints.variant=section: emit immediately after that Card's CardHeader, before body widgets. Copy imageUrl and alt from hints exactly; include variant=\"section\".",
        "- Do NOT invent image URLs — only use URLs from REQUIRED_LANG on ReportCoverHero nodes.",
        "- Mid-chapter section images (ids ending in -img-mid) break up long chapters; place at the plan position among children, not at the end of the whole report.",
      ]
    : []

  const thumbImageRules = hasThumbImages
    ? [
        "- ReportCoverHero with variant=thumb are small inline placeholders: copy imageUrl/alt exactly; include variant=\"thumb\".",
        "- When REQUIRED_LANG shows a Stack row of two thumb ReportCoverHero components, emit that Stack verbatim (do not omit thumbs).",
        "- Thumb pair nodes (ids ending in -thumbs) sit directly under TwoColumnProse inside the same parent Stack.",
        "- Gap filler thumbs (ids containing -gap- or -between-) sit between tables in subsection Stacks — preserve order.",
      ]
    : []

  const focusedRules = focused
    ? [
        "- FOCUSED DETAIL MODE: Do NOT add ReportCoverHero, cover Card, intro Card, or TableOfContents unless a matching node id appears in NODES below.",
        "- root Stack MUST contain ONLY the components listed in NODES, in the same order — no extra Cards.",
      ]
    : []

  const coverOnlyImageRules =
    !GENUI_BODY_REPORT_IMAGES_ENABLED && hasCover
      ? [
          "- COVER-ONLY IMAGES: Emit ReportCoverHero ONLY inside doc-cover (cover-hero). Do NOT add section banners, thumb pairs, Image, or ImageGallery in chapter Cards unless a matching node appears in NODES.",
        ]
      : []

  return [
    "=== REQUIRED LAYOUT PLAN (strict — do not change structure) ===",
    `shell: ${cappedPlan.shell}`,
    `root: ${cappedPlan.root}`,
    `intentPrimary: ${cappedPlan.intentPrimary}`,
    `confidence: ${cappedPlan.confidence.toFixed(2)}`,
    ...(focused ? ["focusedDetail: true"] : []),
    `suggestedRootPattern: ${shellHints[cappedPlan.shell]}`,
    "",
    "EXECUTOR RULES:",
    "- Output valid OpenUI Lang only (first line: root = …).",
    "- Implement EVERY node below; do not add, remove, or swap components.",
    "- Put facts from each node's sourceText into that component's props (rows, items, milestones, etc.).",
    "- Nodes with mapping typography-fallback MUST use TextContent (or Callout if warning) with the full sourceText preserved.",
    "- Never use root = Bullets(...) or root = TextContent(...) alone.",
    "- Emit the COMPLETE OpenUI Lang through every node in NODES (all chapters and Appendices). Do not stop early or truncate lists, tables, or paragraphs mid-sentence.",
    "- Preserve every bullet and table row from each node's sourceText — nested lists under §2.1-style scope sections must include all capability, deliverable, and organizational items.",
    ...focusedRules,
    ...coverRules,
    ...coverOnlyImageRules,
    ...sectionImageRules,
    ...thumbImageRules,
    "- CardHeader must stay inside Card. One top-level Card per major chapter (H1 or numbered ## like \"1. Executive Summary\").",
    "- Every node with component CardHeader MUST appear as CardHeader(\"<label>\") or CardHeader(\"<label>\", \"<subtitle>\") — positional strings only (no title= named syntax).",
    "- CardHeader accepts at most two positional args. Never three args. Never CardHeader(\"title\", \"default\", ...) — \"default\" is TextContent size, not CardHeader.",
    "- Subsections (### or 1.1, 1.2) go INSIDE the chapter Card as Stack blocks with subsection CardHeader — never a separate top-level Card per ###.",
    "- Skip empty heading-only nodes; do not emit TextContent that only repeats the section title — use CardHeader for the title instead.",
    "- Narrative prose → TextContent. Bullet/numbered lists → Bullets. Markdown tables → Table([Col(\"Header\", [cells...]), ...]) with ONE argument only — never Table(..., \"caption\").",
    "- Bullets: exactly THREE positionals — title (string or null), style (\"bullet\"|\"numbered\"|\"checklist\"), items ([\"line1\", \"line2\", ...]). NEVER pass each bullet as its own positional argument.",
    "- When REQUIRED_LANG shows Bullets(...), copy it verbatim for that node id.",
    "- Two-column narrative (component TwoColumnProse or hints.twoColumn): emit exactly TwoColumnProse(\"left paragraph\", \"right paragraph\") as TWO positionals — never left= / right= named syntax, never three stacked TextContent blocks or a column Stack.",
    "- TableOfContents: TWO positionals — title (string or null), entries ([{title: \"…\", level: 1}, …]). Never pass each entry as its own argument.",
    "- ReportCoverHero: TWO or THREE positionals — imageUrl string, alt string, optional variant (\"cover\"|\"section\"|\"thumb\"). Never imageUrl= named syntax.",
    "- Comparison: TWO positionals — title (string or null), sides ([{name: \"…\", highlighted?: true, attributes: {…}}, …]). Never pass the sides array as the only argument; never pass each side object as its own positional; never title= / sides= named syntax.",
    "- When REQUIRED_LANG shows Comparison(...), copy it verbatim for that node id.",
    "- When REQUIRED_LANG shows TwoColumnProse, copy it verbatim for that node id; do not substitute Stack([TextContent, TextContent], \"row\", …).",
    "- Subsections with multiple blocks (Stack children in plan): render every child in order — intro prose, then Table, then trailing prose (e.g. Justification for Hybrid Approach).",
    "- Do not emit TextContent(\"---\") or other horizontal-rule placeholders; markdown --- lines are omitted from plan prose — end the subsection after the last real paragraph or table.",
    "- WBS Dictionary and wide markdown tables: use Table with all pipe rows from sourceText; hints.wbsDictionary means preserve Level 1–4 columns.",
    "- hints.attributeTable or hints.wideTable: include every row and full cell text from sourceText — never emit \"[Truncated]\" or \"[Truncated for API limits\" in Table cells.",
    "- hints.overviewMetadataTable: Attribute|Value table is metadata only (name, PM, sponsor, org, authorization). Purpose and Business Value MUST appear only in the separate TwoColumnProse or TextContent node — never as a Table row.",
    "- Apply TwoColumnProse for chapter lead paragraphs and long subsection intros (e.g. Executive Summary, §1.1 Overview) when the plan component is TwoColumnProse.",
    "- Apply TwoColumnProse for **Purpose and Business Value** narrative blocks (full paragraphs, PMBOK value delivery) — never compress that prose into a table cell.",
    "- Use Accordion only when the user prompt explicitly requests accordion/collapsible/FAQ AND Bullets is not a better fit.",
    "- Do not invent metrics, dates, or names not supported by source text.",
    "- Do not append duplicate appendix tables at the end of the document; place each table only under its matching ### subsection.",
    ...(options?.reportDarkTheme
      ? [
          "",
          "HOST THEME (renderer applies CSS — Card/Stack have no background-color props):",
          "- User requested black background with gray shades inside the report.",
          "- Keep Card variant \"card\" or \"sunk\" only; do not invent style, className, or backgroundColor on components.",
          "- Prefer Card(\"sunk\") for chapter blocks and TextContent with size \"default\" for body copy.",
        ]
      : []),
    "",
    "NODES:",
    ...flattenNodes(cappedPlan.nodes),
    "=== END LAYOUT PLAN ===",
  ].join("\n")
}

function collectAllPlanNodes(nodes: LayoutPlanNode[]): LayoutPlanNode[] {
  const out: LayoutPlanNode[] = []
  for (const n of nodes) {
    out.push(n)
    if (n.children?.length) out.push(...collectAllPlanNodes(n.children))
  }
  return out
}

function unescapeLangString(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\")
}

/**
 * When the executor ignores REQUIRED_LANG and emits stacked TextContent pairs,
 * rewrite matching pairs to TwoColumnProse using plan left/right hints.
 */
function isHorizontalRulePlaceholder(text: string): boolean {
  const t = text.trim()
  return /^---+$/.test(t) || /^\s*[*_]{3,}\s*$/.test(t)
}

const ASSIGN_TEXT_CONTENT_RE =
  /^\s*(\w+)\s*=\s*TextContent\s*\(\s*(?:"((?:[^"\\]|\\.)*)"|text\s*=\s*"((?:[^"\\]|\\.)*)")(?:\s*,\s*"[^"]*")?\s*\)\s*,?\s*$/gm

const INLINE_DIVIDER_TEXT_CONTENT_RE =
  /,?\s*TextContent\s*\(\s*(?:"---+"|text\s*=\s*"---+")(?:\s*,\s*"[^"]*")?\s*\)\s*/g

/**
 * Remove executor-only horizontal-rule placeholders (TextContent("---")) that
 * duplicate markdown dividers already stripped from the layout plan.
 */
export function stripDividerNoiseInLang(lang: string): string {
  const dividerVarNames = new Set<string>()
  let m: RegExpExecArray | null
  ASSIGN_TEXT_CONTENT_RE.lastIndex = 0
  while ((m = ASSIGN_TEXT_CONTENT_RE.exec(lang)) !== null) {
    const raw = m[2] ?? m[3] ?? ""
    if (isHorizontalRulePlaceholder(unescapeLangString(raw))) {
      dividerVarNames.add(m[1])
    }
  }

  let out = lang
  for (const name of dividerVarNames) {
    out = out.replace(
      new RegExp(`^\\s*${name}\\s*=\\s*TextContent\\s*\\([^)]*\\)\\s*,?\\s*$`, "gm"),
      ""
    )
    out = out.replace(new RegExp(`,\\s*${name}\\s*(?=\\])`), "")
    out = out.replace(new RegExp(`\\[\\s*${name}\\s*,`), "[")
    out = out.replace(new RegExp(`${name}\\s*,\\s*`), "")
  }

  out = out.replace(INLINE_DIVIDER_TEXT_CONTENT_RE, "")
  return out.replace(/\n{3,}/g, "\n\n")
}

function collectLangDefinedIds(lang: string): Set<string> {
  const ids = new Set<string>()
  const re = /^\s*(\w+)\s*=/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(lang)) !== null) {
    ids.add(m[1])
  }
  return ids
}

function splitTopLevelCommaList(inner: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (c === "[" || c === "(" || c === "{") depth++
    else if (c === "]" || c === ")" || c === "}") depth--
    else if (c === "," && depth === 0) {
      const piece = inner.slice(start, i).trim()
      if (piece) parts.push(piece)
      start = i + 1
    }
  }
  const tail = inner.slice(start).trim()
  if (tail) parts.push(tail)
  return parts
}

function findBalancedBracketSlice(
  text: string,
  openBracketIdx: number
): { inner: string; closeIdx: number } | null {
  if (text[openBracketIdx] !== "[") return null
  let depth = 0
  for (let i = openBracketIdx; i < text.length; i++) {
    const c = text[i]
    if (c === "[") depth++
    else if (c === "]") {
      depth--
      if (depth === 0) {
        return { inner: text.slice(openBracketIdx + 1, i), closeIdx: i }
      }
    }
  }
  return null
}

function pruneCommaListIdentifiers(inner: string, defined: Set<string>): string {
  const parts = splitTopLevelCommaList(inner)
  const kept = parts.filter((part) => {
    const idOnly = part.match(/^(\w+)$/)
    if (!idOnly) return true
    return defined.has(idOnly[1])
  })
  return kept.join(", ")
}

/**
 * Drop Stack/Card child ids that were never assigned (executor typos like a missing subsection header).
 */
export function pruneUndefinedRefsInLang(lang: string): string {
  const defined = collectLangDefinedIds(lang)
  const arrayOpenRe = /(Stack|Card)\s*\(\s*\[/g
  let out = ""
  let last = 0
  let m: RegExpExecArray | null
  while ((m = arrayOpenRe.exec(lang)) !== null) {
    const openBracket = m.index + m[0].length - 1
    const balanced = findBalancedBracketSlice(lang, openBracket)
    if (!balanced) {
      last = m.index + 1
      continue
    }
    out += lang.slice(last, openBracket + 1)
    out += pruneCommaListIdentifiers(balanced.inner, defined)
    last = balanced.closeIdx
    arrayOpenRe.lastIndex = last + 1
  }
  out += lang.slice(last)
  return out
}

/** Pull list lines from source (bullets, numbers, or one title per line for TOC bodies). */
export function extractListItemsFromSourceText(sourceText: string): string[] {
  const lines = sourceText.replace(/\r\n/g, "\n").split("\n")
  const items: string[] = []
  for (const line of lines) {
    const m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.+)$/)
    if (m?.[1]?.trim()) items.push(m[1].trim())
  }
  if (items.length >= 2) return items
  const plain = lines.map((l) => l.trim()).filter((l) => l.length > 0 && !/^#/.test(l))
  return plain.length >= 2 ? plain : items
}

function buildReportCoverHeroLang(
  imageUrl: string,
  alt: string,
  variant?: "cover" | "section" | "thumb"
): string {
  const url = `"${escapeLangString(imageUrl)}"`
  const altArg = `"${escapeLangString(alt)}"`
  if (variant) return `ReportCoverHero(${url}, ${altArg}, "${variant}")`
  return `ReportCoverHero(${url}, ${altArg})`
}

/** OpenUI TableOfContents: title (string or null), entries array. */
function buildTableOfContentsLang(title: string, entryTitles: string[]): string {
  const entries = entryTitles
    .map((t, i) => `{title: "${escapeLangString(t)}", level: ${i === 0 ? 1 : 2}}`)
    .join(", ")
  const titleArg = title.trim() ? `"${escapeLangString(title)}"` : "null"
  return `TableOfContents(${titleArg}, [${entries}])`
}

function bulletsStyleFromSource(sourceText: string): "bullet" | "numbered" | "checklist" {
  const lines = sourceText.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim())
  if (lines.length === 0) return "bullet"
  const numbered = lines.filter((l) => /^\s*\d+\.\s+/.test(l)).length
  if (numbered >= 2 && numbered >= lines.length * 0.35) return "numbered"
  return "bullet"
}

/** OpenUI Bullets: exactly three positionals — title (string or null), style, items array. */
function buildBulletsLang(
  title: string | undefined,
  items: string[],
  style: "bullet" | "numbered" | "checklist" = "bullet"
): string {
  const itemLang = items.map((t) => `"${escapeLangString(t)}"`).join(", ")
  const titleArg = title?.trim() ? `"${escapeLangString(title.trim())}"` : "null"
  return `Bullets(${titleArg}, "${style}", [${itemLang}])`
}

function bulletsRequiredLang(n: LayoutPlanNode, pad: string): string {
  if (n.component !== "Bullets") return ""
  const items = extractListItemsFromSourceText(n.sourceText)
  if (items.length < 2) return ""
  const style = bulletsStyleFromSource(n.sourceText)
  const title = n.label?.trim()
  return `${pad}  REQUIRED_LANG: ${buildBulletsLang(title, items, style)}`
}

function escapeRegExpLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Replace malformed Bullets(...) on plan node ids with canonical list from sourceText. */
function repairTwoColumnProseAssignmentsFromPlan(lang: string, plan: LayoutPlan): string {
  let out = lang
  for (const node of collectAllPlanNodes(plan.nodes)) {
    if (node.component !== "TwoColumnProse" || node.hints?.twoColumn !== "true") continue
    const left = node.hints.left
    const right = node.hints.right
    if (typeof left !== "string" || typeof right !== "string" || !left.trim() || !right.trim()) {
      continue
    }
    const canonical = buildTwoColumnProseLang(left, right)
    const next = replaceLangNodeAssignment(out, node.id, "TwoColumnProse", canonical)
    if (next !== out) out = next
  }
  return out
}

function repairTableOfContentsAssignmentFromPlan(lang: string, plan: LayoutPlan): string {
  const tocNode = collectAllPlanNodes(plan.nodes).find((n) => n.component === "TableOfContents")
  if (!tocNode) return lang
  const hintEntries = tocNode.hints?.entries
  const entryTitles = Array.isArray(hintEntries)
    ? hintEntries.map(String)
    : extractListItemsFromSourceText(tocNode.sourceText)
  if (entryTitles.length < 2) return lang
  const canonical = buildTableOfContentsLang(
    typeof tocNode.label === "string" && tocNode.label.trim()
      ? tocNode.label.trim()
      : "Table of Contents",
    entryTitles
  )
  return replaceLangNodeAssignment(lang, tocNode.id, "TableOfContents", canonical)
}

function repairReportCoverHeroAssignmentsFromPlan(lang: string, plan: LayoutPlan): string {
  let out = lang
  for (const node of collectAllPlanNodes(plan.nodes)) {
    if (node.component !== "ReportCoverHero" || typeof node.hints?.imageUrl !== "string") continue
    const variant =
      node.hints.variant === "section" || node.hints.variant === "thumb"
        ? node.hints.variant
        : undefined
    const canonical = buildReportCoverHeroLang(
      String(node.hints.imageUrl),
      String(node.hints.alt ?? "Report cover"),
      variant
    )
    const next = replaceLangNodeAssignment(out, node.id, "ReportCoverHero", canonical)
    if (next !== out) out = next
  }
  return out
}

function repairBulletsAssignmentsFromPlan(lang: string, plan: LayoutPlan): string {
  let out = lang
  for (const node of collectAllPlanNodes(plan.nodes)) {
    if (node.component !== "Bullets") continue
    const items = extractListItemsFromSourceText(node.sourceText)
    if (items.length < 2) continue
    const style = bulletsStyleFromSource(node.sourceText)
    const canonical = buildBulletsLang(node.label?.trim(), items, style)
    out = replaceLangNodeAssignment(out, node.id, "Bullets", canonical)
  }
  return out
}

/** OpenUI Comparison: two positionals — title (string or null), sides array. */
function buildComparisonLang(title: string | null | undefined, sidesArray: string): string {
  const titleArg = title?.trim() ? `"${escapeLangString(title.trim())}"` : "null"
  return `Comparison(${titleArg}, ${sidesArray})`
}

function buildComparisonFromSource(sourceText: string, title?: string): string | null {
  const inBlock = sourceText.match(
    /in[-\s]?scope[:\s]*([\s\S]*?)(?=out[-\s]?of[-\s]?scope\b|$)/i
  )
  const outBlock = sourceText.match(/out[-\s]?of[-\s]?scope[:\s]*([\s\S]*?)$/i)
  if (!inBlock?.[1]?.trim() || !outBlock?.[1]?.trim()) return null
  const heading = title?.trim() || "Comparison"
  const inSummary = inBlock[1].trim().slice(0, 600)
  const outSummary = outBlock[1].trim().slice(0, 600)
  const sides = `[{name: "In scope", highlighted: true, attributes: {summary: "${escapeLangString(inSummary)}"}}, {name: "Out of scope", highlighted: false, attributes: {summary: "${escapeLangString(outSummary)}"}}]`
  return buildComparisonLang(heading, sides)
}

function comparisonRequiredLang(n: LayoutPlanNode, pad: string): string {
  if (n.component !== "Comparison") return ""
  const built = buildComparisonFromSource(n.sourceText, n.label?.trim())
  if (!built) return ""
  return `${pad}  REQUIRED_LANG: ${built}`
}

const BULLETS_CALL_RE = /\bBullets\s*\(/g
const TOC_CALL_RE = /\bTableOfContents\s*\(/g

/** Replace only incomplete Bullets/TOC calls (balanced parens; skips "(CCB)" inside strings). */
function repairIncompleteBulletsAndTocCallsInLang(lang: string, plan: LayoutPlan): string {
  const nodes = collectAllPlanNodes(plan.nodes)
  const bulletNodes = nodes.filter((n) => n.component === "Bullets")
  const tocNode = nodes.find((n) => n.component === "TableOfContents")

  let out = lang

  if (tocNode) {
    const hintEntries = tocNode.hints?.entries
    const entryTitles = Array.isArray(hintEntries)
      ? hintEntries.map(String)
      : extractListItemsFromSourceText(tocNode.sourceText)
    if (entryTitles.length >= 2) {
      const tocLang = buildTableOfContentsLang(
        typeof tocNode.label === "string" && tocNode.label.trim()
          ? tocNode.label.trim()
          : "Table of Contents",
        entryTitles
      )
      TOC_CALL_RE.lastIndex = 0
      let result = ""
      let lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = TOC_CALL_RE.exec(out)) !== null) {
        const openParen = match.index + match[0].length - 1
        const closeParen = findMatchingParen(out, openParen)
        if (closeParen < 0) continue
        const inner = out.slice(openParen + 1, closeParen)
        result += out.slice(lastIndex, match.index)
        result += tableOfContentsCallHasEntries(inner)
          ? out.slice(match.index, closeParen + 1)
          : tocLang
        lastIndex = closeParen + 1
        TOC_CALL_RE.lastIndex = lastIndex
      }
      result += out.slice(lastIndex)
      out = result
    }
  }

  if (bulletNodes.length > 0) {
    let bulletIdx = 0
    BULLETS_CALL_RE.lastIndex = 0
    let result = ""
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = BULLETS_CALL_RE.exec(out)) !== null) {
      const openParen = match.index + match[0].length - 1
      const closeParen = findMatchingParen(out, openParen)
      if (closeParen < 0) continue
      const inner = out.slice(openParen + 1, closeParen)
      const fullCall = out.slice(match.index, closeParen + 1)
      result += out.slice(lastIndex, match.index)
      if (bulletsCallHasCompleteItems(inner)) {
        result += fullCall
      } else {
        const node = bulletNodes[bulletIdx++] ?? bulletNodes[bulletNodes.length - 1]!
        const items = extractListItemsFromSourceText(node.sourceText)
        if (items.length < 2) {
          result += fullCall
        } else {
          const titleFromCall =
            inner.match(/\btitle\s*=\s*"((?:[^"\\]|\\.)*)"/)?.[1] ??
            inner.match(/^\s*"((?:[^"\\]|\\.)*)"/)?.[1]
          const title = titleFromCall
            ? unescapeLangString(titleFromCall)
            : node.label?.trim()
          const style = bulletsStyleFromSource(node.sourceText)
          result += buildBulletsLang(title, items, style)
        }
      }
      lastIndex = closeParen + 1
      BULLETS_CALL_RE.lastIndex = lastIndex
    }
    result += out.slice(lastIndex)
    out = result
  }

  return out
}

/** Fill missing required props on ADPA extension widgets from layout plan sourceText. */
export function repairIncompleteExtensionComponentsInLang(
  lang: string,
  plan: LayoutPlan
): string {
  let out = repairIncompleteBulletsAndTocCallsInLang(lang, plan)

  out = repairBulletsAssignmentsFromPlan(out, plan)
  out = repairTableOfContentsAssignmentFromPlan(out, plan)
  out = repairReportCoverHeroAssignmentsFromPlan(out, plan)
  out = repairTwoColumnProseAssignmentsFromPlan(out, plan)

  return out
}

const REPORT_COVER_HERO_CALL_RE =
  /ReportCoverHero\s*\((?:[^()"']|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')*\)/gi

function collectAllowedCoverHeroImageUrls(plan: LayoutPlan): Set<string> {
  const urls = new Set<string>()
  for (const n of collectAllPlanNodes(plan.nodes)) {
    if (n.component !== "ReportCoverHero") continue
    if (n.hints?.variant === "section" || n.hints?.variant === "thumb") continue
    const url = n.hints?.imageUrl
    if (typeof url === "string" && url.trim()) urls.add(url.trim())
  }
  return urls
}

/** Strip markdown **bold** from CardHeader strings in emitted Lang. */
export function stripMarkdownBoldInCardHeaders(lang: string): string {
  return lang.replace(
    /CardHeader\s*\(\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"((?:[^"\\]|\\.)*)")?\s*\)/g,
    (match, rawA, rawB) => {
      const title = unescapeLangString(rawA).replace(/\*\*/g, "")
      if (rawB) {
        const subtitle = unescapeLangString(rawB).replace(/\*\*/g, "")
        return `CardHeader("${escapeLangString(title)}", "${escapeLangString(subtitle)}")`
      }
      return `CardHeader("${escapeLangString(title)}")`
    }
  )
}

type ParsedReportCoverHeroCall = {
  imageUrl: string | null
  variant: "cover" | "section" | "thumb" | null
}

function parseReportCoverHeroCall(callText: string): ParsedReportCoverHeroCall {
  let variant: ParsedReportCoverHeroCall["variant"] = null
  const namedVariant = callText.match(/\bvariant\s*=\s*"(cover|section|thumb)"/i)
  if (namedVariant) {
    variant = namedVariant[1] as NonNullable<ParsedReportCoverHeroCall["variant"]>
  } else {
    const positionalVariant = callText.match(/,\s*"(cover|section|thumb)"\s*\)\s*$/i)
    if (positionalVariant) {
      variant = positionalVariant[1] as NonNullable<ParsedReportCoverHeroCall["variant"]>
    }
  }

  const namedUrl = callText.match(/imageUrl\s*=\s*"((?:[^"\\]|\\.)*)"/)
  if (namedUrl) {
    return { imageUrl: unescapeLangString(namedUrl[1]), variant }
  }

  const positionalUrl = callText.match(/ReportCoverHero\s*\(\s*"((?:[^"\\]|\\.)*)"/)
  if (positionalUrl) {
    return { imageUrl: unescapeLangString(positionalUrl[1]), variant }
  }

  return { imageUrl: null, variant }
}

function reportCoverUrlMatchesAllowed(imageUrl: string, allowedUrls: Set<string>): boolean {
  const trimmed = imageUrl.trim()
  if (allowedUrls.has(trimmed)) return true
  const coerced = coerceReportCoverImageUrl(trimmed)
  if (!coerced) return false
  if (allowedUrls.has(coerced)) return true
  for (const allowed of allowedUrls) {
    if (coerceReportCoverImageUrl(allowed) === coerced) return true
  }
  return false
}

/** Remove section/thumb ReportCoverHero (and unplanned heroes) when body images are disabled. */
export function stripBodyReportCoverHeroInLang(lang: string, plan: LayoutPlan): string {
  if (GENUI_BODY_REPORT_IMAGES_ENABLED) return lang

  const allowedUrls = collectAllowedCoverHeroImageUrls(plan)
  let out = lang
  REPORT_COVER_HERO_CALL_RE.lastIndex = 0
  out = out.replace(REPORT_COVER_HERO_CALL_RE, (match) => {
    const { imageUrl, variant } = parseReportCoverHeroCall(match)
    if (variant === "section" || variant === "thumb") return ""

    if (allowedUrls.size === 0) return match

    if (imageUrl) {
      return reportCoverUrlMatchesAllowed(imageUrl, allowedUrls) ? match : ""
    }

    // Positional cover heroes must not be stripped when imageUrl= named syntax is absent.
    return match
  })

  out = out.replace(/,\s*,/g, ", ")
  out = out.replace(/\[\s*,/g, "[")
  out = out.replace(/,\s*\]/g, "]")
  return out
}

/** Full multi-chapter reports: skip global two-column regex (can corrupt unrelated TextContent pairs). */
export function isFullMultiChapterReportLang(lang: string): boolean {
  const ids = lang.match(/\bcardChapter\d+/g) ?? []
  return new Set(ids).size >= 6
}

/** Remove model tail artifacts (leaked markdown fences) from Lang assignments and stacks. */
export function stripTrailingFenceArtifactsInLang(lang: string): string {
  const fenceVarNames = new Set<string>()
  const assignFenceRe =
    /^\s*(\w+)\s*=\s*TextContent\s*\(\s*(?:"```+"|'```+')(?:\s*,\s*"[^"]*")?\s*\)\s*,?\s*$/gm
  let m: RegExpExecArray | null
  while ((m = assignFenceRe.exec(lang)) !== null) {
    fenceVarNames.add(m[1])
  }

  let out = lang.replace(assignFenceRe, "")
  for (const name of fenceVarNames) {
    out = out.replace(new RegExp(`,\\s*${name}\\s*(?=\\])`), "")
    out = out.replace(new RegExp(`\\[\\s*${name}\\s*,`), "[")
    out = out.replace(new RegExp(`${name}\\s*,\\s*`), "")
  }
  return out.replace(/\n{3,}/g, "\n\n")
}

/** Post-process executor Lang: plan repairs, divider/fence cleanup, sanitize. Ref prune is opt-in only. */
export function repairGenuiExecutorLang(
  lang: string,
  plan: LayoutPlan,
  options?: { pruneUndefinedRefs?: boolean }
): string {
  const fullReport = isFullMultiChapterReportLang(lang)
  const withTwoColumn = fullReport ? lang : repairTwoColumnProseInLang(lang, plan)

  const withExtensions = fullReport
    ? withTwoColumn
    : repairIncompleteExtensionComponentsInLang(withTwoColumn, plan)

  let repaired = stripTrailingFenceArtifactsInLang(
    stripDividerNoiseInLang(
      stripMarkdownBoldInCardHeaders(
        stripBodyReportCoverHeroInLang(withExtensions, plan)
      )
    )
  )

  if (options?.pruneUndefinedRefs) {
    repaired = pruneUndefinedRefsInLang(repaired)
  }

  return sanitizeOpenUILang(repaired)
}

export function repairTwoColumnProseInLang(lang: string, plan: LayoutPlan): string {
  let out = lang
  for (const node of collectAllPlanNodes(plan.nodes)) {
    if (node.component !== "TwoColumnProse" || node.hints?.twoColumn !== "true") continue
    const left = node.hints.left
    const right = node.hints.right
    if (typeof left !== "string" || typeof right !== "string" || !left.trim() || !right.trim()) {
      continue
    }

    const canonical = buildTwoColumnProseLang(left, right)
    if (out.includes(canonical)) continue

    const leftKey = left.replace(/\s+/g, " ").trim().slice(0, 48)
    const rightKey = right.replace(/\s+/g, " ").trim().slice(0, 48)
    if (!leftKey || !rightKey) continue

    const pairRe =
      /TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)\s*,?\s*TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)/g

    out = out.replace(pairRe, (match, rawA, rawB) => {
      const a = unescapeLangString(rawA)
      const b = unescapeLangString(rawB)
      const aLeft = a.includes(leftKey) || leftKey.includes(a.slice(0, 40))
      const bRight = b.includes(rightKey) || rightKey.includes(b.slice(0, 40))
      const aRight = a.includes(rightKey) || rightKey.includes(a.slice(0, 40))
      const bLeft = b.includes(leftKey) || leftKey.includes(b.slice(0, 40))
      if (aLeft && bRight) return canonical
      if (aRight && bLeft) {
        return buildTwoColumnProseLang(right, left)
      }
      return match
    })

    const rowStackRe =
      /Stack\s*\(\s*\[\s*TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)\s*,\s*TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)\s*\]\s*,\s*"row"[^)]*\)/g
    out = out.replace(rowStackRe, (match, rawA, rawB) => {
      const a = unescapeLangString(rawA)
      const b = unescapeLangString(rawB)
      const aLeft = a.includes(leftKey) || leftKey.includes(a.slice(0, 40))
      const bRight = b.includes(rightKey) || rightKey.includes(b.slice(0, 40))
      if (aLeft && bRight) return canonical
      return match
    })
  }
  return out
}

export const OPENUI_EXECUTOR_RULES = [
  "A REQUIRED LAYOUT PLAN is included in the user message — treat it as binding.",
  "You are an executor: fill component props from sourceText; do not redesign the layout.",
  "Prefer widgets over prose; use TextContent only for nodes marked typography-fallback.",
  "Preserve all sourceText content — do not drop sections.",
]
