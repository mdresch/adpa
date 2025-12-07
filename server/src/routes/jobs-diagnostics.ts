/**
 * Job Diagnostics Endpoint
 * Helps identify why jobs remain in pending status
 */

import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import {
  aiQueue,
  documentQueue,
  pipelineQueue,
  baselineQueue,
  processFlowQueue,
  regenerationQueue,
  qualityAuditQueue,
  extractionQueue,
} from "../services/queueService"

const router = express.Router()

/**
 * GET /api/jobs/diagnostics/pending
 * Diagnose why jobs are stuck in pending status
 */
router.get(
  "/pending",
  authenticateToken,
  requirePermission("jobs.admin"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      // Get all pending jobs from database
      const pendingJobs = await pool.query(`
        SELECT 
          id,
          type,
          status,
          queue_name,
          created_at,
          queued_at,
          data,
          error_message
        FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 100
      `)

      const diagnostics = {
        totalPending: pendingJobs.rows.length,
        jobs: [] as any[],
        summary: {
          inQueue: 0,
          notInQueue: 0,
          oldPending: 0, // Older than 5 minutes
          withErrors: 0,
        },
      }

      // Queue map for lookup
      const queueMap: Record<string, any> = {
        'ai-processing': aiQueue,
        'document-processing': documentQueue,
        'pipeline-processing': pipelineQueue,
        'baseline-processing': baselineQueue,
        'process-flow-processing': processFlowQueue,
        'document-regeneration': regenerationQueue,
        'quality-audit': qualityAuditQueue,
        'project-data-extraction': extractionQueue,
      }

      // Check each pending job
      for (const job of pendingJobs.rows) {
        const jobId = job.id
        const queueName = job.queue_name || ''
        const queue = queueMap[queueName]
        
        let inQueue = false
        let queueStatus: string = 'unknown'
        let queuePosition: number | null = null
        let ageMinutes = 0

        // Check if job exists in Bull queue
        if (queue) {
          try {
            const bullJob = await queue.getJob(jobId)
            if (bullJob) {
              inQueue = true
              const state = await bullJob.getState()
              queueStatus = state
              
              // Get position in waiting queue
              if (state === 'waiting') {
                const waiting = await queue.getWaiting()
                const index = waiting.findIndex(j => j.id === jobId)
                queuePosition = index >= 0 ? index + 1 : null
              }
            }
          } catch (error) {
            log.warn(`Failed to check queue for job ${jobId}:`, error)
          }
        }

        // Calculate age
        const createdAt = new Date(job.created_at || job.queued_at)
        ageMinutes = Math.floor((Date.now() - createdAt.getTime()) / 1000 / 60)

        // Determine issue
        const issues: string[] = []
        if (!inQueue) {
          issues.push('Not in Bull queue (orphaned in database)')
        }
        if (queueStatus === 'waiting' && ageMinutes > 5) {
          issues.push(`Waiting in queue for ${ageMinutes} minutes (may be stuck)`)
        }
        if (job.error_message) {
          issues.push(`Has error message: ${job.error_message.substring(0, 100)}`)
        }
        if (ageMinutes > 30) {
          issues.push(`Very old (${ageMinutes} minutes) - likely stuck`)
        }
        if (!queue) {
          issues.push(`Unknown queue: ${queueName}`)
        }

        diagnostics.jobs.push({
          jobId,
          type: job.type,
          queueName,
          ageMinutes,
          inQueue,
          queueStatus,
          queuePosition,
          issues,
          createdAt: job.created_at,
          hasError: !!job.error_message,
        })

        // Update summary
        if (inQueue) diagnostics.summary.inQueue++
        else diagnostics.summary.notInQueue++
        
        if (ageMinutes > 5) diagnostics.summary.oldPending++
        if (job.error_message) diagnostics.summary.withErrors++
      }

      // Get queue statistics
      const queueStats: Record<string, any> = {}
      for (const [name, queue] of Object.entries(queueMap)) {
        try {
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
          ])
          
          queueStats[name] = {
            waiting,
            active,
            completed,
            failed,
          }
        } catch (error) {
          log.warn(`Failed to get stats for queue ${name}:`, error)
          queueStats[name] = { error: 'Failed to get stats' }
        }
      }

      res.json({
        diagnostics,
        queueStats,
        recommendations: generateRecommendations(diagnostics),
      })
    } catch (error) {
      log.error("Job diagnostics error:", error)
      res.status(500).json({ error: "Failed to diagnose pending jobs" })
    }
  }
)

/**
 * POST /api/jobs/diagnostics/fix-pending
 * Attempt to fix pending jobs by re-adding them to queues or marking as failed
 */
router.post(
  "/fix-pending",
  authenticateToken,
  requirePermission("jobs.admin"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { action = 're-add', maxAge = 30 } = req.body // maxAge in minutes
      
      // Get pending jobs older than maxAge minutes
      const oldPendingJobs = await pool.query(`
        SELECT 
          id,
          type,
          queue_name,
          data,
          created_at,
          queued_at
        FROM jobs
        WHERE status = 'pending'
          AND (created_at < NOW() - INTERVAL '${maxAge} minutes' OR queued_at < NOW() - INTERVAL '${maxAge} minutes')
        ORDER BY created_at DESC
      `)

      const results = {
        processed: 0,
        reAdded: 0,
        markedFailed: 0,
        errors: [] as string[],
      }

      const queueMap: Record<string, any> = {
        'ai-processing': aiQueue,
        'document-processing': documentQueue,
        'pipeline-processing': pipelineQueue,
        'baseline-processing': baselineQueue,
        'process-flow-processing': processFlowQueue,
        'document-regeneration': regenerationQueue,
        'quality-audit': qualityAuditQueue,
        'project-data-extraction': extractionQueue,
      }

      for (const job of oldPendingJobs.rows) {
        try {
          const queue = queueMap[job.queue_name || '']
          
          if (action === 're-add' && queue) {
            // Check if already in queue
            const bullJob = await queue.getJob(job.id)
            if (!bullJob) {
              // Re-add to queue
              const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data
              await queue.add(job.type, jobData, { jobId: job.id })
              results.reAdded++
              log.info(`Re-added job ${job.id} to queue ${job.queue_name}`)
            }
          } else if (action === 'mark-failed') {
            // Mark as failed
            await pool.query(
              `UPDATE jobs 
               SET status = 'failed', 
                   error_message = $1,
                   completed_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [`Job stuck in pending for more than ${maxAge} minutes - auto-marked as failed`, job.id]
            )
            results.markedFailed++
            log.info(`Marked job ${job.id} as failed (stuck in pending)`)
          }
          
          results.processed++
        } catch (error: any) {
          const errorMsg = `Failed to process job ${job.id}: ${error.message}`
          results.errors.push(errorMsg)
          log.error(errorMsg, error)
        }
      }

      res.json({
        success: true,
        message: `Processed ${results.processed} pending jobs`,
        results,
      })
    } catch (error) {
      log.error("Fix pending jobs error:", error)
      res.status(500).json({ error: "Failed to fix pending jobs" })
    }
  }
)

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = []
  
  if (diagnostics.summary.notInQueue > 0) {
    recommendations.push(
      `${diagnostics.summary.notInQueue} jobs are in database but not in Bull queue. ` +
      `They may have been created but failed to add to queue. Consider re-adding them.`
    )
  }
  
  if (diagnostics.summary.oldPending > 0) {
    recommendations.push(
      `${diagnostics.summary.oldPending} jobs have been pending for more than 5 minutes. ` +
      `Check if queue processors are running.`
    )
  }
  
  if (diagnostics.summary.withErrors > 0) {
    recommendations.push(
      `${diagnostics.summary.withErrors} pending jobs have error messages. ` +
      `They should be marked as failed, not pending.`
    )
  }
  
  if (diagnostics.totalPending === 0) {
    recommendations.push('No pending jobs found - system is healthy!')
  }
  
  return recommendations
}

export default router

