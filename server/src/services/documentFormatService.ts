/**
 * Document Format Service
 * Handles document format conversion and storage
 */

import { MultiFormatOutputEngine, FormatConversionOptions, ConversionResult } from '../modules/multiStageDocumentProcessor/engines/multiFormatOutputEngine'
import { logger } from '../utils/logger'
import { Pool } from 'pg'

export interface DocumentFormatRequest {
  documentId: string
  targetFormat: string
  options?: FormatConversionOptions
}

export interface DocumentFormatResponse {
  documentId: string
  format: string
  content: Buffer | string
  metadata: any
  downloadUrl?: string
}

export class DocumentFormatService {
  private formatEngine: MultiFormatOutputEngine
  private db: Pool

  constructor(db: Pool) {
    this.formatEngine = MultiFormatOutputEngine.getInstance()
    this.db = db
  }

  /**
   * Convert document to specified format
   */
  async convertDocument(request: DocumentFormatRequest): Promise<DocumentFormatResponse> {
    try {
      logger.info('Converting document format', {
        documentId: request.documentId,
        targetFormat: request.targetFormat
      })

      // Fetch document from database
      const document = await this.getDocument(request.documentId)
      if (!document) {
        throw new Error(`Document not found: ${request.documentId}`)
      }

      // Get markdown content
      const markdownContent = this.extractMarkdownContent(document)
      if (!markdownContent) {
        throw new Error(`No markdown content available for document: ${request.documentId}`)
      }

      // Convert to target format
      const conversionResult = await this.formatEngine.convertFromMarkdown(
        markdownContent,
        request.targetFormat,
        request.options || {}
      )

      // Update document format metadata
      await this.updateFormatMetadata(request.documentId, request.targetFormat, conversionResult.metadata)

      return {
        documentId: request.documentId,
        format: request.targetFormat,
        content: conversionResult.content,
        metadata: conversionResult.metadata
      }

    } catch (error) {
      logger.error('Document format conversion failed', {
        documentId: request.documentId,
        targetFormat: request.targetFormat,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get available formats for a document
   */
  async getAvailableFormats(documentId: string): Promise<string[]> {
    try {
      const result = await this.db.query(
        'SELECT output_formats FROM documents WHERE id = $1',
        [documentId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Document not found: ${documentId}`)
      }

      const outputFormats = result.rows[0].output_formats
      return Array.isArray(outputFormats) ? outputFormats : ['markdown', 'html', 'pdf', 'docx']

    } catch (error) {
      logger.error('Failed to get available formats', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Batch convert multiple documents
   */
  async batchConvertDocuments(requests: DocumentFormatRequest[]): Promise<DocumentFormatResponse[]> {
    const results: DocumentFormatResponse[] = []
    const errors: any[] = []

    for (const request of requests) {
      try {
        const result = await this.convertDocument(request)
        results.push(result)
      } catch (error) {
        errors.push({
          documentId: request.documentId,
          error: error.message
        })
      }
    }

    if (errors.length > 0) {
      logger.warn('Some documents failed to convert', { errors })
    }

    return results
  }

  /**
   * Store document with markdown content
   */
  async storeDocumentWithMarkdown(
    documentId: string,
    markdownContent: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE documents 
         SET markdown_content = $1, 
             format_metadata = $2,
             output_formats = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          markdownContent,
          JSON.stringify({
            ...metadata,
            primary_format: 'markdown',
            updated_at: new Date().toISOString(),
            supports_conversion: true
          }),
          JSON.stringify(['markdown', 'html', 'pdf', 'docx', 'json', 'xml', 'txt']),
          documentId
        ]
      )

      logger.info('Document stored with markdown content', { documentId })

    } catch (error) {
      logger.error('Failed to store document with markdown', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get document format history
   */
  async getFormatHistory(documentId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT format_metadata, updated_at 
         FROM documents 
         WHERE id = $1 
         ORDER BY updated_at DESC`,
        [documentId]
      )

      return result.rows.map(row => ({
        metadata: row.format_metadata,
        updatedAt: row.updated_at
      }))

    } catch (error) {
      logger.error('Failed to get format history', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Validate format conversion options
   */
  validateConversionOptions(format: string, options: FormatConversionOptions): boolean {
    const supportedFormats = ['pdf', 'docx', 'html', 'markdown', 'md', 'json', 'xml', 'txt', 'text']
    
    if (!supportedFormats.includes(format.toLowerCase())) {
      throw new Error(`Unsupported format: ${format}`)
    }

    // Validate format-specific options
    if (format === 'pdf' && options.pageSettings) {
      const validOrientations = ['portrait', 'landscape']
      const validFormats = ['A4', 'Letter', 'Legal']
      
      if (options.pageSettings.orientation && !validOrientations.includes(options.pageSettings.orientation)) {
        throw new Error(`Invalid page orientation: ${options.pageSettings.orientation}`)
      }
      
      if (options.pageSettings.format && !validFormats.includes(options.pageSettings.format)) {
        throw new Error(`Invalid page format: ${options.pageSettings.format}`)
      }
    }

    return true
  }

  /**
   * Get document from database
   */
  private async getDocument(documentId: string): Promise<any> {
    const result = await this.db.query(
      'SELECT * FROM documents WHERE id = $1',
      [documentId]
    )

    return result.rows.length > 0 ? result.rows[0] : null
  }

  /**
   * Extract markdown content from document
   */
  private extractMarkdownContent(document: any): string {
    // First check if markdown_content exists
    if (document.markdown_content) {
      return document.markdown_content
    }

    // Try to extract from content field
    if (document.content) {
      if (typeof document.content === 'string') {
        return document.content
      }

      if (typeof document.content === 'object') {
        // Handle structured content
        if (document.content.sections) {
          let markdown = ''
          for (const section of document.content.sections) {
            if (section.title) {
              markdown += `## ${section.title}\n\n`
            }
            if (section.content) {
              markdown += `${section.content}\n\n`
            }
          }
          return markdown
        }

        if (document.content.text) {
          return document.content.text
        }

        if (document.content.markdown) {
          return document.content.markdown
        }
      }
    }

    // Fallback to basic document info
    return `# ${document.name || 'Document'}\n\n*No content available*`
  }

  /**
   * Update format metadata in database
   */
  private async updateFormatMetadata(
    documentId: string,
    format: string,
    conversionMetadata: any
  ): Promise<void> {
    try {
      const currentResult = await this.db.query(
        'SELECT format_metadata FROM documents WHERE id = $1',
        [documentId]
      )

      const currentMetadata = currentResult.rows[0]?.format_metadata || {}
      const updatedMetadata = {
        ...currentMetadata,
        last_conversion: {
          format,
          timestamp: new Date().toISOString(),
          metadata: conversionMetadata
        },
        conversion_history: [
          ...(currentMetadata.conversion_history || []),
          {
            format,
            timestamp: new Date().toISOString(),
            size: conversionMetadata.size
          }
        ].slice(-10) // Keep last 10 conversions
      }

      await this.db.query(
        'UPDATE documents SET format_metadata = $1 WHERE id = $2',
        [JSON.stringify(updatedMetadata), documentId]
      )

    } catch (error) {
      logger.error('Failed to update format metadata', {
        documentId,
        format,
        error: error.message
      })
      // Don't throw here as this is not critical
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.formatEngine.cleanup()
  }
}