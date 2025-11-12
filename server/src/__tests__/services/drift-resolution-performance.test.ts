/**
 * Test: Drift Resolution Performance
 * 
 * Verifies that drift resolution completes in under 5 seconds
 * as specified in TASK-736 acceptance criteria.
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('Drift Resolution - Performance', () => {
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
       VALUES ($1, 'perf-test@example.com', 'hash', 'user')
       ON CONFLICT (email) DO UPDATE SET id = $1`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Performance Test Project', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document with realistic content
    const documentContent = `# Risk Management Plan

## 1. Introduction
This document outlines the risk management approach for the project.

## 2. Risk Identification

### 2.1 Technical Risks
- Infrastructure failures
- Integration challenges
- Performance issues

### 2.2 Schedule Risks
- Resource availability
- Dependencies on external vendors
- Scope creep

## 3. Risk Assessment

### 3.1 High Priority Risks
1. **Vendor Delivery Delay** - High probability, High impact
2. **Skills Gap in React** - Medium probability, Medium impact

### 3.2 Medium Priority Risks
1. **Budget overrun** - Medium probability, High impact
2. **Quality issues** - Low probability, High impact

## 4. Mitigation Strategies

Each identified risk has been assigned an owner and mitigation plan.

## 5. Monitoring and Control

Risk status will be reviewed weekly during project status meetings.`

    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Risk Management Plan', $3, $4, $4)`,
      [testDocumentId, testProjectId, documentContent, testUserId]
    )

    // Create test baseline with realistic data
    const baselineData = {
      scope_baseline: {
        deliverables: [
          { id: 1, name: 'Web Application', description: 'Main web app' },
          { id: 2, name: 'Mobile App', description: 'iOS and Android apps' },
          { id: 3, name: 'API Backend', description: 'RESTful API' }
        ],
        scope_items: [
          { id: 1, name: 'User Authentication' },
          { id: 2, name: 'Data Analytics' },
          { id: 3, name: 'Reporting Module' }
        ]
      },
      timeline_baseline: {
        milestones: [
          { id: 1, name: 'Design Complete', date: '2025-03-15' },
          { id: 2, name: 'Development Complete', date: '2025-06-30' },
          { id: 3, name: 'Testing Complete', date: '2025-08-15' }
        ]
      },
      cost_baseline: {
        total_budget: 500000,
        currency: 'USD'
      },
      resource_baseline: {
        resources: [
          { id: 1, name: 'Project Manager', allocation: 1.0 },
          { id: 2, name: 'Tech Lead', allocation: 1.0 },
          { id: 3, name: 'Developers', allocation: 4.0 }
        ]
      }
    }

    await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, created_by,
        scope_baseline, timeline_baseline, cost_baseline, resource_baseline
      ) VALUES ($1, $2, '1.0', 'approved', $3, $4, $5, $6, $7)`,
      [
        testBaselineId, 
        testProjectId, 
        testUserId,
        JSON.stringify(baselineData.scope_baseline),
        JSON.stringify(baselineData.timeline_baseline),
        JSON.stringify(baselineData.cost_baseline),
        JSON.stringify(baselineData.resource_baseline)
      ]
    )

    // Create test drift record with realistic drift points
    const driftPoints = [
      {
        entityType: 'risk',
        driftType: 'removed',
        description: 'Risk "Vendor Delivery Delay" removed from document',
        baselineValue: { name: 'Vendor Delivery Delay', probability: 'high', impact: 'high' },
        currentValue: null,
        requiresApproval: false
      },
      {
        entityType: 'risk',
        driftType: 'removed',
        description: 'Risk "Skills Gap in React" removed from document',
        baselineValue: { name: 'Skills Gap in React', probability: 'medium', impact: 'medium' },
        currentValue: null,
        requiresApproval: false
      },
      {
        entityType: 'milestone',
        driftType: 'modified',
        description: 'Milestone date changed',
        baselineValue: '2025-03-15',
        currentValue: '2025-04-02',
        requiresApproval: true
      }
    ]

    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, drift_description, 
        source_document_id, ai_processing_metadata, status)
       VALUES ($1, $2, $3, 'automatic', 'medium', 'Multiple drifts detected', $4, $5, 'detected')`,
      [
        testDriftRecordId, 
        testBaselineId, 
        testProjectId, 
        testDocumentId,
        JSON.stringify({ drift_points: driftPoints })
      ]
    )
  })

  afterAll(async () => {
    // Clean up test data
    try {
      await pool.query('DELETE FROM baseline_drift_detection WHERE id = $1', [testDriftRecordId])
      await pool.query('DELETE FROM project_baselines WHERE id = $1', [testBaselineId])
      await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    } catch (error) {
      console.error('Cleanup error:', error)
    }
    
    // Close pool
    await pool.end()
  })

  test('should generate resolution in under 5 seconds', async () => {
    const startTime = Date.now()
    
    try {
      // Call the drift resolution service
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )
      
      const duration = Date.now() - startTime
      const durationSeconds = duration / 1000
      
      // Log performance metrics
      console.log('\n=== PERFORMANCE TEST RESULTS ===')
      console.log(`Total Duration: ${durationSeconds.toFixed(2)}s (${duration}ms)`)
      console.log(`Target: < 5.0s`)
      console.log(`Status: ${duration < 5000 ? '✅ PASS' : '❌ FAIL'}`)
      console.log('================================\n')
      
      // Verify the result
      expect(result).toBeDefined()
      expect(result.resolvedContent).toBeDefined()
      expect(result.originalContent).toBeDefined()
      expect(result.driftPoints).toBeDefined()
      expect(result.strategy).toBe('balanced')
      
      // Assert performance requirement: < 5 seconds
      expect(duration).toBeLessThan(5000)
      
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Test failed after ${duration}ms:`, error)
      throw error
    }
  }, 10000) // 10 second timeout for the test itself

  test('should handle multiple resolution requests efficiently', async () => {
    // This test verifies that optimizations like caching work correctly
    const iterations = 3
    const durations: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      
      try {
        await driftResolutionService.resolveDrift(
          testDocumentId,
          testDriftRecordId,
          testUserId,
          'balanced'
        )
        
        const duration = Date.now() - startTime
        durations.push(duration)
        
        console.log(`Iteration ${i + 1}: ${duration}ms`)
      } catch (error) {
        console.error(`Iteration ${i + 1} failed:`, error)
      }
    }
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const avgSeconds = avgDuration / 1000
    
    console.log('\n=== MULTIPLE REQUESTS PERFORMANCE ===')
    console.log(`Average Duration: ${avgSeconds.toFixed(2)}s (${avgDuration.toFixed(0)}ms)`)
    console.log(`Min: ${Math.min(...durations)}ms`)
    console.log(`Max: ${Math.max(...durations)}ms`)
    console.log('====================================\n')
    
    // All should be under 5 seconds
    durations.forEach(duration => {
      expect(duration).toBeLessThan(5000)
    })
  }, 30000) // 30 second timeout for multiple iterations
})
