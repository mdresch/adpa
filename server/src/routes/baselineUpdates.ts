/**
 * Baseline Update Routes
 * TASK-746: Baseline update upon approval
 * 
 * API endpoints for baseline update management
 */

import express from 'express'
import { baselineUpdateService } from '../services/baselineUpdateService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * GET /api/baseline-updates/project/:projectId/history
 * Get baseline update history for a project
 */
router.get('/project/:projectId/history', async (req, res) => {
  try {
    const { projectId } = req.params
    const limit = parseInt(req.query.limit as string) || 50

    const history = await baselineUpdateService.getBaselineUpdateHistory(projectId, limit)

    res.json({
      success: true,
      projectId,
      count: history.length,
      updates: history
    })
  } catch (error) {
    logger.error('Error fetching baseline update history:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch baseline update history',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/baseline-updates/:updateId
 * Get details of a specific baseline update
 */
router.get('/:updateId', async (req, res) => {
  try {
    const { updateId } = req.params

    const details = await baselineUpdateService.getBaselineUpdateDetails(updateId)

    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Baseline update not found'
      })
    }

    res.json({
      success: true,
      update: details
    })
  } catch (error) {
    logger.error('Error fetching baseline update details:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch baseline update details',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/baseline-updates/preview/:changeRequestId
 * Preview baseline changes from a change request
 */
router.post('/preview/:changeRequestId', async (req, res) => {
  try {
    const { changeRequestId } = req.params

    const preview = await baselineUpdateService.previewBaselineChanges(changeRequestId)

    res.json({
      success: true,
      changeRequestId,
      ...preview
    })
  } catch (error) {
    logger.error('Error previewing baseline changes:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to preview baseline changes',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/baseline-updates/manual/:changeRequestId
 * Manually trigger baseline update from an approved change request
 */
router.post('/manual/:changeRequestId', async (req, res) => {
  try {
    const { changeRequestId } = req.params
    const userId = req.body.userId || (req as any).user?.id

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    const result = await baselineUpdateService.manuallyUpdateBaseline(
      changeRequestId,
      userId
    )

    res.json({
      success: result.success,
      ...result
    })
  } catch (error) {
    logger.error('Error manually updating baseline:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = errorMessage.includes('not found') ? 404 :
                       errorMessage.includes('must be approved') ? 400 : 500

    res.status(statusCode).json({
      success: false,
      error: 'Failed to update baseline',
      message: errorMessage
    })
  }
})

/**
 * GET /api/baseline-updates/check/:changeRequestId
 * Check if baseline has been updated for a change request
 */
router.get('/check/:changeRequestId', async (req, res) => {
  try {
    const { changeRequestId } = req.params

    const hasBeenUpdated = await baselineUpdateService.hasBaselineBeenUpdated(
      changeRequestId
    )

    res.json({
      success: true,
      changeRequestId,
      hasBeenUpdated
    })
  } catch (error) {
    logger.error('Error checking baseline update status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check baseline update status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
