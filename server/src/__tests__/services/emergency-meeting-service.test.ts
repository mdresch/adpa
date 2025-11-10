/**
 * Test: Emergency Meeting Auto-Scheduling
 * 
 * Verifies that emergency meetings are automatically scheduled when
 * critical budget overruns are detected (>= 10%)
 */

import { emergencyMeetingService } from '../../services/emergencyMeetingService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('Emergency Meeting Service', () => {
  let testProjectId: string
  let testUserId: string
  let testBaselineId: string
  let testDriftRecordId: string

  beforeAll(async () => {
    // Create test data
    testProjectId = uuidv4()
    testUserId = uuidv4()
    testBaselineId = uuidv4()
    testDriftRecordId = uuidv4()

    // Create test user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'test-emergency@example.com', 'hash', 'admin', 'Test Emergency User')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id, budget)
       VALUES ($1, 'Test Emergency Project', $2, 500000)`,
      [testProjectId, testUserId]
    )

    // Create test baseline with budget
    await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, created_by, cost_baseline
       )
       VALUES ($1, $2, '1.0', 'approved', $3, $4)`,
      [
        testBaselineId,
        testProjectId,
        testUserId,
        JSON.stringify({
          total_budget: 500000,
          currency: 'USD'
        })
      ]
    )

    // Create test drift record
    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, drift_description, source_document_id)
       VALUES ($1, $2, $3, 'cost_drift', 'critical', 'Budget overrun detected', NULL)`,
      [testDriftRecordId, testBaselineId, testProjectId]
    )
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM emergency_meetings WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM baseline_drift_detection WHERE id = $1', [testDriftRecordId])
    await pool.query('DELETE FROM project_baselines WHERE id = $1', [testBaselineId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    
    // Close pool
    await pool.end()
  })

  describe('scheduleBudgetOverrunMeeting', () => {
    test('should schedule emergency meeting for 25%+ overrun', async () => {
      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30, // 30% overrun = emergency
          rootCause: 'Scope creep without approval'
        },
        testUserId
      )

      expect(result).toBeDefined()
      expect(result.meeting).toBeDefined()
      expect(result.meeting.severity).toBe('emergency')
      expect(result.meeting.meetingType).toBe('budget_overrun')
      expect(result.meeting.overrunPercentage).toBe(30)
      expect(result.meeting.escalationLevel).toBe(5) // Board/CEO level
      expect(result.meeting.autoScheduled).toBe(true)
      expect(result.attendees.length).toBeGreaterThan(0)
    })

    test('should schedule critical meeting for 10-25% overrun', async () => {
      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 575000,
          overrunAmount: 75000,
          overrunPercentage: 15, // 15% overrun = critical
          rootCause: 'Underestimated development effort'
        },
        testUserId
      )

      expect(result).toBeDefined()
      expect(result.meeting.severity).toBe('critical')
      expect(result.meeting.escalationLevel).toBe(4) // C-Level
      expect(result.meeting.scheduledDurationMinutes).toBe(60)
    })

    test('should schedule warning meeting for 5-10% overrun', async () => {
      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 535000,
          overrunAmount: 35000,
          overrunPercentage: 7, // 7% overrun = warning
          rootCause: 'Minor scope adjustments'
        },
        testUserId
      )

      expect(result).toBeDefined()
      expect(result.meeting.severity).toBe('warning')
      expect(result.meeting.escalationLevel).toBe(2) // Director level
      expect(result.meeting.scheduledDurationMinutes).toBe(45)
    })

    test('should generate proper meeting agenda', async () => {
      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30
        },
        testUserId
      )

      const agenda = result.meeting.agenda
      expect(Array.isArray(agenda)).toBe(true)
      expect(agenda.length).toBeGreaterThan(0)
      
      // Check for key agenda items
      const agendaItems = agenda.map((item: any) => item.item)
      expect(agendaItems).toContain('Review Budget Overrun Analysis')
      expect(agendaItems).toContain('Root Cause Examination')
      expect(agendaItems).toContain('Review Corrective Options')
      expect(agendaItems).toContain('Decision & Approval')
    })

    test('should include required attendees', async () => {
      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30
        },
        testUserId
      )

      expect(result.attendees.length).toBeGreaterThan(0)
      
      // At least some attendees should be required
      const requiredAttendees = result.attendees.filter(a => a.required)
      expect(requiredAttendees.length).toBeGreaterThan(0)
    })

    test('should generate unique meeting IDs', async () => {
      const result1 = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30
        },
        testUserId
      )

      const result2 = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 625000,
          overrunAmount: 125000,
          overrunPercentage: 25
        },
        testUserId
      )

      expect(result1.meeting.meetingId).not.toBe(result2.meeting.meetingId)
      expect(result1.meeting.meetingId).toMatch(/^EMRG-\d{4}-\d{3}$/)
      expect(result2.meeting.meetingId).toMatch(/^EMRG-\d{4}-\d{3}$/)
    })

    test('should schedule meeting within appropriate timeframe', async () => {
      const now = new Date()
      
      const result = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30 // Emergency - should be within 12 hours
        },
        testUserId
      )

      const scheduledDate = new Date(result.meeting.scheduledDate)
      const hoursDiff = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Emergency meetings should be scheduled soon (within 24 hours)
      expect(hoursDiff).toBeLessThan(24)
      expect(hoursDiff).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getMeeting', () => {
    test('should retrieve meeting by ID', async () => {
      const created = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30
        },
        testUserId
      )

      const retrieved = await emergencyMeetingService.getMeeting(created.meeting.meetingId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.meetingId).toBe(created.meeting.meetingId)
      expect(retrieved?.projectId).toBe(testProjectId)
    })
  })

  describe('getProjectMeetings', () => {
    test('should retrieve all meetings for a project', async () => {
      const meetings = await emergencyMeetingService.getProjectMeetings(testProjectId)

      expect(Array.isArray(meetings)).toBe(true)
      expect(meetings.length).toBeGreaterThan(0)
      expect(meetings[0].projectId).toBe(testProjectId)
    })
  })

  describe('updateMeetingStatus', () => {
    test('should update meeting status', async () => {
      const created = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: testProjectId,
          projectName: 'Test Emergency Project',
          driftRecordId: testDriftRecordId,
          approvedBudget: 500000,
          projectedCost: 650000,
          overrunAmount: 150000,
          overrunPercentage: 30
        },
        testUserId
      )

      await emergencyMeetingService.updateMeetingStatus(
        created.meeting.meetingId,
        'completed',
        testUserId
      )

      const updated = await emergencyMeetingService.getMeeting(created.meeting.meetingId)
      expect(updated?.status).toBe('completed')
    })
  })
})
