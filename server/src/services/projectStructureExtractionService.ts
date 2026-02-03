/**
 * Project Structure Extraction Service with Location Tracking
 * Extracts work items, success criteria, constraints, and scope items with precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedWorkItem {
  id?: string
  name: string
  description: string
  wbs_code?: string
  work_type?: string
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

export interface ExtractedSuccessCriterion {
  id?: string
  title: string
  description: string
  category?: string
  metric_type?: string
  target_value?: string
  measurement_method?: string
  priority?: string
  status?: string
  due_date?: string
  owner?: string
  success_factors?: string[]
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

export interface ExtractedConstraint {
  id?: string
  title: string
  description: string
  category?: string
  constraint_type?: string
  priority?: string
  status?: string
  impact_level?: string
  source?: string
  owner?: string
  review_date?: string
  mitigation_strategy?: string
  related_constraints?: string[]
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

export interface ExtractedScopeItem {
  id?: string
  title: string
  description: string
  category?: string
  scope_type?: string
  priority?: string
  status?: string
  in_scope?: boolean
  justification?: string
  acceptance_criteria?: string[]
  assumptions?: string[]
  exclusions?: string[]
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

export class ProjectStructureExtractionService {
  
  /**
   * Extract project structure entities with location tracking
   */
  async extractProjectStructureWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<{
    work_items: ExtractedWorkItem[]
    success_criteria: ExtractedSuccessCriterion[]
    constraints: ExtractedConstraint[]
    scope_items: ExtractedScopeItem[]
  }> {
    try {
      logger.info(`[PROJECT-STRUCTURE-EXTRACTION] Starting project structure extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildProjectStructurePrompt(documents)
      
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

      const work_items = enhanceWithLocations(parsed.work_items || [], 'work_item')
      const success_criteria = enhanceWithLocations(parsed.success_criteria || [], 'success_criterion')
      const constraints = enhanceWithLocations(parsed.constraints || [], 'constraint')
      const scope_items = enhanceWithLocations(parsed.scope_items || [], 'scope_item')

      logger.info(`[PROJECT-STRUCTURE-EXTRACTION] Extracted ${work_items.length} work items, ${success_criteria.length} success criteria, ${constraints.length} constraints, ${scope_items.length} scope items with locations`)
      
      return { work_items, success_criteria, constraints, scope_items }

    } catch (error) {
      logger.error(`[PROJECT-STRUCTURE-EXTRACTION] Failed to extract project structure entities with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return { work_items: [], success_criteria: [], constraints: [], scope_items: [] }
    }
  }

  /**
   * Build project structure extraction prompt with location tracking
   */
  private buildProjectStructurePrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)
    
    return `You are analyzing project documents to extract PROJECT STRUCTURE ENTITIES - work items, success criteria, constraints, and scope items.

Look for:
WORK ITEMS:
- Work breakdown structure (WBS) elements
- Tasks and activities with detailed descriptions
- Work packages and subtasks
- Deliverables and milestones within work items
- Resource assignments and time estimates
- Dependencies and relationships

SUCCESS CRITERIA:
- Project success measurements and KPIs
- Performance targets and objectives
- Quality metrics and standards
- Acceptance criteria and benchmarks
- Timeline and budget success factors
- Stakeholder satisfaction measures

CONSTRAINTS:
- Project limitations and restrictions
- Technical, schedule, and budget constraints
- Resource and regulatory constraints
- Market and environmental constraints
- Organizational and policy constraints
- Assumptions and dependencies

SCOPE ITEMS:
- In-scope and out-of-scope elements
- Project boundaries and deliverables
- Features and functionalities
- Exclusions and assumptions
- Scope justifications and rationales
- Scope change controls

CRITICAL POSITION TRACKING:
For each entity extracted, you MUST provide precise location data:

{
  "work_items": [
    {
      "name": "Work item name",
      "description": "Detailed work item description",
      "wbs_code": "1.2.3",
      "work_type": "development|testing|documentation|review|meeting",
      "priority": "high|medium|low",
      "status": "not_started|in_progress|completed|blocked",
      "planned_start_date": "YYYY-MM-DD",
      "planned_end_date": "YYYY-MM-DD",
      "planned_duration_days": 10,
      "planned_hours": 40,
      "assigned_to": "Person or role",
      "dependencies": ["Work item 1", "Work item 2"],
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "success_criteria": [
    {
      "title": "Success criterion title",
      "description": "Success criterion description",
      "category": "schedule|budget|quality|scope|stakeholder",
      "metric_type": "quantitative|qualitative|binary",
      "target_value": "Specific target or threshold",
      "measurement_method": "How success will be measured",
      "priority": "critical|important|moderate",
      "status": "active|achieved|pending",
      "due_date": "YYYY-MM-DD",
      "owner": "Person or role",
      "success_factors": ["Factor 1", "Factor 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "constraints": [
    {
      "title": "Constraint title",
      "description": "Constraint description",
      "category": "technical|schedule|budget|resource|regulatory",
      "constraint_type": "hard|soft|assumption|dependency",
      "priority": "critical|high|medium|low",
      "status": "active|mitigated|resolved",
      "impact_level": "high|medium|low",
      "source": "Customer|Regulation|Internal|External",
      "owner": "Person or role",
      "review_date": "YYYY-MM-DD",
      "mitigation_strategy": "How to address or work around the constraint",
      "related_constraints": ["Related constraint 1", "Related constraint 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "scope_items": [
    {
      "title": "Scope item title",
      "description": "Scope item description",
      "category": "feature|function|deliverable|service|documentation",
      "scope_type": "in_scope|out_of_scope|assumption|exclusion",
      "priority": "critical|high|medium|low",
      "status": "approved|pending|rejected",
      "in_scope": true,
      "justification": "Why this is in/out of scope",
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "assumptions": ["Assumption 1", "Assumption 2"],
      "exclusions": ["Exclusion 1", "Exclusion 2"],
      "dependencies": ["Dependency 1", "Dependency 2"],
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

Return ONLY valid JSON with work_items, success_criteria, constraints, and scope_items arrays.`
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
      logger.warn('[PROJECT-STRUCTURE-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
