/**
 * Markdown Highlighting Service
 * Wraps extracted entities in h5/h6 tags for simple yellow highlighting
 * Much simpler than complex position tracking
 */

import { logger } from '../utils/logger'

export interface MarkdownEntity {
  entity_type: string
  entity_name: string
  source_document: string
  [key: string]: any
}

export class MarkdownHighlightingService {

  /**
   * Wrap entities in markdown with h5/h6 tags for highlighting
   */
  wrapEntitiesInMarkdown(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    entities: MarkdownEntity[]
  ): Array<{ id: string; title: string; content: string; template_name?: string }> {
    try {
      logger.info(`[MARKDOWN-HIGHLIGHTING] Wrapping ${entities.length} entities in markdown`)

      // Create a copy of documents to modify
      const highlightedDocuments = documents.map(doc => ({
        ...doc,
        content: doc.content
      }))

      // Process each entity and wrap it in the corresponding document
      entities.forEach((entity, index) => {
        const docIndex = highlightedDocuments.findIndex(doc =>
          doc.title === entity.source_document ||
          doc.template_name === entity.source_document ||
          doc.id === entity.source_document_id
        )

        if (docIndex === -1) {
          logger.warn(`[MARKDOWN-HIGHLIGHTING] Document not found for entity: ${entity.entity_name}`)
          return
        }

        const document = highlightedDocuments[docIndex]
        const entityText = entity.entity_name || entity.name || ''

        if (!entityText) {
          logger.warn(`[MARKDOWN-HIGHLIGHTING] Empty entity name for: ${entity.entity_type}`)
          return
        }

        // Standardized to h5 as per requirements
        const tag = 'h5'

        // Wrap the entity in markdown heading tags
        const wrappedEntity = `<${tag}>${entityText}</${tag}>`

        // Replace all occurrences of the entity text with the wrapped version
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${this.escapeRegex(entityText)}\\b`, 'g')
        document.content = document.content.replace(regex, wrappedEntity)

        // Store the tag used for this entity
        entity.entity_markdown_tag = tag
        entity.markdown_highlighted_content = document.content

        logger.debug(`[MARKDOWN-HIGHLIGHTING] Wrapped "${entityText}" in <${tag}> tags in document "${document.title}"`)
      })

      logger.info(`[MARKDOWN-HIGHLIGHTING] Successfully wrapped entities in markdown`)
      return highlightedDocuments

    } catch (error) {
      logger.error(`[MARKDOWN-HIGHLIGHTING] Failed to wrap entities in markdown`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return documents // Return original documents on error
    }
  }

  /**
   * Update AI prompt to request markdown wrapping
   */
  buildMarkdownWrappingPrompt(basePrompt: string): string {
    return `${basePrompt}

IMPORTANT MARKDOWN HIGHLIGHTING REQUIREMENTS:
For each entity extracted, you MUST wrap the entity name in HTML heading tags in the original document context:

1. Use <h5>Entity Name</h5> for all occurrences
2. This enables yellow highlighting in the UI
3. Only wrap the entity name, not surrounding text

Example:
- Original: "Testing Complete on 2026-02-28"
- With highlighting: "<h5>Testing Complete</h5> on 2026-02-28"

This simple approach provides visual highlighting without complex position tracking.`
  }

  /**
   * Extract entities with markdown wrapping
   */
  async extractEntitiesWithMarkdownWrapping(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    entityType: string,
    prompt: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<MarkdownEntity[]> {
    try {
      logger.info(`[MARKDOWN-EXTRACTION] Starting ${entityType} extraction with markdown wrapping`)

      // Build enhanced prompt
      const enhancedPrompt = this.buildMarkdownWrappingPrompt(prompt)

      // Use AI service (reuse existing logic)
      const { aiService } = await Promise.resolve().then(() => require())
      const response = await aiService.generateWithFallback({
        prompt: enhancedPrompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.2,
        max_tokens: 8000
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      // Parse response
      const parsed = this.parseAIResponse(response.content)
      const entities = parsed[entityType.toLowerCase()] || []

      // Wrap entities in markdown
      this.wrapEntitiesInMarkdown(documents, entities)

      logger.info(`[MARKDOWN-EXTRACTION] Extracted and wrapped ${entities.length} ${entityType}`)
      return entities

    } catch (error) {
      logger.error(`[MARKDOWN-EXTRACTION] Failed to extract ${entityType} with markdown wrapping`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Escape special characters for regex
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Parse AI response (reuse existing logic)
   */
  private parseAIResponse(content: string): any {
    try {
      // Look for JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return {}
    } catch (error) {
      logger.warn('[MARKDOWN-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }

  /**
   * Generate CSS for highlighting h5/h6 tags
   */
  getHighlightingCSS(): string {
    return `
      /* Yellow highlighting for extracted entities */
      h5, h6 {
        background-color: #fef08a !important;
        color: #713f12 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        display: inline-block !important;
        font-weight: 600 !important;
        font-size: 0.9em !important;
        margin: 0 2px !important;
      }
      
      h5 {
        background-color: #fef08a !important; /* Light yellow */
      }
      
      h6 {
        background-color: #fde047 !important; /* Slightly darker yellow */
      }
      
      /* Hover effects */
      h5:hover, h6:hover {
        background-color: #facc15 !important;
        cursor: pointer !important;
        transform: scale(1.02) !important;
        transition: all 0.2s ease !important;
      }
    `
  }
}
