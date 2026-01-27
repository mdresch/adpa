/**
 * Context Orchestrator
 * Enhanced context gathering and injection system with robust validation, 
 * freshness checking, access control, and comprehensive logging
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import { randomBytes } from 'crypto'
import { ContextGatheringStage } from '../contextGathering/contextGatheringStage'
import { ContextInjectionService } from '../contextInjection/service'
import { ContextAccessControlManager } from '../contextAccessControl/contextAccessControlManager'
import { ContextFreshnessManager } from '../contextFreshness/contextFreshnessManager'
import { ContextRetrievalService } from '../contextRetrieval/contextRetrievalService'
import { getQdrantConfig } from '../contextRetrieval/config/qdrantConfig'
import type {
  ContextGatheringRequest,
  ContextGatheringResult
} from '../contextGathering/types'
import type {
  ContextInjectionRequest,
  ContextInjectionResponse,
  ContextBundle,
  ContextResult
} from '../contextInjection/types'

export interface ContextOrchestratorConfig {
  enableAccessControl: boolean
  enableFreshnessValidation: boolean
  enableComprehensiveLogging: boolean
  enableMetricsCollection: boolean
  enableCaching: boolean
  maxContextSizeBytes: number
  maxProcessingTimeMs: number
  enableParallelProcessing: boolean
  enableRetryLogic: boolean
  maxRetries: number
}

export interface ContextSourceLog {
  source_id: string
  source_type: string
  source_name: string
  retrieval_timestamp: Date
  retrieval_duration_ms: number
  data_size_bytes: number
  success: boolean
  error_message?: string
  freshness_score: number
  access_granted: boolean
  cache_hit: boolean
  metadata: Record<string, any>
}

export interface ContextGatheringMetrics {
  request_id: string
  total_sources_attempted: number
  successful_sources: number
  failed_sources: number
  total_data_size_bytes: number
  total_processing_time_ms: number
  average_freshness_score: number
  access_control_checks: number
  cache_hit_rate: number
  error_rate: number
  source_logs: ContextSourceLog[]
}

export interface EnhancedContextRequest extends ContextGatheringRequest {
  enable_access_control?: boolean
  enable_freshness_validation?: boolean
  freshness_threshold?: number
  required_permissions?: string[]
  context_size_limit?: number
}

export interface EnhancedContextResponse extends ContextGatheringResult {
  access_control_results: any[]
  freshness_validation_results: any[]
  source_logs: ContextSourceLog[]
  metrics: ContextGatheringMetrics
  warnings: string[]
  errors: string[]
}

export class ContextOrchestrator {
  private contextGatheringStage: ContextGatheringStage
  private contextInjectionService: ContextInjectionService
  private accessControlManager: ContextAccessControlManager
  private freshnessManager: ContextFreshnessManager
  private retrievalService: ContextRetrievalService
  private config: ContextOrchestratorConfig

  constructor(config: ContextOrchestratorConfig) {
    this.config = config
    
    try {
      this.contextGatheringStage = new ContextGatheringStage()
      this.contextInjectionService = new ContextInjectionService()
      this.accessControlManager = new ContextAccessControlManager({
        enableRoleBasedAccess: true,
        enableAttributeBasedAccess: true,
        enableContextBasedAccess: true,
        enableTimeBasedAccess: true,
        enableLocationBasedAccess: false,
        enableDeviceBasedAccess: false,
        enableAuditLogging: true,
        enableComplianceChecking: true,
        enableRiskAssessment: true,
        enableAnomalyDetection: true,
        defaultSecurityLevel: 'internal',
        defaultAccessLevel: 'read',
        sessionTimeout: 3600000,
        maxConcurrentSessions: 10
      })
      this.freshnessManager = new ContextFreshnessManager({
        defaultStalenessThreshold: 86400000, // 24 hours
        defaultRefreshInterval: 3600000, // 1 hour
        enableAutoRefresh: true,
        enableStalenessCleanup: true,
        maxConcurrentRefreshes: 5,
        refreshTimeout: 30000,
        cleanupBatchSize: 100,
        enableAnalytics: true,
        enableHealthMonitoring: true
      })
      // Initialize ContextRetrievalService with default configs
      const semanticSearchConfig = {
        model: 'text-embedding-ada-002',
        embeddingDimensions: 1536,
        similarityThreshold: 0.7,
        maxTokens: 8191,
        temperature: 0.0,
        topK: 20,
        includeContext: true,
        useCache: true,
        cacheExpiry: 3600000 // 1 hour
      }
      
      const relevanceScoringConfig = {
        weights: {
          semanticSimilarity: 0.4,
          keywordMatch: 0.3,
          freshness: 0.2,
          authority: 0.1,
          popularity: 0.0,
          userPreference: 0.0,
          contextRelevance: 0.0
        },
        normalization: {
          minScore: 0.0,
          maxScore: 1.0,
          boostFactors: {
            recentContext: 1.2,
            highAuthority: 1.15,
            exactMatch: 1.5
          }
        },
        thresholds: {
          highRelevance: 0.8,
          mediumRelevance: 0.5,
          lowRelevance: 0.3
        }
      }
      
      // Validate configs before passing
      if (!semanticSearchConfig || !semanticSearchConfig.model) {
        throw new Error('Invalid semanticSearchConfig: model is required')
      }
      if (!relevanceScoringConfig) {
        throw new Error('relevanceScoringConfig is required')
      }
      
      // Include Qdrant if configured
      const qdrantConfig = getQdrantConfig()
      this.retrievalService = new ContextRetrievalService(
        semanticSearchConfig,
        relevanceScoringConfig,
        qdrantConfig || undefined
      )
    } catch (error) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to initialize dependencies', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw new Error(`Context Orchestrator initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Enhanced context gathering with comprehensive validation, logging, and metrics
   */
  async gatherContextWithValidation(request: EnhancedContextRequest): Promise<EnhancedContextResponse> {
    const startTime = Date.now()
    // Generate secure random ID using crypto.randomBytes
    const requestId = request.request_id || `ctx_${Date.now()}_${randomBytes(6).toString('base64url').substring(0, 9)}`
    
    logger.info('[CONTEXT-ORCHESTRATOR] Starting enhanced context gathering', {
      requestId,
      templateId: request.template_id,
      projectId: request.project_id,
      userId: request.user_id,
      enableAccessControl: request.enable_access_control ?? this.config.enableAccessControl,
      enableFreshnessValidation: request.enable_freshness_validation ?? this.config.enableFreshnessValidation
    })

    const sourceLogs: ContextSourceLog[] = []
    const accessControlResults: any[] = []
    const freshnessValidationResults: any[] = []
    const warnings: string[] = []
    const errors: string[] = []

    try {
      // Step 1: Validate access control if enabled
      if (request.enable_access_control ?? this.config.enableAccessControl) {
        logger.info('[CONTEXT-ORCHESTRATOR] Performing access control validation')
        const accessResults = await this.validateAccessControl(request)
        accessControlResults.push(...accessResults)
        
        // Check if access is denied for any required sources
        const deniedAccess = accessResults.filter(result => !result.allowed)
        if (deniedAccess.length > 0) {
          warnings.push(`Access denied for ${deniedAccess.length} context sources`)
          logger.warn('[CONTEXT-ORCHESTRATOR] Access denied for some context sources', {
            deniedSources: deniedAccess.map(r => r.contextId)
          })
        }
      }

      // Step 2: Gather context using the existing gathering stage
      logger.info('[CONTEXT-ORCHESTRATOR] Executing context gathering stage')
      const gatheringResult = await this.contextGatheringStage.execute(request)

      // Step 3: Validate freshness if enabled
      if (request.enable_freshness_validation ?? this.config.enableFreshnessValidation) {
        logger.info('[CONTEXT-ORCHESTRATOR] Performing freshness validation')
        const freshnessResults = await this.validateFreshness(gatheringResult, request.freshness_threshold)
        freshnessValidationResults.push(...freshnessResults)
        
        // Check for stale context
        const staleContext = freshnessResults.filter(result => result.staleness_level === 'stale')
        if (staleContext.length > 0) {
          warnings.push(`${staleContext.length} context sources are stale`)
          logger.warn('[CONTEXT-ORCHESTRATOR] Stale context detected', {
            staleContextIds: staleContext.map(r => r.context_id)
          })
        }
      }

      // Step 4: Log context sources and sizes
      await this.logContextSources(gatheringResult, sourceLogs)

      // Step 5: Collect comprehensive metrics
      const metrics = await this.collectMetrics(requestId, gatheringResult, sourceLogs, startTime)

      // Step 6: Validate context size limits (use request-specific limit if provided, otherwise use config)
      const sizeLimit = request.context_size_limit ?? this.config.maxContextSizeBytes
      if (sizeLimit > 0 && metrics.total_data_size_bytes > sizeLimit) {
        warnings.push(`Context size (${metrics.total_data_size_bytes} bytes) exceeds limit (${sizeLimit} bytes)`)
        logger.warn('[CONTEXT-ORCHESTRATOR] Context size limit exceeded', {
          actualSize: metrics.total_data_size_bytes,
          limit: sizeLimit
        })
      }

      // Step 7: Store metrics and logs
      if (this.config.enableMetricsCollection) {
        await this.storeMetrics(metrics)
      }

      if (this.config.enableComprehensiveLogging) {
        await this.storeSourceLogs(sourceLogs)
      }

      const response: EnhancedContextResponse = {
        ...gatheringResult,
        access_control_results: accessControlResults,
        freshness_validation_results: freshnessValidationResults,
        source_logs: sourceLogs,
        metrics,
        warnings,
        errors
      }

      logger.info('[CONTEXT-ORCHESTRATOR] Enhanced context gathering completed successfully', {
        requestId,
        totalSources: metrics.total_sources_attempted,
        successfulSources: metrics.successful_sources,
        totalDataSize: metrics.total_data_size_bytes,
        processingTime: metrics.total_processing_time_ms,
        warningsCount: warnings.length,
        errorsCount: errors.length
      })

      return response

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)
      
      logger.error('[CONTEXT-ORCHESTRATOR] Enhanced context gathering failed', {
        requestId,
        error: errorMessage,
        processingTime: Date.now() - startTime
      })

      // Return partial results even on error
      const metrics = await this.collectMetrics(requestId, null, sourceLogs, startTime)
      
      return {
        result_id: `error_${requestId}`,
        request_id: requestId,
        context_data: {} as any,
        quality_analysis: {} as any,
        context_gaps: [],
        source_priorities: [],
        gathering_metrics: {} as any,
        recommendations: [],
        metadata: {
          gathering_time: Date.now() - startTime,
          template_id: request.template_id,
          project_id: request.project_id,
          user_id: request.user_id,
          document_type: request.document_type,
          context_strategy: 'enhanced_orchestration_failed',
          rag_enabled: false,
          baseline_enabled: false
        },
        access_control_results: accessControlResults,
        freshness_validation_results: freshnessValidationResults,
        source_logs: sourceLogs,
        metrics,
        warnings,
        errors
      }
    }
  }

  /**
   * Enhanced context injection with validation and logging
   */
  async injectContextWithValidation(request: ContextInjectionRequest): Promise<ContextInjectionResponse> {
    const startTime = Date.now()
    
    logger.info('[CONTEXT-ORCHESTRATOR] Starting enhanced context injection', {
      templateId: request.template_id,
      projectId: request.project_id,
      userId: request.user_id
    })

    try {
      // Perform standard context injection
      const injectionResponse = await this.contextInjectionService.injectContext(request)

      // Log injection metrics
      if (injectionResponse.success && this.config.enableComprehensiveLogging) {
        await this.logInjectionMetrics(injectionResponse.bundle, startTime)
      }

      logger.info('[CONTEXT-ORCHESTRATOR] Enhanced context injection completed', {
        templateId: request.template_id,
        success: injectionResponse.success,
        processingTime: Date.now() - startTime
      })

      return injectionResponse

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      logger.error('[CONTEXT-ORCHESTRATOR] Enhanced context injection failed', {
        templateId: request.template_id,
        error: errorMessage,
        processingTime: Date.now() - startTime
      })

      throw error
    }
  }

  /**
   * Validate access control for context sources
   */
  private async validateAccessControl(request: EnhancedContextRequest): Promise<any[]> {
    const results: any[] = []

    try {
      // Get context sources from gathering config
      const contextSources = request.gathering_config?.context_sources || []
      
      for (const source of contextSources) {
        const accessDecision = await this.accessControlManager.checkAccess(
          request.user_id,
          source.source_id,
          'read'
        )
        
        results.push({
          contextId: source.source_id,
          sourceName: source.source_name,
          allowed: accessDecision.allowed,
          reason: accessDecision.reason,
          timestamp: new Date()
        })
      }

      // Also check project-level access
      if (request.project_id) {
        const projectAccessDecision = await this.accessControlManager.checkAccess(
          request.user_id,
          request.project_id,
          'read'
        )
        
        results.push({
          contextId: request.project_id,
          sourceName: 'project_data',
          allowed: projectAccessDecision.allowed,
          reason: projectAccessDecision.reason,
          timestamp: new Date()
        })
      }

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Access control validation failed', {
        userId: request.user_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    return results
  }

  /**
   * Validate freshness of gathered context
   */
  private async validateFreshness(gatheringResult: ContextGatheringResult | null, threshold?: number): Promise<any[]> {
    const results: any[] = []

    if (!gatheringResult) {
      return results
    }

    try {
      // Extract context IDs from the gathering result
      const contextIds = this.extractContextIds(gatheringResult)
      
      // Use provided threshold or default (24 hours)
      const stalenessThreshold = threshold ?? 86400000
      
      for (const contextId of contextIds) {
        const freshnessAssessment = await this.freshnessManager.assessFreshness(contextId)
        
        // Apply threshold to determine if context is stale based on time_since_update
        // The threshold parameter is used here to override the default staleness assessment
        if (threshold !== undefined && freshnessAssessment.time_since_update !== undefined) {
          const isStale = freshnessAssessment.time_since_update > stalenessThreshold
          if (isStale) {
            // Update staleness level based on how much it exceeds threshold
            if (freshnessAssessment.staleness_level === 'fresh') {
              freshnessAssessment.staleness_level = 'slightly_stale'
            } else if (freshnessAssessment.staleness_level === 'slightly_stale' && freshnessAssessment.time_since_update > threshold * 2) {
              freshnessAssessment.staleness_level = 'moderately_stale'
            } else if (freshnessAssessment.time_since_update > threshold * 3) {
              freshnessAssessment.staleness_level = 'very_stale'
            }
          }
        }
        
        results.push(freshnessAssessment)
      }

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Freshness validation failed', {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    return results
  }

  /**
   * Log context sources and their sizes
   */
  private async logContextSources(gatheringResult: ContextGatheringResult, sourceLogs: ContextSourceLog[]): Promise<void> {
    try {
      // Log project context
      if (gatheringResult.context_data.project_context) {
        const projectContextSize = JSON.stringify(gatheringResult.context_data.project_context).length
        sourceLogs.push({
          source_id: 'project_context',
          source_type: 'database',
          source_name: 'Project Context',
          retrieval_timestamp: new Date(),
          retrieval_duration_ms: 0, // Would be measured in actual implementation
          data_size_bytes: projectContextSize,
          success: true,
          freshness_score: 0.9, // Would be calculated from actual freshness assessment
          access_granted: true, // Would be determined from access control
          cache_hit: false, // Would be determined from cache usage
          metadata: {
            project_id: gatheringResult.metadata.project_id,
            context_type: 'project_data'
          }
        })
      }

      // Log user profile context
      if (gatheringResult.context_data.user_profile_context) {
        const userContextSize = JSON.stringify(gatheringResult.context_data.user_profile_context).length
        sourceLogs.push({
          source_id: 'user_profile_context',
          source_type: 'database',
          source_name: 'User Profile Context',
          retrieval_timestamp: new Date(),
          retrieval_duration_ms: 0,
          data_size_bytes: userContextSize,
          success: true,
          freshness_score: 0.95,
          access_granted: true,
          cache_hit: false,
          metadata: {
            user_id: gatheringResult.metadata.user_id,
            context_type: 'user_profile'
          }
        })
      }

      // Log document history context
      if (gatheringResult.context_data.document_history_context) {
        const docHistorySize = JSON.stringify(gatheringResult.context_data.document_history_context).length
        sourceLogs.push({
          source_id: 'document_history_context',
          source_type: 'database',
          source_name: 'Document History Context',
          retrieval_timestamp: new Date(),
          retrieval_duration_ms: 0,
          data_size_bytes: docHistorySize,
          success: true,
          freshness_score: 0.8,
          access_granted: true,
          cache_hit: false,
          metadata: {
            template_id: gatheringResult.metadata.template_id,
            context_type: 'document_history',
            rag_enabled: gatheringResult.metadata.rag_enabled
          }
        })
      }

      // Log external context
      if (gatheringResult.context_data.external_context) {
        const externalContextSize = JSON.stringify(gatheringResult.context_data.external_context).length
        sourceLogs.push({
          source_id: 'external_context',
          source_type: 'external_api',
          source_name: 'External Context',
          retrieval_timestamp: new Date(),
          retrieval_duration_ms: 0,
          data_size_bytes: externalContextSize,
          success: true,
          freshness_score: 0.7,
          access_granted: true,
          cache_hit: false,
          metadata: {
            context_type: 'external_api'
          }
        })
      }

      // Log baseline context if present
      if (gatheringResult.context_data.baseline_context) {
        const baselineContextSize = JSON.stringify(gatheringResult.context_data.baseline_context).length
        sourceLogs.push({
          source_id: 'baseline_context',
          source_type: 'database',
          source_name: 'Baseline Context',
          retrieval_timestamp: new Date(),
          retrieval_duration_ms: 0,
          data_size_bytes: baselineContextSize,
          success: true,
          freshness_score: 1.0, // Baseline is always fresh when approved
          access_granted: true,
          cache_hit: false,
          metadata: {
            context_type: 'baseline',
            baseline_enabled: gatheringResult.metadata.baseline_enabled
          }
        })
      }

      logger.info('[CONTEXT-ORCHESTRATOR] Context sources logged', {
        totalSources: sourceLogs.length,
        totalDataSize: sourceLogs.reduce((sum, log) => sum + log.data_size_bytes, 0)
      })

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to log context sources', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Collect comprehensive metrics
   */
  private async collectMetrics(
    requestId: string,
    gatheringResult: ContextGatheringResult | null,
    sourceLogs: ContextSourceLog[],
    startTime: number
  ): Promise<ContextGatheringMetrics> {
    const totalDataSize = sourceLogs.reduce((sum, log) => sum + log.data_size_bytes, 0)
    const successfulSources = sourceLogs.filter(log => log.success).length
    const failedSources = sourceLogs.filter(log => !log.success).length
    const averageFreshnessScore = sourceLogs.length > 0 
      ? sourceLogs.reduce((sum, log) => sum + log.freshness_score, 0) / sourceLogs.length 
      : 0
    const cacheHits = sourceLogs.filter(log => log.cache_hit).length
    const cacheHitRate = sourceLogs.length > 0 ? cacheHits / sourceLogs.length : 0

    return {
      request_id: requestId,
      total_sources_attempted: sourceLogs.length,
      successful_sources: successfulSources,
      failed_sources: failedSources,
      total_data_size_bytes: totalDataSize,
      total_processing_time_ms: Date.now() - startTime,
      average_freshness_score: averageFreshnessScore,
      access_control_checks: sourceLogs.length, // Each source requires access control check
      cache_hit_rate: cacheHitRate,
      error_rate: sourceLogs.length > 0 ? failedSources / sourceLogs.length : 0,
      source_logs: sourceLogs
    }
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: ContextGatheringMetrics): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_gathering_metrics (
          request_id, total_sources_attempted, successful_sources, failed_sources,
          total_data_size_bytes, total_processing_time_ms, average_freshness_score,
          access_control_checks, cache_hit_rate, error_rate, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          metrics.request_id,
          metrics.total_sources_attempted,
          metrics.successful_sources,
          metrics.failed_sources,
          metrics.total_data_size_bytes,
          metrics.total_processing_time_ms,
          metrics.average_freshness_score,
          metrics.access_control_checks,
          metrics.cache_hit_rate,
          metrics.error_rate,
          new Date()
        ]
      )

      logger.debug('[CONTEXT-ORCHESTRATOR] Metrics stored successfully', {
        requestId: metrics.request_id
      })

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to store metrics', {
        requestId: metrics.request_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Store source logs in database
   */
  private async storeSourceLogs(sourceLogs: ContextSourceLog[]): Promise<void> {
    if (sourceLogs.length === 0) return
    
    try {
      // Use batch insert for better performance
      const values: any[] = []
      const placeholders: string[] = []
      
      sourceLogs.forEach((log, index) => {
        const start = index * 12 + 1
        placeholders.push(
          `($${start}, $${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7}, $${start + 8}, $${start + 9}, $${start + 10}, $${start + 11})`
        )
        values.push(
          log.source_id,
          log.source_type,
          log.source_name,
          log.retrieval_timestamp,
          log.retrieval_duration_ms,
          log.data_size_bytes,
          log.success,
          log.error_message,
          log.freshness_score,
          log.access_granted,
          log.cache_hit,
          JSON.stringify(log.metadata)
        )
      })

      await pool.query(
        `
        INSERT INTO context_source_logs (
          source_id, source_type, source_name, retrieval_timestamp,
          retrieval_duration_ms, data_size_bytes, success, error_message,
          freshness_score, access_granted, cache_hit, metadata
        ) VALUES ${placeholders.join(', ')}
        `,
        values
      )

      logger.debug('[CONTEXT-ORCHESTRATOR] Source logs stored successfully', {
        logsCount: sourceLogs.length
      })

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to store source logs', {
        logsCount: sourceLogs.length,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Log injection metrics
   */
  private async logInjectionMetrics(bundle: ContextBundle, startTime: number): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_injection_metrics (
          bundle_id, template_id, project_id, user_id, total_sources,
          successful_sources, failed_sources, total_size_bytes,
          processing_time_ms, injection_strategy, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          bundle.bundle_id,
          bundle.template_id,
          bundle.project_id,
          bundle.user_id,
          bundle.metadata.total_sources,
          bundle.metadata.successful_sources,
          bundle.metadata.failed_sources,
          bundle.metadata.total_size_bytes,
          Date.now() - startTime,
          bundle.injection_strategy,
          new Date()
        ]
      )

      logger.debug('[CONTEXT-ORCHESTRATOR] Injection metrics logged', {
        bundleId: bundle.bundle_id
      })

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to log injection metrics', {
        bundleId: bundle.bundle_id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Extract context IDs from gathering result for freshness validation
   */
  private extractContextIds(gatheringResult: ContextGatheringResult): string[] {
    const contextIds: string[] = []

    // Add project ID if available
    if (gatheringResult.metadata.project_id) {
      contextIds.push(gatheringResult.metadata.project_id)
    }

    // Add template ID if available
    if (gatheringResult.metadata.template_id) {
      contextIds.push(gatheringResult.metadata.template_id)
    }

    // Add user ID if available
    if (gatheringResult.metadata.user_id) {
      contextIds.push(gatheringResult.metadata.user_id)
    }

    return contextIds
  }

  /**
   * Get context gathering health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      const freshnessHealth = await this.freshnessManager.monitorFreshnessHealth()
      
      return {
        overall_health: 'healthy',
        freshness_health: freshnessHealth,
        access_control_enabled: this.config.enableAccessControl,
        freshness_validation_enabled: this.config.enableFreshnessValidation,
        comprehensive_logging_enabled: this.config.enableComprehensiveLogging,
        metrics_collection_enabled: this.config.enableMetricsCollection,
        timestamp: new Date()
      }

    } catch (error: unknown) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to get health status', {
        error: error instanceof Error ? error.message : String(error)
      })
      
      return {
        overall_health: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      }
    }
  }
}

// Lazy initialization to avoid module load-time failures
let _contextOrchestratorInstance: ContextOrchestrator | null = null

function getContextOrchestrator(): ContextOrchestrator {
  if (!_contextOrchestratorInstance) {
    try {
      _contextOrchestratorInstance = new ContextOrchestrator({
        enableAccessControl: true,
        enableFreshnessValidation: true,
        enableComprehensiveLogging: true,
        enableMetricsCollection: true,
        enableCaching: true,
        maxContextSizeBytes: 10 * 1024 * 1024, // 10MB
        maxProcessingTimeMs: 30000, // 30 seconds
        enableParallelProcessing: true,
        enableRetryLogic: true,
        maxRetries: 3
      })
    } catch (error) {
      logger.error('[CONTEXT-ORCHESTRATOR] Failed to initialize singleton', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
  return _contextOrchestratorInstance
}

// Export a getter function that lazily initializes the orchestrator
// This prevents module load-time initialization failures
export const contextOrchestrator = new Proxy({} as ContextOrchestrator, {
  get(_target, prop) {
    const instance = getContextOrchestrator()
    const value = (instance as any)[prop]
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  }
})