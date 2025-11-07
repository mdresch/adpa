/**
 * Test Script: Verify Drift Detection Fix
 * TASK-724: Drift detected automatically on every document save
 * 
 * This script tests that drift detection only triggers on actual content changes
 */

import { pool } from '../src/database/connection'
import { driftDetectionService } from '../src/services/driftDetectionService'

async function testDriftDetectionFix() {
  console.log('🧪 Testing Drift Detection Fix (TASK-724)\n')
  
  let testProjectId: string | null = null
  let testDocumentId: string | null = null
  let testUserId: string | null = null
  let baselineId: string | null = null
  
  try {
    // 1. Create test user
    console.log('1️⃣  Creating test user...')
    const userResult = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['drift-test@example.com', 'hashed_password', 'Drift Test User', 'admin']
    )
    testUserId = userResult.rows[0].id
    console.log('✅ User created:', testUserId)
    
    // 2. Create test project
    console.log('\n2️⃣  Creating test project...')
    const projectResult = await pool.query(
      `INSERT INTO projects (id, name, description, owner_id, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id`,
      ['Test Project - Drift Fix', 'Testing drift detection fix', testUserId, 'active']
    )
    testProjectId = projectResult.rows[0].id
    console.log('✅ Project created:', testProjectId)
    
    // 3. Create test document with metadata entities
    console.log('\n3️⃣  Creating test document with metadata...')
    const docMetadata = {
      stakeholders: [
        { name: 'John Doe', role: 'PM', influence_level: 'high' },
        { name: 'Jane Smith', role: 'Sponsor', influence_level: 'high' }
      ],
      risks: [
        { description: 'Budget overrun', probability: 'medium', impact: 'high' }
      ],
      milestones: [
        { name: 'Phase 1 Complete', date: '2026-06-30' }
      ]
    }
    
    const docResult = await pool.query(
      `INSERT INTO documents (id, name, content, project_id, created_by, metadata, type)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        'Test Document',
        '# Test Document\n\nThis is test content.',
        testProjectId,
        testUserId,
        JSON.stringify(docMetadata),
        'project-charter'
      ]
    )
    testDocumentId = docResult.rows[0].id
    console.log('✅ Document created:', testDocumentId)
    
    // 4. Create baseline with same entities
    console.log('\n4️⃣  Creating approved baseline...')
    const baselineResult = await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, approved_at, approved_by,
        resource_baseline, scope_baseline, timeline_baseline
      ) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4, $5, $6, $7)
      RETURNING id`,
      [
        testProjectId,
        '1.0',
        'approved',
        testUserId,
        JSON.stringify({ stakeholders: docMetadata.stakeholders }),
        JSON.stringify({ risks: docMetadata.risks }),
        JSON.stringify({ milestones: docMetadata.milestones })
      ]
    )
    baselineId = baselineResult.rows[0].id
    console.log('✅ Baseline created:', baselineId)
    
    // TEST 1: Check drift on initial state (should be NO drift)
    console.log('\n📋 TEST 1: Check drift on document that matches baseline')
    console.log('Expected: NO drift (entities match baseline)')
    const test1Result = await driftDetectionService.checkForDrift(testProjectId, testDocumentId)
    console.log('Result:', {
      hasDrift: test1Result.hasDrift,
      severity: test1Result.severity,
      driftCount: test1Result.driftPoints.length,
      summary: test1Result.summary
    })
    
    if (test1Result.hasDrift) {
      console.log('❌ FAILED: Drift detected when there should be none!')
      console.log('Drift points:', test1Result.driftPoints)
    } else {
      console.log('✅ PASSED: No drift detected as expected')
    }
    
    // TEST 2: Update document content without changing entities (should be NO drift)
    console.log('\n📋 TEST 2: Update document content (text only, no entity changes)')
    console.log('Expected: NO drift (entities unchanged)')
    await pool.query(
      `UPDATE documents 
       SET content = $1, updated_at = NOW()
       WHERE id = $2`,
      ['# Test Document\n\nThis is updated test content with more text.', testDocumentId]
    )
    
    const test2Result = await driftDetectionService.checkForDrift(testProjectId, testDocumentId)
    console.log('Result:', {
      hasDrift: test2Result.hasDrift,
      severity: test2Result.severity,
      driftCount: test2Result.driftPoints.length,
      summary: test2Result.summary
    })
    
    if (test2Result.hasDrift) {
      console.log('❌ FAILED: Drift detected on content-only change!')
      console.log('Drift points:', test2Result.driftPoints)
    } else {
      console.log('✅ PASSED: No drift detected as expected')
    }
    
    // TEST 3: Add a new stakeholder (should trigger drift)
    console.log('\n📋 TEST 3: Add new stakeholder to document')
    console.log('Expected: DRIFT detected (new stakeholder added)')
    const updatedMetadata = {
      ...docMetadata,
      stakeholders: [
        ...docMetadata.stakeholders,
        { name: 'Bob Johnson', role: 'Developer', influence_level: 'medium' }
      ]
    }
    
    await pool.query(
      `UPDATE documents 
       SET metadata = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedMetadata), testDocumentId]
    )
    
    const test3Result = await driftDetectionService.checkForDrift(testProjectId, testDocumentId)
    console.log('Result:', {
      hasDrift: test3Result.hasDrift,
      severity: test3Result.severity,
      driftCount: test3Result.driftPoints.length,
      summary: test3Result.summary
    })
    
    if (!test3Result.hasDrift) {
      console.log('❌ FAILED: Drift NOT detected when it should be!')
    } else {
      console.log('✅ PASSED: Drift detected as expected')
      console.log('Drift details:', test3Result.driftPoints.map(d => 
        `${d.entityType}: ${d.driftType} - ${d.description}`
      ))
    }
    
    // TEST 4: Document without metadata (should be NO drift)
    console.log('\n📋 TEST 4: Create document without metadata')
    console.log('Expected: NO drift (no entities to compare)')
    const doc2Result = await pool.query(
      `INSERT INTO documents (id, name, content, project_id, created_by, type)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id`,
      [
        'Document Without Metadata',
        '# Simple Document\n\nNo metadata here.',
        testProjectId,
        testUserId,
        'other'
      ]
    )
    const doc2Id = doc2Result.rows[0].id
    
    const test4Result = await driftDetectionService.checkForDrift(testProjectId, doc2Id)
    console.log('Result:', {
      hasDrift: test4Result.hasDrift,
      severity: test4Result.severity,
      driftCount: test4Result.driftPoints.length,
      summary: test4Result.summary
    })
    
    if (test4Result.hasDrift) {
      console.log('❌ FAILED: Drift detected on document without metadata!')
      console.log('Drift points:', test4Result.driftPoints)
    } else {
      console.log('✅ PASSED: No drift detected as expected')
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('🎉 DRIFT DETECTION FIX TESTS COMPLETE')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    throw error
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    if (testProjectId) {
      await pool.query('DELETE FROM baseline_drift_detection WHERE project_id = $1', [testProjectId])
      await pool.query('DELETE FROM project_baselines WHERE project_id = $1', [testProjectId])
      await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    }
    console.log('✅ Cleanup complete')
    
    await pool.end()
  }
}

// Run tests
testDriftDetectionFix()
  .then(() => {
    console.log('\n✅ All tests completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Tests failed:', error)
    process.exit(1)
  })
