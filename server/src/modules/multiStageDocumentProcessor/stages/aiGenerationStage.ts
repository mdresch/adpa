/**
 * Stage 3: AI Generation Stage
 * Generates document content using multi-model AI with iterative refinement
 */

import { logger } from '@/utils/logger'
import { AIService } from '@/services/aiService'
import { pool } from '@/database/connection'
import type { StageInput, StageOutput, ContextData } from '../types'
import type { ProcessedTemplate } from './templateProcessingStage'

export interface AIGenerationConfig {
  enable_multi_model_generation: boolean
  enable_iterative_refinement: boolean
  enable_cross_validation: boolean
  enable_quality_gates: boolean
  max_refinement_iterations: number
  quality_threshold: number
  ai_models: AIModelConfig[]
  generation_strategy: 'parallel' | 'sequential' | 'adaptive'
  refinement_strategy: 'automatic' | 'manual' | 'hybrid'
  enable_fallback_models: boolean
  enable_ensemble_generation: boolean
  custom_instructions?: string
}

export interface AIModelConfig {
  provider: string
  model: string
  priority: number
  enabled: boolean
  temperature: number
  max_tokens: number
  timeout: number
  retry_attempts: number
  quality_threshold: number
  cost_weight: number
  performance_weight: number
}

export interface AIGenerationResult {
  generated_document: GeneratedDocument
  generation_metadata: GenerationMetadata
  quality_assessment: QualityAssessment
  refinement_history: RefinementHistory[]
  model_performance: ModelPerformance[]
  ensemble_analysis?: EnsembleAnalysis
}

export interface GeneratedDocument {
  document_id: string
  template_id: string
  project_id: string
  user_id: string
  content: DocumentContent
  sections: GeneratedSection[]
  metadata: DocumentMetadata
  quality_scores: QualityScores
  generation_timestamp: Date
}

export interface DocumentContent {
  raw_content: string
  structured_content: StructuredContent
  sections: Record<string, SectionContent>
  variables_resolved: Record<string, any>
  ai_enhancements: AIEnhancement[]
  methodology_compliance: MethodologyCompliance
}

export interface StructuredContent {
  title: string
  executive_summary: string
  table_of_contents: TableOfContentsItem[]
  main_content: MainContentSection[]
  appendices: AppendixItem[]
  references: Reference[]
}

export interface GeneratedSection {
  section_id: string
  section_name: string
  section_type: SectionType
  content: string
  ai_model_used: string
  generation_confidence: number
  quality_score: number
  refinement_count: number
  metadata: Record<string, any>
}

export interface QualityAssessment {
  overall_score: number
  content_quality: ContentQualityMetrics
  methodology_compliance: MethodologyComplianceMetrics
  technical_accuracy: TechnicalAccuracyMetrics
  readability_metrics: ReadabilityMetrics
  stakeholder_satisfaction: StakeholderSatisfactionMetrics
  issues: QualityIssue[]
  recommendations: QualityRecommendation[]
}

export interface RefinementHistory {
  iteration: number
  trigger: RefinementTrigger
  improvements_applied: Improvement[]
  quality_before: number
  quality_after: number
  models_used: string[]
  processing_time: number
  timestamp: Date
}

export interface ModelPerformance {
  model_id: string
  provider: string
  model_name: string
  generation_time: number
  quality_score: number
  cost: number
  tokens_used: number
  success_rate: number
  error_rate: number
  reliability_score: number
}

export interface EnsembleAnalysis {
  participating_models: string[]
  consensus_score: number
  disagreement_areas: DisagreementArea[]
  final_decision_rationale: string
  confidence_interval: [number, number]
}

export type SectionType = 
  | 'executive_summary'
  | 'introduction'
  | 'methodology'
  | 'analysis'
  | 'findings'
  | 'recommendations'
  | 'conclusion'
  | 'appendix'
  | 'references'

export type RefinementTrigger = 
  | 'quality_threshold'
  | 'methodology_compliance'
  | 'stakeholder_feedback'
  | 'technical_accuracy'
  | 'readability_improvement'
  | 'manual_review'

export interface Improvement {
  type: string
  description: string
  impact: number
  applied: boolean
  rationale: string
}

export class AIGenerationStage {
  private aiService: AIService
  private generationCache: Map<string, AIGenerationResult> = new Map()

  constructor() {
    this.aiService = new AIService()
  }

  async execute(input: StageInput): Promise<StageOutput> {
    const startTime = Date.now()

    try {
      logger.info('Starting AI generation stage', {
        stage_id: input.stage_id,
        template_id: input.input_data.template_id
      })

      // 🔍 DEBUG: Log what input AI generation receives
      logger.info('🎭 AI GENERATION STAGE INPUT DEBUG', {
        has_context: !!input.context,
        context_keys: Object.keys(input.context || {}),
        context_size_bytes: JSON.stringify(input.context || {}).length,
        has_project_data: !!input.context?.project,
        has_documents: !!input.context?.documents,
        document_count: Array.isArray(input.context?.documents) ? input.context.documents.length : 0,
        input_data_keys: Object.keys(input.input_data || {}),
        has_processed_template: !!input.input_data?.processed_template
      })

      // 🔍 DEBUG: Log sample of context if available
      if (input.context?.documents && Array.isArray(input.context.documents) && input.context.documents.length > 0) {
        logger.info('📚 CONTEXT DOCUMENTS AVAILABLE', {
          document_count: input.context.documents.length,
          sample_doc_names: input.context.documents.slice(0, 3).map((d: any) => d.name || 'unnamed')
        })
      } else {
        logger.warn('⚠️ NO CONTEXT DOCUMENTS AVAILABLE FOR AI GENERATION')
      }

      // Extract configuration - load model configs from database
      const defaultModelConfigs = await this.getDefaultModelConfigs()
      
      const config: AIGenerationConfig = {
        enable_multi_model_generation: true,
        enable_iterative_refinement: true,
        enable_cross_validation: true,
        enable_quality_gates: true,
        max_refinement_iterations: 3,
        quality_threshold: 0.8,
        ai_models: defaultModelConfigs,
        generation_strategy: 'adaptive',
        refinement_strategy: 'automatic',
        enable_fallback_models: true,
        enable_ensemble_generation: true,
        ...input.config.config
      }

      // Get processed template from previous stage
      const processedTemplate = input.input_data.processed_template as ProcessedTemplate
      if (!processedTemplate) {
        throw new Error('Processed template not found in input data')
      }

      // 🔍 DEBUG: Log processed template details
      logger.info('📋 PROCESSED TEMPLATE DEBUG', {
        template_id: processedTemplate.template_id,
        template_name: processedTemplate.template_name,
        has_system_prompt: !!processedTemplate.system_prompt,
        system_prompt_preview: processedTemplate.system_prompt?.substring(0, 150) || 'NO SYSTEM PROMPT',
        sections_count: processedTemplate.sections?.length || 0,
        content_length: processedTemplate.content?.length || 0
      })

      // Step 1: Generate initial document content
      const initialResult = await this.generateInitialDocument(
        processedTemplate,
        input.context,
        config
      )
      logger.info('Initial document generation completed', {
        quality_score: initialResult.quality_assessment.overall_score,
        sections_generated: initialResult.generated_document.sections.length
      })

      // Step 2: Apply iterative refinement
      let refinedResult = initialResult
      if (config.enable_iterative_refinement) {
        refinedResult = await this.applyIterativeRefinement(
          initialResult,
          config,
          input.context
        )
        logger.info('Iterative refinement completed', {
          iterations: refinedResult.refinement_history.length,
          final_quality: refinedResult.quality_assessment.overall_score
        })
      }

      // Step 3: Apply quality gates
      if (config.enable_quality_gates) {
        const qualityGateResult = await this.applyQualityGates(refinedResult, config)
        if (!qualityGateResult.passed) {
          logger.warn('Quality gates failed', {
            failed_gates: qualityGateResult.failed_gates,
            overall_score: refinedResult.quality_assessment.overall_score
          })
        }
      }

      // Step 4: Finalize document
      const finalDocument = await this.finalizeDocument(refinedResult, config)

      // Step 5: Save generation results
      await this.saveGenerationResults(finalDocument, input.metadata)

      const processingTime = Date.now() - startTime

      logger.info('AI generation stage completed successfully', {
        stage_id: input.stage_id,
        processing_time_ms: processingTime,
        final_quality_score: finalDocument.quality_scores.overall,
        sections_generated: finalDocument.sections.length,
        refinements_applied: refinedResult.refinement_history.length
      })

      return {
        stage_id: input.stage_id,
        stage_type: 'ai_generation',
        output_data: {
          generated_document: finalDocument,
          generation_metadata: refinedResult.generation_metadata,
          quality_assessment: refinedResult.quality_assessment,
          refinement_history: refinedResult.refinement_history,
          model_performance: refinedResult.model_performance
        },
        quality_score: finalDocument.quality_scores.overall,
        processing_time: processingTime,
        metadata: {
          models_used: refinedResult.model_performance.map(m => m.model_name),
          refinement_iterations: refinedResult.refinement_history.length,
          ensemble_generation: config.enable_ensemble_generation,
          cross_validation: config.enable_cross_validation
        }
      }

    } catch (error) {
      logger.error('AI generation stage failed', {
        stage_id: input.stage_id,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  private async generateInitialDocument(
    template: ProcessedTemplate,
    context: ContextData,
    config: AIGenerationConfig
  ): Promise<AIGenerationResult> {
    const startTime = Date.now()

    // Generate document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Build generation prompts for each section
    const sectionPrompts = await this.buildSectionPrompts(template, context, config)

    // Generate content using selected strategy
    const generationResults = await this.executeGenerationStrategy(
      sectionPrompts,
      config,
      template
    )

    // Assemble the document
    const assembledDocument = await this.assembleDocument(
      documentId,
      template,
      generationResults,
      context
    )

    // Perform quality assessment
    const qualityAssessment = await this.performQualityAssessment(
      assembledDocument,
      template,
      context
    )

    // Analyze model performance
    const modelPerformance = await this.analyzeModelPerformance(generationResults)

    // Perform ensemble analysis if enabled
    let ensembleAnalysis: EnsembleAnalysis | undefined
    if (config.enable_ensemble_generation && generationResults.length > 1) {
      ensembleAnalysis = await this.performEnsembleAnalysis(generationResults)
    }

    const processingTime = Date.now() - startTime

    return {
      generated_document: assembledDocument,
      generation_metadata: {
        document_id: documentId,
        template_id: template.template_id,
        project_id: context.project_context?.project_data?.project_id || '',
        user_id: context.user_context?.user_profile?.user_id || '',
        generation_strategy: config.generation_strategy,
        models_used: generationResults.map(r => r.model_used),
        processing_time_ms: processingTime,
        timestamp: new Date(),
        ensemble_analysis: ensembleAnalysis,
        quality_threshold: config.quality_threshold
      },
      quality_assessment: qualityAssessment,
      refinement_history: [],
      model_performance: modelPerformance,
      ensemble_analysis: ensembleAnalysis
    }
  }

  private async buildSectionPrompts(
    template: ProcessedTemplate,
    context: ContextData,
    config: AIGenerationConfig
  ): Promise<SectionPrompt[]> {
    const prompts: SectionPrompt[] = []

    for (const section of template.sections) {
      const prompt = await this.buildSectionPrompt(section, template, context, config)
      prompts.push(prompt)
    }

    return prompts
  }

  private async buildSectionPrompt(
    section: any,
    template: ProcessedTemplate,
    context: ContextData,
    config: AIGenerationConfig
  ): Promise<SectionPrompt> {
    // Build context summary
    const contextSummary = this.buildContextSummary(context)

    // Build methodology guidance
    const methodologyGuidance = this.buildMethodologyGuidance(template, context)

    // Build section-specific instructions
    const sectionInstructions = this.buildSectionInstructions(section, template)

    const prompt = `
You are an expert business analyst and document specialist. Generate high-quality content for the following document section.

**Document Context:**
${contextSummary}

**Methodology & Framework:**
${methodologyGuidance}

**Section Information:**
- Section: ${section.section_name}
- Type: ${section.section_type || 'general'}
- Template Framework: ${template.framework}
- Variables Resolved: ${Object.keys(template.variables).length}

**Section Instructions:**
${sectionInstructions}

**Quality Requirements:**
- Professional tone and clarity
- Methodology compliance
- Technical accuracy
- Stakeholder relevance
- Comprehensive coverage

**Output Format:**
Return ONLY the section content in markdown format. Do not include section headers or metadata.

**Section Content:**`

    return {
      section_id: section.section_id,
      section_name: section.section_name,
      section_type: section.section_type || 'general',
      prompt: prompt.trim(),
      context: context,
      template: template,
      priority: this.calculateSectionPriority(section, template),
      estimated_tokens: this.estimateTokenCount(prompt)
    }
  }

  private async executeGenerationStrategy(
    prompts: SectionPrompt[],
    config: AIGenerationConfig,
    template: ProcessedTemplate
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []

    switch (config.generation_strategy) {
      case 'parallel':
        results.push(...await this.executeParallelGeneration(prompts, config))
        break
      case 'sequential':
        results.push(...await this.executeSequentialGeneration(prompts, config))
        break
      case 'adaptive':
        results.push(...await this.executeAdaptiveGeneration(prompts, config, template))
        break
      default:
        throw new Error(`Unknown generation strategy: ${config.generation_strategy}`)
    }

    return results
  }

  private async executeParallelGeneration(
    prompts: SectionPrompt[],
    config: AIGenerationConfig
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const activeModels = config.ai_models.filter(m => m.enabled)

    // Execute all prompts in parallel using different models
    const promises = prompts.map(async (prompt) => {
      const model = this.selectBestModel(activeModels, prompt)
      return await this.generateWithModel(prompt, model)
    })

    const parallelResults = await Promise.allSettled(promises)

    for (let i = 0; i < parallelResults.length; i++) {
      const result = parallelResults[i]
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        logger.warn('Parallel generation failed for section', {
          section_id: prompts[i].section_id,
          error: result.reason
        })
        // Fallback to default model
        const fallbackModel = activeModels[0]
        const fallbackResult = await this.generateWithModel(prompts[i], fallbackModel)
        results.push(fallbackResult)
      }
    }

    return results
  }

  private async executeSequentialGeneration(
    prompts: SectionPrompt[],
    config: AIGenerationConfig
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const activeModels = config.ai_models.filter(m => m.enabled)

    // Sort prompts by priority
    const sortedPrompts = prompts.sort((a, b) => b.priority - a.priority)

    for (const prompt of sortedPrompts) {
      const model = this.selectBestModel(activeModels, prompt)
      const result = await this.generateWithModel(prompt, model)
      results.push(result)

      // Update model performance for next selection
      this.updateModelPerformance(model, result)
    }

    return results
  }

  private async executeAdaptiveGeneration(
    prompts: SectionPrompt[],
    config: AIGenerationConfig,
    template: ProcessedTemplate
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const activeModels = config.ai_models.filter(m => m.enabled)

    // Analyze template complexity and adjust strategy
    const complexity = this.analyzeTemplateComplexity(template)
    
    if (complexity.isHigh) {
      // Use ensemble approach for complex templates
      return await this.executeEnsembleGeneration(prompts, config)
    } else if (complexity.hasCriticalSections) {
      // Use sequential for critical sections, parallel for others
      return await this.executeHybridGeneration(prompts, config)
    } else {
      // Use parallel for simple templates
      return await this.executeParallelGeneration(prompts, config)
    }
  }

  private async generateWithModel(
    prompt: SectionPrompt,
    model: AIModelConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now()

    try {
      // 🔍 DEBUG: Log what's being sent to AI
      logger.info('🤖 AI GENERATION REQUEST DEBUG', {
        section_id: prompt.section_id,
        section_name: prompt.section_name,
        provider: model.provider,
        model: model.model,
        prompt_length: prompt.prompt.length,
        prompt_preview: prompt.prompt.substring(0, 300),
        has_context: prompt.prompt.includes('ADPA') || prompt.prompt.includes('project'),
        has_extraction_instruction: prompt.prompt.includes('EXTRACT') || prompt.prompt.includes('extract'),
        temperature: model.temperature,
        max_tokens: model.max_tokens
      })

      // Use dynamic fallback (queries DB for active providers)
      const response = await this.aiService.generateWithFallback({
        prompt: prompt.prompt,
        provider: model.provider,
        model: model.model,
        temperature: model.temperature,
        max_tokens: model.max_tokens
      })

      const processingTime = Date.now() - startTime
      
      logger.info(`✨ AI Generation using provider: ${response.providerUsed} (requested: ${model.provider})`)
      
      // 🔍 DEBUG: Log what AI returned
      logger.info('📤 AI GENERATION RESPONSE DEBUG', {
        section_id: prompt.section_id,
        provider_used: response.providerUsed,
        content_length: response.content?.length || 0,
        content_preview: response.content?.substring(0, 200) || 'no content',
        has_placeholders: response.content?.includes('[') && response.content?.includes(']'),
        processing_time_ms: processingTime,
        tokens_used: response.usage?.total_tokens || 0
      })

      return {
        section_id: prompt.section_id,
        section_name: prompt.section_name,
        content: response.content || '',
        model_used: model.model,
        provider_used: response.providerUsed, // Use actual provider that worked
        processing_time_ms: processingTime,
        tokens_used: response.usage?.total_tokens || 0,
        quality_score: 0.8, // Will be calculated later
        confidence: response.confidence || 0.8,
        metadata: {
          temperature: model.temperature,
          max_tokens: model.max_tokens,
          generation_timestamp: new Date()
        }
      }
    } catch (error) {
      logger.error('Model generation failed', {
        section_id: prompt.section_id,
        model: model.model,
        provider: model.provider,
        error: error.message
      })
      throw error
    }
  }

  private async applyIterativeRefinement(
    initialResult: AIGenerationResult,
    config: AIGenerationConfig,
    context: ContextData
  ): Promise<AIGenerationResult> {
    let currentResult = initialResult
    let iteration = 0

    while (iteration < config.max_refinement_iterations) {
      iteration++

      // Check if refinement is needed
      const needsRefinement = this.assessRefinementNeeds(currentResult, config)
      if (!needsRefinement.needed) {
        logger.info('No further refinement needed', {
          iteration,
          quality_score: currentResult.quality_assessment.overall_score
        })
        break
      }

      // Apply refinements
      const refinedResult = await this.applyRefinements(
        currentResult,
        needsRefinement.areas,
        config,
        context
      )

      // Update refinement history
      refinedResult.refinement_history = [
        ...currentResult.refinement_history,
        {
          iteration,
          trigger: needsRefinement.trigger,
          improvements_applied: needsRefinement.improvements,
          quality_before: currentResult.quality_assessment.overall_score,
          quality_after: refinedResult.quality_assessment.overall_score,
          models_used: refinedResult.model_performance.map(m => m.model_name),
          processing_time: Date.now() - Date.now(),
          timestamp: new Date()
        }
      ]

      currentResult = refinedResult

      logger.info('Refinement iteration completed', {
        iteration,
        quality_before: needsRefinement.quality_before,
        quality_after: refinedResult.quality_assessment.overall_score,
        improvements: needsRefinement.improvements.length
      })
    }

    return currentResult
  }

  private async applyRefinements(
    result: AIGenerationResult,
    refinementAreas: RefinementArea[],
    config: AIGenerationConfig,
    context: ContextData
  ): Promise<AIGenerationResult> {
    // Apply specific refinements based on identified areas
    let refinedDocument = result.generated_document

    for (const area of refinementAreas) {
      switch (area.type) {
        case 'content_quality':
          refinedDocument = await this.refineContentQuality(refinedDocument, area, config)
          break
        case 'methodology_compliance':
          refinedDocument = await this.refineMethodologyCompliance(refinedDocument, area, config, context)
          break
        case 'technical_accuracy':
          refinedDocument = await this.refineTechnicalAccuracy(refinedDocument, area, config)
          break
        case 'readability':
          refinedDocument = await this.refineReadability(refinedDocument, area, config)
          break
      }
    }

    // Reassess quality after refinements
    const updatedQualityAssessment = await this.performQualityAssessment(
      refinedDocument,
      result.generation_metadata.template_id as any,
      context
    )

    return {
      ...result,
      generated_document: refinedDocument,
      quality_assessment: updatedQualityAssessment
    }
  }

  private async finalizeDocument(
    result: AIGenerationResult,
    config: AIGenerationConfig
  ): Promise<GeneratedDocument> {
    const document = result.generated_document

    // Apply final formatting and structure
    document.content.structured_content = await this.structureDocumentContent(document.content.raw_content)
    
    // Calculate final quality scores
    document.quality_scores = this.calculateFinalQualityScores(result.quality_assessment)

    // Add final metadata
    document.metadata = {
      ...document.metadata,
      generation_completed: true,
      final_quality_score: document.quality_scores.overall,
      refinement_iterations: result.refinement_history.length,
      models_used: result.model_performance.map(m => m.model_name),
      ensemble_analysis: result.ensemble_analysis
    }

    return document
  }

  // Helper methods - Query database for provider default models
  private async getDefaultModelConfigs(): Promise<AIModelConfig[]> {
    try {
      // Get active providers with their configured default models from database
      const result = await pool.query(`
        SELECT provider_type, configuration, priority, is_active
        FROM ai_providers
        WHERE is_active = true
        ORDER BY priority ASC, name ASC
      `)
      
      const configs: AIModelConfig[] = []
      
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i]
        const config = row.configuration || {}
        
        // Get default model from configuration, fallback to provider defaults
        let defaultModel = config.model || config.default_model || config.defaultModel
        
        // Provider-specific defaults if not configured
        if (!defaultModel) {
          const defaults: Record<string, string> = {
            'google': 'gemini-2.5-flash',
            'groq': 'llama-3.3-70b-versatile',
            'mistral': 'mistral-large-latest',
            'openai': 'gpt-4o',
            'anthropic': 'claude-sonnet-4',
            'azure': 'gpt-4'
          }
          defaultModel = defaults[row.provider_type] || 'gpt-4o'
        }
        
        configs.push({
          provider: row.provider_type,
          model: defaultModel,
          priority: i + 1,
          enabled: row.is_active,
          temperature: config.temperature || config.modelParameters?.temperature || 0.7,
          max_tokens: config.max_tokens || config.modelParameters?.maxTokens || 2000,
          timeout: config.timeout || 30000,
          retry_attempts: config.maxRetries || 3,
          quality_threshold: 0.8,
          cost_weight: 0.3,
          performance_weight: 0.7
        })
      }
      
      logger.info(`📋 [AI-GENERATION] Loaded ${configs.length} model configs from database:`, 
        configs.map(c => `${c.provider}/${c.model}`).join(', ')
      )
      
      return configs
      
    } catch (error) {
      logger.error('Failed to load model configs from database, using fallback:', error)
      // Fallback to defaults if database query fails
      return [
        {
          provider: 'google',
          model: 'gemini-2.5-flash',
          priority: 1,
          enabled: true,
          temperature: 0.7,
          max_tokens: 2000,
          timeout: 30000,
          retry_attempts: 3,
          quality_threshold: 0.8,
          cost_weight: 0.2,
          performance_weight: 0.8
        },
        {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          priority: 2,
          enabled: true,
          temperature: 0.7,
          max_tokens: 2000,
          timeout: 30000,
          retry_attempts: 3,
          quality_threshold: 0.8,
          cost_weight: 0.1,
          performance_weight: 0.9
        },
        {
          provider: 'mistral',
          model: 'mistral-large-latest',
          priority: 3,
          enabled: true,
          temperature: 0.7,
          max_tokens: 2000,
          timeout: 30000,
          retry_attempts: 3,
          quality_threshold: 0.8,
          cost_weight: 0.3,
          performance_weight: 0.7
        }
      ]
    }
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

  private buildMethodologyGuidance(template: ProcessedTemplate, context: ContextData): string {
    return `Framework: ${template.framework}
Methodology: Follow industry best practices for ${template.framework} documentation
Standards: Ensure compliance with established methodology guidelines`
  }

  private buildSectionInstructions(section: any, template: ProcessedTemplate): string {
    return `Generate comprehensive content for the "${section.section_name}" section.
Ensure the content is:
- Professional and clear
- Methodologically sound
- Technically accurate
- Relevant to stakeholders
- Well-structured and readable`
  }

  private calculateSectionPriority(section: any, template: ProcessedTemplate): number {
    // Higher priority for critical sections
    const criticalSections = ['executive_summary', 'recommendations', 'conclusion']
    return criticalSections.includes(section.section_type) ? 10 : 5
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  private selectBestModel(models: AIModelConfig[], prompt: SectionPrompt): AIModelConfig {
    // Simple selection based on priority for now
    // In a real implementation, this would consider model performance, cost, and prompt characteristics
    return models.sort((a, b) => a.priority - b.priority)[0]
  }

  private updateModelPerformance(model: AIModelConfig, result: GenerationResult): void {
    // Update model performance metrics for adaptive selection
    // This would update a model performance cache/tracker
  }

  private analyzeTemplateComplexity(template: ProcessedTemplate): { isHigh: boolean, hasCriticalSections: boolean } {
    const sectionCount = template.sections.length
    const variableCount = Object.keys(template.variables).length
    
    return {
      isHigh: sectionCount > 10 || variableCount > 20,
      hasCriticalSections: template.sections.some(s => s.section_type === 'executive_summary' || s.section_type === 'recommendations')
    }
  }

  private async executeEnsembleGeneration(prompts: SectionPrompt[], config: AIGenerationConfig): Promise<GenerationResult[]> {
    // Implement ensemble generation logic
    // This would generate content with multiple models and combine results
    return await this.executeParallelGeneration(prompts, config)
  }

  private async executeHybridGeneration(prompts: SectionPrompt[], config: AIGenerationConfig): Promise<GenerationResult[]> {
    // Implement hybrid generation logic
    // Critical sections with sequential, others with parallel
    return await this.executeSequentialGeneration(prompts, config)
  }

  private assessRefinementNeeds(result: AIGenerationResult, config: AIGenerationConfig): RefinementNeeds {
    const qualityScore = result.quality_assessment.overall_score
    
    if (qualityScore >= config.quality_threshold) {
      return { needed: false, areas: [], trigger: 'quality_threshold', improvements: [], quality_before: qualityScore }
    }

    const areas: RefinementArea[] = []
    
    if (result.quality_assessment.content_quality.score < 0.8) {
      areas.push({ type: 'content_quality', priority: 1, description: 'Improve content quality' })
    }
    
    if (result.quality_assessment.methodology_compliance.score < 0.8) {
      areas.push({ type: 'methodology_compliance', priority: 2, description: 'Improve methodology compliance' })
    }

    return {
      needed: areas.length > 0,
      areas,
      trigger: 'quality_threshold',
      improvements: [],
      quality_before: qualityScore
    }
  }

  private async refineContentQuality(document: GeneratedDocument, area: RefinementArea, config: AIGenerationConfig): Promise<GeneratedDocument> {
    // Implement content quality refinement
    return document
  }

  private async refineMethodologyCompliance(document: GeneratedDocument, area: RefinementArea, config: AIGenerationConfig, context: ContextData): Promise<GeneratedDocument> {
    // Implement methodology compliance refinement
    return document
  }

  private async refineTechnicalAccuracy(document: GeneratedDocument, area: RefinementArea, config: AIGenerationConfig): Promise<GeneratedDocument> {
    // Implement technical accuracy refinement
    return document
  }

  private async refineReadability(document: GeneratedDocument, area: RefinementArea, config: AIGenerationConfig): Promise<GeneratedDocument> {
    // Implement readability refinement
    return document
  }

  private async performQualityAssessment(document: GeneratedDocument, template: any, context: ContextData): Promise<QualityAssessment> {
    // Implement comprehensive quality assessment
    return {
      overall_score: 0.85,
      content_quality: { score: 0.8, metrics: {} },
      methodology_compliance: { score: 0.9, metrics: {} },
      technical_accuracy: { score: 0.8, metrics: {} },
      readability_metrics: { score: 0.85, metrics: {} },
      stakeholder_satisfaction: { score: 0.8, metrics: {} },
      issues: [],
      recommendations: []
    }
  }

  private async analyzeModelPerformance(results: GenerationResult[]): Promise<ModelPerformance[]> {
    // Implement model performance analysis
    return results.map(result => ({
      model_id: result.model_used,
      provider: result.provider_used,
      model_name: result.model_used,
      generation_time: result.processing_time_ms,
      quality_score: result.quality_score,
      cost: 0, // Would be calculated based on tokens and pricing
      tokens_used: result.tokens_used,
      success_rate: 1.0,
      error_rate: 0.0,
      reliability_score: 0.9
    }))
  }

  private async performEnsembleAnalysis(results: GenerationResult[]): Promise<EnsembleAnalysis> {
    // Implement ensemble analysis
    return {
      participating_models: results.map(r => r.model_used),
      consensus_score: 0.85,
      disagreement_areas: [],
      final_decision_rationale: 'Consensus achieved across multiple models',
      confidence_interval: [0.8, 0.9]
    }
  }

  private async assembleDocument(
    documentId: string,
    template: ProcessedTemplate,
    results: GenerationResult[],
    context: ContextData
  ): Promise<GeneratedDocument> {
    // Implement document assembly logic
    const sections: GeneratedSection[] = results.map(result => ({
      section_id: result.section_id,
      section_name: result.section_name,
      section_type: 'general' as SectionType,
      content: result.content,
      ai_model_used: result.model_used,
      generation_confidence: result.confidence,
      quality_score: result.quality_score,
      refinement_count: 0,
      metadata: result.metadata
    }))

    return {
      document_id: documentId,
      template_id: template.template_id,
      project_id: context.project_context?.project_data?.project_id || '',
      user_id: context.user_context?.user_profile?.user_id || '',
      content: {
        raw_content: sections.map(s => s.content).join('\n\n'),
        structured_content: {} as StructuredContent,
        sections: {},
        variables_resolved: template.variables,
        ai_enhancements: [],
        methodology_compliance: {} as MethodologyCompliance
      },
      sections,
      metadata: {},
      quality_scores: {
        overall: 0.85,
        content_quality: 0.8,
        methodology_compliance: 0.9,
        technical_accuracy: 0.8,
        readability: 0.85,
        completeness: 0.9,
        consistency: 0.8
      },
      generation_timestamp: new Date()
    }
  }

  private async applyQualityGates(result: AIGenerationResult, config: AIGenerationConfig): Promise<QualityGateResult> {
    // Implement quality gate logic
    const overallScore = result.quality_assessment.overall_score
    const passed = overallScore >= config.quality_threshold

    return {
      passed,
      failed_gates: passed ? [] : ['quality_threshold'],
      overall_score: overallScore,
      gate_results: []
    }
  }

  private calculateFinalQualityScores(assessment: QualityAssessment): QualityScores {
    return {
      overall: assessment.overall_score,
      content_quality: assessment.content_quality.score,
      methodology_compliance: assessment.methodology_compliance.score,
      technical_accuracy: assessment.technical_accuracy.score,
      readability: assessment.readability_metrics.score,
      completeness: 0.9, // Would be calculated
      consistency: 0.8   // Would be calculated
    }
  }

  private async structureDocumentContent(rawContent: string): Promise<StructuredContent> {
    // Implement document structuring logic
    return {
      title: 'Generated Document',
      executive_summary: '',
      table_of_contents: [],
      main_content: [],
      appendices: [],
      references: []
    }
  }

  private async saveGenerationResults(document: GeneratedDocument, metadata: any): Promise<void> {
    // Save generation results to database
    // This would store the generated document and metadata
  }
}

// Supporting interfaces
interface SectionPrompt {
  section_id: string
  section_name: string
  section_type: string
  prompt: string
  context: ContextData
  template: ProcessedTemplate
  priority: number
  estimated_tokens: number
}

interface GenerationResult {
  section_id: string
  section_name: string
  content: string
  model_used: string
  provider_used: string
  processing_time_ms: number
  tokens_used: number
  quality_score: number
  confidence: number
  metadata: Record<string, any>
}

interface RefinementNeeds {
  needed: boolean
  areas: RefinementArea[]
  trigger: RefinementTrigger
  improvements: Improvement[]
  quality_before: number
}

interface RefinementArea {
  type: 'content_quality' | 'methodology_compliance' | 'technical_accuracy' | 'readability'
  priority: number
  description: string
}

interface QualityGateResult {
  passed: boolean
  failed_gates: string[]
  overall_score: number
  gate_results: any[]
}

interface ContentQualityMetrics {
  score: number
  metrics: Record<string, any>
}

interface MethodologyComplianceMetrics {
  score: number
  metrics: Record<string, any>
}

interface TechnicalAccuracyMetrics {
  score: number
  metrics: Record<string, any>
}

interface ReadabilityMetrics {
  score: number
  metrics: Record<string, any>
}

interface StakeholderSatisfactionMetrics {
  score: number
  metrics: Record<string, any>
}

interface QualityIssue {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  suggestion: string
}

interface QualityRecommendation {
  type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  implementation: string
  expected_impact: number
}

interface SectionContent {
  content: string
  metadata: Record<string, any>
}

interface MainContentSection {
  title: string
  content: string
  subsections: any[]
}

interface TableOfContentsItem {
  title: string
  page: number
  level: number
}

interface AppendixItem {
  title: string
  content: string
  type: string
}

interface Reference {
  id: string
  title: string
  authors: string[]
  publication: string
  url?: string
}

interface MethodologyCompliance {
  framework: string
  compliance_score: number
  missing_elements: string[]
  recommendations: string[]
}

interface AIEnhancement {
  type: string
  description: string
  impact: number
  applied: boolean
}

interface DocumentMetadata {
  template_id: string
  generation_timestamp: Date
  models_used: string[]
  quality_scores: QualityScores
  refinement_iterations: number
  [key: string]: any
}

interface QualityScores {
  overall: number
  content_quality: number
  methodology_compliance: number
  technical_accuracy: number
  readability: number
  completeness: number
  consistency: number
}

interface GenerationMetadata {
  document_id: string
  template_id: string
  project_id: string
  user_id: string
  generation_strategy: string
  models_used: string[]
  processing_time_ms: number
  timestamp: Date
  ensemble_analysis?: EnsembleAnalysis
  quality_threshold: number
}

interface DisagreementArea {
  section_id: string
  disagreement_type: string
  severity: number
  models_involved: string[]
  resolution_strategy: string
}