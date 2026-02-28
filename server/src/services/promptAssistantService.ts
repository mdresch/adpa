/**
 * Prompt Assistant Service
 * Provides AI-powered prompt engineering assistance for template creation
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { aiService } from './aiService'

export interface PromptSuggestionRequest {
  templateType: string
  methodology: string
  templateId?: string
  templateVersion?: number
  context: {
    projectType?: string
    industry?: string
    documentPurpose?: string
    targetAudience?: string
  }
}

export interface PromptOptimizationRequest {
  currentPrompt: string
  issues: PromptIssue[]
  templateType?: string
  methodology?: string
  templateId?: string
  templateVersion?: number
  context: PromptSuggestionRequest['context']
}

export interface PromptScore {
  overall: number
  clarity: number
  specificity: number
  context_awareness: number
  extraction_focus: number
  negative_rules: number
  details: {
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
  }
}

export interface PromptIssue {
  type: 'error' | 'warning' | 'suggestion'
  message: string
  position?: number
  severity: number
}

export interface PromptSuggestion {
  system_prompt: string
  explanation: string
  context_requirements: string[]
  expected_output_format: string
  confidence: number
  ai_provider_used?: string
  ai_model_used?: string
}

export class PromptAssistantService {
  private async getPreferredProviderConfig(): Promise<{ provider: string; model: string }> {
    const providerResult = await pool.query(
      "SELECT provider_type, default_model FROM ai_providers WHERE is_active = true ORDER BY priority ASC LIMIT 1"
    )

    return {
      provider: providerResult.rows[0]?.provider_type || 'openai',
      model: providerResult.rows[0]?.default_model || 'gpt-4o'
    }
  }

  private parseJsonResponse(content: string): any {
    try {
      return JSON.parse(content)
    } catch (parseError) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw parseError
    }
  }

  /**
   * Generate AI-powered prompt suggestions based on template type and context
   */
  async suggestPrompt(request: PromptSuggestionRequest): Promise<PromptSuggestion> {
    try {
      const preferred = await this.getPreferredProviderConfig()
      const contextPrompt = this.buildContextPrompt(request)
      
      const aiPrompt = `You are an expert prompt engineer for project management documentation.

Generate a high-quality system prompt for a ${request.templateType} document.

Context:
${contextPrompt}

Requirements:
1. The prompt must focus on EXTRACTION from real project data, not generation of generic content
2. Include specific DO NOT rules to prevent unwanted behavior
3. Reference the provided context (project data, documents, etc.)
4. Be specific about the output format and structure
5. Include clear instructions for handling missing data

Return a JSON object with:
{
  "system_prompt": "The complete system prompt",
  "explanation": "Why this prompt works well",
  "context_requirements": ["array", "of", "required", "context"],
  "expected_output_format": "Description of expected output",
  "confidence": 0.95
}`

      const response = await aiService.generateWithFallback({
        prompt: aiPrompt,
        provider: preferred.provider,
        model: preferred.model,
        temperature: 0.3,
        max_tokens: 2000,
        traceName: `prompt-assistant-suggest-${request.templateType || 'unknown'}`,
        aiCallType: 'prompt_assistant_suggest',
        template_id: request.templateId,
        template_name: request.templateType,
        template_version: request.templateVersion,
        metadata: {
          requestType: 'suggest',
          methodology: request.methodology || null,
          projectType: request.context?.projectType || null,
          industry: request.context?.industry || null,
          documentPurpose: request.context?.documentPurpose || null,
          targetAudience: request.context?.targetAudience || null,
        }
      })

      const suggestion = this.parseJsonResponse(response.content)
      
      // Validate and enhance the suggestion
      return {
        ...suggestion,
        system_prompt: this.enhancePrompt(suggestion.system_prompt, request),
        ai_provider_used: response.providerUsed || response.provider,
        ai_model_used: response.model
      }
    } catch (error) {
      logger.error('Error generating prompt suggestion', { error, request })
      throw new Error('Failed to generate prompt suggestion')
    }
  }

  /**
   * Optimize an existing prompt based on identified issues
   */
  async optimizePrompt(request: PromptOptimizationRequest): Promise<PromptSuggestion> {
    try {
      const preferred = await this.getPreferredProviderConfig()
      const issuesPrompt = request.issues.map(issue => 
        `${issue.type.toUpperCase()}: ${issue.message}`
      ).join('\n')

      const aiPrompt = `You are an expert prompt engineer. Optimize this system prompt to address specific issues.

Current Prompt:
${request.currentPrompt}

Issues to Fix:
${issuesPrompt}

Context:
${this.buildContextPrompt(request.context)}

Requirements:
1. Fix all identified issues
2. Maintain the core intent of the prompt
3. Enhance clarity and specificity
4. Strengthen extraction focus
5. Add or improve negative rules

Return a JSON object with:
{
  "system_prompt": "The optimized system prompt",
  "explanation": "What was changed and why",
  "context_requirements": ["array", "of", "required", "context"],
  "expected_output_format": "Description of expected output",
  "confidence": 0.95
}`

      const response = await aiService.generateWithFallback({
        prompt: aiPrompt,
        provider: preferred.provider,
        model: preferred.model,
        temperature: 0.2,
        max_tokens: 2000,
        traceName: `prompt-assistant-optimize-${request.templateType || 'unknown'}`,
        aiCallType: 'prompt_assistant_optimize',
        template_id: request.templateId,
        template_name: request.templateType || 'unknown',
        template_version: request.templateVersion,
        metadata: {
          requestType: 'optimize',
          issueCount: request.issues?.length || 0,
          methodology: request.methodology || null,
          projectType: request.context?.projectType || null,
          industry: request.context?.industry || null,
          documentPurpose: request.context?.documentPurpose || null,
          targetAudience: request.context?.targetAudience || null,
        }
      })

      const optimized = this.parseJsonResponse(response.content)

      return {
        ...optimized,
        ai_provider_used: response.providerUsed || response.provider,
        ai_model_used: response.model
      }
    } catch (error) {
      logger.error('Error optimizing prompt', { error, request })
      throw new Error('Failed to optimize prompt')
    }
  }

  /**
   * Score a prompt on multiple quality dimensions
   */
  async scorePrompt(prompt: string): Promise<PromptScore> {
    const scores = {
      clarity: this.scoreClarity(prompt),
      specificity: this.scoreSpecificity(prompt),
      context_awareness: this.scoreContextAwareness(prompt),
      extraction_focus: this.scoreExtractionFocus(prompt),
      negative_rules: this.scoreNegativeRules(prompt)
    }

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length

    return {
      overall,
      ...scores,
      details: this.generateScoreDetails(prompt, scores)
    }
  }

  /**
   * Get curated prompt templates from the library
   */
  async getPromptLibrary(filters?: {
    category?: string
    methodology?: string
    is_public?: boolean
  }): Promise<any[]> {
    let query = `
      SELECT 
        pt.*,
        u.name as created_by_name,
        COUNT(tp.id) as usage_count,
        AVG(tp.user_feedback) as avg_feedback
      FROM prompt_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      LEFT JOIN template_performance tp ON pt.id = tp.prompt_template_id
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1

    if (filters?.category) {
      query += ` AND pt.category = $${paramIndex++}`
      params.push(filters.category)
    }
    
    if (filters?.methodology) {
      query += ` AND pt.methodology = $${paramIndex++}`
      params.push(filters.methodology)
    }
    
    if (filters?.is_public !== undefined) {
      query += ` AND pt.is_public = $${paramIndex++}`
      params.push(filters.is_public)
    }

    query += `
      GROUP BY pt.id, u.name
      ORDER BY pt.rating DESC, pt.usage_count DESC
    `

    const result = await pool.query(query, params)
    return result.rows
  }

  /**
   * Save a prompt template to the library
   */
  async savePromptTemplate(template: {
    name: string
    description: string
    category: string
    methodology: string
    system_prompt: string
    context_requirements: string[]
    is_public: boolean
    created_by: string
  }): Promise<string> {
    const id = uuidv4()
    
    const query = `
      INSERT INTO prompt_templates (
        id, name, description, category, methodology, 
        system_prompt, context_requirements, is_public, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `

    await pool.query(query, [
      id, template.name, template.description, template.category,
      template.methodology, template.system_prompt,
      JSON.stringify(template.context_requirements),
      template.is_public, template.created_by
    ])

    return id
  }

  /**
   * Track template performance for analytics
   */
  async trackPerformance(data: {
    template_id: string
    prompt_template_id?: string
    generation_id: string
    model_used: string
    quality_score: number
    generation_time: number
    cost: number
    user_feedback?: number
  }): Promise<void> {
    const query = `
      INSERT INTO template_performance (
        template_id, prompt_template_id, generation_id, model_used,
        quality_score, generation_time, cost, user_feedback
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `

    await pool.query(query, [
      data.template_id,
      data.prompt_template_id,
      data.generation_id,
      data.model_used,
      data.quality_score,
      data.generation_time,
      data.cost,
      data.user_feedback
    ])
  }

  // Private helper methods
  private buildContextPrompt(request: PromptSuggestionRequest | PromptSuggestionRequest['context']): string {
    const context = []

    const hasTopLevelFields = (payload: PromptSuggestionRequest | PromptSuggestionRequest['context']): payload is PromptSuggestionRequest => {
      return typeof (payload as PromptSuggestionRequest).templateType === 'string' || typeof (payload as PromptSuggestionRequest).methodology === 'string'
    }

    const contextSource = hasTopLevelFields(request) ? request.context : request

    if (hasTopLevelFields(request) && request.templateType) context.push(`Template Type: ${request.templateType}`)
    if (hasTopLevelFields(request) && request.methodology) context.push(`Methodology: ${request.methodology}`)
    if (contextSource.projectType) context.push(`Project Type: ${contextSource.projectType}`)
    if (contextSource.industry) context.push(`Industry: ${contextSource.industry}`)
    if (contextSource.documentPurpose) context.push(`Purpose: ${contextSource.documentPurpose}`)
    if (contextSource.targetAudience) context.push(`Audience: ${contextSource.targetAudience}`)
    
    return context.join('\n')
  }

  private enhancePrompt(prompt: string, request: PromptSuggestionRequest): string {
    // Add standard enhancements
    let enhanced = prompt
    
    // Ensure extraction focus
    if (!prompt.toLowerCase().includes('extract')) {
      enhanced = `You are a PROJECT DOCUMENT ANALYST extracting information from REAL PROJECT DATA.\n\n${enhanced}`
    }
    
    // Add negative rules if missing
    if (!prompt.includes('DO NOT') && !prompt.includes('DON\'T')) {
      enhanced += `\n\nCRITICAL RULES:\n1. ❌ DO NOT generate generic or example content\n2. ❌ DO NOT make assumptions beyond the provided context\n3. ✅ ONLY use information from the actual project data`
    }
    
    return enhanced
  }

  private scoreClarity(prompt: string): number {
    // Score based on readability, structure, and ambiguity
    const sentences = prompt.split('.').length
    const avgSentenceLength = prompt.length / sentences
    const hasStructure = prompt.includes('\n') || prompt.includes('1.') || prompt.includes('-')
    
    let score = 50
    if (avgSentenceLength < 30) score += 20
    if (hasStructure) score += 20
    if (prompt.length > 100 && prompt.length < 1000) score += 10
    
    return Math.min(100, score)
  }

  private scoreSpecificity(prompt: string): number {
    // Score based on specific instructions vs generic ones
    const specificWords = ['extract', 'identify', 'analyze', 'specific', 'exact', 'precise']
    const genericWords = ['generate', 'create', 'make', 'write', 'produce']
    
    const specificCount = specificWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length
    const genericCount = genericWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length
    
    let score = 50
    score += specificCount * 10
    score -= genericCount * 15
    
    return Math.max(0, Math.min(100, score))
  }

  private scoreContextAwareness(prompt: string): number {
    // Score based on references to context, project data, etc.
    const contextWords = ['context', 'project', 'data', 'document', 'provided', 'actual', 'real']
    const count = contextWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length
    
    return Math.min(100, 30 + count * 12)
  }

  private scoreExtractionFocus(prompt: string): number {
    // Score based on extraction vs generation focus
    const extractionWords = ['extract', 'identify', 'find', 'locate', 'pull', 'gather']
    const generationWords = ['generate', 'create', 'make', 'write', 'produce', 'compose']
    
    const extractionCount = extractionWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length
    const generationCount = generationWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length
    
    let score = 50
    score += extractionCount * 15
    score -= generationCount * 20
    
    return Math.max(0, Math.min(100, score))
  }

  private scoreNegativeRules(prompt: string): number {
    // Score based on presence of negative rules
    if (prompt.includes('DO NOT') || prompt.includes('DON\'T')) {
      return 90
    }
    if (prompt.includes('avoid') || prompt.includes('never')) {
      return 70
    }
    return 30
  }

  private generateScoreDetails(prompt: string, scores: any): any {
    const details = {
      strengths: [],
      weaknesses: [],
      suggestions: []
    }

    if (scores.clarity > 80) details.strengths.push('Clear and well-structured')
    if (scores.clarity < 60) details.weaknesses.push('Could be clearer or better structured')
    
    if (scores.specificity > 80) details.strengths.push('Very specific instructions')
    if (scores.specificity < 60) details.weaknesses.push('Instructions could be more specific')
    
    if (scores.extraction_focus > 80) details.strengths.push('Strong focus on extraction')
    if (scores.extraction_focus < 60) {
      details.weaknesses.push('May generate instead of extract')
      details.suggestions.push('Add extraction-focused language')
    }
    
    if (scores.negative_rules < 70) {
      details.suggestions.push('Add DO NOT rules to prevent unwanted behavior')
    }

    return details
  }
}
