/**
 * Test: Baseline Update Service
 * TASK-746: Baseline update upon approval
 * 
 * Tests automatic baseline updates when change requests are approved
 */

import { pool } from '../../database/connection'
import { baselineUpdateService } from '../../services/baselineUpdateService'
import { v4 as uuidv4 } from 'uuid'

describe('Baseline Update Service', () => {
  let testProjectId: string
  let testUserId: string
  let testBaselineId: string
  let testChangeRequestId: string

  beforeAll(async () => {
    // Create test data
    testProjectId = uuidv4()
    testUserId = uuidv4()
    testBaselineId = uuidv4()
    testChangeRequestId = uuidv4()

    // Create test user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, 'test-baseline-update@example.com', 'hash', 'user')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Test Baseline Update Project', $2)`,
      [testProjectId, testUserId]
    )

    // Create test baseline
    await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, created_by, approved_by,
        scope_baseline, technical_baseline, timeline_baseline,
        cost_baseline, resource_baseline, success_criteria
      ) VALUES ($1, $2, '1.0', 'active', $3, $3, $4, $5, $6, $7, $8, $9)`,
      [
        testBaselineId,
        testProjectId,
        testUserId,
        JSON.stringify({ deliverables: ['Feature A', 'Feature B'] }),
        JSON.stringify({ stack: ['Node.js', 'PostgreSQL'] }),
        JSON.stringify({ milestones: [{ name: 'Launch', date: '2024-12-31' }] }),
        JSON.stringify({ budget: 100000 }),
        JSON.stringify({ team: ['Developer', 'Designer'] }),
        JSON.stringify({ kpis: ['User Satisfaction > 90%'] })
      ]
    )
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM baseline_cr_updates WHERE baseline_id = $1', [testBaselineId])
    await pool.query('DELETE FROM baseline_versions WHERE baseline_id = $1', [testBaselineId])
    await pool.query('DELETE FROM project_baselines WHERE id = $1', [testBaselineId])
    await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])

    // Close pool
    await pool.end()
  })

  afterEach(async () => {
    // Clean up change requests after each test
    await pool.query('DELETE FROM documents WHERE id = $1', [testChangeRequestId])
  })

  describe('updateBaselineFromChangeRequest', () => {
    test('should update baseline when change request with major changes is approved', async () => {
      // Create change request with major changes
      const majorChanges = [
        {
          entityType: 'deliverables',
          driftType: 'added',
          description: 'Added Feature C',
          baselineValue: null,
          currentValue: { name: 'Feature C', description: 'New feature' },
          requiresApproval: true
        },
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'Budget increased from $100K to $120K',
          baselineValue: { amount: 100000 },
          currentValue: { amount: 120000 },
          variance: 20,
          requiresApproval: true
        }
      ]

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: Scope and Budget Update',
          '# Change Request\n\nUpdating scope and budget',
          'approved',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            major_changes: majorChanges,
            created_from: 'automatic_drift_resolution'
          })
        ]
      )

      // Update baseline
      const result = await baselineUpdateService.updateBaselineFromChangeRequest(
        testChangeRequestId,
        testUserId
      )

      // Verify result
      expect(result.success).toBe(true)
      expect(result.baselineId).toBe(testBaselineId)
      expect(result.baselineVersion).toBe('1.1')
      expect(result.updatedFields).toContain('scope_baseline')
      expect(result.updatedFields).toContain('cost_baseline')
      expect(result.updateSummary).toContain('2 component(s)')

      // Verify baseline was updated
      const baseline = await pool.query(
        `SELECT * FROM project_baselines WHERE id = $1`,
        [testBaselineId]
      )

      expect(baseline.rows[0].version).toBe('1.1')
      expect(baseline.rows[0].last_cr_update_id).toBe(testChangeRequestId)
      expect(baseline.rows[0].cr_update_count).toBe(1)

      // Verify baseline_cr_updates record was created
      const updateRecord = await pool.query(
        `SELECT * FROM baseline_cr_updates WHERE change_request_id = $1`,
        [testChangeRequestId]
      )

      expect(updateRecord.rows.length).toBe(1)
      expect(updateRecord.rows[0].baseline_version_before).toBe('1.0')
      expect(updateRecord.rows[0].baseline_version_after).toBe('1.1')
      expect(updateRecord.rows[0].approved_by).toBe(testUserId)
    })

    test('should not update baseline when change request has no major changes', async () => {
      // Create change request without major changes
      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: Minor Update',
          '# Change Request\n\nMinor update',
          'approved',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            major_changes: [], // Empty array
            created_from: 'automatic_drift_resolution'
          })
        ]
      )

      // Try to update baseline
      const result = await baselineUpdateService.updateBaselineFromChangeRequest(
        testChangeRequestId,
        testUserId
      )

      // Verify no update was made
      expect(result.success).toBe(false)
      expect(result.message).toContain('did not contain baseline updates')
    })

    test('should handle missing metadata gracefully', async () => {
      // Create change request with no metadata
      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: No Metadata',
          '# Change Request\n\nNo metadata',
          'approved',
          'change_request',
          testUserId
        ]
      )

      // Try to update baseline
      const result = await baselineUpdateService.updateBaselineFromChangeRequest(
        testChangeRequestId,
        testUserId
      )

      // Verify no update was made
      expect(result.success).toBe(false)
    })
  })

  describe('previewBaselineChanges', () => {
    test('should preview baseline changes from a change request', async () => {
      const majorChanges = [
        {
          entityType: 'deliverables',
          driftType: 'added',
          description: 'Added Feature D',
          baselineValue: null,
          currentValue: { name: 'Feature D' },
          requiresApproval: true
        },
        {
          entityType: 'milestones',
          driftType: 'modified',
          description: 'Milestone date changed',
          baselineValue: { date: '2024-12-31' },
          currentValue: { date: '2025-01-15' },
          requiresApproval: true
        }
      ]

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: Preview Test',
          '# Change Request',
          'pending_approval',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            major_changes: majorChanges
          })
        ]
      )

      // Preview changes
      const preview = await baselineUpdateService.previewBaselineChanges(testChangeRequestId)

      // Verify preview
      expect(preview.hasChanges).toBe(true)
      expect(preview.totalChanges).toBe(2)
      expect(preview.changesSummary.scope_baseline).toBe(1)
      expect(preview.changesSummary.timeline_baseline).toBe(1)
    })

    test('should return empty preview for CR without changes', async () => {
      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: No Changes',
          '# Change Request',
          'pending_approval',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'other',
            major_changes: []
          })
        ]
      )

      const preview = await baselineUpdateService.previewBaselineChanges(testChangeRequestId)

      expect(preview.hasChanges).toBe(false)
      expect(preview.totalChanges).toBe(0)
    })
  })

  describe('getBaselineUpdateHistory', () => {
    test('should retrieve baseline update history for a project', async () => {
      // Create and approve a change request first
      const majorChanges = [
        {
          entityType: 'deliverables',
          driftType: 'added',
          description: 'Added Feature E',
          baselineValue: null,
          currentValue: { name: 'Feature E' },
          requiresApproval: true
        }
      ]

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: History Test',
          '# Change Request',
          'approved',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            major_changes: majorChanges,
            created_from: 'automatic_drift_resolution'
          })
        ]
      )

      // Update baseline
      await baselineUpdateService.updateBaselineFromChangeRequest(
        testChangeRequestId,
        testUserId
      )

      // Get history
      const history = await baselineUpdateService.getBaselineUpdateHistory(testProjectId)

      // Verify history
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].change_request_id).toBe(testChangeRequestId)
      expect(history[0].change_request_title).toBe('CR: History Test')
    })
  })

  describe('manuallyUpdateBaseline', () => {
    test('should manually update baseline for approved CR', async () => {
      const majorChanges = [
        {
          entityType: 'technologies',
          driftType: 'added',
          description: 'Added Redis',
          baselineValue: null,
          currentValue: { name: 'Redis' },
          requiresApproval: true
        }
      ]

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: Manual Update Test',
          '# Change Request',
          'approved',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            major_changes: majorChanges,
            created_from: 'automatic_drift_resolution'
          })
        ]
      )

      // Manually update
      const result = await baselineUpdateService.manuallyUpdateBaseline(
        testChangeRequestId,
        testUserId
      )

      expect(result.success).toBe(true)
      expect(result.updatedFields).toContain('technical_baseline')
    })

    test('should reject manual update for non-approved CR', async () => {
      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: Not Approved',
          '# Change Request',
          'pending_approval',
          'change_request',
          testUserId
        ]
      )

      await expect(
        baselineUpdateService.manuallyUpdateBaseline(testChangeRequestId, testUserId)
      ).rejects.toThrow('must be approved')
    })
  })

  describe('hasBaselineBeenUpdated', () => {
    test('should return true when baseline has been updated', async () => {
      const majorChanges = [
        {
          entityType: 'deliverables',
          driftType: 'added',
          description: 'Added Feature F',
          baselineValue: null,
          currentValue: { name: 'Feature F' },
          requiresApproval: true
        }
      ]

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
        [
          testChangeRequestId,
          testProjectId,
          'CR: Check Update Test',
          '# Change Request',
          'approved',
          'change_request',
          testUserId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            major_changes: majorChanges,
            created_from: 'automatic_drift_resolution'
          })
        ]
      )

      // Update baseline
      await baselineUpdateService.updateBaselineFromChangeRequest(
        testChangeRequestId,
        testUserId
      )

      // Check if updated
      const hasBeenUpdated = await baselineUpdateService.hasBaselineBeenUpdated(
        testChangeRequestId
      )

      expect(hasBeenUpdated).toBe(true)
    })

    test('should return false when baseline has not been updated', async () => {
      const newCRId = uuidv4()

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, status, type, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          newCRId,
          testProjectId,
          'CR: Not Updated',
          '# Change Request',
          'pending_approval',
          'change_request',
          testUserId
        ]
      )

      const hasBeenUpdated = await baselineUpdateService.hasBaselineBeenUpdated(newCRId)

      expect(hasBeenUpdated).toBe(false)

      // Cleanup
      await pool.query('DELETE FROM documents WHERE id = $1', [newCRId])
    })
  })
})
