/**
 * Drift Detection + Escalation Matrix Integration Test
 * TASK-742: Escalation matrix based on severity
 * 
 * Tests the end-to-end flow from drift detection to escalation alerting
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { driftDetectionService } from '../../services/driftDetectionService'
import { escalationService } from '../../services/escalationService'

describe('Drift Detection + Escalation Integration', () => {
  let testProjectId: string
  let testBaselineId: string
  let testDocumentId: string
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ('test_escalation_user', 'test@example.com', 'hash', 'user') 
       RETURNING id`
    )
    testUserId = userResult.rows[0].id

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, status, created_by) 
       VALUES ('Integration Test Project', 'Testing drift-escalation integration', 'active', $1) 
       RETURNING id`,
      [testUserId]
    )
    testProjectId = projectResult.rows[0].id

    // Create test baseline with budget
    const baselineResult = await pool.query(
      `INSERT INTO project_baselines (
        project_id, version, status, document_corpus,
        cost_baseline, created_by, approved_by, approved_at
      ) VALUES ($1, '1.0', 'approved', '[]'::jsonb, 
        '{"total_budget": 100000, "currency": "USD"}'::jsonb,
        $2, $2, NOW())
      RETURNING id`,
      [testProjectId, testUserId]
    )
    testBaselineId = baselineResult.rows[0].id

    // Create test document
    const documentResult = await pool.query(
      `INSERT INTO documents (
        project_id, title, markdown_content, status, template_id, created_by
      ) VALUES ($1, 'Test Document', '# Test Content', 'draft', 
        '00000000-0000-0000-0000-000000000001', $2)
      RETURNING id`,
      [testProjectId, testUserId]
    )
    testDocumentId = documentResult.rows[0].id
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM escalation_alerts WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM baseline_drift_detection WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM project_baselines WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    await pool.end()
  })

  describe('Budget Overrun Escalation Flow', () => {
    it('should create escalation alert for 7% budget overrun', async () => {
      // Simulate drift with budget overrun
      const driftPoints = [
        {
          entityType: 'budget',
          driftType: 'modified' as const,
          baselineValue: 100000,
          currentValue: 107000,
          variance: 7, // 7% overrun
          description: 'Budget exceeded by $7,000 (7%)',
          requiresApproval: true
        }
      ]

      // Create drift record
      const driftRecord = await driftDetectionService.createDriftRecord({
        projectId: testProjectId,
        documentId: testDocumentId,
        baselineId: testBaselineId,
        driftPoints,
        severity: 'critical',
        triggeredBy: testUserId
      })

      expect(driftRecord).toBeTruthy()
      expect(driftRecord.id).toBeTruthy()

      // Trigger escalation (this is what the integration does)
      await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftPoints)

      // Verify escalation alert was created
      const alertsResult = await pool.query(
        `SELECT * FROM escalation_alerts WHERE drift_detection_id = $1`,
        [driftRecord.id]
      )

      expect(alertsResult.rows.length).toBeGreaterThan(0)
      const alert = alertsResult.rows[0]

      // Verify alert properties
      expect(alert.alert_type).toBe('budget_overrun')
      expect(alert.severity_level).toBe('critical')
      expect(parseFloat(alert.variance_percentage)).toBeCloseTo(7, 1)
      expect(alert.status).toBe('pending')

      // Verify escalation rule was matched correctly (5-10% range)
      const ruleResult = await pool.query(
        `SELECT * FROM escalation_matrix WHERE id = $1`,
        [alert.escalation_rule_id]
      )
      const rule = ruleResult.rows[0]
      expect(rule.drift_type).toBe('budget_overrun')
      expect(parseFloat(rule.threshold_min)).toBe(5.0)
      expect(parseFloat(rule.threshold_max)).toBe(10.0)

      // Verify deadline is set correctly (should be 24 hours for 5-10% rule)
      const deadline = new Date(alert.deadline)
      const now = new Date()
      const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(hoursDiff).toBeGreaterThan(23)
      expect(hoursDiff).toBeLessThan(25)
    })

    it('should create emergency alert for 30% budget overrun', async () => {
      // Simulate severe budget overrun
      const driftPoints = [
        {
          entityType: 'budget',
          driftType: 'modified' as const,
          baselineValue: 100000,
          currentValue: 130000,
          variance: 30, // 30% overrun
          description: 'Critical budget overrun: $30,000 (30%)',
          requiresApproval: true
        }
      ]

      const driftRecord = await driftDetectionService.createDriftRecord({
        projectId: testProjectId,
        documentId: testDocumentId,
        baselineId: testBaselineId,
        driftPoints,
        severity: 'critical',
        triggeredBy: testUserId
      })

      await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftPoints)

      const alertsResult = await pool.query(
        `SELECT * FROM escalation_alerts WHERE drift_detection_id = $1`,
        [driftRecord.id]
      )

      const alert = alertsResult.rows[0]
      expect(alert.severity_level).toBe('emergency')

      // Verify emergency alert requires meeting
      const ruleResult = await pool.query(
        `SELECT * FROM escalation_matrix WHERE id = $1`,
        [alert.escalation_rule_id]
      )
      const rule = ruleResult.rows[0]
      expect(rule.require_meeting).toBe(true)
      expect(rule.channels).toContain('sms')
      expect(rule.escalate_to).toContain('CEO')
    })
  })

  describe('Scope Creep Escalation Flow', () => {
    it('should create escalation alert for 15% scope increase', async () => {
      // Simulate scope creep
      const driftPoints = [
        {
          entityType: 'deliverable',
          driftType: 'added' as const,
          baselineValue: null,
          currentValue: 'New Feature A',
          description: 'Unapproved deliverable added',
          requiresApproval: true
        },
        {
          entityType: 'deliverable',
          driftType: 'added' as const,
          baselineValue: null,
          currentValue: 'New Feature B',
          description: 'Unapproved deliverable added',
          requiresApproval: true
        },
        {
          entityType: 'deliverable',
          driftType: 'added' as const,
          baselineValue: null,
          currentValue: 'New Feature C',
          description: 'Unapproved deliverable added',
          requiresApproval: true
        }
      ]

      const driftRecord = await driftDetectionService.createDriftRecord({
        projectId: testProjectId,
        documentId: testDocumentId,
        baselineId: testBaselineId,
        driftPoints,
        severity: 'high',
        triggeredBy: testUserId
      })

      await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftPoints)

      const alertsResult = await pool.query(
        `SELECT * FROM escalation_alerts WHERE drift_detection_id = $1`,
        [driftRecord.id]
      )

      expect(alertsResult.rows.length).toBeGreaterThan(0)
      const alert = alertsResult.rows[0]
      expect(alert.alert_type).toBe('scope_creep')

      // Verify auto-create CR flag
      const ruleResult = await pool.query(
        `SELECT * FROM escalation_matrix WHERE id = $1`,
        [alert.escalation_rule_id]
      )
      const rule = ruleResult.rows[0]
      expect(rule.auto_create_cr).toBe(true)
    })
  })

  describe('Alert Lifecycle', () => {
    it('should allow acknowledging and resolving alerts', async () => {
      // Create a test alert
      const driftPoints = [
        {
          entityType: 'budget',
          driftType: 'modified' as const,
          baselineValue: 100000,
          currentValue: 103000,
          variance: 3,
          description: 'Minor budget variance',
          requiresApproval: false
        }
      ]

      const driftRecord = await driftDetectionService.createDriftRecord({
        projectId: testProjectId,
        documentId: testDocumentId,
        baselineId: testBaselineId,
        driftPoints,
        severity: 'low',
        triggeredBy: testUserId
      })

      await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftPoints)

      const alertsResult = await pool.query(
        `SELECT * FROM escalation_alerts WHERE drift_detection_id = $1`,
        [driftRecord.id]
      )
      const alert = alertsResult.rows[0]

      // Acknowledge the alert
      await escalationService.acknowledgeAlert(
        alert.id,
        testUserId,
        'Reviewing budget variance with finance team'
      )

      const acknowledgedResult = await pool.query(
        `SELECT * FROM escalation_alerts WHERE id = $1`,
        [alert.id]
      )
      expect(acknowledgedResult.rows[0].status).toBe('acknowledged')

      // Resolve the alert
      await escalationService.resolveAlert(
        alert.id,
        testUserId,
        'Variance approved - within acceptable range'
      )

      const resolvedResult = await pool.query(
        `SELECT * FROM escalation_alerts WHERE id = $1`,
        [alert.id]
      )
      expect(resolvedResult.rows[0].status).toBe('resolved')
      expect(resolvedResult.rows[0].resolved_at).toBeTruthy()
    })
  })
})
