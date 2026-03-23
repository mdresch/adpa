/**
 * JSON to Markdown Converter Utility
 * Converts structured JSON data to markdown format
 * Ensures output remains in markdown language as required by templates
 */

export interface JsonBlock {
  type: string
  content: any
}

export interface JsonDocument {
  blocks: JsonBlock[]
}

export class JsonToMarkdownConverter {
  
  /**
   * Convert JSON document structure to markdown format
   */
  static convertToMarkdown(jsonDocument: JsonDocument): string {
    if (!jsonDocument.blocks || !Array.isArray(jsonDocument.blocks)) {
      throw new Error('Invalid JSON document structure: blocks array is required')
    }

    const markdownLines: string[] = []

    jsonDocument.blocks.forEach(block => {
      const markdown = this.convertBlockToMarkdown(block)
      if (markdown) {
        markdownLines.push(markdown)
      }
    })

    return markdownLines.join('\n\n')
  }

  /**
   * Convert individual JSON block to markdown
   */
  private static convertBlockToMarkdown(block: JsonBlock): string {
    switch (block.type) {
      case 'header':
        return this.convertHeaderToMarkdown(block.content)
      case 'paragraph':
        return this.convertParagraphToMarkdown(block.content)
      case 'table':
        return this.convertTableToMarkdown(block.content)
      case 'list':
        return this.convertListToMarkdown(block.content)
      case 'code':
        return this.convertCodeToMarkdown(block.content)
      case 'quote':
        return this.convertQuoteToMarkdown(block.content)
      default:
        console.warn(`Unknown block type: ${block.type}`)
        return ''
    }
  }

  /**
   * Convert header block to markdown
   */
  private static convertHeaderToMarkdown(content: { text: string, level: number }): string {
    const level = content.level || 1
    const hashes = '#'.repeat(level)
    return `${hashes} ${content.text}`
  }

  /**
   * Convert paragraph block to markdown
   */
  private static convertParagraphToMarkdown(content: { text: string }): string {
    return content.text || ''
  }

  /**
   * Convert table block to markdown
   */
  private static convertTableToMarkdown(content: { headers: string[], rows: string[][] }): string {
    if (!content.headers || !Array.isArray(content.headers) || !content.rows || !Array.isArray(content.rows)) {
      return ''
    }

    const markdownTable: string[] = []
    
    // Header row
    const headerRow = '| ' + content.headers.join(' | ') + ' |'
    markdownTable.push(headerRow)
    
    // Separator row
    const separatorRow = '|' + content.headers.map(() => ' --- ').join('|') + '|'
    markdownTable.push(separatorRow)
    
    // Data rows
    content.rows.forEach(row => {
      if (Array.isArray(row) && row.length === content.headers.length) {
        const dataRow = '| ' + row.map(cell => cell || '').join(' | ') + ' |'
        markdownTable.push(dataRow)
      }
    })

    return markdownTable.join('\n')
  }

  /**
   * Convert list block to markdown
   */
  private static convertListToMarkdown(content: { items: string[], ordered?: boolean }): string {
    if (!content.items || !Array.isArray(content.items)) {
      return ''
    }

    const isOrdered = content.ordered || false
    const markdownList: string[] = []

    content.items.forEach((item, index) => {
      const prefix = isOrdered ? `${index + 1}.` : '-'
      markdownList.push(`${prefix} ${item}`)
    })

    return markdownList.join('\n')
  }

  /**
   * Convert code block to markdown
   */
  private static convertCodeToMarkdown(content: { code: string, language?: string }): string {
    const language = content.language || ''
    return `\`\`\`${language}\n${content.code || ''}\n\`\`\``
  }

  /**
   * Convert quote block to markdown
   */
  private static convertQuoteToMarkdown(content: { text: string, attribution?: string }): string {
    let quote = '> ' + (content.text || '').replace(/\n/g, '\n> ')
    if (content.attribution) {
      quote += `\n\n> — ${content.attribution}`
    }
    return quote
  }

  /**
   * Validate markdown syntax
   */
  static validateMarkdown(markdown: string): { isValid: boolean, errors: string[] } {
    const errors: string[] = []

    // Check for balanced headers
    const headerLevels = (markdown.match(/^#{1,6}\s/gm) || []) as string[]
    headerLevels.forEach((header) => {
      const level = header.trim().length
      if (level > 6) {
        errors.push(`Invalid header level: ${level}. Maximum is 6.`)
      }
    })

    // Check for table syntax
    const tableRows = (markdown.match(/\|.*\|/g) || []) as string[]
    tableRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell !== '')
      if (index > 0 && index < tableRows.length - 1) {
        // Check separator row
        if (!row.includes('---')) {
          errors.push(`Table row ${index + 1} missing separator dashes`)
        }
      }
    })

    // Check for list syntax
    const unorderedItems: string[] = (markdown.match(/^[\s]*[-*+]\s+/gm) || []) as string[]
    const orderedItems: string[] = (markdown.match(/^[\s]*\d+\.\s+/gm) || []) as string[]
    
    // Basic validation - ensure lists are properly formatted
    const allListItems = unorderedItems.concat(orderedItems)
    allListItems.forEach(item => {
      if (!item.match(/^[\s]*([-*+]|\d+\.)\s+/)) {
        errors.push(`Invalid list item format: ${item}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Convert JSON string directly to markdown
   */
  static convertJsonStringToMarkdown(jsonString: string): string {
    try {
      const jsonDocument = JSON.parse(jsonString) as JsonDocument
      return this.convertToMarkdown(jsonDocument)
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Ensure output is markdown format (not JSON)
   */
  static ensureMarkdownFormat(content: string): string {
    // If content looks like JSON, convert it
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        return this.convertJsonStringToMarkdown(content)
      } catch {
        // If conversion fails, return as-is but add warning
        return `<!-- Warning: Could not convert JSON to markdown -->\n\n${content}`
      }
    }
    
    // If content is already markdown, return as-is
    return content
  }

  /**
   * Extract metadata from markdown document
   */
  static extractMetadata(markdown: string): { [key: string]: string } {
    const metadata: { [key: string]: string } = {}
    
    // Extract YAML front matter
    const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/)
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1]
      const lines = frontMatter.split('\n')
      
      lines.forEach(line => {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim()
          const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '')
          metadata[key] = value
        }
      })
    }
    
    return metadata
  }

  /**
   * Add metadata to markdown document
   */
  static addMetadata(markdown: string, metadata: { [key: string]: string }): string {
    const existingMetadata = this.extractMetadata(markdown)
    const combinedMetadata = { ...existingMetadata, ...metadata }
    
    const metadataLines = Object.entries(combinedMetadata).map(([key, value]) => {
      return `${key}: "${value}"`
    })
    
    const frontMatter = `---\n${metadataLines.join('\n')}\n---\n\n`
    
    // Remove existing front matter if present
    const withoutFrontMatter = markdown.replace(/^---\n[\s\S]*?\n---\n\n/, '')
    
    return frontMatter + withoutFrontMatter
  }
}
