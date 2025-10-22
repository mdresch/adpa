/**
 * Queue Statistics Routes
 * Provides real-time stats for Bull queues and workers
 */

import express from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { logger } from '../utils/logger'
import { 
  aiQueue, 
  documentQueue, 
  baselineQueue, 
  pipelineQueue, 
  processFlowQueue 
} from '../services/queueService'

const router = express.Router()

/**
 * GET /api/queue-stats/overview
 * Get overview statistics for all queues
 */
router.get('/overview',
  authenticateToken,
  requirePermission('jobs.view'),
  async (req, res) => {
    try {
      const queues = [
        { name: 'ai-processing', queue: aiQueue },
        { name: 'document-processing', queue: documentQueue },
        { name: 'baseline-processing', queue: baselineQueue },
        { name: 'pipeline-processing', queue: pipelineQueue },
        { name: 'process-flow-processing', queue: processFlowQueue },
      ]

      const stats = await Promise.all(
        queues.map(async ({ name, queue }) => {
          try {
            const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
              queue.getWaitingCount(),
              queue.getActiveCount(),
              queue.getCompletedCount(),
              queue.getFailedCount(),
              queue.getDelayedCount(),
              queue.getPausedCount(),
            ])

            // Get jobs for average processing time
            const completedJobs = await queue.getCompleted(0, 99)
            let avgProcessingTime = 0
            if (completedJobs.length > 0) {
              const times = completedJobs
                .filter(job => job.finishedOn && job.processedOn)
                .map(job => (job.finishedOn! - job.processedOn!) / 1000)
              avgProcessingTime = times.length > 0 
                ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
                : 0
            }

            return {
              name,
              waiting,
              active,
              completed,
              failed,
              delayed,
              paused,
              total: waiting + active + delayed + paused,
              avgProcessingTime: avgProcessingTime > 0 ? `${avgProcessingTime}s` : 'N/A',
              isPaused: paused > 0,
              workers: active > 0 ? active : 0
            }
          } catch (err) {
            logger.error(`Failed to get stats for queue ${name}:`, err)
            return {
              name,
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              paused: 0,
              total: 0,
              avgProcessingTime: 'N/A',
              isPaused: false,
              workers: 0,
              error: 'Failed to fetch stats'
            }
          }
        })
      )

      res.json({ queues: stats })
    } catch (error) {
      logger.error('Error fetching queue overview:', error)
      res.status(500).json({ error: 'Failed to fetch queue statistics' })
    }
  }
)

/**
 * GET /api/queue-stats/workers
 * Get worker statistics and health
 */
router.get('/workers',
  authenticateToken,
  requirePermission('jobs.view'),
  async (req, res) => {
    try {
      const queues = [
        { name: 'ai-processing', queue: aiQueue, concurrency: 3 },
        { name: 'document-processing', queue: documentQueue, concurrency: 2 },
        { name: 'baseline-processing', queue: baselineQueue, concurrency: 2 },
        { name: 'pipeline-processing', queue: pipelineQueue, concurrency: 1 },
        { name: 'process-flow-processing', queue: processFlowQueue, concurrency: 2 },
      ]

      const workers = await Promise.all(
        queues.map(async ({ name, queue, concurrency }) => {
          try {
            const [active, waiting, completed, failed] = await Promise.all([
              queue.getActiveCount(),
              queue.getWaitingCount(),
              queue.getCompletedCount(),
              queue.getFailedCount(),
            ])

            // Get active jobs for current task info
            const activeJobs = await queue.getActive()
            const currentTasks = activeJobs.map(job => ({
              jobId: job.id,
              type: job.name,
              progress: (job.data as any).progress || 0,
              startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null
            }))

            // Calculate worker metrics
            const totalJobs = completed + failed
            const successRate = totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 100

            return {
              id: `worker-${name}`,
              name: `${name.replace('-', ' ')} Worker`,
              queue: name,
              status: active > 0 ? 'active' : 'idle',
              concurrency,
              currentLoad: active,
              maxLoad: concurrency,
              utilization: concurrency > 0 ? Math.round((active / concurrency) * 100) : 0,
              jobsProcessed: completed,
              jobsFailed: failed,
              successRate,
              queueSize: waiting,
              currentTasks,
              health: successRate >= 90 ? 'healthy' : successRate >= 70 ? 'degraded' : 'unhealthy',
              uptime: process.uptime() // Server uptime in seconds
            }
          } catch (err) {
            logger.error(`Failed to get worker stats for ${name}:`, err)
            return {
              id: `worker-${name}`,
              name: `${name.replace('-', ' ')} Worker`,
              queue: name,
              status: 'error',
              concurrency,
              currentLoad: 0,
              maxLoad: concurrency,
              utilization: 0,
              jobsProcessed: 0,
              jobsFailed: 0,
              successRate: 0,
              queueSize: 0,
              currentTasks: [],
              health: 'unhealthy',
              uptime: 0,
              error: 'Failed to fetch stats'
            }
          }
        })
      )

      res.json({ workers })
    } catch (error) {
      logger.error('Error fetching worker stats:', error)
      res.status(500).json({ error: 'Failed to fetch worker statistics' })
    }
  }
)

/**
 * GET /api/queue-stats/metrics
 * Get aggregate metrics across all queues
 */
router.get('/metrics',
  authenticateToken,
  requirePermission('jobs.view'),
  async (req, res) => {
    try {
      const queues = [aiQueue, documentQueue, baselineQueue, pipelineQueue, processFlowQueue]

      const allStats = await Promise.all(
        queues.map(async (queue) => {
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
          ])
          return { waiting, active, completed, failed }
        })
      )

      const metrics = allStats.reduce(
        (acc, stat) => ({
          totalWaiting: acc.totalWaiting + stat.waiting,
          totalActive: acc.totalActive + stat.active,
          totalCompleted: acc.totalCompleted + stat.completed,
          totalFailed: acc.totalFailed + stat.failed,
        }),
        { totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0 }
      )

      const totalJobs = metrics.totalCompleted + metrics.totalFailed
      const successRate = totalJobs > 0 
        ? Math.round((metrics.totalCompleted / totalJobs) * 100) 
        : 100

      res.json({
        ...metrics,
        totalJobs,
        successRate,
        activeWorkers: metrics.totalActive,
        queueHealth: successRate >= 90 ? 'healthy' : successRate >= 70 ? 'degraded' : 'unhealthy'
      })
    } catch (error) {
      logger.error('Error fetching queue metrics:', error)
      res.status(500).json({ error: 'Failed to fetch queue metrics' })
    }
  }
)

export default router

