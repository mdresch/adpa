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
import { ContextIntegrator } from './integrators/contextIntegrator'
import { ContextOptimizer } from './optimizers/contextOptimizer'
import { ContextValidator } from './validators/contextValidator'
import { ContextQualityAssessor } from './assessors/contextQualityAssessor'
import type {
  IContextGatheringStage,
  ContextGatheringRequest,
  ContextGatheringResult,
  ContextData,
  ContextQualityAnalysis,
  ContextGap,
  ContextSourcePriority
} from './types'

export class ContextGatheringStage implements IContextGatheringStage {
  private projectContextAnalyzer: ProjectContextAnalyzer
  private userProfileAnalyzer: UserProfileAnalyzer
  private documentHistoryAnalyzer: DocumentHistoryAnalyzer
  private externalContextAnalyzer: ExternalContextAnalyzer
  private templateContextAnalyzer: TemplateContextAnalyzer
  private contextIntegrator: ContextIntegrator
  private contextOptimizer: ContextOptimizer
  private contextValidator: ContextValidator
  private contextQualityAssessor: ContextQualityAssessor

  constructor() {
    this.projectContextAnalyzer = new ProjectContextAnalyzer()
    this.userProfileAnalyzer = new UserProfileAnalyzer()
    this.documentHistoryAnalyzer = new DocumentHistoryAnalyzer()
    this.externalContextAnalyzer = new ExternalContextAnalyzer()
    this.templateContextAnalyzer = new TemplateContextAnalyzer()
    this.contextIntegrator = new ContextIntegrator()
    this.contextOptimizer = new ContextOptimizer()
    this.contextValidator = new ContextValidator()
    this.contextQualityAssessor = new ContextQualityAssessor()
  }

  async execute(request: ContextGatheringRequest): Promise<ContextGatheringResult> {
    try {
      logger.info('Starting context gathering stage', {
        requestId: request.request_id,
        templateId: request.template_id,
        projectId: request.project_id,
        userId: request.user_id
      })

      const startTime = Date.now()

      // Gather context from all sources
      const contextData = await this.gatherAllContext(request)

      // Analyze context quality
      const qualityAnalysis = await this.analyzeContextQuality(contextData)

      // Identify context gaps
      const contextGaps = await this.identifyContextGaps(contextData)

      // Prioritize context sources
      const sourcePriorities = await this.prioritizeContextSources(contextData)

      // Calculate gathering metrics
      const gatheringMetrics = await this.calculateGatheringMetrics(request, contextData, startTime)

      // Generate recommendations
      const recommendations = await this.generateRecommendations(contextData, qualityAnalysis, contextGaps)

      const result: ContextGatheringResult = {
        result_id: `context_gathering_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request_id: request.request_id,
        context_data: contextData,
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
          document_type: request.document_type
        }
      }

      logger.info('Context gathering stage completed successfully', {
        requestId: request.request_id,
        gatheringTime: Date.now() - startTime,
        contextQuality: qualityAnalysis.overall_quality_score,
        contextGaps: contextGaps.length,
        recommendations: recommendations.length
      })

      return result

    } catch (error) {
      logger.error('Context gathering stage failed', {
        requestId: request.request_id,
        error: error.message
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
}
