/**
 * Project Data Extraction API Routes
 * AI-powered extraction of structured entities from project documents
 */

import express, { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { projectDataExtractionService } from '../services/projectDataExtractionService'
import { authenticateToken } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import Bull from 'bull'
import { redis } from '../utils/redis'

const router = express.Router()

// Job queue for extraction (long-running tasks)
const extractionQueue = new Bull('project-data-extraction', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    timeout: 300000 // 5 minutes
  }
})

/**
 * POST /api/project-data-extraction/extract
 * Trigger AI-powered entity extraction for a project
 */
const extractSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  aiProvider: Joi.string().valid('openai', 'google', 'azure', 'anthropic').optional(),
  aiModel: Joi.string().optional(),
  documentIds: Joi.array().items(Joi.string().uuid()).optional()
})

router.post(
  '/extract',
  authenticateToken,
  validate(extractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, aiProvider, aiModel, documentIds } = req.body
      const userId = (req as any).user?.id

      logger.info('[EXTRACTION-API] Extraction requested', {
        projectId,
        userId,
        provider: aiProvider || 'default'
      })

      // Create job record
      const jobResult = await pool!.query(
        `INSERT INTO jobs (
          type, status, data, created_by, project_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          'project-data-extraction',
          'pending',
          JSON.stringify({ projectId, aiProvider, aiModel, documentIds }),
          userId,
          projectId
        ]
      )

      const jobId = jobResult.rows[0].id

      // Enqueue extraction job
      await extractionQueue.add('extract-project-data', {
        jobId,
        projectId,
        userId,
        aiProvider,
        aiModel,
        documentIds
      })

      logger.info('[EXTRACTION-API] Extraction job enqueued', { jobId, projectId })

      res.json({
        success: true,
        jobId,
        message: 'Project data extraction started. This may take a few minutes.',
        estimatedTime: '2-5 minutes'
      })
    } catch (error: unknown) {
      logger.error('[EXTRACTION-API] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/project-data-extraction/status/:jobId
 * Check extraction job status
 */
router.get(
  '/status/:jobId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params

      const result = await pool!.query(
        `SELECT id, type, status, progress, result, error_message, created_at, started_at, completed_at
         FROM jobs
         WHERE id = $1`,
        [jobId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        })
      }

      const job = result.rows[0]

      res.json({
        success: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          result: job.result,
          error: job.error_message,
          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at
        }
      })
    } catch (error: unknown) {
      logger.error('[EXTRACTION-API] Status check failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/project-data-extraction/results/:projectId
 * Get extraction results for a project
 */
router.get(
  '/results/:projectId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params

      // Fetch counts from all tables
      const counts = await pool!.query(
        `SELECT 
          (SELECT COUNT(*) FROM stakeholders WHERE project_id = $1) as stakeholders,
          (SELECT COUNT(*) FROM requirements WHERE project_id = $1) as requirements,
          (SELECT COUNT(*) FROM risks WHERE project_id = $1) as risks,
          (SELECT COUNT(*) FROM milestones WHERE project_id = $1) as milestones,
          (SELECT COUNT(*) FROM constraints WHERE project_id = $1) as constraints,
          (SELECT COUNT(*) FROM success_criteria WHERE project_id = $1) as success_criteria,
          (SELECT COUNT(*) FROM best_practices WHERE project_id = $1) as best_practices,
          (SELECT COUNT(*) FROM phases WHERE project_id = $1) as phases,
          (SELECT COUNT(*) FROM resources WHERE project_id = $1) as resources,
          (SELECT COUNT(*) FROM quality_standards WHERE project_id = $1) as quality_standards,
          (SELECT COUNT(*) FROM deliverables WHERE project_id = $1) as deliverables,
          (SELECT COUNT(*) FROM scope_items WHERE project_id = $1) as scope_items,
          (SELECT COUNT(*) FROM activities WHERE project_id = $1) as activities`,
        [projectId]
      )

      const result = counts.rows[0]

      const totalEntities = Object.values(result).reduce((sum: number, count: any) => sum + parseInt(count), 0)

      res.json({
        success: true,
        projectId,
        entityCounts: {
          stakeholders: parseInt(result.stakeholders),
          requirements: parseInt(result.requirements),
          risks: parseInt(result.risks),
          milestones: parseInt(result.milestones),
          constraints: parseInt(result.constraints),
          successCriteria: parseInt(result.success_criteria),
          bestPractices: parseInt(result.best_practices),
          phases: parseInt(result.phases),
          resources: parseInt(result.resources),
          qualityStandards: parseInt(result.quality_standards),
          deliverables: parseInt(result.deliverables),
          scopeItems: parseInt(result.scope_items),
          activities: parseInt(result.activities)
        },
        totalEntities
      })
    } catch (error: unknown) {
      logger.error('[EXTRACTION-API] Results fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/project-data-extraction/trigger-baseline
 * Trigger baseline extraction after entity extraction completes
 */
router.post(
  '/trigger-baseline',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.body
      const userId = (req as any).user?.id

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required'
        })
      }

      logger.info('[EXTRACTION-API] Triggering baseline extraction', { projectId, userId })

      // Import baseline queue
      const { baselineQueue } = await import('../services/queueService')

      // Get project name
      const projectResult = await pool!.query('SELECT name FROM projects WHERE id = $1', [projectId])
      const projectName = projectResult.rows[0]?.name || 'Unknown Project'

      // Create baseline job
      const jobResult = await pool!.query(
        `INSERT INTO jobs (
          type, status, data, created_by, project_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          'baseline-extract',
          'pending',
          JSON.stringify({ project_id: projectId, project_name: projectName }),
          userId,
          projectId
        ]
      )

      const jobId = jobResult.rows[0].id

      // Enqueue baseline extraction
      await baselineQueue.add('baseline-extract', {
        jobId,
        userId,
        project_id: projectId,
        project_name: projectName
      })

      res.json({
        success: true,
        jobId,
        message: 'Baseline extraction triggered'
      })
    } catch (error: unknown) {
      logger.error('[EXTRACTION-API] Baseline trigger failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

export default router

