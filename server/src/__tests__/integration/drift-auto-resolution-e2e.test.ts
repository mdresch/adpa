/**
 * End-to-End Test: Automatic Drift Detection & Resolution
 * TASK-722: Tests the complete flow from document save → drift detection → AI resolution → apply
 */

import { driftDetectionService } from '../../services/driftDetectionService'
import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('Drift Auto-Resolution E2E Flow', () => {
  let testProjectId: string
  let testDocumentId: string
  let testUserId: string
  let testBaselineId: string
  let testDriftRecordId: string | null = null

  beforeAll(async () => {
    // Create test data
    testProjectId = uuidv4()
    testDocumentId = uuidv4()
    testUserId = uuidv4()
    testBaselineId = uuidv4()

    // Create test user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'drift-test@example.com', 'hash', 'user', 'Test User')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id, status)
       VALUES ($1, 'Drift Resolution Test Project', $2, 'active')`,
      [testProjectId, testUserId]
    )

    // Create test baseline with approved entities
    await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, created_by, approved_at,
        scope_baseline, technical_baseline, timeline_baseline, cost_baseline
      )
      VALUES ($1, $2, '1.0', 'approved', $3, NOW(), $4, $5, $6, $7)`,
      [
        testBaselineId,
        testProjectId,
        testUserId,
        JSON.stringify({
          stakeholders: [
            { name: 'John Doe', role: 'Project Sponsor', influence_level: 'high' },
            { name: 'Jane Smith', role: 'PM', influence_level: 'high' }
          ],
          risks: [
            { description: 'Vendor delivery delay', probability: 'high', impact: 'high' },
            { description: 'Skills gap in React', probability: 'medium', impact: 'medium' }
          ],
          milestones: [
            { description: 'Testing Complete', due_date: '2024-03-15' }
          ],
          budget: { amount: 500000, currency: 'USD' }
        }),
        JSON.stringify({}),
        JSON.stringify({}),
        JSON.stringify({})
      ]
    )

    // Create initial document aligned with baseline
    const initialContent = `# Test Document

## Stakeholders
- John Doe (Project Sponsor)
- Jane Smith (PM)

## Risks
- Vendor delivery delay (High/High)
- Skills gap in React (Medium/Medium)

## Milestones
- Testing Complete: March 15, 2024

## Budget
$500,000`

    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by, version)
       VALUES ($1, $2, 'Test Document', $3, $4, $4, 1)`,
      [
        testDocumentId,
        testProjectId,
        initialContent,
        testUserId
      ]
    )
  })

  afterAll(async () => {
    // Clean up test data
    if (testDriftRecordId) {
      await pool.query('DELETE FROM baseline_drift_detection WHERE id = $1', [testDriftRecordId])
    }
    await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM project_baselines WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
  })

  describe('Complete E2E Flow: Document Edit → Drift Detection → Resolution → Apply', () => {
    test('should detect drift when document is modified', async () => {
      // Step 1: Update document with drifted content
      const driftedContent = `# Test Document

## Stakeholders
- John Doe (Project Sponsor)
- Jane Smith (PM)
- New Unauthorized Stakeholder (Added - not in baseline) ⚠️

## Risks
- Vendor delivery delay (High/High)
- Skills gap in React (Medium/Medium)
- Removed baseline risk ⚠️

## Milestones
- Testing Complete: April 2, 2024 (Changed from March 15) ⚠️

## Budget
$650,000 (Increased from $500K) ⚠️`

      await pool.query(
        `UPDATE documents SET content = $1, version = version + 1 WHERE id = $2`,
        [driftedContent, testDocumentId]
      )

      // Step 2: Check for drift (simulating automatic detection on save)
      const driftResult = await driftDetectionService.checkForDrift(testProjectId, testDocumentId)

      expect(driftResult.hasDrift).toBe(true)
      expect(driftResult.driftPoints.length).toBeGreaterThan(0)
      expect(['low', 'medium', 'high', 'critical']).toContain(driftResult.severity)

      // Step 3: Create drift record
      const driftRecord = await driftDetectionService.createDriftRecord({
        projectId: testProjectId,
        documentId: testDocumentId,
        baselineId: testBaselineId,
        driftPoints: driftResult.driftPoints,
        severity: driftResult.severity,
        triggeredBy: 'document_update'
      })

      testDriftRecordId = driftRecord.id

      expect(driftRecord.id).toBeDefined()
      expect(driftRecord.status).toBe('detected')
    })

    test('should generate AI resolution preview', async () => {
      if (!testDriftRecordId) {
        throw new Error('Drift record not created in previous test')
      }

      // Step 4: Generate resolution with balanced strategy
      const resolution = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      expect(resolution.resolvedContent).toBeDefined()
      expect(resolution.resolvedContent.length).toBeGreaterThan(0)
      expect(resolution.originalContent).toBeDefined()
      expect(resolution.driftPoints.length).toBeGreaterThan(0)
      expect(resolution.strategy).toBe('balanced')

      // Verify resolution addresses drift points
      const resolvedContent = resolution.resolvedContent.toLowerCase()
      
      // Should restore baseline values
      expect(resolvedContent).toContain('march 15') // Milestone date reverted
      expect(resolvedContent).toContain('500') // Budget restored (or flagged)
      
      // Should identify major changes
      expect(resolution.majorChanges.length).toBeGreaterThan(0)
      expect(resolution.requiresApproval).toBe(true) // Budget change requires approval
    })

    test('should apply resolution and update document', async () => {
      if (!testDriftRecordId) {
        throw new Error('Drift record not created')
      }

      // Step 5: Generate resolution
      const resolution = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      // Step 6: Apply resolution
      const applyResult = await driftResolutionService.applyResolution(
        testDocumentId,
        resolution.resolvedContent,
        testDriftRecordId,
        testUserId,
        resolution.majorChanges
      )

      expect(applyResult).toBeDefined()

      // Step 7: Verify document was updated
      const updatedDoc = await pool.query(
        'SELECT content, version FROM documents WHERE id = $1',
        [testDocumentId]
      )

      expect(updatedDoc.rows[0].content).toBe(resolution.resolvedContent)
      expect(updatedDoc.rows[0].version).toBeGreaterThan(1)

      // Step 8: Verify drift record marked as resolved
      const driftRecord = await pool.query(
        'SELECT status, resolved_at, resolved_by FROM baseline_drift_detection WHERE id = $1',
        [testDriftRecordId]
      )

      expect(driftRecord.rows[0].status).toBe('resolved')
      expect(driftRecord.rows[0].resolved_at).toBeDefined()
      expect(driftRecord.rows[0].resolved_by).toBe(testUserId)

      // Step 9: Verify change request created for major changes
      if (resolution.requiresApproval && applyResult.changeRequestId) {
        const crDoc = await pool.query(
          'SELECT content, metadata FROM documents WHERE id = $1',
          [applyResult.changeRequestId]
        )

        expect(crDoc.rows.length).toBeGreaterThan(0)
        const metadata = crDoc.rows[0].metadata
        expect(metadata?.change_request_type).toBe('drift_resolution')
      }
    })

    test('should work with all three resolution strategies', async () => {
      // Reset document to drifted state
      const driftedContent = `# Test Document

## Stakeholders
- John Doe (Project Sponsor)
- Jane Smith (PM)
- New Stakeholder (Added)

## Risks
- Vendor delivery delay (High/High)

## Milestones
- Testing Complete: April 2, 2024

## Budget
$650,000`

      await pool.query(
        `UPDATE documents SET content = $1 WHERE id = $2`,
        [driftedContent, testDocumentId]
      )

      // Create new drift record
      const driftResult = await driftDetectionService.checkForDrift(testProjectId, testDocumentId)
      const driftRecord = await driftDetectionService.createDriftRecord({
        projectId: testProjectId,
        documentId: testDocumentId,
        baselineId: testBaselineId,
        driftPoints: driftResult.driftPoints,
        severity: driftResult.severity,
        triggeredBy: 'document_update'
      })

      // Test Conservative strategy
      const conservativeResolution = await driftResolutionService.resolveDrift(
        testDocumentId,
        driftRecord.id,
        testUserId,
        'conservative'
      )
      expect(conservativeResolution.strategy).toBe('conservative')
      expect(conservativeResolution.resolvedContent).toBeDefined()

      // Test Balanced strategy
      const balancedResolution = await driftResolutionService.resolveDrift(
        testDocumentId,
        driftRecord.id,
        testUserId,
        'balanced'
      )
      expect(balancedResolution.strategy).toBe('balanced')
      expect(balancedResolution.resolvedContent).toBeDefined()

      // Test Permissive strategy
      const permissiveResolution = await driftResolutionService.resolveDrift(
        testDocumentId,
        driftRecord.id,
        testUserId,
        'permissive'
      )
      expect(permissiveResolution.strategy).toBe('permissive')
      expect(permissiveResolution.resolvedContent).toBeDefined()

      // Clean up
      await pool.query('DELETE FROM baseline_drift_detection WHERE id = $1', [driftRecord.id])
    })
  })
})
