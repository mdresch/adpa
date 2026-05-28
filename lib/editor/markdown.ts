import MarkdownIt from "markdown-it"

const md = new MarkdownIt({ html: true, breaks: true })

// Hook in the same block parser used by Tiptap so the initial HTML render catches the pills
md.block.ruler.before("paragraph", "entity_pill_block", (state: any, startLine: number, endLine: number, silent: boolean) => {
  const startPos = state.bMarks[startLine] + state.tShift[startLine]
  const startMax = state.eMarks[startLine]
  const firstLineText = state.src.slice(startPos, startMax)

  // Quick check if it starts with the tag
  const match = firstLineText.match(/^########\s+([a-zA-Z0-9_-]+):\s*(.*)$/)
  if (!match) return false
  if (silent) return true

  const entityType = match[1]
  let jsonStr = match[2].trim()
  if (jsonStr.endsWith('\\')) jsonStr = jsonStr.slice(0, -1).trim()

  let currentLine = startLine
  let parsedData = null
  let foundEnd = false

  while (currentLine < endLine) {
    try {
      parsedData = JSON.parse(jsonStr)
      foundEnd = true
      break
    } catch (e) {
      currentLine++
      if (currentLine >= endLine) break
      
      const pos = state.bMarks[currentLine] + state.tShift[currentLine]
      const max = state.eMarks[currentLine]
      let nextLine = state.src.slice(pos, max)
      if (nextLine.endsWith('\\')) nextLine = nextLine.slice(0, -1)
      
      jsonStr += "\n" + nextLine
    }
  }

  if (!foundEnd) return false // Abort if we never found valid JSON

  // We parsed it successfully! Re-stringify it cleanly for the HTML attributes
  const cleanJson = JSON.stringify(parsedData)
  const escapedJson = cleanJson
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  
  const escapedType = entityType
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

  const token = state.push("html_block", "", 0)
  token.content = `<span data-entity-pill data-entity-type="${escapedType}" data-json-str="${escapedJson}"></span>`
  
  state.line = currentLine + 1
  return true
})

export function renderEditorMarkdown(markdown: string): string {
  return md.render(markdown)
}