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
  buildCoverBlurbFromSources,
  COVER_SUMMARY_MAX_CHARS,
} from "@/lib/openui/coverSummary"
import { pickReportCoverImage, type ReportCoverPick } from "@/lib/openui/reportCoverImages"

export type { BuildLayoutPlanInput, LayoutPlan, LayoutPlanNode, TextSegment } from "@/lib/openui/layoutPlanTypes"

const MIN_SEGMENT_CHARS = 12

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
    const sep = lines.find((l) => /^\|[\s:|-]+\|/.test(l.trim()))
    return !!sep || pipeRows.length >= 3
  }
  return false
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
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length < 3) return false
  const colonRows = lines.filter((l) => /^[^|]+\|[^|]+/.test(l) || /^[^:]+:\s*\S/.test(l))
  return colonRows.length >= lines.length * 0.5
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

type SectionContentBlock = { kind: "prose" | "table"; text: string }

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
    const subChunks = chunk.split(/\n(?=\*\*[^*\n]+\*\*:?\s*(?:\n|$))/).map((c) => c.trim()).filter(Boolean)
    for (const sub of subChunks.length > 0 ? subChunks : [chunk]) {
      blocks.push({ kind: "prose", text: sub })
    }
  }

  const flushTable = () => {
    const chunk = tableBuf.join("\n").trim()
    tableBuf = []
    inTable = false
    if (chunk && isMarkdownTableBlock(chunk)) {
      blocks.push({ kind: "table", text: chunk })
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
          : attributeLike
            ? "Activity attributes — preserve every row and full cell text from source; do not truncate cells"
            : "derive columns and rows from source",
        ...(wbsLike ? { wbsDictionary: "true" } : {}),
        ...(attributeLike ? { attributeTable: "true" } : {}),
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
  return title.replace(/^#{1,4}\s+/, "").trim()
}

function isHeadingOnlySegment(seg: TextSegment): boolean {
  const title = normalizeTitle(seg.title ?? "")
  const body = seg.body.trim()
  if (!body) return true
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
  idSuffix = ""
): LayoutPlanNode {
  const subSeg: TextSegment = { ...seg, id: `${seg.id}${idSuffix}`, body }
  const classified = classifySegmentBody(body, seg.title)
  if (
    classified.component === "TextContent" &&
    classified.mapping === "typography-fallback" &&
    shouldUseTwoColumnProse(body)
  ) {
    return buildTwoColumnTextNode(subSeg, classified)
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

function buildCompositeSegmentNode(seg: TextSegment, blocks: SectionContentBlock[]): LayoutPlanNode {
  const children = blocks.map((block, i) =>
    buildLeafNodeFromBody(seg, block.text, `-part-${i}`)
  )
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

function buildTwoColumnTextNode(seg: TextSegment): LayoutPlanNode {
  const [left, right] = splitProseIntoTwoColumns(stripProseDividers(seg.body))
  return {
    id: seg.id,
    component: "TwoColumnProse",
    mapping: "widget",
    sourceText: seg.body,
    label: seg.title,
    hints: {
      twoColumn: "true",
      left,
      right,
      note: "emit exactly TwoColumnProse(left, right) — never Stack row or three stacked TextContent blocks",
    },
  }
}

function buildNodeFromSegment(seg: TextSegment): LayoutPlanNode {
  const blocks = splitBodyIntoContentBlocks(seg.body)
  if (blocks.length > 1) {
    return buildCompositeSegmentNode(seg, blocks)
  }
  const body = blocks[0]?.text ?? seg.body
  return buildLeafNodeFromBody(seg, body)
}

function buildSubsectionBlock(seg: TextSegment): LayoutPlanNode {
  const inner = buildNodeFromSegment(seg)
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

/** One major chapter: rounded Card containing ### subsections (not one Card per heading). */
function buildChapterCardNode(chapter: ReportChapter, prompt: string): LayoutPlanNode {
  const children: LayoutPlanNode[] = [
    {
      id: `ch-h-${chapter.id}`,
      component: "CardHeader",
      mapping: "widget",
      sourceText: chapter.title,
      label: chapter.title,
    },
  ]

  if (chapter.leadSegment && !isHeadingOnlySegment(chapter.leadSegment)) {
    children.push(buildNodeFromSegment(chapter.leadSegment))
  }

  for (const sub of chapter.subsections) {
    if (shouldUseAccordionForSection(sub, prompt)) {
      const inner = buildNodeFromSegment(sub)
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
      children.push(buildSubsectionBlock(sub))
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
function buildSectionCardNode(seg: TextSegment, prompt: string): LayoutPlanNode {
  const inner = buildNodeFromSegment(seg)
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

  return {
    id: `card-${seg.id}`,
    component: "Card",
    mapping: "widget",
    sourceText: title,
    label: title,
    hints: { note: "report section Card with CardHeader + body widget" },
    children: [
      {
        id: `card-h-${seg.id}`,
        component: "CardHeader",
        mapping: "widget",
        sourceText: title,
        label: title,
      },
      inner,
    ],
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

  const introCard: LayoutPlanNode = {
    id: "intro-card",
    component: "Card",
    mapping: "widget",
    sourceText: summarySource.slice(0, 1200),
    label: "Summary",
    children: [
      {
        id: "intro-header",
        component: "CardHeader",
        mapping: "widget",
        sourceText: docTitle ?? (shell === "charter" ? "Project charter" : "Executive summary"),
        label: "Summary",
      },
      {
        id: "intro-text",
        component: "TextContent",
        mapping: "typography-fallback",
        sourceText: summarySource.slice(0, 1200),
        fallbackReason: "executive summary lead",
        hints: { variant: "default" },
      },
    ],
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
    const chapterNodes = chapters.map((ch) => buildChapterCardNode(ch, prompt))
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
    nodes.push(...flatSections.map((seg) => buildSectionCardNode(seg, prompt)))
    return nodes
  }

  if (flatSections.length >= 1) {
    return withFront(flatSections.map((seg) => buildSectionCardNode(seg, prompt)))
  }

  return withFront(sectionSegments.map(buildNodeFromSegment))
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
  return `${pad}  REQUIRED_LANG: TwoColumnProse(left="${escapeLangString(left)}", right="${escapeLangString(right)}")`
}

function flattenNodes(nodes: LayoutPlanNode[], depth = 0): string[] {
  const lines: string[] = []
  for (const n of nodes) {
    const pad = "  ".repeat(depth)
    const headerLabel = n.label?.trim()
    const twoColLang = twoColumnProseRequiredLang(n, pad)
    lines.push(
      `${pad}- id: ${n.id}`,
      `${pad}  component: ${n.component}`,
      `${pad}  mapping: ${n.mapping}`,
      `${pad}  label: ${n.label ?? "(none)"}`,
      twoColLang,
      n.component === "CardHeader" && headerLabel
        ? typeof n.hints?.subtitle === "string"
          ? `${pad}  REQUIRED_LANG: CardHeader("${escapeLangString(headerLabel)}", "${escapeLangString(n.hints.subtitle)}")`
          : `${pad}  REQUIRED_LANG: CardHeader("${escapeLangString(headerLabel)}")`
        : "",
      n.component === "ReportCoverHero" && typeof n.hints?.imageUrl === "string"
        ? `${pad}  REQUIRED_LANG: ReportCoverHero(imageUrl="${escapeLangString(n.hints.imageUrl)}", alt="${escapeLangString(String(n.hints.alt ?? "Report cover"))}")`
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

  const coverRules = hasCover
    ? [
        "- When node id doc-cover is present: root Stack MUST start with cover Card (ReportCoverHero with exact imageUrl from cover-hero hints, then CardHeader, then TextContent cover blurb) before TableOfContents and chapter Cards.",
        "- Node cover-summary is a SHORT cover teaser (see hints.maxChars). Do NOT paste the full executive summary from chapter 1; preserve cover sourceText only (may tighten wording, not expand).",
      ]
    : []

  const focusedRules = focused
    ? [
        "- FOCUSED DETAIL MODE: Do NOT add ReportCoverHero, cover Card, intro Card, or TableOfContents unless a matching node id appears in NODES below.",
        "- root Stack MUST contain ONLY the components listed in NODES, in the same order — no extra Cards.",
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
    ...focusedRules,
    ...coverRules,
    "- CardHeader must stay inside Card. One top-level Card per major chapter (H1 or numbered ## like \"1. Executive Summary\").",
    "- Every node with component CardHeader MUST appear as CardHeader(\"<label>\") or CardHeader(\"<label>\", \"<subtitle>\") — positional strings only (no title= named syntax).",
    "- CardHeader accepts at most two positional args. Never three args. Never CardHeader(\"title\", \"default\", ...) — \"default\" is TextContent size, not CardHeader.",
    "- Subsections (### or 1.1, 1.2) go INSIDE the chapter Card as Stack blocks with subsection CardHeader — never a separate top-level Card per ###.",
    "- Skip empty heading-only nodes; do not emit TextContent that only repeats the section title — use CardHeader for the title instead.",
    "- Narrative prose → TextContent. Bullet/numbered lists → Bullets. Markdown tables → Table([Col(\"Header\", [cells...]), ...]) with ONE argument only — never Table(..., \"caption\").",
    "- Two-column narrative (component TwoColumnProse or hints.twoColumn): emit exactly TwoColumnProse(left=\"…\", right=\"…\") with the left/right strings from the plan — never three stacked TextContent blocks or a column Stack.",
    "- When REQUIRED_LANG shows TwoColumnProse, copy it verbatim for that node id; do not substitute Stack([TextContent, TextContent], \"row\", …).",
    "- Subsections with multiple blocks (Stack children in plan): render every child in order — intro prose, then Table, then trailing prose (e.g. Justification for Hybrid Approach).",
    "- Do not emit TextContent(\"---\") or other horizontal-rule placeholders; markdown --- lines are omitted from plan prose — end the subsection after the last real paragraph or table.",
    "- WBS Dictionary and wide markdown tables: use Table with all pipe rows from sourceText; hints.wbsDictionary means preserve Level 1–4 columns.",
    "- hints.attributeTable or hints.wideTable: include every row and full cell text from sourceText — never emit \"[Truncated]\" or \"[Truncated for API limits\" in Table cells.",
    "- Apply TwoColumnProse for chapter lead paragraphs and long subsection intros (e.g. Executive Summary, §1.1 Overview) when the plan component is TwoColumnProse.",
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

/** Post-process executor Lang: two-column repair, divider cleanup, dangling ref prune. */
export function repairGenuiExecutorLang(lang: string, plan: LayoutPlan): string {
  return pruneUndefinedRefsInLang(
    stripDividerNoiseInLang(repairTwoColumnProseInLang(lang, plan))
  )
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

    const canonical = `TwoColumnProse(left="${escapeLangString(left)}", right="${escapeLangString(right)}")`
    if (out.includes(canonical)) continue

    const leftKey = left.replace(/\s+/g, " ").trim().slice(0, 48)
    const rightKey = right.replace(/\s+/g, " ").trim().slice(0, 48)
    if (!leftKey || !rightKey) continue

    const pairRe =
      /TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)\s*,?\s*TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)/gs

    out = out.replace(pairRe, (match, rawA, rawB) => {
      const a = unescapeLangString(rawA)
      const b = unescapeLangString(rawB)
      const aLeft = a.includes(leftKey) || leftKey.includes(a.slice(0, 40))
      const bRight = b.includes(rightKey) || rightKey.includes(b.slice(0, 40))
      const aRight = a.includes(rightKey) || rightKey.includes(a.slice(0, 40))
      const bLeft = b.includes(leftKey) || leftKey.includes(b.slice(0, 40))
      if (aLeft && bRight) return canonical
      if (aRight && bLeft) {
        return `TwoColumnProse(left="${escapeLangString(right)}", right="${escapeLangString(left)}")`
      }
      return match
    })

    const rowStackRe =
      /Stack\s*\(\s*\[\s*TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)\s*,\s*TextContent\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,[^)]*\)\s*\]\s*,\s*"row"[^)]*\)/gs
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
