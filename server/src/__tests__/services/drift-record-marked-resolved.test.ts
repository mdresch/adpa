/**
 * Test: Drift Record Marked as Resolved
 * TASK-732: Drift record marked as resolved
 * 
 * This test suite specifically validates the acceptance criterion:
 * "Drift record marked as resolved" from DRIFT_AUTO_RESOLUTION_FEATURE.md
 * 
 * Acceptance Criteria:
 * - When drift resolution is applied, the drift record in baseline_drift_detection table must be updated
 * - Status field must be set to 'resolved'
 * - resolved_at timestamp must be set to current time
 * - assigned_to field must be set to the user who resolved the drift
 * - resolution_notes must contain relevant information about the resolution
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('TASK-732: Drift Record Marked as Resolved', () => {
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
       VALUES ($1, 'test-drift-resolved@example.com', 'hash', 'user')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Test Project - Drift Resolved', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document
    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Test Document - Drift', '# Original Content', $3, $3)`,
      [testDocumentId, testProjectId, testUserId]
    )

    // Create test baseline
    await pool.query(
      `INSERT INTO project_baselines (id, project_id, version, status, created_by)
       VALUES ($1, $2, '1.0', 'approved', $3)`,
      [testBaselineId, testProjectId, testUserId]
    )

    // Create test drift record with status = 'detected'
    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, drift_description, source_document_id, status)
       VALUES ($1, $2, $3, 'scope_drift', 'medium', 'Test drift for resolution', $4, 'detected')`,
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

  describe('Acceptance Criterion: Drift record marked as resolved', () => {
    test('should update drift record status to "resolved"', async () => {
      const resolvedContent = '# Resolved Content\n\nThis content has been aligned with baseline.'

      // Verify initial state
      const beforeResult = await pool.query(
        `SELECT status, resolved_at, assigned_to, resolution_notes 
         FROM baseline_drift_detection 
         WHERE id = $1`,
        [testDriftRecordId]
      )

      expect(beforeResult.rows[0].status).toBe('detected')
      expect(beforeResult.rows[0].resolved_at).toBeNull()
      expect(beforeResult.rows[0].assigned_to).toBeNull()
      expect(beforeResult.rows[0].resolution_notes).toBeNull()

      // Apply drift resolution
      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId
      )

      // Verify drift record is marked as resolved
      const afterResult = await pool.query(
        `SELECT status, resolved_at, assigned_to, resolution_notes 
         FROM baseline_drift_detection 
         WHERE id = $1`,
        [testDriftRecordId]
      )

      const driftRecord = afterResult.rows[0]

      // ✅ Status must be 'resolved'
      expect(driftRecord.status).toBe('resolved')

      // ✅ resolved_at must be set to a timestamp
      expect(driftRecord.resolved_at).not.toBeNull()
      expect(driftRecord.resolved_at).toBeInstanceOf(Date)

      // ✅ assigned_to must be set to the user who resolved it
      expect(driftRecord.assigned_to).toBe(testUserId)

      // ✅ resolution_notes must contain information about the resolution
      expect(driftRecord.resolution_notes).not.toBeNull()
      expect(driftRecord.resolution_notes).toContain('AI-assisted')
    })

    test('should set resolved_at timestamp to current time', async () => {
      const resolvedContent = '# Resolved Content v2'
      const beforeTimestamp = new Date()

      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId
      )

      const result = await pool.query(
        `SELECT resolved_at FROM baseline_drift_detection WHERE id = $1`,
        [testDriftRecordId]
      )

      const resolvedAt = new Date(result.rows[0].resolved_at)
      const afterTimestamp = new Date()

      // Verify resolved_at is between before and after timestamps (within 1 minute)
      expect(resolvedAt.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime() - 1000)
      expect(resolvedAt.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime() + 1000)
    })

    test('should persist drift record in database after resolution', async () => {
      const resolvedContent = '# Resolved Content v3'

      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId
      )

      // Verify drift record still exists (not deleted)
      const result = await pool.query(
        `SELECT id, status FROM baseline_drift_detection WHERE id = $1`,
        [testDriftRecordId]
      )

      expect(result.rows.length).toBe(1)
      expect(result.rows[0].id).toBe(testDriftRecordId)
      expect(result.rows[0].status).toBe('resolved')
    })

    test('should maintain audit trail for drift resolution', async () => {
      const resolvedContent = '# Resolved Content v4'

      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId
      )

      // Verify audit log was created
      const auditResult = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 
         AND action = 'drift_resolved' 
         AND resource_type = 'document' 
         AND resource_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [testUserId, testDocumentId]
      )

      expect(auditResult.rows.length).toBe(1)
      
      const auditLog = auditResult.rows[0]
      expect(auditLog.action).toBe('drift_resolved')
      expect(auditLog.resource_type).toBe('document')
      expect(auditLog.resource_id).toBe(testDocumentId)
      
      // Verify audit log details contain drift record ID
      const details = typeof auditLog.details === 'string' 
        ? JSON.parse(auditLog.details) 
        : auditLog.details
      expect(details.driftRecordId).toBe(testDriftRecordId)
      expect(details.method).toBe('ai_assisted')
    })
  })

  describe('Edge Cases', () => {
    test('should handle resolution with major changes', async () => {
      const resolvedContent = '# Resolved with Major Changes'
      const majorChanges = [
        {
          entityType: 'budget',
          driftType: 'modified' as const,
          description: 'Budget increased',
          baselineValue: 100000,
          currentValue: 150000,
          variance: 50,
          requiresApproval: true
        }
      ]

      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId,
        majorChanges
      )

      const result = await pool.query(
        `SELECT status FROM baseline_drift_detection WHERE id = $1`,
        [testDriftRecordId]
      )

      // Even with major changes, drift should be marked as resolved
      expect(result.rows[0].status).toBe('resolved')
    })

    test('should handle resolution with empty content', async () => {
      const resolvedContent = ''

      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId
      )

      const result = await pool.query(
        `SELECT status, resolution_notes FROM baseline_drift_detection WHERE id = $1`,
        [testDriftRecordId]
      )

      expect(result.rows[0].status).toBe('resolved')
      expect(result.rows[0].resolution_notes).toBe('AI-assisted drift resolution applied')
    })
  })

  describe('Integration with Document Update', () => {
    test('should update document and mark drift as resolved in single transaction', async () => {
      const resolvedContent = '# Final Resolved Content\n\nBaseline aligned.'

      // Get initial document content
      const beforeDoc = await pool.query(
        `SELECT content FROM documents WHERE id = $1`,
        [testDocumentId]
      )
      const initialContent = beforeDoc.rows[0].content

      await driftResolutionService.applyResolution(
        testDocumentId,
        resolvedContent,
        testDriftRecordId,
        testUserId
      )

      // Verify document was updated
      const afterDoc = await pool.query(
        `SELECT content FROM documents WHERE id = $1`,
        [testDocumentId]
      )
      expect(afterDoc.rows[0].content).toBe(resolvedContent)
      expect(afterDoc.rows[0].content).not.toBe(initialContent)

      // Verify drift was marked as resolved
      const driftResult = await pool.query(
        `SELECT status FROM baseline_drift_detection WHERE id = $1`,
        [testDriftRecordId]
      )
      expect(driftResult.rows[0].status).toBe('resolved')
    })
  })
})
