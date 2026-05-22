/**
 * Short cover blurb for doc-cover (distinct from chapter 1 executive summary).
 */

/** Max chars for cover-summary sourceText in the layout plan. */
export const COVER_SUMMARY_MAX_CHARS = 480

/** Target sentence count for heuristic cover blurbs. */
export const COVER_SUMMARY_MAX_SENTENCES = 3

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (!normalized) return []
  const parts = normalized.split(/(?<=[.!?])\s+/)
  return parts.map((s) => s.trim()).filter((s) => s.length > 0)
}

/**
 * Compress narrative text to a cover teaser (2–3 sentences, hard char cap).
 */
export function buildCoverBlurb(
  fullSummary: string,
  options?: { maxChars?: number; maxSentences?: number }
): string {
  const maxChars = options?.maxChars ?? COVER_SUMMARY_MAX_CHARS
  const maxSentences = options?.maxSentences ?? COVER_SUMMARY_MAX_SENTENCES
  const trimmed = fullSummary.trim()
  if (!trimmed) return trimmed

  const sentences = splitSentences(trimmed)
  if (sentences.length === 0) {
    return trimmed.length <= maxChars
      ? trimmed
      : `${trimmed.slice(0, maxChars).replace(/\s+\S*$/, "").trim()}…`
  }

  let out = ""
  let count = 0
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence
    if (next.length > maxChars) break
    out = next
    count += 1
    if (count >= maxSentences) break
  }

  if (out.length >= 40) return out

  if (trimmed.length <= maxChars) return trimmed
  const truncated = trimmed.slice(0, maxChars).replace(/\s+\S*$/, "").trim()
  return truncated.endsWith("…") ? truncated : `${truncated}…`
}

/**
 * First substantive paragraph in preamble that looks like a tagline (not the title block).
 */
export function extractPreambleTagline(preambleBody?: string): string | undefined {
  if (!preambleBody?.trim()) return undefined
  const lines = preambleBody
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^---+$/.test(l) && !/^#{1,4}\s+/.test(l))

  for (const line of lines) {
    if (line.length < 24 || line.length > 320) continue
    if (/^[-*•]/.test(line)) continue
    if (line.split(/\s+/).length > 55) continue
    return line
  }
  return undefined
}

export function buildCoverBlurbFromSources(options: {
  fullSummary: string
  preambleBody?: string
  executiveSummaryBody?: string
  maxChars?: number
}): string {
  const tagline = extractPreambleTagline(options.preambleBody)
  if (tagline) {
    return buildCoverBlurb(tagline, { maxChars: options.maxChars })
  }

  const blurb = buildCoverBlurb(options.fullSummary, { maxChars: options.maxChars })
  const exec = options.executiveSummaryBody?.trim()
  if (exec && blurb.length >= 80) {
    const prefix = blurb.slice(0, Math.min(120, blurb.length))
    if (exec.startsWith(prefix) || exec.includes(blurb.slice(0, 200))) {
      const first = splitSentences(options.fullSummary)[0]
      if (first) {
        return buildCoverBlurb(first, { maxChars: options.maxChars, maxSentences: 2 })
      }
    }
  }
  return blurb
}
