/**
 * Digital Twin Analytics Routes
 * TASK-745: Analytics Component Implementation
 */

import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { analyticsService } from '../services/analyticsService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * GET /api/digital-twin-analytics/:projectId/drift-trends
 * Get drift detection trends for a project
 */
router.get(
    '/:projectId/drift-trends',
    authenticateToken,
    async (req, res) => {
        try {
            const { projectId } = req.params
            const { days = 30 } = req.query

            const trends = await analyticsService.getProjectDriftTrends(projectId, Number(days))
            const breakdown = await analyticsService.getDriftCategoryBreakdown(projectId)

            res.json({
                success: true,
                trends,
                breakdown
            })
        } catch (error) {
            logger.error('[DT-ANALYTICS-API] Error fetching drift trends:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to fetch drift trends'
            })
        }
    }
)

/**
 * GET /api/digital-twin-analytics/:projectId/innovation-stats
 * Get innovation and value capture statistics
 */
router.get(
    '/:projectId/innovation-stats',
    authenticateToken,
    async (req, res) => {
        try {
            const { projectId } = req.params

            const stats = await analyticsService.getInnovationStats(projectId)

            res.json({
                success: true,
                stats
            })
        } catch (error) {
            logger.error('[DT-ANALYTICS-API] Error fetching innovation stats:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to fetch innovation stats'
            })
        }
    }
)

/**
 * GET /api/digital-twin-analytics/:projectId/health-score
 * Get project baseline health score
 */
router.get(
    '/:projectId/health-score',
    authenticateToken,
    async (req, res) => {
        try {
            const { projectId } = req.params

            const health = await analyticsService.getProjectHealthScore(projectId)

            res.json({
                success: true,
                health
            })
        } catch (error) {
            logger.error('[DT-ANALYTICS-API] Error fetching health score:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to fetch health score'
            })
        }
    }
)

export default router
