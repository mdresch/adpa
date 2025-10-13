/**
 * Context Injection Engine
 * Provides strategic context injection with multiple injection strategies
 */

import { logger } from '@/utils/logger'
import { AIService } from './aiService'
import type { AIGenerationRequest } from './aiService'

export interface ContextInjectionConfig {
  injection_strategies: InjectionStrategy[]
  enable_adaptive_injection: boolean
  enable_context_optimization: boolean
  max_context_length: number
  context_freshness_threshold: number
  enable_stakeholder_targeting: boolean
  enable_methodology_alignment: boolean
  enable_business_context_integration: boolean
  quality_threshold: number
  cost_limit: number
  processing_timeout: number
}

export interface InjectionStrategy {
  strategy_id: string
  strategy_name: string
  strategy_type: StrategyType
  enabled: boolean
  priority: number
  applicable_sections: string[]
  injection_pattern: InjectionPattern
  context_requirements: ContextRequirement[]
  quality_impact: number
  processing_cost: number
  success_rate: number
}

export interface InjectionPattern {
  pattern_type: PatternType
  insertion_points: InsertionPoint[]
  blending_strategy: BlendingStrategy
  formatting_rules: FormattingRule[]
  context_weight: number
  max_injections_per_section: number
}

export interface InsertionPoint {
  location_type: LocationType
  section_types: string[]
  context_triggers: ContextTrigger[]
  priority: number
  conditions: InsertionCondition[]
}

export interface ContextTrigger {
  trigger_type: TriggerType
  trigger_value: string
  confidence_threshold: number
  action: TriggerAction
  context_source: string
}

export interface ContextRequirement {
  requirement_type: RequirementType
  requirement_value: string
  weight: number
  mandatory: boolean
  freshness_threshold: number
}

export interface FormattingRule {
  rule_type: FormattingRuleType
  rule_value: any
  applicable_elements: string[]
  conditions: FormattingCondition[]
}

export interface InsertionCondition {
  condition_type: string
  operator: ConditionOperator
  value: any
  description: string
}

export interface FormattingCondition {
  condition_type: string
  operator: ConditionOperator
  value: any
  description: string
}

export interface ContextInjectionRequest {
  document_content: string
  section_id: string
  section_type: string
  context_data: ContextData
  injection_requirements: InjectionRequirements
  quality_constraints: QualityConstraints
  cost_constraints: CostConstraints
}

export interface ContextData {
  project_context: ProjectContext
  business_context: BusinessContext
  stakeholder_context: StakeholderContext
  methodology_context: MethodologyContext
  historical_context: HistoricalContext
  external_context: ExternalContext
  user_context: UserContext
}

export interface ProjectContext {
  project_id: string
  project_name: string
  project_type: string
  project_phase: string
  project_goals: string[]
  project_constraints: string[]
  project_timeline: string
  project_budget: number
  project_team: TeamMember[]
  project_stakeholders: Stakeholder[]
}

export interface BusinessContext {
  company_id: string
  company_name: string
  industry: string
  company_size: string
  business_model: string
  strategic_priorities: string[]
  market_position: string
  competitive_landscape: string
  regulatory_environment: string
  financial_context: FinancialContext
}

export interface StakeholderContext {
  stakeholders: Stakeholder[]
  stakeholder_relationships: StakeholderRelationship[]
  communication_preferences: CommunicationPreference[]
  stakeholder_expectations: StakeholderExpectation[]
  influence_matrix: InfluenceMatrix
}

export interface MethodologyContext {
  methodology_framework: string
  methodology_version: string
  methodology_standards: MethodologyStandard[]
  best_practices: BestPractice[]
  compliance_requirements: ComplianceRequirement[]
  quality_criteria: QualityCriterion[]
}

export interface HistoricalContext {
  similar_projects: SimilarProject[]
  lessons_learned: LessonLearned[]
  success_patterns: SuccessPattern[]
  failure_patterns: FailurePattern[]
  historical_metrics: HistoricalMetric[]
}

export interface ExternalContext {
  market_trends: MarketTrend[]
  industry_standards: IndustryStandard[]
  regulatory_changes: RegulatoryChange[]
  competitor_actions: CompetitorAction[]
  technology_trends: TechnologyTrend[]
}

export interface UserContext {
  user_profile: UserProfile
  user_preferences: UserPreferences
  user_expertise: UserExpertise
  user_goals: UserGoal[]
  user_constraints: UserConstraint[]
}

export interface InjectionRequirements {
  injection_type: StrategyType
  target_audience: string[]
  quality_requirements: QualityRequirement[]
  content_requirements: ContentRequirement[]
  formatting_requirements: FormattingRequirement[]
  delivery_requirements: DeliveryRequirement[]
}

export interface QualityConstraints {
  minimum_quality_score: number
  maximum_context_length: number
  required_freshness: number
  accuracy_requirements: AccuracyRequirement[]
  completeness_requirements: CompletenessRequirement[]
}

export interface CostConstraints {
  maximum_cost: number
  cost_per_token_limit: number
  processing_time_limit: number
  resource_limits: ResourceLimit[]
}

export interface ContextInjectionResult {
  injection_id: string
  strategy_used: string
  success: boolean
  injected_content: InjectedContent[]
  quality_metrics: InjectionQualityMetrics
  processing_metrics: ProcessingMetrics
  cost_metrics: CostMetrics
  validation_results: ValidationResult[]
  recommendations: Recommendation[]
}

export interface InjectedContent {
  content_id: string
  content_type: ContentType
  content: string
  injection_point: InjectionPoint
  context_source: ContextSource
  quality_score: number
  relevance_score: number
  freshness_score: number
  metadata: ContentMetadata
}

export interface InjectionQualityMetrics {
  overall_score: number
  relevance_score: number
  accuracy_score: number
  completeness_score: number
  freshness_score: number
  stakeholder_alignment: number
  methodology_compliance: number
  business_value: number
}

export interface ProcessingMetrics {
  processing_time_ms: number
  strategies_attempted: number
  strategies_successful: number
  success_rate: number
  error_count: number
  retry_count: number
}

export interface CostMetrics {
  total_cost: number
  cost_per_token: number
  cost_per_injection: number
  cost_breakdown: CostBreakdown
}

export interface ValidationResult {
  validation_type: string
  passed: boolean
  score: number
  issues: ValidationIssue[]
  recommendations: ValidationRecommendation[]
}

export interface Recommendation {
  recommendation_type: string
  priority: Priority
  description: string
  implementation: string
  expected_benefit: number
  cost_estimate: number
}

export type StrategyType = 
  | 'prepend'
  | 'append'
  | 'interleave'
  | 'structured'
  | 'adaptive'
  | 'stakeholder_targeted'
  | 'methodology_aligned'
  | 'business_context_integrated'

export type PatternType = 
  | 'linear'
  | 'hierarchical'
  | 'networked'
  | 'adaptive'
  | 'stakeholder_specific'
  | 'methodology_driven'

export type BlendingStrategy = 
  | 'seamless'
  | 'highlighted'
  | 'structured'
  | 'adaptive'
  | 'stakeholder_optimized'

export type LocationType = 
  | 'section_start'
  | 'section_end'
  | 'paragraph_start'
  | 'paragraph_end'
  | 'sentence_level'
  | 'word_level'
  | 'adaptive'

export type TriggerType = 
  | 'keyword'
  | 'topic'
  | 'stakeholder'
  | 'methodology'
  | 'business_value'
  | 'quality_threshold'

export type TriggerAction = 
  | 'inject'
  | 'enhance'
  | 'clarify'
  | 'expand'
  | 'personalize'

export type RequirementType = 
  | 'user_profile'
  | 'project_context'
  | 'business_context'
  | 'stakeholder_info'
  | 'methodology_standard'
  | 'historical_data'

export type FormattingRuleType = 
  | 'font_style'
  | 'color'
  | 'emphasis'
  | 'structure'
  | 'layout'

export type ConditionOperator = 
  | 'equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'matches'
  | 'exists'

export type ContentType = 
  | 'text'
  | 'structured_data'
  | 'reference'
  | 'example'
  | 'explanation'
  | 'summary'

export type Priority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export class ContextInjectionEngine {
  private aiService: AIService
  private strategyCache: Map<string, InjectionStrategy> = new Map()
  private performanceTracker: Map<string, StrategyPerformance> = new Map()

  constructor() {
    this.aiService = new AIService()
    this.initializeDefaultStrategies()
  }

  async injectContext(request: ContextInjectionRequest): Promise<ContextInjectionResult> {
    const startTime = Date.now()
    const injectionId = `inj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.info('Starting context injection', {
      injection_id: injectionId,
      section_id: request.section_id,
      section_type: request.section_type,
      strategy_type: request.injection_requirements.injection_type
    })

    try {
      // Step 1: Select appropriate injection strategy
      const selectedStrategy = await this.selectInjectionStrategy(request)
      
      // Step 2: Prepare context data for injection
      const preparedContext = await this.prepareContextData(request.context_data, request.injection_requirements)
      
      // Step 3: Execute injection strategy
      const injectionResult = await this.executeInjectionStrategy(
        request.document_content,
        preparedContext,
        selectedStrategy,
        request
      )
      
      // Step 4: Validate injection results
      const validationResults = await this.validateInjectionResults(injectionResult, request)
      
      // Step 5: Calculate quality metrics
      const qualityMetrics = await this.calculateQualityMetrics(injectionResult, request)
      
      // Step 6: Generate recommendations
      const recommendations = await this.generateRecommendations(injectionResult, validationResults, qualityMetrics)
      
      const processingTime = Date.now() - startTime

      const result: ContextInjectionResult = {
        injection_id: injectionId,
        strategy_used: selectedStrategy.strategy_id,
        success: validationResults.every(v => v.passed),
        injected_content: injectionResult.injected_content,
        quality_metrics: qualityMetrics,
        processing_metrics: {
          processing_time_ms: processingTime,
          strategies_attempted: 1,
          strategies_successful: validationResults.every(v => v.passed) ? 1 : 0,
          success_rate: validationResults.every(v => v.passed) ? 1.0 : 0.0,
          error_count: validationResults.filter(v => !v.passed).length,
          retry_count: 0
        },
        cost_metrics: this.calculateCostMetrics(injectionResult, processingTime),
        validation_results: validationResults,
        recommendations: recommendations
      }

      // Update strategy performance
      await this.updateStrategyPerformance(selectedStrategy, result)

      logger.info('Context injection completed', {
        injection_id: injectionId,
        success: result.success,
        quality_score: qualityMetrics.overall_score,
        processing_time_ms: processingTime,
        content_injected: injectionResult.injected_content.length
      })

      return result

    } catch (error) {
      logger.error('Context injection failed', {
        injection_id: injectionId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  private async selectInjectionStrategy(request: ContextInjectionRequest): Promise<InjectionStrategy> {
    const availableStrategies = this.strategyCache.values()
    const applicableStrategies = Array.from(availableStrategies).filter(strategy => 
      strategy.enabled && 
      strategy.strategy_type === request.injection_requirements.injection_type &&
      strategy.applicable_sections.includes(request.section_type)
    )

    if (applicableStrategies.length === 0) {
      throw new Error(`No applicable injection strategy found for type: ${request.injection_requirements.injection_type}`)
    }

    // Score strategies based on performance and requirements
    const scoredStrategies = applicableStrategies.map(strategy => ({
      strategy,
      score: this.calculateStrategyScore(strategy, request)
    }))

    // Return the highest scoring strategy
    return scoredStrategies.sort((a, b) => b.score - a.score)[0].strategy
  }

  private async prepareContextData(
    contextData: ContextData,
    requirements: InjectionRequirements
  ): Promise<PreparedContext> {
    const preparedContext: PreparedContext = {
      project_context: contextData.project_context,
      business_context: contextData.business_context,
      stakeholder_context: contextData.stakeholder_context,
      methodology_context: contextData.methodology_context,
      historical_context: contextData.historical_context,
      external_context: contextData.external_context,
      user_context: contextData.user_context,
      relevant_context: await this.extractRelevantContext(contextData, requirements),
      context_summary: await this.generateContextSummary(contextData, requirements),
      context_priorities: await this.calculateContextPriorities(contextData, requirements)
    }

    return preparedContext
  }

  private async executeInjectionStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    logger.info('Executing injection strategy', {
      strategy_id: strategy.strategy_id,
      strategy_type: strategy.strategy_type,
      pattern_type: strategy.injection_pattern.pattern_type
    })

    switch (strategy.strategy_type) {
      case 'prepend':
        return await this.executePrependStrategy(documentContent, preparedContext, strategy, request)
      case 'append':
        return await this.executeAppendStrategy(documentContent, preparedContext, strategy, request)
      case 'interleave':
        return await this.executeInterleaveStrategy(documentContent, preparedContext, strategy, request)
      case 'structured':
        return await this.executeStructuredStrategy(documentContent, preparedContext, strategy, request)
      case 'adaptive':
        return await this.executeAdaptiveStrategy(documentContent, preparedContext, strategy, request)
      case 'stakeholder_targeted':
        return await this.executeStakeholderTargetedStrategy(documentContent, preparedContext, strategy, request)
      case 'methodology_aligned':
        return await this.executeMethodologyAlignedStrategy(documentContent, preparedContext, strategy, request)
      case 'business_context_integrated':
        return await this.executeBusinessContextIntegratedStrategy(documentContent, preparedContext, strategy, request)
      default:
        throw new Error(`Unknown injection strategy type: ${strategy.strategy_type}`)
    }
  }

  private async executePrependStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildPrependInjectionPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `prepend_${Date.now()}`,
        content_type: 'text',
        content: response.content || '',
        injection_point: {
          location_type: 'section_start',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Context Injection',
          reliability_score: 0.9,
          freshness_score: 1.0,
          relevance_score: 0.85,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.85,
        relevance_score: 0.85,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'prepend',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  private async executeAppendStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildAppendInjectionPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `append_${Date.now()}`,
        content_type: 'text',
        content: response.content || '',
        injection_point: {
          location_type: 'section_end',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Context Injection',
          reliability_score: 0.9,
          freshness_score: 1.0,
          relevance_score: 0.85,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.85,
        relevance_score: 0.85,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'append',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  private async executeInterleaveStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildInterleaveInjectionPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `interleave_${Date.now()}`,
        content_type: 'text',
        content: response.content || '',
        injection_point: {
          location_type: 'paragraph_middle',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Context Injection',
          reliability_score: 0.9,
          freshness_score: 1.0,
          relevance_score: 0.85,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.85,
        relevance_score: 0.85,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'interleave',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  private async executeStructuredStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildStructuredInjectionPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.6,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `structured_${Date.now()}`,
        content_type: 'structured_data',
        content: response.content || '',
        injection_point: {
          location_type: 'section_start',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Context Injection',
          reliability_score: 0.9,
          freshness_score: 1.0,
          relevance_score: 0.9,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.9,
        relevance_score: 0.9,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'structured',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  private async executeAdaptiveStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    // Analyze content to determine best injection approach
    const contentAnalysis = await this.analyzeContentForAdaptiveInjection(documentContent, preparedContext)
    
    // Select sub-strategy based on analysis
    const subStrategy = this.selectAdaptiveSubStrategy(contentAnalysis, strategy)
    
    // Execute the selected sub-strategy
    return await this.executeAdaptiveSubStrategy(documentContent, preparedContext, subStrategy, request)
  }

  private async executeStakeholderTargetedStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildStakeholderTargetedPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `stakeholder_${Date.now()}`,
        content_type: 'text',
        content: response.content || '',
        injection_point: {
          location_type: 'adaptive',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Stakeholder Context',
          reliability_score: 0.9,
          freshness_score: 1.0,
          relevance_score: 0.9,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.9,
        relevance_score: 0.9,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'stakeholder_targeted',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0,
          target_stakeholders: request.injection_requirements.target_audience
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  private async executeMethodologyAlignedStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildMethodologyAlignedPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.6,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `methodology_${Date.now()}`,
        content_type: 'text',
        content: response.content || '',
        injection_point: {
          location_type: 'section_start',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Methodology Context',
          reliability_score: 0.95,
          freshness_score: 1.0,
          relevance_score: 0.95,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.95,
        relevance_score: 0.95,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'methodology_aligned',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0,
          methodology_framework: preparedContext.methodology_context.methodology_framework
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  private async executeBusinessContextIntegratedStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    const prompt = this.buildBusinessContextIntegratedPrompt(documentContent, preparedContext, strategy, request)
    
    const response = await this.aiService.generate({
      prompt: prompt,
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000
    })

    return {
      injected_content: [{
        content_id: `business_${Date.now()}`,
        content_type: 'text',
        content: response.content || '',
        injection_point: {
          location_type: 'section_start',
          section_types: [request.section_type],
          context_triggers: [],
          priority: 1,
          conditions: []
        },
        context_source: {
          source_id: 'ai_generated',
          source_type: 'ai_generation',
          source_name: 'AI Business Context',
          reliability_score: 0.9,
          freshness_score: 1.0,
          relevance_score: 0.9,
          content: response.content || '',
          metadata: {}
        },
        quality_score: 0.9,
        relevance_score: 0.9,
        freshness_score: 1.0,
        metadata: {
          strategy_used: strategy.strategy_id,
          injection_type: 'business_context_integrated',
          ai_model_used: 'gpt-4',
          tokens_used: response.usage?.total_tokens || 0,
          business_context: preparedContext.business_context.industry
        }
      }],
      processing_time_ms: 0,
      cost: 0,
      success: true,
      metadata: {
        strategy_executed: strategy.strategy_id,
        injection_pattern: strategy.injection_pattern.pattern_type,
        blending_strategy: strategy.injection_pattern.blending_strategy
      }
    }
  }

  // Helper methods
  private initializeDefaultStrategies(): void {
    const defaultStrategies: InjectionStrategy[] = [
      {
        strategy_id: 'prepend_strategy_1',
        strategy_name: 'Prepend Context Injection',
        strategy_type: 'prepend',
        enabled: true,
        priority: 1,
        applicable_sections: ['executive_summary', 'introduction'],
        injection_pattern: {
          pattern_type: 'linear',
          insertion_points: [],
          blending_strategy: 'seamless',
          formatting_rules: [],
          context_weight: 0.8,
          max_injections_per_section: 1
        },
        context_requirements: [],
        quality_impact: 0.15,
        processing_cost: 0.05,
        success_rate: 0.9
      },
      {
        strategy_id: 'append_strategy_1',
        strategy_name: 'Append Context Injection',
        strategy_type: 'append',
        enabled: true,
        priority: 2,
        applicable_sections: ['conclusion', 'recommendations'],
        injection_pattern: {
          pattern_type: 'linear',
          insertion_points: [],
          blending_strategy: 'highlighted',
          formatting_rules: [],
          context_weight: 0.7,
          max_injections_per_section: 1
        },
        context_requirements: [],
        quality_impact: 0.12,
        processing_cost: 0.04,
        success_rate: 0.88
      },
      {
        strategy_id: 'interleave_strategy_1',
        strategy_name: 'Interleave Context Injection',
        strategy_type: 'interleave',
        enabled: true,
        priority: 3,
        applicable_sections: ['analysis', 'findings', 'methodology'],
        injection_pattern: {
          pattern_type: 'networked',
          insertion_points: [],
          blending_strategy: 'structured',
          formatting_rules: [],
          context_weight: 0.8,
          max_injections_per_section: 3
        },
        context_requirements: [],
        quality_impact: 0.18,
        processing_cost: 0.07,
        success_rate: 0.85
      },
      {
        strategy_id: 'structured_strategy_1',
        strategy_name: 'Structured Context Injection',
        strategy_type: 'structured',
        enabled: true,
        priority: 1,
        applicable_sections: ['methodology', 'analysis', 'findings'],
        injection_pattern: {
          pattern_type: 'hierarchical',
          insertion_points: [],
          blending_strategy: 'structured',
          formatting_rules: [],
          context_weight: 0.9,
          max_injections_per_section: 2
        },
        context_requirements: [],
        quality_impact: 0.2,
        processing_cost: 0.08,
        success_rate: 0.92
      },
      {
        strategy_id: 'adaptive_strategy_1',
        strategy_name: 'Adaptive Context Injection',
        strategy_type: 'adaptive',
        enabled: true,
        priority: 1,
        applicable_sections: ['*'],
        injection_pattern: {
          pattern_type: 'adaptive',
          insertion_points: [],
          blending_strategy: 'adaptive',
          formatting_rules: [],
          context_weight: 0.85,
          max_injections_per_section: 5
        },
        context_requirements: [],
        quality_impact: 0.22,
        processing_cost: 0.1,
        success_rate: 0.9
      },
      {
        strategy_id: 'stakeholder_targeted_1',
        strategy_name: 'Stakeholder Targeted Injection',
        strategy_type: 'stakeholder_targeted',
        enabled: true,
        priority: 2,
        applicable_sections: ['recommendations', 'conclusion', 'executive_summary'],
        injection_pattern: {
          pattern_type: 'stakeholder_specific',
          insertion_points: [],
          blending_strategy: 'stakeholder_optimized',
          formatting_rules: [],
          context_weight: 0.8,
          max_injections_per_section: 2
        },
        context_requirements: [],
        quality_impact: 0.16,
        processing_cost: 0.06,
        success_rate: 0.87
      },
      {
        strategy_id: 'methodology_aligned_1',
        strategy_name: 'Methodology Aligned Injection',
        strategy_type: 'methodology_aligned',
        enabled: true,
        priority: 1,
        applicable_sections: ['methodology', 'analysis', 'findings'],
        injection_pattern: {
          pattern_type: 'methodology_driven',
          insertion_points: [],
          blending_strategy: 'structured',
          formatting_rules: [],
          context_weight: 0.95,
          max_injections_per_section: 2
        },
        context_requirements: [],
        quality_impact: 0.25,
        processing_cost: 0.08,
        success_rate: 0.95
      },
      {
        strategy_id: 'business_context_1',
        strategy_name: 'Business Context Integration',
        strategy_type: 'business_context_integrated',
        enabled: true,
        priority: 2,
        applicable_sections: ['executive_summary', 'recommendations', 'conclusion'],
        injection_pattern: {
          pattern_type: 'networked',
          insertion_points: [],
          blending_strategy: 'highlighted',
          formatting_rules: [],
          context_weight: 0.8,
          max_injections_per_section: 2
        },
        context_requirements: [],
        quality_impact: 0.18,
        processing_cost: 0.07,
        success_rate: 0.89
      }
    ]

    for (const strategy of defaultStrategies) {
      this.strategyCache.set(strategy.strategy_id, strategy)
    }
  }

  private calculateStrategyScore(strategy: InjectionStrategy, request: ContextInjectionRequest): number {
    let score = 0
    
    // Base priority score
    score += strategy.priority * 0.2
    
    // Quality impact score
    score += strategy.quality_impact * 0.3
    
    // Success rate score
    score += strategy.success_rate * 0.2
    
    // Cost efficiency score (lower cost = higher score)
    score += (1 - strategy.processing_cost) * 0.1
    
    // Performance history score
    const performance = this.performanceTracker.get(strategy.strategy_id)
    if (performance) {
      score += performance.average_quality_improvement * 0.2
    } else {
      score += 0.1 // Default score for new strategies
    }
    
    return score
  }

  private async extractRelevantContext(contextData: ContextData, requirements: InjectionRequirements): Promise<RelevantContext> {
    // Implementation for extracting relevant context based on requirements
    return {
      relevant_project_context: contextData.project_context,
      relevant_business_context: contextData.business_context,
      relevant_stakeholder_context: contextData.stakeholder_context,
      relevant_methodology_context: contextData.methodology_context,
      context_relevance_scores: {}
    }
  }

  private async generateContextSummary(contextData: ContextData, requirements: InjectionRequirements): Promise<string> {
    // Implementation for generating context summary
    return `Context summary for ${requirements.injection_type} injection`
  }

  private async calculateContextPriorities(contextData: ContextData, requirements: InjectionRequirements): Promise<ContextPriorities> {
    // Implementation for calculating context priorities
    return {
      project_priority: 0.8,
      business_priority: 0.7,
      stakeholder_priority: 0.9,
      methodology_priority: 0.85
    }
  }

  private async validateInjectionResults(result: InjectionExecutionResult, request: ContextInjectionRequest): Promise<ValidationResult[]> {
    const validationResults: ValidationResult[] = []

    // Validate quality
    const qualityValidation: ValidationResult = {
      validation_type: 'quality',
      passed: result.injected_content.every(content => content.quality_score >= request.quality_constraints.minimum_quality_score),
      score: result.injected_content.reduce((sum, content) => sum + content.quality_score, 0) / result.injected_content.length,
      issues: [],
      recommendations: []
    }
    validationResults.push(qualityValidation)

    // Validate context length
    const lengthValidation: ValidationResult = {
      validation_type: 'context_length',
      passed: result.injected_content.every(content => content.content.length <= request.quality_constraints.maximum_context_length),
      score: 1.0,
      issues: [],
      recommendations: []
    }
    validationResults.push(lengthValidation)

    return validationResults
  }

  private async calculateQualityMetrics(result: InjectionExecutionResult, request: ContextInjectionRequest): Promise<InjectionQualityMetrics> {
    const contents = result.injected_content
    
    return {
      overall_score: contents.reduce((sum, content) => sum + content.quality_score, 0) / contents.length,
      relevance_score: contents.reduce((sum, content) => sum + content.relevance_score, 0) / contents.length,
      accuracy_score: 0.9, // Would be calculated based on context accuracy
      completeness_score: 0.85, // Would be calculated based on context completeness
      freshness_score: contents.reduce((sum, content) => sum + content.freshness_score, 0) / contents.length,
      stakeholder_alignment: 0.8, // Would be calculated based on stakeholder requirements
      methodology_compliance: 0.9, // Would be calculated based on methodology alignment
      business_value: 0.8 // Would be calculated based on business context integration
    }
  }

  private async generateRecommendations(
    result: InjectionExecutionResult,
    validationResults: ValidationResult[],
    qualityMetrics: InjectionQualityMetrics
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []

    if (qualityMetrics.overall_score < 0.8) {
      recommendations.push({
        recommendation_type: 'quality_improvement',
        priority: 'high',
        description: 'Improve overall injection quality',
        implementation: 'Review context sources and injection strategy',
        expected_benefit: 0.15,
        cost_estimate: 0.05
      })
    }

    if (qualityMetrics.stakeholder_alignment < 0.8) {
      recommendations.push({
        recommendation_type: 'stakeholder_alignment',
        priority: 'medium',
        description: 'Improve stakeholder alignment',
        implementation: 'Enhance stakeholder targeting and personalization',
        expected_benefit: 0.1,
        cost_estimate: 0.03
      })
    }

    return recommendations
  }

  private calculateCostMetrics(result: InjectionExecutionResult, processingTime: number): CostMetrics {
    const totalTokens = result.injected_content.reduce((sum, content) => 
      sum + (content.metadata.tokens_used || 0), 0
    )
    
    return {
      total_cost: totalTokens * 0.0001, // Simplified cost calculation
      cost_per_token: 0.0001,
      cost_per_injection: totalTokens * 0.0001 / result.injected_content.length,
      cost_breakdown: {
        ai_generation: totalTokens * 0.0001,
        processing: 0.001,
        validation: 0.0005
      }
    }
  }

  private async updateStrategyPerformance(strategy: InjectionStrategy, result: ContextInjectionResult): Promise<void> {
    const performance = this.performanceTracker.get(strategy.strategy_id) || {
      strategy_id: strategy.strategy_id,
      total_uses: 0,
      successful_uses: 0,
      success_rate: 0.9,
      average_quality_improvement: 0.15,
      average_processing_time: 5000,
      average_cost: 0.05,
      last_updated: new Date()
    }

    performance.total_uses++
    if (result.success) {
      performance.successful_uses++
    }
    performance.success_rate = performance.successful_uses / performance.total_uses
    performance.average_quality_improvement = 
      (performance.average_quality_improvement + result.quality_metrics.overall_score) / 2
    performance.average_processing_time = 
      (performance.average_processing_time + result.processing_metrics.processing_time_ms) / 2
    performance.last_updated = new Date()

    this.performanceTracker.set(strategy.strategy_id, performance)
  }

  // Prompt building methods
  private buildPrependInjectionPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a context injection specialist. Add relevant context at the beginning of the following document section.

**Document Section:**
${documentContent}

**Context Information:**
${preparedContext.context_summary}

**Injection Requirements:**
- Strategy: Prepend context injection
- Target Audience: ${request.injection_requirements.target_audience.join(', ')}
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Context Sources:**
- Project Context: ${JSON.stringify(preparedContext.project_context, null, 2)}
- Business Context: ${JSON.stringify(preparedContext.business_context, null, 2)}
- Stakeholder Context: ${JSON.stringify(preparedContext.stakeholder_context, null, 2)}

**Requirements:**
- Add relevant context that enhances understanding
- Maintain seamless integration with existing content
- Ensure high quality and relevance
- Keep within length constraints

**Output:**
Return only the context content to be prepended to the section.
`
  }

  private buildAppendInjectionPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a context injection specialist. Add relevant context at the end of the following document section.

**Document Section:**
${documentContent}

**Context Information:**
${preparedContext.context_summary}

**Injection Requirements:**
- Strategy: Append context injection
- Target Audience: ${request.injection_requirements.target_audience.join(', ')}
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Context Sources:**
- Project Context: ${JSON.stringify(preparedContext.project_context, null, 2)}
- Business Context: ${JSON.stringify(preparedContext.business_context, null, 2)}
- Stakeholder Context: ${JSON.stringify(preparedContext.stakeholder_context, null, 2)}

**Requirements:**
- Add relevant context that reinforces key points
- Maintain seamless integration with existing content
- Ensure high quality and relevance
- Keep within length constraints

**Output:**
Return only the context content to be appended to the section.
`
  }

  private buildInterleaveInjectionPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a context injection specialist. Integrate relevant context throughout the following document section.

**Document Section:**
${documentContent}

**Context Information:**
${preparedContext.context_summary}

**Injection Requirements:**
- Strategy: Interleave context injection
- Target Audience: ${request.injection_requirements.target_audience.join(', ')}
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Context Sources:**
- Project Context: ${JSON.stringify(preparedContext.project_context, null, 2)}
- Business Context: ${JSON.stringify(preparedContext.business_context, null, 2)}
- Stakeholder Context: ${JSON.stringify(preparedContext.stakeholder_context, null, 2)}

**Requirements:**
- Integrate context naturally throughout the content
- Maintain flow and readability
- Ensure high quality and relevance
- Keep within length constraints

**Output:**
Return the enhanced content with integrated context.
`
  }

  private buildStructuredInjectionPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a context injection specialist. Add structured context to enhance the following document section.

**Document Section:**
${documentContent}

**Context Information:**
${preparedContext.context_summary}

**Injection Requirements:**
- Strategy: Structured context injection
- Target Audience: ${request.injection_requirements.target_audience.join(', ')}
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Context Sources:**
- Project Context: ${JSON.stringify(preparedContext.project_context, null, 2)}
- Business Context: ${JSON.stringify(preparedContext.business_context, null, 2)}
- Methodology Context: ${JSON.stringify(preparedContext.methodology_context, null, 2)}

**Requirements:**
- Add structured context with clear organization
- Maintain professional formatting and structure
- Ensure high quality and relevance
- Keep within length constraints

**Output:**
Return the enhanced content with structured context integration.
`
  }

  private buildStakeholderTargetedPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a stakeholder-focused context injection specialist. Enhance the following document section for specific stakeholders.

**Document Section:**
${documentContent}

**Target Stakeholders:**
${request.injection_requirements.target_audience.join(', ')}

**Context Information:**
${preparedContext.context_summary}

**Stakeholder Context:**
${JSON.stringify(preparedContext.stakeholder_context, null, 2)}

**Injection Requirements:**
- Strategy: Stakeholder targeted injection
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Requirements:**
- Tailor context for stakeholder needs and interests
- Use appropriate tone and terminology
- Highlight relevant benefits and impacts
- Ensure stakeholder engagement and understanding

**Output:**
Return the stakeholder-targeted enhanced content.
`
  }

  private buildMethodologyAlignedPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a methodology alignment specialist. Enhance the following document section to align with methodology standards.

**Document Section:**
${documentContent}

**Methodology Context:**
${JSON.stringify(preparedContext.methodology_context, null, 2)}

**Injection Requirements:**
- Strategy: Methodology aligned injection
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Requirements:**
- Ensure compliance with methodology framework
- Include relevant methodology elements and terminology
- Follow established standards and best practices
- Maintain professional quality and consistency

**Output:**
Return the methodology-aligned enhanced content.
`
  }

  private buildBusinessContextIntegratedPrompt(
    documentContent: string,
    preparedContext: PreparedContext,
    strategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): string {
    return `
You are a business context integration specialist. Enhance the following document section with relevant business context.

**Document Section:**
${documentContent}

**Business Context:**
${JSON.stringify(preparedContext.business_context, null, 2)}

**Injection Requirements:**
- Strategy: Business context integrated injection
- Quality Requirements: Minimum score ${request.quality_constraints.minimum_quality_score}

**Requirements:**
- Integrate relevant business context and insights
- Highlight business value and impact
- Include appropriate business terminology
- Ensure stakeholder relevance and engagement

**Output:**
Return the business-context enhanced content.
`
  }

  // Additional helper methods
  private async analyzeContentForAdaptiveInjection(
    documentContent: string,
    preparedContext: PreparedContext
  ): Promise<ContentAnalysis> {
    // Implementation for content analysis
    return {
      content_type: 'text',
      complexity_level: 'medium',
      stakeholder_relevance: 0.8,
      methodology_alignment: 0.9,
      business_value: 0.7,
      injection_opportunities: []
    }
  }

  private selectAdaptiveSubStrategy(analysis: ContentAnalysis, strategy: InjectionStrategy): InjectionStrategy {
    // Implementation for selecting adaptive sub-strategy
    return strategy
  }

  private async executeAdaptiveSubStrategy(
    documentContent: string,
    preparedContext: PreparedContext,
    subStrategy: InjectionStrategy,
    request: ContextInjectionRequest
  ): Promise<InjectionExecutionResult> {
    // Implementation for executing adaptive sub-strategy
    return await this.executePrependStrategy(documentContent, preparedContext, subStrategy, request)
  }
}

// Supporting interfaces
interface PreparedContext {
  project_context: ProjectContext
  business_context: BusinessContext
  stakeholder_context: StakeholderContext
  methodology_context: MethodologyContext
  historical_context: HistoricalContext
  external_context: ExternalContext
  user_context: UserContext
  relevant_context: RelevantContext
  context_summary: string
  context_priorities: ContextPriorities
}

interface RelevantContext {
  relevant_project_context: ProjectContext
  relevant_business_context: BusinessContext
  relevant_stakeholder_context: StakeholderContext
  relevant_methodology_context: MethodologyContext
  context_relevance_scores: Record<string, number>
}

interface ContextPriorities {
  project_priority: number
  business_priority: number
  stakeholder_priority: number
  methodology_priority: number
}

interface InjectionExecutionResult {
  injected_content: InjectedContent[]
  processing_time_ms: number
  cost: number
  success: boolean
  metadata: Record<string, any>
}

interface StrategyPerformance {
  strategy_id: string
  total_uses: number
  successful_uses: number
  success_rate: number
  average_quality_improvement: number
  average_processing_time: number
  average_cost: number
  last_updated: Date
}

interface ContentAnalysis {
  content_type: string
  complexity_level: string
  stakeholder_relevance: number
  methodology_alignment: number
  business_value: number
  injection_opportunities: string[]
}

interface ContextSource {
  source_id: string
  source_type: string
  source_name: string
  reliability_score: number
  freshness_score: number
  relevance_score: number
  content: string
  metadata: Record<string, any>
}

interface ContentMetadata {
  strategy_used: string
  injection_type: string
  ai_model_used: string
  tokens_used: number
  [key: string]: any
}

interface ValidationIssue {
  issue_type: string
  severity: string
  description: string
  location: string
  suggestion: string
}

interface ValidationRecommendation {
  recommendation_type: string
  priority: string
  description: string
  implementation: string
  expected_benefit: number
}

interface CostBreakdown {
  ai_generation: number
  processing: number
  validation: number
}

// Additional supporting interfaces would be defined here
interface TeamMember {
  id: string
  name: string
  role: string
  expertise: string[]
}

interface Stakeholder {
  id: string
  name: string
  type: string
  role: string
  influence_level: number
  interest_level: number
}

interface StakeholderRelationship {
  stakeholder1_id: string
  stakeholder2_id: string
  relationship_type: string
  strength: number
}

interface CommunicationPreference {
  stakeholder_id: string
  preferred_format: string
  preferred_frequency: string
  preferred_channel: string
}

interface StakeholderExpectation {
  stakeholder_id: string
  expectation_type: string
  expectation_description: string
  priority: string
}

interface InfluenceMatrix {
  stakeholder_id: string
  influence_level: number
  interest_level: number
  power_level: number
}

interface MethodologyStandard {
  standard_id: string
  standard_name: string
  standard_version: string
  compliance_level: string
}

interface BestPractice {
  practice_id: string
  practice_name: string
  practice_description: string
  applicability: string[]
}

interface ComplianceRequirement {
  requirement_id: string
  requirement_type: string
  requirement_description: string
  mandatory: boolean
}

interface QualityCriterion {
  criterion_id: string
  criterion_name: string
  criterion_description: string
  weight: number
}

interface SimilarProject {
  project_id: string
  project_name: string
  similarity_score: number
  lessons_learned: string[]
}

interface LessonLearned {
  lesson_id: string
  lesson_type: string
  lesson_description: string
  impact_level: string
}

interface SuccessPattern {
  pattern_id: string
  pattern_name: string
  pattern_description: string
  success_rate: number
}

interface FailurePattern {
  pattern_id: string
  pattern_name: string
  pattern_description: string
  failure_rate: number
}

interface HistoricalMetric {
  metric_id: string
  metric_name: string
  metric_value: number
  metric_unit: string
  timestamp: Date
}

interface MarketTrend {
  trend_id: string
  trend_name: string
  trend_description: string
  impact_level: string
}

interface IndustryStandard {
  standard_id: string
  standard_name: string
  standard_body: string
  compliance_requirement: string
}

interface RegulatoryChange {
  change_id: string
  change_name: string
  change_description: string
  effective_date: Date
  impact_level: string
}

interface CompetitorAction {
  action_id: string
  competitor_name: string
  action_description: string
  impact_assessment: string
}

interface TechnologyTrend {
  trend_id: string
  trend_name: string
  trend_description: string
  adoption_level: string
}

interface UserProfile {
  user_id: string
  name: string
  role: string
  expertise: string[]
  experience_level: string
}

interface UserPreferences {
  user_id: string
  preferred_style: string
  preferred_format: string
  preferred_complexity: string
}

interface UserExpertise {
  user_id: string
  expertise_areas: string[]
  expertise_levels: Record<string, string>
}

interface UserGoal {
  user_id: string
  goal_type: string
  goal_description: string
  priority: string
}

interface UserConstraint {
  user_id: string
  constraint_type: string
  constraint_description: string
  impact_level: string
}

interface QualityRequirement {
  requirement_type: string
  requirement_value: string
  weight: number
  mandatory: boolean
}

interface ContentRequirement {
  content_type: string
  content_value: string
  weight: number
  mandatory: boolean
}

interface FormattingRequirement {
  formatting_type: string
  formatting_value: string
  weight: number
  mandatory: boolean
}

interface DeliveryRequirement {
  delivery_type: string
  delivery_value: string
  weight: number
  mandatory: boolean
}

interface AccuracyRequirement {
  accuracy_type: string
  accuracy_threshold: number
  mandatory: boolean
}

interface CompletenessRequirement {
  completeness_type: string
  completeness_threshold: number
  mandatory: boolean
}

interface ResourceLimit {
  resource_type: string
  limit_value: number
  limit_unit: string
}

interface FinancialContext {
  budget: number
  cost_center: string
  financial_year: string
  currency: string
}
