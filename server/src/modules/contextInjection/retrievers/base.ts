/**
 * Base Context Retriever
 * Abstract base class for all context retrievers
 */

import { logger } from '../../../utils/logger'
import type {
  ContextSource,
  ContextResult,
  ContextInjectionRequest
} from '../types'

export abstract class BaseContextRetriever {
  protected abstract sourceType: string

  async retrieve(source: ContextSource, request: ContextInjectionRequest): Promise<ContextResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Retrieving context from ${this.sourceType} source`, {
        source_id: source.source_id,
        source_name: source.source_name
      })

      // Validate source configuration
      this.validateSource(source)

      // Retrieve data from source
      const data = await this.fetchData(source, request)

      // Process and transform data
      const processedData = await this.processData(data, source, request)

      // Calculate metadata
      const metadata = await this.calculateMetadata(processedData, source, request)

      const result: ContextResult = {
        source_id: source.source_id,
        source_name: source.source_name,
        data: processedData,
        metadata: {
          retrieved_at: new Date(),
          relevance_score: metadata.relevance_score,
          freshness_score: metadata.freshness_score,
          confidence_score: metadata.confidence_score,
          size_bytes: metadata.size_bytes
        }
      }

      logger.debug(`Successfully retrieved context from ${this.sourceType} source`, {
        source_id: source.source_id,
        size_bytes: metadata.size_bytes,
        processing_time_ms: Date.now() - startTime
      })

      return result

    } catch (error) {
      logger.error(`Failed to retrieve context from ${this.sourceType} source`, {
        source_id: source.source_id,
        error: error.message,
        stack: error.stack
      })

      throw error
    }
  }

  protected validateSource(source: ContextSource): void {
    if (!source.source_id) {
      throw new Error('Source ID is required')
    }

    if (!source.source_name) {
      throw new Error('Source name is required')
    }

    if (source.type !== this.sourceType) {
      throw new Error(`Source type mismatch: expected ${this.sourceType}, got ${source.type}`)
    }

    // Additional validation specific to source type
    this.validateSourceSpecific(source)
  }

  protected abstract validateSourceSpecific(source: ContextSource): void

  protected abstract fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any>

  protected async processData(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<any> {
    // Default implementation - can be overridden by subclasses
    return data
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
    const sizeBytes = this.calculateSize(data)
    
    return {
      relevance_score: source.weight || 0.5,
      freshness_score: 1.0, // Default - can be overridden
      confidence_score: 0.8, // Default - can be overridden
      size_bytes: sizeBytes
    }
  }

  protected calculateSize(data: any): number {
    if (data === null || data === undefined) {
      return 0
    }

    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8')
    }

    if (typeof data === 'object') {
      return Buffer.byteLength(JSON.stringify(data), 'utf8')
    }

    return Buffer.byteLength(String(data), 'utf8')
  }

  protected calculateRelevanceScore(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): number {
    // Default implementation - can be overridden by subclasses
    return source.weight || 0.5
  }

  protected calculateFreshnessScore(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): number {
    // Default implementation - can be overridden by subclasses
    return 1.0
  }

  protected calculateConfidenceScore(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): number {
    // Default implementation - can be overridden by subclasses
    return 0.8
  }
}
