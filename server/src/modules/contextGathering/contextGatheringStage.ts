/**
 * Context Gathering Stage
 * Comprehensive context gathering for document generation
 */

import { logger } from '@/utils/logger'
import { ProjectContextAnalyzer } from './analyzers/projectContextAnalyzer'
import { UserProfileAnalyzer } from './analyzers/userProfileAnalyzer'
import { DocumentHistoryAnalyzer } from './analyzers/documentHistoryAnalyzer'
import { ExternalContextAnalyzer } from './analyzers/externalContextAnalyzer'
import { TemplateContextAnalyzer } from './analyzers/templateContextAnalyzer'
import { BaselineContextAnalyzer } from './analyzers/baselineContextAnalyzer'
import { ContextRetrievalService } from '@/modules/contextRetrieval/contextRetrievalService'
import { getQdrantConfig } from '@/modules/contextRetrieval/config/qdrantConfig'
import { ContextIntegrator } from './integrators/contextIntegrator'
import { ContextOptimizer } from './optimizers/contextOptimizer'
import { ContextValidator } from './validators/contextValidator'
import { ContextQualityAssessor } from './assessors/contextQualityAssessor'
import { documentTemplateService } from '../documentTemplates/service'
import { getContextForStrategy } from '../../services/gkg/gkgContextService'
import type {
  IContextGatheringStage,
  ContextGatheringRequest,
  ContextGatheringResult,
  ContextData,
  ContextQualityAnalysis,
  ContextGap,
  ContextSourcePriority,
  SemanticSearchConfig,
  RelevanceScoringConfig
} from './types'

export class ContextGatheringStage implements IContextGatheringStage {
  private projectContextAnalyzer: ProjectContextAnalyzer
  private userProfileAnalyzer: UserProfileAnalyzer
  private documentHistoryAnalyzer: DocumentHistoryAnalyzer
  private externalContextAnalyzer: ExternalContextAnalyzer
  private templateContextAnalyzer: TemplateContextAnalyzer
  private baselineContextAnalyzer: BaselineContextAnalyzer
  private contextRetrievalService: ContextRetrievalService
  private contextIntegrator: ContextIntegrator
  private contextOptimizer: ContextOptimizer
  private contextValidator: ContextValidator
  private contextQualityAssessor: ContextQualityAssessor

  constructor() {
    // Initialize RAG retrieval service (CR-2025-001: RAG Integration)
    // Include Qdrant if configured
    const qdrantConfig = getQdrantConfig()
    this.contextRetrievalService = new ContextRetrievalService(
      this.getDefaultSemanticSearchConfig(),
      this.getDefaultRelevanceScoringConfig(),
      qdrantConfig || undefined
    )
    
    // Inject retrieval service into all analyzers for RAG-powered context gathering
    this.projectContextAnalyzer = new ProjectContextAnalyzer(this.contextRetrievalService)
    this.userProfileAnalyzer = new UserProfileAnalyzer(this.contextRetrievalService)
    this.documentHistoryAnalyzer = new DocumentHistoryAnalyzer(this.contextRetrievalService)
    this.externalContextAnalyzer = new ExternalContextAnalyzer(this.contextRetrievalService)
    this.templateContextAnalyzer = new TemplateContextAnalyzer(this.contextRetrievalService)
    this.baselineContextAnalyzer = new BaselineContextAnalyzer(this.contextRetrievalService)
    
    // Initialize context processing services
    this.contextIntegrator = new ContextIntegrator()
    this.contextOptimizer = new ContextOptimizer()
    this.contextValidator = new ContextValidator()
    this.contextQualityAssessor = new ContextQualityAssessor()
  }

  private getDefaultSemanticSearchConfig(): SemanticSearchConfig {
    return {
      model: 'text-embedding-ada-002',
      embeddingDimensions: 1536,
      similarityThreshold: 0.3,
      maxTokens: 8000,
      temperature: 0,
      topK: 50,
      includeContext: true,
      useCache: true,
      cacheExpiry: 3600
    }
  }

  private getDefaultRelevanceScoringConfig(): RelevanceScoringConfig {
    return {
      weights: {
        semanticSimilarity: 0.6,
        keywordMatch: 0.4,
        freshness: 0.1,
        authority: 0.2,
        popularity: 0.1,
        userPreference: 0.1,
        contextRelevance: 0.1
      },
      normalization: {
        minScore: 0,
        maxScore: 1,
        boostFactors: {}
      },
      thresholds: {
        highRelevance: 0.8,
        mediumRelevance: 0.5,
        lowRelevance: 0.3
      }
    }
  }

  /**
   * Execute enhanced 5-stage context gathering process
   * CR-2025-001: RAG Integration - Semantic search is now PRIMARY
   * CR-2026-001: Baseline Integration - Approved baseline included in context
   */
  async execute(request: ContextGatheringRequest): Promise<ContextGatheringResult> {
    try {
      logger.info('[STAGE-0] Starting enhanced context gathering', {
        requestId: request.request_id,
        templateId: request.template_id,
        projectId: request.project_id,
        userId: request.user_id,
        pattern: '5-stage RAG-first with baseline integration'
      })

      const startTime = Date.now()

      // Stage 1: RAG Semantic Retrieval (PRIMARY - 40% weight)
      logger.info('[STAGE-1] RAG Semantic Retrieval (PRIMARY)')
      const ragContext = await this.gatherRAGContext(request)
      const stage1Time = Date.now() - startTime

      // Stage 2: Baseline Context Integration (30% weight)
      logger.info('[STAGE-2] Baseline Context Integration')
      const baselineContext = await this.gatherBaselineContext(request)
      const stage2Time = Date.now() - startTime - stage1Time

      // Stage 3: Legacy Direct Queries (20% weight - fallback)
      logger.info('[STAGE-3] Direct Query Fallback')
      const directContext = await this.gatherDirectContext(request)
      const stage3Time = Date.now() - startTime - stage1Time - stage2Time

      // Stage 4: External Context (10% weight - optional)
      logger.info('[STAGE-4] External Context (optional)')
      const externalContext = await this.gatherExternalContextStage(request)
      const stage4Time = Date.now() - startTime - stage1Time - stage2Time - stage3Time

      // Stage 4.5: GKG context (template-driven semantic search)
      logger.info('[STAGE-4.5] GKG context (template strategy)')
      const gkgContext = await this.gatherGKGContext(request)

      // Stage 5: Context Optimization & Merging
      logger.info('[STAGE-5] Context Optimization & Merging')
      const optimizedContextData = await this.optimizeAndMergeContext({
        rag: ragContext,
        baseline: baselineContext,
        direct: directContext,
        external: externalContext,
        gkg: gkgContext
      }, request)
      const stage5Time = Date.now() - startTime - stage1Time - stage2Time - stage3Time - stage4Time

      // Analyze context quality
      const qualityAnalysis = await this.analyzeContextQuality(optimizedContextData)

      // Identify context gaps
      const contextGaps = await this.identifyContextGaps(optimizedContextData)

      // Prioritize context sources (RAG-first ordering)
      const sourcePriorities = await this.prioritizeContextSources(optimizedContextData)

      // Calculate gathering metrics with stage timings
      const gatheringMetrics = await this.calculateGatheringMetrics(request, optimizedContextData, startTime)
      gatheringMetrics.stage_timings = {
        stage_1_rag: stage1Time,
        stage_2_baseline: stage2Time,
        stage_3_direct: stage3Time,
        stage_4_external: stage4Time,
        stage_5_optimization: stage5Time
      }

      // Generate recommendations
      const recommendations = await this.generateRecommendations(optimizedContextData, qualityAnalysis, contextGaps)

      const result: ContextGatheringResult = {
        result_id: `context_gathering_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request_id: request.request_id,
        context_data: optimizedContextData,
        quality_analysis: qualityAnalysis,
        context_gaps: contextGaps,
        source_priorities: sourcePriorities,
        gathering_metrics: gatheringMetrics,
        recommendations: recommendations,
        metadata: {
          gathering_time: Date.now() - startTime,
          template_id: request.template_id,
          project_id: request.project_id,
          user_id: request.user_id,
          document_type: request.document_type,
          context_strategy: 'RAG-first with baseline integration',
          rag_enabled: true,
          baseline_enabled: !!baselineContext
        }
      }

      logger.info('[STAGE-COMPLETE] Context gathering completed successfully', {
        requestId: request.request_id,
        totalTime: Date.now() - startTime,
        contextQuality: qualityAnalysis.overall_quality_score,
        contextGaps: contextGaps.length,
        ragChunks: ragContext?.rag_chunks_count || 0,
        baselineIncluded: !!baselineContext,
        recommendations: recommendations.length
      })

      return result

    } catch (error: unknown) {
      logger.error('Context gathering stage failed', {
        requestId: request.request_id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async gatherProjectContext(request: ContextGatheringRequest): Promise<any> {
    try {
      logger.debug('Gathering project context', {
        requestId: request.request_id,
        projectId: request.project_id
      })

      const projectContext = await this.projectContextAnalyzer.analyzeProjectContext(request.project_id)

      logger.debug('Project context gathered successfully', {
        requestId: request.request_id,
        stakeholderCount: projectContext.stakeholders?.length || 0,
        requirementCount: projectContext.requirements?.length || 0,
        riskCount: projectContext.risks?.length || 0
      })

      return projectContext

    } catch (error) {
      logger.error('Failed to gather project context', {
        requestId: request.request_id,
        projectId: request.project_id,
        error: error.message
      })
      throw error
    }
  }

  async gatherUserProfileContext(request: ContextGatheringRequest): Promise<any> {
    try {
      logger.debug('Gathering user profile context', {
        requestId: request.request_id,
        userId: request.user_id
      })

      const userProfileContext = await this.userProfileAnalyzer.analyzeUserProfile(request.user_id)

      logger.debug('User profile context gathered successfully', {
        requestId: request.request_id,
        preferenceCount: userProfileContext.user_preferences?.length || 0,
        expertiseCount: userProfileContext.user_expertise?.length || 0
      })

      return userProfileContext

    } catch (error) {
      logger.error('Failed to gather user profile context', {
        requestId: request.request_id,
        userId: request.user_id,
        error: error.message
      })
      throw error
    }
  }

  async gatherDocumentHistoryContext(request: ContextGatheringRequest): Promise<any> {
    try {
      logger.debug('Gathering document history context', {
        requestId: request.request_id,
        templateId: request.template_id
      })

      const documentHistoryContext = await this.documentHistoryAnalyzer.analyzeDocumentHistory(
        request.template_id,
        request.project_id,
        request.user_id
      )

      logger.debug('Document history context gathered successfully', {
        requestId: request.request_id,
        documentCount: documentHistoryContext.document_history?.length || 0,
        patternCount: documentHistoryContext.usage_patterns?.length || 0
      })

      return documentHistoryContext

    } catch (error) {
      logger.error('Failed to gather document history context', {
        requestId: request.request_id,
        templateId: request.template_id,
        error: error.message
      })
      throw error
    }
  }

  async gatherExternalContext(request: ContextGatheringRequest): Promise<any> {
    try {
      logger.debug('Gathering external context', {
        requestId: request.request_id,
        projectId: request.project_id
      })

      const externalContext = await this.externalContextAnalyzer.analyzeExternalContext(
        request.project_id,
        request.gathering_config.context_sources
      )

      logger.debug('External context gathered successfully', {
        requestId: request.request_id,
        sourceCount: externalContext.external_sources?.length || 0,
        apiResponseCount: externalContext.api_responses?.length || 0
      })

      return externalContext

    } catch (error) {
      logger.error('Failed to gather external context', {
        requestId: request.request_id,
        projectId: request.project_id,
        error: error.message
      })
      throw error
    }
  }

  async gatherTemplateContext(request: ContextGatheringRequest): Promise<any> {
    try {
      logger.debug('Gathering template context', {
        requestId: request.request_id,
        templateId: request.template_id
      })

      const templateContext = await this.templateContextAnalyzer.analyzeTemplateContext(request.template_id)

      logger.debug('Template context gathered successfully', {
        requestId: request.request_id,
        variableCount: templateContext.template_variables?.length || 0,
        structureComplexity: templateContext.template_structure?.complexity_score || 0
      })

      return templateContext

    } catch (error) {
      logger.error('Failed to gather template context', {
        requestId: request.request_id,
        templateId: request.template_id,
        error: error.message
      })
      throw error
    }
  }

  async analyzeContextQuality(contextData: ContextData): Promise<ContextQualityAnalysis> {
    try {
      logger.debug('Analyzing context quality')

      const qualityAnalysis = await this.contextQualityAssessor.assessContextQuality(contextData)

      logger.debug('Context quality analysis completed', {
        overallQuality: qualityAnalysis.overall_quality_score,
        qualityDimensions: qualityAnalysis.quality_dimensions.length,
        qualityIssues: qualityAnalysis.quality_issues.length
      })

      return qualityAnalysis

    } catch (error) {
      logger.error('Failed to analyze context quality', {
        error: error.message
      })
      throw error
    }
  }

  async identifyContextGaps(contextData: ContextData): Promise<ContextGap[]> {
    try {
      logger.debug('Identifying context gaps')

      const contextGaps = await this.contextValidator.identifyContextGaps(contextData)

      logger.debug('Context gaps identified', {
        gapCount: contextGaps.length,
        criticalGaps: contextGaps.filter(g => g.gap_severity === 'critical').length
      })

      return contextGaps

    } catch (error) {
      logger.error('Failed to identify context gaps', {
        error: error.message
      })
      throw error
    }
  }

  async prioritizeContextSources(contextData: ContextData): Promise<ContextSourcePriority[]> {
    try {
      logger.debug('Prioritizing context sources')

      const sourcePriorities = await this.contextOptimizer.prioritizeContextSources(contextData)

      logger.debug('Context sources prioritized', {
        sourceCount: sourcePriorities.length,
        highPrioritySources: sourcePriorities.filter(s => s.priority_score > 0.8).length
      })

      return sourcePriorities

    } catch (error) {
      logger.error('Failed to prioritize context sources', {
        error: error.message
      })
      throw error
    }
  }

  async integrateWithRepository(contextData: ContextData): Promise<any> {
    try {
      logger.debug('Integrating context with repository')

      const integratedContext = await this.contextIntegrator.integrateContext(contextData)

      logger.debug('Context integrated with repository', {
        integratedSources: integratedContext.integrated_sources.length,
        crossReferences: integratedContext.cross_references.length
      })

      return integratedContext

    } catch (error) {
      logger.error('Failed to integrate context with repository', {
        error: error.message
      })
      throw error
    }
  }

  async validateContextCompleteness(contextData: ContextData): Promise<any> {
    try {
      logger.debug('Validating context completeness')

      const validationResult = await this.contextValidator.validateContextCompleteness(contextData)

      logger.debug('Context completeness validated', {
        valid: validationResult.valid,
        validationScore: validationResult.validation_score,
        errorCount: validationResult.validation_errors.length
      })

      return validationResult

    } catch (error) {
      logger.error('Failed to validate context completeness', {
        error: error.message
      })
      throw error
    }
  }

  async optimizeContextForGeneration(contextData: ContextData): Promise<any> {
    try {
      logger.debug('Optimizing context for generation')

      const optimizedContext = await this.contextOptimizer.optimizeContext(contextData)

      logger.debug('Context optimized for generation', {
        optimizedSources: optimizedContext.optimized_sources.length,
        contextPriorities: optimizedContext.context_priorities.length,
        contextKeyPoints: optimizedContext.context_key_points.length
      })

      return optimizedContext

    } catch (error) {
      logger.error('Failed to optimize context for generation', {
        error: error.message
      })
      throw error
    }
  }

  private async gatherAllContext(request: ContextGatheringRequest): Promise<ContextData> {
    const startTime = Date.now()

    // Gather context from all sources in parallel for better performance
    const [
      projectContext,
      userProfileContext,
      documentHistoryContext,
      externalContext,
      templateContext
    ] = await Promise.all([
      this.gatherProjectContext(request),
      this.gatherUserProfileContext(request),
      this.gatherDocumentHistoryContext(request),
      this.gatherExternalContext(request),
      this.gatherTemplateContext(request)
    ])

    // Integrate all context data
    const integratedContext = await this.contextIntegrator.integrateContext({
      project_context: projectContext,
      user_profile_context: userProfileContext,
      document_history_context: documentHistoryContext,
      external_context: externalContext,
      template_context: templateContext
    })

    // Optimize context for generation
    const optimizedContext = await this.contextOptimizer.optimizeContext(integratedContext)

      const contextData: ContextData = {
        project_context: projectContext,
        user_profile_context: userProfileContext,
        document_history_context: documentHistoryContext,
        external_context: externalContext,
        template_context: templateContext,
        integrated_context: integratedContext,
        optimized_context: optimizedContext,
        metadata: {
          gathering_timestamp: new Date(),
          gathering_duration: Date.now() - startTime,
          context_sources_used: request.gathering_config.context_sources.map(s => s.source_id),
          context_quality_score: 0, // Will be calculated by quality assessor
          context_completeness_score: 0, // Will be calculated by validator
          context_freshness_score: 0, // Will be calculated by optimizer
          context_relevance_score: 0, // Will be calculated by optimizer
          context_confidence_score: 0, // Will be calculated by quality assessor
          gathering_errors: [],
          gathering_warnings: [],
          gathering_success_rate: 1.0,
          context_size_bytes: 0, // Will be calculated after contextData is created
          context_compression_ratio: 1.0,
          metadata: {}
        }
      }

      // Update context size after creation
      contextData.metadata.context_size_bytes = JSON.stringify(contextData).length

    return contextData
  }

  private async calculateGatheringMetrics(
    request: ContextGatheringRequest,
    contextData: ContextData,
    startTime: number
  ): Promise<any> {
    const gatheringTime = Date.now() - startTime

    return {
      total_sources_accessed: request.gathering_config.context_sources.length,
      successful_sources: request.gathering_config.context_sources.length, // Simplified for now
      failed_sources: 0,
      success_rate: 1.0,
      average_response_time: gatheringTime / request.gathering_config.context_sources.length,
      total_gathering_time: gatheringTime,
      data_volume_processed: JSON.stringify(contextData).length,
      cache_hit_rate: 0.0, // Would be calculated from actual cache usage
      error_rate: 0.0,
      quality_score: contextData.metadata.context_quality_score,
      completeness_score: contextData.metadata.context_completeness_score,
      freshness_score: contextData.metadata.context_freshness_score,
      relevance_score: contextData.metadata.context_relevance_score,
      confidence_score: contextData.metadata.context_confidence_score,
      performance_metrics: [],
      quality_metrics: [],
      error_metrics: []
    }
  }

  private async generateRecommendations(
    contextData: ContextData,
    qualityAnalysis: ContextQualityAnalysis,
    contextGaps: ContextGap[]
  ): Promise<any[]> {
    const recommendations: any[] = []

    // Generate recommendations based on quality analysis
    if (qualityAnalysis.overall_quality_score < 0.7) {
      recommendations.push({
        recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recommendation_type: 'quality_improvement',
        recommendation_title: 'Improve Context Quality',
        recommendation_description: 'Overall context quality is below threshold',
        recommendation_priority: 'high',
        recommendation_impact: 0.3,
        recommendation_effort: 'medium',
        recommendation_implementation: 'Enhance data collection and validation processes',
        recommendation_metrics: [],
        recommendation_metadata: {}
      })
    }

    // Generate recommendations based on context gaps
    const criticalGaps = contextGaps.filter(g => g.gap_severity === 'critical')
    if (criticalGaps.length > 0) {
      recommendations.push({
        recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recommendation_type: 'gap_resolution',
        recommendation_title: 'Resolve Critical Context Gaps',
        recommendation_description: `${criticalGaps.length} critical context gaps identified`,
        recommendation_priority: 'critical',
        recommendation_impact: 0.5,
        recommendation_effort: 'high',
        recommendation_implementation: 'Address critical data gaps before document generation',
        recommendation_metrics: [],
        recommendation_metadata: {}
      })
    }

    return recommendations
  }

  /**
   * Stage 1: RAG Semantic Retrieval (PRIMARY - 40% weight)
   * Uses semantic search across document chunks as the primary context source
   */
  private async gatherRAGContext(request: ContextGatheringRequest): Promise<any> {
    try {
      const { project_id, template_id, user_id } = request
      
      // Gather semantic context from all RAG-enabled analyzers
      const [projectChunks, templateChunks, documentChunks, userChunks, externalChunks] = await Promise.all([
        this.projectContextAnalyzer.gatherSemanticProjectContext(project_id),
        this.templateContextAnalyzer.gatherSemanticTemplateExamples(template_id, project_id),
        this.documentHistoryAnalyzer.analyzeDocumentHistory(template_id, project_id, user_id), // This now uses RAG internally
        this.userProfileAnalyzer.gatherSemanticUserHistory(user_id, project_id),
        this.externalContextAnalyzer.gatherSemanticExternalContext(project_id) // NEW: External context via RAG
      ])

      const allChunks = [
        ...projectChunks,
        ...templateChunks,
        ...(documentChunks as any).rag_semantic_context || [],
        ...userChunks,
        ...externalChunks // NEW: Include external chunks
      ]

      logger.info('[STAGE-1] RAG context gathered', {
        totalChunks: allChunks.length,
        projectChunks: projectChunks.length,
        templateChunks: templateChunks.length,
        userChunks: userChunks.length,
        externalChunks: externalChunks.length // NEW: Log external chunks
      })

      return {
        rag_chunks: allChunks,
        rag_chunks_count: allChunks.length,
        rag_avg_score: allChunks.length > 0 
          ? allChunks.reduce((sum, c) => sum + (c.relevance_score || 0), 0) / allChunks.length 
          : 0,
        method: 'semantic_search',
        weight: 0.40
      }
    } catch (error: unknown) {
      logger.error('[STAGE-1] RAG context gathering failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return { rag_chunks: [], rag_chunks_count: 0, method: 'semantic_search', weight: 0.40 }
    }
  }

  /**
   * Stage 2: Baseline Context Integration (30% weight)
   * Retrieves approved project baseline for drift-aware generation
   */
  private async gatherBaselineContext(request: ContextGatheringRequest): Promise<any> {
    try {
      const baselineContext = await this.baselineContextAnalyzer.analyzeBaselineContext(request.project_id)
      
      if (baselineContext) {
        logger.info('[STAGE-2] Baseline context gathered', {
          baselineId: baselineContext.baseline_id,
          approvalStatus: baselineContext.approval_status,
          completeness: baselineContext.completeness_score
        })
      } else {
        logger.info('[STAGE-2] No approved baseline found for project')
      }

      return baselineContext || null
    } catch (error: unknown) {
      logger.error('[STAGE-2] Baseline context gathering failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  /**
   * Stage 3: Direct Query Fallback (20% weight)
   * Legacy direct SQL queries as fallback when RAG is insufficient
   */
  private async gatherDirectContext(request: ContextGatheringRequest): Promise<any> {
    try {
      // Use existing direct query methods
      const [projectContext, userContext, templateContext] = await Promise.all([
        this.gatherProjectContext(request),
        this.gatherUserProfileContext(request),
        this.gatherTemplateContext(request)
      ])

      logger.info('[STAGE-3] Direct context gathered (fallback)')

      return {
        project_context: projectContext,
        user_profile_context: userContext,
        template_context: templateContext,
        method: 'direct_sql',
        weight: 0.20
      }
    } catch (error: unknown) {
      logger.error('[STAGE-3] Direct context gathering failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return { method: 'direct_sql', weight: 0.20 }
    }
  }

  /**
   * Stage 4: External Context (10% weight - optional)
   * Third-party integrations and external data sources
   */
  private async gatherExternalContextStage(request: ContextGatheringRequest): Promise<any> {
    try {
      if (!request.gathering_config?.enable_external_source_integration) {
        logger.info('[STAGE-4] External context skipped (disabled)')
        return { method: 'external_apis', weight: 0.10, enabled: false }
      }

      const externalContext = await this.gatherExternalContext(request)

      logger.info('[STAGE-4] External context gathered')

      return {
        external_context: externalContext,
        method: 'external_apis',
        weight: 0.10,
        enabled: true
      }
    } catch (error: unknown) {
      logger.error('[STAGE-4] External context gathering failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return { method: 'external_apis', weight: 0.10, enabled: false }
    }
  }

  /**
   * Stage 4.5: GKG context (template-driven)
   * If template has gkg_context_strategy, fetch semantic units from Neo4j for LLM context.
   */
  private async gatherGKGContext(request: ContextGatheringRequest): Promise<{
    markdown: string
    unitsCount: number
    documentsCount: number
    entityTypes: string[]
  } | null> {
    try {
      if (!request.template_id || !request.project_id) return null
      const strategy = await documentTemplateService.getTemplateGkgStrategy(request.template_id)
      if (!strategy) return null
      const result = await getContextForStrategy(request.project_id, strategy, {
        userId: request.user_id,
      })
      if (result.unitsCount === 0) return null
      logger.info('[STAGE-4.5] GKG context gathered', {
        templateId: request.template_id,
        unitsCount: result.unitsCount,
        entityTypes: result.entityTypes.length,
      })
      return result
    } catch (error: unknown) {
      logger.warn('[STAGE-4.5] GKG context failed (non-fatal)', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Stage 5: Context Optimization & Merging
   * Merge all gathered context, de-duplicate, prioritize, and optimize for token budget
   */
  private async optimizeAndMergeContext(
    stages: {
      rag: any
      baseline: any
      direct: any
      external: any
      gkg?: { markdown: string; unitsCount: number; documentsCount: number; entityTypes: string[] }
    },
    request: ContextGatheringRequest
  ): Promise<ContextData> {
    try {
      logger.info('[STAGE-5] Optimizing and merging context from all stages')

      // Build merged context data
      const contextData: ContextData = {
        project_context: stages.direct?.project_context || {} as any,
        user_profile_context: stages.direct?.user_profile_context || {} as any,
        document_history_context: {
          ...(stages.direct?.document_history_context || {}),
          rag_semantic_context: stages.rag?.rag_chunks || [],
          metadata: {
            rag_chunks_count: stages.rag?.rag_chunks_count || 0,
            rag_avg_score: stages.rag?.rag_avg_score || 0,
            data_sources: ['rag_semantic_search', 'direct_sql'],
            analysis_timestamp: new Date(),
            analysis_duration: 0,
            analysis_confidence: 0.90
          }
        } as any,
        external_context: stages.external?.external_context || {} as any,
        template_context: stages.direct?.template_context || {} as any,
        baseline_context: stages.baseline, // NEW: Baseline integration
        gkg_context: stages.gkg ?? undefined,
        integrated_context: await this.contextIntegrator.integrateContext({
          project_context: stages.direct?.project_context,
          user_profile_context: stages.direct?.user_profile_context,
          document_history_context: stages.direct?.document_history_context,
          external_context: stages.external?.external_context,
          template_context: stages.direct?.template_context,
          baseline_context: stages.baseline,
          integrated_context: {} as any,
          optimized_context: {} as any,
          metadata: {} as any
        }),
        optimized_context: await this.contextOptimizer.optimizeContext({
          project_context: stages.direct?.project_context,
          user_profile_context: stages.direct?.user_profile_context,
          document_history_context: stages.direct?.document_history_context,
          external_context: stages.external?.external_context,
          template_context: stages.direct?.template_context,
          baseline_context: stages.baseline,
          integrated_context: {} as any,
          optimized_context: {} as any,
          metadata: {} as any
        }),
        metadata: {
          gathering_timestamp: new Date(),
          gathering_duration: 0,
          context_sources_used: ['rag_semantic_search', 'baseline', 'direct_sql', 'external_apis'],
          context_quality_score: 0.85,
          context_completeness_score: 0.80,
          context_relevance_score: 0.90,
          context_freshness_score: 0.95,
          rag_enabled: true,
          baseline_enabled: !!stages.baseline,
          context_strategy: 'RAG-first with baseline integration',
          stage_weights: {
            stage_1_rag: 0.40,
            stage_2_baseline: 0.30,
            stage_3_direct: 0.20,
            stage_4_external: 0.10
          }
        } as any
      }

      logger.info('[STAGE-5] Context optimization complete', {
        totalContextSize: JSON.stringify(contextData).length,
        baselineIncluded: !!stages.baseline,
        ragChunks: stages.rag?.rag_chunks_count || 0
      })

      return contextData
    } catch (error: unknown) {
      logger.error('[STAGE-5] Context optimization failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
}
