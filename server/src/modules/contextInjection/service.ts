/**
 * Context Injection Service
 * Core service for managing context injection operations
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import type {
  ContextInjectionRequest,
  ContextInjectionResponse,
  ContextBundle,
  ContextResult,
  ContextSource,
  ContextInjectionConfig,
  ContextInjectionOptions,
  ContextInjectionError
} from './types'
import { BaseContextRetriever } from './retrievers/base'
import { ProjectDataRetriever } from './retrievers/projectData'
import { UserPreferencesRetriever } from './retrievers/userPreferences'
import { DocumentHistoryRetriever } from './retrievers/documentHistory'
import { ExternalApiRetriever } from './retrievers/externalApi'
import { DatabaseQueryRetriever } from './retrievers/databaseQuery'
import { FileContentRetriever } from './retrievers/fileContent'
import { ContextValidator } from './validators/contextValidator'
import { ContextTransformer } from './transformers/contextTransformer'
import { ContextCache } from './cache/contextCache'
import { ContextMetricsCollector } from './metrics/contextMetrics'

export class ContextInjectionService {
  private retrievers: Map<string, BaseContextRetriever> = new Map()
  private validator: ContextValidator
  private transformer: ContextTransformer
  private cache: ContextCache
  private metrics: ContextMetricsCollector
  private options: ContextInjectionOptions

  constructor(options: ContextInjectionOptions = {}) {
    this.options = {
      enable_caching: true,
      cache_ttl_seconds: 300, // 5 minutes
      enable_metrics: true,
      enable_validation: true,
      enable_transformation: true,
      max_retries: 3,
      timeout_ms: 30000, // 30 seconds
      parallel_processing: true,
      ...options
    }

    this.initializeRetrievers()
    this.validator = new ContextValidator()
    this.transformer = new ContextTransformer()
    this.cache = new ContextCache()
    this.metrics = new ContextMetricsCollector()
  }

  private initializeRetrievers(): void {
    this.retrievers.set('project_data', new ProjectDataRetriever())
    this.retrievers.set('user_preferences', new UserPreferencesRetriever())
    this.retrievers.set('document_history', new DocumentHistoryRetriever())
    this.retrievers.set('external_api', new ExternalApiRetriever())
    this.retrievers.set('database_query', new DatabaseQueryRetriever())
    this.retrievers.set('file_content', new FileContentRetriever())
  }

  async injectContext(request: ContextInjectionRequest): Promise<ContextInjectionResponse> {
    const startTime = Date.now()
    const bundleId = uuidv4()

    try {
      logger.info(`Starting context injection for template ${request.template_id}`, {
        bundle_id: bundleId,
        template_id: request.template_id,
        project_id: request.project_id,
        user_id: request.user_id
      })

      // Get template configuration
      const templateConfig = await this.getTemplateConfig(request.template_id)
      if (!templateConfig) {
        throw new Error(`Template not found: ${request.template_id}`)
      }

      // Merge with override configuration
      const config = this.mergeConfig(templateConfig, request.config_override)

      if (!config.enabled) {
        logger.info('Context injection disabled for template', { template_id: request.template_id })
        return {
          success: true,
          bundle: this.createEmptyBundle(bundleId, request, config)
        }
      }

      // Retrieve context from all sources
      const contextResults = await this.retrieveContextFromSources(
        config.sources,
        request
      )

      // Create context bundle
      const bundle: ContextBundle = {
        bundle_id: bundleId,
        template_id: request.template_id,
        project_id: request.project_id,
        user_id: request.user_id,
        results: contextResults,
        metadata: {
          created_at: new Date(),
          total_sources: config.sources.length,
          successful_sources: contextResults.filter(r => !r.errors?.length).length,
          failed_sources: contextResults.filter(r => r.errors?.length).length,
          total_size_bytes: contextResults.reduce((sum, r) => sum + r.metadata.size_bytes, 0),
          processing_time_ms: Date.now() - startTime
        },
        injection_strategy: config.injection_strategy,
        max_context_length: config.max_context_length || 4000
      }

      // Store bundle in database
      await this.storeContextBundle(bundle)

      logger.info('Context injection completed successfully', {
        bundle_id: bundleId,
        successful_sources: bundle.metadata.successful_sources,
        failed_sources: bundle.metadata.failed_sources,
        processing_time_ms: bundle.metadata.processing_time_ms
      })

      return {
        success: true,
        bundle,
        warnings: this.collectWarnings(contextResults)
      }

    } catch (error) {
      logger.error('Context injection failed', {
        bundle_id: bundleId,
        error: error.message,
        stack: error.stack
      })

      return {
        success: false,
        bundle: this.createEmptyBundle(bundleId, request),
        errors: [error.message]
      }
    }
  }

  private async retrieveContextFromSources(
    sources: ContextSource[],
    request: ContextInjectionRequest
  ): Promise<ContextResult[]> {
    const enabledSources = sources.filter(source => source.enabled)
    
    if (this.options.parallel_processing) {
      return await this.retrieveContextParallel(enabledSources, request)
    } else {
      return await this.retrieveContextSequential(enabledSources, request)
    }
  }

  private async retrieveContextParallel(
    sources: ContextSource[],
    request: ContextInjectionRequest
  ): Promise<ContextResult[]> {
    const promises = sources.map(source => this.retrieveContextFromSource(source, request))
    return await Promise.allSettled(promises).then(results =>
      results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return this.createErrorResult(sources[index], result.reason)
        }
      })
    )
  }

  private async retrieveContextSequential(
    sources: ContextSource[],
    request: ContextInjectionRequest
  ): Promise<ContextResult[]> {
    const results: ContextResult[] = []
    
    for (const source of sources) {
      try {
        const result = await this.retrieveContextFromSource(source, request)
        results.push(result)
      } catch (error) {
        results.push(this.createErrorResult(source, error))
      }
    }
    
    return results
  }

  private async retrieveContextFromSource(
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<ContextResult> {
    const startTime = Date.now()

    try {
      // Check cache first
      if (this.options.enable_caching) {
        const cacheKey = this.generateCacheKey(source, request)
        const cachedResult = await this.cache.get(cacheKey)
        if (cachedResult) {
          logger.debug('Retrieved context from cache', { source_id: source.source_id })
          return cachedResult
        }
      }

      // Get appropriate retriever
      const retriever = this.retrievers.get(source.type)
      if (!retriever) {
        throw new Error(`No retriever found for source type: ${source.type}`)
      }

      // Retrieve context
      const result = await retriever.retrieve(source, request)

      // Validate result if enabled
      if (this.options.enable_validation) {
        const isValid = await this.validator.validate(result)
        if (!isValid) {
          result.warnings = result.warnings || []
          result.warnings.push('Context validation failed')
        }
      }

      // Transform result if enabled
      if (this.options.enable_transformation) {
        const transformedResult = await this.transformer.transform(result, 'standard')
        Object.assign(result, transformedResult)
      }

      // Update metadata
      result.metadata.processing_time_ms = Date.now() - startTime

      // Cache result if enabled
      if (this.options.enable_caching) {
        const cacheKey = this.generateCacheKey(source, request)
        await this.cache.set(cacheKey, result, this.options.cache_ttl_seconds)
      }

      // Update metrics if enabled
      if (this.options.enable_metrics) {
        await this.metrics.recordSuccess(source.source_id, Date.now() - startTime)
      }

      return result

    } catch (error) {
      // Update metrics if enabled
      if (this.options.enable_metrics) {
        await this.metrics.recordFailure(source.source_id, error.message)
      }

      throw error
    }
  }

  private createErrorResult(source: ContextSource, error: any): ContextResult {
    return {
      source_id: source.source_id,
      source_name: source.source_name,
      data: null,
      metadata: {
        retrieved_at: new Date(),
        relevance_score: 0,
        freshness_score: 0,
        confidence_score: 0,
        size_bytes: 0
      },
      errors: [error.message || 'Unknown error occurred']
    }
  }

  private createEmptyBundle(
    bundleId: string,
    request: ContextInjectionRequest,
    config?: ContextInjectionConfig
  ): ContextBundle {
    return {
      bundle_id: bundleId,
      template_id: request.template_id,
      project_id: request.project_id,
      user_id: request.user_id,
      results: [],
      metadata: {
        created_at: new Date(),
        total_sources: config?.sources.length || 0,
        successful_sources: 0,
        failed_sources: 0,
        total_size_bytes: 0,
        processing_time_ms: 0
      },
      injection_strategy: config?.injection_strategy || 'prepend',
      max_context_length: config?.max_context_length || 4000
    }
  }

  private async getTemplateConfig(templateId: string): Promise<ContextInjectionConfig | null> {
    try {
      const result = await pool.query(
        'SELECT context_injection_config FROM templates WHERE id = $1 AND deleted_at IS NULL',
        [templateId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0].context_injection_config
    } catch (error) {
      logger.error('Failed to get template config', { template_id: templateId, error: error.message })
      throw error
    }
  }

  private mergeConfig(
    baseConfig: ContextInjectionConfig,
    overrideConfig?: Partial<ContextInjectionConfig>
  ): ContextInjectionConfig {
    if (!overrideConfig) {
      return baseConfig
    }

    return {
      ...baseConfig,
      ...overrideConfig,
      sources: overrideConfig.sources || baseConfig.sources
    }
  }

  private generateCacheKey(source: ContextSource, request: ContextInjectionRequest): string {
    const keyData = {
      source_id: source.source_id,
      template_id: request.template_id,
      project_id: request.project_id,
      user_id: request.user_id,
      parameters: source.parameters
    }
    return `context:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`
  }

  private collectWarnings(results: ContextResult[]): string[] {
    const warnings: string[] = []
    
    results.forEach(result => {
      if (result.warnings) {
        warnings.push(...result.warnings)
      }
    })
    
    return warnings
  }

  private async storeContextBundle(bundle: ContextBundle): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO context_bundles (
          id, template_id, project_id, user_id, results, metadata, 
          injection_strategy, max_context_length, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          bundle.bundle_id,
          bundle.template_id,
          bundle.project_id,
          bundle.user_id,
          JSON.stringify(bundle.results),
          JSON.stringify(bundle.metadata),
          bundle.injection_strategy,
          bundle.max_context_length,
          bundle.metadata.created_at
        ]
      )
    } catch (error) {
      logger.error('Failed to store context bundle', {
        bundle_id: bundle.bundle_id,
        error: error.message
      })
      // Don't throw error - this is not critical for the main flow
    }
  }

  async getContextBundle(bundleId: string): Promise<ContextBundle | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM context_bundles WHERE id = $1',
        [bundleId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        bundle_id: row.id,
        template_id: row.template_id,
        project_id: row.project_id,
        user_id: row.user_id,
        results: row.results,
        metadata: row.metadata,
        injection_strategy: row.injection_strategy,
        max_context_length: row.max_context_length
      }
    } catch (error) {
      logger.error('Failed to get context bundle', { bundle_id: bundleId, error: error.message })
      return null
    }
  }

  async getContextMetrics(sourceId?: string): Promise<any> {
    if (!this.options.enable_metrics) {
      return null
    }

    return await this.metrics.getMetrics(sourceId)
  }
}

export const contextInjectionService = new ContextInjectionService()
