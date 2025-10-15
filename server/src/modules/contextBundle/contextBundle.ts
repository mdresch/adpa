/**
 * Context Bundle Class
 * Aggregates and organizes context from multiple sources
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import { ContextAggregator } from './services/contextAggregator'
import { ContextOrganizer } from './services/contextOrganizer'
import { ContextValidator } from './services/contextValidator'
import { ContextOptimizer } from './services/contextOptimizer'
import type {
  ContextBundle,
  ContextBundleConfig,
  ContextSource,
  AggregatedContext,
  OrganizationStrategy,
  PrioritizationStrategy,
  DeduplicationStrategy,
  ContextBundleType,
  ContextPriority,
  ContextFreshness,
  ContextMetadata,
  ProcessedContext,
  ValidationResult,
  OptimizationResult,
  BundleFilters,
  ContextFilters
} from './types'

export class ContextBundleService {
  private contextAggregator: ContextAggregator
  private contextOrganizer: ContextOrganizer
  private contextValidator: ContextValidator
  private contextOptimizer: ContextOptimizer

  constructor() {
    this.contextAggregator = new ContextAggregator()
    this.contextOrganizer = new ContextOrganizer()
    this.contextValidator = new ContextValidator()
    this.contextOptimizer = new ContextOptimizer()
  }

  async createBundle(config: ContextBundleConfig): Promise<ContextBundle> {
    try {
      logger.info('Creating context bundle', { 
        name: config.name, 
        bundleType: config.bundle_type,
        sourcesCount: config.sources.length 
      })

      // Generate unique ID
      const bundleId = this.generateBundleId()
      
      // Create initial bundle structure
      const bundle: ContextBundle = {
        id: bundleId,
        name: config.name,
        description: config.description,
        bundle_type: config.bundle_type,
        sources: [],
        aggregated_context: this.createEmptyAggregatedContext(),
        organization_strategy: config.organization_strategy,
        priority: config.priority,
        freshness: config.freshness,
        metadata: config.metadata,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: config.expires_at
      }

      // Store bundle in database
      await this.storeBundle(bundle)

      // Process sources and aggregate context
      const processedBundle = await this.processBundleSources(bundle, config.sources)

      logger.info('Context bundle created successfully', {
        bundleId: bundle.id,
        name: bundle.name,
        sourcesCount: processedBundle.sources.length
      })

      return processedBundle

    } catch (error) {
      logger.error('Failed to create context bundle', {
        name: config.name,
        bundleType: config.bundle_type,
        error: error.message
      })
      throw error
    }
  }

  async updateBundle(bundleId: string, updates: Partial<ContextBundle>): Promise<ContextBundle> {
    try {
      logger.info('Updating context bundle', { bundleId })

      // Get existing bundle
      const existingBundle = await this.getBundle(bundleId)
      if (!existingBundle) {
        throw new Error(`Context bundle not found: ${bundleId}`)
      }

      // Merge updates
      const updatedBundle: ContextBundle = {
        ...existingBundle,
        ...updates,
        updated_at: new Date()
      }

      // Update in database
      await this.updateBundleInDatabase(updatedBundle)

      // If sources were updated, reprocess the bundle
      if (updates.sources) {
        const reprocessedBundle = await this.reprocessBundle(updatedBundle)
        return reprocessedBundle
      }

      logger.info('Context bundle updated successfully', { bundleId })

      return updatedBundle

    } catch (error) {
      logger.error('Failed to update context bundle', {
        bundleId,
        error: error.message
      })
      throw error
    }
  }

  async deleteBundle(bundleId: string): Promise<void> {
    try {
      logger.info('Deleting context bundle', { bundleId })

      // Delete from database
      await pool.query(
        'DELETE FROM context_bundles WHERE id = $1',
        [bundleId]
      )

      logger.info('Context bundle deleted successfully', { bundleId })

    } catch (error) {
      logger.error('Failed to delete context bundle', {
        bundleId,
        error: error.message
      })
      throw error
    }
  }

  async getBundle(bundleId: string): Promise<ContextBundle | null> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM context_bundles 
        WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())
        `,
        [bundleId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const bundleData = result.rows[0]
      return this.deserializeBundle(bundleData)

    } catch (error) {
      logger.error('Failed to get context bundle', {
        bundleId,
        error: error.message
      })
      return null
    }
  }

  async listBundles(filters?: BundleFilters): Promise<ContextBundle[]> {
    try {
      let sql = `
        SELECT * FROM context_bundles 
        WHERE (expires_at IS NULL OR expires_at > NOW())
      `
      const params: any[] = []
      let paramIndex = 1

      // Apply filters
      if (filters) {
        if (filters.bundle_type) {
          sql += ` AND bundle_type = $${paramIndex}`
          params.push(filters.bundle_type)
          paramIndex++
        }

        if (filters.priority) {
          sql += ` AND priority = $${paramIndex}`
          params.push(filters.priority)
          paramIndex++
        }

        if (filters.created_by) {
          sql += ` AND created_by = $${paramIndex}`
          params.push(filters.created_by)
          paramIndex++
        }

        if (filters.created_after) {
          sql += ` AND created_at >= $${paramIndex}`
          params.push(filters.created_after)
          paramIndex++
        }

        if (filters.created_before) {
          sql += ` AND created_at <= $${paramIndex}`
          params.push(filters.created_before)
          paramIndex++
        }

        if (filters.tags && filters.tags.length > 0) {
          sql += ` AND tags && $${paramIndex}`
          params.push(filters.tags)
          paramIndex++
        }

        if (filters.framework) {
          sql += ` AND framework = $${paramIndex}`
          params.push(filters.framework)
          paramIndex++
        }
      }

      sql += ` ORDER BY created_at DESC`

      const result = await pool.query(sql, params)

      return result.rows.map(row => this.deserializeBundle(row))

    } catch (error) {
      logger.error('Failed to list context bundles', {
        filters,
        error: error.message
      })
      return []
    }
  }

  async aggregateContext(sources: ContextSource[]): Promise<AggregatedContext> {
    try {
      logger.debug('Aggregating context from sources', { sourcesCount: sources.length })

      const aggregatedContext = await this.contextAggregator.aggregate(sources)

      logger.info('Context aggregation completed', {
        sourcesCount: sources.length,
        aggregatedDataSize: this.calculateContextSize(aggregatedContext)
      })

      return aggregatedContext

    } catch (error) {
      logger.error('Failed to aggregate context', {
        sourcesCount: sources.length,
        error: error.message
      })
      throw error
    }
  }

  async organizeContext(context: AggregatedContext, strategy: OrganizationStrategy): Promise<AggregatedContext> {
    try {
      logger.debug('Organizing context with strategy', { strategyType: strategy.strategy_type })

      const organizedContext = await this.contextOrganizer.organize(context, strategy)

      logger.info('Context organization completed', {
        strategyType: strategy.strategy_type,
        organizedDataSize: this.calculateContextSize(organizedContext)
      })

      return organizedContext

    } catch (error) {
      logger.error('Failed to organize context', {
        strategyType: strategy.strategy_type,
        error: error.message
      })
      throw error
    }
  }

  async prioritizeContext(context: AggregatedContext, strategy: PrioritizationStrategy): Promise<AggregatedContext> {
    try {
      logger.debug('Prioritizing context with strategy', { strategyMethod: strategy.method })

      const prioritizedContext = await this.contextOrganizer.prioritize(context, strategy)

      logger.info('Context prioritization completed', {
        strategyMethod: strategy.method
      })

      return prioritizedContext

    } catch (error) {
      logger.error('Failed to prioritize context', {
        strategyMethod: strategy.method,
        error: error.message
      })
      throw error
    }
  }

  async deduplicateContext(context: AggregatedContext, strategy: DeduplicationStrategy): Promise<AggregatedContext> {
    try {
      logger.debug('Deduplicating context with strategy', { strategyMethod: strategy.method })

      const deduplicatedContext = await this.contextOrganizer.deduplicate(context, strategy)

      logger.info('Context deduplication completed', {
        strategyMethod: strategy.method,
        deduplicatedDataSize: this.calculateContextSize(deduplicatedContext)
      })

      return deduplicatedContext

    } catch (error) {
      logger.error('Failed to deduplicate context', {
        strategyMethod: strategy.method,
        error: error.message
      })
      throw error
    }
  }

  async processContext(bundleId: string): Promise<ProcessedContext> {
    try {
      logger.info('Processing context bundle', { bundleId })

      const startTime = Date.now()

      // Get bundle
      const bundle = await this.getBundle(bundleId)
      if (!bundle) {
        throw new Error(`Context bundle not found: ${bundleId}`)
      }

      // Aggregate context from sources
      const aggregatedContext = await this.aggregateContext(bundle.sources)

      // Organize context
      const organizedContext = await this.organizeContext(aggregatedContext, bundle.organization_strategy)

      // Update bundle with processed context
      const updatedBundle = await this.updateBundle(bundleId, {
        aggregated_context: organizedContext
      })

      const processingTime = Date.now() - startTime

      const processedContext: ProcessedContext = {
        bundle_id: bundleId,
        processed_at: new Date(),
        processing_time: processingTime,
        context_size: this.calculateContextSize(organizedContext),
        quality_metrics: organizedContext.quality_metrics,
        performance_metrics: {
          creation_time: processingTime,
          aggregation_time: processingTime,
          processing_time: processingTime,
          memory_usage: 0,
          cpu_usage: 0,
          network_usage: 0
        },
        insights: {
          bundle_id: bundleId,
          generated_at: new Date(),
          key_insights: [],
          recommendations: [],
          trends: [],
          anomalies: [],
          opportunities: []
        }
      }

      logger.info('Context processing completed', {
        bundleId,
        processingTime,
        contextSize: processedContext.context_size
      })

      return processedContext

    } catch (error) {
      logger.error('Failed to process context', {
        bundleId,
        error: error.message
      })
      throw error
    }
  }

  async refreshContext(bundleId: string): Promise<ContextBundle> {
    try {
      logger.info('Refreshing context bundle', { bundleId })

      // Get bundle
      const bundle = await this.getBundle(bundleId)
      if (!bundle) {
        throw new Error(`Context bundle not found: ${bundleId}`)
      }

      // Refresh sources
      const refreshedSources = await this.refreshSources(bundle.sources)

      // Update bundle with refreshed sources
      const refreshedBundle = await this.updateBundle(bundleId, {
        sources: refreshedSources,
        freshness: {
          ...bundle.freshness,
          last_updated: new Date(),
          freshness_score: 1.0
        }
      })

      logger.info('Context bundle refreshed successfully', { bundleId })

      return refreshedBundle

    } catch (error) {
      logger.error('Failed to refresh context bundle', {
        bundleId,
        error: error.message
      })
      throw error
    }
  }

  async validateContext(bundleId: string): Promise<ValidationResult> {
    try {
      logger.info('Validating context bundle', { bundleId })

      // Get bundle
      const bundle = await this.getBundle(bundleId)
      if (!bundle) {
        throw new Error(`Context bundle not found: ${bundleId}`)
      }

      // Validate bundle
      const validationResult = await this.contextValidator.validate(bundle)

      logger.info('Context bundle validation completed', {
        bundleId,
        isValid: validationResult.is_valid,
        qualityScore: validationResult.quality_score
      })

      return validationResult

    } catch (error) {
      logger.error('Failed to validate context bundle', {
        bundleId,
        error: error.message
      })
      throw error
    }
  }

  async optimizeContext(bundleId: string): Promise<OptimizationResult> {
    try {
      logger.info('Optimizing context bundle', { bundleId })

      // Get bundle
      const bundle = await this.getBundle(bundleId)
      if (!bundle) {
        throw new Error(`Context bundle not found: ${bundleId}`)
      }

      // Optimize bundle
      const optimizationResult = await this.contextOptimizer.optimize(bundle)

      logger.info('Context bundle optimization completed', {
        bundleId,
        optimizationTime: optimizationResult.optimization_time
      })

      return optimizationResult

    } catch (error) {
      logger.error('Failed to optimize context bundle', {
        bundleId,
        error: error.message
      })
      throw error
    }
  }

  async getContextByType(type: ContextBundleType, filters?: ContextFilters): Promise<ContextBundle[]> {
    try {
      const bundles = await this.listBundles({ bundle_type: type })
      
      // Apply additional filters
      if (filters) {
        return bundles.filter(bundle => this.matchesContextFilters(bundle, filters))
      }

      return bundles

    } catch (error) {
      logger.error('Failed to get context by type', {
        type,
        filters,
        error: error.message
      })
      return []
    }
  }

  async getContextBySource(sourceType: string, sourceId: string): Promise<ContextBundle[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM context_bundles 
        WHERE sources @> $1 AND (expires_at IS NULL OR expires_at > NOW())
        `,
        [JSON.stringify([{ type: sourceType, source_id: sourceId }])]
      )

      return result.rows.map(row => this.deserializeBundle(row))

    } catch (error) {
      logger.error('Failed to get context by source', {
        sourceType,
        sourceId,
        error: error.message
      })
      return []
    }
  }

  async getContextByPriority(priority: ContextPriority): Promise<ContextBundle[]> {
    try {
      return await this.listBundles({ priority })

    } catch (error) {
      logger.error('Failed to get context by priority', {
        priority,
        error: error.message
      })
      return []
    }
  }

  async getContextByFreshness(freshnessThreshold: number): Promise<ContextBundle[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM context_bundles 
        WHERE freshness_score >= $1 AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY freshness_score DESC
        `,
        [freshnessThreshold]
      )

      return result.rows.map(row => this.deserializeBundle(row))

    } catch (error) {
      logger.error('Failed to get context by freshness', {
        freshnessThreshold,
        error: error.message
      })
      return []
    }
  }

  // Private helper methods
  private generateBundleId(): string {
    return `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private createEmptyAggregatedContext(): AggregatedContext {
    return {
      structured_data: {
        project_info: {} as any,
        user_info: {} as any,
        document_info: {} as any,
        template_info: {} as any,
        framework_info: {} as any,
        stakeholder_data: [],
        requirement_data: [],
        risk_data: [],
        constraint_data: [],
        metadata: {}
      },
      unstructured_data: {
        text_content: '',
        markdown_content: '',
        html_content: '',
        raw_content: '',
        extracted_insights: [],
        key_phrases: [],
        topics: [],
        sentiment: {
          overall_sentiment: 'neutral',
          sentiment_score: 0,
          emotion_scores: {},
          confidence: 0
        },
        language: 'en',
        content_type: 'text'
      },
      semantic_data: {
        embeddings: [],
        semantic_similarity: 0,
        topic_modeling: {
          topics: [],
          topic_distribution: [],
          topic_coherence: 0,
          topic_diversity: 0
        },
        entity_extraction: {
          entities: [],
          entity_relationships: [],
          entity_coverage: 0
        },
        relationship_mapping: {
          relationships: [],
          relationship_strength: 0,
          network_density: 0
        },
        concept_graph: {
          concepts: [],
          concept_relationships: [],
          graph_density: 0
        },
        knowledge_graph: {
          nodes: [],
          edges: [],
          graph_metrics: {
            node_count: 0,
            edge_count: 0,
            density: 0,
            clustering_coefficient: 0,
            average_path_length: 0
          }
        }
      },
      temporal_data: {
        creation_timeline: [],
        modification_timeline: [],
        usage_timeline: [],
        trend_data: [],
        seasonal_patterns: [],
        temporal_relevance: 0
      },
      quality_metrics: {
        completeness_score: 0,
        accuracy_score: 0,
        relevance_score: 0,
        freshness_score: 0,
        consistency_score: 0,
        reliability_score: 0,
        overall_quality_score: 0
      },
      relevance_scores: {
        semantic_relevance: 0,
        temporal_relevance: 0,
        user_relevance: 0,
        project_relevance: 0,
        framework_relevance: 0,
        overall_relevance: 0
      },
      confidence_scores: {
        data_confidence: 0,
        source_confidence: 0,
        aggregation_confidence: 0,
        semantic_confidence: 0,
        temporal_confidence: 0,
        overall_confidence: 0
      }
    }
  }

  private async storeBundle(bundle: ContextBundle): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_bundles (
          id, name, description, bundle_type, sources, aggregated_context,
          organization_strategy, priority, freshness, metadata, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          bundle.id,
          bundle.name,
          bundle.description,
          bundle.bundle_type,
          JSON.stringify(bundle.sources),
          JSON.stringify(bundle.aggregated_context),
          JSON.stringify(bundle.organization_strategy),
          bundle.priority,
          JSON.stringify(bundle.freshness),
          JSON.stringify(bundle.metadata),
          bundle.created_at,
          bundle.updated_at,
          bundle.expires_at
        ]
      )

    } catch (error) {
      logger.error('Failed to store context bundle', {
        bundleId: bundle.id,
        error: error.message
      })
      throw error
    }
  }

  private async updateBundleInDatabase(bundle: ContextBundle): Promise<void> {
    try {
      await pool.query(
        `
        UPDATE context_bundles SET
          name = $2, description = $3, bundle_type = $4, sources = $5, aggregated_context = $6,
          organization_strategy = $7, priority = $8, freshness = $9, metadata = $10, updated_at = $11, expires_at = $12
        WHERE id = $1
        `,
        [
          bundle.id,
          bundle.name,
          bundle.description,
          bundle.bundle_type,
          JSON.stringify(bundle.sources),
          JSON.stringify(bundle.aggregated_context),
          JSON.stringify(bundle.organization_strategy),
          bundle.priority,
          JSON.stringify(bundle.freshness),
          JSON.stringify(bundle.metadata),
          bundle.updated_at,
          bundle.expires_at
        ]
      )

    } catch (error) {
      logger.error('Failed to update context bundle in database', {
        bundleId: bundle.id,
        error: error.message
      })
      throw error
    }
  }

  private async processBundleSources(bundle: ContextBundle, sourceConfigs: any[]): Promise<ContextBundle> {
    try {
      // Process each source configuration
      const sources: ContextSource[] = []

      for (const sourceConfig of sourceConfigs) {
        const source = await this.processSource(sourceConfig)
        sources.push(source)
      }

      // Aggregate context from sources
      const aggregatedContext = await this.aggregateContext(sources)

      // Organize context
      const organizedContext = await this.organizeContext(aggregatedContext, bundle.organization_strategy)

      // Update bundle with processed data
      const processedBundle: ContextBundle = {
        ...bundle,
        sources,
        aggregated_context: organizedContext
      }

      // Update in database
      await this.updateBundleInDatabase(processedBundle)

      return processedBundle

    } catch (error) {
      logger.error('Failed to process bundle sources', {
        bundleId: bundle.id,
        error: error.message
      })
      throw error
    }
  }

  private async processSource(sourceConfig: any): Promise<ContextSource> {
    try {
      // This would implement source-specific processing logic
      // For now, return a basic source structure
      return {
        id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: sourceConfig.name,
        type: sourceConfig.type,
        source_id: sourceConfig.source_id,
        source_name: sourceConfig.source_name,
        weight: sourceConfig.weight,
        priority: sourceConfig.priority,
        freshness: sourceConfig.freshness,
        data: {},
        metadata: {
          source_version: '1.0',
          source_schema: 'basic',
          extraction_method: 'direct',
          transformation_applied: [],
          validation_status: 'pending',
          quality_score: 0,
          reliability_score: 0,
          last_verified: new Date()
        },
        retrieved_at: new Date(),
        expires_at: sourceConfig.expires_at
      }

    } catch (error) {
      logger.error('Failed to process source', {
        sourceConfig,
        error: error.message
      })
      throw error
    }
  }

  private async reprocessBundle(bundle: ContextBundle): Promise<ContextBundle> {
    try {
      // Reprocess the bundle with updated sources
      const aggregatedContext = await this.aggregateContext(bundle.sources)
      const organizedContext = await this.organizeContext(aggregatedContext, bundle.organization_strategy)

      const reprocessedBundle: ContextBundle = {
        ...bundle,
        aggregated_context: organizedContext
      }

      // Update in database
      await this.updateBundleInDatabase(reprocessedBundle)

      return reprocessedBundle

    } catch (error) {
      logger.error('Failed to reprocess bundle', {
        bundleId: bundle.id,
        error: error.message
      })
      throw error
    }
  }

  private async refreshSources(sources: ContextSource[]): Promise<ContextSource[]> {
    try {
      const refreshedSources: ContextSource[] = []

      for (const source of sources) {
        // This would implement source-specific refresh logic
        const refreshedSource: ContextSource = {
          ...source,
          retrieved_at: new Date(),
          freshness: {
            ...source.freshness,
            last_updated: new Date(),
            freshness_score: 1.0
          }
        }
        refreshedSources.push(refreshedSource)
      }

      return refreshedSources

    } catch (error) {
      logger.error('Failed to refresh sources', {
        sourcesCount: sources.length,
        error: error.message
      })
      return sources
    }
  }

  private deserializeBundle(bundleData: any): ContextBundle {
    return {
      id: bundleData.id,
      name: bundleData.name,
      description: bundleData.description,
      bundle_type: bundleData.bundle_type,
      sources: bundleData.sources || [],
      aggregated_context: bundleData.aggregated_context || this.createEmptyAggregatedContext(),
      organization_strategy: bundleData.organization_strategy || {},
      priority: bundleData.priority,
      freshness: bundleData.freshness || {},
      metadata: bundleData.metadata || {},
      created_at: bundleData.created_at,
      updated_at: bundleData.updated_at,
      expires_at: bundleData.expires_at
    }
  }

  private calculateContextSize(context: AggregatedContext): number {
    try {
      return JSON.stringify(context).length
    } catch (error) {
      return 0
    }
  }

  private matchesContextFilters(bundle: ContextBundle, filters: ContextFilters): boolean {
    if (filters.source_type) {
      const hasMatchingSource = bundle.sources.some(source => source.type === filters.source_type)
      if (!hasMatchingSource) return false
    }

    if (filters.priority && bundle.priority !== filters.priority) {
      return false
    }

    if (filters.freshness_threshold && bundle.freshness.freshness_score < filters.freshness_threshold) {
      return false
    }

    if (filters.quality_threshold && bundle.aggregated_context.quality_metrics.overall_quality_score < filters.quality_threshold) {
      return false
    }

    if (filters.relevance_threshold && bundle.aggregated_context.relevance_scores.overall_relevance < filters.relevance_threshold) {
      return false
    }

    return true
  }
}
