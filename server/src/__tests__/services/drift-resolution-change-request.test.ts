/**
 * Test: Drift Resolution - Change Request Creation for Major Changes
 * 
 * Verifies that when drift resolution is applied with major changes,
 * a change request document is automatically created for approval.
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('Drift Resolution - Change Request Creation', () => {
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
       VALUES ($1, 'test@example.com', 'hash', 'user')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Test Project', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document
    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Test Document', '# Test Content', $3, $3)`,
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
       VALUES ($1, $2, $3, 'scope_drift', 'high', 'Test drift', $4)`,
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

  test('should create change request for major changes', async () => {
    const resolvedContent = '# Resolved Content\n\nThis is the resolved document.'
    
    const majorChanges = [
      {
        entityType: 'budget',
        driftType: 'modified' as const,
        description: 'Budget increased from $500K to $650K',
        baselineValue: { amount: 500000, currency: 'USD' },
        currentValue: { amount: 650000, currency: 'USD' },
        variance: 30,
        requiresApproval: true
      },
      {
        entityType: 'milestone',
        driftType: 'removed' as const,
        description: 'Critical milestone removed',
        baselineValue: { name: 'Testing Complete', date: '2024-03-15' },
        currentValue: null,
        requiresApproval: true
      }
    ]

    // Apply resolution with major changes
    const result = await driftResolutionService.applyResolution(
      testDocumentId,
      resolvedContent,
      testDriftRecordId,
      testUserId,
      majorChanges
    )

    // Verify change request was created
    expect(result.changeRequestId).toBeDefined()
    expect(typeof result.changeRequestId).toBe('string')

    // Verify change request document exists
    const crDoc = await pool.query(
      `SELECT * FROM documents WHERE id = $1`,
      [result.changeRequestId]
    )

    expect(crDoc.rows.length).toBe(1)
    expect(crDoc.rows[0].type).toBe('change_request')
    expect(crDoc.rows[0].status).toBe('pending_approval')
    expect(crDoc.rows[0].project_id).toBe(testProjectId)
    expect(crDoc.rows[0].content).toContain('Change Request: Major Drift Changes')
    expect(crDoc.rows[0].content).toContain('Budget increased')
    expect(crDoc.rows[0].content).toContain('$500K to $650K')

    // Verify cr_document_updates entry exists
    const crUpdate = await pool.query(
      `SELECT * FROM cr_document_updates WHERE change_request_id = $1`,
      [result.changeRequestId]
    )

    expect(crUpdate.rows.length).toBe(1)
    expect(crUpdate.rows[0].target_document_id).toBe(testDocumentId)
    expect(crUpdate.rows[0].status).toBe('pending')
    expect(crUpdate.rows[0].update_description).toContain('2 major change(s)')
  })

  test('should not create change request when no major changes', async () => {
    const resolvedContent = '# Resolved Content\n\nNo major changes.'

    // Apply resolution without major changes
    const result = await driftResolutionService.applyResolution(
      testDocumentId,
      resolvedContent,
      testDriftRecordId,
      testUserId,
      [] // Empty major changes array
    )

    // Verify no change request was created
    expect(result.changeRequestId).toBeUndefined()
  })

  test('should handle missing major changes parameter', async () => {
    const resolvedContent = '# Resolved Content'

    // Apply resolution without major changes parameter
    const result = await driftResolutionService.applyResolution(
      testDocumentId,
      resolvedContent,
      testDriftRecordId,
      testUserId
      // majorChanges not provided
    )

    // Verify no change request was created
    expect(result.changeRequestId).toBeUndefined()
  })

  test('should mark drift record as resolved when applying resolution', async () => {
    const resolvedContent = '# Resolved Content\n\nThis document has been resolved.'

    // Get initial drift record status
    const initialDrift = await pool.query(
      `SELECT status, resolved_at, assigned_to, resolution_notes FROM baseline_drift_detection WHERE id = $1`,
      [testDriftRecordId]
    )

    // Verify initial status is not 'resolved'
    expect(initialDrift.rows[0].status).not.toBe('resolved')
    expect(initialDrift.rows[0].resolved_at).toBeNull()

    // Apply resolution
    await driftResolutionService.applyResolution(
      testDocumentId,
      resolvedContent,
      testDriftRecordId,
      testUserId,
      [] // No major changes
    )

    // Get updated drift record
    const updatedDrift = await pool.query(
      `SELECT status, resolved_at, assigned_to, resolution_notes FROM baseline_drift_detection WHERE id = $1`,
      [testDriftRecordId]
    )

    // Verify drift record is marked as resolved
    expect(updatedDrift.rows[0].status).toBe('resolved')
    expect(updatedDrift.rows[0].resolved_at).not.toBeNull()
    expect(updatedDrift.rows[0].assigned_to).toBe(testUserId)
    expect(updatedDrift.rows[0].resolution_notes).toBe('AI-assisted drift resolution applied')

    // Verify resolved_at is a recent timestamp (within last minute)
    const resolvedAt = new Date(updatedDrift.rows[0].resolved_at)
    const now = new Date()
    const timeDiff = now.getTime() - resolvedAt.getTime()
    expect(timeDiff).toBeLessThan(60000) // Less than 1 minute
  })
})
