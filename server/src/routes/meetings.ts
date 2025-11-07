/**
 * Meetings API Routes
 * CR-2026-001: Emergency Meeting Auto-Scheduling
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { meetingSchedulerService } from '../services/meetingSchedulerService'
import { budgetOverrunAlertService } from '../services/budgetOverrunAlertService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * POST /api/meetings
 * Schedule a new meeting (manual or auto)
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      projectId: Joi.string().uuid().required(),
      title: Joi.string().max(255).required(),
      description: Joi.string().optional(),
      meetingType: Joi.string().valid(
        'emergency_budget_overrun',
        'urgent_drift_review',
        'corrective_action',
        'opportunity_review',
        'baseline_approval',
        'regular_review'
      ).required(),
      severity: Joi.string().valid('low', 'medium', 'high', 'critical', 'emergency').default('medium'),
      urgency: Joi.string().valid('low', 'normal', 'high', 'urgent', 'emergency').default('normal'),
      durationMinutes: Joi.number().min(15).max(480).default(60),
      agenda: Joi.array().items(Joi.object()).optional(),
      attendees: Joi.array().items(
        Joi.object({
          userId: Joi.string().uuid().optional(),
          email: Joi.string().email().optional(),
          name: Joi.string().optional(),
          role: Joi.string().valid('organizer', 'required', 'optional', 'decision_maker', 'subject_matter_expert', 'observer').required()
        })
      ).min(1).required(),
      alertId: Joi.string().uuid().optional(),
      driftRecordId: Joi.string().uuid().optional(),
      changeRequestId: Joi.string().uuid().optional()
    })
  ),
  async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      
      const userId = req.user.id
      
      logger.info('[MEETINGS-API] Scheduling meeting', {
        projectId: req.body.projectId,
        meetingType: req.body.meetingType,
        userId
      })
      
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        req.body,
        userId
      )
      
      res.json({
        success: true,
        meeting
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error scheduling meeting:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to schedule meeting'
      })
    }
  }
)

/**
 * GET /api/meetings/:id
 * Get meeting details
 */
router.get(
  '/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const meeting = await meetingSchedulerService.getMeeting(req.params.id)
      
      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found'
        })
      }
      
      res.json({
        success: true,
        meeting
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error fetching meeting:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch meeting'
      })
    }
  }
)

/**
 * GET /api/meetings/project/:projectId
 * List meetings for a project
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        severity: req.query.severity as string
      }
      
      const meetings = await meetingSchedulerService.listMeetings(
        req.params.projectId,
        filters
      )
      
      res.json({
        success: true,
        meetings,
        count: meetings.length
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error listing meetings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to list meetings'
      })
    }
  }
)

/**
 * PATCH /api/meetings/:id/rsvp
 * Update RSVP status for an attendee
 */
router.patch(
  '/:id/rsvp',
  authenticateToken,
  validate(
    Joi.object({
      attendeeId: Joi.string().uuid().required(),
      status: Joi.string().valid('accepted', 'declined', 'tentative').required()
    })
  ),
  async (req, res) => {
    try {
      await meetingSchedulerService.updateRSVP(
        req.body.attendeeId,
        req.body.status
      )
      
      res.json({
        success: true,
        message: 'RSVP updated successfully'
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error updating RSVP:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update RSVP'
      })
    }
  }
)

/**
 * PATCH /api/meetings/:id/cancel
 * Cancel a meeting
 */
router.patch(
  '/:id/cancel',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      reason: Joi.string().required()
    })
  ),
  async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      
      const userId = req.user.id
      
      await meetingSchedulerService.cancelMeeting(
        req.params.id,
        userId,
        req.body.reason
      )
      
      res.json({
        success: true,
        message: 'Meeting cancelled successfully'
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error cancelling meeting:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to cancel meeting'
      })
    }
  }
)

/**
 * POST /api/meetings/alerts/budget-overrun
 * Create budget overrun alert with auto-scheduled meeting
 */
router.post(
  '/alerts/budget-overrun',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      projectId: Joi.string().uuid().required(),
      projectName: Joi.string().required(),
      approvedBudget: Joi.number().positive().required(),
      projectedCost: Joi.number().positive().required(),
      rootCause: Joi.object({
        category: Joi.string().required(),
        description: Joi.string().required(),
        responsible: Joi.string().optional(),
        preventable: Joi.boolean().required()
      }).optional(),
      driftRecordId: Joi.string().uuid().optional()
    })
  ),
  async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      
      const userId = req.user.id
      
      const detection = {
        ...req.body,
        overrunAmount: req.body.projectedCost - req.body.approvedBudget,
        overrunPercentage: ((req.body.projectedCost - req.body.approvedBudget) / req.body.approvedBudget) * 100
      }
      
      logger.info('[MEETINGS-API] Processing budget overrun alert', {
        projectId: detection.projectId,
        overrunPercentage: detection.overrunPercentage,
        userId
      })
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        userId
      )
      
      res.json({
        success: true,
        alert,
        meetingScheduled: !!alert.meetingId
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error creating budget overrun alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create budget overrun alert'
      })
    }
  }
)

/**
 * GET /api/meetings/alerts/:alertId
 * Get budget overrun alert details
 */
router.get(
  '/alerts/:alertId',
  authenticateToken,
  async (req, res) => {
    try {
      const alert = await budgetOverrunAlertService.getAlert(req.params.alertId)
      
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }
      
      res.json({
        success: true,
        alert
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error fetching alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alert'
      })
    }
  }
)

/**
 * GET /api/meetings/alerts/project/:projectId
 * List alerts for a project
 */
router.get(
  '/alerts/project/:projectId',
  authenticateToken,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        severity: req.query.severity as string
      }
      
      const alerts = await budgetOverrunAlertService.listAlerts(
        req.params.projectId,
        filters
      )
      
      res.json({
        success: true,
        alerts,
        count: alerts.length
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error listing alerts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to list alerts'
      })
    }
  }
)

/**
 * PATCH /api/meetings/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.patch(
  '/alerts/:alertId/acknowledge',
  authenticateToken,
  async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      
      const userId = req.user.id
      
      await budgetOverrunAlertService.acknowledgeAlert(
        req.params.alertId,
        userId
      )
      
      res.json({
        success: true,
        message: 'Alert acknowledged'
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error acknowledging alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      })
    }
  }
)

/**
 * PATCH /api/meetings/alerts/:alertId/resolve
 * Resolve an alert
 */
router.patch(
  '/alerts/:alertId/resolve',
  authenticateToken,
  requirePermission('projects.update'),
  validate(
    Joi.object({
      resolutionNotes: Joi.string().required()
    })
  ),
  async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      
      const userId = req.user.id
      
      await budgetOverrunAlertService.resolveAlert(
        req.params.alertId,
        userId,
        req.body.resolutionNotes
      )
      
      res.json({
        success: true,
        message: 'Alert resolved'
      })
    } catch (error) {
      logger.error('[MEETINGS-API] Error resolving alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      })
    }
  }
)

export default router
