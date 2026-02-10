import { Router } from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validateQuery } from '../middleware/validation'
import Joi from 'joi'
import ExtractionAnalyticsService from '../services/extractionAnalyticsService'
import { childLogger } from '../utils/logger'

const router = Router()
const log = childLogger({ service: 'extraction-analytics' })

/**
 * GET /api/extraction-analytics/overview
 * Get high-level extraction statistics
 */
router.get('/overview',
    authenticateToken,
    requirePermission('analytics.system'),
    validateQuery(Joi.object({
        period: Joi.string().valid('24h', '7d', '30d', '90d').default('30d'),
    })),
    async (req, res) => {
        try {
            const { period = '30d' } = req.query as { period: string }
            const stats = await ExtractionAnalyticsService.getOverviewStats(period)
            res.json({ success: true, data: stats })
        } catch (error) {
            log.error('Failed to fetch extraction overview:', error)
            res.status(500).json({ success: false, error: 'Failed to fetch extraction overview' })
        }
    }
)

/**
 * GET /api/extraction-analytics/distribution
 * Get entity type distribution
 */
router.get('/distribution',
    authenticateToken,
    requirePermission('analytics.system'),
    validateQuery(Joi.object({
        period: Joi.string().valid('24h', '7d', '30d', '90d').default('30d'),
    })),
    async (req, res) => {
        try {
            const { period = '30d' } = req.query as { period: string }
            const distribution = await ExtractionAnalyticsService.getEntityDistribution(period)
            res.json({ success: true, data: distribution })
        } catch (error) {
            log.error('Failed to fetch extraction distribution:', error)
            res.status(500).json({ success: false, error: 'Failed to fetch extraction distribution' })
        }
    }
)

/**
 * GET /api/extraction-analytics/trends
 * Get extraction trends over time
 */
router.get('/trends',
    authenticateToken,
    requirePermission('analytics.system'),
    validateQuery(Joi.object({
        period: Joi.string().valid('24h', '7d', '30d', '90d').default('30d'),
    })),
    async (req, res) => {
        try {
            const { period = '30d' } = req.query as { period: string }
            const trends = await ExtractionAnalyticsService.getExtractionTrends(period)
            res.json({ success: true, data: trends })
        } catch (error) {
            log.error('Failed to fetch extraction trends:', error)
            res.status(500).json({ success: false, error: 'Failed to fetch extraction trends' })
        }
    }
)

export default router
