/**
 * §1.1-style Project Overview: keep short metadata in Table rows;
 * pull long narrative fields (especially Purpose and Business Value) into prose.
 */

export type OverviewContentBlock = { kind: "prose" | "table"; text: string }

const PROJECT_OVERVIEW_TITLE_RE =
  /\b(1\.1\s+)?(project\s+overview|overview\s+of\s+the\s+.+?\s+plan)\b/i

/** Max characters for a value cell in the metadata Attribute|Value table. */
export const OVERVIEW_METADATA_MAX_CELL_CHARS = 220

const NARRATIVE_ROW_LABEL_RE =
  /\b(purpose\s+and\s+business\s+value|business\s+value|purpose\s+and\s+rationale|executive\s+summary|value\s+proposition)\b/i

function parsePipeTableRows(
  text: string
): { headers: string[]; rows: string[][] } | null {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /^\|/.test(l))
  if (lines.length < 2) return null

  const parseCells = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())

  const headers = parseCells(lines[0]!)
  const sepIdx = lines.findIndex((l) => /^\|[\s:|-]+\|/.test(l))
  const bodyStart = sepIdx >= 0 ? sepIdx + 1 : 1
  const rows = lines.slice(bodyStart).map(parseCells).filter((r) => r.some((c) => c.length > 0))
  if (rows.length === 0) return null
  return { headers, rows }
}

function isAttributeValueTable(headers: string[], rows: string[][]): boolean {
  const h = headers.map((c) => c.toLowerCase())
  if (h.some((c) => c.includes("attribute")) && h.some((c) => c.includes("value"))) {
    return true
  }
  if (headers.length >= 2 && rows.length >= 2) {
    const labels = rows.map((r) => r[0] ?? "").join(" ")
    return /\b(project\s+name|project\s+manager|sponsor|organization|authorization)\b/i.test(
      labels
    )
  }
  return false
}

function shouldPullRowToProse(label: string, value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (v.length > OVERVIEW_METADATA_MAX_CELL_CHARS) return true
  if (NARRATIVE_ROW_LABEL_RE.test(label)) return true
  return false
}

function rebuildMetadataTableMarkdown(rows: { label: string; value: string }[]): string {
  const lines = [
    "| Attribute | Value |",
    "| --- | --- |",
    ...rows.map((r) => `| ${r.label.replace(/\|/g, "\\|")} | ${r.value.replace(/\|/g, "\\|")} |`),
  ]
  return lines.join("\n")
}

function formatNarrativeProse(label: string, value: string): string {
  const cleanLabel = label.replace(/\*\*/g, "").trim()
  const suffix = /\*\*/.test(label) ? label.trim() : `**${cleanLabel}**`
  return `${suffix}\n\n${value.trim()}`
}

function splitAttributeValueTable(body: string): OverviewContentBlock[] | null {
  const parsed = parsePipeTableRows(body)
  if (!parsed || !isAttributeValueTable(parsed.headers, parsed.rows)) return null

  const valueCol = Math.max(1, parsed.headers.length - 1)
  const metadata: { label: string; value: string }[] = []
  const narratives: OverviewContentBlock[] = []

  for (const row of parsed.rows) {
    const label = row[0] ?? ""
    const value = (row.slice(1).join(" | ").trim() || row[valueCol]) ?? ""
    if (!label.trim()) continue

    if (shouldPullRowToProse(label, value)) {
      narratives.push({ kind: "prose", text: formatNarrativeProse(label, value) })
    } else {
      metadata.push({ label: label.trim(), value: value.trim() })
    }
  }

  const blocks: OverviewContentBlock[] = []
  if (metadata.length > 0) {
    blocks.push({ kind: "table", text: rebuildMetadataTableMarkdown(metadata) })
  }
  blocks.push(...narratives)
  return blocks.length > 0 ? blocks : null
}

/** Bold `**Label**: value` lines (template §1.1), not pipe tables. */
export function isBoldKeyValueOverviewBody(text: string): boolean {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  if (lines.length < 3) return false
  const boldKv = lines.filter((l) => /^\*\*[^*]+\*\*:?\s*.+/.test(l.trim()))
  return (
    boldKv.length >= 3 &&
    boldKv.length >= lines.length * 0.35 &&
    /\b(project\s+name|sponsor|purpose)\b/i.test(text)
  )
}

function splitBoldKeyValueOverview(body: string): OverviewContentBlock[] | null {
  if (!isBoldKeyValueOverviewBody(body)) return null

  const chunks = body
    .trim()
    .split(/\n(?=\*\*[^*\n]+\*\*(?:\s*\([^)]*\))?:?\s*)/)
    .map((c) => c.trim())
    .filter(Boolean)

  const metadata: { label: string; value: string }[] = []
  const narratives: OverviewContentBlock[] = []

  for (const chunk of chunks) {
    const firstLine = chunk.split("\n")[0] ?? ""
    const labelMatch = firstLine.match(/^\*\*([^*]+)\*\*(?:\s*\([^)]*\))?:?\s*(.*)$/)
    if (!labelMatch) {
      if (chunk.length > 40) narratives.push({ kind: "prose", text: chunk })
      continue
    }

    const label = labelMatch[1]!.trim()
    const inlineValue = labelMatch[2]?.trim() ?? ""
    const rest = chunk.slice(firstLine.length).trim()
    const value = [inlineValue, rest].filter(Boolean).join("\n\n").trim()

    if (!value && !inlineValue) continue

    const fullValue = value || inlineValue
    const displayLabel = `**${label}**`

    if (shouldPullRowToProse(label, fullValue)) {
      narratives.push({ kind: "prose", text: formatNarrativeProse(displayLabel, fullValue) })
    } else {
      metadata.push({ label, value: fullValue.replace(/\n+/g, " ") })
    }
  }

  const blocks: OverviewContentBlock[] = []
  if (metadata.length > 0) {
    blocks.push({ kind: "table", text: rebuildMetadataTableMarkdown(metadata) })
  }
  blocks.push(...narratives)
  return blocks.length > 0 ? blocks : null
}

export function isProjectOverviewSection(title?: string, body?: string): boolean {
  if (title && PROJECT_OVERVIEW_TITLE_RE.test(title)) return true
  if (!body) return false
  const hay = body.slice(0, 1200)
  return (
    /\b(project\s+name|project\s+manager)\b/i.test(hay) &&
    /\b(purpose\s+and\s+business\s+value|business\s+value)\b/i.test(hay)
  )
}

/**
 * Split §1.1 overview content so narrative fields are not crammed into Table cells.
 * Returns null when the body should use default classification.
 */
export function splitProjectOverviewContent(
  body: string,
  sectionTitle?: string
): OverviewContentBlock[] | null {
  const trimmed = body.trim()
  if (!trimmed) return null
  if (!isProjectOverviewSection(sectionTitle, trimmed)) return null

  const pipeSplit = splitAttributeValueTable(trimmed)
  if (pipeSplit) return pipeSplit

  const boldSplit = splitBoldKeyValueOverview(trimmed)
  if (boldSplit) return boldSplit

  return null
}
