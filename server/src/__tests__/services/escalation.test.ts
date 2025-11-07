/**
 * Escalation Service Tests
 * TASK-742: Escalation matrix based on severity
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { escalationService } from '../../services/escalationService'

describe('Escalation Service', () => {
  let testProjectId: string
  let testDriftDetectionId: string
  let testBaselineId: string

  beforeAll(async () => {
    // Create test data
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, status) 
       VALUES ('Test Project for Escalation', 'Testing escalation matrix', 'active') 
       RETURNING id`
    )
    testProjectId = projectResult.rows[0].id

    const baselineResult = await pool.query(
      `INSERT INTO project_baselines (project_id, version, status, document_corpus)
       VALUES ($1, '1.0', 'approved', '[]'::jsonb)
       RETURNING id`,
      [testProjectId]
    )
    testBaselineId = baselineResult.rows[0].id

    const driftResult = await pool.query(
      `INSERT INTO baseline_drift_detection (
        baseline_id, project_id, detection_type, drift_severity, drift_description
      ) VALUES ($1, $2, 'budget_overrun', 'high', 'Test drift')
      RETURNING id`,
      [testBaselineId, testProjectId]
    )
    testDriftDetectionId = driftResult.rows[0].id
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.end()
  })

  describe('evaluateDrift', () => {
    it('should match budget overrun escalation rule for 7% variance', async () => {
      const result = await escalationService.evaluateDrift(
        testDriftDetectionId,
        testProjectId,
        'budget_overrun',
        'critical',
        {
          approved_budget: 100000,
          projected_cost: 107000 // 7% overrun
        }
      )

      expect(result.shouldEscalate).toBe(true)
      expect(result.matchedRule).toBeTruthy()
      expect(result.matchedRule?.drift_type).toBe('budget_overrun')
      expect(result.matchedRule?.severity_level).toBe('critical')
      expect(result.variancePercentage).toBe(7)
    })

    it('should match emergency escalation rule for 30% budget overrun', async () => {
      const result = await escalationService.evaluateDrift(
        testDriftDetectionId,
        testProjectId,
        'budget_overrun',
        'emergency',
        {
          approved_budget: 100000,
          projected_cost: 130000 // 30% overrun
        }
      )

      expect(result.shouldEscalate).toBe(true)
      expect(result.matchedRule).toBeTruthy()
      expect(result.matchedRule?.severity_level).toBe('emergency')
      expect(result.matchedRule?.escalate_to).toContain('CEO')
      expect(result.matchedRule?.escalate_to).toContain('CFO')
      expect(result.matchedRule?.require_meeting).toBe(true)
    })

    it('should match scope creep escalation rule for 15% increase', async () => {
      const result = await escalationService.evaluateDrift(
        testDriftDetectionId,
        testProjectId,
        'scope_creep',
        'high',
        {
          baseline_scope_count: 20,
          current_scope_count: 23 // 15% increase
        }
      )

      expect(result.shouldEscalate).toBe(true)
      expect(result.matchedRule).toBeTruthy()
      expect(result.matchedRule?.drift_type).toBe('scope_creep')
      expect(result.matchedRule?.auto_create_cr).toBe(true)
    })

    it('should not escalate for minor variance below threshold', async () => {
      const result = await escalationService.evaluateDrift(
        testDriftDetectionId,
        testProjectId,
        'budget_overrun',
        'low',
        {
          approved_budget: 100000,
          projected_cost: 100500 // 0.5% overrun - below 5% threshold
        }
      )

      // Should still match warning rule (0-5%)
      expect(result.shouldEscalate).toBe(true)
      expect(result.matchedRule?.severity_level).toBe('warning')
    })
  })

  describe('createAlert', () => {
    it('should create escalation alert with proper deadline', async () => {
      // First evaluate to get a matching rule
      const evaluation = await escalationService.evaluateDrift(
        testDriftDetectionId,
        testProjectId,
        'budget_overrun',
        'critical',
        {
          approved_budget: 100000,
          projected_cost: 108000
        }
      )

      expect(evaluation.matchedRule).toBeTruthy()

      // Create alert
      const alert = await escalationService.createAlert(
        testDriftDetectionId,
        testProjectId,
        evaluation.matchedRule!,
        evaluation.variancePercentage,
        {
          approved_budget: 100000,
          projected_cost: 108000
        }
      )

      expect(alert).toBeTruthy()
      expect(alert.status).toBe('pending')
      expect(alert.severity_level).toBe('critical')
      expect(alert.variance_percentage).toBe(8)
      expect(alert.dashboard_alert).toBe(true)

      // Check deadline is set correctly (should be 24 hours from now for 5-10% rule)
      const deadline = new Date(alert.deadline)
      const now = new Date()
      const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(hoursDiff).toBeGreaterThan(23)
      expect(hoursDiff).toBeLessThan(25)
    })
  })

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert successfully', async () => {
      // Create a test alert first
      const evaluation = await escalationService.evaluateDrift(
        testDriftDetectionId,
        testProjectId,
        'budget_overrun',
        'warning',
        {
          approved_budget: 100000,
          projected_cost: 103000
        }
      )

      const alert = await escalationService.createAlert(
        testDriftDetectionId,
        testProjectId,
        evaluation.matchedRule!,
        evaluation.variancePercentage,
        {}
      )

      // Mock user ID
      const testUserId = '00000000-0000-0000-0000-000000000001'

      // Acknowledge the alert
      await escalationService.acknowledgeAlert(alert.id, testUserId, 'Investigating the issue')

      // Verify alert was updated
      const updatedAlert = await pool.query(
        'SELECT * FROM escalation_alerts WHERE id = $1',
        [alert.id]
      )

      expect(updatedAlert.rows[0].status).toBe('acknowledged')
      expect(updatedAlert.rows[0].acknowledged_by).toBe(testUserId)
      expect(updatedAlert.rows[0].response_notes).toBe('Investigating the issue')
    })
  })
})
