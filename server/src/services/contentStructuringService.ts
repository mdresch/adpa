import { logger } from '../utils/logger'
import { pool } from '../database/connection'

export interface ContentStructure {
  sections: ContentSection[]
  variables: TemplateVariable[]
  metadata: ContentMetadata
  recommendations: ContentRecommendation[]
}

export interface ContentSection {
  id: string
  title: string
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'quote'
  level: number
  content: string
  variables: string[]
  suggestions: string[]
  order: number
}

export interface TemplateVariable {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object'
  defaultValue: any
  description: string
  required: boolean
  validation: VariableValidation
  context: VariableContext
}

export interface VariableValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
  options?: string[]
}

export interface VariableContext {
  source: 'project' | 'user' | 'system' | 'template'
  path: string
  description: string
}

export interface ContentMetadata {
  wordCount: number
  characterCount: number
  readingTime: number
  complexity: 'low' | 'medium' | 'high'
  structure: 'linear' | 'hierarchical' | 'modular'
  variables: number
  sections: number
}

export interface ContentRecommendation {
  type: 'structure' | 'content' | 'variable' | 'formatting'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  suggestion: string
  impact: string
}

export class ContentStructuringService {
  private readonly logger = logger.child({ service: 'ContentStructuringService' })

  /**
   * Analyze and structure content intelligently
   */
  async analyzeContent(content: string, projectId?: string): Promise<ContentStructure> {
    try {
      this.logger.info('Starting content analysis', { contentLength: content.length, projectId })

      // Extract sections from content
      const sections = await this.extractSections(content)
      
      // Identify and extract variables
      const variables = await this.extractVariables(content, projectId)
      
      // Generate metadata
      const metadata = this.generateMetadata(content, sections, variables)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(content, sections, variables, metadata)

      const structure: ContentStructure = {
        sections,
        variables,
        metadata,
        recommendations
      }

      this.logger.info('Content analysis completed', { 
        sections: sections.length, 
        variables: variables.length,
        recommendations: recommendations.length 
      })

      return structure
    } catch (error) {
      this.logger.error('Content analysis failed', { error })
      throw error
    }
  }

  /**
   * Extract structured sections from content
   */
  private async extractSections(content: string): Promise<ContentSection[]> {
    const sections: ContentSection[] = []
    const lines = content.split('\n')
    let currentSection: Partial<ContentSection> | null = null
    let sectionOrder = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Detect headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection as ContentSection)
        }

        // Start new section
        const level = headingMatch[1].length
        const title = headingMatch[2]
        
        currentSection = {
          id: `section-${sectionOrder}`,
          title,
          type: 'heading',
          level,
          content: line,
          variables: this.extractVariablesFromText(line),
          suggestions: [],
          order: sectionOrder++
        }
        continue
      }

      // Detect other content types
      if (currentSection) {
        if (line.startsWith('```')) {
          currentSection.type = 'code'
        } else if (line.startsWith('>')) {
          currentSection.type = 'quote'
        } else if (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
          currentSection.type = 'list'
        } else if (line.includes('|')) {
          currentSection.type = 'table'
        } else if (line.length > 0) {
          currentSection.type = 'paragraph'
        }

        // Accumulate content
        if (currentSection.content !== line) {
          currentSection.content += '\n' + line
        }

        // Extract variables from this line
        const lineVariables = this.extractVariablesFromText(line)
        currentSection.variables = [...new Set([...currentSection.variables, ...lineVariables])]
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection as ContentSection)
    }

    return sections
  }

  /**
   * Extract variables from content
   */
  private async extractVariables(content: string, projectId?: string): Promise<TemplateVariable[]> {
    const variables: TemplateVariable[] = []
    
    // Extract variable patterns
    const variablePatterns = [
      /\{\{([^}]+)\}\}/g,           // {{variable}}
      /\$\{([^}]+)\}/g,             // ${variable}
      /\[\[([^\]]+)\]\]/g,          // [[variable]]
      /\{([^}]+)\}/g                // {variable}
    ]

    const foundVariables = new Set<string>()

    for (const pattern of variablePatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const variableName = match[1].trim()
        if (variableName && !foundVariables.has(variableName)) {
          foundVariables.add(variableName)
          
          const variable = await this.createTemplateVariable(variableName, projectId)
          variables.push(variable)
        }
      }
    }

    return variables
  }

  /**
   * Create a template variable with intelligent defaults
   */
  private async createTemplateVariable(name: string, projectId?: string): Promise<TemplateVariable> {
    // Analyze variable name to determine type and context
    const type = this.inferVariableType(name)
    const context = this.inferVariableContext(name, projectId)
    const validation = this.inferVariableValidation(name, type)

    return {
      id: `var-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name,
      type,
      defaultValue: this.getDefaultValue(type),
      description: this.generateVariableDescription(name, type, context),
      required: this.isVariableRequired(name),
      validation,
      context
    }
  }

  /**
   * Infer variable type from name
   */
  private inferVariableType(name: string): TemplateVariable['type'] {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('created') || lowerName.includes('updated')) {
      return 'date'
    }
    if (lowerName.includes('count') || lowerName.includes('number') || lowerName.includes('amount') || lowerName.includes('total')) {
      return 'number'
    }
    if (lowerName.includes('is') || lowerName.includes('has') || lowerName.includes('enabled') || lowerName.includes('active')) {
      return 'boolean'
    }
    if (lowerName.includes('list') || lowerName.includes('array') || lowerName.includes('items')) {
      return 'array'
    }
    if (lowerName.includes('config') || lowerName.includes('settings') || lowerName.includes('options')) {
      return 'object'
    }
    
    return 'text'
  }

  /**
   * Infer variable context from name and project
   */
  private inferVariableContext(name: string, projectId?: string): VariableContext {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('project') || lowerName.includes('proj')) {
      return {
        source: 'project',
        path: `project.${name}`,
        description: `Project-specific ${name}`
      }
    }
    if (lowerName.includes('user') || lowerName.includes('author') || lowerName.includes('creator')) {
      return {
        source: 'user',
        path: `user.${name}`,
        description: `User-specific ${name}`
      }
    }
    if (lowerName.includes('system') || lowerName.includes('config') || lowerName.includes('env')) {
      return {
        source: 'system',
        path: `system.${name}`,
        description: `System ${name}`
      }
    }
    
    return {
      source: 'template',
      path: `template.${name}`,
      description: `Template variable ${name}`
    }
  }

  /**
   * Infer variable validation rules
   */
  private inferVariableValidation(name: string, type: TemplateVariable['type']): VariableValidation {
    const validation: VariableValidation = {}
    
    switch (type) {
      case 'text':
        if (name.toLowerCase().includes('email')) {
          validation.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
        }
        if (name.toLowerCase().includes('phone')) {
          validation.pattern = '^[\\+]?[1-9][\\d]{0,15}$'
        }
        if (name.toLowerCase().includes('url')) {
          validation.pattern = '^https?:\\/\\/.+'
        }
        break
      case 'number':
        if (name.toLowerCase().includes('percentage')) {
          validation.min = 0
          validation.max = 100
        }
        if (name.toLowerCase().includes('count') || name.toLowerCase().includes('total')) {
          validation.min = 0
        }
        break
      case 'date':
        // Date validation handled by type
        break
    }
    
    return validation
  }

  /**
   * Get default value for variable type
   */
  private getDefaultValue(type: TemplateVariable['type']): any {
    switch (type) {
      case 'text': return ''
      case 'number': return 0
      case 'boolean': return false
      case 'date': return new Date().toISOString()
      case 'array': return []
      case 'object': return {}
      default: return null
    }
  }

  /**
   * Generate variable description
   */
  private generateVariableDescription(name: string, type: TemplateVariable['type'], context: VariableContext): string {
    const typeDescription = {
      text: 'Text content',
      number: 'Numeric value',
      boolean: 'True/false value',
      date: 'Date and time',
      array: 'List of items',
      object: 'Structured data'
    }[type]

    return `${typeDescription} for ${context.description}`
  }

  /**
   * Check if variable is required
   */
  private isVariableRequired(name: string): boolean {
    const requiredPatterns = [
      'title', 'name', 'id', 'key', 'primary', 'main', 'essential'
    ]
    
    const lowerName = name.toLowerCase()
    return requiredPatterns.some(pattern => lowerName.includes(pattern))
  }

  /**
   * Extract variables from text
   */
  private extractVariablesFromText(text: string): string[] {
    const variables: string[] = []
    const patterns = [
      /\{\{([^}]+)\}\}/g,
      /\$\{([^}]+)\}/g,
      /\[\[([^\]]+)\]\]/g,
      /\{([^}]+)\}/g
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        variables.push(match[1].trim())
      }
    }

    return variables
  }

  /**
   * Generate content metadata
   */
  private generateMetadata(content: string, sections: ContentSection[], variables: TemplateVariable[]): ContentMetadata {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    const characterCount = content.length
    const readingTime = Math.ceil(wordCount / 200) // Average reading speed
    
    // Calculate complexity based on various factors
    const complexity = this.calculateComplexity(content, sections, variables)
    
    // Determine structure type
    const structure = this.determineStructure(sections)
    
    return {
      wordCount,
      characterCount,
      readingTime,
      complexity,
      structure,
      variables: variables.length,
      sections: sections.length
    }
  }

  /**
   * Calculate content complexity
   */
  private calculateComplexity(content: string, sections: ContentSection[], variables: TemplateVariable[]): ContentMetadata['complexity'] {
    let score = 0
    
    // Base score from word count
    if (content.length > 5000) score += 2
    else if (content.length > 2000) score += 1
    
    // Score from sections
    if (sections.length > 10) score += 2
    else if (sections.length > 5) score += 1
    
    // Score from variables
    if (variables.length > 10) score += 2
    else if (variables.length > 5) score += 1
    
    // Score from code blocks
    const codeBlocks = (content.match(/```/g) || []).length / 2
    if (codeBlocks > 3) score += 2
    else if (codeBlocks > 1) score += 1
    
    // Score from tables
    const tables = (content.match(/\|/g) || []).length / 3
    if (tables > 2) score += 1
    
    if (score >= 6) return 'high'
    if (score >= 3) return 'medium'
    return 'low'
  }

  /**
   * Determine content structure type
   */
  private determineStructure(sections: ContentSection[]): ContentMetadata['structure'] {
    const headingLevels = sections.filter(s => s.type === 'heading').map(s => s.level)
    
    if (headingLevels.length === 0) return 'linear'
    
    const maxLevel = Math.max(...headingLevels)
    const hasMultipleLevels = new Set(headingLevels).size > 1
    
    if (maxLevel > 3 && hasMultipleLevels) return 'hierarchical'
    if (sections.length > 8) return 'modular'
    
    return 'linear'
  }

  /**
   * Generate content recommendations
   */
  private async generateRecommendations(
    content: string, 
    sections: ContentSection[], 
    variables: TemplateVariable[], 
    metadata: ContentMetadata
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = []

    // Structure recommendations
    if (sections.length === 0) {
      recommendations.push({
        type: 'structure',
        priority: 'high',
        title: 'Add Document Structure',
        description: 'Document lacks clear structure',
        suggestion: 'Add headings and sections to organize content',
        impact: 'Improves readability and navigation'
      })
    }

    if (metadata.complexity === 'high') {
      recommendations.push({
        type: 'structure',
        priority: 'medium',
        title: 'Simplify Document Structure',
        description: 'Document is complex and may be hard to follow',
        suggestion: 'Consider breaking into smaller sections or creating a table of contents',
        impact: 'Reduces cognitive load and improves comprehension'
      })
    }

    // Variable recommendations
    if (variables.length === 0) {
      recommendations.push({
        type: 'variable',
        priority: 'low',
        title: 'Add Dynamic Variables',
        description: 'Document contains no dynamic variables',
        suggestion: 'Consider adding variables like {{project.name}} or {{user.name}} for personalization',
        impact: 'Enables dynamic content generation and personalization'
      })
    }

    const requiredVariables = variables.filter(v => v.required)
    if (requiredVariables.length > 0) {
      recommendations.push({
        type: 'variable',
        priority: 'high',
        title: 'Required Variables Missing',
        description: `${requiredVariables.length} required variables need values`,
        suggestion: 'Ensure all required variables have default values or are provided during generation',
        impact: 'Prevents generation errors and ensures complete documents'
      })
    }

    // Content recommendations
    if (metadata.wordCount < 100) {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        title: 'Expand Content',
        description: 'Document is quite short',
        suggestion: 'Consider adding more detailed explanations or examples',
        impact: 'Provides more comprehensive information'
      })
    }

    if (metadata.readingTime > 10) {
      recommendations.push({
        type: 'content',
        priority: 'low',
        title: 'Consider Content Length',
        description: 'Document may be too long for quick reading',
        suggestion: 'Consider adding a summary or breaking into multiple documents',
        impact: 'Improves user engagement and retention'
      })
    }

    // Formatting recommendations
    const hasCodeBlocks = content.includes('```')
    const hasTables = content.includes('|')
    const hasLists = content.includes('-') || content.includes('*') || /\d+\./.test(content)

    if (!hasCodeBlocks && !hasTables && !hasLists) {
      recommendations.push({
        type: 'formatting',
        priority: 'low',
        title: 'Enhance Formatting',
        description: 'Document uses minimal formatting',
        suggestion: 'Consider adding lists, tables, or code blocks to improve readability',
        impact: 'Makes content more engaging and easier to scan'
      })
    }

    return recommendations
  }

  /**
   * Replace variables in content with actual values
   */
  async replaceVariables(content: string, variables: Record<string, any>, projectId?: string): Promise<string> {
    try {
      this.logger.info('Starting variable replacement', { 
        variableCount: Object.keys(variables).length, 
        projectId 
      })

      let processedContent = content

      // Get project context if available
      const projectContext = projectId ? await this.getProjectContext(projectId) : {}
      
      // Get system context
      const systemContext = this.getSystemContext()
      
      // Get user context
      const userContext = this.getUserContext()

      // Merge all contexts
      const allContext = {
        project: projectContext,
        system: systemContext,
        user: userContext,
        variables
      }

      // Replace variables in different patterns
      const patterns = [
        { pattern: /\{\{([^}]+)\}\}/g, transform: (match: string, varName: string) => this.resolveVariable(varName, allContext) },
        { pattern: /\$\{([^}]+)\}/g, transform: (match: string, varName: string) => this.resolveVariable(varName, allContext) },
        { pattern: /\[\[([^\]]+)\]\]/g, transform: (match: string, varName: string) => this.resolveVariable(varName, allContext) },
        { pattern: /\{([^}]+)\}/g, transform: (match: string, varName: string) => this.resolveVariable(varName, allContext) }
      ]

      for (const { pattern, transform } of patterns) {
        processedContent = processedContent.replace(pattern, transform)
      }

      this.logger.info('Variable replacement completed', { 
        originalLength: content.length,
        processedLength: processedContent.length 
      })

      return processedContent
    } catch (error) {
      this.logger.error('Variable replacement failed', { error })
      throw error
    }
  }

  /**
   * Resolve variable value from context
   */
  private resolveVariable(varName: string, context: any): string {
    try {
      // Handle nested property access (e.g., project.name, user.profile.email)
      const parts = varName.split('.')
      let value = context

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part]
        } else {
          // Return original variable if not found
          return `{{${varName}}}`
        }
      }

      // Format the value appropriately
      if (value === null || value === undefined) {
        return `{{${varName}}}`
      }

      if (typeof value === 'object') {
        return JSON.stringify(value)
      }

      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }

      if (value instanceof Date) {
        return value.toLocaleDateString()
      }

      return String(value)
    } catch (error) {
      this.logger.warn('Variable resolution failed', { varName, error })
      return `{{${varName}}}`
    }
  }

  /**
   * Get project context for variable replacement
   */
  private async getProjectContext(projectId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.framework,
          p.created_at,
          p.updated_at,
          u.name as owner_name,
          u.email as owner_email,
          COUNT(d.id) as document_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.id = $1
        GROUP BY p.id, u.name, u.email
      `

      const result = await pool.query(query, [projectId])
      
      if (result.rows.length === 0) {
        return {}
      }

      const project = result.rows[0]
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        framework: project.framework,
        created_at: project.created_at,
        updated_at: project.updated_at,
        owner: {
          name: project.owner_name,
          email: project.owner_email
        },
        document_count: parseInt(project.document_count) || 0
      }
    } catch (error) {
      this.logger.error('Failed to get project context', { projectId, error })
      return {}
    }
  }

  /**
   * Get system context for variable replacement
   */
  private getSystemContext(): any {
    return {
      name: 'ADPA Framework',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    }
  }

  /**
   * Get user context for variable replacement
   */
  private getUserContext(): any {
    // This would typically come from the authenticated user
    // For now, return default values
    return {
      name: 'System User',
      email: 'user@adpa.com',
      role: 'Administrator'
    }
  }

  /**
   * Optimize content structure
   */
  async optimizeContentStructure(content: string, projectId?: string): Promise<string> {
    try {
      this.logger.info('Starting content structure optimization', { contentLength: content.length, projectId })

      // Analyze current structure
      const structure = await this.analyzeContent(content, projectId)
      
      // Apply optimizations
      let optimizedContent = content

      // Add table of contents if document is complex
      if (structure.metadata.complexity === 'high' && structure.sections.length > 5) {
        optimizedContent = this.addTableOfContents(optimizedContent, structure.sections)
      }

      // Improve section organization
      optimizedContent = this.organizeSections(optimizedContent, structure.sections)

      // Add missing structure elements
      optimizedContent = this.addStructureElements(optimizedContent, structure)

      this.logger.info('Content structure optimization completed', { 
        originalLength: content.length,
        optimizedLength: optimizedContent.length 
      })

      return optimizedContent
    } catch (error) {
      this.logger.error('Content structure optimization failed', { error })
      throw error
    }
  }

  /**
   * Add table of contents to content
   */
  private addTableOfContents(content: string, sections: ContentSection[]): string {
    const headings = sections.filter(s => s.type === 'heading' && s.level <= 3)
    
    if (headings.length === 0) return content

    let toc = '# Table of Contents\n\n'
    
    for (const heading of headings) {
      const indent = '  '.repeat(heading.level - 1)
      const anchor = heading.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      toc += `${indent}- [${heading.title}](#${anchor})\n`
    }
    
    toc += '\n---\n\n'
    
    return toc + content
  }

  /**
   * Organize sections for better flow
   */
  private organizeSections(content: string, sections: ContentSection[]): string {
    // This is a simplified version - in a real implementation,
    // you might reorder sections based on importance, dependencies, etc.
    return content
  }

  /**
   * Add missing structure elements
   */
  private addStructureElements(content: string, structure: ContentStructure): string {
    let enhancedContent = content

    // Add introduction if missing
    if (!content.toLowerCase().includes('introduction') && !content.toLowerCase().includes('overview')) {
      const intro = '\n## Introduction\n\nThis document provides comprehensive information about the project and its requirements.\n\n'
      enhancedContent = intro + enhancedContent
    }

    // Add conclusion if missing and document is long enough
    if (structure.metadata.wordCount > 500 && !content.toLowerCase().includes('conclusion')) {
      enhancedContent += '\n\n## Conclusion\n\nThis document outlines the key requirements and specifications for the project.\n'
    }

    return enhancedContent
  }
}

export const contentStructuringService = new ContentStructuringService()
