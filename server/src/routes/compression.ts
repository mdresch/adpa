import { Router } from 'express'
import { documentCompressionService } from '../services/documentCompressionService'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger } from '../utils/logger'
import Joi from 'joi'

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

/**
 * POST /api/compression/feedback
 * Collect user feedback for compression quality
 */
router.post('/feedback', validate(Joi.object({
  documentId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  feedback: Joi.string().allow('').optional(),
  compressionMethod: Joi.string().required()
})), async (req, res) => {
  try {
    const { documentId, rating, feedback, compressionMethod } = req.body
    const userId = req.user?.id

    await documentCompressionService.collectUserFeedback(
      documentId,
      rating,
      feedback || '',
      compressionMethod
    )

    logger.info(`User feedback collected for document ${documentId}`, {
      userId,
      rating,
      compressionMethod
    })

    res.json({
      success: true,
      message: 'Feedback collected successfully'
    })
  } catch (error) {
    logger.error('Failed to collect compression feedback:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to collect feedback'
    })
  }
})

/**
 * GET /api/compression/strategies
 * Get available compression strategies with performance metrics
 */
router.get('/strategies', async (req, res) => {
  try {
    const { projectType, documentType } = req.query

    if (projectType && documentType) {
      const optimalStrategy = await documentCompressionService.getOptimalStrategy(
        projectType as string,
        documentType as string
      )
      
      res.json({
        success: true,
        data: optimalStrategy
      })
    } else {
      // Return all strategies (would need to implement getAllStrategies method)
      res.json({
        success: true,
        data: [
          {
            name: 'Content Truncation',
            method: 'truncate',
            qualityMetrics: { coherence: 0.6, completeness: 0.4, relevance: 0.5, readability: 0.7, overall: 0.55 },
            usageCount: 0
          },
          {
            name: 'AI Summarization',
            method: 'summarize',
            qualityMetrics: { coherence: 0.8, completeness: 0.7, relevance: 0.8, readability: 0.8, overall: 0.78 },
            usageCount: 0
          },
          {
            name: 'Smart Compression',
            method: 'smart',
            qualityMetrics: { coherence: 0.85, completeness: 0.8, relevance: 0.85, readability: 0.8, overall: 0.83 },
            usageCount: 0
          },
          {
            name: 'Keyword-Based',
            method: 'keyword',
            qualityMetrics: { coherence: 0.7, completeness: 0.75, relevance: 0.9, readability: 0.7, overall: 0.76 },
            usageCount: 0
          }
        ]
      })
    }
  } catch (error) {
    logger.error('Failed to get compression strategies:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get compression strategies'
    })
  }
})

/**
 * POST /api/compression/optimize
 * Get optimal compression strategy for specific content
 */
router.post('/optimize', validate(Joi.object({
  content: Joi.string().required(),
  projectType: Joi.string().optional(),
  documentType: Joi.string().optional()
})), async (req, res) => {
  try {
    const { content, projectType, documentType } = req.body

    // Get optimal strategy
    const optimalStrategy = await documentCompressionService.getOptimalStrategy(
      projectType || 'general',
      documentType || 'general'
    )

    // Test the strategy
    const result = await documentCompressionService.compressDocument(content, {
      compressionLevel: 0.8,
      method: optimalStrategy.method
    })

    res.json({
      success: true,
      data: {
        strategy: optimalStrategy,
        result: {
          compressedContent: result.compressedContent,
          compressionRatio: result.compressionRatio,
          qualityMetrics: result.qualityMetrics,
          processingTimeMs: result.processingTimeMs
        }
      }
    })
  } catch (error) {
    logger.error('Failed to optimize compression:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to optimize compression'
    })
  }
})

/**
 * POST /api/compression/compare
 * Compare multiple compression strategies
 */
router.post('/compare', validate(Joi.object({
  content: Joi.string().required(),
  strategies: Joi.array().items(Joi.string(), Joi.object()).min(1).required()
})), async (req, res) => {
  try {
    const { content, strategies } = req.body

    const comparisonResults = await documentCompressionService.compareCompressionStrategies(
      content,
      strategies
    )

    res.json({
      success: true,
      data: comparisonResults
    })
  } catch (error) {
    logger.error('Failed to compare compression strategies:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to compare compression strategies'
    })
  }
})

/**
 * GET /api/compression/analytics
 * Get compression analytics and insights
 */
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '30 days' } = req.query

    const analytics = await documentCompressionService.getCompressionAnalytics(
      timeRange as string
    )

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    logger.error('Failed to get compression analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get compression analytics'
    })
  }
})

/**
 * POST /api/compression/quality-metrics
 * Calculate quality metrics for compressed content
 */
router.post('/quality-metrics', validate(Joi.object({
  compressedContent: Joi.string().required(),
  originalContent: Joi.string().required()
})), async (req, res) => {
  try {
    const { compressedContent, originalContent } = req.body

    const qualityMetrics = await documentCompressionService.calculateQualityMetrics(
      compressedContent,
      originalContent
    )

    res.json({
      success: true,
      data: qualityMetrics
    })
  } catch (error) {
    logger.error('Failed to calculate quality metrics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to calculate quality metrics'
    })
  }
})

export default router

