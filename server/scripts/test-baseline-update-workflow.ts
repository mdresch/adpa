/**
 * Test Script: Baseline Update Upon Approval Workflow
 * TASK-746: Baseline update upon approval
 * 
 * This script demonstrates and tests the complete workflow:
 * 1. Create a project with baseline
 * 2. Detect drift
 * 3. Create change request from drift
 * 4. Approve change request
 * 5. Verify baseline is automatically updated
 */

import { pool } from '../src/database/connection'
import { v4 as uuidv4 } from 'uuid'

interface TestResult {
  step: string
  success: boolean
  details?: any
  error?: string
}

async function testBaselineUpdateWorkflow(): Promise<void> {
  const results: TestResult[] = []
  const testIds = {
    userId: uuidv4(),
    projectId: uuidv4(),
    baselineId: uuidv4(),
    documentId: uuidv4(),
    driftId: uuidv4(),
    changeRequestId: uuidv4()
  }

  console.log('\n=== Baseline Update Upon Approval Workflow Test ===\n')
  console.log('Test IDs:', testIds)
  console.log('\n')

  try {
    // Step 1: Create test user
    console.log('Step 1: Creating test user...')
    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id`,
        [testIds.userId, 'baseline-test@adpa.com', 'test-hash', 'admin']
      )
      results.push({ step: 'Create user', success: true })
      console.log('✓ User created\n')
    } catch (error) {
      results.push({ step: 'Create user', success: false, error: String(error) })
      throw error
    }

    // Step 2: Create test project
    console.log('Step 2: Creating test project...')
    try {
      await pool.query(
        `INSERT INTO projects (id, name, description, owner_id, currency_code, budget)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          testIds.projectId,
          'Baseline Update Test Project',
          'Testing automatic baseline updates',
          testIds.userId,
          'USD',
          100000
        ]
      )
      results.push({ step: 'Create project', success: true })
      console.log('✓ Project created\n')
    } catch (error) {
      results.push({ step: 'Create project', success: false, error: String(error) })
      throw error
    }

    // Step 3: Create baseline
    console.log('Step 3: Creating project baseline...')
    try {
      await pool.query(
        `INSERT INTO project_baselines (
          id, project_id, version, status, created_by, approved_by,
          scope_baseline, technical_baseline, timeline_baseline,
          cost_baseline, resource_baseline, success_criteria
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          testIds.baselineId,
          testIds.projectId,
          '1.0',
          'active',
          testIds.userId,
          testIds.userId,
          JSON.stringify({
            deliverables: [
              { name: 'Core Feature A', description: 'Main functionality', priority: 'high' },
              { name: 'Core Feature B', description: 'Secondary functionality', priority: 'medium' }
            ]
          }),
          JSON.stringify({
            stack: ['Node.js', 'PostgreSQL', 'React'],
            architecture: 'Microservices'
          }),
          JSON.stringify({
            milestones: [
              { name: 'Alpha Release', date: '2024-06-30', status: 'planned' },
              { name: 'Beta Release', date: '2024-09-30', status: 'planned' },
              { name: 'GA Release', date: '2024-12-31', status: 'planned' }
            ]
          }),
          JSON.stringify({
            total_budget: 100000,
            budget_breakdown: {
              development: 60000,
              testing: 20000,
              infrastructure: 20000
            }
          }),
          JSON.stringify({
            team: [
              { role: 'Developer', count: 3 },
              { role: 'QA Engineer', count: 1 },
              { role: 'DevOps', count: 1 }
            ]
          }),
          JSON.stringify({
            kpis: [
              'User satisfaction > 90%',
              'System uptime > 99.9%',
              'Performance: < 200ms response time'
            ]
          })
        ]
      )
      results.push({ step: 'Create baseline', success: true, details: { version: '1.0' } })
      console.log('✓ Baseline v1.0 created\n')
    } catch (error) {
      results.push({ step: 'Create baseline', success: false, error: String(error) })
      throw error
    }

    // Step 4: Create a document (that will have drift)
    console.log('Step 4: Creating document...')
    try {
      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, type, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          testIds.documentId,
          testIds.projectId,
          'Project Requirements Document',
          '# Requirements\n\n## Scope\n- Feature A\n- Feature B\n- Feature C (NEW - not in baseline)',
          'requirements',
          'active',
          testIds.userId,
          testIds.userId
        ]
      )
      results.push({ step: 'Create document', success: true })
      console.log('✓ Document created\n')
    } catch (error) {
      results.push({ step: 'Create document', success: false, error: String(error) })
      throw error
    }

    // Step 5: Create change request with drift data
    console.log('Step 5: Creating change request with drift data...')
    try {
      const majorChanges = [
        {
          entityType: 'deliverables',
          driftType: 'added',
          description: 'Added Feature C - Advanced Analytics Dashboard',
          baselineValue: null,
          currentValue: {
            name: 'Feature C',
            description: 'Advanced Analytics Dashboard',
            priority: 'high'
          },
          requiresApproval: true
        },
        {
          entityType: 'budget',
          driftType: 'modified',
          description: 'Budget increased to accommodate new feature',
          baselineValue: { amount: 100000 },
          currentValue: { amount: 115000 },
          variance: 15,
          requiresApproval: true
        },
        {
          entityType: 'technologies',
          driftType: 'added',
          description: 'Added Redis for caching',
          baselineValue: null,
          currentValue: { name: 'Redis', purpose: 'Caching layer' },
          requiresApproval: true
        }
      ]

      await pool.query(
        `INSERT INTO documents (
          id, project_id, name, content, type, status, created_by, updated_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testIds.changeRequestId,
          testIds.projectId,
          'CR: Scope and Budget Update for Feature C',
          `# Change Request: Scope and Budget Update

## Summary
This change request addresses drift detected in the project scope and budget.

## Changes
1. **Added Deliverable**: Feature C - Advanced Analytics Dashboard
2. **Budget Increase**: From $100,000 to $115,000 (15% increase)
3. **Technology Addition**: Redis for caching

## Justification
The analytics dashboard was requested by stakeholders and provides significant value.
The budget increase covers additional development time and infrastructure costs.

## Impact
- Timeline: +2 weeks
- Resources: Same team
- Risk: Low - well-scoped feature

## Approval Required
This change requires stakeholder approval due to budget increase >10%.`,
          'change_request',
          'pending_approval', // Will be approved in next step
          testIds.userId,
          testIds.userId,
          JSON.stringify({
            change_request_type: 'drift_resolution',
            created_from: 'automatic_drift_resolution',
            major_changes: majorChanges,
            source_document_id: testIds.documentId,
            drift_record_id: testIds.driftId
          })
        ]
      )
      results.push({
        step: 'Create change request',
        success: true,
        details: { majorChanges: majorChanges.length }
      })
      console.log('✓ Change request created with 3 major changes\n')
    } catch (error) {
      results.push({ step: 'Create change request', success: false, error: String(error) })
      throw error
    }

    // Step 6: Check baseline BEFORE approval
    console.log('Step 6: Checking baseline before approval...')
    try {
      const beforeResult = await pool.query(
        `SELECT version, cr_update_count, last_cr_update_id
         FROM project_baselines
         WHERE id = $1`,
        [testIds.baselineId]
      )
      const beforeBaseline = beforeResult.rows[0]
      results.push({
        step: 'Check baseline before',
        success: true,
        details: {
          version: beforeBaseline.version,
          cr_update_count: beforeBaseline.cr_update_count,
          last_cr_update_id: beforeBaseline.last_cr_update_id
        }
      })
      console.log('✓ Baseline before approval:')
      console.log('  - Version:', beforeBaseline.version)
      console.log('  - Update count:', beforeBaseline.cr_update_count || 0)
      console.log('  - Last CR update:', beforeBaseline.last_cr_update_id || 'none')
      console.log('')
    } catch (error) {
      results.push({ step: 'Check baseline before', success: false, error: String(error) })
      throw error
    }

    // Step 7: Approve change request (this should trigger baseline update)
    console.log('Step 7: Approving change request...')
    console.log('  (This should automatically trigger baseline update via database trigger)')
    try {
      await pool.query(
        `UPDATE documents
         SET status = $1, updated_by = $2, updated_at = NOW()
         WHERE id = $3`,
        ['approved', testIds.userId, testIds.changeRequestId]
      )
      results.push({ step: 'Approve change request', success: true })
      console.log('✓ Change request approved\n')

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      results.push({ step: 'Approve change request', success: false, error: String(error) })
      throw error
    }

    // Step 8: Check baseline AFTER approval
    console.log('Step 8: Checking baseline after approval...')
    try {
      const afterResult = await pool.query(
        `SELECT version, cr_update_count, last_cr_update_id, 
                scope_baseline, technical_baseline, cost_baseline
         FROM project_baselines
         WHERE id = $1`,
        [testIds.baselineId]
      )
      const afterBaseline = afterResult.rows[0]
      
      const versionChanged = afterBaseline.version !== '1.0'
      const updateCountIncreased = (afterBaseline.cr_update_count || 0) > 0
      const lastCRUpdated = afterBaseline.last_cr_update_id === testIds.changeRequestId

      results.push({
        step: 'Check baseline after',
        success: versionChanged && updateCountIncreased && lastCRUpdated,
        details: {
          version: afterBaseline.version,
          cr_update_count: afterBaseline.cr_update_count,
          last_cr_update_id: afterBaseline.last_cr_update_id,
          version_changed: versionChanged,
          update_count_increased: updateCountIncreased,
          last_cr_updated: lastCRUpdated
        }
      })

      console.log('✓ Baseline after approval:')
      console.log('  - Version:', afterBaseline.version, versionChanged ? '(UPDATED ✓)' : '(NOT UPDATED ✗)')
      console.log('  - Update count:', afterBaseline.cr_update_count, updateCountIncreased ? '(INCREMENTED ✓)' : '(NOT INCREMENTED ✗)')
      console.log('  - Last CR update:', afterBaseline.last_cr_update_id === testIds.changeRequestId ? 'MATCHES ✓' : 'DOES NOT MATCH ✗')
      console.log('')

      if (!versionChanged || !updateCountIncreased || !lastCRUpdated) {
        throw new Error('Baseline was not updated automatically after CR approval!')
      }
    } catch (error) {
      results.push({ step: 'Check baseline after', success: false, error: String(error) })
      throw error
    }

    // Step 9: Check baseline_cr_updates table
    console.log('Step 9: Checking baseline update record...')
    try {
      const updateRecord = await pool.query(
        `SELECT id, update_type, update_summary, baseline_version_before, baseline_version_after,
                updated_fields, approved_by
         FROM baseline_cr_updates
         WHERE change_request_id = $1`,
        [testIds.changeRequestId]
      )

      if (updateRecord.rows.length === 0) {
        throw new Error('No baseline update record found in baseline_cr_updates table!')
      }

      const record = updateRecord.rows[0]
      results.push({
        step: 'Check update record',
        success: true,
        details: {
          update_type: record.update_type,
          version_before: record.baseline_version_before,
          version_after: record.baseline_version_after,
          updated_fields: record.updated_fields?.fields || [],
          update_summary: record.update_summary
        }
      })

      console.log('✓ Baseline update record found:')
      console.log('  - Update type:', record.update_type)
      console.log('  - Version before:', record.baseline_version_before)
      console.log('  - Version after:', record.baseline_version_after)
      console.log('  - Updated fields:', (record.updated_fields?.fields || []).join(', '))
      console.log('  - Summary:', record.update_summary)
      console.log('')
    } catch (error) {
      results.push({ step: 'Check update record', success: false, error: String(error) })
      throw error
    }

    // Step 10: Check baseline version history
    console.log('Step 10: Checking baseline version history...')
    try {
      const versionHistory = await pool.query(
        `SELECT version_number, change_type, change_description, changed_by
         FROM baseline_versions
         WHERE baseline_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [testIds.baselineId]
      )

      results.push({
        step: 'Check version history',
        success: versionHistory.rows.length > 0,
        details: { versions: versionHistory.rows.length }
      })

      console.log('✓ Baseline version history:')
      versionHistory.rows.forEach(v => {
        console.log(`  - ${v.version_number}: ${v.change_type} - ${v.change_description}`)
      })
      console.log('')
    } catch (error) {
      results.push({ step: 'Check version history', success: false, error: String(error) })
      // Don't throw - version history is optional
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  } finally {
    // Cleanup
    console.log('\nCleaning up test data...')
    try {
      await pool.query('DELETE FROM baseline_cr_updates WHERE baseline_id = $1', [testIds.baselineId])
      await pool.query('DELETE FROM baseline_versions WHERE baseline_id = $1', [testIds.baselineId])
      await pool.query('DELETE FROM project_baselines WHERE id = $1', [testIds.baselineId])
      await pool.query('DELETE FROM documents WHERE project_id = $1', [testIds.projectId])
      await pool.query('DELETE FROM projects WHERE id = $1', [testIds.projectId])
      await pool.query('DELETE FROM users WHERE id = $1', [testIds.userId])
      console.log('✓ Cleanup complete\n')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }

    // Print summary
    console.log('\n=== Test Results Summary ===\n')
    results.forEach((result, index) => {
      const icon = result.success ? '✓' : '✗'
      console.log(`${index + 1}. ${icon} ${result.step}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })

    const allPassed = results.every(r => r.success)
    console.log('\n' + '='.repeat(40))
    console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED')
    console.log('='.repeat(40) + '\n')

    await pool.end()
    process.exit(allPassed ? 0 : 1)
  }
}

// Run the test
testBaselineUpdateWorkflow().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
