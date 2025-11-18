import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface ReviewSchedule {
  id: string
  program_id: string
  review_type: 'portfolio_performance' | 'program_performance' | 'strategic' | 'governance'
  frequency: 'monthly' | 'quarterly' | 'bi-annually' | 'annually'
  day_of_month?: number
  day_of_week?: string
  required_attendees: string[]
  optional_attendees: string[]
  review_owner_id?: string
  agenda_template_id?: string
  duration_minutes: number
  auto_generate_agenda: boolean
  send_reminders: boolean
  reminder_days_before: number[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReviewMeeting {
  id: string
  schedule_id: string
  program_id: string
  scheduled_date: string
  actual_date?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed'
  attendees: string[]
  absentees: string[]
  decisions: any[]
  action_items: any[]
  notes?: string
  was_on_time?: boolean
  was_complete?: boolean
  created_at: string
  updated_at: string
}

export interface ReviewDecision {
  id: string
  review_meeting_id: string
  decision_type: 'approve' | 'reject' | 'defer' | 'modify' | 'escalate'
  decision_text: string
  affected_projects: string[]
  affected_programs: string[]
  approved_by?: string
  approval_date?: string
  implementation_deadline?: string
  implementation_status: 'pending' | 'in-progress' | 'completed'
  created_at: string
}

export interface ReviewActionItem {
  id: string
  review_meeting_id: string
  action_text: string
  assigned_to?: string
  due_date?: string
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  completed_at?: string
  completed_by?: string
  priority: 'high' | 'medium' | 'low'
  related_project_id?: string
  related_program_id?: string
  created_at: string
  updated_at: string
}

export interface ReviewCompliance {
  schedule_id: string
  program_id: string
  review_type: string
  frequency: string
  total_reviews_held: number
  on_time_reviews: number
  completed_reviews: number
  last_review_date?: string
  next_review_due_date?: string
  compliance_status: 'overdue' | 'on-track' | 'no-reviews'
}

/**
 * Create or update review schedule for a program
 */
export async function upsertReviewSchedule(
  programId: string,
  data: Partial<ReviewSchedule>,
  userId: string
): Promise<ReviewSchedule> {
  try {
    // Check if schedule exists
    const existing = await pool.query(
      `SELECT id FROM review_schedules 
       WHERE program_id = $1 AND review_type = $2 AND is_active = TRUE`,
      [programId, data.review_type]
    )

    if (existing.rows.length > 0) {
      // Update existing schedule
      const scheduleId = existing.rows[0].id
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIdx = 1

      const allowedFields = [
        'frequency', 'day_of_month', 'day_of_week', 'required_attendees',
        'optional_attendees', 'review_owner_id', 'agenda_template_id',
        'duration_minutes', 'auto_generate_agenda', 'send_reminders',
        'reminder_days_before', 'is_active'
      ]

      for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'required_attendees' || key === 'optional_attendees' || key === 'reminder_days_before') {
            updateFields.push(`${key} = $${paramIdx++}`)
            updateValues.push(Array.isArray(value) ? value : [])
          } else {
            updateFields.push(`${key} = $${paramIdx++}`)
            updateValues.push(value)
          }
        }
      }

      if (updateFields.length === 0) {
        return await getReviewSchedule(scheduleId)
      }

      updateFields.push(`updated_at = NOW()`)
      const query = `UPDATE review_schedules SET ${updateFields.join(', ')} WHERE id = $${paramIdx} RETURNING *`
      updateValues.push(scheduleId)

      const result = await pool.query(query, updateValues)
      return result.rows[0]
    } else {
      // Create new schedule
      const result = await pool.query(
        `INSERT INTO review_schedules (
          program_id, review_type, frequency, day_of_month, day_of_week,
          required_attendees, optional_attendees, review_owner_id,
          agenda_template_id, duration_minutes, auto_generate_agenda,
          send_reminders, reminder_days_before, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          programId,
          data.review_type,
          data.frequency || 'monthly',
          data.day_of_month || null,
          data.day_of_week || null,
          data.required_attendees || [],
          data.optional_attendees || [],
          data.review_owner_id || userId,
          data.agenda_template_id || null,
          data.duration_minutes || 60,
          data.auto_generate_agenda !== false,
          data.send_reminders !== false,
          data.reminder_days_before || [7, 1],
          data.is_active !== false
        ]
      )
      return result.rows[0]
    }
  } catch (error: any) {
    logger.error('upsertReviewSchedule error', { error: error.message, programId })
    throw error
  }
}

/**
 * Get review schedule for a program
 */
export async function getReviewSchedule(scheduleId: string): Promise<ReviewSchedule | null> {
  try {
    const result = await pool.query(`SELECT * FROM review_schedules WHERE id = $1`, [scheduleId])
    return result.rows[0] || null
  } catch (error: any) {
    logger.error('getReviewSchedule error', { error: error.message, scheduleId })
    throw error
  }
}

/**
 * Get review schedule for a program by type
 */
export async function getReviewScheduleByProgram(
  programId: string,
  reviewType?: string
): Promise<ReviewSchedule | null> {
  try {
    let query = `SELECT * FROM review_schedules WHERE program_id = $1 AND is_active = TRUE`
    const params: any[] = [programId]

    if (reviewType) {
      query += ` AND review_type = $2`
      params.push(reviewType)
    }

    query += ` ORDER BY created_at DESC LIMIT 1`

    const result = await pool.query(query, params)
    return result.rows[0] || null
  } catch (error: any) {
    logger.error('getReviewScheduleByProgram error', { error: error.message, programId })
    throw error
  }
}

/**
 * Create a review meeting
 */
export async function createReviewMeeting(
  scheduleId: string,
  programId: string,
  data: Partial<ReviewMeeting>,
  userId: string
): Promise<ReviewMeeting> {
  try {
    const result = await pool.query(
      `INSERT INTO review_meetings (
        schedule_id, program_id, scheduled_date, actual_date,
        start_time, end_time, duration_minutes, status,
        attendees, absentees, decisions, action_items, notes,
        was_on_time, was_complete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        scheduleId,
        programId,
        data.scheduled_date,
        data.actual_date || null,
        data.start_time || null,
        data.end_time || null,
        data.duration_minutes || null,
        data.status || 'scheduled',
        data.attendees || [],
        data.absentees || [],
        JSON.stringify(data.decisions || []),
        JSON.stringify(data.action_items || []),
        data.notes || null,
        data.was_on_time || null,
        data.was_complete || null
      ]
    )
    return result.rows[0]
  } catch (error: any) {
    logger.error('createReviewMeeting error', { error: error.message, scheduleId })
    throw error
  }
}

/**
 * Get review meetings for a program
 */
export async function getReviewMeetings(
  programId: string,
  options: {
    limit?: number
    offset?: number
    status?: string
    startDate?: string
    endDate?: string
  } = {}
): Promise<ReviewMeeting[]> {
  try {
    let query = `
      SELECT rm.*, rs.review_type 
      FROM review_meetings rm
      JOIN review_schedules rs ON rm.schedule_id = rs.id
      WHERE rm.program_id = $1
    `
    const params: any[] = [programId]
    let paramIdx = 2

    if (options.status) {
      query += ` AND rm.status = $${paramIdx++}`
      params.push(options.status)
    }

    if (options.startDate) {
      query += ` AND rm.scheduled_date >= $${paramIdx++}`
      params.push(options.startDate)
    }

    if (options.endDate) {
      query += ` AND rm.scheduled_date <= $${paramIdx++}`
      params.push(options.endDate)
    }

    query += ` ORDER BY rm.scheduled_date DESC`

    if (options.limit) {
      query += ` LIMIT $${paramIdx++}`
      params.push(options.limit)
    }

    if (options.offset) {
      query += ` OFFSET $${paramIdx++}`
      params.push(options.offset)
    }

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('getReviewMeetings error', { error: error.message, programId })
    throw error
  }
}

/**
 * Get review meeting by ID
 */
export async function getReviewMeeting(meetingId: string): Promise<ReviewMeeting | null> {
  try {
    const result = await pool.query(
      `SELECT rm.*, rs.review_type 
       FROM review_meetings rm
       JOIN review_schedules rs ON rm.schedule_id = rs.id
       WHERE rm.id = $1`,
      [meetingId]
    )
    return result.rows[0] || null
  } catch (error: any) {
    logger.error('getReviewMeeting error', { error: error.message, meetingId })
    throw error
  }
}

/**
 * Update review meeting
 */
export async function updateReviewMeeting(
  meetingId: string,
  data: Partial<ReviewMeeting>
): Promise<ReviewMeeting | null> {
  try {
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIdx = 1

    const allowedFields = [
      'scheduled_date', 'actual_date', 'start_time', 'end_time',
      'duration_minutes', 'status', 'attendees', 'absentees',
      'decisions', 'action_items', 'notes', 'was_on_time', 'was_complete'
    ]

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'attendees' || key === 'absentees' || key === 'decisions' || key === 'action_items') {
          updateFields.push(`${key} = $${paramIdx++}`)
          updateValues.push(Array.isArray(value) ? JSON.stringify(value) : value)
        } else {
          updateFields.push(`${key} = $${paramIdx++}`)
          updateValues.push(value)
        }
      }
    }

    if (updateFields.length === 0) {
      return await getReviewMeeting(meetingId)
    }

    updateFields.push(`updated_at = NOW()`)
    const query = `UPDATE review_meetings SET ${updateFields.join(', ')} WHERE id = $${paramIdx} RETURNING *`
    updateValues.push(meetingId)

    const result = await pool.query(query, updateValues)
    return result.rows[0] || null
  } catch (error: any) {
    logger.error('updateReviewMeeting error', { error: error.message, meetingId })
    throw error
  }
}

/**
 * Delete a review meeting
 * Also deletes associated decisions and action items (CASCADE)
 */
export async function deleteReviewMeeting(meetingId: string, userId: string): Promise<void> {
  try {
    // Verify meeting exists
    const meeting = await getReviewMeeting(meetingId)
    if (!meeting) {
      throw new Error('Review meeting not found')
    }

    // Delete the meeting (decisions and action items will be cascade deleted)
    const result = await pool.query(
      `DELETE FROM review_meetings WHERE id = $1`,
      [meetingId]
    )

    if (result.rowCount === 0) {
      throw new Error('Review meeting not found')
    }

    logger.info('Review meeting deleted', { meetingId, userId })
  } catch (error: any) {
    logger.error('deleteReviewMeeting error', { error: error.message, meetingId })
    throw error
  }
}

/**
 * Create review decision
 */
export async function createReviewDecision(
  meetingId: string,
  data: Partial<ReviewDecision>,
  userId: string
): Promise<ReviewDecision> {
  try {
    const result = await pool.query(
      `INSERT INTO review_decisions (
        review_meeting_id, decision_type, decision_text,
        affected_projects, affected_programs, approved_by,
        approval_date, implementation_deadline, implementation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        meetingId,
        data.decision_type,
        data.decision_text,
        data.affected_projects || [],
        data.affected_programs || [],
        userId,
        data.approval_date || new Date().toISOString(),
        data.implementation_deadline || null,
        data.implementation_status || 'pending'
      ]
    )
    return result.rows[0]
  } catch (error: any) {
    logger.error('createReviewDecision error', { error: error.message, meetingId })
    throw error
  }
}

/**
 * Create review action item
 */
export async function createReviewActionItem(
  meetingId: string,
  data: Partial<ReviewActionItem>,
  userId: string
): Promise<ReviewActionItem> {
  try {
    const result = await pool.query(
      `INSERT INTO review_action_items (
        review_meeting_id, action_text, assigned_to, due_date,
        status, priority, related_project_id, related_program_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        meetingId,
        data.action_text,
        data.assigned_to || null,
        data.due_date || null,
        data.status || 'open',
        data.priority || 'medium',
        data.related_project_id || null,
        data.related_program_id || null
      ]
    )
    return result.rows[0]
  } catch (error: any) {
    logger.error('createReviewActionItem error', { error: error.message, meetingId })
    throw error
  }
}

/**
 * Get review compliance status
 */
export async function getReviewCompliance(programId: string): Promise<ReviewCompliance[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM review_cadence_compliance WHERE program_id = $1`,
      [programId]
    )
    return result.rows
  } catch (error: any) {
    logger.error('getReviewCompliance error', { error: error.message, programId })
    throw error
  }
}

/**
 * Get upcoming reviews
 */
export async function getUpcomingReviews(
  userId?: string,
  daysAhead: number = 30
): Promise<ReviewMeeting[]> {
  try {
    let query = `
      SELECT rm.* FROM review_meetings rm
      JOIN review_schedules rs ON rm.schedule_id = rs.id
      WHERE rm.status IN ('scheduled', 'in-progress')
        AND rm.scheduled_date >= CURRENT_DATE
        AND rm.scheduled_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
        AND rs.is_active = TRUE
    `
    const params: any[] = []

    if (userId) {
      query += ` AND (
        $1::uuid = ANY(rs.required_attendees) 
        OR $1::uuid = ANY(rs.optional_attendees)
        OR rs.review_owner_id = $1
      )`
      params.push(userId)
    }

    query += ` ORDER BY rm.scheduled_date ASC`

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('getUpcomingReviews error', { error: error.message })
    throw error
  }
}

/**
 * Get overdue reviews
 */
export async function getOverdueReviews(userId?: string): Promise<ReviewCompliance[]> {
  try {
    let query = `
      SELECT * FROM review_cadence_compliance
      WHERE compliance_status = 'overdue'
    `
    const params: any[] = []

    if (userId) {
      query += ` AND program_id IN (
        SELECT id FROM programs WHERE owner_id = $1
      )`
      params.push(userId)
    }

    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    logger.error('getOverdueReviews error', { error: error.message })
    throw error
  }
}

/**
 * Generate upcoming meetings for a review schedule
 * Calculates the next N meetings based on frequency and day settings
 */
export async function generateUpcomingMeetings(
  scheduleId: string,
  monthsAhead: number = 3
): Promise<ReviewMeeting[]> {
  try {
    const schedule = await getReviewSchedule(scheduleId)
    if (!schedule || !schedule.is_active) {
      return []
    }

    const meetings: ReviewMeeting[] = []
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + monthsAhead)

    // Get existing meetings for this schedule
    const existingMeetings = await pool.query(
      `SELECT scheduled_date FROM review_meetings 
       WHERE schedule_id = $1 AND status != 'cancelled'
       ORDER BY scheduled_date`,
      [scheduleId]
    )
    const existingDates = new Set(
      existingMeetings.rows.map((r: any) => r.scheduled_date.split('T')[0])
    )

    // Calculate meeting dates based on frequency
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      let meetingDate: Date | null = null

      if (schedule.frequency === 'monthly') {
        meetingDate = calculateMonthlyDate(currentDate, schedule.day_of_month, schedule.day_of_week)
      } else if (schedule.frequency === 'quarterly') {
        meetingDate = calculateQuarterlyDate(currentDate, schedule.day_of_month, schedule.day_of_week)
      } else if (schedule.frequency === 'bi-annually') {
        meetingDate = calculateBiAnnuallyDate(currentDate, schedule.day_of_month, schedule.day_of_week)
      } else if (schedule.frequency === 'annually') {
        meetingDate = calculateAnnuallyDate(currentDate, schedule.day_of_month, schedule.day_of_week)
      }

      if (meetingDate && meetingDate >= startDate && meetingDate <= endDate) {
        const dateKey = meetingDate.toISOString().split('T')[0]
        if (!existingDates.has(dateKey)) {
          // Create meeting
          const meeting = await createReviewMeeting(
            scheduleId,
            schedule.program_id,
            {
              scheduled_date: dateKey,
              duration_minutes: schedule.duration_minutes,
              status: 'scheduled',
              attendees: schedule.required_attendees || [],
            },
            schedule.review_owner_id || 'system'
          )
          meetings.push(meeting)
          existingDates.add(dateKey)
        }
      }

      // Move to next period
      currentDate = new Date(currentDate)
      if (schedule.frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else if (schedule.frequency === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3)
      } else if (schedule.frequency === 'bi-annually') {
        currentDate.setMonth(currentDate.getMonth() + 6)
      } else {
        currentDate.setFullYear(currentDate.getFullYear() + 1)
      }
    }

    return meetings
  } catch (error: any) {
    logger.error('generateUpcomingMeetings error', { error: error.message, scheduleId })
    throw error
  }
}

/**
 * Calculate monthly meeting date
 */
function calculateMonthlyDate(
  baseDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: string
): Date | null {
  const date = new Date(baseDate)
  date.setDate(1) // Start of month

  if (dayOfMonth) {
    // Use day of month (e.g., 15th)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    date.setDate(Math.min(dayOfMonth, lastDay))
  } else if (dayOfWeek) {
    // Use day of week (e.g., first Monday)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = weekdays.indexOf(dayOfWeek.toLowerCase())
    if (targetDay === -1) return null

    // Find first occurrence of that weekday in the month
    const firstDay = date.getDay()
    let daysToAdd = (targetDay - firstDay + 7) % 7
    date.setDate(1 + daysToAdd)
  } else {
    return null
  }

  return date >= baseDate ? date : null
}

/**
 * Calculate quarterly meeting date
 */
function calculateQuarterlyDate(
  baseDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: string
): Date | null {
  const date = new Date(baseDate)
  // Get current quarter start
  const quarter = Math.floor(date.getMonth() / 3)
  date.setMonth(quarter * 3, 1)

  if (dayOfMonth) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 3, 0).getDate()
    date.setDate(Math.min(dayOfMonth, lastDay))
  } else if (dayOfWeek) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = weekdays.indexOf(dayOfWeek.toLowerCase())
    if (targetDay === -1) return null

    const firstDay = date.getDay()
    let daysToAdd = (targetDay - firstDay + 7) % 7
    date.setDate(1 + daysToAdd)
  } else {
    return null
  }

  return date >= baseDate ? date : null
}

/**
 * Calculate bi-annually meeting date
 */
function calculateBiAnnuallyDate(
  baseDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: string
): Date | null {
  const date = new Date(baseDate)
  // Get current half-year start (Jan or Jul)
  const halfYear = date.getMonth() < 6 ? 0 : 6
  date.setMonth(halfYear, 1)

  if (dayOfMonth) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 6, 0).getDate()
    date.setDate(Math.min(dayOfMonth, lastDay))
  } else if (dayOfWeek) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = weekdays.indexOf(dayOfWeek.toLowerCase())
    if (targetDay === -1) return null

    const firstDay = date.getDay()
    let daysToAdd = (targetDay - firstDay + 7) % 7
    date.setDate(1 + daysToAdd)
  } else {
    return null
  }

  return date >= baseDate ? date : null
}

/**
 * Calculate annually meeting date
 */
function calculateAnnuallyDate(
  baseDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: string
): Date | null {
  const date = new Date(baseDate)
  date.setMonth(0, 1) // January 1st

  if (dayOfMonth) {
    const lastDay = new Date(date.getFullYear(), 12, 0).getDate()
    date.setDate(Math.min(dayOfMonth, lastDay))
  } else if (dayOfWeek) {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = weekdays.indexOf(dayOfWeek.toLowerCase())
    if (targetDay === -1) return null

    const firstDay = date.getDay()
    let daysToAdd = (targetDay - firstDay + 7) % 7
    date.setDate(1 + daysToAdd)
  } else {
    return null
  }

  return date >= baseDate ? date : null
}

/**
 * Auto-generate meetings for all active schedules
 * Called by scheduled job or manual trigger
 */
export async function autoGenerateMeetingsForAllSchedules(monthsAhead: number = 3): Promise<{
  schedulesProcessed: number
  meetingsCreated: number
  errors: string[]
}> {
  try {
    const result = await pool.query(
      `SELECT id FROM review_schedules WHERE is_active = TRUE`
    )

    let meetingsCreated = 0
    const errors: string[] = []

    for (const row of result.rows) {
      try {
        const meetings = await generateUpcomingMeetings(row.id, monthsAhead)
        meetingsCreated += meetings.length
      } catch (error: any) {
        errors.push(`Schedule ${row.id}: ${error.message}`)
        logger.error('Failed to generate meetings for schedule', {
          scheduleId: row.id,
          error: error.message
        })
      }
    }

    return {
      schedulesProcessed: result.rows.length,
      meetingsCreated,
      errors
    }
  } catch (error: any) {
    logger.error('autoGenerateMeetingsForAllSchedules error', { error: error.message })
    throw error
  }
}
