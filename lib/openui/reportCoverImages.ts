/**
 * Lighthouse cover art served from /public/images/report-covers/.
 * Selection is deterministic (seed) with optional keyword routing from prompt/title.
 */

export const REPORT_COVER_BASE_PATH = "/images/report-covers"

/** Filenames copied into public/images/report-covers (keep in sync when adding assets). */
/** Prefer for inline / gap-filler thumbnails in reports */
export const REPORT_THUMB_FILENAME = "small lighhouse.jpeg" as const

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

const REPORT_COVER_FILENAME_SET = new Set<string>(REPORT_COVER_FILENAMES)

/** Decode the filename segment from a public cover URL (encoded or not). */
export function decodeReportCoverFilenameFromUrl(imageUrl: string): string | null {
  const prefix = `${REPORT_COVER_BASE_PATH}/`
  if (!imageUrl.startsWith(prefix)) return null
  const segment = imageUrl.slice(prefix.length).split("?")[0] ?? ""
  if (!segment) return null
  try {
    return decodeURIComponent(segment).replace(/\+/g, " ")
  } catch {
    return null
  }
}

/**
 * Only allow complete, catalogued cover URLs. Partial stream fragments (truncated paths)
 * return null so <img> is not mounted and Next does not 404-spam the dev server.
 */
export function coerceReportCoverImageUrl(
  imageUrl: string | undefined | null
): string | null {
  if (!imageUrl || typeof imageUrl !== "string") return null
  const trimmed = imageUrl.trim()
  if (!trimmed.startsWith(`${REPORT_COVER_BASE_PATH}/`)) return null

  const filename = decodeReportCoverFilenameFromUrl(trimmed)
  if (!filename) return null
  if (!REPORT_COVER_FILENAME_SET.has(filename)) return null

  return reportCoverPublicUrl(filename)
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

function altFromFilename(
  filename: string,
  kind: "cover" | "section" | "thumb" = "cover"
): string {
  const base = filename.replace(/\.jpe?g$/i, "").replace(/\s+/g, " ").trim()
  if (kind === "thumb") return `Report illustration: ${base}`
  return kind === "cover" ? `Report cover: ${base}` : `Section illustration: ${base}`
}

function pickReportImageFromPools(seed: string, haystack: string, altKind: "cover" | "section"): ReportCoverPick {
  for (const { pattern, files } of KEYWORD_POOLS) {
    if (!pattern.test(haystack) || files.length === 0) continue
    const filename = files[stableIndex(seed, files.length)]!
    return { filename, url: reportCoverPublicUrl(filename), alt: altFromFilename(filename, altKind) }
  }

  const filename = REPORT_COVER_FILENAMES[stableIndex(seed, REPORT_COVER_FILENAMES.length)]!
  return { filename, url: reportCoverPublicUrl(filename), alt: altFromFilename(filename, altKind) }
}

export function pickReportCoverImage(options: {
  seed?: string
  prompt?: string
  documentTitle?: string
}): ReportCoverPick {
  const haystack = `${options.prompt ?? ""} ${options.documentTitle ?? ""}`.trim()
  const seed = options.seed?.trim() || haystack || "adpa-report-cover"
  return pickReportImageFromPools(seed, haystack, "cover")
}

/** Deterministic chapter/section art from the same public library (distinct seed from cover). */
export function pickReportSectionImage(options: {
  seed: string
  sectionTitle?: string
  prompt?: string
  documentTitle?: string
}): ReportCoverPick {
  const haystack = `${options.sectionTitle ?? ""} ${options.prompt ?? ""} ${options.documentTitle ?? ""}`.trim()
  const seed = `section::${options.seed.trim()}`
  return pickReportImageFromPools(seed, haystack, "section")
}

/** Small inline placeholder art (two-up under prose, or between tables). */
export function pickReportThumbImage(options: {
  seed: string
  sectionTitle?: string
  prompt?: string
  documentTitle?: string
  /** 0 = left / first, 1 = right / second in a pair */
  slot?: 0 | 1
}): ReportCoverPick {
  const haystack = `${options.sectionTitle ?? ""} ${options.prompt ?? ""} ${options.documentTitle ?? ""}`.trim()
  const seed = `thumb::${options.seed.trim()}::${options.slot ?? 0}`
  if (options.slot === 0 || options.slot === undefined) {
    const filename = REPORT_THUMB_FILENAME
    return {
      filename,
      url: reportCoverPublicUrl(filename),
      alt: altFromFilename(filename, "thumb"),
    }
  }
  const filename =
    REPORT_COVER_FILENAMES[
      stableIndex(seed, REPORT_COVER_FILENAMES.length)
    ]!
  return {
    filename,
    url: reportCoverPublicUrl(filename),
    alt: altFromFilename(filename, "thumb"),
  }
}
