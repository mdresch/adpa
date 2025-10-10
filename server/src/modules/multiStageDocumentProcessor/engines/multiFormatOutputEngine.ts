/**
 * Multi-Format Output Engine
 * Converts documents from Markdown to various output formats
 */

import { marked } from 'marked'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import jsPDF from 'jspdf'
import puppeteer from 'puppeteer'
import { logger } from '../../../utils/logger'

export interface FormatConversionOptions {
  includeMetadata?: boolean
  styling?: {
    fontFamily?: string
    fontSize?: number
    lineHeight?: number
    margins?: {
      top?: number
      bottom?: number
      left?: number
      right?: number
    }
  }
  pageSettings?: {
    orientation?: 'portrait' | 'landscape'
    format?: 'A4' | 'Letter' | 'Legal'
  }
}

export interface ConversionResult {
  content: Buffer | string
  metadata: {
    format: string
    size: number
    pages?: number
    generatedAt: Date
    generator: string
  }
}

export class MultiFormatOutputEngine {
  private static instance: MultiFormatOutputEngine
  private browser: any = null

  private constructor() {}

  static getInstance(): MultiFormatOutputEngine {
    if (!MultiFormatOutputEngine.instance) {
      MultiFormatOutputEngine.instance = new MultiFormatOutputEngine()
    }
    return MultiFormatOutputEngine.instance
  }

  /**
   * Convert markdown content to specified format
   */
  async convertFromMarkdown(
    markdownContent: string,
    targetFormat: string,
    options: FormatConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      logger.info('Converting markdown to format', { targetFormat })

      switch (targetFormat.toLowerCase()) {
        case 'pdf':
          return await this.convertToPDF(markdownContent, options)
        case 'docx':
          return await this.convertToDOCX(markdownContent, options)
        case 'html':
          return await this.convertToHTML(markdownContent, options)
        case 'markdown':
        case 'md':
          return await this.formatMarkdown(markdownContent, options)
        case 'json':
          return await this.convertToJSON(markdownContent, options)
        case 'xml':
          return await this.convertToXML(markdownContent, options)
        case 'txt':
        case 'text':
          return await this.convertToText(markdownContent, options)
        default:
          throw new Error(`Unsupported format: ${targetFormat}`)
      }
    } catch (error) {
      logger.error('Format conversion failed', {
        targetFormat,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Convert markdown to PDF
   */
  private async convertToPDF(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      // First convert to HTML
      const htmlResult = await this.convertToHTML(markdownContent, options)
      const htmlContent = htmlResult.content as string

      // Use puppeteer for high-quality PDF generation
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
      }

      const page = await this.browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: options.pageSettings?.format || 'A4',
        landscape: options.pageSettings?.orientation === 'landscape',
        margin: {
          top: `${options.styling?.margins?.top || 20}mm`,
          bottom: `${options.styling?.margins?.bottom || 20}mm`,
          left: `${options.styling?.margins?.left || 20}mm`,
          right: `${options.styling?.margins?.right || 20}mm`
        },
        printBackground: true
      })

      await page.close()

      return {
        content: pdfBuffer,
        metadata: {
          format: 'pdf',
          size: pdfBuffer.length,
          pages: await this.estimatePageCount(markdownContent),
          generatedAt: new Date(),
          generator: 'puppeteer-pdf-engine'
        }
      }
    } catch (error) {
      logger.error('PDF conversion failed', { error: error.message })
      throw error
    }
  }

  /**
   * Convert markdown to DOCX
   */
  private async convertToDOCX(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      const sections = this.parseMarkdownSections(markdownContent)
      const docxSections: any[] = []

      for (const section of sections) {
        if (section.type === 'heading') {
          docxSections.push(
            new Paragraph({
              text: section.content,
              heading: this.getHeadingLevel(section.level),
              spacing: { after: 200 }
            })
          )
        } else if (section.type === 'paragraph') {
          docxSections.push(
            new Paragraph({
              children: [new TextRun(section.content)],
              spacing: { after: 120 }
            })
          )
        } else if (section.type === 'list') {
          for (const item of section.items) {
            docxSections.push(
              new Paragraph({
                children: [new TextRun(`• ${item}`)],
                spacing: { after: 60 },
                indent: { left: 720 }
              })
            )
          }
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docxSections
          }
        ]
      })

      const buffer = await Packer.toBuffer(doc)

      return {
        content: buffer,
        metadata: {
          format: 'docx',
          size: buffer.length,
          pages: await this.estimatePageCount(markdownContent),
          generatedAt: new Date(),
          generator: 'docx-engine'
        }
      }
    } catch (error) {
      logger.error('DOCX conversion failed', { error: error.message })
      throw error
    }
  }

  /**
   * Convert markdown to HTML
   */
  private async convertToHTML(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      // Configure marked options
      marked.setOptions({
        breaks: true,
        gfm: true
      })

      const htmlBody = marked(markdownContent)
      
      const styling = options.styling || {}
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        body {
            font-family: ${styling.fontFamily || 'Arial, sans-serif'};
            font-size: ${styling.fontSize || 14}px;
            line-height: ${styling.lineHeight || 1.6};
            margin: ${styling.margins?.top || 20}mm ${styling.margins?.right || 20}mm ${styling.margins?.bottom || 20}mm ${styling.margins?.left || 20}mm;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #bdc3c7; padding-bottom: 0.2em; }
        h3 { font-size: 1.3em; }
        p { margin-bottom: 1em; }
        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        li { margin-bottom: 0.5em; }
        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background-color: #f8f9fa;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 1em 0;
            padding-left: 1em;
            color: #7f8c8d;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 1em;
        }
        th, td {
            border: 1px solid #bdc3c7;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #ecf0f1;
            font-weight: bold;
        }
        @media print {
            body { margin: 0; }
            h1 { page-break-before: always; }
            h1:first-child { page-break-before: avoid; }
        }
    </style>
</head>
<body>
    ${htmlBody}
    ${options.includeMetadata ? this.generateMetadataFooter() : ''}
</body>
</html>`

      return {
        content: htmlContent,
        metadata: {
          format: 'html',
          size: Buffer.byteLength(htmlContent, 'utf8'),
          generatedAt: new Date(),
          generator: 'marked-html-engine'
        }
      }
    } catch (error) {
      logger.error('HTML conversion failed', { error: error.message })
      throw error
    }
  }

  /**
   * Format markdown content
   */
  private async formatMarkdown(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      // Clean and format the markdown
      let formattedContent = markdownContent
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .trim()

      // Add metadata if requested
      if (options.includeMetadata) {
        formattedContent += '\n\n---\n'
        formattedContent += `*Generated on ${new Date().toISOString()}*\n`
        formattedContent += `*Format: Markdown*`
      }

      return {
        content: formattedContent,
        metadata: {
          format: 'markdown',
          size: Buffer.byteLength(formattedContent, 'utf8'),
          generatedAt: new Date(),
          generator: 'markdown-formatter'
        }
      }
    } catch (error) {
      logger.error('Markdown formatting failed', { error: error.message })
      throw error
    }
  }

  /**
   * Convert markdown to JSON
   */
  private async convertToJSON(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      const sections = this.parseMarkdownSections(markdownContent)
      
      const jsonData = {
        format: 'json',
        generatedAt: new Date().toISOString(),
        content: {
          sections: sections,
          metadata: options.includeMetadata ? {
            wordCount: this.countWords(markdownContent),
            characterCount: markdownContent.length,
            estimatedReadingTime: Math.ceil(this.countWords(markdownContent) / 200)
          } : undefined
        }
      }

      const jsonContent = JSON.stringify(jsonData, null, 2)

      return {
        content: jsonContent,
        metadata: {
          format: 'json',
          size: Buffer.byteLength(jsonContent, 'utf8'),
          generatedAt: new Date(),
          generator: 'json-converter'
        }
      }
    } catch (error) {
      logger.error('JSON conversion failed', { error: error.message })
      throw error
    }
  }

  /**
   * Convert markdown to XML
   */
  private async convertToXML(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      const sections = this.parseMarkdownSections(markdownContent)
      
      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n'
      xmlContent += '<document>\n'
      xmlContent += `  <metadata>\n`
      xmlContent += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`
      xmlContent += `    <format>xml</format>\n`
      if (options.includeMetadata) {
        xmlContent += `    <wordCount>${this.countWords(markdownContent)}</wordCount>\n`
        xmlContent += `    <characterCount>${markdownContent.length}</characterCount>\n`
      }
      xmlContent += `  </metadata>\n`
      xmlContent += '  <content>\n'

      for (const section of sections) {
        xmlContent += `    <section type="${section.type}">\n`
        if (section.type === 'heading') {
          xmlContent += `      <level>${section.level}</level>\n`
        }
        xmlContent += `      <text><![CDATA[${section.content}]]></text>\n`
        if (section.items) {
          xmlContent += `      <items>\n`
          for (const item of section.items) {
            xmlContent += `        <item><![CDATA[${item}]]></item>\n`
          }
          xmlContent += `      </items>\n`
        }
        xmlContent += `    </section>\n`
      }

      xmlContent += '  </content>\n'
      xmlContent += '</document>'

      return {
        content: xmlContent,
        metadata: {
          format: 'xml',
          size: Buffer.byteLength(xmlContent, 'utf8'),
          generatedAt: new Date(),
          generator: 'xml-converter'
        }
      }
    } catch (error) {
      logger.error('XML conversion failed', { error: error.message })
      throw error
    }
  }

  /**
   * Convert markdown to plain text
   */
  private async convertToText(
    markdownContent: string,
    options: FormatConversionOptions
  ): Promise<ConversionResult> {
    try {
      // Remove markdown formatting
      let textContent = markdownContent
        .replace(/#{1,6}\s+/g, '') // Remove heading markers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove images, keep alt text
        .replace(/^[\s]*[-*+]\s+/gm, '• ') // Convert list markers
        .replace(/^\d+\.\s+/gm, '• ') // Convert numbered lists
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .trim()

      if (options.includeMetadata) {
        textContent += '\n\n---\n'
        textContent += `Generated on ${new Date().toISOString()}\n`
        textContent += `Format: Plain Text`
      }

      return {
        content: textContent,
        metadata: {
          format: 'text',
          size: Buffer.byteLength(textContent, 'utf8'),
          generatedAt: new Date(),
          generator: 'text-converter'
        }
      }
    } catch (error) {
      logger.error('Text conversion failed', { error: error.message })
      throw error
    }
  }

  /**
   * Parse markdown into structured sections
   */
  private parseMarkdownSections(markdownContent: string): any[] {
    const lines = markdownContent.split('\n')
    const sections: any[] = []
    let currentSection: any = null

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (!trimmedLine) {
        continue
      }

      // Check for headings
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          type: 'heading',
          level: headingMatch[1].length,
          content: headingMatch[2]
        }
        continue
      }

      // Check for list items
      const listMatch = trimmedLine.match(/^[-*+]\s+(.+)$/) || trimmedLine.match(/^\d+\.\s+(.+)$/)
      if (listMatch) {
        if (currentSection?.type !== 'list') {
          if (currentSection) {
            sections.push(currentSection)
          }
          currentSection = {
            type: 'list',
            items: []
          }
        }
        currentSection.items.push(listMatch[1])
        continue
      }

      // Regular paragraph
      if (currentSection?.type !== 'paragraph') {
        if (currentSection) {
          sections.push(currentSection)
        }
        currentSection = {
          type: 'paragraph',
          content: trimmedLine
        }
      } else {
        currentSection.content += ' ' + trimmedLine
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  /**
   * Get DOCX heading level
   */
  private getHeadingLevel(level: number): typeof HeadingLevel[keyof typeof HeadingLevel] {
    switch (level) {
      case 1: return HeadingLevel.HEADING_1
      case 2: return HeadingLevel.HEADING_2
      case 3: return HeadingLevel.HEADING_3
      case 4: return HeadingLevel.HEADING_4
      case 5: return HeadingLevel.HEADING_5
      case 6: return HeadingLevel.HEADING_6
      default: return HeadingLevel.HEADING_1
    }
  }

  /**
   * Estimate page count based on content
   */
  private async estimatePageCount(content: string): Promise<number> {
    const wordsPerPage = 250
    const wordCount = this.countWords(content)
    return Math.max(1, Math.ceil(wordCount / wordsPerPage))
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Generate metadata footer for HTML
   */
  private generateMetadataFooter(): string {
    return `
    <div style="margin-top: 2em; padding-top: 1em; border-top: 1px solid #bdc3c7; font-size: 0.9em; color: #7f8c8d;">
        <p><em>Generated on ${new Date().toISOString()}</em></p>
    </div>`
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}