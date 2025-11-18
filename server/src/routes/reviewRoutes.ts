import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import * as reviewSchedulingService from '../services/reviewSchedulingService'
import { pool } from '../database/connection'

const router = express.Router()

// Validation schemas
const reviewScheduleSchema = Joi.object({
  review_type: Joi.string().valid('portfolio_performance', 'program_performance', 'strategic', 'governance').required(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'bi-annually', 'annually').required(),
  day_of_month: Joi.number().integer().min(1).max(31).optional(),
  day_of_week: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').optional(),
  required_attendees: Joi.array().items(Joi.string().uuid()).optional(),
  optional_attendees: Joi.array().items(Joi.string().uuid()).optional(),
  review_owner_id: Joi.string().uuid().optional(),
  agenda_template_id: Joi.string().uuid().optional(),
  duration_minutes: Joi.number().integer().min(1).optional(),
  auto_generate_agenda: Joi.boolean().optional(),
  send_reminders: Joi.boolean().optional(),
  reminder_days_before: Joi.array().items(Joi.number().integer().min(0).max(30)).max(5).optional(),
  is_active: Joi.boolean().optional()
})

const reviewMeetingSchema = Joi.object({
  review_type: Joi.string().valid('portfolio_performance', 'program_performance', 'strategic', 'governance').optional(),
  scheduled_date: Joi.alternatives().try(
    Joi.date(),
    Joi.string().isoDate(),
    Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/) // yyyy-MM-dd format
  ).required(),
  actual_date: Joi.alternatives().try(
    Joi.date(),
    Joi.string().isoDate(),
    Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).allow(null, '')
  ).optional(),
  start_time: Joi.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  end_time: Joi.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  duration_minutes: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled', 'postponed').optional(),
  attendees: Joi.array().items(Joi.string().uuid()).optional(),
  absentees: Joi.array().items(Joi.string().uuid()).optional(),
  notes: Joi.string().optional().allow(null, ''),
  was_on_time: Joi.boolean().optional().allow(null),
  was_complete: Joi.boolean().optional().allow(null)
})

const reviewDecisionSchema = Joi.object({
  decision_type: Joi.string().valid('approve', 'reject', 'defer', 'modify', 'escalate').required(),
  decision_text: Joi.string().required(),
  affected_projects: Joi.array().items(Joi.string().uuid()).optional(),
  affected_programs: Joi.array().items(Joi.string().uuid()).optional(),
  implementation_deadline: Joi.date().optional(),
  implementation_status: Joi.string().valid('pending', 'in-progress', 'completed').optional()
})

const reviewActionItemSchema = Joi.object({
  action_text: Joi.string().required(),
  assigned_to: Joi.string().uuid().optional(),
  due_date: Joi.date().optional(),
  status: Joi.string().valid('open', 'in-progress', 'completed', 'cancelled').optional(),
  priority: Joi.string().valid('high', 'medium', 'low').optional(),
  related_project_id: Joi.string().uuid().optional(),
  related_program_id: Joi.string().uuid().optional()
})

// Get review schedule for a program
router.get('/programs/:programId/reviews/schedule', 
  authenticateToken, 
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId } = req.params
      const { review_type } = req.query

      // Verify program exists
      const programCheck = await pool.query('SELECT id FROM programs WHERE id = $1', [programId])
      if (programCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Program not found', code: 'PROGRAM_NOT_FOUND' }
        })
      }

      const schedule = await reviewSchedulingService.getReviewScheduleByProgram(
        programId,
        review_type as string | undefined
      )

      res.json({
        success: true,
        data: schedule
      })
    } catch (error: any) {
      log.error('Failed to get review schedule', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get review schedule', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Create or update review schedule
router.post('/programs/:programId/reviews/schedule',
  authenticateToken,
  requirePermission('programs.edit'),
  validate(reviewScheduleSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId } = req.params
      const userId = (req as any).user.id

      // Verify program exists
      const programCheck = await pool.query('SELECT id FROM programs WHERE id = $1', [programId])
      if (programCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Program not found', code: 'PROGRAM_NOT_FOUND' }
        })
      }

      const schedule = await reviewSchedulingService.upsertReviewSchedule(programId, req.body, userId)

      res.json({
        success: true,
        data: schedule
      })
    } catch (error: any) {
      log.error('Failed to create/update review schedule', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create/update review schedule', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Get review compliance status (MUST come before /:meetingId route)
router.get('/programs/:programId/reviews/compliance',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId } = req.params

      // Verify program exists
      const programCheck = await pool.query('SELECT id FROM programs WHERE id = $1', [programId])
      if (programCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Program not found', code: 'PROGRAM_NOT_FOUND' }
        })
      }

      const compliance = await reviewSchedulingService.getReviewCompliance(programId)

      res.json({
        success: true,
        data: compliance
      })
    } catch (error: any) {
      log.error('Failed to get review compliance', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get review compliance', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Get review meetings for a program
router.get('/programs/:programId/reviews',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId } = req.params
      const { limit, offset, status, start_date, end_date } = req.query

      // Verify program exists
      const programCheck = await pool.query('SELECT id FROM programs WHERE id = $1', [programId])
      if (programCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Program not found', code: 'PROGRAM_NOT_FOUND' }
        })
      }

      const meetings = await reviewSchedulingService.getReviewMeetings(programId, {
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        status: status as string | undefined,
        startDate: start_date as string | undefined,
        endDate: end_date as string | undefined
      })

      res.json({
        success: true,
        data: meetings
      })
    } catch (error: any) {
      log.error('Failed to get review meetings', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get review meetings', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Create review meeting
router.post('/programs/:programId/reviews',
  authenticateToken,
  requirePermission('programs.edit'),
  validate(reviewMeetingSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId } = req.params
      const { review_type } = req.body // Get review_type from request body
      const userId = (req as any).user.id

      // Verify program exists
      const programCheck = await pool.query('SELECT id FROM programs WHERE id = $1', [programId])
      if (programCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Program not found', code: 'PROGRAM_NOT_FOUND' }
        })
      }

      // Get schedule by review type (or first available if not specified)
      const schedule = await reviewSchedulingService.getReviewScheduleByProgram(programId, review_type)
      if (!schedule) {
        return res.status(400).json({
          success: false,
          error: { 
            message: review_type 
              ? `Review schedule for type '${review_type}' not found. Please create a schedule first.`
              : 'Review schedule not found. Please create a schedule first.', 
            code: 'SCHEDULE_NOT_FOUND' 
          }
        })
      }

      const meeting = await reviewSchedulingService.createReviewMeeting(
        schedule.id,
        programId,
        req.body,
        userId
      )

      res.status(201).json({
        success: true,
        data: meeting
      })
    } catch (error: any) {
      log.error('Failed to create review meeting', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create review meeting', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Get review meeting details
router.get('/programs/:programId/reviews/:meetingId',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { meetingId } = req.params

      const meeting = await reviewSchedulingService.getReviewMeeting(meetingId)
      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: { message: 'Review meeting not found', code: 'MEETING_NOT_FOUND' }
        })
      }

      res.json({
        success: true,
        data: meeting
      })
    } catch (error: any) {
      log.error('Failed to get review meeting', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get review meeting', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Delete review meeting
router.delete('/programs/:programId/reviews/:meetingId',
  authenticateToken,
  requirePermission('programs.edit'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { meetingId, programId } = req.params
      const userId = (req as any).user.id

      // Verify meeting exists and belongs to program
      const meeting = await reviewSchedulingService.getReviewMeeting(meetingId)
      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: { message: 'Review meeting not found', code: 'MEETING_NOT_FOUND' }
        })
      }

      if (meeting.program_id !== programId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Meeting does not belong to this program', code: 'FORBIDDEN' }
        })
      }

      await reviewSchedulingService.deleteReviewMeeting(meetingId, userId)

      res.json({
        success: true,
        message: 'Review meeting deleted successfully'
      })
    } catch (error: any) {
      log.error('Failed to delete review meeting', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to delete review meeting', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Update review meeting
router.put('/programs/:programId/reviews/:meetingId',
  authenticateToken,
  requirePermission('programs.edit'),
  validate(reviewMeetingSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { meetingId } = req.params

      const meeting = await reviewSchedulingService.updateReviewMeeting(meetingId, req.body)
      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: { message: 'Review meeting not found', code: 'MEETING_NOT_FOUND' }
        })
      }

      res.json({
        success: true,
        data: meeting
      })
    } catch (error: any) {
      log.error('Failed to update review meeting', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to update review meeting', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Create review decision
router.post('/programs/:programId/reviews/:meetingId/decisions',
  authenticateToken,
  requirePermission('programs.edit'),
  validate(reviewDecisionSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { meetingId } = req.params
      const userId = (req as any).user.id

      // Verify meeting exists
      const meeting = await reviewSchedulingService.getReviewMeeting(meetingId)
      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: { message: 'Review meeting not found', code: 'MEETING_NOT_FOUND' }
        })
      }

      const decision = await reviewSchedulingService.createReviewDecision(meetingId, req.body, userId)

      res.status(201).json({
        success: true,
        data: decision
      })
    } catch (error: any) {
      log.error('Failed to create review decision', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create review decision', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Create review action item
router.post('/programs/:programId/reviews/:meetingId/action-items',
  authenticateToken,
  requirePermission('programs.edit'),
  validate(reviewActionItemSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { meetingId } = req.params
      const userId = (req as any).user.id

      // Verify meeting exists
      const meeting = await reviewSchedulingService.getReviewMeeting(meetingId)
      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: { message: 'Review meeting not found', code: 'MEETING_NOT_FOUND' }
        })
      }

      const actionItem = await reviewSchedulingService.createReviewActionItem(meetingId, req.body, userId)

      res.status(201).json({
        success: true,
        data: actionItem
      })
    } catch (error: any) {
      log.error('Failed to create review action item', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create review action item', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Get upcoming reviews (across all programs)
router.get('/reviews/upcoming',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { days_ahead } = req.query
      const userId = (req as any).user.id

      const reviews = await reviewSchedulingService.getUpcomingReviews(
        userId,
        days_ahead ? Number(days_ahead) : 30
      )

      res.json({
        success: true,
        data: reviews
      })
    } catch (error: any) {
      log.error('Failed to get upcoming reviews', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get upcoming reviews', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Get overdue reviews
router.get('/reviews/overdue',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user.id

      const reviews = await reviewSchedulingService.getOverdueReviews(userId)

      res.json({
        success: true,
        data: reviews
      })
    } catch (error: any) {
      log.error('Failed to get overdue reviews', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get overdue reviews', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Generate upcoming meetings for a schedule (manual trigger)
router.post('/programs/:programId/reviews/schedule/:scheduleId/generate-meetings',
  authenticateToken,
  requirePermission('programs.edit'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { scheduleId } = req.params
      const { months_ahead } = req.body
      const monthsAhead = months_ahead ? Number(months_ahead) : 3

      const meetings = await reviewSchedulingService.generateUpcomingMeetings(scheduleId, monthsAhead)

      res.json({
        success: true,
        data: meetings,
        message: `Generated ${meetings.length} upcoming meeting${meetings.length !== 1 ? 's' : ''}`
      })
    } catch (error: any) {
      log.error('Failed to generate meetings', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to generate meetings', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

// Auto-generate meetings for all schedules (admin/manual trigger)
router.post('/reviews/auto-generate',
  authenticateToken,
  requirePermission('programs.edit'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { months_ahead } = req.body
      const monthsAhead = months_ahead ? Number(months_ahead) : 3

      const result = await reviewSchedulingService.autoGenerateMeetingsForAllSchedules(monthsAhead)

      res.json({
        success: true,
        data: result,
        message: `Processed ${result.schedulesProcessed} schedule${result.schedulesProcessed !== 1 ? 's' : ''}, created ${result.meetingsCreated} meeting${result.meetingsCreated !== 1 ? 's' : ''}`
      })
    } catch (error: any) {
      log.error('Failed to auto-generate meetings', { error: error.message })
      res.status(500).json({
        success: false,
        error: { message: 'Failed to auto-generate meetings', code: 'INTERNAL_ERROR' }
      })
    }
  }
)

export default router

