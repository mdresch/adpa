/**
 * OKR Routes
 * TASK-1282: CRUD API endpoints for OKRs and Key Results
 * 
 * Endpoints:
 * OKRs:
 * - GET    /api/okrs - List all OKRs
 * - POST   /api/okrs - Create OKR
 * - GET    /api/okrs/:id - Get OKR by ID
 * - PUT    /api/okrs/:id - Update OKR
 * - DELETE /api/okrs/:id - Delete OKR
 * - GET    /api/okrs/:id/key-results - Get key results for OKR
 * 
 * Key Results:
 * - POST   /api/okrs/:okrId/key-results - Create key result
 * - GET    /api/key-results/:id - Get key result by ID
 * - PUT    /api/key-results/:id - Update key result
 * - DELETE /api/key-results/:id - Delete key result
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import okrService from '../services/okrService'
import { schemas } from '../middleware/validation'

const router = express.Router()

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createOKRSchema = Joi.object({
  organization_id: schemas.uuid.optional(),
  strategic_goal_id: schemas.uuid.optional(),
  parent_okr_id: schemas.uuid.optional(),
  level: Joi.string().valid('organization', 'portfolio', 'program', 'project').required(),
  entity_id: schemas.uuid.optional(),
  entity_type: Joi.string().valid('program', 'project').optional(),
  objective_title: Joi.string().max(255).required(),
  objective_description: Joi.string().allow('', null).optional(),
  objective_category: Joi.string().valid('strategic', 'operational', 'innovation').optional(),
  okr_period: Joi.string().max(50).optional(),
  period_start: Joi.date().iso().optional(),
  period_end: Joi.date().iso().optional(),
  owner_id: schemas.uuid.optional(),
  owner_name: Joi.string().max(255).optional(),
  owner_role: Joi.string().max(100).optional(),
  confidence_level: Joi.number().integer().min(0).max(100).optional(),
  is_stretch_goal: Joi.boolean().optional().default(false),
  priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
})

const updateOKRSchema = Joi.object({
  objective_title: Joi.string().max(255).optional(),
  objective_description: Joi.string().allow('', null).optional(),
  objective_category: Joi.string().valid('strategic', 'operational', 'innovation').optional(),
  okr_period: Joi.string().max(50).optional(),
  period_start: Joi.date().iso().optional(),
  period_end: Joi.date().iso().optional(),
  owner_id: schemas.uuid.optional(),
  owner_name: Joi.string().max(255).optional(),
  owner_role: Joi.string().max(100).optional(),
  confidence_level: Joi.number().integer().min(0).max(100).optional(),
  progress_percentage: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid('on-track', 'at-risk', 'behind', 'achieved', 'not-started').optional(),
  is_stretch_goal: Joi.boolean().optional(),
  priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
})

const createKeyResultSchema = Joi.object({
  key_result_title: Joi.string().max(255).required(),
  key_result_description: Joi.string().allow('', null).optional(),
  metric_name: Joi.string().max(255).optional(),
  metric_unit: Joi.string().max(50).optional(),
  baseline_value: Joi.number().optional(),
  target_value: Joi.number().required(),
  current_value: Joi.number().optional().default(0),
  stretch_target: Joi.number().optional(),
  measurement_frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly').optional(),
  next_measurement_date: Joi.date().iso().optional(),
  owner_id: schemas.uuid.optional(),
  contributing_projects: Joi.array().items(schemas.uuid).optional(),
})

const updateKeyResultSchema = Joi.object({
  key_result_title: Joi.string().max(255).optional(),
  key_result_description: Joi.string().allow('', null).optional(),
  metric_name: Joi.string().max(255).optional(),
  metric_unit: Joi.string().max(50).optional(),
  baseline_value: Joi.number().optional(),
  target_value: Joi.number().optional(),
  current_value: Joi.number().optional(),
  stretch_target: Joi.number().optional(),
  measurement_frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly').optional(),
  next_measurement_date: Joi.date().iso().optional(),
  owner_id: schemas.uuid.optional(),
  contributing_projects: Joi.array().items(schemas.uuid).optional(),
})

// ============================================================================
// OKR ROUTES
// ============================================================================

/**
 * GET /api/okrs
 * List all OKRs with optional filtering
 */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const {
        level,
        entity_id,
        entity_type,
        parent_okr_id,
        organization_id,
        include_key_results,
      } = req.query

      const okrs = await okrService.getOKRs({
        level: level as 'organization' | 'portfolio' | 'program' | 'project' | undefined,
        entity_id: entity_id as string | undefined,
        entity_type: entity_type as 'program' | 'project' | undefined,
        parent_okr_id: parent_okr_id === 'null' ? null : (parent_okr_id as string | undefined),
        organization_id: organization_id as string | undefined,
        include_key_results: include_key_results === 'true',
      })

      res.json({
        success: true,
        data: okrs,
        count: okrs.length,
      })
    } catch (error: any) {
      log.error('Failed to get OKRs', error)
      res.status(500).json({ error: 'Failed to get OKRs' })
    }
  }
)

/**
 * POST /api/okrs
 * Create a new OKR
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('okrs.create'),
  validate(createOKRSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const okr = await okrService.createOKR(req.body, userId)

      res.status(201).json({
        success: true,
        data: okr,
        message: 'OKR created successfully',
      })
    } catch (error: any) {
      log.error('Failed to create OKR', error)
      res.status(500).json({ error: 'Failed to create OKR' })
    }
  }
)

/**
 * GET /api/okrs/:id
 * Get a single OKR by ID
 */
router.get(
  '/:id',
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const includeKeyResults = req.query.include_key_results === 'true'

      const okr = await okrService.getOKRById(id, includeKeyResults)

      if (!okr) {
        return res.status(404).json({ error: 'OKR not found' })
      }

      res.json({
        success: true,
        data: okr,
      })
    } catch (error: any) {
      log.error('Failed to get OKR', error)
      res.status(500).json({ error: 'Failed to get OKR' })
    }
  }
)

/**
 * PUT /api/okrs/:id
 * Update an OKR
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission('okrs.update'),
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(updateOKRSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const okr = await okrService.updateOKR(id, req.body, userId)

      if (!okr) {
        return res.status(404).json({ error: 'OKR not found' })
      }

      res.json({
        success: true,
        data: okr,
        message: 'OKR updated successfully',
      })
    } catch (error: any) {
      log.error('Failed to update OKR', error)
      res.status(500).json({ error: 'Failed to update OKR' })
    }
  }
)

/**
 * DELETE /api/okrs/:id
 * Delete an OKR (cascades to key results)
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('okrs.delete'),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const deleted = await okrService.deleteOKR(id, userId)

      if (!deleted) {
        return res.status(404).json({ error: 'OKR not found' })
      }

      res.json({
        success: true,
        message: 'OKR deleted successfully',
      })
    } catch (error: any) {
      log.error('Failed to delete OKR', error)
      res.status(500).json({ error: 'Failed to delete OKR' })
    }
  }
)

/**
 * GET /api/okrs/:id/key-results
 * Get all key results for an OKR
 */
router.get(
  '/:id/key-results',
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Verify OKR exists
      const okr = await okrService.getOKRById(id)
      if (!okr) {
        return res.status(404).json({ error: 'OKR not found' })
      }

      const keyResults = await okrService.getKeyResults(id)

      res.json({
        success: true,
        data: keyResults,
        count: keyResults.length,
      })
    } catch (error: any) {
      log.error('Failed to get key results', error)
      res.status(500).json({ error: 'Failed to get key results' })
    }
  }
)

// ============================================================================
// KEY RESULT ROUTES
// ============================================================================

/**
 * POST /api/okrs/:okrId/key-results
 * Create a new key result for an OKR
 */
router.post(
  '/:okrId/key-results',
  authenticateToken,
  requirePermission('okrs.update'),
  validateParams(Joi.object({ okrId: schemas.uuid })),
  validate(createKeyResultSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { okrId } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Verify OKR exists
      const okr = await okrService.getOKRById(okrId)
      if (!okr) {
        return res.status(404).json({ error: 'OKR not found' })
      }

      const keyResult = await okrService.createKeyResult(
        { ...req.body, okr_id: okrId },
        userId
      )

      res.status(201).json({
        success: true,
        data: keyResult,
        message: 'Key result created successfully',
      })
    } catch (error: any) {
      log.error('Failed to create key result', error)
      res.status(500).json({ error: 'Failed to create key result' })
    }
  }
)

/**
 * GET /api/key-results/:id
 * Get a single key result by ID
 */
router.get(
  '/key-results/:id',
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const keyResult = await okrService.getKeyResultById(id)

      if (!keyResult) {
        return res.status(404).json({ error: 'Key result not found' })
      }

      res.json({
        success: true,
        data: keyResult,
      })
    } catch (error: any) {
      log.error('Failed to get key result', error)
      res.status(500).json({ error: 'Failed to get key result' })
    }
  }
)

/**
 * PUT /api/key-results/:id
 * Update a key result
 */
router.put(
  '/key-results/:id',
  authenticateToken,
  requirePermission('okrs.update'),
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(updateKeyResultSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const keyResult = await okrService.updateKeyResult(id, req.body, userId)

      if (!keyResult) {
        return res.status(404).json({ error: 'Key result not found' })
      }

      res.json({
        success: true,
        data: keyResult,
        message: 'Key result updated successfully',
      })
    } catch (error: any) {
      log.error('Failed to update key result', error)
      res.status(500).json({ error: 'Failed to update key result' })
    }
  }
)

/**
 * DELETE /api/key-results/:id
 * Delete a key result
 */
router.delete(
  '/key-results/:id',
  authenticateToken,
  requirePermission('okrs.update'),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const deleted = await okrService.deleteKeyResult(id, userId)

      if (!deleted) {
        return res.status(404).json({ error: 'Key result not found' })
      }

      res.json({
        success: true,
        message: 'Key result deleted successfully',
      })
    } catch (error: any) {
      log.error('Failed to delete key result', error)
      res.status(500).json({ error: 'Failed to delete key result' })
    }
  }
)

export default router

