/**
 * Context Injector
 * 
 * Main utility for injecting project context into AI prompts across providers.
 * Handles context extraction, prioritization, and intelligent prompt enhancement.
 */

import { ContextPriority } from './types'
import type {
  ContextData,
  ContextRequest,
  ContextResponse,
  ContextConfig,
  ContextError,
  ContextSection,
  ExtractionOptions,
  PriorityConfig
} from './types'
import {
  ProjectContextExtractor,
  DocumentContextExtractor,
  TemplateContextExtractor,
  UserContextExtractor,
  IntegrationContextExtractor
} from './extractors'
import { ContextPrioritizer } from './prioritizer'
import { TokenManager } from './token-manager'
import { logger } from '../../utils/logger'

export class ContextInjector {
  private static readonly DEFAULT_CONFIG: ContextConfig = {
    max_context_ratio: 0.7,
    default_priority: ContextPriority.MEDIUM,
    enable_smart_truncation: true,
    preserve_user_prompt: true,
    context_separator: '\n\n---\n\n',
    include_metadata: false
  }

  /**
   * Inject context into AI prompt
   */
  static async injectContext(request: ContextRequest, config: ContextConfig = this.DEFAULT_CONFIG): Promise<ContextResponse> {
    try {
      logger.debug(`[Context] Starting injection for user ${request.user_id}`)

      // Calculate available tokens for context
      const availableTokens = TokenManager.calculateAvailableTokens(
        request.prompt,
        request.provider,
        request.model || 'gpt-3.5-turbo',
        config.max_context_ratio
      )

      if (request.max_context_tokens && request.max_context_tokens < availableTokens) {
        // Use user-specified limit if it's lower
        const userLimit = Math.min(availableTokens, request.max_context_tokens)
        logger.info(`Using user-specified context token limit: ${userLimit}`)
      }

      const contextTokenLimit = Math.min(
        availableTokens,
        request.max_context_tokens || availableTokens
      )

      // Extract context data
      const contextData = await this.extractContextData(request, config)

      // Prioritize and select context sections
      const priorityConfig = request.priority_config || this.getDefaultPriorityConfig()
      const contextSections = ContextPrioritizer.optimizeContextSelection(
        ContextPrioritizer.prioritizeContext(contextData, contextTokenLimit, priorityConfig, request.custom_context),
        contextTokenLimit,
        request.prompt
      )

      // Build enhanced prompt
      const enhancedPrompt = this.buildEnhancedPrompt(
        request.prompt,
        contextSections,
        config
      )

      // Validate final token usage
      const tokenUsage = TokenManager.validateTokenUsage(
        request.prompt,
        this.extractContextContent(contextSections),
        request.provider,
        request.model || 'gpt-3.5-turbo'
      )

      // Generate context summary
      const contextSummary = this.generateContextSummary(contextSections)

      // Check for warnings
      const warnings = this.generateWarnings(contextSections, tokenUsage, contextTokenLimit)

      logger.info(`[Context] ${tokenUsage.context_tokens} tokens injected`)

      return {
        enhanced_prompt: enhancedPrompt,
        context_used: contextData,
        token_usage: tokenUsage,
        context_summary: contextSummary,
        warnings: warnings.length > 0 ? warnings : undefined
      }

    } catch (error) {
      logger.error('Context injection failed:', error)
      throw new Error(`Context injection failed: ${error}`)
    }
  }

  /**
   * Extract context data from various sources
   */
  private static async extractContextData(request: ContextRequest, config: ContextConfig): Promise<ContextData> {
    const contextData: ContextData = {}
    const extractionOptions: ExtractionOptions = {
      include_content: true,
      include_metadata: config.include_metadata,
      max_content_length: 2000,
      content_format: 'summary'
    }

    try {
      // Extract project context
      if (request.project_id) {
        contextData.project = await ProjectContextExtractor.extractById(
          request.project_id,
          request.user_id,
          extractionOptions
        )
      }

      // Extract document context
      if (request.document_ids && request.document_ids.length > 0) {
        contextData.documents = await DocumentContextExtractor.extractByIds(
          request.document_ids,
          request.user_id,
          extractionOptions
        )
      } else if (request.project_id) {
        // Get recent documents from the project
        contextData.documents = await DocumentContextExtractor.extractForProject(
          request.project_id,
          request.user_id,
          { ...extractionOptions, content_format: 'outline' }
        )
      }

      // Extract template context
      if (request.template_id) {
        const template = await TemplateContextExtractor.extractById(
          request.template_id,
          request.user_id,
          extractionOptions
        )
        if (template) {
          contextData.templates = [template]
        }
      } else if (contextData.project?.framework) {
        // Get relevant templates for the project framework
        contextData.templates = await TemplateContextExtractor.extractForFramework(
          contextData.project.framework,
          request.user_id,
          { ...extractionOptions, include_content: false }
        )
      }

      // Extract user context
      contextData.user = await UserContextExtractor.extractById(
        request.user_id,
        extractionOptions
      )

      // Extract integration context if requested
      if (request.include_integrations) {
        contextData.integrations = await IntegrationContextExtractor.extractActive(
          request.user_id,
          extractionOptions
        )
      }

      return contextData

    } catch (error) {
      logger.error('Failed to extract context data:', error)
      throw new Error(`Context data extraction failed: ${error}`)
    }
  }

  /**
   * Build enhanced prompt with context
   */
  private static buildEnhancedPrompt(
    originalPrompt: string,
    contextSections: ContextSection[],
    config: ContextConfig
  ): string {
    if (contextSections.length === 0) {
      return originalPrompt
    }

    const contextContent = contextSections
      .map(section => this.formatContextSection(section))
      .join('\n\n')

    const contextBlock = `CONTEXT INFORMATION:
${contextContent}

Please use the above context information to provide more accurate and relevant responses.`

    if (config.preserve_user_prompt) {
      return `${contextBlock}${config.context_separator}USER REQUEST:
${originalPrompt}`
    } else {
      return `${contextBlock}${config.context_separator}${originalPrompt}`
    }
  }

  /**
   * Format a context section for inclusion in prompt
   */
  private static formatContextSection(section: ContextSection): string {
    const typeLabel = section.type.toUpperCase()
    let formatted = `[${typeLabel}]`
    
    if (section.metadata) {
      const metaInfo = []
      if (section.metadata.framework) metaInfo.push(`Framework: ${section.metadata.framework}`)
      if (section.metadata.status) metaInfo.push(`Status: ${section.metadata.status}`)
      if (section.metadata.category) metaInfo.push(`Category: ${section.metadata.category}`)
      
      if (metaInfo.length > 0) {
        formatted += ` (${metaInfo.join(', ')})`
      }
    }
    
    formatted += `:\n${section.content}`
    
    return formatted
  }

  /**
   * Extract context content from sections
   */
  private static extractContextContent(sections: ContextSection[]): string {
    return sections.map(section => section.content).join('\n\n')
  }

  /**
   * Generate context summary
   */
  private static generateContextSummary(sections: ContextSection[]): string {
    if (sections.length === 0) {
      return 'No context information included'
    }

    const typeCounts: Record<string, number> = {}
    let totalTokens = 0

    for (const section of sections) {
      typeCounts[section.type] = (typeCounts[section.type] || 0) + 1
      totalTokens += section.tokens
    }

    const summaryParts = Object.entries(typeCounts).map(([type, count]) => 
      `${count} ${type}${count > 1 ? 's' : ''}`
    )

    return `Included ${summaryParts.join(', ')} (${totalTokens} tokens)`
  }

  /**
   * Generate warnings about context usage
   */
  private static generateWarnings(
    sections: ContextSection[],
    tokenUsage: any,
    contextTokenLimit: number
  ): string[] {
    const warnings: string[] = []

    // Check if context was truncated
    const totalContextTokens = sections.reduce((sum, section) => sum + section.tokens, 0)
    if (totalContextTokens >= contextTokenLimit * 0.95) {
      warnings.push('Context was truncated due to token limits. Some information may be missing.')
    }

    // Check if context ratio is very high
    if (tokenUsage.context_ratio > 0.8) {
      warnings.push('High context usage may limit response length.')
    }

    // Check if no project context was included
    const hasProjectContext = sections.some(section => section.type === 'project')
    if (!hasProjectContext) {
      warnings.push('No project context was included. Responses may be less specific to your project.')
    }

    return warnings
  }

  /**
   * Get default priority configuration
   */
  private static getDefaultPriorityConfig(): PriorityConfig {
    return {
      project: ContextPriority.HIGH,
      documents: ContextPriority.HIGH,
      templates: ContextPriority.MEDIUM,
      user: ContextPriority.LOW,
      integrations: ContextPriority.LOW,
      custom: ContextPriority.MEDIUM
    }
  }

  /**
   * Validate context request
   */
  static validateRequest(request: ContextRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required')
    }

    if (!request.user_id) {
      throw new Error('User ID is required')
    }

    if (!request.provider) {
      throw new Error('Provider is required')
    }

    if (request.max_context_tokens && request.max_context_tokens < 0) {
      throw new Error('Max context tokens must be non-negative')
    }
  }

  /**
   * Get context statistics
   */
  static async getContextStats(request: ContextRequest): Promise<{
    available_tokens: number
    estimated_context_tokens: number
    context_sources: string[]
  }> {
    const availableTokens = TokenManager.calculateAvailableTokens(
      request.prompt,
      request.provider,
      request.model || 'gpt-3.5-turbo'
    )

    const contextSources: string[] = []
    if (request.project_id) contextSources.push('project')
    if (request.document_ids?.length) contextSources.push('documents')
    if (request.template_id) contextSources.push('template')
    if (request.include_integrations) contextSources.push('integrations')
    if (request.custom_context) contextSources.push('custom')
    contextSources.push('user') // Always included

    // Rough estimation of context tokens
    const estimatedContextTokens = Math.min(
      availableTokens * 0.7,
      contextSources.length * 200 // Rough estimate per source
    )

    return {
      available_tokens: availableTokens,
      estimated_context_tokens: estimatedContextTokens,
      context_sources: contextSources
    }
  }
}

export {
  ContextConfig,
  ContextData,
  ContextRequest,
  ContextResponse,
  ContextError
}