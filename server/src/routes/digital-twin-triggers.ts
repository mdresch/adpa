import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import {
  createTriggerRule,
  getActiveRules,
  getRulesByProject,
  getRuleById,
  deleteTriggerRule,
  updateTriggerRule
} from '../services/digitalTwinTriggerService'
import { logger } from '../utils/logger'

const router = Router()

// GET /api/digital-twin/triggers?projectId=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query
    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({ error: 'Project ID is required' })
      return
    }

    const rules = await getRulesByProject(projectId)
    res.json(rules)
  } catch (error: any) {
    logger.error('Failed to fetch trigger rules', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/digital-twin/triggers
router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, ...input } = req.body

    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' })
      return
    }

    // Basic validation
    if (!input.name || !input.trigger_type) {
      res.status(400).json({ error: 'Name and Trigger Type are required' })
      return
    }

    const rule = await createTriggerRule(projectId, input)
    res.status(201).json(rule)
  } catch (error: any) {
    logger.error('Failed to create trigger rule', { error })
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// GET /api/digital-twin/triggers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const rule = await getRuleById(id)

    if (!rule) {
      res.status(404).json({ error: 'Rule not found' })
      return
    }

    res.json(rule)
  } catch (error: any) {
    logger.error('Failed to fetch trigger rule', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/digital-twin/triggers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const success = await deleteTriggerRule(id)

    if (!success) {
      res.status(404).json({ error: 'Rule not found' })
      return
    }

    res.status(204).send()
  } catch (error: any) {
    logger.error('Failed to delete trigger rule', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
