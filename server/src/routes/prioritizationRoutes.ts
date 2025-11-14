/**
 * Prioritization Routes
 * TASK-328: Scoring API endpoints for portfolio prioritization
 * 
 * Endpoints:
 * - GET    /api/prioritization/criteria - List all criteria
 * - POST   /api/prioritization/criteria - Create criterion
 * - GET    /api/prioritization/criteria/:id - Get criterion
 * - PUT    /api/prioritization/criteria/:id - Update criterion
 * - DELETE /api/prioritization/criteria/:id - Delete criterion
 * - GET    /api/prioritization/projects/:projectId/scores - Get project scores
 * - POST   /api/prioritization/scores - Create/update score
 * - PUT    /api/prioritization/scores/:id - Update score
 * - DELETE /api/prioritization/scores/:id - Delete score
 * - GET    /api/prioritization/rankings - Get rankings
 * - GET    /api/prioritization/projects/:projectId/ranking - Get project ranking
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import prioritizationService from '../services/prioritizationService'
import { schemas } from '../middleware/validation'

const router = express.Router()

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createCriterionSchema = Joi.object({
  name: Joi.string().max(255).required(),
  weight: Joi.number().min(0).max(100).required(),
  description: Joi.string().allow('', null).optional(),
  scale_min: Joi.number().integer().min(1).optional().default(1),
  scale_max: Joi.number().integer().min(1).optional().default(5),
  is_inverted: Joi.boolean().optional().default(false),
  sort_order: Joi.number().integer().optional(),
  organization_id: Joi.string().uuid().optional(),
})

const updateCriterionSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  weight: Joi.number().min(0).max(100).optional(),
  description: Joi.string().allow('', null).optional(),
  scale_min: Joi.number().integer().min(1).optional(),
  scale_max: Joi.number().integer().min(1).optional(),
  is_inverted: Joi.boolean().optional(),
  sort_order: Joi.number().integer().optional(),
  is_active: Joi.boolean().optional(),
})

const createScoreSchema = Joi.object({
  project_id: schemas.uuid.required(),
  criteria_id: schemas.uuid.required(),
  raw_score: Joi.number().integer().min(1).max(5).required(),
  justification: Joi.string().allow('', null).optional(),
})

const savePairwiseComparisonSchema = Joi.object({
  program_id: Joi.string().uuid().allow(null).optional(),
  project_rankings: Joi.array().items(
    Joi.object({
      project_id: schemas.uuid.required(),
      priority_score: Joi.number().min(0).max(1).required(),
      rank: Joi.number().integer().min(1).required(),
    })
  ).min(1).required(),
  method: Joi.string().valid('pairwise_comparison').required(),
})

const updateScoreSchema = Joi.object({
  raw_score: Joi.number().integer().min(1).max(5).optional(),
  justification: Joi.string().allow('', null).optional(),
})

// ============================================================================
// CRITERIA ROUTES
// ============================================================================

/**
 * GET /api/prioritization/criteria
 * List all prioritization criteria
 */
router.get('/criteria', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { is_active, organization_id } = req.query

    const criteria = await prioritizationService.getCriteria({
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      organization_id: organization_id as string | undefined,
    })

    res.json({
      success: true,
      data: criteria,
      count: criteria.length,
    })
  } catch (error) {
    log.error('Failed to list criteria', error)
    res.status(500).json({ error: 'Failed to list criteria' })
  }
})

/**
 * POST /api/prioritization/criteria
 * Create a new prioritization criterion
 */
router.post(
  '/criteria',
  authenticateToken,
  requirePermission('prioritization.manage'),
  validate(createCriterionSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const criterion = await prioritizationService.createCriterion(req.body, userId)

      res.status(201).json({
        success: true,
        data: criterion,
        message: 'Criterion created successfully',
      })
    } catch (error) {
      log.error('Failed to create criterion', error)
      res.status(500).json({ error: 'Failed to create criterion' })
    }
  }
)

/**
 * GET /api/prioritization/criteria/:id
 * Get a single criterion by ID
 */
router.get(
  '/criteria/:id',
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const criterion = await prioritizationService.getCriterionById(id)

      if (!criterion) {
        return res.status(404).json({ error: 'Criterion not found' })
      }

      res.json({
        success: true,
        data: criterion,
      })
    } catch (error) {
      log.error('Failed to get criterion', error)
      res.status(500).json({ error: 'Failed to get criterion' })
    }
  }
)

/**
 * PUT /api/prioritization/criteria/:id
 * Update a prioritization criterion
 */
router.put(
  '/criteria/:id',
  authenticateToken,
  requirePermission('prioritization.manage'),
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(updateCriterionSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id

      const criterion = await prioritizationService.updateCriterion(id, req.body, userId)

      if (!criterion) {
        return res.status(404).json({ error: 'Criterion not found' })
      }

      res.json({
        success: true,
        data: criterion,
        message: 'Criterion updated successfully',
      })
    } catch (error) {
      log.error('Failed to update criterion', error)
      res.status(500).json({ error: 'Failed to update criterion' })
    }
  }
)

/**
 * DELETE /api/prioritization/criteria/:id
 * Delete a prioritization criterion
 */
router.delete(
  '/criteria/:id',
  authenticateToken,
  requirePermission('prioritization.manage'),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const deleted = await prioritizationService.deleteCriterion(id)

      if (!deleted) {
        return res.status(404).json({ error: 'Criterion not found' })
      }

      res.json({
        success: true,
        message: 'Criterion deleted successfully',
      })
    } catch (error: any) {
      log.error('Failed to delete criterion', error)
      
      if (error.code === 'CRITERION_IN_USE') {
        return res.status(400).json({ error: error.message })
      }

      res.status(500).json({ error: 'Failed to delete criterion' })
    }
  }
)

// ============================================================================
// SCORE ROUTES
// ============================================================================

/**
 * GET /api/prioritization/projects/:projectId/scores
 * Get all scores for a project
 */
router.get(
  '/projects/:projectId/scores',
  authenticateToken,
  validateParams(Joi.object({ projectId: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params

      const scores = await prioritizationService.getProjectScores(projectId)

      res.json({
        success: true,
        data: scores,
        count: scores.length,
      })
    } catch (error) {
      log.error('Failed to get project scores', error)
      res.status(500).json({ error: 'Failed to get project scores' })
    }
  }
)

/**
 * POST /api/prioritization/scores
 * Create or update a project score (upsert)
 */
router.post(
  '/scores',
  authenticateToken,
  requirePermission('prioritization.score'),
  validate(createScoreSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const score = await prioritizationService.upsertScore(req.body, userId)

      res.status(201).json({
        success: true,
        data: score,
        message: 'Score saved successfully',
      })
    } catch (error: any) {
      log.error('Failed to save score', error)
      
      if (error.code === 'PROJECT_NOT_FOUND') {
        return res.status(404).json({ error: 'Project not found' })
      }
      if (error.code === 'CRITERION_NOT_FOUND') {
        return res.status(404).json({ error: 'Criterion not found' })
      }
      if (error.code === 'INVALID_SCORE') {
        return res.status(400).json({ error: error.message })
      }

      res.status(500).json({ error: 'Failed to save score' })
    }
  }
)

/**
 * PUT /api/prioritization/scores/:id
 * Update a project score
 */
router.put(
  '/scores/:id',
  authenticateToken,
  requirePermission('prioritization.score'),
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(updateScoreSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user?.id

      const score = await prioritizationService.updateScore(id, req.body, userId)

      if (!score) {
        return res.status(404).json({ error: 'Score not found' })
      }

      res.json({
        success: true,
        data: score,
        message: 'Score updated successfully',
      })
    } catch (error: any) {
      log.error('Failed to update score', error)
      
      if (error.code === 'INVALID_SCORE') {
        return res.status(400).json({ error: error.message })
      }

      res.status(500).json({ error: 'Failed to update score' })
    }
  }
)

/**
 * DELETE /api/prioritization/scores/:id
 * Delete a project score
 */
router.delete(
  '/scores/:id',
  authenticateToken,
  requirePermission('prioritization.score'),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const deleted = await prioritizationService.deleteScore(id)

      if (!deleted) {
        return res.status(404).json({ error: 'Score not found' })
      }

      res.json({
        success: true,
        message: 'Score deleted successfully',
      })
    } catch (error) {
      log.error('Failed to delete score', error)
      res.status(500).json({ error: 'Failed to delete score' })
    }
  }
)

// ============================================================================
// RANKING ROUTES
// ============================================================================

/**
 * GET /api/prioritization/rankings
 * Get project rankings (optionally filtered by program)
 */
router.get('/rankings', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { program_id, limit, offset } = req.query

    const result = await prioritizationService.getRankings({
      program_id: program_id as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    })

    res.json({
      success: true,
      data: result.rankings,
      pagination: {
        total: result.total,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      },
    })
  } catch (error) {
    log.error('Failed to get rankings', error)
    res.status(500).json({ error: 'Failed to get rankings' })
  }
})

/**
 * GET /api/prioritization/projects/:projectId/ranking
 * Get ranking for a specific project
 */
router.get(
  '/projects/:projectId/ranking',
  authenticateToken,
  validateParams(Joi.object({ projectId: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params

      const ranking = await prioritizationService.getProjectRanking(projectId)

      if (!ranking) {
        return res.status(404).json({ error: 'Project ranking not found' })
      }

      res.json({
        success: true,
        data: ranking,
      })
    } catch (error) {
      log.error('Failed to get project ranking', error)
      res.status(500).json({ error: 'Failed to get project ranking' })
    }
  }
)

/**
 * POST /api/prioritization/pairwise-comparison
 * Save pairwise comparison results as prioritization scores
 */
router.post(
  '/pairwise-comparison',
  authenticateToken,
  requirePermission('prioritization.score'),
  validate(savePairwiseComparisonSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const result = await prioritizationService.savePairwiseComparisonResults(req.body, userId)

      res.status(201).json({
        success: true,
        data: result,
        message: `Saved ${result.saved} pairwise comparison scores`,
      })
    } catch (error: any) {
      log.error('Failed to save pairwise comparison results', error)
      res.status(500).json({ error: 'Failed to save pairwise comparison results' })
    }
  }
)

export default router

