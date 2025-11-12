/**
 * Email Notification Routes
 * TASK-739: Email notification system
 */

import express, { Request, Response, NextFunction } from 'express'
import { emailNotificationService } from '../services/emailNotificationService'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'

const router = express.Router()

/**
 * Test email configuration
 * POST /api/email-notifications/test
 */
router.post('/test', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can test email configuration'
      })
    }

    const isConfigured = await emailNotificationService.testEmailConfiguration()

    res.json({
      success: isConfigured,
      message: isConfigured 
        ? 'Email configuration is valid and working'
        : 'Email service is not configured or has errors'
    })
  } catch (error) {
    logger.error('[EMAIL-ROUTES] Error testing email configuration:', error)
    next(error)
  }
})

/**
 * Get user email notification preferences
 * GET /api/email-notifications/preferences
 */
router.get('/preferences', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user

    const result = await pool.query(
      'SELECT * FROM email_notification_preferences WHERE user_id = $1',
      [user.id]
    )

    if (result.rows.length === 0) {
      // Create default preferences
      const defaultPrefs = await pool.query(
        `INSERT INTO email_notification_preferences (user_id)
         VALUES ($1)
         RETURNING *`,
        [user.id]
      )
      return res.json({
        success: true,
        data: defaultPrefs.rows[0]
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    logger.error('[EMAIL-ROUTES] Error getting preferences:', error)
    next(error)
  }
})

/**
 * Update user email notification preferences
 * PUT /api/email-notifications/preferences
 */
router.put('/preferences', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user
    const {
      positive_drift_enabled,
      budget_overrun_enabled,
      scope_creep_enabled,
      timeline_delay_enabled,
      quality_degradation_enabled,
      technical_drift_enabled,
      change_request_enabled,
      escalation_alert_enabled,
      general_notification_enabled,
      min_severity_level,
      email_enabled,
      digest_mode,
      digest_time,
      project_filters
    } = req.body

    // Upsert preferences
    const result = await pool.query(
      `INSERT INTO email_notification_preferences (
        user_id,
        positive_drift_enabled,
        budget_overrun_enabled,
        scope_creep_enabled,
        timeline_delay_enabled,
        quality_degradation_enabled,
        technical_drift_enabled,
        change_request_enabled,
        escalation_alert_enabled,
        general_notification_enabled,
        min_severity_level,
        email_enabled,
        digest_mode,
        digest_time,
        project_filters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (user_id)
      DO UPDATE SET
        positive_drift_enabled = EXCLUDED.positive_drift_enabled,
        budget_overrun_enabled = EXCLUDED.budget_overrun_enabled,
        scope_creep_enabled = EXCLUDED.scope_creep_enabled,
        timeline_delay_enabled = EXCLUDED.timeline_delay_enabled,
        quality_degradation_enabled = EXCLUDED.quality_degradation_enabled,
        technical_drift_enabled = EXCLUDED.technical_drift_enabled,
        change_request_enabled = EXCLUDED.change_request_enabled,
        escalation_alert_enabled = EXCLUDED.escalation_alert_enabled,
        general_notification_enabled = EXCLUDED.general_notification_enabled,
        min_severity_level = EXCLUDED.min_severity_level,
        email_enabled = EXCLUDED.email_enabled,
        digest_mode = EXCLUDED.digest_mode,
        digest_time = EXCLUDED.digest_time,
        project_filters = EXCLUDED.project_filters,
        updated_at = NOW()
      RETURNING *`,
      [
        user.id,
        positive_drift_enabled ?? true,
        budget_overrun_enabled ?? true,
        scope_creep_enabled ?? true,
        timeline_delay_enabled ?? true,
        quality_degradation_enabled ?? true,
        technical_drift_enabled ?? true,
        change_request_enabled ?? true,
        escalation_alert_enabled ?? true,
        general_notification_enabled ?? true,
        min_severity_level || 'normal',
        email_enabled ?? true,
        digest_mode ?? false,
        digest_time || '09:00:00',
        project_filters ? JSON.stringify(project_filters) : '[]'
      ]
    )

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Email notification preferences updated successfully'
    })
  } catch (error) {
    logger.error('[EMAIL-ROUTES] Error updating preferences:', error)
    next(error)
  }
})

/**
 * Get email notification logs (admin only)
 * GET /api/email-notifications/logs
 */
router.get('/logs', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can view email logs'
      })
    }

    const { page = 1, limit = 50, status, notification_type, severity } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (status) {
      whereConditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (notification_type) {
      whereConditions.push(`notification_type = $${paramIndex}`)
      params.push(notification_type)
      paramIndex++
    }

    if (severity) {
      whereConditions.push(`severity = $${paramIndex}`)
      params.push(severity)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM email_notification_logs ${whereClause}`,
      params
    )

    // Get paginated results
    params.push(Number(limit), offset)
    const result = await pool.query(
      `SELECT 
        id, notification_type, severity, priority,
        recipient_emails, recipient_roles, subject,
        project_id, status, sent_at, created_at
       FROM email_notification_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    })
  } catch (error) {
    logger.error('[EMAIL-ROUTES] Error getting logs:', error)
    next(error)
  }
})

/**
 * Get email notification statistics (admin only)
 * GET /api/email-notifications/stats
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can view email statistics'
      })
    }

    const { days = 30 } = req.query

    const result = await pool.query(
      `SELECT 
        notification_type,
        severity,
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        MIN(created_at) as first_sent,
        MAX(created_at) as last_sent
       FROM email_notification_logs
       WHERE created_at >= NOW() - INTERVAL '${Number(days)} days'
       GROUP BY notification_type, severity, status
       ORDER BY count DESC`,
      []
    )

    // Get overall stats
    const overallResult = await pool.query(
      `SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as total_sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending
       FROM email_notification_logs
       WHERE created_at >= NOW() - INTERVAL '${Number(days)} days'`,
      []
    )

    res.json({
      success: true,
      data: {
        overall: overallResult.rows[0],
        breakdown: result.rows,
        period_days: Number(days)
      }
    })
  } catch (error) {
    logger.error('[EMAIL-ROUTES] Error getting stats:', error)
    next(error)
  }
})

export default router
