/**
 * Project Execution Extraction Service with Location Tracking
 * Extracts activities, phases, and opportunities with precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedActivity {
  id?: string
  name: string
  description: string
  activity_type?: string
  priority?: string
  status?: string
  planned_start_date?: string
  planned_end_date?: string
  planned_duration_days?: number
  planned_hours?: number
  assigned_to?: string
  dependencies?: string[]
  deliverables?: string[]
  acceptance_criteria?: string[]
  phase_id?: string
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

export interface ExtractedPhase {
  id?: string
  name: string
  description: string
  phase_type?: string
  priority?: string
  status?: string
  planned_start_date?: string
  planned_end_date?: string
  planned_duration_days?: number
  phase_manager?: string
  objectives?: string[]
  deliverables?: string[]
  success_criteria?: string[]
  dependencies?: string[]
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

export interface ExtractedOpportunity {
  id?: string
  title: string
  description: string
  category?: string
  opportunity_type?: string
  priority?: string
  status?: string
  potential_value?: string
  probability?: string
  impact_level?: string
  owner?: string
  identified_date?: string
  target_date?: string
  actions_required?: string[]
  success_factors?: string[]
  risks?: string[]
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

export class ProjectExecutionExtractionService {
  
  /**
   * Extract project execution entities with location tracking
   */
  async extractProjectExecutionWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<{
    activities: ExtractedActivity[]
    phases: ExtractedPhase[]
    opportunities: ExtractedOpportunity[]
  }> {
    try {
      logger.info(`[PROJECT-EXECUTION-EXTRACTION] Starting project execution extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildProjectExecutionPrompt(documents)
      
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

      const activities = enhanceWithLocations(parsed.activities || [], 'activity')
      const phases = enhanceWithLocations(parsed.phases || [], 'phase')
      const opportunities = enhanceWithLocations(parsed.opportunities || [], 'opportunity')

      logger.info(`[PROJECT-EXECUTION-EXTRACTION] Extracted ${activities.length} activities, ${phases.length} phases, ${opportunities.length} opportunities with locations`)
      
      return { activities, phases, opportunities }

    } catch (error) {
      logger.error(`[PROJECT-EXECUTION-EXTRACTION] Failed to extract project execution entities with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return { activities: [], phases: [], opportunities: [] }
    }
  }

  /**
   * Build project execution extraction prompt with location tracking
   */
  private buildProjectExecutionPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)
    
    return `You are analyzing project documents to extract PROJECT EXECUTION ENTITIES - activities, phases, and opportunities.

Look for:
ACTIVITIES:
- Specific work activities and tasks to be performed
- Action items and implementation steps
- Development, testing, and deployment activities
- Review, approval, and decision activities
- Communication and coordination activities
- Resource allocation and management activities

PHASES:
- Project phases and major stages
- Sequential project segments
- Gate reviews and decision points
- Major project transitions
- Phase objectives and deliverables
- Phase dependencies and relationships

OPPORTUNITIES:
- Improvement opportunities and optimizations
- Cost savings and efficiency gains
- Innovation and technology opportunities
- Market and business opportunities
- Process improvement opportunities
- Resource optimization opportunities

CRITICAL POSITION TRACKING:
For each entity extracted, you MUST provide precise location data:

{
  "activities": [
    {
      "name": "Activity name",
      "description": "Detailed activity description",
      "activity_type": "development|testing|deployment|review|communication|coordination",
      "priority": "high|medium|low",
      "status": "planned|in_progress|completed|blocked",
      "planned_start_date": "YYYY-MM-DD",
      "planned_end_date": "YYYY-MM-DD",
      "planned_duration_days": 10,
      "planned_hours": 40,
      "assigned_to": "Person or role",
      "dependencies": ["Activity 1", "Activity 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "phase_id": "Related phase ID",
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "phases": [
    {
      "name": "Phase name",
      "description": "Phase description",
      "phase_type": "initiation|planning|execution|monitoring|closure",
      "priority": "high|medium|low",
      "status": "planned|active|completed|cancelled",
      "planned_start_date": "YYYY-MM-DD",
      "planned_end_date": "YYYY-MM-DD",
      "planned_duration_days": 30,
      "phase_manager": "Person or role",
      "objectives": ["Objective 1", "Objective 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "success_criteria": ["Criteria 1", "Criteria 2"],
      "dependencies": ["Phase 1", "Phase 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "Opportunity description",
      "category": "process|technology|business|resource|market",
      "opportunity_type": "improvement|optimization|innovation|cost_savings",
      "priority": "high|medium|low",
      "status": "identified|evaluating|implementing|realized",
      "potential_value": "Estimated value or benefit",
      "probability": "high|medium|low",
      "impact_level": "high|medium|low",
      "owner": "Person or role",
      "identified_date": "YYYY-MM-DD",
      "target_date": "YYYY-MM-DD",
      "actions_required": ["Action 1", "Action 2"],
      "success_factors": ["Factor 1", "Factor 2"],
      "risks": ["Risk 1", "Risk 2"],
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

Return ONLY valid JSON with activities, phases, and opportunities arrays.`
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
      logger.warn('[PROJECT-EXECUTION-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
