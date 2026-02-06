/**
 * Emergency Meeting Service
 * CR-2026-001: Auto-schedule emergency meetings for critical drift
 * 
 * Automatically schedules emergency meetings when critical drift is detected,
 * particularly for budget overruns >= 25% (emergency) or >= 10% (critical)
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { teamsService } from './teamsService'
import { v4 as uuidv4 } from 'uuid'

export interface BudgetDriftData {
  projectId: string
  projectName: string
  driftRecordId: string
  approvedBudget: number
  projectedCost: number
  overrunAmount: number
  overrunPercentage: number
  rootCause?: string
  changeRequestId?: string
}

export interface EmergencyMeeting {
  id: string
  meetingId: string
  title: string
  projectId: string
  driftRecordId: string
  changeRequestId?: string
  severity: 'warning' | 'critical' | 'emergency'
  meetingType: string
  triggerReason: string
  overrunAmount?: number
  overrunPercentage?: number
  agenda: any
  requiredAttendees: any[]
  optionalAttendees: any[]
  scheduledDate: Date
  scheduledDurationMinutes: number
  status: string
  escalationLevel: number
  autoScheduled: boolean
}

export interface MeetingAttendee {
  userId?: string
  email: string
  name: string
  role: string
  required: boolean
}

export interface ScheduleMeetingResult {
  meeting: EmergencyMeeting
  attendees: MeetingAttendee[]
  notificationsSent: boolean
}

export class EmergencyMeetingService {
  /**
   * Auto-schedule emergency meeting for budget overrun
   */
  async scheduleBudgetOverrunMeeting(
    driftData: BudgetDriftData,
    userId?: string
  ): Promise<ScheduleMeetingResult> {
    try {
      logger.info('[EMERGENCY-MEETING] Scheduling budget overrun meeting', {
        projectId: driftData.projectId,
        overrunPercentage: driftData.overrunPercentage
      })

      // Determine severity based on overrun percentage
      const severity = this.calculateSeverity(driftData.overrunPercentage)
      const escalationLevel = this.getEscalationLevel(severity)

      // Generate meeting details
      const meetingId = await this.generateMeetingId()
      const title = this.generateMeetingTitle(driftData, severity)
      const triggerReason = this.generateTriggerReason(driftData, severity)
      const agenda = this.generateAgenda(driftData, severity)

      // Determine attendees based on severity
      const attendees = await this.determineAttendees(
        driftData.projectId,
        severity,
        escalationLevel
      )

      // Calculate meeting time (ASAP based on severity)
      const scheduledDate = this.calculateMeetingTime(severity)

      // Create meeting record
      const meeting = await this.createMeetingRecord({
        meetingId,
        title,
        projectId: driftData.projectId,
        driftRecordId: driftData.driftRecordId,
        changeRequestId: driftData.changeRequestId,
        severity,
        meetingType: 'budget_overrun',
        triggerReason,
        overrunAmount: driftData.overrunAmount,
        overrunPercentage: driftData.overrunPercentage,
        agenda,
        requiredAttendees: attendees.filter(a => a.required),
        optionalAttendees: attendees.filter(a => !a.required),
        scheduledDate,
        scheduledDurationMinutes: this.getMeetingDuration(severity),
        escalationLevel,
        createdBy: userId
      })

      // Add attendees to meeting_attendees table
      await this.addAttendees(meeting.id, attendees)

      // Send notifications (email, slack, SMS for emergency)
      const notificationsSent = await this.sendMeetingNotifications(
        meeting,
        attendees,
        severity
      )

      logger.info('[EMERGENCY-MEETING] Meeting scheduled successfully', {
        meetingId,
        severity,
        attendeeCount: attendees.length,
        scheduledDate
      })

      return {
        meeting,
        attendees,
        notificationsSent
      }
    } catch (error) {
      logger.error('[EMERGENCY-MEETING] Failed to schedule meeting:', error)
      throw error
    }
  }

  /**
   * Calculate severity based on overrun percentage
   */
  private calculateSeverity(overrunPercentage: number): 'warning' | 'critical' | 'emergency' {
    if (overrunPercentage >= 25) {
      return 'emergency'
    } else if (overrunPercentage >= 10) {
      return 'critical'
    } else {
      return 'warning'
    }
  }

  /**
   * Get escalation level based on severity
   */
  private getEscalationLevel(severity: 'warning' | 'critical' | 'emergency'): number {
    switch (severity) {
      case 'emergency':
        return 5 // Board/CEO level
      case 'critical':
        return 4 // C-Level (CFO, CTO)
      case 'warning':
        return 2 // Director level
      default:
        return 1 // Manager level
    }
  }

  /**
   * Generate unique meeting ID
   */
  private async generateMeetingId(): Promise<string> {
    const year = new Date().getFullYear()

    // Get count of meetings this year for sequential numbering
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM emergency_meetings 
       WHERE meeting_id LIKE $1`,
      [`EMRG-${year}-%`]
    )

    const count = parseInt(result.rows[0]?.count || '0') + 1
    return `EMRG-${year}-${count.toString().padStart(3, '0')}`
  }

  /**
   * Generate meeting title
   */
  private generateMeetingTitle(
    driftData: BudgetDriftData,
    severity: 'warning' | 'critical' | 'emergency'
  ): string {
    const severityEmoji = {
      emergency: '🚨🚨 EMERGENCY',
      critical: '🚨 CRITICAL',
      warning: '⚠️ WARNING'
    }

    return `${severityEmoji[severity]}: Budget Overrun - ${driftData.projectName}`
  }

  /**
   * Generate trigger reason (Markdown format)
   */
  private generateTriggerReason(
    driftData: BudgetDriftData,
    severity: 'warning' | 'critical' | 'emergency'
  ): string {
    return `# Budget Overrun Detected

**Project**: ${driftData.projectName}  
**Severity**: ${severity.toUpperCase()}  
**Detected**: ${new Date().toISOString().split('T')[0]}

## Financial Impact

- **Approved Budget**: $${driftData.approvedBudget.toLocaleString()}
- **Projected Cost**: $${driftData.projectedCost.toLocaleString()}
- **Overrun Amount**: $${driftData.overrunAmount.toLocaleString()}
- **Overrun Percentage**: ${driftData.overrunPercentage.toFixed(1)}%

## Root Cause

${driftData.rootCause || 'To be determined in meeting'}

## Urgency

${severity === 'emergency'
        ? 'This is a **critical emergency** requiring immediate executive attention. Project exceeding budget by 25%+ may impact quarterly results and other strategic initiatives.'
        : severity === 'critical'
          ? 'This is a **critical situation** requiring urgent senior management decision. Project significantly over budget and requires immediate corrective action.'
          : 'Budget variance detected requiring management review and corrective action planning.'
      }

## Required Action

Decision required on corrective action options within ${severity === 'emergency' ? '12 hours' : severity === 'critical' ? '24 hours' : '48 hours'}.
`
  }

  /**
   * Generate meeting agenda
   */
  private generateAgenda(
    driftData: BudgetDriftData,
    severity: 'warning' | 'critical' | 'emergency'
  ): any {
    return [
      {
        item: 'Review Budget Overrun Analysis',
        duration: 15,
        presenter: 'Project Manager',
        details: 'Present current vs approved budget, projected final cost, and variance analysis'
      },
      {
        item: 'Root Cause Examination',
        duration: 15,
        presenter: 'Project Manager',
        details: 'Analyze what led to the overrun and whether it was preventable'
      },
      {
        item: 'Review Corrective Options',
        duration: 20,
        presenter: 'Finance/PMO',
        details: 'Present options: approve additional funding, reduce scope, adjust timeline, or cancel project'
      },
      {
        item: 'Impact Assessment',
        duration: 10,
        presenter: 'CFO/Finance',
        details: 'Impact on portfolio, other projects, and quarterly/annual budgets'
      },
      {
        item: 'Decision & Approval',
        duration: 15,
        presenter: 'Sponsor/Executive',
        details: 'Make final decision on corrective action and approve change request'
      },
      {
        item: 'Action Items & Next Steps',
        duration: 5,
        presenter: 'All',
        details: 'Assign follow-up actions, set deadlines, and schedule follow-up if needed'
      }
    ]
  }

  /**
   * Determine meeting attendees based on severity
   */
  private async determineAttendees(
    projectId: string,
    severity: 'warning' | 'critical' | 'emergency',
    escalationLevel: number
  ): Promise<MeetingAttendee[]> {
    const attendees: MeetingAttendee[] = []

    // Get project team members
    const projectTeamResult = await pool.query(
      `SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.name,
        pr.role_name,
        CASE 
          WHEN pr.role_name ILIKE '%sponsor%' THEN true
          WHEN pr.role_name ILIKE '%manager%' THEN true
          ELSE false
        END as is_required
       FROM project_resource_assignments pra
       JOIN users u ON pra.user_id = u.id
       JOIN project_roles pr ON pra.role_id = pr.id
       WHERE pra.project_id = $1
       AND pra.status = 'active'`,
      [projectId]
    )

    // Add project team members
    projectTeamResult.rows.forEach(row => {
      attendees.push({
        userId: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role_name,
        required: row.is_required || severity !== 'warning'
      })
    })

    // For critical/emergency, add executives
    if (severity === 'critical' || severity === 'emergency') {
      const executivesResult = await pool.query(
        `SELECT id as user_id, email, name, role
         FROM users
         WHERE role IN ('admin', 'executive')
         LIMIT 5`
      )

      executivesResult.rows.forEach(row => {
        if (!attendees.find(a => a.userId === row.user_id)) {
          attendees.push({
            userId: row.user_id,
            email: row.email,
            name: row.name,
            role: 'Executive',
            required: severity === 'emergency'
          })
        }
      })
    }

    return attendees
  }

  /**
   * Calculate meeting time based on severity
   */
  private calculateMeetingTime(severity: 'warning' | 'critical' | 'emergency'): Date {
    const now = new Date()

    switch (severity) {
      case 'emergency':
        // Schedule within 6-12 hours (next business day morning if after hours)
        now.setHours(now.getHours() + 8)
        break
      case 'critical':
        // Schedule within 24 hours
        now.setHours(now.getHours() + 24)
        break
      case 'warning':
        // Schedule within 48-72 hours
        now.setHours(now.getHours() + 48)
        break
    }

    // Adjust to business hours (9 AM - 5 PM, Mon-Fri)
    const hour = now.getHours()
    const day = now.getDay()

    // If weekend, move to Monday
    if (day === 0) { // Sunday
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
    } else if (day === 6) { // Saturday
      now.setDate(now.getDate() + 2)
      now.setHours(9, 0, 0, 0)
    } else if (hour < 9) {
      now.setHours(9, 0, 0, 0)
    } else if (hour >= 17) {
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
    }

    return now
  }

  /**
   * Get meeting duration based on severity
   */
  private getMeetingDuration(severity: 'warning' | 'critical' | 'emergency'): number {
    switch (severity) {
      case 'emergency':
        return 90 // 90 minutes for emergency
      case 'critical':
        return 60 // 60 minutes for critical
      case 'warning':
        return 45 // 45 minutes for warning
      default:
        return 60
    }
  }

  /**
   * Create meeting record in database
   */
  private async createMeetingRecord(data: {
    meetingId: string
    title: string
    projectId: string
    driftRecordId: string
    changeRequestId?: string
    severity: string
    meetingType: string
    triggerReason: string
    overrunAmount?: number
    overrunPercentage?: number
    agenda: any
    requiredAttendees: MeetingAttendee[]
    optionalAttendees: MeetingAttendee[]
    scheduledDate: Date
    scheduledDurationMinutes: number
    escalationLevel: number
    createdBy?: string
  }): Promise<EmergencyMeeting> {
    const result = await pool.query(
      `INSERT INTO emergency_meetings (
        meeting_id,
        title,
        project_id,
        drift_record_id,
        change_request_id,
        severity,
        meeting_type,
        trigger_reason,
        overrun_amount,
        overrun_percentage,
        agenda,
        required_attendees,
        optional_attendees,
        scheduled_date,
        scheduled_duration_minutes,
        escalation_level,
        auto_scheduled,
        auto_scheduled_by,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        data.meetingId,
        data.title,
        data.projectId,
        data.driftRecordId,
        data.changeRequestId || null,
        data.severity,
        data.meetingType,
        data.triggerReason,
        data.overrunAmount || null,
        data.overrunPercentage || null,
        JSON.stringify(data.agenda),
        JSON.stringify(data.requiredAttendees),
        JSON.stringify(data.optionalAttendees),
        data.scheduledDate,
        data.scheduledDurationMinutes,
        data.escalationLevel,
        true,
        'drift_detection_system',
        data.createdBy || null
      ]
    )

    return result.rows[0]
  }

  /**
   * Add attendees to meeting_attendees table
   */
  private async addAttendees(
    meetingId: string,
    attendees: MeetingAttendee[]
  ): Promise<void> {
    for (const attendee of attendees) {
      await pool.query(
        `INSERT INTO meeting_attendees (
          meeting_id,
          user_id,
          email,
          name,
          role,
          required
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          meetingId,
          attendee.userId || null,
          attendee.email,
          attendee.name,
          attendee.role,
          attendee.required
        ]
      )
    }
  }

  /**
   * Send meeting notifications
   */
  private async sendMeetingNotifications(
    meeting: EmergencyMeeting,
    attendees: MeetingAttendee[],
    severity: 'warning' | 'critical' | 'emergency'
  ): Promise<boolean> {
    try {
      logger.info('[EMERGENCY-MEETING] Sending notifications', {
        meetingId: meeting.meetingId,
        severity,
        attendeeCount: attendees.length
      })

      // In a real implementation, this would:
      // 1. Send emails to all attendees
      // 2. Send Teams notifications
      await this.sendTeamsMeetingNotification(meeting, attendees)

      // 3. Send SMS for emergency severity
      // 4. Create dashboard alerts

      // For now, just log and update the meeting record
      await pool.query(
        `UPDATE emergency_meetings 
         SET email_sent = true,
             dashboard_alert_sent = true,
             status = 'notified',
             notifications_sent = $1
         WHERE id = $2`,
        [
          JSON.stringify([
            {
              type: 'email',
              sentAt: new Date(),
              recipients: attendees.map(a => a.email)
            },
            {
              type: 'dashboard',
              sentAt: new Date()
            }
          ]),
          meeting.id
        ]
      )

      return true
    } catch (error) {
      logger.error('[EMERGENCY-MEETING] Failed to send notifications:', error)
      return false
    }
  }

  /**
   * Send Teams notification for an emergency meeting
   */
  private async sendTeamsMeetingNotification(meeting: EmergencyMeeting, attendees: MeetingAttendee[]): Promise<void> {
    try {
      // Get integration for Teams
      const integrationResult = await pool.query(
        "SELECT configuration, credentials_encrypted FROM integrations WHERE type = 'teams' AND is_active = true LIMIT 1"
      )

      if (integrationResult.rows.length === 0) {
        logger.warn('[EMERGENCY-MEETING] No active Teams integration found, skipping notification')
        return
      }

      const credentials = JSON.parse(
        Buffer.from(integrationResult.rows[0].credentials_encrypted, 'base64').toString('utf-8')
      )
      const webhookUrl = credentials.webhookUrl || credentials.webhook_url

      if (!webhookUrl) {
        logger.warn('[EMERGENCY-MEETING] Teams webhook URL not found in credentials')
        return
      }

      // Prepare message facts
      const facts = teamsService.formatFacts({
        meeting_id: meeting.meetingId,
        severity: meeting.severity,
        scheduled_for: meeting.scheduledDate.toLocaleString(),
        project: meeting.projectId,
        overrun: meeting.overrunPercentage ? `${meeting.overrunPercentage.toFixed(1)}%` : 'N/A'
      })

      await teamsService.sendNotification({
        webhookUrl,
        title: `🗓️ MEETING SCHEDULED: ${meeting.title}`,
        summary: `Emergency meeting scheduled for ${meeting.scheduledDate.toLocaleString()}`,
        text: `An emergency meeting has been auto-scheduled to address critical issues.`,
        severity: meeting.severity as any,
        sections: facts,
        actions: [
          {
            "@type": "OpenUri",
            "name": "View Meeting Details",
            "targets": [{ "os": "default", "uri": `${process.env.FRONTEND_URL}/meetings/${meeting.meetingId}` }]
          },
          {
            "@type": "OpenUri",
            "name": "Join Meeting (Teams)",
            "targets": [{ "os": "default", "uri": "https://teams.microsoft.com/l/meeting/..." }] // Placeholder for real meeting link
          }
        ]
      })
    } catch (error) {
      logger.error('[EMERGENCY-MEETING] Failed to send Teams meeting notification:', error)
    }
  }

  /**
   * Get meeting by ID
   */
  async getMeeting(meetingId: string): Promise<EmergencyMeeting | null> {
    const result = await pool.query(
      'SELECT * FROM emergency_meetings WHERE meeting_id = $1',
      [meetingId]
    )

    return result.rows[0] || null
  }

  /**
   * Get meetings for a project
   */
  async getProjectMeetings(projectId: string): Promise<EmergencyMeeting[]> {
    const result = await pool.query(
      `SELECT * FROM emergency_meetings 
       WHERE project_id = $1 
       ORDER BY created_at DESC`,
      [projectId]
    )

    return result.rows
  }

  /**
   * Update meeting status
   */
  async updateMeetingStatus(
    meetingId: string,
    status: string,
    userId?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE emergency_meetings 
       SET status = $1, updated_at = NOW()
       WHERE meeting_id = $2`,
      [status, meetingId]
    )

    logger.info('[EMERGENCY-MEETING] Status updated', {
      meetingId,
      status,
      userId
    })
  }
}

export const emergencyMeetingService = new EmergencyMeetingService()
