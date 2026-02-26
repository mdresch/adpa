/**
 * Task Extraction Service with Location Tracking
 * Extends existing task extraction to capture precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedTask {
  id?: string
  name: string
  description?: string
  wbs_code?: string
  task_type?: string
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

export class TaskExtractionService {

  /**
   * Extract tasks with precise location information
   */
  async extractTasksWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<ExtractedTask[]> {
    try {
      logger.info(`[TASK-EXTRACTION] Starting task extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildTaskExtractionPrompt(documents)

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
      const tasks = parsed.tasks || []

      // Enhance each task with location information
      const enhancedTasks = tasks.map((task: any) => {
        const locationData = this.extractLocationData(task, documents)
        const enhanced = {
          ...task,
          source_text_start: locationData.startChar,
          source_text_end: locationData.endChar,
          source_line_start: locationData.startLine,
          source_line_end: locationData.endLine,
          source_context: locationData.context,
          source_snippet: locationData.snippet,
          entity_markdown_tag: locationData.tag
        }

        // Detailed logging for discovered entity
        logger.info(`[TASK-EXTRACTION] Discovered task: "${enhanced.name}"`, {
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

      logger.info(`[TASK-EXTRACTION] Extracted ${enhancedTasks.length} tasks with locations`)
      return enhancedTasks

    } catch (error) {
      logger.error(`[TASK-EXTRACTION] Failed to extract tasks with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Build task extraction prompt with location tracking
   */
  private buildTaskExtractionPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)

    return `You are analyzing project documents to extract TASKS - specific work items and activities that need to be completed.

Look for:
- Task names and descriptions
- Work breakdown structure (WBS) items
- Activities and action items
- Deliverables and milestones
- Work packages and subtasks
- Task dependencies and relationships
- Resource assignments and responsibilities
- Time estimates and deadlines
- Acceptance criteria and completion requirements

CRITICAL POSITION TRACKING:
For each task extracted, you MUST provide precise location data:

{
  "tasks": [
    {
      "name": "Task name",
      "description": "Detailed description of what needs to be done",
      "wbs_code": "1.2.3",
      "task_type": "development|testing|documentation|review|meeting",
      "priority": "high|medium|low",
      "status": "not_started|in_progress|completed|blocked",
      "planned_start_date": "YYYY-MM-DD",
      "planned_end_date": "YYYY-MM-DD",
      "planned_duration_days": 10,
      "planned_hours": 40,
      "assigned_to": "Person or role",
      "dependencies": ["Task 1", "Task 2"],
      "deliverables": ["Deliverable 1"],
      "acceptance_criteria": ["Criteria 1", "Criteria 2"],
      "source_document": "EXACT document title",
      "source_text_start": 1234,  // Character position where task text starts
      "source_text_end": 1456,    // Character position where task text ends
      "source_line_start": 45,    // Line number where task starts
      "source_line_end": 47,      // Line number where task ends
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ]
}

LOCATION TRACKING INSTRUCTIONS:
1. Find the exact text in the document that corresponds to each task
2. Record character positions (start/end) using 0-based indexing
3. Record line numbers (start/end) using 1-based indexing
4. Extract surrounding context (±100 characters) for reference
5. Include the exact snippet that was matched
6. Be precise - these locations enable yellow highlighting in the UI

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Return ONLY valid JSON with the tasks array.`
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
   * Extract location data from task and documents
   */
  private extractLocationData(
    task: any,
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
      doc.title === task.source_document ||
      doc.template_name === task.source_document ||
      doc.id === task.source_document_id
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

    // Try to find the task text in the document
    const taskText = task.name || task.description || ''
    let bestMatch = {
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      tag: 'h5'
    }

    // Search for the task text in the document
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineStartPos = content.substring(0, content.indexOf(line)).length

      // Find all occurrences of the task text in this line
      const regex = new RegExp(this.escapeRegex(taskText), 'gi')
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
      logger.warn('[TASK-EXTRACTION] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }
}
