/**
 * Extraction Context
 * 
 * Manages context for extraction operations, including project info, documents,
 * provider/model configuration, and logging/metrics hooks.
 */

import { logger } from '../../../utils/logger'
import type { ExtractionDocument, ExtractionOptions } from './ExtractionResult'
import { randomUUID } from 'crypto'

/**
 * Context for extraction operations
 * Provides all necessary information and utilities for entity extraction
 */
export class ExtractionContext {
  public readonly projectId: string
  public readonly userId: string
  public readonly documents: ExtractionDocument[]
  public readonly documentMap: Map<string, string>
  public readonly documentList: string
  public readonly provider: string
  public readonly model?: string
  public readonly documentContext: string
   public readonly correlationId: string
  public readonly options: ExtractionOptions

  constructor(
    projectId: string,
    userId: string,
    documents: ExtractionDocument[],
    options: ExtractionOptions
  ) {
    this.projectId = projectId
    this.userId = userId
    this.documents = documents
    this.provider = options.aiProvider || 'openai'
    this.model = options.aiModel
     this.correlationId = options.correlationId ?? randomUUID()
    this.options = options

    // Build document map for source document resolution
    this.documentMap = this.buildDocumentMap(documents)

    // Build document list string for AI prompts
    this.documentList = this.buildDocumentList(documents)

    // Build document context for AI prompts
    this.documentContext = this.buildDocumentContext(documents)
  }

  /**
   * Build document map for source document resolution
   * Maps document titles (normalized) to document IDs
   */
  private buildDocumentMap(
    documents: ExtractionDocument[]
  ): Map<string, string> {
    const documentMap = new Map<string, string>()

    documents.forEach(doc => {
      // Use title, fallback to template_name, fallback to document ID prefix
      const displayTitle = doc.title || doc.template_name || `Document ${doc.id.substring(0, 8)}`

      if (displayTitle && doc.id) {
        // Exact match (normalized)
        documentMap.set(displayTitle.toLowerCase().trim(), doc.id)

        // Normalized version (remove special chars for fuzzy matching)
        const normalizedTitle = displayTitle.toLowerCase().trim().replace(/[^\w\s]/g, '')
        if (normalizedTitle !== displayTitle.toLowerCase().trim()) {
          documentMap.set(normalizedTitle, doc.id)
        }

        // Also add template_name if different from title (for better matching)
        if (doc.template_name && doc.template_name !== displayTitle) {
          const normalizedTemplate = doc.template_name.toLowerCase().trim()
          documentMap.set(normalizedTemplate, doc.id)
        }
      }
    })

    return documentMap
  }

  /**
   * Build document list string for AI prompts (for source_document matching)
   */
  private buildDocumentList(documents: ExtractionDocument[]): string {
    return documents.map((doc, idx) => {
      // Use title, fallback to template_name, fallback to document ID prefix
      const displayTitle = doc.title || doc.template_name || `Document ${doc.id.substring(0, 8)}`
      return `- Document ${idx + 1}: "${displayTitle}"`
    }).join('\n')
  }

  /**
   * Build document context string for AI prompts
   */
  private buildDocumentContext(documents: ExtractionDocument[]): string {
    const sections: string[] = []

    // Filter out documents with no content
    const validDocuments = documents.filter(doc => doc.content && doc.content.trim().length > 0)

    if (validDocuments.length === 0) {
      logger.warn('[EXTRACTION] No documents with valid content found')
      return '[No document content available for extraction]'
    }

    if (validDocuments.length < documents.length) {
      logger.warn(`[EXTRACTION] Filtered out ${documents.length - validDocuments.length} documents with empty content`)
    }

    // Global limit: 200,000 characters total across all documents
    // (Approx 30-40k tokens, leaves plenty of head room for prompts/responses)
    const MAX_TOTAL_CONTEXT_CHARS = 200000;
    let totalChars = 0;

    validDocuments.forEach((doc, index) => {
      if (totalChars >= MAX_TOTAL_CONTEXT_CHARS) {
        if (index === 0 || sections[sections.length - 1] !== '[Remaining documents omitted for length]') {
          sections.push('[Remaining documents omitted for length]')
        }
        return
      }

      const header = `--- Document ${index + 1}: ${doc.title} ---`
      const metadata = `Template: ${doc.template_name || 'Unknown'}`

      // Individual doc limit: 50K chars
      const content = doc.content.length > 50000
        ? doc.content.substring(0, 50000) + '\n\n[Document truncated for length]'
        : doc.content

      // Check if adding this doc exceeds total limit
      const nextSectionLength = header.length + metadata.length + content.length + 10
      if (totalChars + nextSectionLength > MAX_TOTAL_CONTEXT_CHARS) {
        const remainingSpace = MAX_TOTAL_CONTEXT_CHARS - totalChars - header.length - metadata.length - 20
        if (remainingSpace > 1000) {
          sections.push(header)
          sections.push(metadata)
          sections.push('')
          sections.push(content.substring(0, remainingSpace) + '\n\n[Document truncated to fit total context budget]')
          sections.push('')
          totalChars = MAX_TOTAL_CONTEXT_CHARS
          sections.push('[Remaining documents omitted for length]')
        } else {
          sections.push('[Remaining documents omitted for length]')
          totalChars = MAX_TOTAL_CONTEXT_CHARS
        }
        return
      }

      sections.push(header)
      sections.push(metadata)
      sections.push('')
      sections.push(content)
      sections.push('')

      totalChars += nextSectionLength
    })

    const context = sections.join('\n')
    logger.debug(`[EXTRACTION] Built document context: ${validDocuments.length} documents, ${context.length} characters (Limit: ${MAX_TOTAL_CONTEXT_CHARS})`)
    return context
  }

  /**
   * Get document by ID
   */
  getDocumentById(id: string): ExtractionDocument | undefined {
    return this.documents.find(doc => doc.id === id)
  }

  /**
   * Get document by title (fuzzy match)
   */
  getDocumentByTitle(title: string): ExtractionDocument | undefined {
    const normalizedTitle = title.toLowerCase().trim()
    return this.documents.find(doc => {
      const docTitle = (doc.title || doc.template_name || '').toLowerCase().trim()
      return docTitle === normalizedTitle ||
        docTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(docTitle)
    })
  }

  /**
   * Check if context has valid documents
   */
  hasValidDocuments(): boolean {
    return this.documents.some(doc => doc.content && doc.content.trim().length > 0)
  }
}

