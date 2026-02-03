/**
 * Enhanced Performance Actuals Extraction Service with Location Tracking
 * Extends the existing performance actuals extraction to capture precise source document positions
 */

import { logger } from '../utils/logger'
import { aiService } from './aiService'

export interface ExtractedPerformanceActual {
  entity_type?: string
  entity_id?: string
  entity_name: string
  planned_start_date?: string
  actual_start_date?: string
  planned_end_date?: string
  actual_end_date?: string
  planned_cost?: number
  actual_cost?: number
  planned_progress_percent?: number
  actual_progress_percent?: number
  quality_score?: number
  defects_found?: number
  rework_hours?: number
  notes?: string
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

export class EnhancedPerformanceActualsExtractionService {
  
  /**
   * Extract performance actuals with precise location information
   */
  async extractPerformanceActualsWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<ExtractedPerformanceActual[]> {
    try {
      logger.info(`[ENHANCED-PERFORMANCE-ACTUALS] Starting extraction with location tracking`)

      // Build enhanced prompt with location tracking instructions
      const prompt = this.buildPerformanceActualsPrompt(documents)
      
      // Use AI service for extraction
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 8000
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      // Parse response
      const parsed = this.parseAIResponse(response.content)
      const actuals = parsed.performance_actuals || []
      
      // Enhance each actual with location information
      const enhancedActuals = actuals.map((actual: any) => {
        const locationData = this.extractLocationData(actual, documents)
        return {
          ...actual,
          source_text_start: locationData.startChar,
          source_text_end: locationData.endChar,
          source_line_start: locationData.startLine,
          source_line_end: locationData.endLine,
          source_context: locationData.context,
          source_snippet: locationData.snippet,
          entity_markdown_tag: locationData.tag
        }
      })

      logger.info(`[ENHANCED-PERFORMANCE-ACTUALS] Extracted ${enhancedActuals.length} performance actuals with locations`)
      return enhancedActuals

    } catch (error) {
      logger.error(`[ENHANCED-PERFORMANCE-ACTUALS] Failed to extract performance actuals with locations`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Build performance actuals extraction prompt with location tracking
   */
  private buildPerformanceActualsPrompt(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const documentContext = this.buildDocumentContextWithLineNumbers(documents)
    const documentList = this.buildDocumentList(documents)
    
    return `You are analyzing project documents to extract PERFORMANCE ACTUALS - actual performance data that occurred during project execution.

CRITICAL: Only extract ACTUAL performance data (what happened), NOT planned/future data.

Look for:
- "Actual start date: ...", "Actually started on ...", "Work began on ..."
- "Actual end date: ...", "Completed on ...", "Finished on ..."
- "Actual cost: $X", "Spent $X", "Incurred $X"
- "Progress: X% complete", "X% done", "Completed X%"
- "Behind schedule by X days", "Ahead of schedule", "Delayed by ..."
- "Under budget by $X", "Over budget by $X"
- Status updates, progress reports, actual vs. planned comparisons
- Quality metrics: defects found, rework hours, quality scores

CRITICAL POSITION TRACKING:
For each performance actual extracted, you MUST provide precise location data:

{
  "performance_actuals": [
    {
      "entity_type": "milestone" | "deliverable" | "activity" | "phase" | "resource",
      "entity_name": "Name of the milestone/deliverable/activity",
      "planned_start_date": "YYYY-MM-DD" (if mentioned),
      "actual_start_date": "YYYY-MM-DD" (if mentioned),
      "planned_end_date": "YYYY-MM-DD" (if mentioned),
      "actual_end_date": "YYYY-MM-DD" (if mentioned),
      "planned_cost": number (if mentioned),
      "actual_cost": number (if mentioned),
      "planned_progress_percent": number 0-100 (if mentioned),
      "actual_progress_percent": number 0-100 (if mentioned),
      "quality_score": number 0-10 (if mentioned),
      "defects_found": number (if mentioned),
      "rework_hours": number (if mentioned),
      "notes": "Brief context from the document",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above",
      "source_text_start": 1234,  // Character position where actual text starts
      "source_text_end": 1456,    // Character position where actual text ends
      "source_line_start": 45,    // Line number where actual starts
      "source_line_end": 47,      // Line number where actual ends
      "source_context": "Surrounding text context (±100 characters)",
      "source_snippet": "Exact text that was extracted"
    }
  ]
}

LOCATION TRACKING INSTRUCTIONS:
1. Find the exact text in the document that corresponds to each performance actual
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
- ONLY include items with ACTUAL data (not just plans)
- entity_type must be one of: milestone, deliverable, activity, phase, resource
- Dates should be in YYYY-MM-DD format
- Remove currency symbols and convert costs to numbers
- Progress percentages should be 0-100
- Quality scores should be 0-10
- Return empty array if no actuals found
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- **Position tracking is MANDATORY** - provide exact locations for each actual
- Return ONLY valid JSON object with "performance_actuals" array only.`
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
   * Extract location data from performance actual and documents with enhanced accuracy
   */
  private extractLocationData(
    actual: any,
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
      doc.title === actual.source_document || 
      doc.template_name === actual.source_document ||
      doc.id === actual.source_document_id
    )

    if (!sourceDoc) {
      logger.warn(`[ENHANCED-PERFORMANCE-ACTUALS] Source document not found for actual: ${actual.entity_name}`)
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
    
    // Build search terms from multiple fields for better matching
    const searchTerms = [
      actual.entity_name,
      actual.notes,
      actual.planned_start_date,
      actual.actual_start_date,
      actual.planned_end_date,
      actual.actual_end_date
    ].filter(term => term && term.trim().length > 0)
    
    let bestMatch = {
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      tag: 'h5',
      confidence: 0
    }

    // Search for each term and find the best match
    for (const searchTerm of searchTerms) {
      const match = this.findBestTextMatch(searchTerm, content, lines)
      if (match.confidence > bestMatch.confidence) {
        bestMatch = { ...match, tag: this.detectMarkdownTag(match.startLine, lines) }
      }
    }

    // If we still don't have a good match, try fuzzy matching
    if (bestMatch.confidence < 0.5 && actual.entity_name) {
      const fuzzyMatch = this.findFuzzyMatch(actual.entity_name, content, lines)
      if (fuzzyMatch.confidence > bestMatch.confidence) {
        bestMatch = { ...fuzzyMatch, tag: this.detectMarkdownTag(fuzzyMatch.startLine, lines) }
      }
    }

    logger.info(`[ENHANCED-PERFORMANCE-ACTUALS] Located entity "${actual.entity_name}" with confidence ${bestMatch.confidence}`)
    return bestMatch
  }

  /**
   * Find the best text match for a search term with confidence scoring
   */
  private findBestTextMatch(
    searchTerm: string,
    content: string,
    lines: string[]
  ): {
    startChar: number
    endChar: number
    startLine: number
    endLine: number
    context: string
    snippet: string
    confidence: number
  } {
    let bestMatch = {
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      confidence: 0
    }

    // Try exact match first
    const exactMatches = this.findAllExactMatches(searchTerm, content, lines)
    if (exactMatches.length > 0) {
      bestMatch = exactMatches[0]
      bestMatch.confidence = 1.0
      return bestMatch
    }

    // Try partial matches
    const partialMatches = this.findPartialMatches(searchTerm, content, lines)
    if (partialMatches.length > 0) {
      bestMatch = partialMatches[0]
      bestMatch.confidence = 0.7
    }

    return bestMatch
  }

  /**
   * Find all exact matches of a search term
   */
  private findAllExactMatches(
    searchTerm: string,
    content: string,
    lines: string[]
  ): Array<{
    startChar: number
    endChar: number
    startLine: number
    endLine: number
    context: string
    snippet: string
    confidence: number
  }> {
    const matches = []
    const escapedTerm = this.escapeRegex(searchTerm)
    const regex = new RegExp(escapedTerm, 'gi')
    let match

    while ((match = regex.exec(content)) !== null) {
      const startChar = match.index
      const endChar = startChar + match[0].length
      const startLine = this.getLineNumberFromPosition(content, startChar)
      const endLine = this.getLineNumberFromPosition(content, endChar)
      
      // Get context (±100 characters)
      const contextStart = Math.max(0, startChar - 100)
      const contextEnd = Math.min(content.length, endChar + 100)
      const context = content.substring(contextStart, contextEnd)
      
      matches.push({
        startChar,
        endChar,
        startLine,
        endLine,
        context,
        snippet: match[0],
        confidence: 1.0
      })
    }

    return matches
  }

  /**
   * Find partial matches for a search term
   */
  private findPartialMatches(
    searchTerm: string,
    content: string,
    lines: string[]
  ): Array<{
    startChar: number
    endChar: number
    startLine: number
    endLine: number
    context: string
    snippet: string
    confidence: number
  }> {
    const matches = []
    const words = searchTerm.split(/\s+/).filter(word => word.length > 2)
    
    for (const word of words) {
      const escapedWord = this.escapeRegex(word)
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi')
      let match

      while ((match = regex.exec(content)) !== null) {
        const startChar = match.index
        const endChar = startChar + match[0].length
        const startLine = this.getLineNumberFromPosition(content, startChar)
        const endLine = this.getLineNumberFromPosition(content, endChar)
        
        const contextStart = Math.max(0, startChar - 100)
        const contextEnd = Math.min(content.length, endChar + 100)
        const context = content.substring(contextStart, contextEnd)
        
        matches.push({
          startChar,
          endChar,
          startLine,
          endLine,
          context,
          snippet: match[0],
          confidence: 0.7
        })
      }
    }

    return matches
  }

  /**
   * Find fuzzy matches using Levenshtein distance
   */
  private findFuzzyMatch(
    searchTerm: string,
    content: string,
    lines: string[]
  ): {
    startChar: number
    endChar: number
    startLine: number
    endLine: number
    context: string
    snippet: string
    confidence: number
  } {
    const words = content.split(/\s+/)
    let bestMatch = {
      startChar: 0,
      endChar: 0,
      startLine: 0,
      endLine: 0,
      context: '',
      snippet: '',
      confidence: 0
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const similarity = this.calculateSimilarity(searchTerm.toLowerCase(), word.toLowerCase())
      
      if (similarity > 0.7 && similarity > bestMatch.confidence) {
        const position = content.indexOf(word)
        const startChar = position
        const endChar = startChar + word.length
        const startLine = this.getLineNumberFromPosition(content, startChar)
        const endLine = this.getLineNumberFromPosition(content, endChar)
        
        const contextStart = Math.max(0, startChar - 100)
        const contextEnd = Math.min(content.length, endChar + 100)
        const context = content.substring(contextStart, contextEnd)
        
        bestMatch = {
          startChar,
          endChar,
          startLine,
          endLine,
          context,
          snippet: word,
          confidence: similarity
        }
      }
    }

    return bestMatch
  }

  /**
   * Calculate similarity between two strings (simplified Levenshtein)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Get line number from character position
   */
  private getLineNumberFromPosition(content: string, position: number): number {
    const before = content.substring(0, position)
    return before.split('\n').length
  }

  /**
   * Detect markdown tag based on line content and position
   */
  private detectMarkdownTag(lineNumber: number, lines: string[]): string {
    if (lineNumber <= 0 || lineNumber > lines.length) return 'p'
    
    const line = lines[lineNumber - 1].trim()
    
    // Check for headers
    if (line.startsWith('# ')) return 'h1'
    if (line.startsWith('## ')) return 'h2'
    if (line.startsWith('### ')) return 'h3'
    if (line.startsWith('#### ')) return 'h4'
    if (line.startsWith('##### ')) return 'h5'
    if (line.startsWith('###### ')) return 'h6'
    
    // Check for list items
    if (line.match(/^[-*+]\s/)) return 'li'
    if (line.match(/^\d+\.\s/)) return 'li'
    
    // Check for other common patterns
    if (line.match(/^>/)) return 'blockquote'
    if (line.match(/^\|/)) return 'table'
    
    return 'p'
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
      logger.warn('[ENHANCED-PERFORMANCE-ACTUALS] Failed to parse AI response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        content: content.substring(0, 500)
      })
      return {}
    }
  }

  /**
   * Normalize date strings
   */
  private normalizeDate(dateString: any): string | null {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return null
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    } catch {
      return null
    }
  }

  /**
   * Safely convert to number
   */
  private safeNumber(value: any): number | null {
    if (value === null || value === undefined) return null
    const num = Number(value)
    return isNaN(num) ? null : num
  }

  /**
   * Safely convert to integer
   */
  private safeInteger(value: any): number | null {
    if (value === null || value === undefined) return null
    const num = Number(value)
    return isNaN(num) ? null : Math.floor(num)
  }
}
