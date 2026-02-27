/**
 * High-Impact Entities Extraction Service with Location Tracking
 * Extracts requirements, deliverables, stakeholders, resources, and milestones with precise source document positions
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

export interface ExtractedDeliverable {
  id?: string
  name: string
  description: string
  category?: string
  type?: string
  priority?: string
  status?: string
  acceptance_criteria?: string[]
  quality_standards?: string[]
  assigned_to?: string
  planned_date?: string
  actual_date?: string
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

export interface ExtractedStakeholder {
  id?: string
  name: string
  role?: string
  organization?: string
  contact_info?: string
  influence_level?: string
  interest_level?: string
  expectations?: string[]
  requirements?: string[]
  communication_preferences?: string[]
  responsibilities?: string[]
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

export interface ExtractedResource {
  id?: string
  name: string
  type?: string
  category?: string
  skills?: string[]
  availability?: string
  cost_rate?: number
  role?: string
  department?: string
  experience_level?: string
  certifications?: string[]
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

export interface ExtractedMilestone {
  id?: string
  name: string
  description: string
  category?: string
  priority?: string
  status?: string
  planned_date?: string
  actual_date?: string
  deliverables?: string[]
  dependencies?: string[]
  success_criteria?: string[]
  assigned_to?: string
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

export class HighImpactEntitiesExtractionService {

  /**
   * Extract high-impact entities with location tracking
   */
  async extractHighImpactEntitiesWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<{
    requirements: ExtractedRequirement[]
    deliverables: ExtractedDeliverable[]
    stakeholders: ExtractedStakeholder[]
    resources: ExtractedResource[]
    milestones: ExtractedMilestone[]
  }> {
    try {
      logger.info(`[HIGH-IMPACT-EXTRACTION] Starting high-impact entities extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildHighImpactEntitiesPrompt(documents)

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
          const enhanced = {
            ...entity,
            source_text_start: locationData.startChar,
            source_text_end: locationData.endChar,
            source_line_start: locationData.startLine,
            source_line_end: locationData.endLine,
            source_context: locationData.context,
            source_snippet: locationData.snippet,
            entity_markdown_tag: locationData.tag
          }

          // Detailed logging for discovered entity
          logger.info(`[HIGH-IMPACT] Discovered ${entityType}: "${enhanced.title || enhanced.name}"`, {
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
      }

      const requirements = enhanceWithLocations(parsed.requirements || [], 'requirement')
      const deliverables = enhanceWithLocations(parsed.deliverables || [], 'deliverable')
      const stakeholders = enhanceWithLocations(parsed.stakeholders || [], 'stakeholder')
      const resources = enhanceWithLocations(parsed.resources || [], 'resource')
      const milestones = enhanceWithLocations(parsed.milestones || [], 'milestone')

      logger.info(`[HIGH-IMPACT-EXTRACTION] Extracted ${requirements.length} requirements, ${deliverables.length} deliverables, ${stakeholders.length} stakeholders, ${resources.length} resources, ${milestones.length} milestones with locations`)

      return { requirements, deliverables, stakeholders, resources, milestones }

    } catch (error) {
      logger.error(`[HIGH-IMPACT-EXTRACTION] Failed to extract high-impact entities with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return { requirements: [], deliverables: [], stakeholders: [], resources: [], milestones: [] }
    }
  }

  /**
   * Build high-impact entities extraction prompt with location tracking
   */
  private buildHighImpactEntitiesPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)

    return `You are analyzing project documents to extract HIGH-IMPACT PROJECT ENTITIES - requirements, deliverables, stakeholders, resources, and milestones.

Look for:
REQUIREMENTS:
- Functional and non-functional requirements
- Business and technical requirements
- User requirements and system requirements
- Acceptance criteria and verification methods
- Requirement priorities and categories

DELIVERABLES:
- Project outputs and tangible results
- Documents, reports, and software components
- Products and services to be delivered
- Quality standards and acceptance criteria
- Delivery dates and dependencies

STAKEHOLDERS:
- Project team members and sponsors
- End users and customers
- Vendors and external partners
- Regulatory bodies and stakeholders
- Roles, responsibilities, and expectations

RESOURCES:
- Human resources with skills and roles
- Equipment and facilities
- Budget and financial resources
- Materials and supplies
- Technology and tools

MILESTONES:
- Key project achievements and checkpoints
- Phase completions and decision points
- Critical deadlines and delivery dates
- Success criteria and dependencies
- Major accomplishments

CRITICAL POSITION TRACKING:
For each entity extracted, you MUST provide precise location data:

{
  "requirements": [
    {
      "title": "Requirement title",
      "description": "Detailed requirement description",
      "category": "functional|non-functional|business|technical|user",
      "priority": "high|medium|low",
      "type": "must_have|should_have|could_have|wont_have",
      "status": "draft|approved|implemented|verified",
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "source": "Customer|Stakeholder|Regulation",
      "verification_method": "Testing|Review|Inspection|Analysis",
      "assigned_to": "Person or role",
      "due_date": "YYYY-MM-DD",
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "deliverables": [
    {
      "name": "Deliverable name",
      "description": "Deliverable description",
      "category": "document|software|hardware|service|report",
      "type": "internal|external|interim|final",
      "priority": "high|medium|low",
      "status": "planned|in_progress|completed|accepted",
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "quality_standards": ["Standard 1", "Standard 2"],
      "assigned_to": "Person or role",
      "planned_date": "YYYY-MM-DD",
      "actual_date": "YYYY-MM-DD",
      "dependencies": ["Dependency 1", "Dependency 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "stakeholders": [
    {
      "name": "Stakeholder name",
      "role": "Project Manager|Sponsor|User|Developer",
      "organization": "Organization name",
      "contact_info": "Email or phone",
      "influence_level": "high|medium|low",
      "interest_level": "high|medium|low",
      "expectations": ["Expectation 1", "Expectation 2"],
      "requirements": ["Requirement 1", "Requirement 2"],
      "communication_preferences": ["Email|Meeting|Report"],
      "responsibilities": ["Responsibility 1", "Responsibility 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "resources": [
    {
      "name": "Resource name",
      "type": "human|equipment|facility|budget|material",
      "category": "technical|administrative|support",
      "skills": ["Skill 1", "Skill 2"],
      "availability": "full_time|part_time|contractor",
      "cost_rate": 100,
      "role": "Developer|Analyst|Manager",
      "department": "IT|Finance|Operations",
      "experience_level": "junior|senior|expert",
      "certifications": ["Certification 1", "Certification 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "milestones": [
    {
      "name": "Milestone name",
      "description": "Milestone description",
      "category": "phase|delivery|decision|review",
      "priority": "high|medium|low",
      "status": "planned|completed|delayed|cancelled",
      "planned_date": "YYYY-MM-DD",
      "actual_date": "YYYY-MM-DD",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "dependencies": ["Dependency 1", "Dependency 2"],
      "success_criteria": ["Criteria 1", "Criteria 2"],
      "assigned_to": "Person or role",
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

Return ONLY valid JSON with requirements, deliverables, stakeholders, resources, and milestones arrays.`
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
      logger.warn('[HIGH-IMPACT-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
