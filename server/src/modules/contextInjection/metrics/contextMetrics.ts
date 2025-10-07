/**
 * Context Metrics Collector
 * Collects and analyzes metrics for context injection operations
 */

import { logger } from '../../../utils/logger'
import type { ContextMetrics } from '../types'

interface MetricsEntry {
  source_id: string
  retrieval_count: number
  success_count: number
  failure_count: number
  total_response_time_ms: number
  last_accessed: Date
  errors: string[]
}

export class ContextMetricsCollector {
  private metrics: Map<string, MetricsEntry> = new Map()

  async recordSuccess(sourceId: string, responseTimeMs: number): Promise<void> {
    try {
      const entry = this.getOrCreateEntry(sourceId)
      
      entry.retrieval_count++
      entry.success_count++
      entry.total_response_time_ms += responseTimeMs
      entry.last_accessed = new Date()

      this.metrics.set(sourceId, entry)

      logger.debug('Recorded success metrics', {
        source_id: sourceId,
        response_time_ms: responseTimeMs,
        success_count: entry.success_count
      })

    } catch (error) {
      logger.error('Failed to record success metrics', {
        source_id: sourceId,
        error: error.message
      })
    }
  }

  async recordFailure(sourceId: string, errorMessage: string): Promise<void> {
    try {
      const entry = this.getOrCreateEntry(sourceId)
      
      entry.retrieval_count++
      entry.failure_count++
      entry.last_accessed = new Date()
      entry.errors.push(errorMessage)

      // Keep only the last 10 errors
      if (entry.errors.length > 10) {
        entry.errors = entry.errors.slice(-10)
      }

      this.metrics.set(sourceId, entry)

      logger.debug('Recorded failure metrics', {
        source_id: sourceId,
        error_message: errorMessage,
        failure_count: entry.failure_count
      })

    } catch (error) {
      logger.error('Failed to record failure metrics', {
        source_id: sourceId,
        error: error.message
      })
    }
  }

  async getMetrics(sourceId?: string): Promise<ContextMetrics[] | ContextMetrics | null> {
    try {
      if (sourceId) {
        const entry = this.metrics.get(sourceId)
        if (!entry) {
          return null
        }

        return this.entryToMetrics(entry)
      }

      // Return all metrics
      const allMetrics: ContextMetrics[] = []
      for (const entry of this.metrics.values()) {
        allMetrics.push(this.entryToMetrics(entry))
      }

      return allMetrics

    } catch (error) {
      logger.error('Failed to get metrics', { source_id: sourceId, error: error.message })
      return null
    }
  }

  async getSummary(): Promise<{
    total_sources: number
    total_retrievals: number
    total_successes: number
    total_failures: number
    overall_success_rate: number
    average_response_time_ms: number
    most_used_sources: Array<{ source_id: string; retrieval_count: number }>
    least_reliable_sources: Array<{ source_id: string; error_rate: number }>
  }> {
    try {
      const entries = Array.from(this.metrics.values())
      
      if (entries.length === 0) {
        return {
          total_sources: 0,
          total_retrievals: 0,
          total_successes: 0,
          total_failures: 0,
          overall_success_rate: 0,
          average_response_time_ms: 0,
          most_used_sources: [],
          least_reliable_sources: []
        }
      }

      const totalRetrievals = entries.reduce((sum, entry) => sum + entry.retrieval_count, 0)
      const totalSuccesses = entries.reduce((sum, entry) => sum + entry.success_count, 0)
      const totalFailures = entries.reduce((sum, entry) => sum + entry.failure_count, 0)
      const totalResponseTime = entries.reduce((sum, entry) => sum + entry.total_response_time_ms, 0)

      const overallSuccessRate = totalRetrievals > 0 ? totalSuccesses / totalRetrievals : 0
      const averageResponseTime = totalSuccesses > 0 ? totalResponseTime / totalSuccesses : 0

      // Most used sources
      const mostUsedSources = entries
        .map(entry => ({
          source_id: entry.source_id,
          retrieval_count: entry.retrieval_count
        }))
        .sort((a, b) => b.retrieval_count - a.retrieval_count)
        .slice(0, 5)

      // Least reliable sources
      const leastReliableSources = entries
        .map(entry => ({
          source_id: entry.source_id,
          error_rate: entry.retrieval_count > 0 ? entry.failure_count / entry.retrieval_count : 0
        }))
        .filter(source => source.error_rate > 0)
        .sort((a, b) => b.error_rate - a.error_rate)
        .slice(0, 5)

      return {
        total_sources: entries.length,
        total_retrievals: totalRetrievals,
        total_successes: totalSuccesses,
        total_failures: totalFailures,
        overall_success_rate: overallSuccessRate,
        average_response_time_ms: averageResponseTime,
        most_used_sources: mostUsedSources,
        least_reliable_sources: leastReliableSources
      }

    } catch (error) {
      logger.error('Failed to get metrics summary', { error: error.message })
      throw error
    }
  }

  async resetMetrics(sourceId?: string): Promise<void> {
    try {
      if (sourceId) {
        this.metrics.delete(sourceId)
        logger.info('Reset metrics for source', { source_id: sourceId })
      } else {
        this.metrics.clear()
        logger.info('Reset all metrics')
      }
    } catch (error) {
      logger.error('Failed to reset metrics', { source_id: sourceId, error: error.message })
    }
  }

  private getOrCreateEntry(sourceId: string): MetricsEntry {
    let entry = this.metrics.get(sourceId)
    
    if (!entry) {
      entry = {
        source_id: sourceId,
        retrieval_count: 0,
        success_count: 0,
        failure_count: 0,
        total_response_time_ms: 0,
        last_accessed: new Date(),
        errors: []
      }
    }

    return entry
  }

  private entryToMetrics(entry: MetricsEntry): ContextMetrics {
    const averageResponseTime = entry.success_count > 0 
      ? entry.total_response_time_ms / entry.success_count 
      : 0

    const errorRate = entry.retrieval_count > 0 
      ? entry.failure_count / entry.retrieval_count 
      : 0

    return {
      source_id: entry.source_id,
      retrieval_count: entry.retrieval_count,
      success_count: entry.success_count,
      failure_count: entry.failure_count,
      average_response_time_ms: averageResponseTime,
      last_accessed: entry.last_accessed,
      error_rate: errorRate
    }
  }
}
