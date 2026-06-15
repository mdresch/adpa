export class InlineH8Parser {
  /**
   * Extracts structured JSON blocks prefixed with exactly eight hash symbols (########).
   * It handles potential malformed trailing markdown by matching the JSON structure.
   */
  static parse(text: string): any[] {
    const results: any[] = []
    
    // Look for ######## <type>: <json>
    // Uses a regex that allows newlines and captures the JSON object.
    const h8Pattern = /########\s+([a-zA-Z0-9_-]+)\s*:\s*(\{[\s\S]*?\})(?=\n|$)/g
    
    let match
    while ((match = h8Pattern.exec(text)) !== null) {
      try {
        const jsonStr = match[2].trim()
        const parsed = JSON.parse(jsonStr)
        results.push(parsed)
      } catch (e) {
        // If JSON parsing fails due to severe hallucinations, we skip this block.
        console.warn('Failed to parse H8 JSON payload', e)
      }
    }
    
    return results
  }
}
