/**
 * Emergency Meeting Routes
 * CR-2026-001: Auto-schedule emergency meetings for critical drift
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { emergencyMeetingService } from '../services/emergencyMeetingService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * GET /api/emergency-meetings
 * List all emergency meetings (with optional filters)
 */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId, status, severity } = req.query

      logger.info('[EMERGENCY-MEETING-API] Listing meetings', {
        projectId,
        status,
        severity,
        userId: req.user?.id
      })

      // For now, if projectId is provided, get project meetings
      // Otherwise, this would need a new method to get all meetings
      if (projectId) {
        const meetings = await emergencyMeetingService.getProjectMeetings(projectId as string)
        
        // Apply filters if provided
        let filtered = meetings
        if (status) {
          filtered = filtered.filter(m => m.status === status)
        }
        if (severity) {
          filtered = filtered.filter(m => m.severity === severity)
        }

        res.json({
          success: true,
          count: filtered.length,
          meetings: filtered
        })
      } else {
        res.json({
          success: true,
          count: 0,
          meetings: [],
          message: 'Please provide projectId to list meetings'
        })
      }
    } catch (error) {
      logger.error('[EMERGENCY-MEETING-API] Error listing meetings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to list emergency meetings',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * GET /api/emergency-meetings/:meetingId
 * Get details of a specific emergency meeting
 */
router.get(
  '/:meetingId',
  authenticateToken,
  async (req, res) => {
    try {
      const { meetingId } = req.params

      logger.info('[EMERGENCY-MEETING-API] Getting meeting details', {
        meetingId,
        userId: req.user?.id
      })

      const meeting = await emergencyMeetingService.getMeeting(meetingId)

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found',
          meetingId
        })
      }

      res.json({
        success: true,
        meeting
      })
    } catch (error) {
      logger.error('[EMERGENCY-MEETING-API] Error getting meeting:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get emergency meeting',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * POST /api/emergency-meetings/schedule
 * Manually schedule an emergency meeting for budget overrun
 */
router.post(
  '/schedule',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      projectId: Joi.string().uuid().required(),
      projectName: Joi.string().required(),
      driftRecordId: Joi.string().uuid().required(),
      approvedBudget: Joi.number().min(0).required(),
      projectedCost: Joi.number().min(0).required(),
      overrunAmount: Joi.number().required(),
      overrunPercentage: Joi.number().min(0).required(),
      rootCause: Joi.string().optional(),
      changeRequestId: Joi.string().uuid().optional()
    })
  ),
  async (req, res) => {
    try {
      const {
        projectId,
        projectName,
        driftRecordId,
        approvedBudget,
        projectedCost,
        overrunAmount,
        overrunPercentage,
        rootCause,
        changeRequestId
      } = req.body

      logger.info('[EMERGENCY-MEETING-API] Manually scheduling meeting', {
        projectId,
        overrunPercentage,
        userId: req.user?.id
      })

      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId,
          projectName,
          driftRecordId,
          approvedBudget,
          projectedCost,
          overrunAmount,
          overrunPercentage,
          rootCause,
          changeRequestId
        },
        req.user?.id
      )

      res.json({
        success: true,
        meeting: result.meeting,
        attendees: result.attendees,
        notificationsSent: result.notificationsSent
      })
    } catch (error) {
      logger.error('[EMERGENCY-MEETING-API] Error scheduling meeting:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to schedule emergency meeting',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * PATCH /api/emergency-meetings/:meetingId/status
 * Update meeting status
 */
router.patch(
  '/:meetingId/status',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      status: Joi.string()
        .valid('scheduled', 'notified', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')
        .required()
    })
  ),
  async (req, res) => {
    try {
      const { meetingId } = req.params
      const { status } = req.body

      logger.info('[EMERGENCY-MEETING-API] Updating meeting status', {
        meetingId,
        status,
        userId: req.user?.id
      })

      await emergencyMeetingService.updateMeetingStatus(
        meetingId,
        status,
        req.user?.id
      )

      const updated = await emergencyMeetingService.getMeeting(meetingId)

      res.json({
        success: true,
        meeting: updated
      })
    } catch (error) {
      logger.error('[EMERGENCY-MEETING-API] Error updating meeting status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update meeting status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * GET /api/emergency-meetings/project/:projectId
 * Get all emergency meetings for a specific project
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  async (req, res) => {
    try {
      const { projectId } = req.params

      logger.info('[EMERGENCY-MEETING-API] Getting project meetings', {
        projectId,
        userId: req.user?.id
      })

      const meetings = await emergencyMeetingService.getProjectMeetings(projectId)

      res.json({
        success: true,
        count: meetings.length,
        meetings
      })
    } catch (error) {
      logger.error('[EMERGENCY-MEETING-API] Error getting project meetings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get project meetings',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

export default router
