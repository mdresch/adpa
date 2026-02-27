/**
 * Risk Management Extraction Service with Location Tracking
 * Extracts risks, mitigation plans, issues, and playbooks with precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedRisk {
  id?: string
  title: string
  description: string
  category?: string
  probability?: string
  impact?: string
  risk_score?: number
  risk_level?: string
  causes?: string[]
  effects?: string[]
  risk_owner?: string
  identified_date?: string
  review_date?: string
  status?: string
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

export interface ExtractedMitigation {
  id?: string
  risk_id?: string
  title: string
  description: string
  strategy?: string
  actions?: string[]
  owner?: string
  due_date?: string
  status?: string
  effectiveness?: string
  cost_estimate?: number
  priority?: string
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

export interface ExtractedIssue {
  id?: string
  title: string
  description: string
  category?: string
  severity?: string
  priority?: string
  status?: string
  assigned_to?: string
  reported_date?: string
  due_date?: string
  resolution?: string
  impact_assessment?: string
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

export interface ExtractedPlaybook {
  id?: string
  name: string
  description: string
  category?: string
  trigger_conditions?: string[]
  steps?: string[]
  roles_responsibilities?: string[]
  tools_resources?: string[]
  escalation_criteria?: string
  success_criteria?: string[]
  estimated_duration?: string
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

export class RiskManagementExtractionService {

  /**
   * Extract risk management entities with location tracking
   */
  async extractRiskManagementWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<{
    risks: ExtractedRisk[]
    mitigations: ExtractedMitigation[]
    issues: ExtractedIssue[]
    playbooks: ExtractedPlaybook[]
  }> {
    try {
      logger.info(`[RISK-MANAGEMENT-EXTRACTION] Starting risk management extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildRiskManagementPrompt(documents)

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
          logger.info(`[RISK-MANAGEMENT] Discovered ${entityType}: "${enhanced.title || enhanced.name}"`, {
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

      const risks = enhanceWithLocations(parsed.risks || [], 'risk')
      const mitigations = enhanceWithLocations(parsed.mitigations || [], 'mitigation')
      const issues = enhanceWithLocations(parsed.issues || [], 'issue')
      const playbooks = enhanceWithLocations(parsed.playbooks || [], 'playbook')

      logger.info(`[RISK-MANAGEMENT-EXTRACTION] Extracted ${risks.length} risks, ${mitigations.length} mitigations, ${issues.length} issues, ${playbooks.length} playbooks with locations`)

      return { risks, mitigations, issues, playbooks }

    } catch (error) {
      logger.error(`[RISK-MANAGEMENT-EXTRACTION] Failed to extract risk management entities with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return { risks: [], mitigations: [], issues: [], playbooks: [] }
    }
  }

  /**
   * Build risk management extraction prompt with location tracking
   */
  private buildRiskManagementPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)

    return `You are analyzing project documents to extract RISK MANAGEMENT ENTITIES - risks, mitigation plans, issues, and operational playbooks.

Look for:
RISKS:
- Potential problems or threats to project success
- Uncertainties that could affect project outcomes
- Risk descriptions, categories, and assessments
- Risk owners and review dates

MITIGATION PLANS:
- Strategies to address identified risks
- Action plans and response measures
- Risk treatment approaches
- Mitigation owners and timelines

ISSUES:
- Current problems or blockers affecting the project
- Active challenges that need resolution
- Issue descriptions and impact assessments
- Issue assignments and resolution plans

PLAYBOOKS:
- Pre-defined response procedures and operational guides
- Step-by-step instructions for handling situations
- Escalation procedures and success criteria
- Role assignments and resource requirements

CRITICAL POSITION TRACKING:
For each entity extracted, you MUST provide precise location data:

{
  "risks": [
    {
      "title": "Risk title",
      "description": "Detailed risk description",
      "category": "technical|schedule|budget|resource|external",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "risk_score": 15,
      "risk_level": "low|medium|high|critical",
      "causes": ["Cause 1", "Cause 2"],
      "effects": ["Effect 1", "Effect 2"],
      "risk_owner": "Person or role",
      "identified_date": "YYYY-MM-DD",
      "review_date": "YYYY-MM-DD",
      "status": "active|monitored|closed",
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "mitigations": [
    {
      "risk_id": "Related risk ID",
      "title": "Mitigation title",
      "description": "Mitigation description",
      "strategy": "avoid|transfer|mitigate|accept",
      "actions": ["Action 1", "Action 2"],
      "owner": "Person or role",
      "due_date": "YYYY-MM-DD",
      "status": "planned|in_progress|completed",
      "effectiveness": "high|medium|low",
      "cost_estimate": 5000,
      "priority": "high|medium|low",
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "issues": [
    {
      "title": "Issue title",
      "description": "Issue description",
      "category": "technical|schedule|budget|resource",
      "severity": "low|medium|high|critical",
      "priority": "low|medium|high",
      "status": "open|in_progress|resolved|closed",
      "assigned_to": "Person or role",
      "reported_date": "YYYY-MM-DD",
      "due_date": "YYYY-MM-DD",
      "resolution": "Resolution description",
      "impact_assessment": "Impact description",
      "source_document": "EXACT document title",
      "source_text_start": 1234,
      "source_text_end": 1456,
      "source_line_start": 45,
      "source_line_end": 47,
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ],
  "playbooks": [
    {
      "name": "Playbook name",
      "description": "Playbook description",
      "category": "incident|escalation|communication|technical",
      "trigger_conditions": ["Trigger 1", "Trigger 2"],
      "steps": ["Step 1", "Step 2"],
      "roles_responsibilities": ["Role 1", "Role 2"],
      "tools_resources": ["Tool 1", "Resource 1"],
      "escalation_criteria": "Escalation conditions",
      "success_criteria": ["Success 1", "Success 2"],
      "estimated_duration": "2 hours",
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

Return ONLY valid JSON with risks, mitigations, issues, and playbooks arrays.`
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
      logger.warn('[RISK-MANAGEMENT-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
