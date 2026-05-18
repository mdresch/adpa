/**
 * Normalize document.content from the API into a markdown/plain-text string.
 */
export function extractDocumentMarkdown(content: unknown): string {
  if (content == null) return ""
  if (typeof content === "string") return content
  if (typeof content === "object") {
    const record = content as Record<string, unknown>
    const candidate =
      record.markdown ?? record.text ?? record.content ?? record.body
    if (typeof candidate === "string") return candidate
    return JSON.stringify(content, null, 2)
  }
  return String(content)
}
