/**
 * Knowledge Base API Routes
 * CR-2026-001 Phase 3: Knowledge Base Integration
 */

import express, { Request, Response } from 'express'
import { knowledgeBaseService } from '../services/knowledgeBaseService'
import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * GET /api/knowledge-base/entries
 * Search knowledge base entries
 */
router.get('/entries', async (req: Request, res: Response) => {
  try {
    const {
      query,
      entry_type,
      category,
      tags,
      min_business_value,
      replicable_only,
      limit,
      offset
    } = req.query

    const searchParams = {
      query: query as string,
      entry_type: entry_type as string,
      category: category as string,
      tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
      min_business_value: min_business_value ? parseFloat(min_business_value as string) : undefined,
      replicable_only: replicable_only === 'true',
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    }

    const result = await knowledgeBaseService.search(searchParams)

    res.json({
      success: true,
      data: result.entries,
      pagination: {
        total: result.total,
        limit: searchParams.limit,
        offset: searchParams.offset,
        has_more: (searchParams.offset + searchParams.limit) < result.total
      }
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error searching entries', { error: error.message })
    res.status(500).json({
      success: false,
      error: 'Failed to search knowledge base entries',
      message: error.message
    })
  }
})

/**
 * GET /api/knowledge-base/entries/:id
 * Get a specific knowledge base entry
 */
router.get('/entries/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const result = await knowledgeBaseService.search({
      limit: 1,
      offset: 0
    })

    const entry = result.entries.find(e => e.id === id)

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base entry not found'
      })
    }

    res.json({
      success: true,
      data: entry
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error getting entry', { error: error.message, entryId: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge base entry',
      message: error.message
    })
  }
})

/**
 * POST /api/knowledge-base/entries
 * Create a new knowledge base entry
 */
router.post('/entries', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }

    const entry = {
      ...req.body,
      created_by: userId
    }

    const result = await knowledgeBaseService.createEntry(entry)

    res.status(201).json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error creating entry', { error: error.message })
    res.status(500).json({
      success: false,
      error: 'Failed to create knowledge base entry',
      message: error.message
    })
  }
})

/**
 * POST /api/knowledge-base/entries/from-drift
 * Create a knowledge base entry from a drift detection
 */
router.post('/entries/from-drift', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }

    const { drift_id, project_id, overrides } = req.body

    if (!drift_id || !project_id) {
      return res.status(400).json({
        success: false,
        error: 'drift_id and project_id are required'
      })
    }

    const result = await knowledgeBaseService.createFromDrift(
      drift_id,
      project_id,
      userId,
      overrides
    )

    res.status(201).json({
      success: true,
      data: result,
      message: 'Knowledge base entry created from drift detection'
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error creating entry from drift', { error: error.message })
    res.status(500).json({
      success: false,
      error: 'Failed to create knowledge base entry from drift',
      message: error.message
    })
  }
})

/**
 * GET /api/knowledge-base/recommendations/:projectId
 * Get AI-generated recommendations for a project
 */
router.get('/recommendations/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

    const recommendations = await knowledgeBaseService.getRecommendationsForProject(
      projectId,
      limit
    )

    res.json({
      success: true,
      data: recommendations
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error getting recommendations', { 
      error: error.message,
      projectId: req.params.projectId
    })
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge base recommendations',
      message: error.message
    })
  }
})

/**
 * POST /api/knowledge-base/applications
 * Apply a knowledge base entry to a project
 */
router.post('/applications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }

    const { entry_id, project_id, context } = req.body

    if (!entry_id || !project_id) {
      return res.status(400).json({
        success: false,
        error: 'entry_id and project_id are required'
      })
    }

    const result = await knowledgeBaseService.applyToProject(
      entry_id,
      project_id,
      userId,
      context
    )

    res.status(201).json({
      success: true,
      data: result,
      message: 'Knowledge base entry applied to project'
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error applying entry', { error: error.message })
    res.status(500).json({
      success: false,
      error: 'Failed to apply knowledge base entry',
      message: error.message
    })
  }
})

/**
 * PUT /api/knowledge-base/applications/:id/outcome
 * Update the outcome of a knowledge base application
 */
router.put('/applications/:id/outcome', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { success, actual_cost_impact, actual_time_impact_days, actual_quality_impact_percentage, notes } = req.body

    if (typeof success !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'success (boolean) is required'
      })
    }

    await knowledgeBaseService.updateApplicationOutcome(id, {
      success,
      actual_cost_impact,
      actual_time_impact_days,
      actual_quality_impact_percentage,
      notes
    })

    res.json({
      success: true,
      message: 'Application outcome updated successfully'
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error updating application outcome', { 
      error: error.message,
      applicationId: req.params.id
    })
    res.status(500).json({
      success: false,
      error: 'Failed to update application outcome',
      message: error.message
    })
  }
})

/**
 * GET /api/knowledge-base/stats
 * Get knowledge base statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get total count
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM knowledge_base_entries WHERE archived = FALSE'
    )

    // Get category distribution using aggregation
    const categoryResult = await pool.query(
      `SELECT category, COUNT(*) as count 
       FROM knowledge_base_entries 
       WHERE archived = FALSE 
       GROUP BY category 
       ORDER BY count DESC`
    )

    // Get type distribution using aggregation
    const typeResult = await pool.query(
      `SELECT entry_type, COUNT(*) as count 
       FROM knowledge_base_entries 
       WHERE archived = FALSE 
       GROUP BY entry_type 
       ORDER BY count DESC`
    )

    const categoryDistribution: Record<string, number> = {}
    categoryResult.rows.forEach(row => {
      categoryDistribution[row.category] = parseInt(row.count)
    })

    const typeDistribution: Record<string, number> = {}
    typeResult.rows.forEach(row => {
      typeDistribution[row.entry_type] = parseInt(row.count)
    })

    res.json({
      success: true,
      data: {
        total_entries: parseInt(totalResult.rows[0].total),
        category_distribution: categoryDistribution,
        type_distribution: typeDistribution
      }
    })
  } catch (error: any) {
    logger.error('[KNOWLEDGE-BASE-API] Error getting stats', { error: error.message })
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge base statistics',
      message: error.message
    })
  }
})

export default router
