/**
 * Enhanced Entity Extraction Service with Location Tracking
 * Provides AI extraction with precise text location capture for highlighting
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { aiCacheService } from './aiCacheService'

export interface ExtractedEntity {
  entity_type: string
  entity_name: string
  source_document: string
  source_document_id?: string
  source_text_start?: number
  source_text_end?: number
  source_line_start?: number
  source_line_end?: number
  source_context?: string
  source_snippet?: string
  [key: string]: any
}

export interface EntityLocationData {
  text: string
  startChar: number
  endChar: number
  startLine: number
  endLine: number
  context: string
  snippet: string
  documentId: string
}

export class EnhancedEntityExtractionService {
  
  /**
   * Extract entities with precise location information
   */
  async extractEntitiesWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    entityType: string,
    prompt: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<ExtractedEntity[]> {
    try {
      logger.info(`[ENHANCED-EXTRACTION] Starting ${entityType} extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const enhancedPrompt = this.buildLocationAwarePrompt(documents, entityType, prompt)
      
      // Use AI service for extraction
      const response = await aiService.generateWithFallback({
        prompt: enhancedPrompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.2, // Lower temperature for more precise extraction
        max_tokens: 8000
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      // Parse and enhance with location data
      const parsed = this.parseAIResponse(response.content)
      const entities = parsed[entityType.toLowerCase()] || []
      
      logger.info(`[ENHANCED-EXTRACTION] AI returned ${entities.length} ${entityType} entities`, {
        sampleEntity: entities[0] || 'No entities found',
        allKeys: entities.length > 0 ? Object.keys(entities[0]) : []
      })
      
      // Enhance each entity with location information
      const enhancedEntities = entities.map((entity: any) => {
        // First try to use AI-provided location data if available
        let locationData = this.extractLocationData(entity, documents)
        
        // If AI didn't provide location data, try to find it using entity name
        if (!locationData.text || locationData.startChar === 0) {
          logger.info(`[ENHANCED-EXTRACTION] AI didn't provide location data for entity: ${entity.entity_name}, attempting to find it`)
          locationData = this.extractLocationData(entity, documents)
        }
        
        return {
          ...entity,
          source_document_id: locationData.documentId || entity.source_document_id || '',
          source_text_start: locationData.startChar,
          source_text_end: locationData.endChar,
          source_line_start: locationData.startLine,
          source_line_end: locationData.endLine,
          source_context: locationData.context,
          source_snippet: locationData.snippet
        }
      })

      logger.info(`[ENHANCED-EXTRACTION] Enhanced ${enhancedEntities.length} ${entityType} with locations`, {
        sampleEnhanced: enhancedEntities[0] || 'No enhanced entities'
      })

      logger.info(`[ENHANCED-EXTRACTION] Extracted ${enhancedEntities.length} ${entityType} with locations`)
      return enhancedEntities

    } catch (error) {
      logger.error(`[ENHANCED-EXTRACTION] Failed to extract ${entityType} with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Build location-aware prompt for AI extraction
   */
  private buildLocationAwarePrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    entityType: string,
    basePrompt: string
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    
    return `${basePrompt}

CRITICAL LOCATION TRACKING REQUIREMENTS:
For each ${entityType} extracted, you MUST provide precise location data:

{
  "${entityType.toLowerCase()}": [
    {
      "entity_type": "milestone" | "deliverable" | "activity" | "phase" | "resource",
      "entity_name": "Name of the entity",
      "source_document": "EXACT document title from the provided documents",
      "source_text_start": 1234, // REQUIRED: Character position where entity text starts (0-based)
      "source_text_end": 1456, // REQUIRED: Character position where entity text ends (0-based)
      "source_line_start": 45, // REQUIRED: Line number where entity starts (1-based)
      "source_line_end": 47, // REQUIRED: Line number where entity ends (1-based)
      "source_context": "Surrounding text context (±100 characters)", // REQUIRED
      "source_snippet": "Exact text that was extracted" // REQUIRED
      // ... other entity-specific fields
    }
  ]
}

LOCATION TRACKING INSTRUCTIONS:
1. Find the exact text in the document that corresponds to each entity
2. Record character positions (start/end) using 0-based indexing
3. Record line numbers (start/end) using 1-based indexing
4. Extract surrounding context (±100 characters) for reference
5. Include the exact snippet that was matched
6. Be precise - these locations enable yellow highlighting in the UI
7. ALL location fields (source_text_start, source_text_end, source_line_start, source_line_end, source_context, source_snippet) are REQUIRED

${documentContext}

RESPONSE FORMAT:
Provide ONLY a valid JSON response with the exact structure shown above. Do not include explanations or markdown formatting.

Return ONLY valid JSON with the ${entityType.toLowerCase()} array.`
  }

  /**
   * Build document context with line numbers for location tracking
   */
  private buildDocumentContextWithLineNumbers(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    return documents.map((doc, docIndex) => {
      const lines = doc.content.split('\n')
      const numberedContent = lines.map((line, lineIndex) => 
        `${(lineIndex + 1).toString().padStart(3, ' ')}: ${line}`
      ).join('\n')
      
      return `Document ${docIndex + 1}: "${doc.title}" (ID: ${doc.id})
${numberedContent}
---`
    }).join('\n\n')
  }

  /**
   * Extract location data from entity and documents
   */
  private extractLocationData(
    entity: any,
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): EntityLocationData {
    // Find the source document
    const sourceDoc = documents.find(doc => 
      doc.title === entity.source_document || 
      doc.template_name === entity.source_document ||
      doc.id === entity.source_document_id
    )

    if (!sourceDoc) {
      return {
        text: '',
        startChar: 0,
        endChar: 0,
        startLine: 0,
        endLine: 0,
        context: '',
        snippet: '',
        documentId: ''
      }
    }

    const content = sourceDoc.content
    const lines = content.split('\n')
    
    // Try to find the entity text in the document
    const entityText = entity.entity_name || entity.name || ''
    let bestMatch: EntityLocationData = {
      text: '',
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      documentId: sourceDoc.id
    }

    // Search for the entity text in the document
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineStartPos = content.substring(0, content.indexOf(line)).length
      
      // Find all occurrences of the entity text in this line
      const regex = new RegExp(this.escapeRegex(entityText), 'gi')
      let match
      
      while ((match = regex.exec(line)) !== null) {
        const startChar = lineStartPos + match.index
        const endChar = startChar + match[0].length
        const startLine = i + 1
        const endLine = i + 1
        
        // Get context (±100 characters)
        const contextStart = Math.max(0, startChar - 100)
        const contextEnd = Math.min(content.length, endChar + 100)
        const context = content.substring(contextStart, contextEnd)
        
        // Get snippet (the exact matched text)
        const snippet = match[0]
        
        // Use the first match found
        bestMatch = {
          text: snippet,
          startChar,
          endChar,
          startLine,
          endLine,
          context,
          snippet,
          documentId: sourceDoc.id
        }
        break
      }
      
      if (bestMatch.text) break
    }

    return bestMatch
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
      logger.warn('[ENHANCED-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
