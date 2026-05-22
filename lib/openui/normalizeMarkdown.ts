/**
 * Normalize markdown strings from source docs / OpenUI Lang before rendering.
 * Fixes common patterns that prevent emphasis from parsing (escaped or spaced asterisks).
 */
export function normalizeMarkdownContent(text: string): string {
  if (!text) return ""

  let s = text

  // OpenUI Lang / JSON escaping: \*\*bold\*\*
  s = s.replace(/\\\*\\\*/g, "**").replace(/\\\*/g, "*")

  // Spaced emphasis: ** bold ** or * italic * (not valid CommonMark)
  s = s.replace(/\*\*\s+([^*\n]+?)\s+\*\*/g, "**$1**")

  return s
}

/** Plain text for CardHeader / table labels — no markdown block syntax. */
export function plainHeaderText(text: string): string {
  if (!text) return ""
  return normalizeMarkdownContent(text)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .trim()
}
