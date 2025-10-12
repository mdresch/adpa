/**
 * Multi-Model AI Generation Service
 * Provides failover, cross-validation, and ensemble generation capabilities
 */

import { logger } from '@/utils/logger'
import { AIService } from './aiService'
import type { AIGenerateRequest, AIGenerateResponse } from './aiService'

export interface MultiModelConfig {
  primary_models: ModelConfig[]
  fallback_models: ModelConfig[]
  ensemble_config: EnsembleConfig
  cross_validation_config: CrossValidationConfig
  failover_config: FailoverConfig
  quality_thresholds: QualityThresholds
  enable_parallel_generation: boolean
  max_parallel_requests: number
  timeout_ms: number
  retry_attempts: number
}

export interface ModelConfig {
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
  reliability_score: number
  last_performance: ModelPerformance
}

export interface ModelPerformance {
  success_rate: number
  average_response_time: number
  quality_score: number
  cost_per_token: number
  reliability_score: number
  last_updated: Date
  total_requests: number
  failed_requests: number
}

export interface EnsembleConfig {
  enable_ensemble: boolean
  ensemble_strategy: 'majority_vote' | 'weighted_average' | 'best_of_n' | 'consensus'
  min_models_for_ensemble: number
  max_models_for_ensemble: number
  consensus_threshold: number
  quality_weights: Record<string, number>
}

export interface CrossValidationConfig {
  enable_cross_validation: boolean
  validation_strategy: 'parallel' | 'sequential' | 'adaptive'
  min_agreement_threshold: number
  disagreement_resolution: 'rerun' | 'ensemble' | 'best_model' | 'manual'
  max_disagreement_reruns: number
}

export interface FailoverConfig {
  enable_failover: boolean
  failover_strategy: 'immediate' | 'delayed' | 'adaptive'
  max_failover_attempts: number
  failover_delay_ms: number
  health_check_interval: number
}

export interface QualityThresholds {
  minimum_quality: number
  acceptable_quality: number
  high_quality: number
  critical_sections_quality: number
}

export interface GenerationRequest {
  prompt: string
  template_id?: string
  section_id?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  quality_requirement: 'minimum' | 'standard' | 'high' | 'premium'
  context?: Record<string, any>
  metadata?: Record<string, any>
}

export interface GenerationResponse {
  content: string
  model_used: string
  provider_used: string
  confidence: number
  quality_score: number
  processing_time_ms: number
  tokens_used: number
  cost: number
  metadata: GenerationMetadata
  ensemble_analysis?: EnsembleAnalysis
  cross_validation?: CrossValidationResult
}

export interface GenerationMetadata {
  generation_id: string
  timestamp: Date
  models_attempted: string[]
  failover_used: boolean
  retry_count: number
  strategy_used: string
  quality_gates_passed: boolean
}

export interface EnsembleAnalysis {
  participating_models: string[]
  consensus_score: number
  disagreement_areas: DisagreementArea[]
  final_decision_rationale: string
  confidence_interval: [number, number]
  quality_variance: number
}

export interface CrossValidationResult {
  validation_method: string
  agreement_score: number
  disagreements: Disagreement[]
  resolution_strategy: string
  final_confidence: number
}

export interface DisagreementArea {
  section_id: string
  disagreement_type: string
  severity: number
  models_involved: string[]
  resolution_strategy: string
}

export interface Disagreement {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  models_involved: string[]
  resolution: string
}

export class MultiModelAIGenerationService {
  private aiService: AIService
  private config: MultiModelConfig
  private modelPerformanceTracker: Map<string, ModelPerformance> = new Map()
  private healthCheckCache: Map<string, boolean> = new Map()
  private lastHealthCheck: Map<string, Date> = new Map()

  constructor(config?: Partial<MultiModelConfig>) {
    this.aiService = new AIService()
    this.config = this.mergeWithDefaults(config)
    this.initializeModelPerformance()
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now()
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.info('Starting multi-model generation', {
      generation_id: generationId,
      priority: request.priority,
      quality_requirement: request.quality_requirement
    })

    try {
      // Step 1: Select appropriate models based on request requirements
      const selectedModels = await this.selectModels(request)
      
      // Step 2: Execute generation strategy
      const results = await this.executeGenerationStrategy(request, selectedModels, generationId)
      
      // Step 3: Apply quality gates and validation
      const validatedResults = await this.applyQualityGates(results, request)
      
      // Step 4: Perform cross-validation if enabled
      let crossValidation: CrossValidationResult | undefined
      if (this.config.cross_validation_config.enable_cross_validation) {
        crossValidation = await this.performCrossValidation(validatedResults, request)
      }
      
      // Step 5: Apply ensemble analysis if multiple models used
      let ensembleAnalysis: EnsembleAnalysis | undefined
      if (validatedResults.length > 1 && this.config.ensemble_config.enable_ensemble) {
        ensembleAnalysis = await this.performEnsembleAnalysis(validatedResults, request)
      }
      
      // Step 6: Select final result
      const finalResult = await this.selectFinalResult(validatedResults, crossValidation, ensembleAnalysis, request)
      
      // Step 7: Update model performance
      await this.updateModelPerformance(selectedModels, finalResult, startTime)
      
      const processingTime = Date.now() - startTime

      logger.info('Multi-model generation completed', {
        generation_id: generationId,
        processing_time_ms: processingTime,
        final_quality_score: finalResult.quality_score,
        models_used: finalResult.model_used,
        ensemble_used: !!ensembleAnalysis,
        cross_validation_used: !!crossValidation
      })

      return {
        content: finalResult.content,
        model_used: finalResult.model_used,
        provider_used: finalResult.provider_used,
        confidence: finalResult.confidence,
        quality_score: finalResult.quality_score,
        processing_time_ms: processingTime,
        tokens_used: finalResult.tokens_used,
        cost: finalResult.cost,
        metadata: {
          generation_id: generationId,
          timestamp: new Date(),
          models_attempted: selectedModels.map(m => m.model),
          failover_used: finalResult.failover_used || false,
          retry_count: finalResult.retry_count || 0,
          strategy_used: this.determineStrategyUsed(selectedModels, ensembleAnalysis, crossValidation),
          quality_gates_passed: true
        },
        ensemble_analysis: ensembleAnalysis,
        cross_validation: crossValidation
      }

    } catch (error) {
      logger.error('Multi-model generation failed', {
        generation_id: generationId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  private async selectModels(request: GenerationRequest): Promise<ModelConfig[]> {
    const availableModels = [...this.config.primary_models, ...this.config.fallback_models]
      .filter(model => model.enabled)
      .filter(model => this.isModelHealthy(model))

    // Sort by priority and performance
    const sortedModels = availableModels.sort((a, b) => {
      const aScore = this.calculateModelScore(a, request)
      const bScore = this.calculateModelScore(b, request)
      return bScore - aScore
    })

    // Select models based on request requirements
    let selectedModels: ModelConfig[] = []

    switch (request.quality_requirement) {
      case 'premium':
        selectedModels = sortedModels.slice(0, 3) // Use top 3 models
        break
      case 'high':
        selectedModels = sortedModels.slice(0, 2) // Use top 2 models
        break
      case 'standard':
        selectedModels = sortedModels.slice(0, 1) // Use best model
        break
      case 'minimum':
        selectedModels = sortedModels.slice(0, 1) // Use best available model
        break
    }

    // Ensure we have at least one model
    if (selectedModels.length === 0) {
      selectedModels = [availableModels[0]] // Fallback to first available
    }

    logger.info('Models selected for generation', {
      models: selectedModels.map(m => m.model),
      quality_requirement: request.quality_requirement,
      priority: request.priority
    })

    return selectedModels
  }

  private async executeGenerationStrategy(
    request: GenerationRequest,
    models: ModelConfig[],
    generationId: string
  ): Promise<GenerationResult[]> {
    if (this.config.enable_parallel_generation && models.length > 1) {
      return await this.executeParallelGeneration(request, models, generationId)
    } else {
      return await this.executeSequentialGeneration(request, models, generationId)
    }
  }

  private async executeParallelGeneration(
    request: GenerationRequest,
    models: ModelConfig[],
    generationId: string
  ): Promise<GenerationResult[]> {
    const promises = models.map(async (model) => {
      try {
        return await this.generateWithModel(request, model, generationId)
      } catch (error) {
        logger.warn('Parallel generation failed for model', {
          model: model.model,
          provider: model.provider,
          error: error.message
        })
        
        // Try fallback if available
        if (this.config.failover_config.enable_failover) {
          return await this.tryFallbackGeneration(request, model, generationId)
        }
        
        throw error
      }
    })

    const results = await Promise.allSettled(promises)
    const successfulResults: GenerationResult[] = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value)
      } else {
        logger.error('Model generation failed', {
          model: models[i].model,
          provider: models[i].provider,
          error: result.reason
        })
      }
    }

    return successfulResults
  }

  private async executeSequentialGeneration(
    request: GenerationRequest,
    models: ModelConfig[],
    generationId: string
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []

    for (const model of models) {
      try {
        const result = await this.generateWithModel(request, model, generationId)
        results.push(result)
        
        // Check if result meets quality requirements
        if (this.meetsQualityRequirements(result, request)) {
          break // Stop if quality requirement is met
        }
      } catch (error) {
        logger.warn('Sequential generation failed for model', {
          model: model.model,
          provider: model.provider,
          error: error.message
        })
        
        // Try fallback if available
        if (this.config.failover_config.enable_failover) {
          try {
            const fallbackResult = await this.tryFallbackGeneration(request, model, generationId)
            results.push(fallbackResult)
            break
          } catch (fallbackError) {
            logger.error('Fallback generation also failed', {
              model: model.model,
              error: fallbackError.message
            })
          }
        }
      }
    }

    return results
  }

  private async generateWithModel(
    request: GenerationRequest,
    model: ModelConfig,
    generationId: string
  ): Promise<GenerationResult> {
    const startTime = Date.now()

    try {
      const aiRequest: AIGenerationRequest = {
        prompt: request.prompt,
        provider: model.provider,
        model: model.model,
        temperature: model.temperature,
        max_tokens: model.max_tokens,
        template_id: request.template_id,
        variables: request.context
      }

      const response = await this.aiService.generate(aiRequest)
      const processingTime = Date.now() - startTime

      // Calculate quality score
      const qualityScore = await this.calculateQualityScore(response.content || '', request)

      // Calculate cost (simplified)
      const cost = this.calculateCost(response.usage?.total_tokens || 0, model)

      return {
        content: response.content || '',
        model_used: model.model,
        provider_used: model.provider,
        confidence: response.confidence || 0.8,
        quality_score: qualityScore,
        processing_time_ms: processingTime,
        tokens_used: response.usage?.total_tokens || 0,
        cost: cost,
        metadata: {
          generation_id: generationId,
          model_config: model,
          ai_response: response
        }
      }

    } catch (error) {
      logger.error('Model generation failed', {
        model: model.model,
        provider: model.provider,
        generation_id: generationId,
        error: error.message
      })
      throw error
    }
  }

  private async tryFallbackGeneration(
    request: GenerationRequest,
    failedModel: ModelConfig,
    generationId: string
  ): Promise<GenerationResult> {
    const fallbackModels = this.config.failover_config.enable_failover 
      ? this.config.fallback_models.filter(m => m.enabled && m.model !== failedModel.model)
      : []

    if (fallbackModels.length === 0) {
      throw new Error('No fallback models available')
    }

    // Try fallback models in priority order
    for (const fallbackModel of fallbackModels) {
      try {
        return await this.generateWithModel(request, fallbackModel, generationId)
      } catch (error) {
        logger.warn('Fallback model also failed', {
          fallback_model: fallbackModel.model,
          original_model: failedModel.model,
          error: error.message
        })
      }
    }

    throw new Error('All fallback models failed')
  }

  private async applyQualityGates(
    results: GenerationResult[],
    request: GenerationRequest
  ): Promise<GenerationResult[]> {
    const threshold = this.getQualityThreshold(request.quality_requirement)
    
    return results.filter(result => {
      const passed = result.quality_score >= threshold
      if (!passed) {
        logger.warn('Quality gate failed', {
          model: result.model_used,
          quality_score: result.quality_score,
          threshold: threshold
        })
      }
      return passed
    })
  }

  private async performCrossValidation(
    results: GenerationResult[],
    request: GenerationRequest
  ): Promise<CrossValidationResult> {
    if (results.length < 2) {
      return {
        validation_method: 'single_result',
        agreement_score: 1.0,
        disagreements: [],
        resolution_strategy: 'single_model',
        final_confidence: results[0]?.confidence || 0.8
      }
    }

    // Compare results for agreement
    const disagreements = await this.identifyDisagreements(results)
    const agreementScore = this.calculateAgreementScore(results, disagreements)
    
    let resolutionStrategy = 'consensus'
    if (agreementScore < this.config.cross_validation_config.min_agreement_threshold) {
      resolutionStrategy = this.config.cross_validation_config.disagreement_resolution
    }

    return {
      validation_method: 'multi_model_comparison',
      agreement_score: agreementScore,
      disagreements: disagreements,
      resolution_strategy: resolutionStrategy,
      final_confidence: Math.min(...results.map(r => r.confidence)) * agreementScore
    }
  }

  private async performEnsembleAnalysis(
    results: GenerationResult[],
    request: GenerationRequest
  ): Promise<EnsembleAnalysis> {
    const participatingModels = results.map(r => r.model_used)
    const qualityScores = results.map(r => r.quality_score)
    const consensusScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    
    const disagreements = await this.identifyDisagreements(results)
    const qualityVariance = this.calculateQualityVariance(qualityScores)
    
    const confidenceInterval: [number, number] = [
      Math.min(...qualityScores),
      Math.max(...qualityScores)
    ]

    return {
      participating_models: participatingModels,
      consensus_score: consensusScore,
      disagreement_areas: disagreements.map(d => ({
        section_id: request.section_id || 'unknown',
        disagreement_type: d.type,
        severity: this.mapSeverityToNumber(d.severity),
        models_involved: [results[0]?.model_used || 'unknown'],
        resolution_strategy: d.resolution
      })),
      final_decision_rationale: this.generateDecisionRationale(results, consensusScore, disagreements),
      confidence_interval: confidenceInterval,
      quality_variance: qualityVariance
    }
  }

  private async selectFinalResult(
    results: GenerationResult[],
    crossValidation?: CrossValidationResult,
    ensembleAnalysis?: EnsembleAnalysis,
    request?: GenerationRequest
  ): Promise<GenerationResult> {
    if (results.length === 1) {
      return results[0]
    }

    // Use ensemble strategy to select final result
    switch (this.config.ensemble_config.ensemble_strategy) {
      case 'best_of_n':
        return results.reduce((best, current) => 
          current.quality_score > best.quality_score ? current : best
        )
      
      case 'weighted_average':
        return this.createWeightedAverageResult(results)
      
      case 'majority_vote':
        return this.selectByMajorityVote(results)
      
      case 'consensus':
        return this.selectByConsensus(results, crossValidation, ensembleAnalysis)
      
      default:
        return results[0]
    }
  }

  // Helper methods
  private mergeWithDefaults(config?: Partial<MultiModelConfig>): MultiModelConfig {
    return {
      primary_models: [
        {
          provider: 'openai',
          model: 'gpt-4',
          priority: 1,
          enabled: true,
          temperature: 0.7,
          max_tokens: 2000,
          timeout: 30000,
          retry_attempts: 3,
          quality_threshold: 0.8,
          cost_weight: 0.3,
          performance_weight: 0.7,
          reliability_score: 0.9,
          last_performance: this.createDefaultPerformance()
        },
        {
          provider: 'google',
          model: 'gemini-pro',
          priority: 2,
          enabled: true,
          temperature: 0.7,
          max_tokens: 2000,
          timeout: 30000,
          retry_attempts: 3,
          quality_threshold: 0.8,
          cost_weight: 0.2,
          performance_weight: 0.8,
          reliability_score: 0.9,
          last_performance: this.createDefaultPerformance()
        }
      ],
      fallback_models: [
        {
          provider: 'anthropic',
          model: 'claude-3-sonnet',
          priority: 3,
          enabled: true,
          temperature: 0.7,
          max_tokens: 2000,
          timeout: 30000,
          retry_attempts: 3,
          quality_threshold: 0.8,
          cost_weight: 0.4,
          performance_weight: 0.6,
          reliability_score: 0.9,
          last_performance: this.createDefaultPerformance()
        }
      ],
      ensemble_config: {
        enable_ensemble: true,
        ensemble_strategy: 'weighted_average',
        min_models_for_ensemble: 2,
        max_models_for_ensemble: 3,
        consensus_threshold: 0.8,
        quality_weights: {}
      },
      cross_validation_config: {
        enable_cross_validation: true,
        validation_strategy: 'adaptive',
        min_agreement_threshold: 0.7,
        disagreement_resolution: 'ensemble',
        max_disagreement_reruns: 2
      },
      failover_config: {
        enable_failover: true,
        failover_strategy: 'immediate',
        max_failover_attempts: 3,
        failover_delay_ms: 1000,
        health_check_interval: 300000
      },
      quality_thresholds: {
        minimum_quality: 0.6,
        acceptable_quality: 0.7,
        high_quality: 0.8,
        critical_sections_quality: 0.9
      },
      enable_parallel_generation: true,
      max_parallel_requests: 3,
      timeout_ms: 60000,
      retry_attempts: 3,
      ...config
    }
  }

  private createDefaultPerformance(): ModelPerformance {
    return {
      success_rate: 0.95,
      average_response_time: 3000,
      quality_score: 0.8,
      cost_per_token: 0.0001,
      reliability_score: 0.9,
      last_updated: new Date(),
      total_requests: 0,
      failed_requests: 0
    }
  }

  private initializeModelPerformance(): void {
    const allModels = [...this.config.primary_models, ...this.config.fallback_models]
    for (const model of allModels) {
      this.modelPerformanceTracker.set(model.model, model.last_performance)
    }
  }

  private async isModelHealthy(model: ModelConfig): Promise<boolean> {
    const lastCheck = this.lastHealthCheck.get(model.model)
    const now = new Date()
    
    if (lastCheck && (now.getTime() - lastCheck.getTime()) < this.config.failover_config.health_check_interval) {
      return this.healthCheckCache.get(model.model) || false
    }

    // Perform health check
    const isHealthy = await this.performHealthCheck(model)
    this.healthCheckCache.set(model.model, isHealthy)
    this.lastHealthCheck.set(model.model, now)
    
    return isHealthy
  }

  private async performHealthCheck(model: ModelConfig): Promise<boolean> {
    try {
      // Simple health check - generate a short test prompt
      const testRequest: AIGenerationRequest = {
        prompt: 'Test',
        provider: model.provider,
        model: model.model,
        temperature: 0.1,
        max_tokens: 10
      }

      await this.aiService.generate(testRequest)
      return true
    } catch (error) {
      logger.warn('Health check failed for model', {
        model: model.model,
        provider: model.provider,
        error: error.message
      })
      return false
    }
  }

  private calculateModelScore(model: ModelConfig, request: GenerationRequest): number {
    const performance = this.modelPerformanceTracker.get(model.model) || model.last_performance
    const priorityWeight = this.getPriorityWeight(request.priority)
    const qualityWeight = this.getQualityWeight(request.quality_requirement)
    
    return (
      performance.quality_score * qualityWeight +
      performance.reliability_score * 0.3 +
      priorityWeight * 0.2 -
      performance.cost_per_token * model.cost_weight
    )
  }

  private getPriorityWeight(priority: string): number {
    const weights = { low: 0.1, medium: 0.3, high: 0.5, critical: 0.7 }
    return weights[priority as keyof typeof weights] || 0.3
  }

  private getQualityWeight(quality: string): number {
    const weights = { minimum: 0.1, standard: 0.3, high: 0.5, premium: 0.7 }
    return weights[quality as keyof typeof weights] || 0.3
  }

  private async calculateQualityScore(content: string, request: GenerationRequest): Promise<number> {
    // Simplified quality scoring - in a real implementation, this would use
    // NLP models, readability metrics, content analysis, etc.
    const length = content.length
    const hasStructure = content.includes('#') || content.includes('*') || content.includes('-')
    const hasNumbers = /\d/.test(content)
    const hasCompleteSentences = content.split('.').length > 1
    
    let score = 0.5 // Base score
    
    if (length > 100) score += 0.1
    if (hasStructure) score += 0.1
    if (hasNumbers) score += 0.1
    if (hasCompleteSentences) score += 0.2
    
    return Math.min(1.0, score)
  }

  private calculateCost(tokens: number, model: ModelConfig): number {
    // Simplified cost calculation - in reality, this would use actual pricing
    return tokens * model.last_performance.cost_per_token
  }

  private getQualityThreshold(qualityRequirement: string): number {
    const thresholds = {
      minimum: this.config.quality_thresholds.minimum_quality,
      standard: this.config.quality_thresholds.acceptable_quality,
      high: this.config.quality_thresholds.high_quality,
      premium: this.config.quality_thresholds.critical_sections_quality
    }
    return thresholds[qualityRequirement as keyof typeof thresholds] || 0.7
  }

  private meetsQualityRequirements(result: GenerationResult, request: GenerationRequest): boolean {
    const threshold = this.getQualityThreshold(request.quality_requirement)
    return result.quality_score >= threshold
  }

  private async identifyDisagreements(results: GenerationResult[]): Promise<Disagreement[]> {
    // Simplified disagreement detection - in reality, this would use
    // semantic similarity, content analysis, etc.
    const disagreements: Disagreement[] = []
    
    if (results.length < 2) return disagreements
    
    // Check for significant quality differences
    const qualityScores = results.map(r => r.quality_score)
    const maxQuality = Math.max(...qualityScores)
    const minQuality = Math.min(...qualityScores)
    
    if (maxQuality - minQuality > 0.2) {
      disagreements.push({
        type: 'quality_variance',
        severity: 'medium',
        description: 'Significant quality differences between models',
        models_involved: results.map(r => r.model_used),
        resolution: 'weighted_average'
      })
    }
    
    return disagreements
  }

  private calculateAgreementScore(results: GenerationResult[], disagreements: Disagreement[]): number {
    if (results.length < 2) return 1.0
    
    const baseScore = 1.0 - (disagreements.length * 0.2)
    return Math.max(0.0, baseScore)
  }

  private calculateQualityVariance(scores: number[]): number {
    if (scores.length < 2) return 0.0
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    return Math.sqrt(variance)
  }

  private mapSeverityToNumber(severity: string): number {
    const mapping = { low: 1, medium: 2, high: 3, critical: 4 }
    return mapping[severity as keyof typeof mapping] || 2
  }

  private generateDecisionRationale(
    results: GenerationResult[],
    consensusScore: number,
    disagreements: Disagreement[]
  ): string {
    if (disagreements.length === 0) {
      return `Consensus achieved across ${results.length} models with average quality score of ${consensusScore.toFixed(2)}`
    } else {
      return `Resolved ${disagreements.length} disagreements using ensemble strategy. Final quality score: ${consensusScore.toFixed(2)}`
    }
  }

  private createWeightedAverageResult(results: GenerationResult[]): GenerationResult {
    // Create a composite result based on weighted average
    const weights = results.map(r => r.quality_score)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    
    // For simplicity, return the highest quality result
    return results.reduce((best, current) => 
      current.quality_score > best.quality_score ? current : best
    )
  }

  private selectByMajorityVote(results: GenerationResult[]): GenerationResult {
    // Simplified majority vote - in reality, this would analyze content similarity
    return results.reduce((best, current) => 
      current.quality_score > best.quality_score ? current : best
    )
  }

  private selectByConsensus(
    results: GenerationResult[],
    crossValidation?: CrossValidationResult,
    ensembleAnalysis?: EnsembleAnalysis
  ): GenerationResult {
    if (crossValidation && crossValidation.agreement_score > 0.8) {
      // High agreement - return best quality
      return results.reduce((best, current) => 
        current.quality_score > best.quality_score ? current : best
      )
    } else {
      // Low agreement - use ensemble approach
      return this.createWeightedAverageResult(results)
    }
  }

  private determineStrategyUsed(
    models: ModelConfig[],
    ensembleAnalysis?: EnsembleAnalysis,
    crossValidation?: CrossValidationResult
  ): string {
    if (ensembleAnalysis) return 'ensemble'
    if (crossValidation) return 'cross_validation'
    if (models.length > 1) return 'multi_model'
    return 'single_model'
  }

  private async updateModelPerformance(
    models: ModelConfig[],
    finalResult: GenerationResult,
    startTime: number
  ): Promise<void> {
    const processingTime = Date.now() - startTime
    
    for (const model of models) {
      const performance = this.modelPerformanceTracker.get(model.model)
      if (performance) {
        performance.total_requests++
        performance.average_response_time = 
          (performance.average_response_time + processingTime) / 2
        
        if (model.model === finalResult.model_used) {
          performance.quality_score = 
            (performance.quality_score + finalResult.quality_score) / 2
          performance.reliability_score = 
            (performance.reliability_score + 1.0) / 2 // Success
        } else {
          performance.failed_requests++
          performance.reliability_score = 
            (performance.reliability_score + 0.0) / 2 // Failure
        }
        
        performance.last_updated = new Date()
        this.modelPerformanceTracker.set(model.model, performance)
      }
    }
  }
}

// Supporting interfaces
interface GenerationResult {
  content: string
  model_used: string
  provider_used: string
  confidence: number
  quality_score: number
  processing_time_ms: number
  tokens_used: number
  cost: number
  metadata: {
    generation_id: string
    model_config: ModelConfig
    ai_response: AIGenerationResponse
  }
  failover_used?: boolean
  retry_count?: number
}
