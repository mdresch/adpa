/**
 * Team Agreements Routes
 * TASK-138: API endpoints for Team Agreements CRUD operations
 * 
 * Endpoints:
 * - GET    /api/team-agreements/project/:projectId - List all agreements for a project
 * - GET    /api/team-agreements/:id - Get single agreement
 * - POST   /api/team-agreements - Create new agreement
 * - PUT    /api/team-agreements/:id - Update agreement
 * - DELETE /api/team-agreements/:id - Delete agreement
 * - POST   /api/team-agreements/:id/adherence - Record adherence score
 * - GET    /api/team-agreements/:id/adherence - Get adherence log
 * - POST   /api/team-agreements/:id/violation - Record violation
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import teamAgreementsService from '../services/teamAgreementsService'
import { pool } from '../database/connection'

const router = express.Router()

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createAgreementSchema = Joi.object({
  project_id: Joi.string().uuid().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().required(),
  category: Joi.string().valid(
    'working_hours',
    'communication',
    'decision_making',
    'conflict_resolution',
    'quality_standards',
    'meeting_norms',
    'code_of_conduct',
    'collaboration_tools',
    'response_times',
    'knowledge_sharing',
    'other'
  ).required(),
  agreed_by: Joi.array().items(Joi.string().uuid()).optional(),
  facilitated_by: Joi.string().uuid().optional(),
  effective_date: Joi.date().iso().required(),
  review_frequency: Joi.string().valid(
    'weekly',
    'bi_weekly',
    'monthly',
    'quarterly',
    'annually',
    'as_needed'
  ).optional(),
  next_review_date: Joi.date().iso().optional(),
  status: Joi.string().valid(
    'draft',
    'active',
    'under_review',
    'revised',
    'deprecated'
  ).optional().default('active'),
  adherence_score: Joi.number().min(1.0).max(10.0).optional(),
  violations_count: Joi.number().integer().min(0).optional().default(0),
  source_document_id: Joi.string().uuid().optional(),
  notes: Joi.string().optional()
})

const updateAgreementSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().optional(),
  category: Joi.string().valid(
    'working_hours',
    'communication',
    'decision_making',
    'conflict_resolution',
    'quality_standards',
    'meeting_norms',
    'code_of_conduct',
    'collaboration_tools',
    'response_times',
    'knowledge_sharing',
    'other'
  ).optional(),
  agreed_by: Joi.array().items(Joi.string().uuid()).optional(),
  facilitated_by: Joi.string().uuid().allow(null).optional(),
  effective_date: Joi.date().iso().optional(),
  review_frequency: Joi.string().valid(
    'weekly',
    'bi_weekly',
    'monthly',
    'quarterly',
    'annually',
    'as_needed'
  ).allow(null).optional(),
  next_review_date: Joi.date().iso().allow(null).optional(),
  status: Joi.string().valid(
    'draft',
    'active',
    'under_review',
    'revised',
    'deprecated'
  ).optional(),
  adherence_score: Joi.number().min(1.0).max(10.0).allow(null).optional(),
  violations_count: Joi.number().integer().min(0).optional(),
  last_violation_date: Joi.date().iso().allow(null).optional(),
  source_document_id: Joi.string().uuid().allow(null).optional(),
  notes: Joi.string().allow(null).optional()
})

const recordAdherenceSchema = Joi.object({
  adherence_score: Joi.number().min(1.0).max(10.0).required(),
  notes: Joi.string().optional()
})

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/team-agreements/project/:projectId
 * Get all team agreements for a project
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const category = req.query.category as string | undefined
      const status = req.query.status as string | undefined

      // Verify project exists and user has access
      const projectResult = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [projectId]
      )

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' })
      }

      const agreements = await teamAgreementsService.getByProject(projectId, {
        category,
        status
      })

      res.json({
        success: true,
        data: agreements,
        count: agreements.length
      })
    } catch (error: any) {
      log.error('[TeamAgreementsAPI] Error getting agreements:', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.projectId
      })
      res.status(500).json({
        success: false,
        error: 'Failed to get team agreements',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
)

/**
 * GET /api/team-agreements/:id
 * Get a single team agreement by ID
 */
router.get(
  '/:id',
  authenticateToken,
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const agreement = await teamAgreementsService.getById(id)

      if (!agreement) {
        return res.status(404).json({
          success: false,
          error: 'Team agreement not found'
        })
      }

      res.json({
        success: true,
        data: agreement
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error getting agreement:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get team agreement'
      })
    }
  }
)

/**
 * POST /api/team-agreements
 * Create a new team agreement
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('projects.update'),
  validate(createAgreementSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      // Verify project exists
      const projectResult = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [req.body.project_id]
      )

      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      const agreement = await teamAgreementsService.create(req.body, userId)

      log.info('[TeamAgreementsAPI] Created agreement', {
        agreementId: agreement.id,
        projectId: agreement.project_id,
        userId
      })

      res.status(201).json({
        success: true,
        data: agreement
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error creating agreement:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create team agreement',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * PUT /api/team-agreements/:id
 * Update an existing team agreement
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  validate(updateAgreementSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Verify agreement exists
      const existing = await teamAgreementsService.getById(id)
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Team agreement not found'
        })
      }

      const agreement = await teamAgreementsService.update(id, req.body)

      log.info('[TeamAgreementsAPI] Updated agreement', {
        agreementId: id,
        userId: (req as any).user?.id
      })

      res.json({
        success: true,
        data: agreement
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error updating agreement:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update team agreement',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * DELETE /api/team-agreements/:id
 * Delete a team agreement
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Verify agreement exists
      const existing = await teamAgreementsService.getById(id)
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Team agreement not found'
        })
      }

      await teamAgreementsService.delete(id)

      log.info('[TeamAgreementsAPI] Deleted agreement', {
        agreementId: id,
        userId: (req as any).user?.id
      })

      res.json({
        success: true,
        message: 'Team agreement deleted successfully'
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error deleting agreement:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete team agreement',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * POST /api/team-agreements/:id/adherence
 * Record adherence score for an agreement
 */
router.post(
  '/:id/adherence',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  validate(recordAdherenceSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      // Verify agreement exists
      const existing = await teamAgreementsService.getById(id)
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Team agreement not found'
        })
      }

      const adherenceLog = await teamAgreementsService.recordAdherence(
        id,
        req.body.adherence_score,
        req.body.notes,
        userId
      )

      log.info('[TeamAgreementsAPI] Recorded adherence', {
        agreementId: id,
        adherenceScore: req.body.adherence_score,
        userId
      })

      res.status(201).json({
        success: true,
        data: adherenceLog
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error recording adherence:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to record adherence',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * GET /api/team-agreements/:id/adherence
 * Get adherence log for an agreement
 */
router.get(
  '/:id/adherence',
  authenticateToken,
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Verify agreement exists
      const existing = await teamAgreementsService.getById(id)
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Team agreement not found'
        })
      }

      const adherenceLog = await teamAgreementsService.getAdherenceLog(id)

      res.json({
        success: true,
        data: adherenceLog,
        count: adherenceLog.length
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error getting adherence log:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get adherence log'
      })
    }
  }
)

/**
 * POST /api/team-agreements/:id/violation
 * Record a violation for an agreement
 */
router.post(
  '/:id/violation',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Verify agreement exists
      const existing = await teamAgreementsService.getById(id)
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Team agreement not found'
        })
      }

      const agreement = await teamAgreementsService.recordViolation(id)

      log.info('[TeamAgreementsAPI] Recorded violation', {
        agreementId: id,
        violationsCount: agreement.violations_count,
        userId: (req as any).user?.id
      })

      res.json({
        success: true,
        data: agreement
      })
    } catch (error) {
      log.error('[TeamAgreementsAPI] Error recording violation:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to record violation',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

export default router

