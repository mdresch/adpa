/**
 * Test: Positive Drift Change Request Generation
 * 
 * Verifies that positive drift (cost savings, efficiency improvements, timeline acceleration)
 * is detected and automatically generates opportunity change requests.
 */

import { positiveDriftChangeRequestService } from '../../services/positiveDriftChangeRequestService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { DriftPoint } from '../../services/driftDetectionService'

describe('Positive Drift Change Request Generation', () => {
  let testProjectId: string
  let testDocumentId: string
  let testUserId: string
  let testBaselineId: string
  let testDriftRecordId: string

  beforeAll(async () => {
    // Create test data
    testProjectId = uuidv4()
    testDocumentId = uuidv4()
    testUserId = uuidv4()
    testBaselineId = uuidv4()
    testDriftRecordId = uuidv4()

    // Create test user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, 'test-positive@example.com', 'hash', 'user')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Positive Drift Test Project', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document
    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Cost Optimization Document', '# Test Content', $3, $3)`,
      [testDocumentId, testProjectId, testUserId]
    )

    // Create test baseline
    await pool.query(
      `INSERT INTO project_baselines (id, project_id, version, status, created_by)
       VALUES ($1, $2, '1.0', 'approved', $3)`,
      [testBaselineId, testProjectId, testUserId]
    )

    // Create test drift record
    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, drift_description, source_document_id)
       VALUES ($1, $2, $3, 'cost_drift', 'medium', 'Cost savings detected', $4)`,
      [testDriftRecordId, testBaselineId, testProjectId, testDocumentId]
    )
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM baseline_drift_detection WHERE id = $1', [testDriftRecordId])
    await pool.query('DELETE FROM project_baselines WHERE id = $1', [testBaselineId])
    await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])

    // Close pool
    await pool.end()
  })

  describe('Positive Drift Detection', () => {
    test('should detect cost savings as positive drift', () => {
      const driftPoints: DriftPoint[] = [
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'Budget reduced from $500K to $400K',
          baselineValue: { amount: 500000, currency: 'USD' },
          currentValue: { amount: 400000, currency: 'USD' },
          variance: -20,
          requiresApproval: false
        }
      ]

      const result = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      expect(result.isPositive).toBe(true)
      expect(result.driftCategory).toBe('cost_saving')
      expect(result.metrics.costSavings).toBe(100000)
      expect(result.description).toContain('reduced')
    })

    test('should detect timeline acceleration as positive drift', () => {
      const baselineDate = new Date('2024-12-31')
      const currentDate = new Date('2024-12-15')

      const driftPoints: DriftPoint[] = [
        {
          entityType: 'milestone',
          driftType: 'modified',
          description: 'Milestone completed 16 days early',
          baselineValue: { date: baselineDate.toISOString() },
          currentValue: { date: currentDate.toISOString() },
          requiresApproval: false
        }
      ]

      const result = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      expect(result.isPositive).toBe(true)
      expect(result.driftCategory).toBe('timeline_acceleration')
      expect(result.metrics.timeAcceleration).toBeGreaterThan(0)
    })

    test('should detect efficiency improvements as positive drift', () => {
      const driftPoints: DriftPoint[] = [
        {
          entityType: 'technology',
          driftType: 'modified',
          description: 'Optimized AI provider selection for cost efficiency',
          baselineValue: { provider: 'GPT-4', cost_per_call: 0.05 },
          currentValue: { provider: 'Claude', cost_per_call: 0.02 },
          requiresApproval: false
        }
      ]

      const result = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      expect(result.isPositive).toBe(true)
      expect(result.driftCategory).toBe('efficiency')
    })

    test('should not detect negative drift as positive', () => {
      const driftPoints: DriftPoint[] = [
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'Budget increased from $500K to $650K',
          baselineValue: { amount: 500000, currency: 'USD' },
          currentValue: { amount: 650000, currency: 'USD' },
          variance: 30,
          requiresApproval: true
        }
      ]

      const result = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      expect(result.isPositive).toBe(false)
      expect(result.driftCategory).toBe('none')
    })
  })

  describe('Opportunity Change Request Generation', () => {
    test('should generate opportunity CR for cost savings', async () => {
      const driftPoints: DriftPoint[] = [
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'AI provider optimization reduced monthly costs',
          baselineValue: { amount: 5000, currency: 'USD' },
          currentValue: { amount: 2500, currency: 'USD' },
          variance: -50,
          requiresApproval: false
        }
      ]

      const positiveDrift = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      const result = await positiveDriftChangeRequestService.generateOpportunityCR(
        testProjectId,
        testDocumentId,
        testDriftRecordId,
        driftPoints,
        positiveDrift,
        testUserId
      )

      expect(result.changeRequestId).toBeDefined()
      expect(typeof result.changeRequestId).toBe('string')
      expect(result.crTitle).toContain('Cost Optimization')
      expect(result.estimatedValue).toBeGreaterThan(0)
      expect(result.replicationPotential).toBeGreaterThan(0)

      // Verify CR document was created
      const crDoc = await pool.query(
        `SELECT * FROM documents WHERE id = $1`,
        [result.changeRequestId]
      )

      expect(crDoc.rows.length).toBe(1)
      expect(crDoc.rows[0].type).toBe('change_request')
      expect(crDoc.rows[0].status).toBe('pending_approval')
      expect(crDoc.rows[0].project_id).toBe(testProjectId)
      expect(crDoc.rows[0].content).toContain('Positive Drift Opportunity')
      expect(crDoc.rows[0].content).toContain('Cost Savings')
      expect(crDoc.rows[0].content).toContain('Business Case')

      // Verify metadata
      const metadata = crDoc.rows[0].metadata
      expect(metadata.change_request_type).toBe('positive_drift_opportunity')
      expect(metadata.drift_category).toBe('cost_saving')
      expect(metadata.metrics).toBeDefined()
      expect(metadata.estimated_value).toBeGreaterThan(0)

      // Verify drift record was updated
      const driftRecord = await pool.query(
        `SELECT * FROM baseline_drift_detection WHERE id = $1`,
        [testDriftRecordId]
      )

      expect(driftRecord.rows[0].status).toBe('opportunity_cr_created')
    })

    test('should generate CR with correct content structure', async () => {
      const driftPoints: DriftPoint[] = [
        {
          entityType: 'milestone',
          driftType: 'modified',
          description: 'Testing phase completed 2 weeks ahead of schedule',
          baselineValue: { date: '2024-12-31', name: 'Testing Complete' },
          currentValue: { date: '2024-12-17', name: 'Testing Complete' },
          requiresApproval: false
        }
      ]

      const positiveDrift = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      const result = await positiveDriftChangeRequestService.generateOpportunityCR(
        testProjectId,
        testDocumentId,
        testDriftRecordId,
        driftPoints,
        positiveDrift,
        testUserId
      )

      const crDoc = await pool.query(
        `SELECT content FROM documents WHERE id = $1`,
        [result.changeRequestId]
      )

      const content = crDoc.rows[0].content

      // Verify required sections
      expect(content).toContain('# Change Request: Positive Drift Opportunity')
      expect(content).toContain('## 🎯 Executive Summary')
      expect(content).toContain('## 📊 Business Case')
      expect(content).toContain('## 🎯 Scope')
      expect(content).toContain('## 💰 Financial Analysis')
      expect(content).toContain('## 🎯 Drift Points Detected')
      expect(content).toContain('## 🎯 Recommendations')
      expect(content).toContain('## ⚡ Approval Workflow')

      // Verify it mentions formalization and replication
      expect(content).toContain('formalize')
      expect(content).toContain('replicate')
      expect(content).toContain('Document')
      expect(content).toContain('Strategic Value')
    })

    test('should calculate ROI correctly', async () => {
      const driftPoints: DriftPoint[] = [
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'Process automation saves $30K annually',
          baselineValue: { amount: 100000, currency: 'USD' },
          currentValue: { amount: 70000, currency: 'USD' },
          variance: -30,
          requiresApproval: false
        }
      ]

      const positiveDrift = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      const result = await positiveDriftChangeRequestService.generateOpportunityCR(
        testProjectId,
        testDocumentId,
        testDriftRecordId,
        driftPoints,
        positiveDrift,
        testUserId
      )

      const crDoc = await pool.query(
        `SELECT content FROM documents WHERE id = $1`,
        [result.changeRequestId]
      )

      const content = crDoc.rows[0].content

      // Should include ROI calculation
      expect(content).toContain('ROI:')
      expect(content).toContain('Financial Analysis')
      expect(content).toContain('Returns')
      expect(content).toContain('Investment')
    })
  })

  describe('Integration with Drift Detection', () => {
    test('should auto-detect positive drift and suggest formalization', async () => {
      // This test verifies the integration flow:
      // 1. Drift is detected
      // 2. Positive drift is analyzed
      // 3. Opportunity CR is auto-generated

      const driftPoints: DriftPoint[] = [
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'Team switched to Claude Sonnet saving 50%',
          baselineValue: { amount: 5000, currency: 'USD' },
          currentValue: { amount: 2500, currency: 'USD' },
          variance: -50,
          requiresApproval: false
        }
      ]

      // Analyze positive drift
      const positiveDrift = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)
      expect(positiveDrift.isPositive).toBe(true)

      // Generate CR
      const result = await positiveDriftChangeRequestService.generateOpportunityCR(
        testProjectId,
        testDocumentId,
        testDriftRecordId,
        driftPoints,
        positiveDrift,
        testUserId
      )

      expect(result.changeRequestId).toBeDefined()
      expect(result.estimatedValue).toBeGreaterThan(0)

      // Verify CR mentions replication potential
      const crDoc = await pool.query(
        `SELECT content FROM documents WHERE id = $1`,
        [result.changeRequestId]
      )

      expect(crDoc.rows[0].content).toContain('replicate')
      expect(crDoc.rows[0].content).toContain('similar projects')
    })
  })
})
