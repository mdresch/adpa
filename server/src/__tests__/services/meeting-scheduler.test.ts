/**
 * Meeting Scheduler Service Tests
 * Tests for emergency meeting auto-scheduling functionality
 */

import { meetingSchedulerService } from '../../services/meetingSchedulerService'
import { pool } from '../../database/connection'

describe('MeetingSchedulerService', () => {
  const testProjectId = '123e4567-e89b-12d3-a456-426614174000'
  const testUserId = '123e4567-e89b-12d3-a456-426614174001'
  
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM meetings WHERE project_id = $1', [testProjectId])
    await pool.end()
  })
  
  describe('scheduleEmergencyMeeting', () => {
    it('should schedule an emergency meeting for budget overrun', async () => {
      const request = {
        projectId: testProjectId,
        title: '🚨 EMERGENCY: Budget Review Required',
        description: 'Emergency meeting to review 30% budget overrun',
        meetingType: 'emergency_budget_overrun' as const,
        severity: 'emergency' as const,
        urgency: 'emergency' as const,
        durationMinutes: 60,
        attendees: [
          {
            email: 'cfo@company.com',
            name: 'CFO',
            role: 'decision_maker' as const
          },
          {
            email: 'sponsor@company.com',
            name: 'Project Sponsor',
            role: 'decision_maker' as const
          }
        ],
        autoScheduledReason: 'Auto-scheduled due to emergency budget overrun (30% over baseline)'
      }
      
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        request,
        testUserId
      )
      
      expect(meeting).toBeDefined()
      expect(meeting.id).toBeDefined()
      expect(meeting.title).toBe(request.title)
      expect(meeting.severity).toBe('emergency')
      expect(meeting.attendees).toHaveLength(2)
      
      // Verify meeting is scheduled within 12 hours (emergency)
      const now = new Date()
      const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000)
      expect(meeting.scheduledStart.getTime()).toBeLessThan(twelveHoursFromNow.getTime())
    })
    
    it('should schedule a critical meeting for 15% budget overrun', async () => {
      const request = {
        projectId: testProjectId,
        title: '🚨 CRITICAL: Budget Review Required',
        description: 'Urgent meeting to review 15% budget overrun',
        meetingType: 'urgent_drift_review' as const,
        severity: 'critical' as const,
        urgency: 'urgent' as const,
        durationMinutes: 60,
        attendees: [
          {
            email: 'sponsor@company.com',
            name: 'Project Sponsor',
            role: 'required' as const
          }
        ]
      }
      
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        request,
        testUserId
      )
      
      expect(meeting).toBeDefined()
      expect(meeting.severity).toBe('critical')
      
      // Verify meeting is scheduled within 24 hours (critical)
      const now = new Date()
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      expect(meeting.scheduledStart.getTime()).toBeLessThan(twentyFourHoursFromNow.getTime())
    })
    
    it('should generate default agenda for emergency budget overrun meeting', async () => {
      const request = {
        projectId: testProjectId,
        title: 'Budget Review Meeting',
        meetingType: 'emergency_budget_overrun' as const,
        severity: 'emergency' as const,
        urgency: 'emergency' as const,
        attendees: [
          {
            email: 'test@company.com',
            name: 'Test User',
            role: 'required' as const
          }
        ]
      }
      
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        request,
        testUserId
      )
      
      expect(meeting.agenda).toBeDefined()
      expect(meeting.agenda.length).toBeGreaterThan(0)
      
      // Should have emergency budget review as first agenda item
      expect(meeting.agenda[0].topic).toContain('Emergency Budget Overrun Review')
    })
  })
  
  describe('listMeetings', () => {
    it('should list meetings for a project', async () => {
      // Create a test meeting first
      await meetingSchedulerService.scheduleEmergencyMeeting(
        {
          projectId: testProjectId,
          title: 'Test Meeting',
          meetingType: 'regular_review' as const,
          severity: 'medium' as const,
          urgency: 'normal' as const,
          attendees: [
            {
              email: 'test@company.com',
              name: 'Test User',
              role: 'required' as const
            }
          ]
        },
        testUserId
      )
      
      const meetings = await meetingSchedulerService.listMeetings(testProjectId)
      
      expect(meetings).toBeDefined()
      expect(meetings.length).toBeGreaterThan(0)
    })
    
    it('should filter meetings by status', async () => {
      const meetings = await meetingSchedulerService.listMeetings(
        testProjectId,
        { status: 'scheduled' }
      )
      
      expect(meetings).toBeDefined()
      meetings.forEach(meeting => {
        expect(meeting.status).toBe('scheduled')
      })
    })
  })
  
  describe('updateRSVP', () => {
    it('should update RSVP status for an attendee', async () => {
      // Create a meeting and get attendee ID
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        {
          projectId: testProjectId,
          title: 'RSVP Test Meeting',
          meetingType: 'regular_review' as const,
          severity: 'medium' as const,
          urgency: 'normal' as const,
          attendees: [
            {
              email: 'test@company.com',
              name: 'Test User',
              role: 'required' as const
            }
          ]
        },
        testUserId
      )
      
      const attendeeId = meeting.attendees[0].id
      
      await meetingSchedulerService.updateRSVP(attendeeId, 'accepted')
      
      // Verify RSVP was updated
      const updatedMeeting = await meetingSchedulerService.getMeeting(meeting.id)
      const updatedAttendee = updatedMeeting.attendees.find((a: any) => a.id === attendeeId)
      
      expect(updatedAttendee.rsvpStatus).toBe('accepted')
    })
  })
  
  describe('cancelMeeting', () => {
    it('should cancel a meeting', async () => {
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        {
          projectId: testProjectId,
          title: 'Meeting to Cancel',
          meetingType: 'regular_review' as const,
          severity: 'medium' as const,
          urgency: 'normal' as const,
          attendees: [
            {
              email: 'test@company.com',
              name: 'Test User',
              role: 'required' as const
            }
          ]
        },
        testUserId
      )
      
      await meetingSchedulerService.cancelMeeting(
        meeting.id,
        testUserId,
        'Test cancellation'
      )
      
      // Verify meeting was cancelled
      const cancelledMeeting = await meetingSchedulerService.getMeeting(meeting.id)
      expect(cancelledMeeting.status).toBe('cancelled')
      expect(cancelledMeeting.cancellation_reason).toBe('Test cancellation')
    })
  })
})
