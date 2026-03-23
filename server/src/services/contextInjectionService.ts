import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { pool } from '../database/connection'

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'list' | 'object'
  source: 'project' | 'document' | 'computed' | 'user'
  path: string // e.g., "project.metadata.clientName"
  defaultValue?: any
  description: string
  required: boolean
  validation?: ValidationRule[]
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range'
  value: any
  message: string
}

export interface ContextInjectionConfig {
  strategy: 'prepend' | 'append' | 'interleave' | 'structured'
  templateVariables: TemplateVariable[]
  crossReferences: boolean
  citations: boolean
  dynamicContent: boolean
  personalization: boolean
}

export interface ContextInjectionResult {
  originalContent: string
  enhancedContent: string
  variablesResolved: number
  crossReferencesAdded: number
  citationsAdded: number
  processingTimeMs: number
  qualityScore: number
}

import { ProjectContext } from '@/types/adpa'

class ContextInjectionService {
  /**
   * Inject context into template content
   */
  async injectContext(
    templateContent: string,
    projectContext: ProjectContext,
    config: ContextInjectionConfig
  ): Promise<ContextInjectionResult> {
    const startTime = Date.now()
    
    try {
      let enhancedContent = templateContent
      let variablesResolved = 0
      let crossReferencesAdded = 0
      let citationsAdded = 0

      // Step 1: Parse and resolve template variables
      const variables = await this.parseTemplateVariables(templateContent)
      const resolvedVariables = await this.resolveVariables(variables, projectContext)
      
      enhancedContent = await this.injectVariables(enhancedContent, resolvedVariables)
      variablesResolved = Object.keys(resolvedVariables).length

      // Step 2: Add cross-references if enabled
      if (config.crossReferences) {
        enhancedContent = await this.generateCrossReferences(enhancedContent, projectContext)
        crossReferencesAdded = await this.countCrossReferences(enhancedContent)
      }

      // Step 3: Add citations if enabled
      if (config.citations) {
        enhancedContent = await this.addCitations(enhancedContent, projectContext.documents)
        citationsAdded = await this.countCitations(enhancedContent)
      }

      // Step 4: Apply content structuring
      if (config.strategy === 'structured') {
        enhancedContent = await this.structureContent(enhancedContent, projectContext)
      }

      // Step 5: Calculate quality score
      const qualityScore = await this.calculateQualityScore(enhancedContent, templateContent)

      const processingTimeMs = Date.now() - startTime

      return {
        originalContent: templateContent,
        enhancedContent,
        variablesResolved,
        crossReferencesAdded,
        citationsAdded,
        processingTimeMs,
        qualityScore
      }
    } catch (error) {
      logger.error('Context injection failed:', error)
      throw error
    }
  }

  /**
   * Parse template variables from content
   */
  async parseTemplateVariables(content: string): Promise<TemplateVariable[]> {
    const variables: TemplateVariable[] = []
    
    // Match template variables in format {{variable.name}} or {{variable.name:default}}
    const variableRegex = /\{\{([^}]+)\}\}/g
    let match

    while ((match = variableRegex.exec(content)) !== null) {
      const variableString = match[1]
      const [name, defaultValue] = variableString.split(':')
      
      const variable: TemplateVariable = {
        name: name.trim(),
        type: 'text', // Default type
        source: 'project', // Default source
        path: name.trim(),
        defaultValue: defaultValue?.trim(),
        description: `Template variable: ${name.trim()}`,
        required: !defaultValue
      }

      // Infer type from variable name
      if (name.includes('date') || name.includes('Date')) {
        variable.type = 'date'
      } else if (name.includes('count') || name.includes('number') || name.includes('Number')) {
        variable.type = 'number'
      } else if (name.includes('list') || name.includes('List') || name.includes('[]')) {
        variable.type = 'list'
      } else if (name.includes('object') || name.includes('Object') || name.includes('{}')) {
        variable.type = 'object'
      }

      // Infer source from variable name
      if (name.startsWith('project.')) {
        variable.source = 'project'
        variable.path = name
      } else if (name.startsWith('document.')) {
        variable.source = 'document'
        variable.path = name
      } else if (name.startsWith('user.')) {
        variable.source = 'user'
        variable.path = name
      } else if (name.startsWith('computed.')) {
        variable.source = 'computed'
        variable.path = name
      }

      variables.push(variable)
    }

    return variables
  }

  /**
   * Resolve variable values from project context
   */
  async resolveVariables(
    variables: TemplateVariable[],
    projectContext: ProjectContext
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {}

    for (const variable of variables) {
      try {
        let value: any

        switch (variable.source) {
          case 'project':
            value = this.getNestedValue(projectContext, variable.path.replace('project.', ''))
            break
          case 'document':
            // Find document by name or ID
            const docPath = variable.path.replace('document.', '')
            const document = projectContext.documents.find(doc => 
              doc.name === docPath || doc.id === docPath
            )
            value = document ? this.getNestedValue(document, 'content') : null
            break
          case 'computed':
            value = await this.computeValue(variable, projectContext)
            break
          case 'user':
            // User-specific values would need to be passed in or retrieved
            value = variable.defaultValue
            break
          default:
            value = variable.defaultValue
        }

        // Apply type conversion
        value = this.convertValue(value, variable.type)

        // Apply validation
        if (this.validateValue(value, variable)) {
          resolved[variable.name] = value
        } else {
          resolved[variable.name] = variable.defaultValue || ''
        }
      } catch (error) {
        logger.warn(`Failed to resolve variable ${variable.name}:`, error)
        resolved[variable.name] = variable.defaultValue || ''
      }
    }

    return resolved
  }

  /**
   * Inject resolved variables into content
   */
  async injectVariables(
    content: string,
    variables: Record<string, any>
  ): Promise<string> {
    let result = content

    for (const [name, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${name}(?::[^}]*)?\\}\\}`, 'g')
      result = result.replace(regex, String(value))
    }

    return result
  }

  /**
   * Generate cross-references between related content
   */
  async generateCrossReferences(
    content: string,
    projectContext: ProjectContext
  ): Promise<string> {
    try {
      const crossReferencePrompt = `
        Analyze the following content and add cross-references to related project information.
        
        Project Context:
        - Name: ${projectContext.name}
        - Framework: ${projectContext.framework}
        - Stakeholders: ${projectContext.stakeholders.map(s => `${s.name} (${s.role})`).join(', ')}
        - Documents: ${projectContext.documents.map(d => d.name).join(', ')}
        
        Content to enhance:
        ${content}
        
        Please add cross-references in the format [See: Reference Name] where appropriate.
        Focus on:
        1. References to stakeholders and their roles
        2. References to related documents
        3. References to project phases or milestones
        4. References to technical components or systems
        
        Return the enhanced content with cross-references added.
      `

      const aiRequest = {
        prompt: crossReferencePrompt,
        provider: "Google AI Studio",
        model: 'gemini-pro',
        temperature: 0.3,
        max_tokens: 8000
      }

      const aiResponse = await aiService.generateWithFallback(aiRequest, ['openai', 'google', 'anthropic', 'mistral', 'groq'])
      return aiResponse.content.trim()
    } catch (error) {
      logger.error('Failed to generate cross-references:', error)
      return content
    }
  }

  /**
   * Add citations to source documents
   */
  async addCitations(
    content: string,
    documents: ProjectContext['documents']
  ): Promise<string> {
    try {
      if (documents.length === 0) return content

      const citationPrompt = `
        Add citations to the following content based on the available source documents.
        
        Available Documents:
        ${documents.map((doc, index) => `${index + 1}. ${doc.name} (${doc.type})`).join('\n')}
        
        Content to enhance:
        ${content}
        
        Please add citations in the format [1], [2], etc. and include a references section at the end.
        Only cite documents that are actually relevant to the content.
        
        Return the enhanced content with citations added.
      `

      const aiRequest = {
        prompt: citationPrompt,
        provider: "Google AI Studio",
        model: 'gemini-pro',
        temperature: 0.2,
        max_tokens: 8000
      }

      const aiResponse = await aiService.generateWithFallback(aiRequest, ['openai', 'google', 'anthropic', 'mistral', 'groq'])
      return aiResponse.content.trim()
    } catch (error) {
      logger.error('Failed to add citations:', error)
      return content
    }
  }

  /**
   * Structure content based on project context
   */
  async structureContent(
    content: string,
    projectContext: ProjectContext
  ): Promise<string> {
    try {
      const structuringPrompt = `
        Structure the following content according to the project framework and best practices.
        
        Project Framework: ${projectContext.framework}
        Project Type: ${projectContext.metadata?.type || 'General'}
        
        Content to structure:
        ${content}
        
        Please:
        1. Add appropriate headers and sections
        2. Organize content logically
        3. Add executive summary if missing
        4. Include relevant appendices
        5. Ensure proper formatting and structure
        
        Return the well-structured content.
      `

      const aiRequest = {
        prompt: structuringPrompt,
        provider: "Google AI Studio",
        model: 'gemini-pro',
        temperature: 0.3,
        max_tokens: 8000
      }

      const aiResponse = await aiService.generateWithFallback(aiRequest, ['openai', 'google', 'anthropic', 'mistral', 'groq'])
      return aiResponse.content.trim()
    } catch (error) {
      logger.error('Failed to structure content:', error)
      return content
    }
  }

  /**
   * Generate table of contents from structured content
   */
  async generateTableOfContents(content: string): Promise<string> {
    const lines = content.split('\n')
    const toc: Array<{level: number, title: string, id: string}> = []
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const title = match[2].trim()
        const id = `heading-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        toc.push({ level, title, id })
      }
    })
    
    if (toc.length === 0) return ''
    
    let tocContent = '## Table of Contents\n\n'
    toc.forEach(item => {
      const indent = '  '.repeat(item.level - 1)
      tocContent += `${indent}- [${item.title}](#${item.id})\n`
    })
    
    return tocContent + '\n'
  }

  /**
   * Create cross-references between related content
   */
  async createCrossReferences(content: string): Promise<string> {
    // This would implement intelligent cross-referencing logic
    // For now, return the content as-is
    return content
  }

  // Helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async computeValue(variable: TemplateVariable, projectContext: ProjectContext): Promise<any> {
    // Implement computed value logic based on variable name
    switch (variable.name) {
      case 'computed.stakeholderCount':
        return projectContext.stakeholders.length
      case 'computed.documentCount':
        return projectContext.documents.length
      case 'computed.projectAge':
        // Calculate project age from creation date
        return 'N/A' // Would need actual creation date
      default:
        return variable.defaultValue
    }
  }

  private convertValue(value: any, type: TemplateVariable['type']): any {
    if (value === null || value === undefined) return value

    switch (type) {
      case 'number':
        return Number(value) || 0
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'list':
        return Array.isArray(value) ? value : [value]
      case 'object':
        return typeof value === 'object' ? value : { value }
      default:
        return String(value)
    }
  }

  private validateValue(value: any, variable: TemplateVariable): boolean {
    if (variable.required && (value === null || value === undefined || value === '')) {
      return false
    }

    if (variable.validation) {
      for (const rule of variable.validation) {
        if (!this.applyValidationRule(value, rule)) {
          return false
        }
      }
    }

    return true
  }

  private applyValidationRule(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== ''
      case 'minLength':
        return String(value).length >= rule.value
      case 'maxLength':
        return String(value).length <= rule.value
      case 'pattern':
        return new RegExp(rule.value).test(String(value))
      case 'range':
        const num = Number(value)
        return num >= rule.value.min && num <= rule.value.max
      default:
        return true
    }
  }

  private async countCrossReferences(content: string): Promise<number> {
    const crossRefRegex = /\[See:[^\]]+\]/g
    const matches = content.match(crossRefRegex)
    return matches ? matches.length : 0
  }

  private async countCitations(content: string): Promise<number> {
    const citationRegex = /\[\d+\]/g
    const matches = content.match(citationRegex)
    return matches ? matches.length : 0
  }

  private async calculateQualityScore(enhancedContent: string, originalContent: string): Promise<number> {
    // Simple quality scoring based on content enhancement
    const originalLength = originalContent.length
    const enhancedLength = enhancedContent.length
    const lengthRatio = enhancedLength / originalLength

    // Score based on various factors
    let score = 0.5 // Base score

    // Length increase indicates more content was added
    if (lengthRatio > 1.1) score += 0.2
    if (lengthRatio > 1.5) score += 0.1

    // Check for cross-references
    const crossRefCount = await this.countCrossReferences(enhancedContent)
    if (crossRefCount > 0) score += 0.1

    // Check for citations
    const citationCount = await this.countCitations(enhancedContent)
    if (citationCount > 0) score += 0.1

    // Check for structured content (headers)
    const headerCount = (enhancedContent.match(/^#{1,6}\s+/gm) || []).length
    if (headerCount > 0) score += 0.1

    return Math.min(score, 1.0)
  }
}

export const contextInjectionService = new ContextInjectionService()

