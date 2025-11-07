/**
 * Meeting Scheduler Service
 * CR-2026-001: Emergency Meeting Auto-Scheduling
 * 
 * Automatically schedules emergency meetings when critical drift is detected
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface MeetingScheduleRequest {
  projectId: string
  title: string
  description?: string
  meetingType: 'emergency_budget_overrun' | 'urgent_drift_review' | 'corrective_action' | 'opportunity_review' | 'baseline_approval' | 'regular_review'
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  urgency: 'low' | 'normal' | 'high' | 'urgent' | 'emergency'
  durationMinutes?: number
  agenda?: any[]
  attendees: MeetingAttendee[]
  alertId?: string
  driftRecordId?: string
  changeRequestId?: string
  autoScheduledReason?: string
}

export interface MeetingAttendee {
  userId?: string
  email?: string
  name?: string
  role: 'organizer' | 'required' | 'optional' | 'decision_maker' | 'subject_matter_expert' | 'observer'
}

export interface ScheduledMeeting {
  id: string
  title: string
  scheduledStart: Date
  scheduledEnd: Date
  meetingType: string
  severity: string
  urgency: string
  attendees: any[]
  agenda: any[]
  location?: string
}

export class MeetingSchedulerService {
  /**
   * Auto-schedule an emergency meeting based on budget overrun severity
   */
  async scheduleEmergencyMeeting(
    request: MeetingScheduleRequest,
    createdBy: string
  ): Promise<ScheduledMeeting> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      logger.info('[MEETING-SCHEDULER] Scheduling emergency meeting', {
        projectId: request.projectId,
        severity: request.severity,
        meetingType: request.meetingType
      })
      
      // 1. Calculate meeting time based on urgency
      const { scheduledStart, scheduledEnd } = this.calculateMeetingTime(
        request.severity,
        request.urgency,
        request.durationMinutes
      )
      
      // 2. Generate default agenda based on meeting type
      const agenda = request.agenda || this.generateDefaultAgenda(request.meetingType, request.severity)
      
      // 3. Create meeting record
      const meetingResult = await client.query(
        `INSERT INTO meetings (
          project_id, title, description, meeting_type,
          scheduled_start, scheduled_end, duration_minutes,
          status, severity, urgency,
          agenda, auto_generated, auto_scheduled_reason,
          alert_id, drift_record_id, change_request_id,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, title, scheduled_start, scheduled_end, meeting_type, severity, urgency, agenda`,
        [
          request.projectId,
          request.title,
          request.description || '',
          request.meetingType,
          scheduledStart,
          scheduledEnd,
          request.durationMinutes || 60,
          'scheduled',
          request.severity,
          request.urgency,
          JSON.stringify(agenda),
          true, // auto_generated
          request.autoScheduledReason || 'Auto-scheduled due to critical drift detection',
          request.alertId || null,
          request.driftRecordId || null,
          request.changeRequestId || null,
          createdBy
        ]
      )
      
      const meeting = meetingResult.rows[0]
      
      // 4. Add attendees
      const attendees = []
      for (const attendee of request.attendees) {
        const attendeeResult = await client.query(
          `INSERT INTO meeting_attendees (
            meeting_id, user_id, email, name, role, rsvp_status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, user_id, email, name, role, rsvp_status`,
          [
            meeting.id,
            attendee.userId || null,
            attendee.email || null,
            attendee.name || null,
            attendee.role,
            'pending'
          ]
        )
        attendees.push(attendeeResult.rows[0])
      }
      
      // 5. Queue notifications for all attendees
      await this.queueMeetingNotifications(client, meeting.id, attendees, request.severity)
      
      await client.query('COMMIT')
      
      logger.info('[MEETING-SCHEDULER] Emergency meeting scheduled successfully', {
        meetingId: meeting.id,
        scheduledStart: meeting.scheduled_start,
        attendeeCount: attendees.length
      })
      
      return {
        id: meeting.id,
        title: meeting.title,
        scheduledStart: meeting.scheduled_start,
        scheduledEnd: meeting.scheduled_end,
        meetingType: meeting.meeting_type,
        severity: meeting.severity,
        urgency: meeting.urgency,
        attendees,
        agenda: JSON.parse(meeting.agenda || '[]'),
        location: null
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[MEETING-SCHEDULER] Error scheduling emergency meeting:', error)
      throw error
    } finally {
      client.release()
    }
  }
  
  /**
   * Calculate meeting time based on urgency
   * - Emergency (25%+ overrun): Within 12 hours
   * - Critical (10-25% overrun): Within 24 hours
   * - High: Within 48 hours
   * - Medium: Within 3 days
   */
  private calculateMeetingTime(
    severity: string,
    urgency: string,
    durationMinutes: number = 60
  ): { scheduledStart: Date; scheduledEnd: Date } {
    const now = new Date()
    let hoursUntilMeeting = 72 // Default: 3 days
    
    // Determine scheduling timeframe based on severity/urgency
    if (severity === 'emergency' || urgency === 'emergency') {
      hoursUntilMeeting = 12 // Emergency: within 12 hours
    } else if (severity === 'critical' || urgency === 'urgent') {
      hoursUntilMeeting = 24 // Critical: within 24 hours
    } else if (severity === 'high' || urgency === 'high') {
      hoursUntilMeeting = 48 // High: within 48 hours
    }
    
    // Find next business hours slot
    // For simplicity, schedule at 9 AM next business day or ASAP if emergency
    const scheduledStart = this.findNextAvailableSlot(now, hoursUntilMeeting, severity === 'emergency')
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000)
    
    return { scheduledStart, scheduledEnd }
  }
  
  /**
   * Find next available meeting slot
   */
  private findNextAvailableSlot(from: Date, maxHours: number, isEmergency: boolean): Date {
    const slot = new Date(from)
    
    if (isEmergency) {
      // For emergency, schedule ASAP (within 1 hour)
      slot.setHours(slot.getHours() + 1)
      return slot
    }
    
    // Try to schedule at 9 AM next business day
    slot.setDate(slot.getDate() + 1)
    slot.setHours(9, 0, 0, 0)
    
    // Skip weekends
    while (slot.getDay() === 0 || slot.getDay() === 6) {
      slot.setDate(slot.getDate() + 1)
    }
    
    // Ensure within max hours constraint
    const maxTime = new Date(from.getTime() + maxHours * 60 * 60 * 1000)
    if (slot > maxTime) {
      // If next business day is too far, schedule ASAP
      return new Date(from.getTime() + 60 * 60 * 1000) // 1 hour from now
    }
    
    return slot
  }
  
  /**
   * Generate default agenda based on meeting type
   */
  private generateDefaultAgenda(meetingType: string, severity: string): any[] {
    const baseAgenda = [
      {
        order: 1,
        topic: 'Review Alert and Analysis',
        durationMinutes: 15,
        presenter: 'Project Manager'
      },
      {
        order: 2,
        topic: 'Root Cause Discussion',
        durationMinutes: 15,
        presenter: 'Team'
      },
      {
        order: 3,
        topic: 'Review Corrective Options',
        durationMinutes: 20,
        presenter: 'Project Manager'
      },
      {
        order: 4,
        topic: 'Make Decision',
        durationMinutes: 15,
        presenter: 'Decision Makers'
      },
      {
        order: 5,
        topic: 'Approve Change Request',
        durationMinutes: 10,
        presenter: 'Sponsor'
      }
    ]
    
    if (meetingType === 'emergency_budget_overrun') {
      baseAgenda.unshift({
        order: 0,
        topic: '🚨 Emergency Budget Overrun Review',
        durationMinutes: 5,
        presenter: 'CFO'
      })
    }
    
    return baseAgenda
  }
  
  /**
   * Queue notifications for meeting attendees
   */
  private async queueMeetingNotifications(
    client: any,
    meetingId: string,
    attendees: any[],
    severity: string
  ): Promise<void> {
    for (const attendee of attendees) {
      const priority = severity === 'emergency' ? 'emergency' : 
                      severity === 'critical' ? 'urgent' : 'high'
      
      await client.query(
        `INSERT INTO notification_queue (
          notification_type, recipient_user_id, recipient_email, recipient_name,
          subject, body, priority, channels, meeting_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'meeting_invitation',
          attendee.user_id || null,
          attendee.email || null,
          attendee.name || null,
          `${severity === 'emergency' ? '🚨 EMERGENCY ' : ''}Meeting Invitation: Budget Review Required`,
          'You have been invited to an emergency meeting to review budget overrun.',
          priority,
          JSON.stringify(['email', 'dashboard']),
          meetingId,
          'pending'
        ]
      )
    }
  }
  
  /**
   * Get meeting by ID
   */
  async getMeeting(meetingId: string): Promise<any> {
    const result = await pool.query(
      `SELECT m.*, 
        json_agg(
          json_build_object(
            'id', ma.id,
            'userId', ma.user_id,
            'email', ma.email,
            'name', ma.name,
            'role', ma.role,
            'rsvpStatus', ma.rsvp_status,
            'attended', ma.attended
          )
        ) as attendees
      FROM meetings m
      LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
      WHERE m.id = $1
      GROUP BY m.id`,
      [meetingId]
    )
    
    return result.rows[0] || null
  }
  
  /**
   * List meetings for a project
   */
  async listMeetings(projectId: string, filters?: any): Promise<any[]> {
    let query = `
      SELECT m.*, 
        COUNT(ma.id) as attendee_count
      FROM meetings m
      LEFT JOIN meeting_attendees ma ON m.id = ma.meeting_id
      WHERE m.project_id = $1
    `
    const params: any[] = [projectId]
    
    if (filters?.status) {
      params.push(filters.status)
      query += ` AND m.status = $${params.length}`
    }
    
    if (filters?.severity) {
      params.push(filters.severity)
      query += ` AND m.severity = $${params.length}`
    }
    
    query += ` GROUP BY m.id ORDER BY m.scheduled_start DESC`
    
    const result = await pool.query(query, params)
    return result.rows
  }
  
  /**
   * Update RSVP status
   */
  async updateRSVP(
    attendeeId: string,
    status: 'accepted' | 'declined' | 'tentative'
  ): Promise<void> {
    await pool.query(
      `UPDATE meeting_attendees 
       SET rsvp_status = $1, rsvp_at = NOW()
       WHERE id = $2`,
      [status, attendeeId]
    )
    
    logger.info('[MEETING-SCHEDULER] RSVP updated', { attendeeId, status })
  }
  
  /**
   * Cancel a meeting
   */
  async cancelMeeting(
    meetingId: string,
    cancelledBy: string,
    reason: string
  ): Promise<void> {
    await pool.query(
      `UPDATE meetings 
       SET status = 'cancelled', 
           cancelled_at = NOW(),
           cancelled_by = $2,
           cancellation_reason = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [meetingId, cancelledBy, reason]
    )
    
    // Queue cancellation notifications
    const meeting = await this.getMeeting(meetingId)
    if (meeting && meeting.attendees) {
      const client = await pool.connect()
      try {
        for (const attendee of meeting.attendees) {
          await client.query(
            `INSERT INTO notification_queue (
              notification_type, recipient_user_id, recipient_email,
              subject, body, priority, channels, meeting_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              'meeting_cancelled',
              attendee.userId || null,
              attendee.email || null,
              `Meeting Cancelled: ${meeting.title}`,
              `The meeting has been cancelled. Reason: ${reason}`,
              'high',
              JSON.stringify(['email', 'dashboard']),
              meetingId,
              'pending'
            ]
          )
        }
      } finally {
        client.release()
      }
    }
    
    logger.info('[MEETING-SCHEDULER] Meeting cancelled', { meetingId, reason })
  }
}

export const meetingSchedulerService = new MeetingSchedulerService()
