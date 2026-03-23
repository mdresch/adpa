/**
 * Database Query Context Retriever
 * Retrieves context data using custom database queries
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import { BaseContextRetriever } from './base'
import type {
  ContextSource,
  ContextInjectionRequest
} from '../types'

export class DatabaseQueryRetriever extends BaseContextRetriever {
  protected sourceType = 'database_query'

  protected validateSourceSpecific(source: ContextSource): void {
    if (!source.query) {
      throw new Error('Database query source requires a query')
    }
  }

  protected async fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any> {
    const query = source.query
    const parameters = source.parameters || {}

    try {
      logger.debug('Executing database query', { query, parameters })

      // Replace parameters in query
      const processedQuery = this.processQuery(query, parameters)
      
      const startTime = performance.now()
      const result = await pool.query(processedQuery.query, processedQuery.params)
      const duration = performance.now() - startTime

      return {
        query: processedQuery.query,
        parameters,
        data: result.rows,
        metadata: {
          row_count: result.rows.length,
          fields: result.fields?.map(f => f.name) || [],
          query_execution_time_ms: duration
        }
      }

    } catch (error) {
      logger.error('Failed to execute database query', {
        query,
        parameters,
        error: error.message
      })
      throw error
    }
  }

  protected async processData(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<any> {
    // Process database query results into structured format
    const processedData = {
      query_results: data.data,
      metadata: {
        ...data.metadata,
        query: data.query,
        parameters: data.parameters
      }
    }

    return processedData
  }

  protected async calculateMetadata(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<{
    relevance_score: number
    freshness_score: number
    confidence_score: number
    size_bytes: number
  }> {
    const baseMetadata = await super.calculateMetadata(data, source, request)
    
    // Calculate query-specific relevance
    const relevanceScore = this.calculateQueryRelevance(data, source, request)
    
    // Calculate freshness based on query results
    const freshnessScore = this.calculateQueryFreshness(data, source, request)
    
    // Calculate confidence based on query results quality
    const confidenceScore = this.calculateQueryConfidence(data, source, request)

    return {
      ...baseMetadata,
      relevance_score: relevanceScore,
      freshness_score: freshnessScore,
      confidence_score: confidenceScore
    }
  }

  private processQuery(query: string, parameters: Record<string, any>): { query: string; params: any[] } {
    let processedQuery = query
    const params: any[] = []
    let paramIndex = 1

    // Replace named parameters with positional parameters
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`
      if (processedQuery.includes(placeholder)) {
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), `$${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    }

    return { query: processedQuery, params }
  }

  private calculateQueryRelevance(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let relevance = source.weight || 0.5

    // Increase relevance if query returned results
    if (data.query_results && data.query_results.length > 0) {
      relevance += 0.2
    }

    // Increase relevance based on result count
    if (data.metadata && data.metadata.row_count > 10) {
      relevance += 0.1
    }

    return Math.min(relevance, 1.0)
  }

  private calculateQueryFreshness(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    // Database queries are generally considered fresh
    // Could be enhanced to check for timestamp fields in results
    return 0.8
  }

  private calculateQueryConfidence(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let confidence = 0.5

    if (data.query_results && data.query_results.length > 0) {
      confidence += 0.3
    }

    if (data.metadata && data.metadata.fields && data.metadata.fields.length > 0) {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }
}
