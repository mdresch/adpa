/**
 * Context Prioritizer
 * 
 * Manages prioritization and intelligent selection of context data
 * based on relevance, importance, and token constraints.
 */

import { ContextPriority } from './types'
import type {
  ContextData,
  ContextSection,
  PriorityConfig,
  ProjectContext,
  DocumentContext,
  TemplateContext,
  UserContext,
  IntegrationContext
} from './types'
import { TokenManager } from './token-manager'
import { logger } from '../../utils/logger'

export class ContextPrioritizer {
  private static readonly DEFAULT_PRIORITY_CONFIG: PriorityConfig = {
    project: ContextPriority.HIGH,
    documents: ContextPriority.HIGH,
    templates: ContextPriority.MEDIUM,
    user: ContextPriority.LOW,
    integrations: ContextPriority.LOW,
    custom: ContextPriority.MEDIUM
  }

  /**
   * Prioritize and select context sections based on available tokens
   */
  static prioritizeContext(
    contextData: ContextData,
    availableTokens: number,
    priorityConfig: PriorityConfig = this.DEFAULT_PRIORITY_CONFIG,
    customContext?: Record<string, any>
  ): ContextSection[] {
    const sections: ContextSection[] = []

    // Convert context data to sections
    if (contextData.project) {
      sections.push(this.createProjectSection(contextData.project, priorityConfig.project))
    }

    if (contextData.documents) {
      sections.push(...this.createDocumentSections(contextData.documents, priorityConfig.documents))
    }

    if (contextData.templates) {
      sections.push(...this.createTemplateSections(contextData.templates, priorityConfig.templates))
    }

    if (contextData.user) {
      sections.push(this.createUserSection(contextData.user, priorityConfig.user))
    }

    if (contextData.integrations) {
      sections.push(...this.createIntegrationSections(contextData.integrations, priorityConfig.integrations))
    }

    if (customContext) {
      sections.push(...this.createCustomSections(customContext, priorityConfig.custom))
    }

    // Sort by priority and relevance
    sections.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority first
      }
      return b.tokens - a.tokens // More content first within same priority
    })

    // Select sections that fit within token limit
    return this.selectSectionsWithinLimit(sections, availableTokens)
  }

  /**
   * Calculate relevance score for context based on prompt
   */
  static calculateRelevanceScore(
    contextContent: string,
    prompt: string,
    contextType: string
  ): number {
    if (!contextContent || !prompt) return 0

    const promptLower = prompt.toLowerCase()
    const contentLower = contextContent.toLowerCase()

    let score = 0

    // Keyword matching
    const promptWords = promptLower.split(/\s+/).filter(word => word.length > 3)
    const contentWords = contentLower.split(/\s+/)
    
    for (const word of promptWords) {
      if (contentWords.includes(word)) {
        score += 0.1
      }
    }

    // Context type relevance
    const typeRelevance = this.getTypeRelevance(contextType, promptLower)
    score += typeRelevance

    // Length penalty for very long content
    const lengthPenalty = Math.min(0.2, contextContent.length / 10000)
    score -= lengthPenalty

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Optimize context selection for maximum relevance within token limit
   */
  static optimizeContextSelection(
    sections: ContextSection[],
    availableTokens: number,
    prompt: string
  ): ContextSection[] {
    // Calculate relevance scores
    const scoredSections = sections.map(section => ({
      ...section,
      relevanceScore: this.calculateRelevanceScore(section.content, prompt, section.type),
      efficiency: TokenManager.calculateEfficiencyScore(
        section.content.length,
        section.tokens,
        this.calculateRelevanceScore(section.content, prompt, section.type)
      )
    }))

    // Sort by efficiency and priority
    scoredSections.sort((a, b) => {
      const priorityDiff = b.priority - a.priority
      if (Math.abs(priorityDiff) > 0.5) return priorityDiff
      
      return b.efficiency - a.efficiency
    })

    // Greedy selection within token limit
    const selected: ContextSection[] = []
    let usedTokens = 0

    for (const section of scoredSections) {
      if (usedTokens + section.tokens <= availableTokens) {
        selected.push(section)
        usedTokens += section.tokens
      }
    }

    return selected
  }

  private static createProjectSection(project: ProjectContext, priority: ContextPriority): ContextSection {
    const content = this.formatProjectContext(project)
    return {
      type: 'project',
      priority,
      content,
      tokens: TokenManager.estimateTokens(content),
      metadata: {
        project_id: project.id,
        framework: project.framework,
        status: project.status
      }
    }
  }

  private static createDocumentSections(documents: DocumentContext[], priority: ContextPriority): ContextSection[] {
    return documents.map(doc => {
      const content = this.formatDocumentContext(doc)
      return {
        type: 'document',
        priority,
        content,
        tokens: TokenManager.estimateTokens(content),
        metadata: {
          document_id: doc.id,
          project_id: doc.project_id,
          framework: doc.framework,
          status: doc.status
        }
      }
    })
  }

  private static createTemplateSections(templates: TemplateContext[], priority: ContextPriority): ContextSection[] {
    return templates.map(template => {
      const content = this.formatTemplateContext(template)
      return {
        type: 'template',
        priority,
        content,
        tokens: TokenManager.estimateTokens(content),
        metadata: {
          template_id: template.id,
          framework: template.framework,
          category: template.category
        }
      }
    })
  }

  private static createUserSection(user: UserContext, priority: ContextPriority): ContextSection {
    const content = this.formatUserContext(user)
    return {
      type: 'user',
      priority,
      content,
      tokens: TokenManager.estimateTokens(content),
      metadata: {
        user_id: user.id,
        role: user.role
      }
    }
  }

  private static createIntegrationSections(integrations: IntegrationContext[], priority: ContextPriority): ContextSection[] {
    return integrations.map(integration => {
      const content = this.formatIntegrationContext(integration)
      return {
        type: 'integration',
        priority,
        content,
        tokens: TokenManager.estimateTokens(content),
        metadata: {
          integration_id: integration.id,
          type: integration.type
        }
      }
    })
  }

  private static createCustomSections(customContext: Record<string, any>, priority: ContextPriority): ContextSection[] {
    return Object.entries(customContext).map(([key, value]) => {
      const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      return {
        type: 'custom',
        priority,
        content: `${key}: ${content}`,
        tokens: TokenManager.estimateTokens(content),
        metadata: { key }
      }
    })
  }

  private static selectSectionsWithinLimit(sections: ContextSection[], availableTokens: number): ContextSection[] {
    const selected: ContextSection[] = []
    let usedTokens = 0

    for (const section of sections) {
      if (usedTokens + section.tokens <= availableTokens) {
        selected.push(section)
        usedTokens += section.tokens
      } else {
        // Try to truncate the section to fit
        const remainingTokens = availableTokens - usedTokens
        if (remainingTokens > 50) { // Only truncate if we have reasonable space
          const truncatedContent = TokenManager.truncateToTokenLimit(section.content, remainingTokens)
          selected.push({
            ...section,
            content: truncatedContent,
            tokens: TokenManager.estimateTokens(truncatedContent)
          })
        }
        break
      }
    }

    return selected
  }

  private static formatProjectContext(project: ProjectContext): string {
    let context = `Project: ${project.name}\n`
    
    if (project.description) {
      context += `Description: ${project.description}\n`
    }
    
    context += `Framework: ${project.framework}\n`
    context += `Status: ${project.status}\n`
    context += `Priority: ${project.priority}\n`
    
    if (project.start_date) {
      context += `Start Date: ${project.start_date}\n`
    }
    
    if (project.end_date) {
      context += `End Date: ${project.end_date}\n`
    }
    
    if (project.budget) {
      context += `Budget: $${project.budget}\n`
    }
    
    if (project.team_members.length > 0) {
      context += `Team Members: ${project.team_members.length} members\n`
    }
    
    return context
  }

  private static formatDocumentContext(document: DocumentContext): string {
    let context = `Document: ${document.name}\n`
    context += `Framework: ${document.framework}\n`
    context += `Status: ${document.status}\n`
    context += `Version: ${document.version}\n`
    
    if (document.content) {
      const contentStr = typeof document.content === 'string' 
        ? document.content 
        : JSON.stringify(document.content, null, 2)
      
      context += `Content:\n${contentStr}\n`
    }
    
    return context
  }

  private static formatTemplateContext(template: TemplateContext): string {
    let context = `Template: ${template.name}\n`
    
    if (template.description) {
      context += `Description: ${template.description}\n`
    }
    
    context += `Framework: ${template.framework}\n`
    
    if (template.category) {
      context += `Category: ${template.category}\n`
    }
    
    if (template.variables.length > 0) {
      context += `Variables: ${template.variables.map(v => v.name || v).join(', ')}\n`
    }
    
    return context
  }

  private static formatUserContext(user: UserContext): string {
    let context = `User: ${user.name}\n`
    context += `Role: ${user.role}\n`
    context += `Email: ${user.email}\n`
    
    return context
  }

  private static formatIntegrationContext(integration: IntegrationContext): string {
    let context = `Integration: ${integration.name}\n`
    context += `Type: ${integration.type}\n`
    context += `Status: ${integration.is_active ? 'Active' : 'Inactive'}\n`
    
    if (integration.last_sync) {
      context += `Last Sync: ${integration.last_sync}\n`
    }
    
    return context
  }

  private static getTypeRelevance(contextType: string, prompt: string): number {
    const typeKeywords: Record<string, string[]> = {
      project: ['project', 'plan', 'scope', 'timeline', 'budget', 'team'],
      document: ['document', 'content', 'text', 'write', 'draft', 'review'],
      template: ['template', 'format', 'structure', 'example', 'pattern'],
      user: ['user', 'person', 'role', 'permission', 'access'],
      integration: ['integration', 'sync', 'connect', 'external', 'api']
    }

    const keywords = typeKeywords[contextType] || []
    let relevance = 0

    for (const keyword of keywords) {
      if (prompt.includes(keyword)) {
        relevance += 0.1
      }
    }

    return relevance
  }
}

export { ContextPriority }