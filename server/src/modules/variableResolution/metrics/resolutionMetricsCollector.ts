/**
 * Resolution Metrics Collector
 * Collects and analyzes variable resolution metrics
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type { ResolutionMetrics, VariableUsageStats } from '../types'

export class ResolutionMetricsCollector {
  async getMetrics(): Promise<ResolutionMetrics> {
    try {
      logger.debug('Collecting resolution metrics')

      // Get metrics from database
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_variables,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_variables,
          COUNT(CASE WHEN status = 'unresolved' THEN 1 END) as unresolved_variables,
          AVG(CASE WHEN status = 'resolved' THEN resolution_time END) as avg_resolution_time,
          SUM(CASE WHEN status = 'resolved' THEN resolution_time END) as total_resolution_time,
          COUNT(CASE WHEN cache_hit = true THEN 1 END) as cache_hits,
          COUNT(CASE WHEN cache_hit = false THEN 1 END) as cache_misses
        FROM variable_resolution_metrics
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `)

      const row = result.rows[0]
      const totalVariables = parseInt(row.total_variables) || 0
      const resolvedVariables = parseInt(row.resolved_variables) || 0
      const unresolvedVariables = parseInt(row.unresolved_variables) || 0
      const cacheHits = parseInt(row.cache_hits) || 0
      const cacheMisses = parseInt(row.cache_misses) || 0

      const metrics: ResolutionMetrics = {
        total_variables: totalVariables,
        resolved_variables: resolvedVariables,
        unresolved_variables: unresolvedVariables,
        resolution_success_rate: totalVariables > 0 ? resolvedVariables / totalVariables : 0,
        average_resolution_time: parseFloat(row.avg_resolution_time) || 0,
        total_resolution_time: parseFloat(row.total_resolution_time) || 0,
        cache_hits: cacheHits,
        cache_misses: cacheMisses,
        cache_hit_rate: (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
        quality_scores: await this.getQualityScores(),
        performance_metrics: await this.getPerformanceMetrics()
      }

      logger.debug('Resolution metrics collected', {
        totalVariables: metrics.total_variables,
        successRate: metrics.resolution_success_rate
      })

      return metrics

    } catch (error) {
      logger.error('Failed to collect resolution metrics', {
        error: error.message
      })
      throw error
    }
  }

  async getVariableUsageStats(variableName: string): Promise<VariableUsageStats> {
    try {
      logger.debug('Collecting variable usage stats', { variableName })

      // Get usage stats from database
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_usage_count,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as successful_resolutions,
          COUNT(CASE WHEN status = 'unresolved' THEN 1 END) as failed_resolutions,
          AVG(CASE WHEN status = 'resolved' THEN resolution_time END) as avg_resolution_time
        FROM variable_resolution_metrics
        WHERE variable_name = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      `, [variableName])

      const row = result.rows[0]
      const totalUsageCount = parseInt(row.total_usage_count) || 0
      const successfulResolutions = parseInt(row.successful_resolutions) || 0
      const failedResolutions = parseInt(row.failed_resolutions) || 0

      // Get most used strategies
      const strategiesResult = await pool.query(`
        SELECT resolution_strategy, COUNT(*) as usage_count
        FROM variable_resolution_metrics
        WHERE variable_name = $1
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY resolution_strategy
        ORDER BY usage_count DESC
        LIMIT 5
      `, [variableName])

      const mostUsedStrategies = strategiesResult.rows.map(row => row.resolution_strategy)

      const stats: VariableUsageStats = {
        variable_name: variableName,
        total_usage_count: totalUsageCount,
        successful_resolutions: successfulResolutions,
        failed_resolutions: failedResolutions,
        success_rate: totalUsageCount > 0 ? successfulResolutions / totalUsageCount : 0,
        average_resolution_time: parseFloat(row.avg_resolution_time) || 0,
        most_used_strategies: mostUsedStrategies,
        quality_trends: await this.getQualityTrends(variableName),
        performance_trends: await this.getPerformanceTrends(variableName)
      }

      logger.debug('Variable usage stats collected', {
        variableName,
        totalUsageCount: stats.total_usage_count,
        successRate: stats.success_rate
      })

      return stats

    } catch (error) {
      logger.error('Failed to collect variable usage stats', {
        variableName,
        error: error.message
      })
      throw error
    }
  }

  async recordMetric(metric: any): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO variable_resolution_metrics (
          variable_name, variable_type, resolution_strategy, status, resolution_time,
          cache_hit, quality_score, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        metric.variable_name,
        metric.variable_type,
        metric.resolution_strategy,
        metric.status,
        metric.resolution_time,
        metric.cache_hit || false,
        metric.quality_score || 0
      ])

      logger.debug('Resolution metric recorded', {
        variableName: metric.variable_name,
        strategy: metric.resolution_strategy,
        status: metric.status
      })

    } catch (error) {
      logger.error('Failed to record resolution metric', {
        error: error.message
      })
    }
  }

  private async getQualityScores(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          'resolution_quality' as metric_name,
          AVG(quality_score) as score,
          1.0 as weight,
          'Average resolution quality score' as description
        FROM variable_resolution_metrics
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND quality_score IS NOT NULL
      `)

      return result.rows

    } catch (error) {
      logger.error('Failed to get quality scores', {
        error: error.message
      })
      return []
    }
  }

  private async getPerformanceMetrics(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          'avg_resolution_time' as metric_name,
          AVG(resolution_time) as value,
          'milliseconds' as unit,
          NOW() as timestamp
        FROM variable_resolution_metrics
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND resolution_time IS NOT NULL
      `)

      return result.rows

    } catch (error) {
      logger.error('Failed to get performance metrics', {
        error: error.message
      })
      return []
    }
  }

  private async getQualityTrends(variableName: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          AVG(quality_score) as avg_quality
        FROM variable_resolution_metrics
        WHERE variable_name = $1
        AND created_at >= NOW() - INTERVAL '30 days'
        AND quality_score IS NOT NULL
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
      `, [variableName])

      return result.rows.map(row => ({
        date: row.date,
        avg_quality: parseFloat(row.avg_quality) || 0
      }))

    } catch (error) {
      logger.error('Failed to get quality trends', {
        variableName,
        error: error.message
      })
      return []
    }
  }

  private async getPerformanceTrends(variableName: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          AVG(resolution_time) as avg_resolution_time
        FROM variable_resolution_metrics
        WHERE variable_name = $1
        AND created_at >= NOW() - INTERVAL '30 days'
        AND resolution_time IS NOT NULL
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
      `, [variableName])

      return result.rows.map(row => ({
        date: row.date,
        avg_resolution_time: parseFloat(row.avg_resolution_time) || 0
      }))

    } catch (error) {
      logger.error('Failed to get performance trends', {
        variableName,
        error: error.message
      })
      return []
    }
  }
}

