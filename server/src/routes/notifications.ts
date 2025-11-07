import express, { Request, Response } from 'express'
import { pool } from "../database/connection"
import { authenticateToken } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import { initializeNotificationService, getNotificationService } from "../services/notificationService"
import { body, param, query, validationResult } from 'express-validator'

const router = express.Router()

// Initialize service
try {
  initializeNotificationService(pool)
} catch (e) {
  logger.warn('NotificationService init skipped:', (e as any)?.message || e)
}

const validate = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    next()
}

// POST /send - send notification
router.post(
    '/send',
    authenticateToken,
    [
        body('notification_type').isString().notEmpty(),
        body('reference_type').isString().notEmpty(),
        body('reference_id').isString().notEmpty(),
        body('recipients').isArray().notEmpty(),
        body('recipients.*.channel').isIn(['email', 'slack', 'teams', 'sms']),
        body('recipients.*.destination').isString().notEmpty(),
        body('variables').optional().isObject(),
    ],
    validate,
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const notificationService = getNotificationService()
            const results = await notificationService.sendNotification(req.body)
            res.json({ success: true, results })
        } catch (error) {
            log.error('Send notification failed:', error)
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        }
    }
)

// GET /channels/status - channel list with configured status
router.get('/channels/status', authenticateToken, async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const svc = getNotificationService()
    const channelStatus = svc.getChannelStatus()

    const q = `SELECT id, name, display_name, is_enabled FROM notification_channels ORDER BY created_at`
    const result = await pool.query(q)

    const channels = result.rows.map((c: any) => ({ ...c, is_configured: !!channelStatus[c.name] }))
    res.json({ success: true, channels })
  } catch (error) {
    log.error('Get channels status error:', error)
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// GET /templates - list templates filtered by type/channel
router.get('/templates', authenticateToken, async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { notification_type, channel } = req.query
    const params: any[] = []
    let idx = 0
    let q = `SELECT nt.* FROM notification_templates nt JOIN notification_channels nc ON nt.channel_id = nc.id WHERE 1=1`

    if (notification_type) {
      idx++
      q += ` AND nt.notification_type = $${idx}`
      params.push(notification_type)
    }

    if (channel) {
      idx++
      q += ` AND nc.name = $${idx}`
      params.push(channel)
    }

    q += ` ORDER BY nt.created_at DESC`

    const result = await pool.query(q, params)
    res.json({ templates: result.rows })
  } catch (error) {
    log.error('List templates error:', error)
    res.status(500).json({ error: 'Failed to list templates' })
  }
})

export default router
