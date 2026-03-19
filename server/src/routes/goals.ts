/**
 * Project Goal Routes
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import * as goalService from '../services/goalService'

const router = express.Router()

/**
 * GET /api/goals/project/:projectId
 * Get all goals for a project
 */
router.get('/project/:projectId',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const goals = await goalService.getProjectGoals(req.params.projectId)
      res.json({ success: true, data: goals })
    } catch (error) {
      log.error('Failed to get project goals', error)
      res.status(500).json({ error: 'Failed to get goals' })
    }
  }
)

/**
 * GET /api/goals/:id
 * Get goal by ID (including milestones)
 */
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const goal = await goalService.getGoalById(req.params.id)
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' })
      }
      res.json({ success: true, data: goal })
    } catch (error) {
      log.error('Failed to get goal', error)
      res.status(500).json({ error: 'Failed to get goal' })
    }
  }
)

/**
 * POST /api/goals
 * Create new goal
 */
router.post('/',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    projectId: Joi.string().uuid().required(),
    goalName: Joi.string().max(255).required(),
    description: Joi.string().allow('', null).optional(),
    targetDate: Joi.date().optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    milestones: Joi.array().items(Joi.object({
      milestoneName: Joi.string().required(),
      description: Joi.string().allow('', null).optional(),
      targetDate: Joi.date().optional()
    })).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      
      // Map goalName to title for the service layer
      const goalInput = {
        ...req.body,
        title: req.body.goalName
      }
      
      const goal = await goalService.createGoal(goalInput, userId)
      res.status(201).json({ success: true, data: goal })
    } catch (error: any) {
      log.error('Error creating goal:', error)
      res.status(500).json({ 
        message: 'Failed to create goal', 
        error: error.message,
        details: error.details || error
      })
    }
  }
)

/**
 * POST /api/goals/:id/decompose
 * AI-driven goal decomposition into tasks
 */
router.post('/:id/decompose',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const result = await goalService.decomposeGoal(req.params.id, userId)
      res.json({ success: true, data: result })
    } catch (error) {
      log.error('Goal decomposition failed', error)
      res.status(500).json({ error: 'Failed to decompose goal' })
    }
  }
)

export default router
