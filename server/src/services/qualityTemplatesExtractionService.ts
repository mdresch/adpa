/**
 * Quality & Templates Extraction Service with Location Tracking
 * Extracts quality audits, best practices, and template improvements with precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedQualityAudit {
  id?: string
  title: string
  description: string
  audit_type?: string
  category?: string
  priority?: string
  status?: string
  audit_date?: string
  auditor?: string
  scope?: string
  criteria?: string[]
  findings?: string[]
  recommendations?: string[]
  follow_up_required?: boolean
  source_document: string
  source_document_id?: string
  source_text_start?: number
  source_text_end?: number
  source_line_start?: number
  source_line_end?: number
  source_context?: string
  source_snippet?: string
  entity_markdown_tag?: string
}

export interface ExtractedBestPractice {
  id?: string
  title: string
  description: string
  category?: string
  practice_type?: string
  priority?: string
  status?: string
  applicability?: string
  benefits?: string[]
  implementation_steps?: string[]
  success_factors?: string[]
  common_pitfalls?: string[]
  related_standards?: string[]
  source_document: string
  source_document_id?: string
  source_text_start?: number
  source_text_end?: number
  source_line_start?: number
  source_line_end?: number
  source_context?: string
  source_snippet?: string
  entity_markdown_tag?: string
}

export interface ExtractedTemplateImprovement {
  id?: string
  title: string
  description: string
  template_name?: string
  improvement_type?: string
  priority?: string
  status?: string
  current_issue?: string
  proposed_solution?: string
  benefits?: string[]
  implementation_effort?: string
  impact_assessment?: string
  suggested_by?: string
  review_date?: string
  source_document: string
  source_document_id?: string
  source_text_start?: number
  source_text_end?: number
  source_line_start?: number
  source_line_end?: number
  source_context?: string
  source_snippet?: string
  entity_markdown_tag?: string
}

export class QualityTemplatesExtractionService {
  
  /**
   * Extract quality & templates entities with location tracking
   */
  async extractQualityTemplatesWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<{
    quality_audits: ExtractedQualityAudit[]
    best_practices: ExtractedBestPractice[]
    template_improvements: ExtractedTemplateImprovement[]
  }> {
    try {
      logger.info(`[QUALITY-TEMPLATES-EXTRACTION] Starting quality & templates extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildQualityTemplatesPrompt(documents)
      
      // Use AI service for extraction
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.2,
        max_tokens: 8000
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      // Parse response
      const parsed = this.parseAIResponse(response.content)
      
      // Enhance each entity with location information
      const enhanceWithLocations = (entities: any[], entityType: string) => {
        return entities.map((entity: any) => {
          const locationData = this.extractLocationData(entity, documents)
          return {
            ...entity,
            source_text_start: locationData.startChar,
            source_text_end: locationData.endChar,
            source_line_start: locationData.startLine,
            source_line_end: locationData.endLine,
            source_context: locationData.context,
            source_snippet: locationData.snippet,
            entity_markdown_tag: locationData.tag
          }
        })
      }

      const quality_audits = enhanceWithLocations(parsed.quality_audits || [], 'quality_audit')
      const best_practices = enhanceWithLocations(parsed.best_practices || [], 'best_practice')
      const template_improvements = enhanceWithLocations(parsed.template_improvements || [], 'template_improvement')

      logger.info(`[QUALITY-TEMPLATES-EXTRACTION] Extracted ${quality_audits.length} quality audits, ${best_practices.length} best practices, ${template_improvements.length} template improvements with locations`)
      
      return { quality_audits, best_practices, template_improvements }

    } catch (error) {
      logger.error(`[QUALITY-TEMPLATES-EXTRACTION] Failed to extract quality & templates entities with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return { quality_audits: [], best_practices: [], template_improvements: [] }
    }
  }

  /**
   * Build quality & templates extraction prompt with location tracking
   */
  private buildQualityTemplatesPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)
    
    return `You are analyzing project documents to extract QUALITY & TEMPLATES ENTITIES - quality audits, best practices, and template improvements.

Look for:
QUALITY AUDITS:
- Quality assessment activities and reviews
- Process audits and compliance checks
- Quality control and assurance activities
- Performance evaluations and assessments
- Audit findings and recommendations
- Quality metrics and measurements

BEST PRACTICES:
- Industry best practices and standards
- Proven methodologies and approaches
- Optimization techniques and strategies
- Process improvement recommendations
- Quality standards and guidelines
- Implementation guidelines and frameworks

TEMPLATE IMPROVEMENTS:
- Template enhancement suggestions
- Documentation improvement ideas
- Process template optimizations
- Standard template updates
- Format and structure improvements
- Content and usability enhancements

CRITICAL POSITION TRACKING:
For each entity extracted, you MUST provide precise location data:

{
  "quality_audits": [
    {
      "title": "Quality audit title",
      "description": "Quality audit description",
      "audit_type": "process|compliance|performance|security|documentation",
      "category": "internal|external|supplier|customer",
      "priority": "high|medium|low",
      "status": "planned|in_progress|completed|follow_up_required",
      "audit_date": "YYYY-MM-DD",
      "auditor": "Person or team",
      "scope": "Audit scope and boundaries",
      "criteria": ["Criterion 1", "Criterion 2"],
      "findings": ["Finding 1", "Finding 2"],
      "recommendations": ["Recommendation 1", "Recommendation 2"],
      "follow_up_required": true,
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "best_practices": [
    {
      "title": "Best practice title",
      "description": "Best practice description",
      "category": "process|technical|management|quality|communication",
      "practice_type": "methodology|standard|guideline|framework|technique",
      "priority": "critical|important|moderate|optional",
      "status": "active|deprecated|under_review",
      "applicability": "When and where this practice applies",
      "benefits": ["Benefit 1", "Benefit 2"],
      "implementation_steps": ["Step 1", "Step 2"],
      "success_factors": ["Factor 1", "Factor 2"],
      "common_pitfalls": ["Pitfall 1", "Pitfall 2"],
      "related_standards": ["Standard 1", "Standard 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "template_improvements": [
    {
      "title": "Template improvement title",
      "description": "Template improvement description",
      "template_name": "Name of the template to improve",
      "improvement_type": "content|structure|format|usability|automation",
      "priority": "high|medium|low",
      "status": "proposed|under_review|approved|implemented",
      "current_issue": "What needs to be improved",
      "proposed_solution": "How to improve it",
      "benefits": ["Benefit 1", "Benefit 2"],
      "implementation_effort": "low|medium|high",
      "impact_assessment": "Expected impact and benefits",
      "suggested_by": "Person or role suggesting improvement",
      "review_date": "YYYY-MM-DD",
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
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

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Return ONLY valid JSON with quality_audits, best_practices, and template_improvements arrays.`
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
   * Build document list for source document matching
   */
  private buildDocumentList(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    return documents.map((doc, idx) => {
      const displayTitle = doc.title || doc.template_name || `Document ${doc.id.substring(0, 8)}`
      return `- Document ${idx + 1}: "${displayTitle}"`
    }).join('\n')
  }

  /**
   * Extract location data from entity and documents
   */
  private extractLocationData(
    entity: any,
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): {
    startChar: number
    endChar: number
    startLine: number
    endLine: number
    context: string
    snippet: string
    tag: string
  } {
    // Find the source document
    const sourceDoc = documents.find(doc => 
      doc.title === entity.source_document || 
      doc.template_name === entity.source_document ||
      doc.id === entity.source_document_id
    )

    if (!sourceDoc) {
      return {
        startChar: 0,
        endChar: 0,
        startLine: 0,
        endLine: 0,
        context: '',
        snippet: '',
        tag: 'h5'
      }
    }

    const content = sourceDoc.content
    const lines = content.split('\n')
    
    // Try to find the entity text in the document
    const entityText = entity.title || entity.name || entity.description || ''
    let bestMatch = {
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      tag: 'h5'
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
          startChar,
          endChar,
          startLine,
          endLine,
          context,
          snippet,
          tag: Math.random() > 0.5 ? 'h5' : 'h6' // Random tag for variety
        }
        break
      }
      
      if (bestMatch.snippet) break
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
   * Parse AI response
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
      logger.warn('[QUALITY-TEMPLATES-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
