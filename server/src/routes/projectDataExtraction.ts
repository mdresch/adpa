/**
 * Project Data Extraction API Routes
 * AI-powered extraction of structured entities from project documents
 */

import express, { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { authenticateToken } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { extractionQueue } from '../services/queueService'

const router = express.Router()

/**
 * POST /api/project-data-extraction/extract
 * Trigger AI-powered entity extraction for a project
 */
const extractSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  aiProvider: Joi.string().valid('openai', 'google', 'azure', 'anthropic', 'deepseek', 'moonshot', 'xai', 'mistral', 'groq', 'ollama').optional(),
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
      const userId = (req as any).user?.id
      const userRole = (req as any).user?.role

      // SECURITY: Verify user has access to this project
      // Admins have access to all projects
      if (userRole === 'admin') {
        // Admin can access any project - verify project exists
        const projectExists = await pool!.query(
          'SELECT id FROM projects WHERE id = $1',
          [projectId]
        )
        if (projectExists.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          })
        }
      } else {
        // Non-admin users: Check if user is the project owner (owner_id or created_by)
        const projectAccess = await pool!.query(
          `SELECT p.id 
           FROM projects p
           WHERE p.id = $1 
           AND (
             COALESCE(p.owner_id, p.created_by) = $2 
             OR p.created_by = $2
           )
           LIMIT 1`,
          [projectId, userId]
        )

        if (projectAccess.rows.length === 0) {
          logger.warn('[EXTRACTION-API] Unauthorized access attempt to results', {
            projectId,
            userId,
            userRole
          })
          return res.status(403).json({
            success: false,
            error: 'Access denied: You do not have permission to view this project'
          })
        }
      }

      // Initialize counts object - includes PMBOK 8 performance domain entities
      const entityCounts: Record<string, number> = {
        // Legacy entities (PMBOK 7 and earlier)
        stakeholders: 0,
        requirements: 0,
        risks: 0,
        milestones: 0,
        constraints: 0,
        successCriteria: 0,
        bestPractices: 0,
        phases: 0,
        resources: 0,
        technologies: 0,
        qualityStandards: 0,
        deliverables: 0,
        scopeItems: 0,
        activities: 0,
        // PMBOK 8 Performance Domain entities
        teamAgreements: 0,
        developmentApproaches: 0,
        projectIterations: 0,
        workItems: 0,
        capacityPlans: 0,
        performanceMeasurements: 0,
        earnedValueMetrics: 0,
        opportunities: 0,
        riskResponses: 0
      }

      // Query each table individually to handle missing tables gracefully
      const tables = [
        // Legacy entities
        { name: 'stakeholders', key: 'stakeholders' },
        { name: 'requirements', key: 'requirements' },
        { name: 'risks', key: 'risks' },
        { name: 'milestones', key: 'milestones' },
        { name: 'constraints', key: 'constraints' },
        { name: 'success_criteria', key: 'successCriteria' },
        { name: 'best_practices', key: 'bestPractices' },
        { name: 'phases', key: 'phases' },
        { name: 'resources', key: 'resources' },
        { name: 'technologies', key: 'technologies' },
        { name: 'quality_standards', key: 'qualityStandards' },
        { name: 'deliverables', key: 'deliverables' },
        { name: 'scope_items', key: 'scopeItems' },
        { name: 'activities', key: 'activities' },
        // PMBOK 8 Performance Domain tables
        { name: 'team_agreements', key: 'teamAgreements' },
        { name: 'development_approach', key: 'developmentApproaches' },
        { name: 'project_iterations', key: 'projectIterations' },
        { name: 'work_items', key: 'workItems' },
        { name: 'capacity_plans', key: 'capacityPlans' },
        { name: 'performance_measurements', key: 'performanceMeasurements' },
        { name: 'earned_value_metrics', key: 'earnedValueMetrics' },
        { name: 'opportunities', key: 'opportunities' },
        { name: 'risk_responses', key: 'riskResponses' },
        { name: 'performance_actuals', key: 'performanceActuals' }
      ]

      for (const table of tables) {
        try {
          const result = await pool!.query(
            `SELECT COUNT(*) as count FROM ${table.name} WHERE project_id = $1`,
            [projectId]
          )
          entityCounts[table.key] = parseInt(result.rows[0]?.count || '0')
        } catch (error: unknown) {
          // Table might not exist yet or have different schema
          logger.warn(`[EXTRACTION-API] Could not query table ${table.name}`, {
            error: error instanceof Error ? error.message : String(error)
          })
          entityCounts[table.key] = 0
        }
      }

      const totalEntities = Object.values(entityCounts).reduce((sum, count) => sum + count, 0)

      // Calculate PMBOK 8 domain coverage metrics
      const pmbok8DomainCounts = {
        team: entityCounts.teamAgreements,
        developmentApproach: entityCounts.developmentApproaches,
        projectWork: entityCounts.workItems + entityCounts.projectIterations + entityCounts.capacityPlans,
        measurement: entityCounts.performanceMeasurements + entityCounts.earnedValueMetrics + entityCounts.performanceActuals,
        uncertainty: entityCounts.opportunities + entityCounts.riskResponses
      }

      const pmbok8Total = Object.values(pmbok8DomainCounts).reduce((sum, count) => sum + count, 0)

      res.json({
        success: true,
        projectId,
        entityCounts,
        totalEntities,
        pmbok8DomainCounts,
        pmbok8Total,
        domainCoverage: {
          team: pmbok8DomainCounts.team > 0,
          developmentApproach: pmbok8DomainCounts.developmentApproach > 0,
          projectWork: pmbok8DomainCounts.projectWork > 0,
          measurement: pmbok8DomainCounts.measurement > 0,
          uncertainty: pmbok8DomainCounts.uncertainty > 0
        }
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

/**
 * GET /api/project-data-extraction/entities/:projectId/:entityType
 * Get detailed entities of a specific type for a project
 */
router.get(
  '/entities/:projectId/:entityType',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, entityType } = req.params
      const userId = (req as any).user?.id
      
      logger.info('[ENTITY-DETAILS-API] Request received', {
        projectId,
        entityType,
        userId,
        query: req.query
      })
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(projectId)) {
        logger.warn('[ENTITY-DETAILS-API] Invalid project ID format', { projectId })
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID format'
        })
      }

      // SECURITY: Verify user has access to this project
      // Admins have access to all projects
      const userRole = (req as any).user?.role
      if (userRole === 'admin') {
        // Admin can access any project - verify project exists
        const projectExists = await pool!.query(
          'SELECT id FROM projects WHERE id = $1',
          [projectId]
        )
        if (projectExists.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          })
        }
      } else {
        // Non-admin users: Check if user is the project owner (owner_id or created_by)
        const projectAccess = await pool!.query(
          `SELECT p.id 
           FROM projects p
           WHERE p.id = $1 
           AND (
             COALESCE(p.owner_id, p.created_by) = $2 
             OR p.created_by = $2
           )
           LIMIT 1`,
          [projectId, userId]
        )

        if (projectAccess.rows.length === 0) {
          logger.warn('[EXTRACTION-API] Unauthorized access attempt', {
            projectId,
            userId,
            entityType,
            userRole
          })
          return res.status(403).json({
            success: false,
            error: 'Access denied: You do not have permission to view this project'
          })
        }
      }

      // Validate and sanitize pagination parameters
      const limitParam = req.query.limit as string | undefined
      const offsetParam = req.query.offset as string | undefined
      
      const limitNum = limitParam ? parseInt(limitParam, 10) : 100
      const offsetNum = offsetParam ? parseInt(offsetParam, 10) : 0
      
      // Validate parsed numbers
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit parameter (must be 1-1000)'
        })
      }
      
      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid offset parameter (must be >= 0)'
        })
      }

      // Map entity type to table name
      const tableMap: Record<string, string> = {
        // Legacy entities (PMBOK 7 and earlier)
        stakeholders: 'stakeholders',
        requirements: 'requirements',
        risks: 'risks',
        milestones: 'milestones',
        constraints: 'constraints',
        successCriteria: 'success_criteria',
        bestPractices: 'best_practices',
        phases: 'phases',
        resources: 'resources',
        technologies: 'technologies',
        qualityStandards: 'quality_standards',
        deliverables: 'deliverables',
        scopeItems: 'scope_items',
        activities: 'activities',
        // PMBOK 8 Performance Domain entities
        teamAgreements: 'team_agreements',
        developmentApproaches: 'development_approach', // Note: singular table name
        projectIterations: 'project_iterations',
        workItems: 'work_items',
        capacityPlans: 'capacity_plans',
        performanceMeasurements: 'performance_measurements',
        earnedValueMetrics: 'earned_value_metrics',
        opportunities: 'opportunities',
        riskResponses: 'risk_responses',
        performanceActuals: 'performance_actuals'
      }

      const tableName = tableMap[entityType]
      if (!tableName) {
        return res.status(400).json({
          success: false,
          error: `Invalid entity type: ${entityType}`
        })
      }

      // Get total count
      const countResult = await pool!.query(
        `SELECT COUNT(*) as total FROM ${tableName} WHERE project_id = $1`,
        [projectId]
      )
      const total = parseInt(countResult.rows[0]?.total || '0')

      // Get entities with pagination (using validated numbers)
      const result = await pool!.query(
        `SELECT * FROM ${tableName} 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [projectId, limitNum, offsetNum]
      )

      logger.info('[ENTITY-DETAILS-API] Query completed', {
        entityType,
        tableName,
        rowCount: result.rows.length,
        total,
        limit: limitNum,
        offset: offsetNum
      })

      res.json({
        success: true,
        entityType,
        entities: result.rows,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: total > offsetNum + limitNum
        }
      })
    } catch (error: unknown) {
      logger.error('[EXTRACTION-API] Entity fetch failed', {
        error: error instanceof Error ? error.message : String(error),
        entityType: req.params.entityType
      })
      next(error)
    }
  }
)

export default router

