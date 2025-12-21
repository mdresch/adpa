/**
 * Development Approach Routes
 * API endpoints for Development Approach CRUD operations
 * 
 * Endpoints:
 * - GET    /api/projects/:projectId/development-approach - Get approach metadata for a project
 * - POST   /api/projects/:projectId/development-approach - Create/update approach (UPSERT)
 * - PUT    /api/projects/:projectId/development-approach - Update approach
 * - GET    /api/projects/:projectId/development-approach/tailoring - Get tailoring decisions
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import developmentApproachService from '../services/developmentApproachService'
import { pool } from '../database/connection'

const router = express.Router()

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createOrUpdateApproachSchema = Joi.object({
  approach: Joi.string().valid('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative').required(),
  methodology: Joi.string().valid('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom').allow(null).optional(),
  justification: Joi.string().min(10).required(),
  uncertainty_level: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  requirements_stability: Joi.string().valid('stable', 'evolving', 'uncertain').allow(null).optional(),
  stakeholder_engagement_model: Joi.string().allow(null, '').optional(),
  delivery_cadence: Joi.string().valid('single', 'iterative', 'incremental', 'continuous').allow(null).optional(),
  organizational_maturity: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  team_experience_level: Joi.string().valid('junior', 'mixed', 'senior').allow(null).optional(),
  regulatory_constraints: Joi.boolean().allow(null).optional(),
  tailoring_decisions: Joi.array().items(
    Joi.object({
      area: Joi.string().required(),
      standard_process: Joi.string().required(),
      tailored_process: Joi.string().required(),
      justification: Joi.string().required()
    })
  ).optional(),
  life_cycle_phases: Joi.array().items(Joi.string()).optional(),
  iteration_length: Joi.number().integer().positive().allow(null).optional(),
  iteration_unit: Joi.string().valid('days', 'weeks').allow(null).optional(),
  governance_approach: Joi.string().valid('lightweight', 'standard', 'formal').allow(null).optional(),
  review_gates: Joi.array().items(Joi.string()).optional(),
  source_document_id: Joi.string().uuid().allow(null).optional(),
  approved_by: Joi.string().uuid().allow(null).optional(),
  effective_date: Joi.date().iso().allow(null).optional()
})

const updateApproachSchema = Joi.object({
  approach: Joi.string().valid('predictive', 'adaptive', 'hybrid', 'incremental', 'iterative').optional(),
  methodology: Joi.string().valid('waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom').allow(null).optional(),
  justification: Joi.string().min(10).optional(),
  uncertainty_level: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  requirements_stability: Joi.string().valid('stable', 'evolving', 'uncertain').allow(null).optional(),
  stakeholder_engagement_model: Joi.string().allow(null, '').optional(),
  delivery_cadence: Joi.string().valid('single', 'iterative', 'incremental', 'continuous').allow(null).optional(),
  organizational_maturity: Joi.string().valid('low', 'medium', 'high').allow(null).optional(),
  team_experience_level: Joi.string().valid('junior', 'mixed', 'senior').allow(null).optional(),
  regulatory_constraints: Joi.boolean().allow(null).optional(),
  tailoring_decisions: Joi.array().items(
    Joi.object({
      area: Joi.string().required(),
      standard_process: Joi.string().required(),
      tailored_process: Joi.string().required(),
      justification: Joi.string().required()
    })
  ).optional(),
  life_cycle_phases: Joi.array().items(Joi.string()).optional(),
  iteration_length: Joi.number().integer().positive().allow(null).optional(),
  iteration_unit: Joi.string().valid('days', 'weeks').allow(null).optional(),
  governance_approach: Joi.string().valid('lightweight', 'standard', 'formal').allow(null).optional(),
  review_gates: Joi.array().items(Joi.string()).optional(),
  source_document_id: Joi.string().uuid().allow(null).optional(),
  approved_by: Joi.string().uuid().allow(null).optional(),
  effective_date: Joi.date().iso().allow(null).optional()
})

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/projects/:projectId/development-approach
 * Get development approach for a project
 */
router.get(
  '/:projectId/development-approach',
  authenticateToken,
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const userId = (req as any).user!.id

      // Verify user has access to project
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)',
        [projectId, userId]
      )

      if (projectCheck.rows.length === 0) {
        // Check if user is admin
        const user = (req as any).user
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this project'
          })
        }
      }

      const approach = await developmentApproachService.getByProject(projectId)

      if (!approach) {
        return res.status(404).json({
          success: false,
          error: 'Development approach not found for this project'
        })
      }

      log.info('[DEVELOPMENT-APPROACH] Retrieved development approach', { projectId })

      res.json({
        success: true,
        data: approach
      })
    } catch (error: any) {
      log.error('[DEVELOPMENT-APPROACH] Failed to get development approach:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve development approach',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/projects/:projectId/development-approach
 * Create or update development approach (UPSERT - one per project)
 */
router.post(
  '/:projectId/development-approach',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  validate(createOrUpdateApproachSchema),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const userId = (req as any).user!.id

      // Verify user has access to project
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)',
        [projectId, userId]
      )

      if (projectCheck.rows.length === 0) {
        const user = (req as any).user
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this project'
          })
        }
      }

      const approach = await developmentApproachService.createOrUpdate(
        projectId,
        req.body,
        userId
      )

      log.info('[DEVELOPMENT-APPROACH] Created/updated development approach', {
        projectId,
        approach: approach.approach
      })

      res.json({
        success: true,
        data: approach
      })
    } catch (error: any) {
      log.error('[DEVELOPMENT-APPROACH] Failed to create/update development approach:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to save development approach',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/projects/:projectId/development-approach
 * Update development approach (partial update)
 */
router.put(
  '/:projectId/development-approach',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  validate(updateApproachSchema),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const userId = (req as any).user!.id

      // Verify user has access to project
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)',
        [projectId, userId]
      )

      if (projectCheck.rows.length === 0) {
        const user = (req as any).user
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this project'
          })
        }
      }

      const approach = await developmentApproachService.createOrUpdate(
        projectId,
        req.body,
        userId
      )

      log.info('[DEVELOPMENT-APPROACH] Updated development approach', {
        projectId,
        approach: approach.approach
      })

      res.json({
        success: true,
        data: approach
      })
    } catch (error: any) {
      log.error('[DEVELOPMENT-APPROACH] Failed to update development approach:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update development approach',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/projects/:projectId/development-approach/tailoring
 * Get tailoring decisions for a project
 */
router.get(
  '/:projectId/development-approach/tailoring',
  authenticateToken,
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  async (req: express.Request, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const userId = (req as any).user!.id

      // Verify user has access to project
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)',
        [projectId, userId]
      )

      if (projectCheck.rows.length === 0) {
        const user = (req as any).user
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this project'
          })
        }
      }

      const tailoringDecisions = await developmentApproachService.getTailoringDecisions(projectId)

      log.info('[DEVELOPMENT-APPROACH] Retrieved tailoring decisions', {
        projectId,
        count: tailoringDecisions.length
      })

      res.json({
        success: true,
        data: tailoringDecisions
      })
    } catch (error: any) {
      log.error('[DEVELOPMENT-APPROACH] Failed to get tailoring decisions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tailoring decisions',
        message: error.message
      })
    }
  }
)

export default router

