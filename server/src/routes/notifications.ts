/**
 * Notification API Routes
 * TASK-741: Multi-channel notifications API
 * 
 * Endpoints:
 * - POST /api/notifications/send - Send notification
 * - GET /api/notifications/preferences/:userId - Get user preferences
 * - POST /api/notifications/preferences - Set user preferences
 * - GET /api/notifications/log - Get notification history
 * - GET /api/notifications/channels/status - Get channel status
 */

import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { getNotificationService } from '../services/notificationService';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// ============================================================================
// Middleware
// ============================================================================

/**
 * Validate request
 */
const validate = (req: Request, res: Response, next: Function) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * Authentication middleware (placeholder - should be replaced with actual auth)
 */
const requireAuth = (req: Request, res: Response, next: Function) => {
    // TODO: Implement actual authentication check
    // For now, we'll assume user is authenticated
    next();
};

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/notifications/send
 * Send notification through specified channels
 */
router.post(
    '/send',
    requireAuth,
    [
        body('notification_type').isString().notEmpty(),
        body('reference_type').isString().notEmpty(),
        body('reference_id').isUUID(),
        body('recipients').isArray().notEmpty(),
        body('recipients.*.channel').isIn(['email', 'slack', 'teams', 'sms']),
        body('recipients.*.destination').isString().notEmpty(),
        body('variables').isObject(),
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const notificationService = getNotificationService();
            const results = await notificationService.sendNotification(req.body);

            res.json({
                success: true,
                results,
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * GET /api/notifications/preferences/:userId
 * Get user notification preferences
 */
router.get(
    '/preferences/:userId',
    requireAuth,
    [param('userId').isUUID()],
    validate,
    async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;
            const { notification_type, project_id } = req.query;

            const pool: Pool = (req.app as any).locals.pool;
            
            const query = `
                SELECT 
                    np.id,
                    np.user_id,
                    np.project_id,
                    nc.name as channel,
                    nc.display_name as channel_display_name,
                    np.notification_type,
                    np.is_enabled,
                    np.destination,
                    np.severity_filter,
                    np.quiet_hours_start,
                    np.quiet_hours_end,
                    np.created_at,
                    np.updated_at
                FROM notification_preferences np
                JOIN notification_channels nc ON np.channel_id = nc.id
                WHERE np.user_id = $1
                  AND ($2::VARCHAR IS NULL OR np.notification_type = $2)
                  AND ($3::UUID IS NULL OR np.project_id = $3)
                ORDER BY nc.sort_order, np.notification_type
            `;
            
            const result = await pool.query(query, [
                userId,
                notification_type || null,
                project_id || null,
            ]);

            res.json({
                success: true,
                preferences: result.rows,
            });
        } catch (error) {
            console.error('Error fetching preferences:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * POST /api/notifications/preferences
 * Set user notification preferences
 */
router.post(
    '/preferences',
    requireAuth,
    [
        body('user_id').isUUID(),
        body('channel').isIn(['email', 'slack', 'teams', 'sms']),
        body('notification_type').isString().notEmpty(),
        body('is_enabled').isBoolean(),
        body('destination').isString().notEmpty(),
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const {
                user_id,
                channel,
                notification_type,
                is_enabled,
                destination,
                project_id,
                severity_filter,
                quiet_hours_start,
                quiet_hours_end,
            } = req.body;

            const pool: Pool = (req.app as any).locals.pool;

            const query = `
                INSERT INTO notification_preferences (
                    user_id, channel_id, notification_type, is_enabled,
                    destination, project_id, severity_filter,
                    quiet_hours_start, quiet_hours_end
                )
                VALUES (
                    $1,
                    (SELECT id FROM notification_channels WHERE name = $2),
                    $3, $4, $5, $6, $7, $8, $9
                )
                ON CONFLICT (user_id, channel_id, notification_type, project_id)
                DO UPDATE SET
                    is_enabled = EXCLUDED.is_enabled,
                    destination = EXCLUDED.destination,
                    severity_filter = EXCLUDED.severity_filter,
                    quiet_hours_start = EXCLUDED.quiet_hours_start,
                    quiet_hours_end = EXCLUDED.quiet_hours_end,
                    updated_at = NOW()
                RETURNING *
            `;

            const result = await pool.query(query, [
                user_id,
                channel,
                notification_type,
                is_enabled,
                destination,
                project_id || null,
                severity_filter || null,
                quiet_hours_start || null,
                quiet_hours_end || null,
            ]);

            res.json({
                success: true,
                preference: result.rows[0],
            });
        } catch (error) {
            console.error('Error saving preference:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * GET /api/notifications/log
 * Get notification history
 */
router.get(
    '/log',
    requireAuth,
    [
        query('project_id').optional().isUUID(),
        query('reference_type').optional().isString(),
        query('reference_id').optional().isUUID(),
        query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'bounced']),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 }),
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const {
                project_id,
                reference_type,
                reference_id,
                status,
                limit = 50,
                offset = 0,
            } = req.query;

            const pool: Pool = (req.app as any).locals.pool;

            const query = `
                SELECT 
                    nl.*,
                    nc.name as channel_name,
                    nc.display_name as channel_display_name,
                    u.email as recipient_email,
                    p.name as project_name
                FROM notification_log nl
                JOIN notification_channels nc ON nl.channel_id = nc.id
                LEFT JOIN users u ON nl.recipient_user_id = u.id
                LEFT JOIN projects p ON nl.project_id = p.id
                WHERE ($1::UUID IS NULL OR nl.project_id = $1)
                  AND ($2::VARCHAR IS NULL OR nl.reference_type = $2)
                  AND ($3::UUID IS NULL OR nl.reference_id = $3)
                  AND ($4::VARCHAR IS NULL OR nl.status = $4)
                ORDER BY nl.created_at DESC
                LIMIT $5 OFFSET $6
            `;

            const result = await pool.query(query, [
                project_id || null,
                reference_type || null,
                reference_id || null,
                status || null,
                limit,
                offset,
            ]);

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM notification_log nl
                WHERE ($1::UUID IS NULL OR nl.project_id = $1)
                  AND ($2::VARCHAR IS NULL OR nl.reference_type = $2)
                  AND ($3::UUID IS NULL OR nl.reference_id = $3)
                  AND ($4::VARCHAR IS NULL OR nl.status = $4)
            `;

            const countResult = await pool.query(countQuery, [
                project_id || null,
                reference_type || null,
                reference_id || null,
                status || null,
            ]);

            res.json({
                success: true,
                notifications: result.rows,
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            });
        } catch (error) {
            console.error('Error fetching notification log:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * GET /api/notifications/channels/status
 * Get notification channel status
 */
router.get(
    '/channels/status',
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const notificationService = getNotificationService();
            const channelStatus = notificationService.getChannelStatus();

            const pool: Pool = (req.app as any).locals.pool;
            
            // Get channels from database
            const query = `
                SELECT 
                    id,
                    name,
                    display_name,
                    description,
                    is_enabled,
                    icon
                FROM notification_channels
                ORDER BY sort_order
            `;
            
            const result = await pool.query(query);

            const channels = result.rows.map(channel => ({
                ...channel,
                is_configured: channelStatus[channel.name] || false,
            }));

            res.json({
                success: true,
                channels,
            });
        } catch (error) {
            console.error('Error fetching channel status:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * GET /api/notifications/templates
 * Get notification templates
 */
router.get(
    '/templates',
    requireAuth,
    [
        query('notification_type').optional().isString(),
        query('channel').optional().isIn(['email', 'slack', 'teams', 'sms']),
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const { notification_type, channel } = req.query;

            const pool: Pool = (req.app as any).locals.pool;

            const query = `
                SELECT 
                    nt.*,
                    nc.name as channel_name,
                    nc.display_name as channel_display_name
                FROM notification_templates nt
                JOIN notification_channels nc ON nt.channel_id = nc.id
                WHERE ($1::VARCHAR IS NULL OR nt.notification_type = $1)
                  AND ($2::VARCHAR IS NULL OR nc.name = $2)
                  AND nt.is_active = true
                ORDER BY nt.notification_type, nc.sort_order
            `;

            const result = await pool.query(query, [
                notification_type || null,
                channel || null,
            ]);

            res.json({
                success: true,
                templates: result.rows,
            });
        } catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

export default router;
