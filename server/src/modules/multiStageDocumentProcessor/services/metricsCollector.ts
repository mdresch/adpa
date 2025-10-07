/**
 * Metrics Collector Service
 * Collects and analyzes processing metrics for the multi-stage document processor
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  DocumentProcessingRequest,
  StageResult,
  ProcessingMetrics,
  StageMetrics,
  StageType
} from '../types'

export class MetricsCollector {
  async recordProcessingMetrics(
    request: DocumentProcessingRequest,
    stageResults: StageResult[],
    processingTime: number
  ): Promise<void> {
    try {
      logger.debug('Recording processing metrics', {
        requestId: request.request_id,
        processingTime,
        stagesCount: stageResults.length
      })

      // Calculate overall quality score
      const overallQualityScore = stageResults.reduce((sum, stage) => sum + stage.quality_score, 0) / stageResults.length

      // Record processing metrics
      await pool.query(
        `
        INSERT INTO processing_metrics (
          request_id, template_id, project_id, user_id, processing_time, quality_score,
          stages_count, successful_stages, failed_stages, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        `,
        [
          request.request_id,
          request.template_id,
          request.project_id,
          request.user_id,
          processingTime,
          overallQualityScore,
          stageResults.length,
          stageResults.filter(s => s.status === 'completed').length,
          stageResults.filter(s => s.status === 'failed').length
        ]
      )

      // Record stage metrics
      for (const stageResult of stageResults) {
        await this.recordStageMetrics(
          stageResult.stage_id,
          stageResult.stage_type,
          stageResult.execution_time,
          stageResult.quality_score,
          stageResult.status === 'completed'
        )
      }

      logger.info('Processing metrics recorded successfully', {
        requestId: request.request_id,
        processingTime,
        qualityScore: overallQualityScore
      })

    } catch (error) {
      logger.error('Failed to record processing metrics', {
        requestId: request.request_id,
        error: error.message
      })
    }
  }

  async recordStageMetrics(
    stageId: string,
    stageType: StageType,
    executionTime: number,
    qualityScore: number,
    success: boolean
  ): Promise<void> {
    try {
      logger.debug('Recording stage metrics', {
        stageId,
        stageType,
        executionTime,
        qualityScore,
        success
      })

      await pool.query(
        `
        INSERT INTO stage_metrics (
          stage_id, stage_type, execution_time, quality_score, success, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `,
        [stageId, stageType, executionTime, qualityScore, success]
      )

      logger.info('Stage metrics recorded successfully', {
        stageId,
        stageType,
        executionTime,
        qualityScore
      })

    } catch (error) {
      logger.error('Failed to record stage metrics', {
        stageId,
        stageType,
        error: error.message
      })
    }
  }

  async getProcessingMetrics(timeframe: string): Promise<ProcessingMetrics> {
    try {
      logger.info('Getting processing metrics', { timeframe })

      // Calculate date range based on timeframe
      const dateRange = this.calculateDateRange(timeframe)

      // Get processing metrics
      const processingResult = await pool.query(
        `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN quality_score >= 0.7 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN quality_score < 0.7 THEN 1 END) as failed_requests,
          AVG(processing_time) as average_processing_time,
          AVG(quality_score) as average_quality_score
        FROM processing_metrics
        WHERE created_at >= $1 AND created_at <= $2
        `,
        [dateRange.start, dateRange.end]
      )

      const processingStats = processingResult.rows[0]

      // Get stage metrics
      const stageMetrics = await this.getStageMetricsForTimeframe(timeframe)

      // Get quality metrics
      const qualityMetrics = await this.getQualityMetricsForTimeframe(timeframe)

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetricsForTimeframe(timeframe)

      const metrics: ProcessingMetrics = {
        total_requests: parseInt(processingStats.total_requests) || 0,
        successful_requests: parseInt(processingStats.successful_requests) || 0,
        failed_requests: parseInt(processingStats.failed_requests) || 0,
        average_processing_time: parseFloat(processingStats.average_processing_time) || 0,
        stage_metrics: stageMetrics,
        quality_metrics: qualityMetrics,
        performance_metrics: performanceMetrics
      }

      logger.info('Processing metrics retrieved successfully', {
        timeframe,
        totalRequests: metrics.total_requests,
        successfulRequests: metrics.successful_requests,
        averageProcessingTime: metrics.average_processing_time
      })

      return metrics

    } catch (error) {
      logger.error('Failed to get processing metrics', {
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async getStageMetrics(stageId: string, timeframe: string): Promise<StageMetrics> {
    try {
      logger.info('Getting stage metrics', { stageId, timeframe })

      // Calculate date range based on timeframe
      const dateRange = this.calculateDateRange(timeframe)

      // Get stage metrics
      const result = await pool.query(
        `
        SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_executions,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_executions,
          AVG(execution_time) as average_execution_time,
          AVG(quality_score) as average_quality_score
        FROM stage_metrics
        WHERE stage_id = $1 AND created_at >= $2 AND created_at <= $3
        `,
        [stageId, dateRange.start, dateRange.end]
      )

      const stats = result.rows[0]

      // Get quality scores over time
      const qualityScoresResult = await pool.query(
        `
        SELECT quality_score, created_at
        FROM stage_metrics
        WHERE stage_id = $1 AND created_at >= $2 AND created_at <= $3
        ORDER BY created_at
        `,
        [stageId, dateRange.start, dateRange.end]
      )

      const qualityScores = qualityScoresResult.rows.map(row => parseFloat(row.quality_score))

      // Get error rates over time
      const errorRatesResult = await pool.query(
        `
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as total,
          COUNT(CASE WHEN success = false THEN 1 END) as failed
        FROM stage_metrics
        WHERE stage_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour
        `,
        [stageId, dateRange.start, dateRange.end]
      )

      const errorRates = errorRatesResult.rows.map(row => ({
        hour: row.hour,
        error_rate: row.total > 0 ? (row.failed / row.total) : 0
      }))

      const metrics: StageMetrics = {
        stage_id: stageId,
        stage_type: 'context_gathering', // Would be retrieved from stage configuration
        total_executions: parseInt(stats.total_executions) || 0,
        successful_executions: parseInt(stats.successful_executions) || 0,
        failed_executions: parseInt(stats.failed_executions) || 0,
        average_execution_time: parseFloat(stats.average_execution_time) || 0,
        quality_scores: qualityScores,
        error_rates: errorRates.map(r => r.error_rate)
      }

      logger.info('Stage metrics retrieved successfully', {
        stageId,
        timeframe,
        totalExecutions: metrics.total_executions,
        successfulExecutions: metrics.successful_executions,
        averageExecutionTime: metrics.average_execution_time
      })

      return metrics

    } catch (error) {
      logger.error('Failed to get stage metrics', {
        stageId,
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async getQualityTrends(timeframe: string): Promise<any[]> {
    try {
      logger.info('Getting quality trends', { timeframe })

      // Calculate date range based on timeframe
      const dateRange = this.calculateDateRange(timeframe)

      // Get quality trends by day
      const result = await pool.query(
        `
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          AVG(quality_score) as average_quality,
          COUNT(*) as request_count
        FROM processing_metrics
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day
        `,
        [dateRange.start, dateRange.end]
      )

      const trends = result.rows.map(row => ({
        date: row.day,
        average_quality: parseFloat(row.average_quality),
        request_count: parseInt(row.request_count)
      }))

      logger.info('Quality trends retrieved successfully', {
        timeframe,
        trendsCount: trends.length
      })

      return trends

    } catch (error) {
      logger.error('Failed to get quality trends', {
        timeframe,
        error: error.message
      })
      return []
    }
  }

  async getPerformanceTrends(timeframe: string): Promise<any[]> {
    try {
      logger.info('Getting performance trends', { timeframe })

      // Calculate date range based on timeframe
      const dateRange = this.calculateDateRange(timeframe)

      // Get performance trends by day
      const result = await pool.query(
        `
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          AVG(processing_time) as average_processing_time,
          COUNT(*) as request_count
        FROM processing_metrics
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day
        `,
        [dateRange.start, dateRange.end]
      )

      const trends = result.rows.map(row => ({
        date: row.day,
        average_processing_time: parseFloat(row.average_processing_time),
        request_count: parseInt(row.request_count)
      }))

      logger.info('Performance trends retrieved successfully', {
        timeframe,
        trendsCount: trends.length
      })

      return trends

    } catch (error) {
      logger.error('Failed to get performance trends', {
        timeframe,
        error: error.message
      })
      return []
    }
  }

  async getErrorAnalysis(timeframe: string): Promise<any> {
    try {
      logger.info('Getting error analysis', { timeframe })

      // Calculate date range based on timeframe
      const dateRange = this.calculateDateRange(timeframe)

      // Get error analysis
      const result = await pool.query(
        `
        SELECT 
          stage_type,
          COUNT(*) as total_executions,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_executions,
          AVG(CASE WHEN success = false THEN execution_time END) as average_failure_time
        FROM stage_metrics
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY stage_type
        ORDER BY failed_executions DESC
        `,
        [dateRange.start, dateRange.end]
      )

      const errorAnalysis = result.rows.map(row => ({
        stage_type: row.stage_type,
        total_executions: parseInt(row.total_executions),
        failed_executions: parseInt(row.failed_executions),
        failure_rate: row.total_executions > 0 ? (row.failed_executions / row.total_executions) : 0,
        average_failure_time: parseFloat(row.average_failure_time) || 0
      }))

      logger.info('Error analysis retrieved successfully', {
        timeframe,
        errorAnalysisCount: errorAnalysis.length
      })

      return {
        timeframe,
        error_analysis: errorAnalysis,
        total_errors: errorAnalysis.reduce((sum, analysis) => sum + analysis.failed_executions, 0),
        most_error_prone_stage: errorAnalysis.length > 0 ? errorAnalysis[0].stage_type : null
      }

    } catch (error) {
      logger.error('Failed to get error analysis', {
        timeframe,
        error: error.message
      })
      return {
        timeframe,
        error_analysis: [],
        total_errors: 0,
        most_error_prone_stage: null
      }
    }
  }

  // Private helper methods
  private async getStageMetricsForTimeframe(timeframe: string): Promise<Record<StageType, StageMetrics>> {
    const stageMetrics: Record<StageType, StageMetrics> = {} as any

    const stageTypes: StageType[] = [
      'context_gathering',
      'template_processing',
      'ai_generation',
      'context_injection',
      'quality_assurance',
      'output_formatting'
    ]

    for (const stageType of stageTypes) {
      try {
        const metrics = await this.getStageMetricsByType(stageType, timeframe)
        stageMetrics[stageType] = metrics
      } catch (error) {
        logger.error('Failed to get stage metrics for type', {
          stageType,
          timeframe,
          error: error.message
        })
        // Set default metrics
        stageMetrics[stageType] = {
          stage_id: stageType,
          stage_type: stageType,
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          average_execution_time: 0,
          quality_scores: [],
          error_rates: []
        }
      }
    }

    return stageMetrics
  }

  private async getStageMetricsByType(stageType: StageType, timeframe: string): Promise<StageMetrics> {
    // Calculate date range based on timeframe
    const dateRange = this.calculateDateRange(timeframe)

    // Get stage metrics by type
    const result = await pool.query(
      `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_executions,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_executions,
        AVG(execution_time) as average_execution_time,
        AVG(quality_score) as average_quality_score
      FROM stage_metrics
      WHERE stage_type = $1 AND created_at >= $2 AND created_at <= $3
      `,
      [stageType, dateRange.start, dateRange.end]
    )

    const stats = result.rows[0]

    // Get quality scores
    const qualityScoresResult = await pool.query(
      `
      SELECT quality_score
      FROM stage_metrics
      WHERE stage_type = $1 AND created_at >= $2 AND created_at <= $3
      ORDER BY created_at
      `,
      [stageType, dateRange.start, dateRange.end]
    )

    const qualityScores = qualityScoresResult.rows.map(row => parseFloat(row.quality_score))

    // Get error rates
    const errorRatesResult = await pool.query(
      `
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as total,
        COUNT(CASE WHEN success = false THEN 1 END) as failed
      FROM stage_metrics
      WHERE stage_type = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
      `,
      [stageType, dateRange.start, dateRange.end]
    )

    const errorRates = errorRatesResult.rows.map(row => 
      row.total > 0 ? (row.failed / row.total) : 0
    )

    return {
      stage_id: stageType,
      stage_type: stageType,
      total_executions: parseInt(stats.total_executions) || 0,
      successful_executions: parseInt(stats.successful_executions) || 0,
      failed_executions: parseInt(stats.failed_executions) || 0,
      average_execution_time: parseFloat(stats.average_execution_time) || 0,
      quality_scores: qualityScores,
      error_rates: errorRates
    }
  }

  private async getQualityMetricsForTimeframe(timeframe: string): Promise<any> {
    // Calculate date range based on timeframe
    const dateRange = this.calculateDateRange(timeframe)

    // Get quality distribution
    const distributionResult = await pool.query(
      `
      SELECT 
        CASE 
          WHEN quality_score >= 0.9 THEN 'excellent'
          WHEN quality_score >= 0.8 THEN 'good'
          WHEN quality_score >= 0.7 THEN 'fair'
          WHEN quality_score >= 0.6 THEN 'poor'
          ELSE 'very_poor'
        END as quality_category,
        COUNT(*) as count
      FROM processing_metrics
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY quality_category
      `,
      [dateRange.start, dateRange.end]
    )

    const qualityDistribution: Record<string, number> = {}
    distributionResult.rows.forEach(row => {
      qualityDistribution[row.quality_category] = parseInt(row.count)
    })

    // Get average quality score
    const averageResult = await pool.query(
      `
      SELECT AVG(quality_score) as average_quality
      FROM processing_metrics
      WHERE created_at >= $1 AND created_at <= $2
      `,
      [dateRange.start, dateRange.end]
    )

    const averageQualityScore = parseFloat(averageResult.rows[0]?.average_quality) || 0

    return {
      average_quality_score: averageQualityScore,
      quality_distribution: qualityDistribution,
      improvement_trends: [], // Would be calculated from historical data
      common_issues: [] // Would be identified from quality reports
    }
  }

  private async getPerformanceMetricsForTimeframe(timeframe: string): Promise<any> {
    // Calculate date range based on timeframe
    const dateRange = this.calculateDateRange(timeframe)

    // Get performance metrics
    const result = await pool.query(
      `
      SELECT 
        AVG(processing_time) as average_response_time,
        COUNT(*) as throughput,
        MIN(processing_time) as min_processing_time,
        MAX(processing_time) as max_processing_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY processing_time) as median_processing_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time) as p95_processing_time
      FROM processing_metrics
      WHERE created_at >= $1 AND created_at <= $2
      `,
      [dateRange.start, dateRange.end]
    )

    const stats = result.rows[0]

    return {
      average_response_time: parseFloat(stats.average_response_time) || 0,
      throughput: parseInt(stats.throughput) || 0,
      resource_utilization: {
        cpu_usage: 0, // Would be collected from system metrics
        memory_usage: 0, // Would be collected from system metrics
        disk_usage: 0, // Would be collected from system metrics
        network_usage: 0 // Would be collected from system metrics
      },
      error_rates: {
        total_errors: 0, // Would be calculated from error logs
        error_rate: 0, // Would be calculated from error logs
        error_types: {}, // Would be categorized from error logs
        error_trends: [] // Would be calculated from historical error data
      },
      performance_stats: {
        min_processing_time: parseFloat(stats.min_processing_time) || 0,
        max_processing_time: parseFloat(stats.max_processing_time) || 0,
        median_processing_time: parseFloat(stats.median_processing_time) || 0,
        p95_processing_time: parseFloat(stats.p95_processing_time) || 0
      }
    }
  }

  private calculateDateRange(timeframe: string): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (timeframe) {
      case '1h':
        start.setHours(start.getHours() - 1)
        break
      case '24h':
        start.setDate(start.getDate() - 1)
        break
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      default:
        start.setDate(start.getDate() - 1) // Default to 24 hours
    }

    return { start, end }
  }

  async cleanupOldMetrics(retentionDays: number = 90): Promise<void> {
    try {
      logger.info('Cleaning up old metrics', { retentionDays })

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // Delete old processing metrics
      const processingResult = await pool.query(
        'DELETE FROM processing_metrics WHERE created_at < $1',
        [cutoffDate]
      )

      // Delete old stage metrics
      const stageResult = await pool.query(
        'DELETE FROM stage_metrics WHERE created_at < $1',
        [cutoffDate]
      )

      logger.info('Old metrics cleaned up successfully', {
        retentionDays,
        processingMetricsDeleted: processingResult.rowCount,
        stageMetricsDeleted: stageResult.rowCount
      })

    } catch (error) {
      logger.error('Failed to cleanup old metrics', {
        retentionDays,
        error: error.message
      })
      throw error
    }
  }
}

