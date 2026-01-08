/**
 * Queue Statistics API Routes
 * Purpose: Provide real-time monitoring of job queues and workers
 * Feature: Job Monitor Enhancement with Worker Tracking
 */

import express from "express"
import { authenticateToken } from "../middleware/auth"
import { pool } from "../database/connection"
import {
  aiQueue,
  documentQueue,
  pipelineQueue,
  processFlowQueue,
  baselineQueue,
  regenerationQueue,
  extractionQueue
} from "../services/queueService"
import { logger, childLogger } from "../utils/logger"
import { getRedisCircuitState } from "../utils/redis"
import { getDbCircuitState } from "../database/connection"

const router = express.Router()

/**
 * GET /api/queue-stats/overview
 * Get all queue statistics with health indicators
 */
router.get("/overview", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })

  try {
    const queues = [
      { name: "ai-processing", queue: aiQueue },
      { name: "document-processing", queue: documentQueue },
      { name: "pipeline-processing", queue: pipelineQueue },
      { name: "process-flow-processing", queue: processFlowQueue },
      { name: "baseline-processing", queue: baselineQueue },
      { name: "document-regeneration", queue: regenerationQueue },
      { name: "project-data-extraction", queue: extractionQueue }
    ]

    const queueStats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const { active, waiting, completed, failed, delayed } = await queue.getStats()

          // Get active workers for this queue from database
          // Exclude jobs with error_message (they're actually failed, not processing)
          const workersResult = await pool.query(
            `SELECT DISTINCT worker_id, worker_process_id, COUNT(*) as job_count
             FROM jobs
             WHERE queue_name = $1 
               AND status = 'processing' 
               AND worker_id IS NOT NULL
               AND error_message IS NULL
             GROUP BY worker_id, worker_process_id`,
            [name]
          )

          // Calculate average processing time (last 100 completed jobs)
          const avgTimeResult = await pool.query(
            `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) as avg_seconds
             FROM jobs
             WHERE queue_name = $1 
               AND status = 'completed' 
               AND processing_started_at IS NOT NULL
               AND completed_at > NOW() - INTERVAL '24 hours'
             LIMIT 100`,
            [name]
          )

          const avgSeconds = Number(avgTimeResult.rows[0]?.avg_seconds) || 0
          const avgProcessingTime = formatDuration(avgSeconds)

          // Determine health based on failure rate and waiting jobs
          const totalRecent = active + completed + failed
          const failureRate = totalRecent > 0 ? (failed / totalRecent) * 100 : 0
          const health = failed > 10 || failureRate > 15 ? 'degraded' :
            waiting > 50 ? 'degraded' : 'healthy'

          return {
            name,
            active,
            waiting,
            completed,
            failed,
            delayed,
            workers: workersResult.rows.length,
            avgProcessingTime,
            health
          }
        } catch (error) {
          log.error(`Failed to get stats for queue ${name}:`, error)
          return {
            name,
            active: 0,
            waiting: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            workers: 0,
            avgProcessingTime: 'N/A',
            health: 'unknown'
          }
        }
      })
    )

    res.json({ queues: queueStats })
  } catch (error) {
    log.error("Failed to get queue overview:", error)
    res.status(500).json({ error: "Failed to get queue statistics" })
  }
})

/**
 * GET /api/queue-stats/workers
 * Get all worker statuses with performance metrics
 */
router.get("/workers", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })

  try {
    // Get active workers from database using new columns
    // Exclude jobs with error_message (they're actually failed, not processing)
    const activeWorkersResult = await pool.query(
      `SELECT 
        worker_id,
        worker_process_id,
        queue_name,
        COUNT(*) as current_jobs,
        MIN(processing_started_at) as first_job_start,
        MAX(progress) as max_progress,
        STRING_AGG(id::text, ',') as job_ids
       FROM jobs
       WHERE status = 'processing' 
         AND worker_id IS NOT NULL
         AND error_message IS NULL
       GROUP BY worker_id, worker_process_id, queue_name`
    )

    // Get completed job counts per worker (last 24 hours)
    const completedJobsResult = await pool.query(
      `SELECT 
        worker_id,
        COUNT(*) as jobs_completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as jobs_failed,
        AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) as avg_duration
       FROM jobs
       WHERE worker_id IS NOT NULL 
         AND completed_at > NOW() - INTERVAL '24 hours'
       GROUP BY worker_id`
    )

    const completedJobsMap = new Map(
      completedJobsResult.rows.map(row => [row.worker_id, row])
    )

    const workers = activeWorkersResult.rows.map(row => {
      const completed = completedJobsMap.get(row.worker_id) || {
        jobs_completed: 0,
        jobs_failed: 0,
        avg_duration: 0
      }

      const uptimeSeconds = row.first_job_start
        ? Math.floor((Date.now() - new Date(row.first_job_start).getTime()) / 1000)
        : 0

      const jobsCompleted = parseInt(completed.jobs_completed) || 0
      const jobsFailed = parseInt(completed.jobs_failed) || 0
      const successRate = jobsCompleted > 0
        ? Math.round(((jobsCompleted - jobsFailed) / jobsCompleted) * 100)
        : 100

      return {
        id: row.worker_id,
        name: row.worker_id,
        processId: row.worker_process_id,
        status: row.current_jobs > 0 ? 'active' : 'idle',
        queue: row.queue_name,
        currentJob: row.current_jobs > 0 ? `${row.current_jobs} jobs` : null,
        uptime: formatDuration(uptimeSeconds),
        uptimeSeconds,
        jobsCompleted,
        jobsFailed,
        successRate,
        avgDuration: formatDuration(Number(completed.avg_duration) || 0),
        // Use real metrics if available from heartbeats
        cpu: 0, // Will be merged below
        memory: 0, // Will be merged below
        health: successRate >= 90 ? 'healthy' : successRate >= 70 ? 'degraded' : 'unhealthy',
        currentTasks: row.job_ids ? row.job_ids.split(',').slice(0, 5).map((id: string) => ({
          jobId: id,
          progress: parseInt(row.max_progress) || 0,
          type: row.queue_name
        })) : []
      }
    })

    // Fetch actual heartbeats to overlay real metrics
    const heartbeatsResult = await pool.query(
      `SELECT worker_id, worker_process_id, queue_name, cpu_usage_percent, memory_usage_mb, last_heartbeat
       FROM worker_heartbeats
       WHERE last_heartbeat > NOW() - INTERVAL '1 minute'`
    )
    const heartbeatsMap = new Map(heartbeatsResult.rows.map(h => [h.worker_id, h]))

    // Merge heartbeat data into active workers
    workers.forEach(w => {
      const hb = heartbeatsMap.get(w.id)
      if (hb) {
        w.cpu = Math.round(hb.cpu_usage_percent)
        w.memory = Math.round(hb.memory_usage_mb)
        w.lastHeartbeat = hb.last_heartbeat
      } else {
        // Fallback for workers without recent heartbeat
        w.cpu = 0
        w.memory = 0
        w.lastHeartbeat = null
      }
    })

    // Also include recently idle workers from heartbeats that aren't in the active list
    const activeWorkerIds = new Set(workers.map(w => w.id))
    const idleWorkers = heartbeatsResult.rows
      .filter(hb => !activeWorkerIds.has(hb.worker_id))
      .map(hb => {
        const completed = completedJobsMap.get(hb.worker_id) || {
          jobs_completed: 0,
          jobs_failed: 0
        }

        const jobsCompleted = parseInt(completed.jobs_completed) || 0
        const jobsFailed = parseInt(completed.jobs_failed) || 0
        const successRate = jobsCompleted > 0
          ? Math.round(((jobsCompleted - jobsFailed) / jobsCompleted) * 100)
          : 100

        return {
          id: hb.worker_id,
          name: hb.worker_id,
          processId: hb.worker_process_id,
          status: 'idle',
          queue: hb.queue_name || 'unknown',
          currentJob: null,
          uptime: 'Recently active',
          uptimeSeconds: 0,
          jobsCompleted,
          jobsFailed,
          successRate,
          cpu: Math.round(hb.cpu_usage_percent),
          memory: Math.round(hb.memory_usage_mb),
          health: 'healthy',
          currentTasks: [],
          lastHeartbeat: hb.last_heartbeat
        }
      })

    res.json({ workers: [...workers, ...idleWorkers] })
  } catch (error) {
    log.error("Failed to get worker statistics:", error)
    res.status(500).json({ error: "Failed to get worker statistics" })
  }
})

/**
 * GET /api/queue-stats/metrics
 * Get aggregate metrics across all queues
 */
router.get("/metrics", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })

  try {
    const metricsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as total_waiting,
        COUNT(*) FILTER (WHERE status = 'processing' AND error_message IS NULL) as total_active,
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE status = 'failed' OR (status = 'processing' AND error_message IS NOT NULL)) as total_failed,
        COUNT(DISTINCT worker_id) FILTER (WHERE status = 'processing' AND worker_id IS NOT NULL AND error_message IS NULL) as active_workers,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour') as completed_last_hour,
        AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) FILTER (WHERE status = 'completed' AND processing_started_at IS NOT NULL AND completed_at > NOW() - INTERVAL '24 hours') as avg_processing_time
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '7 days'
    `)

    const metrics = metricsResult.rows[0]

    // Calculate success rate
    const totalCompleted = parseInt(metrics.total_completed) || 0
    const totalFailed = parseInt(metrics.total_failed) || 0
    const successRate = (totalCompleted + totalFailed) > 0
      ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100)
      : 0

    // Determine queue health
    const failureRate = (totalCompleted + totalFailed) > 0
      ? (totalFailed / (totalCompleted + totalFailed)) * 100
      : 0
    const queueHealth = totalFailed > 10 || failureRate > 15 ? 'degraded' : 'healthy'

    res.json({
      totalJobs: parseInt(metrics.total_jobs),
      totalWaiting: parseInt(metrics.total_waiting),
      totalActive: parseInt(metrics.total_active),
      totalCompleted,
      totalFailed,
      activeWorkers: parseInt(metrics.active_workers),
      completedLastHour: parseInt(metrics.completed_last_hour),
      avgProcessingTime: formatDuration(Number(metrics.avg_processing_time) || 0),
      avgProcessingTimeSeconds: Number(metrics.avg_processing_time) || 0,
      successRate,
      failureRate: Math.round(failureRate),
      queueHealth
    })
  } catch (error) {
    log.error("Failed to get queue metrics:", error)
    res.status(500).json({ error: "Failed to get queue metrics" })
  }
})

/**
 * GET /api/queue-stats/health
 * Quick health check endpoint for monitoring
 */
router.get("/health", authenticateToken, async (req, res) => {
  try {
    // Quick health check - count failed jobs in last hour
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'processing' AND processing_started_at < NOW() - INTERVAL '30 minutes') as stalled_jobs
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `)

    const failedJobs = parseInt(result.rows[0].failed_jobs) || 0
    const stalledJobs = parseInt(result.rows[0].stalled_jobs) || 0

    const health = failedJobs > 5 || stalledJobs > 3 ? 'degraded' : 'healthy'

    res.json({
      status: health,
      failedJobs,
      stalledJobs,
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: getRedisCircuitState(),
        database: getDbCircuitState()
      }
    })
  } catch (error) {
    logger.error("Failed to get health status:", error)
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to check health'
    })
  }
})

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

export default router
