/**
 * Escalation Management Routes
 * TASK-742: Escalation matrix based on severity
 * 
 * API endpoints for managing escalation alerts and configuration
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateQuery } from '../middleware/validation'
import { escalationService } from '../services/escalationService'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'

const router = express.Router()

/**
 * GET /api/escalation/alerts
 * Get escalation alerts for a project
 */
router.get(
  '/alerts',
  authenticateToken,
  requirePermission('projects.view'),
  validateQuery(
    Joi.object({
      projectId: Joi.string().uuid().required(),
      status: Joi.string().valid('pending', 'notified', 'acknowledged', 'in_progress', 'resolved', 'expired').optional()
    })
  ),
  async (req, res) => {
    try {
      const { projectId, status } = req.query

      logger.info('[ESCALATION-API] Fetching alerts', {
        projectId,
        status,
        userId: req.user?.id
      })

      let query = 'SELECT * FROM escalation_alerts WHERE project_id = $1'
      const params: any[] = [projectId]

      if (status) {
        query += ' AND status = $2'
        params.push(status)
      }

      query += ' ORDER BY created_at DESC'

      const result = await pool.query(query, params)

      res.json({
        success: true,
        alerts: result.rows,
        count: result.rows.length
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error fetching alerts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch escalation alerts'
      })
    }
  }
)

/**
 * GET /api/escalation/alerts/:id
 * Get a specific escalation alert with history
 */
router.get(
  '/alerts/:id',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { id } = req.params

      logger.info('[ESCALATION-API] Fetching alert details', {
        alertId: id,
        userId: req.user?.id
      })

      // Get alert
      const alertResult = await pool.query(
        'SELECT * FROM escalation_alerts WHERE id = $1',
        [id]
      )

      if (alertResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }

      // Get alert history
      const historyResult = await pool.query(
        `SELECT * FROM escalation_alert_history 
         WHERE alert_id = $1 
         ORDER BY performed_at DESC`,
        [id]
      )

      res.json({
        success: true,
        alert: alertResult.rows[0],
        history: historyResult.rows
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error fetching alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert details'
      })
    }
  }
)

/**
 * POST /api/escalation/alerts/:id/acknowledge
 * Acknowledge an escalation alert
 */
router.post(
  '/alerts/:id/acknowledge',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      notes: Joi.string().optional()
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params
      const { notes } = req.body
      const userId = req.user?.id

      logger.info('[ESCALATION-API] Acknowledging alert', {
        alertId: id,
        userId
      })

      await escalationService.acknowledgeAlert(id, userId!, notes)

      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error acknowledging alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      })
    }
  }
)

/**
 * POST /api/escalation/alerts/:id/resolve
 * Resolve an escalation alert
 */
router.post(
  '/alerts/:id/resolve',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      notes: Joi.string().required()
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params
      const { notes } = req.body
      const userId = req.user?.id

      logger.info('[ESCALATION-API] Resolving alert', {
        alertId: id,
        userId
      })

      await escalationService.resolveAlert(id, userId!, notes)

      res.json({
        success: true,
        message: 'Alert resolved successfully'
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error resolving alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      })
    }
  }
)

/**
 * GET /api/escalation/rules
 * Get escalation matrix rules
 */
router.get(
  '/rules',
  authenticateToken,
  requirePermission('system.view'),
  async (req, res) => {
    try {
      const { driftType, isActive } = req.query

      logger.info('[ESCALATION-API] Fetching escalation rules', {
        driftType,
        isActive,
        userId: req.user?.id
      })

      const driftTypeFilter = typeof driftType === 'string' && driftType.trim().length > 0 ? driftType.trim() : null
      const isActiveFilter = isActive === undefined ? null : isActive === 'true'

      const result = await pool.query(
        `
        SELECT *
        FROM escalation_matrix
        WHERE ($1::text IS NULL OR drift_type = $1)
          AND ($2::boolean IS NULL OR is_active = $2)
        ORDER BY drift_type, priority DESC, threshold_min ASC
        `,
        [driftTypeFilter, isActiveFilter]
      )

      res.json({
        success: true,
        rules: result.rows,
        count: result.rows.length
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error fetching rules:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch escalation rules'
      })
    }
  }
)

/**
 * POST /api/escalation/rules
 * Create a new escalation rule (admin only)
 */
router.post(
  '/rules',
  authenticateToken,
  requirePermission('system.admin'),
  validate(
    Joi.object({
      ruleName: Joi.string().required(),
      driftType: Joi.string().valid('budget_overrun', 'scope_creep', 'timeline_delay', 'quality_degradation', 'technical_drift', 'resource_drift').required(),
      thresholdMin: Joi.number().min(0).required(),
      thresholdMax: Joi.number().min(0).optional().allow(null),
      severityLevel: Joi.string().valid('warning', 'high', 'critical', 'emergency').required(),
      escalateTo: Joi.array().items(Joi.string()).required(),
      deadlineHours: Joi.number().min(1).required(),
      channels: Joi.array().items(Joi.string().valid('email', 'slack', 'sms', 'dashboard', 'meeting')).required(),
      autoCreateCr: Joi.boolean().default(false),
      requireMeeting: Joi.boolean().default(false),
      description: Joi.string().optional(),
      priority: Joi.number().default(0)
    })
  ),
  async (req, res) => {
    try {
      const userId = req.user?.id
      const {
        ruleName,
        driftType,
        thresholdMin,
        thresholdMax,
        severityLevel,
        escalateTo,
        deadlineHours,
        channels,
        autoCreateCr,
        requireMeeting,
        description,
        priority
      } = req.body

      logger.info('[ESCALATION-API] Creating escalation rule', {
        ruleName,
        driftType,
        userId
      })

      const result = await pool.query(
        `INSERT INTO escalation_matrix (
          rule_name, drift_type, threshold_min, threshold_max, severity_level,
          escalate_to, deadline_hours, channels, auto_create_cr, require_meeting,
          description, priority, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          ruleName,
          driftType,
          thresholdMin,
          thresholdMax,
          severityLevel,
          JSON.stringify(escalateTo),
          deadlineHours,
          JSON.stringify(channels),
          autoCreateCr,
          requireMeeting,
          description,
          priority,
          userId
        ]
      )

      res.status(201).json({
        success: true,
        rule: result.rows[0]
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error creating rule:', error)
      
      if ((error as any).code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'A rule with this name already exists'
        })
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create escalation rule'
      })
    }
  }
)

/**
 * PUT /api/escalation/rules/:id
 * Update an escalation rule (admin only)
 */
router.put(
  '/rules/:id',
  authenticateToken,
  requirePermission('system.admin'),
  validate(
    Joi.object({
      isActive: Joi.boolean().optional(),
      escalateTo: Joi.array().items(Joi.string()).optional(),
      deadlineHours: Joi.number().min(1).optional(),
      channels: Joi.array().items(Joi.string()).optional(),
      autoCreateCr: Joi.boolean().optional(),
      requireMeeting: Joi.boolean().optional(),
      description: Joi.string().optional(),
      priority: Joi.number().optional()
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params
      const updates = req.body

      logger.info('[ESCALATION-API] Updating escalation rule', {
        ruleId: id,
        userId: req.user?.id
      })

      // Build dynamic update query
      const setClauses: string[] = []
      const values: any[] = []
      let paramIndex = 1

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
          
          if (Array.isArray(updates[key])) {
            setClauses.push(`${dbKey} = $${paramIndex}::jsonb`)
            values.push(JSON.stringify(updates[key]))
          } else {
            setClauses.push(`${dbKey} = $${paramIndex}`)
            values.push(updates[key])
          }
          paramIndex++
        }
      })

      if (setClauses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No updates provided'
        })
      }

      setClauses.push(`updated_at = NOW()`)
      values.push(id)

      const query = `
        UPDATE escalation_matrix 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await pool.query(query, values)

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found'
        })
      }

      res.json({
        success: true,
        rule: result.rows[0]
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error updating rule:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update escalation rule'
      })
    }
  }
)

/**
 * DELETE /api/escalation/rules/:id
 * Delete an escalation rule (admin only)
 */
router.delete(
  '/rules/:id',
  authenticateToken,
  requirePermission('system.admin'),
  async (req, res) => {
    try {
      const { id } = req.params

      logger.info('[ESCALATION-API] Deleting escalation rule', {
        ruleId: id,
        userId: req.user?.id
      })

      const result = await pool.query(
        'DELETE FROM escalation_matrix WHERE id = $1 RETURNING id',
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found'
        })
      }

      res.json({
        success: true,
        message: 'Rule deleted successfully'
      })
    } catch (error) {
      logger.error('[ESCALATION-API] Error deleting rule:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete escalation rule'
      })
    }
  }
)

export default router
