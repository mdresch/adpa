/**
 * AI Failover Configuration Routes
 * Manage provider priority and failover settings
 */

import express from 'express'
import { pool } from '../database/connection'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import Joi from 'joi'
import { logger, childLogger } from '../utils/logger'

const router = express.Router()

/**
 * GET /api/ai-failover/config
 * Get current failover configuration
 */
router.get('/config',
  authenticateToken,
  requirePermission('ai.configure'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const result = await pool.query(`
        SELECT id, name, provider_type, is_active, priority, configuration
        FROM ai_providers
        ORDER BY priority ASC, name ASC
      `)
      
      res.json({
        success: true,
        providers: result.rows.map(row => ({
          id: row.id,
          name: row.name,
          provider_type: row.provider_type,
          is_active: row.is_active,
          priority: row.priority || 999,
          configuration: row.configuration
        }))
      })
    } catch (error) {
      log.error('Failed to get failover config:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get failover configuration'
      })
    }
  }
)

/**
 * POST /api/ai-failover/update-priorities
 * Update provider priorities for failover
 */
router.post('/update-priorities',
  authenticateToken,
  requirePermission('ai.configure'),
  validate(Joi.object({
    priorities: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        priority: Joi.number().integer().min(1).required()
      })
    ).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { priorities } = req.body
      
      // Update each provider's priority in a transaction
      await pool.query('BEGIN')
      
      for (const item of priorities) {
        await pool.query(
          'UPDATE ai_providers SET priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.priority, item.id]
        )
      }
      
      await pool.query('COMMIT')
      
      log.info(`Updated failover priorities for ${priorities.length} providers`)
      
      res.json({
        success: true,
        message: 'Failover priorities updated successfully'
      })
    } catch (error) {
      await pool.query('ROLLBACK')
      log.error('Failed to update priorities:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update priorities'
      })
    }
  }
)

/**
 * POST /api/ai-failover/toggle-provider
 * Enable/disable a provider for failover
 */
router.post('/toggle-provider/:id',
  authenticateToken,
  requirePermission('ai.configure'),
  validate(Joi.object({
    is_active: Joi.boolean().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { id } = req.params
      const { is_active } = req.body
      
      const result = await pool.query(
        'UPDATE ai_providers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING name',
        [is_active, id]
      )
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found'
        })
      }
      
      log.info(`Provider ${result.rows[0].name} ${is_active ? 'enabled' : 'disabled'} for failover`)
      
      res.json({
        success: true,
        message: `Provider ${is_active ? 'enabled' : 'disabled'} successfully`
      })
    } catch (error) {
      log.error('Failed to toggle provider:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to toggle provider'
      })
    }
  }
)

export default router

