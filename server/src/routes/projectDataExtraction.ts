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
import { PMBOK_DOMAINS } from '@/types/pmbok'
import { listDomainExtractionConfigs } from '@/modules/context'

const router = express.Router()

/**
 * GET /api/project-data-extraction/domains
 * Returns available PMBOK 8 domain extraction configs (metadata + prompts)
 */
router.get(
  '/domains',
  authenticateToken,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const domains = listDomainExtractionConfigs()
      res.json({
        success: true,
        domains
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * POST /api/project-data-extraction/extract
 * Trigger AI-powered entity extraction for a project
 */
const extractSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  aiProvider: Joi.string().valid('openai', 'google', 'azure', 'anthropic', 'deepseek', 'moonshot', 'xai', 'mistral', 'groq', 'ollama').optional(),
  aiModel: Joi.string().optional(),
  documentIds: Joi.array().items(Joi.string().uuid()).optional(),
  domains: Joi.array()
    .items(Joi.string().valid(...PMBOK_DOMAINS))
    .max(PMBOK_DOMAINS.length)
    .optional()
})

router.post(
  '/extract',
  authenticateToken,
  validate(extractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, aiProvider, aiModel, documentIds, domains } = req.body
      const userId = (req as any).user?.id
      const normalizedDomains: string[] =
        Array.isArray(domains) && domains.length > 0
          ? Array.from(new Set(domains))
          : [...PMBOK_DOMAINS]

      logger.info('[EXTRACTION-API] Extraction requested', {
        projectId,
        userId,
        provider: aiProvider || 'default',
        domains: normalizedDomains
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
          JSON.stringify({ projectId, aiProvider, aiModel, documentIds, domains: normalizedDomains }),
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
        documentIds,
        domains: normalizedDomains
      })

      logger.info('[EXTRACTION-API] Extraction job enqueued', { jobId, projectId })

      res.json({
        success: true,
        jobId,
        message: 'Project data extraction started. This may take a few minutes.',
        estimatedTime: '2-5 minutes',
        domains: normalizedDomains
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
 * GET /api/project-data-extraction/:projectId/summary
 * Get extraction summary with PMBOK 8 domain counts for a project
 * NOTE: Must be defined BEFORE /status/:jobId to avoid route conflicts
 */
router.get(
  '/:projectId/summary',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.id
      
      logger.info('[EXTRACTION-SUMMARY-API] Request received', {
        projectId,
        userId
      })
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(projectId)) {
        logger.warn('[EXTRACTION-SUMMARY-API] Invalid project ID format', { projectId })
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID format'
        })
      }

      // SECURITY: Verify user has access to this project
      // Super admin can access all projects
      // Admin can access projects from their company
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      if (isSuperAdmin) {
        // Super admin can access any project - verify project exists
        const projectCheck = await pool!.query(
          'SELECT id FROM projects WHERE id = $1',
          [projectId]
        )
        if (projectCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found'
          })
        }
      } else if (isAdmin) {
        // Admin can access projects from their company
        const userCompanyId = (req as any).user?.company_id
        if (userCompanyId) {
          const projectCheck = await pool!.query(
            'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
            [projectId, userCompanyId]
          )
          if (projectCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              error: 'Access denied to project'
            })
          }
        } else {
          // Admin with no company_id - fall back to ownership check
          const projectCheck = await pool!.query(
            `SELECT p.id FROM projects p
             WHERE p.id = $1 AND (p.owner_id = $2 OR p.created_by = $2)`,
            [projectId, userId]
          )
          if (projectCheck.rows.length === 0) {
            return res.status(403).json({
              success: false,
              error: 'Access denied to project'
            })
          }
        }
      } else {
        // Non-admin users must be project owner or member
        const accessCheck = await pool!.query(
          `SELECT p.id FROM projects p
           WHERE p.id = $1 AND (p.owner_id = $2 OR p.created_by = $2)`,
          [projectId, userId]
        )
        if (accessCheck.rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this project'
          })
        }
      }

      // Get entity counts for all entity types
      const entityCounts: Record<string, number> = {}
      const entityTypes = [
        { key: 'stakeholders', table: 'stakeholders' },
        { key: 'requirements', table: 'requirements' },
        { key: 'risks', table: 'risks' },
        { key: 'milestones', table: 'milestones' },
        { key: 'constraints', table: 'constraints' },
        { key: 'successCriteria', table: 'success_criteria' },
        { key: 'bestPractices', table: 'best_practices' },
        { key: 'phases', table: 'phases' },
        { key: 'resources', table: 'resources' },
        { key: 'technologies', table: 'technologies' },
        { key: 'qualityStandards', table: 'quality_standards' },
        { key: 'complianceSecurity', table: 'compliance_security' },
        { key: 'deliverables', table: 'deliverables' },
        { key: 'scopeItems', table: 'scope_items' },
        { key: 'activities', table: 'activities' },
        { key: 'teamAgreements', table: 'team_agreements' },
        { key: 'developmentApproaches', table: 'development_approach' },
        { key: 'projectIterations', table: 'project_iterations' },
        { key: 'workItems', table: 'work_items' },
        { key: 'capacityPlans', table: 'capacity_plans' },
        { key: 'performanceMeasurements', table: 'performance_measurements' },
        { key: 'earnedValueMetrics', table: 'earned_value_metrics' },
        { key: 'opportunities', table: 'opportunities' },
        { key: 'riskResponses', table: 'risk_responses' },
        { key: 'performanceActuals', table: 'performance_actuals' }
      ]

      for (const { key, table } of entityTypes) {
        try {
          const result = await pool!.query(
            `SELECT COUNT(*) as count FROM ${table} WHERE project_id = $1`,
            [projectId]
          )
          entityCounts[key] = parseInt(result.rows[0].count) || 0
        } catch (error) {
          // Table might not exist, set count to 0
          logger.debug(`[EXTRACTION-SUMMARY-API] Table ${table} not found or error`, { error })
          entityCounts[key] = 0
        }
      }

      // Calculate PMBOK 8 Performance Domain counts
      const pmbok8DomainCounts = {
        // Stakeholders Performance Domain
        stakeholders: entityCounts.stakeholders || 0,
        
        // Team Performance Domain
        team: entityCounts.teamAgreements || 0,
        
        // Development Approach & Life Cycle Performance Domain
        developmentApproach: entityCounts.developmentApproaches || 0,
        
        // Planning Performance Domain
        planning: (entityCounts.milestones || 0) + (entityCounts.requirements || 0),
        
        // Project Work Performance Domain
        projectWork: (entityCounts.activities || 0) + (entityCounts.workItems || 0),
        
        // Delivery Performance Domain
        delivery: (entityCounts.deliverables || 0) + (entityCounts.successCriteria || 0),
        
        // Measurement Performance Domain
        measurement: (entityCounts.performanceMeasurements || 0) + (entityCounts.earnedValueMetrics || 0) + (entityCounts.performanceActuals || 0),
        
        // Uncertainty Performance Domain
        uncertainty: (entityCounts.risks || 0) + (entityCounts.opportunities || 0) + (entityCounts.riskResponses || 0)
      }

      res.json({
        success: true,
        projectId,
        entityCounts,
        pmbok8DomainCounts,
        totalEntities: Object.values(entityCounts).reduce((sum, count) => sum + count, 0)
      })
    } catch (error: unknown) {
      logger.error('[EXTRACTION-SUMMARY-API] Summary fetch failed', {
        error: error instanceof Error ? error.message : String(error),
        projectId: req.params.projectId
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
      const userRole = (req as any).user?.role?.toLowerCase()

      // SECURITY: Verify user has access to this project
      // Super admin and admin have access to all projects
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      if (isSuperAdmin || isAdmin) {
        // Super admin and admin can access any project - verify project exists
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
        complianceSecurity: 0,
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
        { name: 'compliance_security', key: 'complianceSecurity' },
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
      await baselineQueue.add(
        'baseline-extract',
        {
          jobId,
          userId,
          project_id: projectId,
          project_name: projectName
        },
        { jobId }
      )

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
      // Super admin and admin have access to all projects
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      if (isSuperAdmin || isAdmin) {
        // Super admin and admin can access any project - verify project exists
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

      // Build query with user name joins for created_by and updated_by
      // Special handling for performance_measurements to join with users table
      let query = `SELECT ${tableName}.*`
      const queryParams: any[] = [projectId]
      
      if (tableName === 'performance_measurements') {
        query = `
          SELECT 
            pm.*,
            u1.name as created_by_name,
            u2.name as updated_by_name
          FROM ${tableName} pm
          LEFT JOIN users u1 ON pm.created_by = u1.id
          LEFT JOIN users u2 ON pm.updated_by = u2.id
          WHERE pm.project_id = $1 
          ORDER BY pm.created_at DESC 
          LIMIT $2 OFFSET $3
        `
        queryParams.push(limitNum, offsetNum)
      } else {
        query = `
          SELECT * FROM ${tableName} 
          WHERE project_id = $1 
          ORDER BY created_at DESC 
          LIMIT $2 OFFSET $3
        `
        queryParams.push(limitNum, offsetNum)
      }
      
      const result = await pool!.query(query, queryParams)

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

/**
 * GET /api/project-data-extraction/document/:documentId/entities
 * Get all entities extracted from a specific document (filtered by source_document_id)
 */
router.get(
  '/document/:documentId/entities',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params
      const userId = (req as any).user?.id
      
      logger.info('[DOCUMENT-ENTITIES-API] Request received', {
        documentId,
        userId,
        query: req.query
      })
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(documentId)) {
        logger.warn('[DOCUMENT-ENTITIES-API] Invalid document ID format', { documentId })
        return res.status(400).json({
          success: false,
          error: 'Invalid document ID format'
        })
      }

      // SECURITY: Verify user has access to this document
      const docCheck = await pool!.query(
        `SELECT d.*, p.id as project_id, p.owner_id, p.created_by as project_created_by
         FROM documents d
         LEFT JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
        [documentId]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        })
      }

      const document = docCheck.rows[0]
      const projectId = document.project_id
      const userRole = (req as any).user?.role?.toLowerCase()

      // Check access: Super admin, admin, or project owner
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      if (!isSuperAdmin && !isAdmin) {
        const projectOwnerId = document.owner_id || document.project_created_by
        if (projectOwnerId !== userId) {
          logger.warn('[DOCUMENT-ENTITIES-API] Unauthorized access attempt', {
            documentId,
            userId,
            projectId
          })
          return res.status(403).json({
            success: false,
            error: 'Access denied: You do not have permission to view this document'
          })
        }
      }

      // Map all entity types to their table names
      const entityTypes = [
        { key: 'stakeholders', table: 'stakeholders' },
        { key: 'requirements', table: 'requirements' },
        { key: 'risks', table: 'risks' },
        { key: 'milestones', table: 'milestones' },
        { key: 'constraints', table: 'constraints' },
        { key: 'successCriteria', table: 'success_criteria' },
        { key: 'bestPractices', table: 'best_practices' },
        { key: 'phases', table: 'phases' },
        { key: 'resources', table: 'resources' },
        { key: 'technologies', table: 'technologies' },
        { key: 'qualityStandards', table: 'quality_standards' },
        { key: 'complianceSecurity', table: 'compliance_security' },
        { key: 'deliverables', table: 'deliverables' },
        { key: 'scopeItems', table: 'scope_items' },
        { key: 'activities', table: 'activities' },
        { key: 'teamAgreements', table: 'team_agreements' },
        { key: 'developmentApproaches', table: 'development_approach' },
        { key: 'projectIterations', table: 'project_iterations' },
        { key: 'workItems', table: 'work_items' },
        { key: 'capacityPlans', table: 'capacity_plans' },
        { key: 'performanceMeasurements', table: 'performance_measurements' },
        { key: 'earnedValueMetrics', table: 'earned_value_metrics' },
        { key: 'opportunities', table: 'opportunities' },
        { key: 'riskResponses', table: 'risk_responses' },
        { key: 'performanceActuals', table: 'performance_actuals' }
      ]

      // Fetch entities from all tables filtered by source_document_id
      const allEntities: Record<string, any[]> = {}
      const entityCounts: Record<string, number> = {}

      for (const { key, table } of entityTypes) {
        try {
          // Check if table has source_document_id column
          const columnCheck = await pool!.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = $1 
             AND column_name = 'source_document_id'`,
            [table]
          )

          if (columnCheck.rows.length === 0) {
            // Table doesn't have source_document_id column, skip it
            logger.debug(`[DOCUMENT-ENTITIES-API] Table ${table} does not have source_document_id column, skipping`)
            allEntities[key] = []
            entityCounts[key] = 0
            continue
          }

          // Build query - special handling for performance_measurements
          let query: string
          if (table === 'performance_measurements') {
            query = `
              SELECT 
                pm.*,
                u1.name as created_by_name,
                u2.name as updated_by_name
              FROM ${table} pm
              LEFT JOIN users u1 ON pm.created_by = u1.id
              LEFT JOIN users u2 ON pm.updated_by = u2.id
              WHERE pm.source_document_id = $1
              ORDER BY pm.created_at DESC
            `
          } else {
            query = `
              SELECT * FROM ${table}
              WHERE source_document_id = $1
              ORDER BY created_at DESC
            `
          }

          const result = await pool!.query(query, [documentId])
          allEntities[key] = result.rows
          entityCounts[key] = result.rows.length

          logger.debug(`[DOCUMENT-ENTITIES-API] Fetched ${result.rows.length} ${key} entities`)
        } catch (error: any) {
          // Table might not exist or have errors - log and continue
          logger.warn(`[DOCUMENT-ENTITIES-API] Error fetching ${key} from ${table}:`, error.message)
          allEntities[key] = []
          entityCounts[key] = 0
        }
      }

      const totalEntities = Object.values(entityCounts).reduce((sum, count) => sum + count, 0)

      logger.info('[DOCUMENT-ENTITIES-API] Query completed', {
        documentId,
        totalEntities,
        entityCounts
      })

      res.json({
        success: true,
        documentId,
        projectId,
        documentName: document.name || document.title,
        entities: allEntities,
        entityCounts,
        totalEntities,
        inferredPrimaryDomain: document.inferred_primary_domain || null,
        inferredSecondaryDomains: document.inferred_secondary_domains || [],
      })
    } catch (error: unknown) {
      logger.error('[DOCUMENT-ENTITIES-API] Entity fetch failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId: req.params.documentId
      })
      next(error)
    }
  }
)

export default router

