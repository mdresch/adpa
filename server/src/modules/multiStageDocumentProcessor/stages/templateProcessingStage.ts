/**
 * Stage 2: Template Processing Stage
 * Processes templates with intelligent variable resolution and AI enhancement
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import { VariableResolutionEngine } from '@/modules/variableResolution/variableResolutionEngine'
import { AIService } from '@/services/aiService'
import type {
  StageInput,
  StageOutput,
  ContextData
} from '../types'
import type { TemplateVariable, ResolutionContext } from '@/modules/variableResolution/types'

export interface TemplateProcessingConfig {
  enable_ai_enhancement: boolean
  enable_variable_resolution: boolean
  enable_template_optimization: boolean
  enable_section_generation: boolean
  ai_model?: string
  ai_provider?: string
  temperature?: number
  max_tokens?: number
  resolution_strategies?: string[]
  optimization_level?: 'basic' | 'standard' | 'advanced'
  custom_instructions?: string
}

export interface TemplateProcessingResult {
  processed_template: ProcessedTemplate
  resolved_variables: Record<string, any>
  ai_enhancements: AIEnhancement[]
  template_metadata: TemplateMetadata
  processing_metrics: TemplateProcessingMetrics
}

export interface ProcessedTemplate {
  template_id: string
  template_name: string
  framework: string
  sections: TemplateSection[]
  variables: Record<string, any>
  ai_enhanced: boolean
  optimization_applied: boolean
  metadata: Record<string, any>
}

export interface TemplateSection {
  section_id: string
  section_name: string
  content: string
  variables: string[]
  ai_enhanced: boolean
  metadata: Record<string, any>
}

export interface AIEnhancement {
  enhancement_id: string
  enhancement_type: 'content' | 'structure' | 'style' | 'methodology'
  section_id?: string
  original_content?: string
  enhanced_content: string
  confidence: number
  rationale: string
  metadata: Record<string, any>
}

export interface TemplateMetadata {
  template_id: string
  template_name: string
  framework: string
  version: string
  variables_count: number
  sections_count: number
  ai_enhanced_sections: number
  resolution_strategies_used: string[]
  processing_timestamp: Date
}

export interface TemplateProcessingMetrics {
  total_variables: number
  resolved_variables: number
  unresolved_variables: number
  ai_enhancements_applied: number
  processing_time_ms: number
  resolution_time_ms: number
  enhancement_time_ms: number
  quality_score: number
}

export class TemplateProcessingStage {
  private variableResolutionEngine: VariableResolutionEngine
  private aiService: AIService

  constructor() {
    this.variableResolutionEngine = new VariableResolutionEngine({
      enableAIGeneration: true,
      enableContextExtraction: true,
      enableUserProfileIntegration: true,
      enableExternalApiCalls: false,
      enableCaching: true,
      maxResolutionTime: 30000,
      retryAttempts: 3,
      qualityThreshold: 0.7,
      defaultStrategies: [
        {
          strategy_id: 'context-1',
          strategy_name: 'Context Extraction',
          strategy_type: 'context_extraction',
          priority: 1,
          enabled: true,
          config: {}
        },
        {
          strategy_id: 'ai-1',
          strategy_name: 'AI Generation',
          strategy_type: 'ai_generation',
          priority: 2,
          enabled: true,
          config: {}
        },
        {
          strategy_id: 'user-1',
          strategy_name: 'User Profile',
          strategy_type: 'user_profile',
          priority: 3,
          enabled: true,
          config: {}
        }
      ],
      fallbackStrategies: [
        {
          strategy_id: 'default-1',
          strategy_name: 'Default Value',
          strategy_type: 'default_value',
          priority: 1,
          enabled: true,
          config: {}
        }
      ]
    })
    this.aiService = new AIService()
  }

  async execute(input: StageInput): Promise<StageOutput> {
    const startTime = Date.now()

    try {
      logger.info('Starting template processing stage', {
        stage_id: input.stage_id,
        template_id: input.input_data.template_id
      })

      // Extract configuration
      const config: TemplateProcessingConfig = {
        enable_ai_enhancement: true,
        enable_variable_resolution: true,
        enable_template_optimization: true,
        enable_section_generation: false,
        ai_model: 'gpt-4',
        ai_provider: 'openai',
        temperature: 0.7,
        max_tokens: 2000,
        resolution_strategies: ['context', 'ai', 'default', 'user_profile'],
        optimization_level: 'standard',
        ...input.config.config
      }

      // Step 1: Load template
      const template = await this.loadTemplate(input.input_data.template_id)
      logger.info('Template loaded', { template_id: template.template_id })

      // 🔍 DEBUG: Log template details
      logger.info('🎯 TEMPLATE PROCESSING DEBUG', {
        template_id: template.template_id,
        template_name: template.template_name,
        has_system_prompt: !!template.system_prompt,
        system_prompt_length: template.system_prompt?.length || 0,
        system_prompt_preview: template.system_prompt?.substring(0, 150) || 'NO SYSTEM PROMPT',
        has_prompt_build_up: !!template.prompt_build_up,
        template_content_length: template.content?.length || 0
      })

      // 🔍 DEBUG: Check if it's extraction-focused
      if (template.system_prompt) {
        const isExtractionFocused = 
          template.system_prompt.includes('EXTRACT') &&
          template.system_prompt.includes('REAL PROJECT DATA') &&
          template.system_prompt.includes('DO NOT generate')
        
        logger.info('✨ TEMPLATE PROMPT TYPE', {
          template_id: template.template_id,
          is_extraction_focused: isExtractionFocused,
          has_extract_keyword: template.system_prompt.includes('EXTRACT'),
          has_real_data_keyword: template.system_prompt.includes('REAL PROJECT DATA'),
          has_do_not_rules: template.system_prompt.includes('DO NOT')
        })
      }

      // Step 2: Extract variables from template
      const variables = await this.extractVariables(template)
      logger.info('Variables extracted', { count: variables.length })

      // Step 3: Resolve variables using context and AI
      const resolvedVariables = config.enable_variable_resolution
        ? await this.resolveVariables(variables, input.context, config)
        : {}
      logger.info('Variables resolved', { resolved: Object.keys(resolvedVariables).length })

      // Step 4: Process template sections
      const processedSections = await this.processSections(
        template,
        resolvedVariables,
        input.context,
        config
      )
      logger.info('Sections processed', { count: processedSections.length })

      // Step 5: Apply AI enhancements
      const aiEnhancements = config.enable_ai_enhancement
        ? await this.applyAIEnhancements(processedSections, input.context, config)
        : []
      logger.info('AI enhancements applied', { count: aiEnhancements.length })

      // Step 6: Optimize template structure
      const optimizedTemplate = config.enable_template_optimization
        ? await this.optimizeTemplate(processedSections, resolvedVariables, config)
        : { sections: processedSections, variables: resolvedVariables }
      logger.info('Template optimized')

      // Step 7: Build result
      const result: TemplateProcessingResult = {
        processed_template: {
          template_id: template.template_id,
          template_name: template.template_name,
          framework: template.framework,
          sections: optimizedTemplate.sections,
          variables: optimizedTemplate.variables,
          ai_enhanced: aiEnhancements.length > 0,
          optimization_applied: config.enable_template_optimization,
          metadata: {
            ...template.metadata,
            processing_timestamp: new Date()
          }
        },
        resolved_variables: resolvedVariables,
        ai_enhancements: aiEnhancements,
        template_metadata: {
          template_id: template.template_id,
          template_name: template.template_name,
          framework: template.framework,
          version: template.version,
          variables_count: variables.length,
          sections_count: processedSections.length,
          ai_enhanced_sections: aiEnhancements.filter(e => e.section_id).length,
          resolution_strategies_used: config.resolution_strategies || [],
          processing_timestamp: new Date()
        },
        processing_metrics: {
          total_variables: variables.length,
          resolved_variables: Object.keys(resolvedVariables).length,
          unresolved_variables: variables.length - Object.keys(resolvedVariables).length,
          ai_enhancements_applied: aiEnhancements.length,
          processing_time_ms: Date.now() - startTime,
          resolution_time_ms: 0, // Will be updated
          enhancement_time_ms: 0, // Will be updated
          quality_score: this.calculateQualityScore(resolvedVariables, aiEnhancements, variables.length)
        }
      }

      const processingTime = Date.now() - startTime

      logger.info('Template processing stage completed', {
        stage_id: input.stage_id,
        processing_time_ms: processingTime,
        quality_score: result.processing_metrics.quality_score
      })

      return {
        stage_id: input.stage_id,
        stage_type: 'template_processing',
        output_data: result,
        quality_score: result.processing_metrics.quality_score,
        processing_time: processingTime,
        metadata: {
          variables_resolved: Object.keys(resolvedVariables).length,
          ai_enhancements: aiEnhancements.length,
          sections_processed: processedSections.length
        }
      }
    } catch (error) {
      logger.error('Template processing stage failed', {
        stage_id: input.stage_id,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  private async loadTemplate(templateId: string): Promise<any> {
    const result = await pool.query(
      `SELECT 
        id as template_id,
        name as template_name,
        framework,
        content,
        system_prompt,
        context_injection_config,
        prompt_build_up as prompt_buildup_config,
        1 as version,
        '{}'::jsonb as metadata
      FROM templates
      WHERE id = $1`,
      [templateId]
    )

    if (result.rows.length === 0) {
      throw new Error(`Template not found: ${templateId}`)
    }

    return result.rows[0]
  }

  private async extractVariables(template: any): Promise<TemplateVariable[]> {
    const variables: TemplateVariable[] = []
    const variablePattern = /\{\{(\w+)\}\}/g
    let match

    // Extract from template content
    while ((match = variablePattern.exec(template.content)) !== null) {
      const variableName = match[1]
      
      // Check if variable already exists
      if (!variables.find(v => v.variable_name === variableName)) {
        variables.push({
          variable_id: `var_${variableName}_${Date.now()}`,
          variable_name: variableName,
          variable_type: 'string', // Default type
          variable_definition: {
            description: `Variable: ${variableName}`,
            default_value: null,
            required: true,
            format: 'text'
          },
          validation_rules: [],
          resolution_hints: [
            {
              hint_id: `hint_${variableName}`,
              hint_type: 'context_path',
              hint_value: `Extract ${variableName} from context`,
              confidence: 0.8,
              source: 'template_content'
            }
          ],
          metadata: {
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'system',
            tags: ['template_variable', 'extracted'],
            category: 'template_content',
            usage_count: 0,
            performance_metrics: {
              average_resolution_time: 0,
              success_rate: 1.0,
              cache_hit_rate: 0,
              quality_score: 0.8,
              user_satisfaction: 0.9
            }
          }
        })
      }
    }

    // Also check template metadata for defined variables
    if (template.metadata?.variables) {
      for (const varDef of template.metadata.variables) {
        const existing = variables.find(v => v.variable_name === varDef.name)
        if (existing) {
          // Merge with existing
          existing.variable_type = varDef.type || existing.variable_type
          existing.variable_definition.required = varDef.required !== undefined ? varDef.required : existing.variable_definition.required
          existing.variable_definition.default_value = varDef.default || existing.variable_definition.default_value
          existing.validation_rules = varDef.validation || existing.validation_rules
        } else {
          // Add new variable
          variables.push({
            variable_id: `var_${varDef.name}_${Date.now()}`,
            variable_name: varDef.name,
            variable_type: varDef.type || 'string',
            variable_definition: {
              description: varDef.description || `Variable: ${varDef.name}`,
              default_value: varDef.default || null,
              required: varDef.required || false,
              format: 'text'
            },
            validation_rules: varDef.validation || [],
            resolution_hints: [
              {
                hint_id: `hint_${varDef.name}`,
                hint_type: 'context_path',
                hint_value: `Extract ${varDef.name} from context`,
                confidence: 0.9,
                source: 'template_metadata'
              }
            ],
            metadata: {
              created_at: new Date(),
              updated_at: new Date(),
              created_by: 'system',
              tags: ['template_variable', 'metadata'],
              category: 'template_metadata',
              usage_count: 0,
              performance_metrics: {
                average_resolution_time: 0,
                success_rate: 1.0,
                cache_hit_rate: 0,
                quality_score: 0.9,
                user_satisfaction: 0.95
              }
            }
          })
        }
      }
    }

    return variables
  }

  private async resolveVariables(
    variables: TemplateVariable[],
    context: ContextData,
    config: TemplateProcessingConfig
  ): Promise<Record<string, any>> {
    const resolutionContext: ResolutionContext = {
      context_id: `ctx_${Date.now()}`,
      project_context: {
        project_id: context.project_context?.project_data?.project_id || '',
        project_name: context.project_context?.project_data?.project_name || '',
        project_description: context.project_context?.project_data?.description || '',
        project_type: context.project_context?.project_data?.type || 'general',
        stakeholders: context.project_context?.stakeholders || [],
        requirements: context.project_context?.requirements || [],
        constraints: context.project_context?.constraints || [],
        risks: context.project_context?.risks || [],
        milestones: [],
        phases: [],
        metadata: context.project_context?.project_data || {}
      },
      user_context: {
        user_id: context.user_context?.user_profile?.user_id || '',
        user_name: context.user_context?.user_profile?.name || '',
        user_role: context.user_context?.user_profile?.role || '',
        user_department: context.user_context?.user_profile?.department || '',
        user_expertise: context.user_context?.user_profile?.expertise_areas || [],
        writing_style: context.user_context?.writing_style ||{
          tone: 'professional',
          voice: 'third_person',
          complexity: 'moderate',
          length_preference: 'detailed'
        },
        metadata: {}
      },
      template_context: {
        template_id: context.project_context?.project_data?.template_id || '',
        template_name: '',
        template_type: '',
        framework: '',
        methodology: '',
        variables: [],
        sections: [],
        metadata: {}
      },
      historical_context: {
        similar_documents: context.historical_context?.similar_documents || [],
        best_practices: context.historical_context?.best_practices || [],
        patterns: context.historical_context?.patterns || [],
        lessons_learned: [],
        metadata: {}
      },
      external_context: {
        api_data: context.external_context?.api_responses || {},
        integration_data: {},
        third_party_data: {},
        metadata: context.external_context?.external_data || {}
      },
      metadata: {
        context_quality: 0.8,
        context_freshness: 0.9,
        context_completeness: 0.85,
        context_relevance: 0.9,
        context_confidence: 0.85,
        last_updated: new Date(),
        update_frequency: 'real-time'
      }
    }

    const resolved: Record<string, any> = {}

    for (const variable of variables) {
      try {
        const result = await this.variableResolutionEngine.resolveVariable(
          variable,
          resolutionContext
        )
        resolved[variable.variable_name] = result.resolved_value
      } catch (error) {
        logger.warn('Failed to resolve variable', {
          variable: variable.variable_name,
          error: error.message
        })
        
        // Use default value if available
        if (variable.variable_definition.default_value !== null) {
          resolved[variable.variable_name] = variable.variable_definition.default_value
        }
      }
    }

    return resolved
  }

  private async processSections(
    template: any,
    variables: Record<string, any>,
    context: ContextData,
    config: TemplateProcessingConfig
  ): Promise<TemplateSection[]> {
    const sections: TemplateSection[] = []
    
    // Split template content into sections (assuming markdown-style headers)
    const sectionPattern = /^(#+)\s+(.+)$/gm
    const content = template.content
    let lastIndex = 0
    let sectionIndex = 0
    let match

    const matches: any[] = []
    while ((match = sectionPattern.exec(content)) !== null) {
      matches.push({
        index: match.index,
        level: match[1].length,
        title: match[2],
        fullMatch: match[0]
      })
    }

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]
      
      const sectionContent = content.substring(
        currentMatch.index,
        nextMatch ? nextMatch.index : content.length
      )

      // Extract variables in this section
      const sectionVariables: string[] = []
      const varPattern = /\{\{(\w+)\}\}/g
      let varMatch
      while ((varMatch = varPattern.exec(sectionContent)) !== null) {
        if (!sectionVariables.includes(varMatch[1])) {
          sectionVariables.push(varMatch[1])
        }
      }

      // Replace variables with resolved values
      let processedContent = sectionContent
      for (const varName of sectionVariables) {
        if (variables[varName] !== undefined) {
          processedContent = processedContent.replace(
            new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
            variables[varName]
          )
        }
      }

      sections.push({
        section_id: `section_${sectionIndex++}`,
        section_name: currentMatch.title,
        content: processedContent,
        variables: sectionVariables,
        ai_enhanced: false,
        metadata: {
          level: currentMatch.level,
          original_content: sectionContent,
          variables_resolved: sectionVariables.filter(v => variables[v] !== undefined).length
        }
      })
    }

    // If no sections found, treat entire content as one section
    if (sections.length === 0) {
      let processedContent = content
      const sectionVariables: string[] = []
      
      for (const [varName, varValue] of Object.entries(variables)) {
        if (processedContent.includes(`{{${varName}}}`)) {
          sectionVariables.push(varName)
          processedContent = processedContent.replace(
            new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
            String(varValue)
          )
        }
      }

      sections.push({
        section_id: 'section_0',
        section_name: template.template_name,
        content: processedContent,
        variables: sectionVariables,
        ai_enhanced: false,
        metadata: {
          is_full_template: true,
          variables_resolved: sectionVariables.length
        }
      })
    }

    return sections
  }

  private async applyAIEnhancements(
    sections: TemplateSection[],
    context: ContextData,
    config: TemplateProcessingConfig
  ): Promise<AIEnhancement[]> {
    const enhancements: AIEnhancement[] = []

    for (const section of sections) {
      try {
        // Build enhancement prompt
        const enhancementPrompt = this.buildEnhancementPrompt(section, context, config)

        // Call AI service with dynamic fallback (queries DB for active providers)
        const aiResponse = await this.aiService.generateWithFallback({
          prompt: enhancementPrompt,
          provider: config.ai_provider || 'google',
          model: config.ai_model || 'gemini-2.5-flash',
          temperature: config.temperature || 0.7,
          max_tokens: config.max_tokens || 2000
        })
        
        logger.info(`✨ Provider used for enhancement: ${aiResponse.providerUsed}`)

        const enhancedContent = aiResponse.content?.trim() || section.content

        if (enhancedContent && enhancedContent !== section.content) {
          enhancements.push({
            enhancement_id: `enhance_${section.section_id}_${Date.now()}`,
            enhancement_type: 'content',
            section_id: section.section_id,
            original_content: section.content,
            enhanced_content: enhancedContent,
            confidence: 0.85,
            rationale: 'AI-enhanced for clarity, completeness, and methodology alignment',
            metadata: {
              ai_model: aiResponse.model || config.ai_model,
              ai_provider: aiResponse.provider || config.ai_provider,
              tokens_used: aiResponse.usage?.total_tokens || 0
            }
          })

          // Update section with enhanced content
          section.content = enhancedContent
          section.ai_enhanced = true
        }
      } catch (error) {
        logger.warn('Failed to apply AI enhancement to section', {
          section_id: section.section_id,
          error: error.message
        })
      }
    }

    return enhancements
  }

  private buildEnhancementPrompt(
    section: TemplateSection,
    context: ContextData,
    config: TemplateProcessingConfig
  ): string {
    const contextSummary = this.buildContextSummary(context)
    
    return `You are an expert business analyst and document specialist. Enhance the following document section to improve clarity, completeness, and alignment with best practices.

**Section: ${section.section_name}**

**Original Content:**
${section.content}

**Context:**
${contextSummary}

**Instructions:**
${config.custom_instructions || `
1. Improve clarity and readability
2. Ensure completeness of information
3. Align with industry best practices
4. Maintain professional tone
5. Preserve all variable placeholders ({{variable_name}})
6. Keep the same section structure
7. Add relevant details based on context
`}

**Enhanced Content (return ONLY the enhanced section content):**`
  }

  private buildContextSummary(context: ContextData): string {
    const parts: string[] = []

    if (context.project_context) {
      parts.push(`Project: ${JSON.stringify(context.project_context.project_data || {}, null, 2)}`)
    }

    if (context.user_context) {
      parts.push(`User: ${context.user_context.user_profile?.name || 'Unknown'} (${context.user_context.user_profile?.role || 'Unknown role'})`)
    }

    if (context.historical_context && context.historical_context.best_practices) {
      parts.push(`Best Practices: ${context.historical_context.best_practices.map(bp => bp.practice_name).join(', ')}`)
    }

    return parts.join('\n')
  }

  private async optimizeTemplate(
    sections: TemplateSection[],
    variables: Record<string, any>,
    config: TemplateProcessingConfig
  ): Promise<{ sections: TemplateSection[], variables: Record<string, any> }> {
    // Optimization logic based on level
    switch (config.optimization_level) {
      case 'advanced':
        // Reorder sections based on importance and dependencies
        return this.advancedOptimization(sections, variables)
      
      case 'standard':
        // Basic section ordering and variable optimization
        return this.standardOptimization(sections, variables)
      
      case 'basic':
      default:
        // No optimization
        return { sections, variables }
    }
  }

  private async advancedOptimization(
    sections: TemplateSection[],
    variables: Record<string, any>
  ): Promise<{ sections: TemplateSection[], variables: Record<string, any> }> {
    // TODO: Implement advanced optimization
    // - Analyze section dependencies
    // - Reorder for optimal flow
    // - Remove redundancies
    // - Optimize variable usage
    return { sections, variables }
  }

  private async standardOptimization(
    sections: TemplateSection[],
    variables: Record<string, any>
  ): Promise<{ sections: TemplateSection[], variables: Record<string, any> }> {
    // TODO: Implement standard optimization
    // - Basic section ordering
    // - Variable deduplication
    return { sections, variables }
  }

  private calculateQualityScore(
    resolvedVariables: Record<string, any>,
    aiEnhancements: AIEnhancement[],
    totalVariables: number
  ): number {
    // Calculate variable resolution score (0-50 points)
    const variableScore = totalVariables > 0 
      ? (Object.keys(resolvedVariables).length / totalVariables) * 50 
      : 50

    // Calculate AI enhancement score (0-30 points)
    const enhancementScore = Math.min(aiEnhancements.length * 5, 30)

    // Base quality score (20 points)
    const baseScore = 20

    // Return as decimal (0.0-1.0) not percentage (0-100)
    return Math.min(variableScore + enhancementScore + baseScore, 100) / 100
  }
}
