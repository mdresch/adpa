/**
 * Prometheus Metrics Exporter
 * Phase 5.5: Testing and Performance Monitoring - Prometheus Integration
 * 
 * Exposes queue service metrics in Prometheus format for monitoring.
 */

import { PerformanceMonitor } from './performanceMonitor'
import type { IQueue } from '../services/jobs/queue/IQueue'
import type { QueueName } from '../services/jobs/types'

interface QueueMetrics {
  jobsWaiting: number
  jobsActive: number
  jobsCompleted: number
  jobsFailed: number
  jobsDelayed: number
}

export class PrometheusMetrics {
  private static queueMetrics: Map<QueueName, QueueMetrics> = new Map()
  private static lastUpdate: number = Date.now()

  /**
   * Update queue metrics from a queue instance
   */
  static async updateQueueMetrics(queueName: QueueName, queue: IQueue): Promise<void> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getJobs(['waiting'], 0, -1),
        queue.getJobs(['active'], 0, -1),
        queue.getJobs(['completed'], 0, -1),
        queue.getJobs(['failed'], 0, -1),
        queue.getJobs(['delayed'], 0, -1),
      ])

      this.queueMetrics.set(queueName, {
        jobsWaiting: waiting.length,
        jobsActive: active.length,
        jobsCompleted: completed.length,
        jobsFailed: failed.length,
        jobsDelayed: delayed.length,
      })

      this.lastUpdate = Date.now()
    } catch (error) {
      console.error(`Error updating metrics for queue ${queueName}:`, error)
    }
  }

  /**
   * Get Prometheus-formatted metrics string
   */
  static getMetrics(): string {
    const lines: string[] = []
    
    // Performance metrics from PerformanceMonitor
    const perfStats = PerformanceMonitor.getAllStats()
    for (const [label, stats] of Object.entries(perfStats)) {
      const metricName = this.sanitizeMetricName(label)
      
      lines.push(`# HELP ${metricName}_duration_ms Duration of ${label} operation in milliseconds`)
      lines.push(`# TYPE ${metricName}_duration_ms summary`)
      lines.push(`${metricName}_duration_ms{quantile="0.5"} ${this.parseMs(stats.avg)}`)
      lines.push(`${metricName}_duration_ms{quantile="0.95"} ${this.parseMs(stats.p95)}`)
      lines.push(`${metricName}_duration_ms{quantile="0.99"} ${this.parseMs(stats.p99)}`)
      lines.push(`${metricName}_duration_ms_count ${stats.count}`)
      lines.push(`${metricName}_duration_ms_sum ${this.parseMs(stats.total)}`)
    }

    // Cache metrics
    const cacheStats = PerformanceMonitor.getAllCacheStats()
    for (const [label, stats] of Object.entries(cacheStats)) {
      const metricName = this.sanitizeMetricName(`cache_${label}`)
      
      lines.push(`# HELP ${metricName}_hits_total Total cache hits for ${label}`)
      lines.push(`# TYPE ${metricName}_hits_total counter`)
      lines.push(`${metricName}_hits_total ${stats.hits}`)
      
      lines.push(`# HELP ${metricName}_misses_total Total cache misses for ${label}`)
      lines.push(`# TYPE ${metricName}_misses_total counter`)
      lines.push(`${metricName}_misses_total ${stats.misses}`)
      
      lines.push(`# HELP ${metricName}_hit_rate Cache hit rate for ${label} (0-1)`)
      lines.push(`# TYPE ${metricName}_hit_rate gauge`)
      const total = stats.hits + stats.misses
      const hitRate = total > 0 ? stats.hits / total : 0
      lines.push(`${metricName}_hit_rate ${hitRate}`)
    }

    // Queue metrics
    for (const [queueName, metrics] of this.queueMetrics.entries()) {
      const queueLabel = this.sanitizeMetricName(queueName)
      
      lines.push(`# HELP queue_${queueLabel}_jobs_waiting Number of waiting jobs in ${queueName}`)
      lines.push(`# TYPE queue_${queueLabel}_jobs_waiting gauge`)
      lines.push(`queue_${queueLabel}_jobs_waiting{queue="${queueName}"} ${metrics.jobsWaiting}`)
      
      lines.push(`# HELP queue_${queueLabel}_jobs_active Number of active jobs in ${queueName}`)
      lines.push(`# TYPE queue_${queueLabel}_jobs_active gauge`)
      lines.push(`queue_${queueLabel}_jobs_active{queue="${queueName}"} ${metrics.jobsActive}`)
      
      lines.push(`# HELP queue_${queueLabel}_jobs_completed_total Total completed jobs in ${queueName}`)
      lines.push(`# TYPE queue_${queueLabel}_jobs_completed_total counter`)
      lines.push(`queue_${queueLabel}_jobs_completed_total{queue="${queueName}"} ${metrics.jobsCompleted}`)
      
      lines.push(`# HELP queue_${queueLabel}_jobs_failed_total Total failed jobs in ${queueName}`)
      lines.push(`# TYPE queue_${queueLabel}_jobs_failed_total counter`)
      lines.push(`queue_${queueLabel}_jobs_failed_total{queue="${queueName}"} ${metrics.jobsFailed}`)
      
      lines.push(`# HELP queue_${queueLabel}_jobs_delayed Number of delayed jobs in ${queueName}`)
      lines.push(`# TYPE queue_${queueLabel}_jobs_delayed gauge`)
      lines.push(`queue_${queueLabel}_jobs_delayed{queue="${queueName}"} ${metrics.jobsDelayed}`)
    }

    // System metrics
    lines.push(`# HELP metrics_last_update_timestamp_seconds Timestamp of last metrics update`)
    lines.push(`# TYPE metrics_last_update_timestamp_seconds gauge`)
    lines.push(`metrics_last_update_timestamp_seconds ${Math.floor(this.lastUpdate / 1000)}`)

    return lines.join('\n') + '\n'
  }

  /**
   * Sanitize metric name to Prometheus format
   * (lowercase, underscores, no special chars)
   */
  private static sanitizeMetricName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  /**
   * Parse milliseconds string to number
   */
  private static parseMs(msString: string): number {
    return parseFloat(msString.replace('ms', '').trim())
  }

  /**
   * Reset all metrics
   */
  static reset(): void {
    this.queueMetrics.clear()
    this.lastUpdate = Date.now()
  }
}
