/**
 * Context Injection Integration
 * 
 * Integration layer between the context injection system and the existing AI service.
 * Provides enhanced AI generation with automatic context injection.
 */

import { ContextInjector } from './injector'
import { ContextRequest, ContextConfig, ContextPriority } from './types'
import { aiService, AIGenerateRequest, AIGenerateResponse } from '../../services/aiService'
import { logger } from '../../utils/logger'

export interface EnhancedAIRequest extends AIGenerateRequest {
  // Context-specific fields
  project_id?: string
  document_ids?: string[]
  template_id?: string
  include_integrations?: boolean
  max_context_tokens?: number
  context_priority?: {
    project?: ContextPriority
    documents?: ContextPriority
    templates?: ContextPriority
    user?: ContextPriority
    integrations?: ContextPriority
    custom?: ContextPriority
  }
  custom_context?: Record<string, any>
  context_config?: Partial<ContextConfig>
  user_id: string // Required for context extraction
}

export interface EnhancedAIResponse extends AIGenerateResponse {
  context_summary?: string
  context_warnings?: string[]
  context_token_usage?: {
    context_tokens: number
    context_ratio: number
  }
}

export class ContextAwareAIService {
  /**
   * Generate AI response with automatic context injection
   */
  static async generateWithContext(request: EnhancedAIRequest): Promise<EnhancedAIResponse> {
    try {
      logger.info(`Starting context-aware AI generation for user ${request.user_id}`)

      // Validate the enhanced request
      this.validateEnhancedRequest(request)

      // Prepare context injection request
      const contextRequest: ContextRequest = {
        prompt: request.prompt,
        user_id: request.user_id,
        provider: request.provider,
        model: request.model,
        project_id: request.project_id,
        document_ids: request.document_ids,
        template_id: request.template_id,
        include_integrations: request.include_integrations,
        max_context_tokens: request.max_context_tokens,
        priority_config: request.context_priority,
        custom_context: request.custom_context
      }

      // Inject context into the prompt
      const contextResponse = await ContextInjector.injectContext(
        contextRequest,
        request.context_config
      )

      // Prepare AI service request with enhanced prompt
      const aiRequest: AIGenerateRequest = {
        prompt: contextResponse.enhanced_prompt,
        provider: request.provider,
        model: request.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        template_id: request.template_id,
        variables: request.variables
      }

      // Generate AI response
      const aiResponse = await aiService.generate(aiRequest)

      // Combine responses
      const enhancedResponse: EnhancedAIResponse = {
        ...aiResponse,
        context_summary: contextResponse.context_summary,
        context_warnings: contextResponse.warnings,
        context_token_usage: {
          context_tokens: contextResponse.token_usage.context_tokens,
          context_ratio: contextResponse.token_usage.context_ratio
        }
      }

      logger.info(`Context-aware AI generation completed. Context: ${contextResponse.context_summary}`)

      return enhancedResponse

    } catch (error) {
      logger.error('Context-aware AI generation failed:', error)
      
      // Fallback to regular AI generation without context
      logger.info('Falling back to regular AI generation without context')
      
      try {
        const fallbackRequest: AIGenerateRequest = {
          prompt: request.prompt,
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          template_id: request.template_id,
          variables: request.variables
        }

        const fallbackResponse = await aiService.generate(fallbackRequest)
        
        return {
          ...fallbackResponse,
          context_summary: 'Context injection failed, using original prompt',
          context_warnings: [`Context injection error: ${error.message}`],
          context_token_usage: {
            context_tokens: 0,
            context_ratio: 0
          }
        }

      } catch (fallbackError) {
        logger.error('Fallback AI generation also failed:', fallbackError)
        throw new Error(`AI generation failed: ${fallbackError.message}`)
      }
    }
  }

  /**
   * Get context preview without generating AI response
   */
  static async getContextPreview(request: Omit<EnhancedAIRequest, 'provider'>): Promise<{
    enhanced_prompt: string
    context_summary: string
    token_usage: any
    warnings?: string[]
  }> {
    try {
      const contextRequest: ContextRequest = {
        prompt: request.prompt,
        user_id: request.user_id,
        provider: 'openai', // Default provider for preview
        model: request.model || 'gpt-3.5-turbo',
        project_id: request.project_id,
        document_ids: request.document_ids,
        template_id: request.template_id,
        include_integrations: request.include_integrations,
        max_context_tokens: request.max_context_tokens,
        priority_config: request.context_priority,
        custom_context: request.custom_context
      }

      const contextResponse = await ContextInjector.injectContext(
        contextRequest,
        request.context_config
      )

      return {
        enhanced_prompt: contextResponse.enhanced_prompt,
        context_summary: contextResponse.context_summary,
        token_usage: contextResponse.token_usage,
        warnings: contextResponse.warnings
      }

    } catch (error) {
      logger.error('Context preview failed:', error)
      throw new Error(`Context preview failed: ${error.message}`)
    }
  }

  /**
   * Get context statistics for planning
   */
  static async getContextStatistics(request: Omit<EnhancedAIRequest, 'provider'>): Promise<{
    available_tokens: number
    estimated_context_tokens: number
    context_sources: string[]
    recommendations: string[]
  }> {
    try {
      const contextRequest: ContextRequest = {
        prompt: request.prompt,
        user_id: request.user_id,
        provider: 'openai', // Default provider for stats
        model: request.model || 'gpt-3.5-turbo',
        project_id: request.project_id,
        document_ids: request.document_ids,
        template_id: request.template_id,
        include_integrations: request.include_integrations,
        max_context_tokens: request.max_context_tokens,
        priority_config: request.context_priority,
        custom_context: request.custom_context
      }

      const stats = await ContextInjector.getContextStats(contextRequest)
      const recommendations = this.generateRecommendations(stats, request)

      return {
        ...stats,
        recommendations
      }

    } catch (error) {
      logger.error('Context statistics failed:', error)
      throw new Error(`Context statistics failed: ${error.message}`)
    }
  }

  /**
   * Batch process multiple requests with context
   */
  static async batchGenerateWithContext(requests: EnhancedAIRequest[]): Promise<EnhancedAIResponse[]> {
    const results: EnhancedAIResponse[] = []

    for (const request of requests) {
      try {
        const response = await this.generateWithContext(request)
        results.push(response)
      } catch (error) {
        logger.error(`Batch request failed for user ${request.user_id}:`, error)
        results.push({
          content: '',
          provider: request.provider,
          model: request.model || 'unknown',
          usage: undefined,
          metadata: { error: error.message },
          context_summary: 'Generation failed',
          context_warnings: [error.message],
          context_token_usage: { context_tokens: 0, context_ratio: 0 }
        })
      }
    }

    return results
  }

  /**
   * Validate enhanced AI request
   */
  private static validateEnhancedRequest(request: EnhancedAIRequest): void {
    if (!request.user_id) {
      throw new Error('User ID is required for context-aware AI generation')
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required')
    }

    if (!request.provider) {
      throw new Error('Provider is required')
    }

    if (request.max_context_tokens && request.max_context_tokens < 0) {
      throw new Error('Max context tokens must be non-negative')
    }

    if (request.document_ids && request.document_ids.length > 20) {
      throw new Error('Too many documents specified (max 20)')
    }
  }

  /**
   * Generate recommendations based on context statistics
   */
  private static generateRecommendations(
    stats: { available_tokens: number; estimated_context_tokens: number; context_sources: string[] },
    request: Omit<EnhancedAIRequest, 'provider'>
  ): string[] {
    const recommendations: string[] = []

    // Token usage recommendations
    if (stats.estimated_context_tokens > stats.available_tokens * 0.8) {
      recommendations.push('Consider reducing context scope or using a model with higher token limits')
    }

    if (stats.estimated_context_tokens < stats.available_tokens * 0.3) {
      recommendations.push('You could include more context for better results')
    }

    // Context source recommendations
    if (!stats.context_sources.includes('project') && !request.project_id) {
      recommendations.push('Consider specifying a project_id for more relevant context')
    }

    if (stats.context_sources.includes('documents') && request.document_ids && request.document_ids.length > 10) {
      recommendations.push('Consider reducing the number of documents for better focus')
    }

    if (!stats.context_sources.includes('templates') && !request.template_id) {
      recommendations.push('Consider using a template for structured output')
    }

    // Model recommendations
    if (request.model === 'gpt-3.5-turbo' && stats.estimated_context_tokens > 3000) {
      recommendations.push('Consider using gpt-4 or gpt-4-turbo for better handling of large context')
    }

    return recommendations
  }
}

// Export convenience functions
export const generateWithContext = ContextAwareAIService.generateWithContext.bind(ContextAwareAIService)
export const getContextPreview = ContextAwareAIService.getContextPreview.bind(ContextAwareAIService)
export const getContextStatistics = ContextAwareAIService.getContextStatistics.bind(ContextAwareAIService)
export const batchGenerateWithContext = ContextAwareAIService.batchGenerateWithContext.bind(ContextAwareAIService)