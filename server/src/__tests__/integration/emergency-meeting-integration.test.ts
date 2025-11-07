/**
 * Integration Test: Emergency Meeting Auto-Scheduling
 * Tests the complete workflow from drift detection to meeting scheduling
 */

import { budgetOverrunAlertService } from '../../services/budgetOverrunAlertService'
import { meetingSchedulerService } from '../../services/meetingSchedulerService'
import { pool } from '../../database/connection'

describe('Emergency Meeting Auto-Scheduling Integration', () => {
  const testProjectId = '123e4567-e89b-12d3-a456-426614174000'
  const testUserId = '123e4567-e89b-12d3-a456-426614174001'
  
  beforeAll(async () => {
    // Ensure test project exists
    await pool.query(
      `INSERT INTO projects (id, name, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [testProjectId, 'Integration Test Project', 'Test project for integration tests', 'active', testUserId]
    )
  })
  
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM notification_queue WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM meeting_attendees WHERE meeting_id IN (SELECT id FROM meetings WHERE project_id = $1)', [testProjectId])
    await pool.query('DELETE FROM meetings WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM budget_overrun_alerts WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.end()
  })
  
  describe('Complete Budget Overrun Workflow', () => {
    it('should handle 30% budget overrun end-to-end', async () => {
      // Scenario: Project has 30% budget overrun (emergency level)
      const approvedBudget = 500000
      const projectedCost = 650000
      
      const detection = {
        projectId: testProjectId,
        projectName: 'Integration Test Project',
        approvedBudget,
        projectedCost,
        overrunAmount: projectedCost - approvedBudget,
        overrunPercentage: ((projectedCost - approvedBudget) / approvedBudget) * 100,
        rootCause: {
          category: 'Scope Creep',
          description: 'Added 4 unapproved features in month 3',
          responsible: 'Product Team',
          preventable: true
        }
      }
      
      // Step 1: Process budget overrun (creates alert and schedules meeting)
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      // Verify alert was created
      expect(alert).toBeDefined()
      expect(alert.id).toBeDefined()
      expect(alert.severity).toBe('emergency')
      expect(alert.overrunPercentage).toBe(30)
      
      // Verify alert escalated to correct stakeholders
      expect(alert.escalatedTo).toContain('CEO')
      expect(alert.escalatedTo).toContain('CFO')
      expect(alert.escalatedTo).toContain('Board_Finance_Committee')
      
      // Step 2: Verify emergency meeting was auto-scheduled
      expect(alert.meetingId).toBeDefined()
      
      const meeting = await meetingSchedulerService.getMeeting(alert.meetingId!)
      
      expect(meeting).toBeDefined()
      expect(meeting.meeting_type).toBe('emergency_budget_overrun')
      expect(meeting.severity).toBe('emergency')
      expect(meeting.auto_generated).toBe(true)
      expect(meeting.alert_id).toBe(alert.id)
      
      // Verify meeting scheduled within 12 hours (emergency)
      const now = new Date()
      const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000)
      const meetingStart = new Date(meeting.scheduled_start)
      expect(meetingStart.getTime()).toBeLessThan(twelveHoursFromNow.getTime())
      
      // Step 3: Verify attendees were added
      const attendees = JSON.parse(meeting.attendees || '[]')
      expect(attendees.length).toBeGreaterThan(0)
      
      // Step 4: Verify notifications were queued
      const notifications = await pool.query(
        `SELECT * FROM notification_queue 
         WHERE meeting_id = $1 OR alert_id = $2`,
        [meeting.id, alert.id]
      )
      
      expect(notifications.rows.length).toBeGreaterThan(0)
      
      // Verify notification priority is emergency
      const emergencyNotifications = notifications.rows.filter(n => n.priority === 'emergency')
      expect(emergencyNotifications.length).toBeGreaterThan(0)
      
      // Step 5: Verify corrective options were generated
      const fullAlert = await budgetOverrunAlertService.getAlert(alert.id)
      const correctiveOptions = JSON.parse(fullAlert.corrective_options)
      
      expect(correctiveOptions).toBeDefined()
      expect(correctiveOptions.length).toBeGreaterThan(0)
      
      // Should have standard options
      const optionTitles = correctiveOptions.map((o: any) => o.option)
      expect(optionTitles).toContain('Approve additional funding')
      expect(optionTitles).toContain('Reduce scope to baseline')
      
      // Step 6: Simulate stakeholder response - CFO accepts RSVP
      const cfoAttendee = attendees.find((a: any) => 
        a.email && a.email.includes('cfo')
      )
      
      if (cfoAttendee && cfoAttendee.id) {
        await meetingSchedulerService.updateRSVP(cfoAttendee.id, 'accepted')
        
        const updatedMeeting = await meetingSchedulerService.getMeeting(meeting.id)
        const updatedAttendees = JSON.parse(updatedMeeting.attendees || '[]')
        const updatedCfo = updatedAttendees.find((a: any) => a.id === cfoAttendee.id)
        
        expect(updatedCfo.rsvpStatus).toBe('accepted')
      }
      
      // Step 7: Simulate resolution - alert acknowledged and resolved
      await budgetOverrunAlertService.acknowledgeAlert(alert.id, testUserId)
      
      let acknowledgedAlert = await budgetOverrunAlertService.getAlert(alert.id)
      expect(acknowledgedAlert.status).toBe('acknowledged')
      
      await budgetOverrunAlertService.resolveAlert(
        alert.id,
        testUserId,
        'Scope reduced to baseline. Additional features removed. Project back within budget.'
      )
      
      const resolvedAlert = await budgetOverrunAlertService.getAlert(alert.id)
      expect(resolvedAlert.status).toBe('resolved')
      expect(resolvedAlert.resolution_notes).toContain('Scope reduced')
    })
    
    it('should handle 12% budget overrun (critical level)', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Integration Test Project',
        approvedBudget: 100000,
        projectedCost: 112000,
        overrunAmount: 12000,
        overrunPercentage: 12
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      // Verify alert severity
      expect(alert.severity).toBe('critical')
      
      // Verify escalation is to CFO/Sponsor level (not CEO)
      expect(alert.escalatedTo).toContain('CFO')
      expect(alert.escalatedTo).toContain('Project_Sponsor')
      expect(alert.escalatedTo).not.toContain('Board_Finance_Committee')
      
      // Verify meeting was still auto-scheduled
      expect(alert.meetingId).toBeDefined()
      
      const meeting = await meetingSchedulerService.getMeeting(alert.meetingId!)
      
      // Meeting should be scheduled within 24 hours (critical)
      const now = new Date()
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const meetingStart = new Date(meeting.scheduled_start)
      expect(meetingStart.getTime()).toBeLessThan(twentyFourHoursFromNow.getTime())
    })
    
    it('should NOT auto-schedule meeting for 7% overrun (warning level)', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Integration Test Project',
        approvedBudget: 100000,
        projectedCost: 107000,
        overrunAmount: 7000,
        overrunPercentage: 7
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      // Verify alert severity is warning
      expect(alert.severity).toBe('warning')
      
      // Verify NO meeting was auto-scheduled for warning level
      expect(alert.meetingId).toBeUndefined()
      
      // But alert should still be created
      expect(alert.id).toBeDefined()
      expect(alert.escalatedTo).toContain('Project_Manager')
    })
  })
  
  describe('Meeting Lifecycle', () => {
    it('should support complete meeting lifecycle', async () => {
      // Create meeting
      const meeting = await meetingSchedulerService.scheduleEmergencyMeeting(
        {
          projectId: testProjectId,
          title: 'Lifecycle Test Meeting',
          meetingType: 'regular_review',
          severity: 'medium',
          urgency: 'normal',
          attendees: [
            {
              email: 'pm@company.com',
              name: 'Project Manager',
              role: 'organizer'
            },
            {
              email: 'sponsor@company.com',
              name: 'Sponsor',
              role: 'decision_maker'
            }
          ]
        },
        testUserId
      )
      
      expect(meeting.id).toBeDefined()
      expect(meeting.attendees.length).toBe(2)
      
      // Update RSVP for both attendees
      await meetingSchedulerService.updateRSVP(meeting.attendees[0].id, 'accepted')
      await meetingSchedulerService.updateRSVP(meeting.attendees[1].id, 'declined')
      
      // Verify RSVP updates
      const updatedMeeting = await meetingSchedulerService.getMeeting(meeting.id)
      const attendees = JSON.parse(updatedMeeting.attendees || '[]')
      
      expect(attendees[0].rsvpStatus).toBe('accepted')
      expect(attendees[1].rsvpStatus).toBe('declined')
      
      // Cancel meeting
      await meetingSchedulerService.cancelMeeting(
        meeting.id,
        testUserId,
        'Sponsor declined, will reschedule'
      )
      
      // Verify cancellation
      const cancelledMeeting = await meetingSchedulerService.getMeeting(meeting.id)
      expect(cancelledMeeting.status).toBe('cancelled')
    })
  })
})
