import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { pool } from '../database/connection'
import crypto from 'crypto'

export interface DocumentCompressionOptions {
  compressionLevel: number // 0.1 to 1.0
  preserveStructure?: boolean // Keep headers, lists, etc.
  preserveKeywords?: boolean // Keep important keywords
  method?: 'truncate' | 'summarize' | 'smart' | 'keyword' // Compression method
  templateContext?: {
    name: string
    description: string
    content: string
    system_prompt?: string
    template_paragraphs?: any[]
  } // Template context for focused summarization
}

export interface CompressionQualityMetrics {
  coherence: number // 0-1 score
  completeness: number // 0-1 score
  relevance: number // 0-1 score
  readability: number // 0-1 score
  overall: number // weighted average
}

export interface CompressionStrategy {
  name: string
  method: 'truncate' | 'summarize' | 'smart' | 'keyword'
  qualityMetrics: CompressionQualityMetrics
  userRating?: number
  usageCount: number
}

export interface CompressedDocument {
  originalContent: string
  compressedContent: string
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  method: string
  qualityMetrics?: CompressionQualityMetrics
  processingTimeMs?: number
  strategy?: CompressionStrategy
}

class DocumentCompressionService {
  /**
   * Check cache for existing summary
   */
  private async getCachedSummary(
    documentId: string,
    compressionMethod: string,
    compressionLevel: number,
    templateContext?: any
  ): Promise<CompressedDocument | null> {
    try {
      // Calculate hash for template context to match new constraint
      const templateContextHash = templateContext 
        ? crypto.createHash('md5').update(JSON.stringify(templateContext)).digest('hex')
        : null

      const result = await pool.query(
        `SELECT * FROM document_summaries 
         WHERE document_id = $1 
           AND compression_method = $2 
           AND compression_level = $3 
           AND template_context_hash IS NOT DISTINCT FROM $4
           AND is_valid = true
         ORDER BY created_at DESC 
         LIMIT 1`,
        [documentId, compressionMethod, compressionLevel, templateContextHash]
      )
      
      if (result.rows.length > 0) {
        const cached = result.rows[0]
        
        // Update reuse statistics
        await pool.query(
          `UPDATE document_summaries 
           SET times_reused = times_reused + 1, 
               last_reused_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [cached.id]
        )
        
        logger.info(`📦 [CACHE-HIT] Reusing cached summary for document ${documentId} (${compressionMethod}, reused ${cached.times_reused + 1} times)`)
        
        return {
          originalContent: cached.original_content,
          compressedContent: cached.compressed_content,
          originalTokens: cached.original_tokens,
          compressedTokens: cached.compressed_tokens,
          compressionRatio: parseFloat(cached.compression_ratio),
          method: cached.compression_method
        }
      }
      
      logger.info(`🔍 [CACHE-MISS] No cached summary found for document ${documentId}`)
      return null
    } catch (error) {
      logger.error('Error checking cache:', error)
      return null
    }
  }
  
  /**
   * Save summary to cache
   */
  private async saveSummaryToCache(
    documentId: string,
    result: CompressedDocument,
    compressionMethod: string,
    compressionLevel: number,
    aiProvider?: string,
    aiModel?: string,
    templateContext?: any
  ): Promise<void> {
    try {
      // Calculate hash for template context to match new constraint
      const templateContextHash = templateContext 
        ? crypto.createHash('md5').update(JSON.stringify(templateContext)).digest('hex')
        : null

      await pool.query(
        `INSERT INTO document_summaries (
          document_id, compression_method, compression_level,
          original_content, original_tokens,
          compressed_content, compressed_tokens, compression_ratio,
          target_tokens, ai_provider, ai_model, template_context, template_context_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (document_id, compression_method, compression_level, template_context_hash) 
        DO UPDATE SET
          compressed_content = EXCLUDED.compressed_content,
          compressed_tokens = EXCLUDED.compressed_tokens,
          compression_ratio = EXCLUDED.compression_ratio,
          ai_provider = EXCLUDED.ai_provider,
          ai_model = EXCLUDED.ai_model,
          template_context = EXCLUDED.template_context,
          updated_at = CURRENT_TIMESTAMP,
          is_valid = true`,
        [
          documentId,
          compressionMethod,
          compressionLevel,
          result.originalContent,
          result.originalTokens,
          result.compressedContent,
          result.compressedTokens,
          result.compressionRatio,
          Math.ceil(result.originalTokens * compressionLevel),
          aiProvider || null,
          aiModel || null,
          templateContext ? JSON.stringify(templateContext) : null,
          templateContextHash
        ]
      )
      
      logger.info(`💾 [CACHE-SAVE] Saved summary to cache for document ${documentId}`)
    } catch (error) {
      logger.error('Error saving to cache:', error)
      // Don't fail the operation if caching fails
    }
  }
  
  /**
   * Compress a document based on the specified compression level
   */
  async compressDocument(
    content: string,
    options: DocumentCompressionOptions
  ): Promise<CompressedDocument> {
    const startTime = Date.now()
    
    try {
      const method = options.method || 'truncate'
      let result: CompressedDocument
      
      switch (method) {
        case 'truncate':
          result = this.truncateDocument(content, options)
          break
        case 'summarize':
          result = await this.summarizeDocument(content, options)
          break
        case 'smart':
          result = await this.smartCompressDocument(content, options)
          break
        case 'keyword':
          result = await this.keywordBasedCompression(content, options)
          break
        default:
          result = this.truncateDocument(content, options)
      }
      
      // Calculate quality metrics
      const qualityMetrics = await this.calculateQualityMetrics(result.compressedContent, content)
      result.qualityMetrics = qualityMetrics
      result.processingTimeMs = Date.now() - startTime
      
      // Store compression metrics in database
      await this.storeCompressionMetrics(result)
      
      return result
    } catch (error) {
      logger.error('Document compression failed:', error)
      // Fallback to truncation
      const result = this.truncateDocument(content, options)
      result.processingTimeMs = Date.now() - startTime
      return result
    }
  }

  /**
   * Calculate quality metrics for compressed content
   */
  async calculateQualityMetrics(compressedContent: string, originalContent: string): Promise<CompressionQualityMetrics> {
    try {
      // Use AI to evaluate quality metrics
      const evaluationPrompt = `
        You are a document quality evaluator. You MUST respond with ONLY valid JSON - no explanations, no refusals, no commentary.
        
        Evaluate the quality of this compressed document compared to the original.
        
        Original Content Length: ${originalContent.length} characters
        Compressed Content Length: ${compressedContent.length} characters
        Compression Ratio: ${(compressedContent.length / originalContent.length * 100).toFixed(1)}%
        
        Rate each metric from 0.0 to 1.0. Respond with ONLY this JSON object (no markdown, no code blocks):
        
        {
          "coherence": 0.85,
          "completeness": 0.78,
          "relevance": 0.92,
          "readability": 0.88
        }
        
        Replace the values above with your ratings. RESPOND WITH ONLY THE JSON OBJECT.
      `
      
      // Get the first active AI provider from database
      const providerResult = await pool.query(
        "SELECT name FROM ai_providers WHERE is_active = true ORDER BY priority ASC NULLS LAST, name ASC LIMIT 1"
      )
      
      if (providerResult.rows.length === 0) {
        logger.warn('No active AI providers available for quality metrics, skipping')
        return {
          coherence: 0.8,
          completeness: 0.8,
          relevance: 0.8,
          readability: 0.8,
          overall: 0.8
        }
      }
      
      const activeProvider = providerResult.rows[0].name
      
      const aiRequest = {
        prompt: evaluationPrompt,
        provider: activeProvider,
        model: 'gemini-2.5-flash',
        temperature: 0.1,
        max_tokens: 1000
      }
      
      const aiResponse = await aiService.generateWithFallback(aiRequest, ['openai', 'google', 'anthropic', 'mistral', 'groq'])
      
      // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json ... ```)
      let jsonContent = aiResponse.content.trim()
      if (jsonContent.startsWith('```')) {
        // Remove opening ```json or ``` and closing ```
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '')
      }
      
      // Check if AI refused to provide metrics (starts with text instead of JSON)
      if (!jsonContent.startsWith('{')) {
        logger.warn('AI refused to provide quality metrics, using defaults. Response:', jsonContent.substring(0, 100))
        return {
          coherence: 0.85,
          completeness: 0.85,
          relevance: 0.85,
          readability: 0.85,
          overall: 0.85
        }
      }
      
      const metrics = JSON.parse(jsonContent)
      
      // Calculate overall score (weighted average)
      const overall = (
        metrics.coherence * 0.25 +
        metrics.completeness * 0.35 +
        metrics.relevance * 0.25 +
        metrics.readability * 0.15
      )
      
      return {
        coherence: metrics.coherence,
        completeness: metrics.completeness,
        relevance: metrics.relevance,
        readability: metrics.readability,
        overall
      }
    } catch (error) {
      logger.warn('Quality metrics calculation failed, using default values:', error instanceof Error ? error.message : String(error))
      // Return default metrics - don't throw, just use reasonable defaults
      return {
        coherence: 0.7,
        completeness: 0.7,
        relevance: 0.7,
        readability: 0.7,
        overall: 0.7
      }
    }
  }

  /**
   * Store compression metrics in database
   */
  async storeCompressionMetrics(result: CompressedDocument): Promise<void> {
    try {
      const query = `
        INSERT INTO compression_metrics (
          document_id, strategy_used, quality_metrics, processing_time_ms, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `
      
      await pool.query(query, [
        null, // document_id - would need to be passed in
        result.method,
        JSON.stringify(result.qualityMetrics),
        result.processingTimeMs
      ])
    } catch (error) {
      logger.error('Failed to store compression metrics:', error)
    }
  }

  /**
   * Simple truncation - take first X% of content
   */
  private truncateDocument(
    content: string,
    options: DocumentCompressionOptions
  ): CompressedDocument {
    const originalLength = content.length
    const targetLength = Math.floor(originalLength * options.compressionLevel)
    
    let compressedContent = content.substring(0, targetLength)
    
    // Try to end at a sentence boundary if possible
    if (options.preserveStructure) {
      const lastSentenceEnd = Math.max(
        compressedContent.lastIndexOf('.'),
        compressedContent.lastIndexOf('!'),
        compressedContent.lastIndexOf('?')
      )
      
      if (lastSentenceEnd > targetLength * 0.8) {
        compressedContent = compressedContent.substring(0, lastSentenceEnd + 1)
      }
    }
    
    const originalTokens = Math.ceil(originalLength / 4)
    const compressedTokens = Math.ceil(compressedContent.length / 4)
    const compressionRatio = compressedTokens / originalTokens
    
    return {
      originalContent: content,
      compressedContent,
      originalTokens,
      compressedTokens,
      compressionRatio,
      method: 'truncate'
    }
  }

  /**
   * Summarize document using AI to achieve exact token count
   */
  private async summarizeDocument(
    content: string,
    options: DocumentCompressionOptions
  ): Promise<CompressedDocument> {
    try {
      const originalLength = content.length
      const originalTokens = Math.ceil(originalLength / 4)
      const targetTokens = Math.ceil(originalTokens * options.compressionLevel)
      const targetCharacters = targetTokens * 4 // Rough estimate: 1 token ≈ 4 characters

      // Create a detailed summarization prompt
      const summarizationPrompt = this.createSummarizationPrompt(content, targetCharacters, options)

      // Get the highest priority active provider to start the fallback chain
      const providerResult = await pool.query(
        "SELECT provider_type FROM ai_providers WHERE is_active = true ORDER BY priority ASC NULLS LAST LIMIT 1"
      )
      
      const startingProvider = providerResult.rows.length > 0 ? providerResult.rows[0].provider_type : 'google'
      
      // Build AI request for summarization
      const aiRequest = {
        prompt: summarizationPrompt,
        provider: startingProvider, // Use highest priority provider, fallback will try others
        model: 'gemini-2.5-flash', // Use fast model
        temperature: 0.3, // Lower temperature for more consistent summarization
        max_tokens: targetTokens + 100 // Add buffer for prompt tokens
      }

      logger.info(`Summarizing document: ${originalTokens} tokens → ${targetTokens} tokens (${(options.compressionLevel * 100).toFixed(0)}%)`)
      logger.info(`🔄 Starting with provider: ${startingProvider}, using automatic fallback chain (priority order from database)`)

      // Use generateWithFallback - automatically tries providers in priority order until one succeeds
      // This prevents 503 overload errors by distributing load across multiple providers
      const aiResponse = await aiService.generateWithFallback(aiRequest)
      const compressedContent = aiResponse.content.trim()

      const compressedTokens = Math.ceil(compressedContent.length / 4)
      const compressionRatio = compressedTokens / originalTokens

      logger.info(`AI Summarization completed: ${compressedTokens} tokens (${(compressionRatio * 100).toFixed(1)}% of original)`)

      return {
        originalContent: content,
        compressedContent,
        originalTokens,
        compressedTokens,
        compressionRatio,
        method: 'ai-summarize'
      }

    } catch (error) {
      logger.error('AI summarization failed:', error)
      // Fallback to truncation if AI summarization fails
      logger.warn('Falling back to truncation due to AI summarization failure')
      return this.truncateDocument(content, options)
    }
  }

  /**
   * Smart compression - preserve structure and important content
   */
  private smartCompressDocument(
    content: string,
    options: DocumentCompressionOptions
  ): CompressedDocument {
    const originalLength = content.length
    const targetLength = Math.floor(originalLength * options.compressionLevel)
    
    // Split content into sections (headers, paragraphs, lists)
    const sections = this.parseDocumentSections(content)
    
    // Prioritize sections based on importance
    const prioritizedSections = this.prioritizeSections(sections)
    
    // Build compressed content
    let compressedContent = ''
    let currentLength = 0
    
    for (const section of prioritizedSections) {
      if (currentLength + section.content.length <= targetLength) {
        compressedContent += section.content
        currentLength += section.content.length
      } else {
        // Truncate this section to fit
        const remainingSpace = targetLength - currentLength
        if (remainingSpace > 100) { // Only include if there's meaningful space
          compressedContent += section.content.substring(0, remainingSpace)
        }
        break
      }
    }
    
    const originalTokens = Math.ceil(originalLength / 4)
    const compressedTokens = Math.ceil(compressedContent.length / 4)
    const compressionRatio = compressedTokens / originalTokens
    
    return {
      originalContent: content,
      compressedContent,
      originalTokens,
      compressedTokens,
      compressionRatio,
      method: 'smart'
    }
  }

  /**
   * Parse document into sections (headers, paragraphs, lists)
   */
  private parseDocumentSections(content: string): Array<{type: string, content: string, importance: number}> {
    const sections: Array<{type: string, content: string, importance: number}> = []
    
    // Split by double newlines (paragraphs)
    const paragraphs = content.split('\n\n')
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue
      
      let type = 'paragraph'
      let importance = 0.5
      
      // Check if it's a header
      if (paragraph.startsWith('# ')) {
        type = 'h1'
        importance = 1.0
      } else if (paragraph.startsWith('## ')) {
        type = 'h2'
        importance = 0.9
      } else if (paragraph.startsWith('### ')) {
        type = 'h3'
        importance = 0.8
      } else if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        type = 'list'
        importance = 0.6
      } else if (paragraph.startsWith('```')) {
        type = 'code'
        importance = 0.7
      }
      
      sections.push({ type, content: paragraph + '\n\n', importance })
    }
    
    return sections
  }

  /**
   * Prioritize sections based on importance
   */
  private prioritizeSections(sections: Array<{type: string, content: string, importance: number}>): Array<{type: string, content: string, importance: number}> {
    return sections.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Keyword-based compression - extract key information and compress non-essential content
   */
  private keywordBasedCompression(
    content: string,
    options: DocumentCompressionOptions
  ): CompressedDocument {
    const originalLength = content.length
    const targetLength = Math.floor(originalLength * options.compressionLevel)
    
    // Extract keywords and important terms
    const keywords = this.extractKeywords(content)
    const importantSections = this.extractImportantSections(content, keywords)
    
    // Build compressed content prioritizing important sections
    let compressedContent = ''
    let currentLength = 0
    
    // First, include all headers and important sections
    for (const section of importantSections) {
      if (currentLength + section.content.length <= targetLength) {
        compressedContent += section.content
        currentLength += section.content.length
      } else {
        // Truncate this section to fit
        const remainingSpace = targetLength - currentLength
        if (remainingSpace > 50) { // Only include if there's meaningful space
          compressedContent += section.content.substring(0, remainingSpace)
        }
        break
      }
    }
    
    // If there's still space, add keyword-rich content
    if (currentLength < targetLength * 0.8) {
      const keywordContent = this.extractKeywordRichContent(content, keywords, targetLength - currentLength)
      compressedContent += keywordContent
    }
    
    const originalTokens = Math.ceil(originalLength / 4)
    const compressedTokens = Math.ceil(compressedContent.length / 4)
    const compressionRatio = compressedTokens / originalTokens
    
    return {
      originalContent: content,
      compressedContent,
      originalTokens,
      compressedTokens,
      compressionRatio,
      method: 'keyword'
    }
  }

  /**
   * Extract keywords from document content
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - in a real implementation, you might use NLP libraries
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
    
    // Count word frequency
    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })
    
    // Get top keywords (appearing more than once)
    const keywords = Object.entries(wordCount)
      .filter(([word, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word)
    
    return keywords
  }

  /**
   * Extract sections that contain important keywords
   */
  private extractImportantSections(content: string, keywords: string[]): Array<{content: string, importance: number}> {
    const sections: Array<{content: string, importance: number}> = []
    const paragraphs = content.split('\n\n')
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue
      
      let importance = 0
      const lowerParagraph = paragraph.toLowerCase()
      
      // Check if it's a header (high importance)
      if (paragraph.startsWith('# ')) {
        importance += 1.0
      } else if (paragraph.startsWith('## ')) {
        importance += 0.9
      } else if (paragraph.startsWith('### ')) {
        importance += 0.8
      }
      
      // Check keyword density
      let keywordCount = 0
      keywords.forEach(keyword => {
        if (lowerParagraph.includes(keyword)) {
          keywordCount++
        }
      })
      
      importance += keywordCount * 0.1
      
      // Check for important patterns
      if (lowerParagraph.includes('requirement') || lowerParagraph.includes('objective') || 
          lowerParagraph.includes('goal') || lowerParagraph.includes('important')) {
        importance += 0.3
      }
      
      if (importance > 0) {
        sections.push({ content: paragraph + '\n\n', importance })
      }
    }
    
    return sections.sort((a, b) => b.importance - a.importance)
  }

  /**
   * Extract content rich in keywords
   */
  private extractKeywordRichContent(content: string, keywords: string[], maxLength: number): string {
    const sentences = content.split(/[.!?]+/)
    const keywordRichSentences: Array<{sentence: string, score: number}> = []
    
    for (const sentence of sentences) {
      if (!sentence.trim()) continue
      
      let score = 0
      const lowerSentence = sentence.toLowerCase()
      
      keywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) {
          score++
        }
      })
      
      if (score > 0) {
        keywordRichSentences.push({ sentence: sentence.trim(), score })
      }
    }
    
    // Sort by keyword score and build content
    keywordRichSentences.sort((a, b) => b.score - a.score)
    
    let result = ''
    for (const item of keywordRichSentences) {
      if (result.length + item.sentence.length <= maxLength) {
        result += item.sentence + '. '
      } else {
        break
      }
    }
    
    return result
  }

  /**
   * Create a detailed summarization prompt for AI with template context
   */
  private createSummarizationPrompt(
    content: string,
    targetCharacters: number,
    options: DocumentCompressionOptions
  ): string {
    const compressionPercentage = (options.compressionLevel * 100).toFixed(0)
    
    let prompt = `You are an expert document summarizer. Please summarize the following document to exactly ${compressionPercentage}% of its original length (approximately ${targetCharacters} characters).`

    // Add template context for focused summarization
    if (options.templateContext) {
      // Convert template content to string if it's JSONB
      const templateContentStr = typeof options.templateContext.content === 'string' 
        ? options.templateContext.content 
        : JSON.stringify(options.templateContext.content)
      
      prompt += `\n\nTEMPLATE CONTEXT FOR FOCUSED SUMMARIZATION:
The document you are summarizing will be used to generate a "${options.templateContext.name}" document.

Template Description: ${options.templateContext.description}

Template Structure Preview:
${templateContentStr.substring(0, 1000)}${templateContentStr.length > 1000 ? '...' : ''}`

      // Add system prompt if available
      if (options.templateContext.system_prompt) {
        prompt += `\n\nAI SYSTEM PROMPT FOR DOCUMENT GENERATION:
${options.templateContext.system_prompt}

This system prompt defines the AI assistant's role and behavior when generating the final document. Use this context to understand the intended tone, style, and focus of the document.`
      }

      // Add expected document structure if available
      if (options.templateContext.template_paragraphs && options.templateContext.template_paragraphs.length > 0) {
        prompt += `\n\nEXPECTED DOCUMENT STRUCTURE:
The final document should include these sections:`
        
        options.templateContext.template_paragraphs.forEach((paragraph: any, index: number) => {
          prompt += `\n${index + 1}. ${paragraph.section_name} (${paragraph.section_type})`
          prompt += `\n   Description: ${paragraph.description}`
          if (paragraph.prompt_guidance) {
            prompt += `\n   AI Guidance: ${paragraph.prompt_guidance}`
          }
          prompt += `\n   Required: ${paragraph.required ? 'Yes' : 'No'}`
        })
        
        prompt += `\n\nIMPORTANT: Focus your summary on information that will be most useful for generating these specific sections. Prioritize content that aligns with the expected document structure and requirements.`
      } else {
        prompt += `\n\nIMPORTANT: Focus your summary on information that is most relevant to generating this specific type of document. Prioritize content that will be useful for the intended document output.`
      }
    }
    
    prompt += `\n\nREQUIREMENTS:
- Preserve all critical information and key points
- Maintain the document's structure (headers, sections, lists) if possible
- Keep important technical terms, names, dates, and numbers
- Ensure the summary is coherent and readable
- Do not exceed the target length significantly
- Focus on the most important and relevant information`

    if (options.templateContext) {
      prompt += `\n- Prioritize information that aligns with the template's purpose and structure`
    }

    prompt += `\n\nDOCUMENT TO SUMMARIZE:
${content}

Please provide a comprehensive summary that captures the essence of the document while staying within the specified length limit.`

    if (options.preserveStructure) {
      prompt += `\n\nIMPORTANT: Preserve the document structure including headers (##, ###), lists (-, *), and formatting where possible.`
    }

    if (options.preserveKeywords) {
      prompt += `\n\nIMPORTANT: Preserve all important keywords, technical terms, and specific terminology from the original document.`
    }

    return prompt
  }

  /**
   * Collect user feedback for compression quality
   */
  async collectUserFeedback(
    documentId: string,
    rating: number,
    feedback: string,
    compressionMethod: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO compression_feedback (
          document_id, rating, feedback, compression_method, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `
      
      await pool.query(query, [documentId, rating, feedback, compressionMethod])
      
      // Update strategy performance based on feedback
      await this.updateStrategyPerformance(compressionMethod, rating)
    } catch (error) {
      logger.error('Failed to collect user feedback:', error)
    }
  }

  /**
   * Update strategy performance based on user feedback
   */
  async updateStrategyPerformance(method: string, rating: number): Promise<void> {
    try {
      const query = `
        UPDATE compression_strategies 
        SET 
          total_ratings = total_ratings + 1,
          average_rating = (average_rating * total_ratings + $2) / (total_ratings + 1),
          updated_at = CURRENT_TIMESTAMP
        WHERE method = $1
      `
      
      await pool.query(query, [method, rating])
    } catch (error) {
      logger.error('Failed to update strategy performance:', error)
    }
  }

  /**
   * Get optimal compression strategy for project type and document type
   */
  async getOptimalStrategy(projectType: string, documentType: string): Promise<CompressionStrategy> {
    try {
      const query = `
        SELECT 
          method,
          average_rating,
          total_ratings,
          usage_count,
          quality_metrics
        FROM compression_strategies 
        WHERE project_type = $1 AND document_type = $2
        ORDER BY average_rating DESC, usage_count DESC
        LIMIT 1
      `
      
      const result = await pool.query(query, [projectType, documentType])
      
      if (result.rows.length > 0) {
        const row = result.rows[0]
        return {
          name: `${row.method} (${projectType}/${documentType})`,
          method: row.method,
          qualityMetrics: row.quality_metrics,
          userRating: row.average_rating,
          usageCount: row.usage_count
        }
      }
      
      // Return default strategy if none found
      return {
        name: 'Default Summarization',
        method: 'summarize',
        qualityMetrics: {
          coherence: 0.8,
          completeness: 0.8,
          relevance: 0.8,
          readability: 0.8,
          overall: 0.8
        },
        usageCount: 0
      }
    } catch (error) {
      logger.error('Failed to get optimal strategy:', error)
      // Return default strategy
      return {
        name: 'Default Summarization',
        method: 'summarize',
        qualityMetrics: {
          coherence: 0.8,
          completeness: 0.8,
          relevance: 0.8,
          readability: 0.8,
          overall: 0.8
        },
        usageCount: 0
      }
    }
  }

  /**
   * Compare multiple compression strategies
   */
  async compareCompressionStrategies(
    content: string,
    strategies: CompressionStrategy[]
  ): Promise<CompressionStrategy[]> {
    const results: Array<CompressionStrategy & { compressedContent: string; processingTime: number }> = []
    
    for (const strategy of strategies) {
      try {
        const startTime = Date.now()
        const options: DocumentCompressionOptions = {
          compressionLevel: 0.8,
          method: strategy.method
        }
        
        const result = await this.compressDocument(content, options)
        const processingTime = Date.now() - startTime
        
        results.push({
          ...strategy,
          compressedContent: result.compressedContent,
          processingTime,
          qualityMetrics: result.qualityMetrics || strategy.qualityMetrics
        })
      } catch (error) {
        logger.error(`Failed to test strategy ${strategy.name}:`, error)
      }
    }
    
    // Sort by overall quality score
    return results.sort((a, b) => (b.qualityMetrics?.overall || 0) - (a.qualityMetrics?.overall || 0))
  }

  /**
   * Get compression analytics and insights
   */
  async getCompressionAnalytics(timeRange: string = '30 days'): Promise<any> {
    try {
      const query = `
        SELECT 
          strategy_used,
          AVG(quality_metrics->>'overall')::float as avg_quality,
          AVG(processing_time_ms) as avg_processing_time,
          COUNT(*) as usage_count,
          AVG(user_rating) as avg_user_rating
        FROM compression_metrics cm
        LEFT JOIN compression_feedback cf ON cm.document_id = cf.document_id
        WHERE cm.created_at >= NOW() - INTERVAL '${timeRange}'
        GROUP BY strategy_used
        ORDER BY avg_quality DESC
      `
      
      const result = await pool.query(query)
      return result.rows
    } catch (error) {
      logger.error('Failed to get compression analytics:', error)
      return []
    }
  }

  /**
   * Estimate token count for content
   */
  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4)
  }
}

export const documentCompressionService = new DocumentCompressionService()
