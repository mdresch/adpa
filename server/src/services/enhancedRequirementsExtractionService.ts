/**
 * Enhanced Requirements Extraction Service with Location Tracking
 * Extends the existing requirements extraction to capture precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedRequirement {
  id?: string
  title: string
  description: string
  category?: string
  priority?: string
  type?: string
  status?: string
  acceptance_criteria?: string[]
  source?: string
  verification_method?: string
  assigned_to?: string
  due_date?: string
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

export class EnhancedRequirementsExtractionService {

  /**
   * Extract requirements with precise location information
   */
  async extractRequirementsWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<ExtractedRequirement[]> {
    try {
      logger.info(`[ENHANCED-REQUIREMENTS] Starting extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildRequirementsPrompt(documents)

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
      const requirements = parsed.requirements || []

      // Enhance each requirement with location information
      const enhancedRequirements = requirements.map((requirement: any) => {
        const locationData = this.extractLocationData(requirement, documents)
        const enhanced = {
          ...requirement,
          source_text_start: locationData.startChar,
          source_text_end: locationData.endChar,
          source_line_start: locationData.startLine,
          source_line_end: locationData.endLine,
          source_context: locationData.context,
          source_snippet: locationData.snippet,
          entity_markdown_tag: locationData.tag
        }

        // Detailed logging for discovered entity
        logger.info(`[ENHANCED-REQUIREMENTS] Discovered requirement: "${enhanced.title}"`, {
          source_document_id: enhanced.source_document_id,
          source_text_start: enhanced.source_text_start,
          source_text_end: enhanced.source_text_end,
          source_line_start: enhanced.source_line_start,
          source_line_end: enhanced.source_line_end,
          source_context: enhanced.source_context,
          source_snippet: enhanced.source_snippet,
          entity_markdown_tag: enhanced.entity_markdown_tag
        })

        return enhanced
      })

      logger.info(`[ENHANCED-REQUIREMENTS] Extracted ${enhancedRequirements.length} requirements with locations`)
      return enhancedRequirements

    } catch (error) {
      logger.error(`[ENHANCED-REQUIREMENTS] Failed to extract requirements with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Build requirements extraction prompt with location tracking
   */
  private buildRequirementsPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)

    return `You are analyzing project documents to extract REQUIREMENTS - specific needs, conditions, or capabilities that must be fulfilled.

Look for:
- Functional requirements (what the system should do)
- Non-functional requirements (how the system should perform)
- Business requirements (business needs and objectives)
- Technical requirements (technical specifications)
- User requirements (user needs and expectations)
- System requirements (system-level specifications)
- Performance requirements (speed, capacity, reliability)
- Security requirements (access control, data protection)
- Compliance requirements (regulatory, legal, standards)
- Interface requirements (integration points)

CRITICAL POSITION TRACKING:
For each requirement extracted, you MUST provide precise location data:

{
  "requirements": [
    {
      "title": "Requirement title",
      "description": "Detailed requirement description",
      "category": "functional|non-functional|business|technical|user|system|performance|security|compliance|interface",
      "priority": "high|medium|low",
      "type": "must_have|should_have|could_have|wont_have",
      "status": "draft|approved|implemented|verified|rejected",
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "source": "customer|stakeholder|regulation|business|technical",
      "verification_method": "testing|review|inspection|analysis|demonstration",
      "assigned_to": "Person or role",
      "due_date": "YYYY-MM-DD",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above",
      "source_text_start": 1234,  // Character position where requirement text starts
      "source_text_end": 1456,    // Character position where requirement text ends
      "source_line_start": 45,    // Line number where requirement starts
      "source_line_end": 47,      // Line number where requirement ends
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ]
}

LOCATION TRACKING INSTRUCTIONS:
1. Find the exact text in the document that corresponds to each requirement
2. Record character positions (start/end) using 0-based indexing
3. Record line numbers (start/end) using 1-based indexing
4. Extract surrounding context (±100 characters) for reference
5. Include the exact snippet that was matched
6. Be precise - these locations enable yellow highlighting in the UI

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Guidelines:
- Extract both explicit and implicit requirements
- Include requirement identifiers if present (REQ-001, etc.)
- Capture acceptance criteria when specified
- Note requirement sources and verification methods
- Distinguish between requirement types and priorities
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- **Position tracking is MANDATORY** - provide exact locations for each requirement
- Return ONLY valid JSON object with "requirements" array only.`
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
   * Extract location data from requirement and documents
   */
  private extractLocationData(
    requirement: any,
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
      doc.title === requirement.source_document ||
      doc.template_name === requirement.source_document ||
      doc.id === requirement.source_document_id
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

    // Try to find the requirement text in the document
    const requirementText = requirement.title || requirement.description || ''
    let bestMatch = {
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      tag: 'h5'
    }

    // Search for the requirement text in the document
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineStartPos = content.substring(0, content.indexOf(line)).length

      // Find all occurrences of the requirement text in this line
      const regex = new RegExp(this.escapeRegex(requirementText), 'gi')
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
          tag: 'h5' // Standardized to h5
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
      logger.warn('[ENHANCED-REQUIREMENTS] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
