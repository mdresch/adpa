/**
 * Lighthouse cover art served from /public/images/report-covers/.
 * Selection is deterministic (seed) with optional keyword routing from prompt/title.
 */

export const REPORT_COVER_BASE_PATH = "/images/report-covers"

/** Filenames copied into public/images/report-covers (keep in sync when adding assets). */
export const REPORT_COVER_FILENAMES = [
  "Lighhouses connected with sattelite.jpeg",
  "lighhouses far reaching beams.jpeg",
  "lighthouse brightlight 1.jpeg",
  "lighthouse brightlight 2.jpeg",
  "lighthouse brightlight 3.jpeg",
  "lighthouse brightlight 4.jpeg",
  "lighthouse brightlight 5.jpeg",
  "lighthouse brightlight.jpeg",
  "lighthouse objective key results key performance indicatiors.jpeg",
  "lighthouse sattelite connected global coverrage.jpeg",
  "lighthouse shield axzure.jpeg",
  "lighthouse shield digital lights.jpeg",
  "lighthouse shield far reaching beams.jpeg",
  "lighthouse shield key performance indicators.jpeg",
  "lighthouse shield kpi and okrs.jpeg",
  "lighthouse shield objective key results.jpeg",
  "lighthouse.jpeg",
  "lighthouses far reaching light beams.jpeg",
  "Lighthouses on an glboa.jpeg",
  "OIG1 (1).jpeg",
  "OIG1 (2).jpeg",
  "OIG1.jpeg",
  "OIG1.o2QeAohBpUXatr.jpeg",
  "OIG2 (1).jpeg",
  "OIG2 (2).jpeg",
  "OIG2 (3).jpeg",
  "OIG2.jpeg",
  "OIG4 (1).jpeg",
  "OIG4 (2).jpeg",
  "OIG4.jpeg",
  "OIG4.lLTfiTh.jpeg",
  "small lighhouse.jpeg",
] as const

const SHIELD_POOL = [
  "lighthouse shield axzure.jpeg",
  "lighthouse shield digital lights.jpeg",
  "lighthouse shield far reaching beams.jpeg",
  "lighthouse shield key performance indicators.jpeg",
  "lighthouse shield kpi and okrs.jpeg",
  "lighthouse shield objective key results.jpeg",
] as const

const KPI_OKR_POOL = [
  "lighthouse objective key results key performance indicatiors.jpeg",
  "lighthouse shield kpi and okrs.jpeg",
  "lighthouse shield objective key results.jpeg",
  "lighthouse shield key performance indicators.jpeg",
] as const

const GLOBAL_POOL = [
  "lighthouse sattelite connected global coverrage.jpeg",
  "Lighhouses connected with sattelite.jpeg",
  "Lighthouses on an glboa.jpeg",
] as const

const BEAMS_POOL = [
  "lighhouses far reaching beams.jpeg",
  "lighthouses far reaching light beams.jpeg",
  "lighthouse shield far reaching beams.jpeg",
] as const

const KEYWORD_POOLS: { pattern: RegExp; files: readonly string[] }[] = [
  { pattern: /\b(azure|microsoft cloud)\b/i, files: ["lighthouse shield axzure.jpeg"] },
  { pattern: /\b(security|compliance|shield|governance|nist|cyber)\b/i, files: SHIELD_POOL },
  { pattern: /\b(kpi|okr|metric|performance indicator|objective key)\b/i, files: KPI_OKR_POOL },
  { pattern: /\b(global|satellite|earth|coverage|connectivity|worldwide)\b/i, files: GLOBAL_POOL },
  { pattern: /\b(beam|reach|visibility|signal)\b/i, files: BEAMS_POOL },
]

export type ReportCoverPick = {
  filename: string
  url: string
  alt: string
}

export function reportCoverPublicUrl(filename: string): string {
  return `${REPORT_COVER_BASE_PATH}/${encodeURIComponent(filename)}`
}

function stableIndex(seed: string, length: number): number {
  if (length <= 0) return 0
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % length
}

function altFromFilename(filename: string): string {
  const base = filename.replace(/\.jpe?g$/i, "").replace(/\s+/g, " ").trim()
  return `Report cover: ${base}`
}

export function pickReportCoverImage(options: {
  seed?: string
  prompt?: string
  documentTitle?: string
}): ReportCoverPick {
  const haystack = `${options.prompt ?? ""} ${options.documentTitle ?? ""}`.trim()
  const seed = options.seed?.trim() || haystack || "adpa-report-cover"

  for (const { pattern, files } of KEYWORD_POOLS) {
    if (!pattern.test(haystack) || files.length === 0) continue
    const filename = files[stableIndex(seed, files.length)]!
    return { filename, url: reportCoverPublicUrl(filename), alt: altFromFilename(filename) }
  }

  const filename = REPORT_COVER_FILENAMES[stableIndex(seed, REPORT_COVER_FILENAMES.length)]!
  return { filename, url: reportCoverPublicUrl(filename), alt: altFromFilename(filename) }
}
