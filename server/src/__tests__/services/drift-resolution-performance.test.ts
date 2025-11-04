/**
 * Test: Drift Resolution - Performance Requirements
 * 
 * Verifies that drift resolution meets the < 5 second performance requirement.
 * Tests various scenarios to ensure consistent performance under different conditions.
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

// Mock AI service for performance testing
jest.mock('../../services/aiService', () => ({
  aiService: {
    generateWithFallback: jest.fn().mockResolvedValue({
      content: '# Resolved Document\n\nThis is the AI-generated resolved content.',
      provider: 'google',
      model: 'gemini-2.5-flash',
      usage: {
        prompt_tokens: 500,
        completion_tokens: 300,
        total_tokens: 800
      }
    })
  }
}))

describe('Drift Resolution - Performance Tests', () => {
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
       VALUES ($1, 'perf-test@example.com', 'hash', 'user')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Performance Test Project', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document
    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Performance Test Document', '# Test Content\n\nThis is a test document.', $3, $3)`,
      [testDocumentId, testProjectId, testUserId]
    )

    // Create test baseline with sample data
    const baselineData = {
      scope_baseline: {
        risks: [
          { description: 'Test risk 1', probability: 'high', impact: 'high' },
          { description: 'Test risk 2', probability: 'medium', impact: 'medium' }
        ]
      },
      resource_baseline: {
        stakeholders: [
          { name: 'John Doe', role: 'PM', influence_level: 'high' },
          { name: 'Jane Smith', role: 'Developer', influence_level: 'medium' }
        ]
      },
      timeline_baseline: {
        milestones: [
          { name: 'Kickoff', date: '2024-01-15' },
          { name: 'Testing Complete', date: '2024-03-15' }
        ]
      },
      cost_baseline: {
        total_budget: 500000
      }
    }

    await pool.query(
      `INSERT INTO project_baselines (id, project_id, version, status, created_by, scope_baseline, resource_baseline, timeline_baseline, cost_baseline)
       VALUES ($1, $2, '1.0', 'approved', $3, $4, $5, $6, $7)`,
      [testBaselineId, testProjectId, testUserId, 
       JSON.stringify(baselineData.scope_baseline),
       JSON.stringify(baselineData.resource_baseline),
       JSON.stringify(baselineData.timeline_baseline),
       JSON.stringify(baselineData.cost_baseline)]
    )

    // Create test drift record with drift points
    const driftPoints = [
      {
        entityType: 'stakeholder',
        driftType: 'added',
        description: 'New stakeholder added',
        baselineValue: null,
        currentValue: { name: 'Bob Wilson', role: 'Designer', influence_level: 'low' },
        requiresApproval: false
      },
      {
        entityType: 'risk',
        driftType: 'removed',
        description: 'Risk removed from document',
        baselineValue: { description: 'Test risk 1', probability: 'high', impact: 'high' },
        currentValue: null,
        requiresApproval: true
      }
    ]

    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, drift_description, source_document_id, ai_processing_metadata)
       VALUES ($1, $2, $3, 'scope_drift', 'medium', 'Performance test drift', $4, $5)`,
      [testDriftRecordId, testBaselineId, testProjectId, testDocumentId, 
       JSON.stringify({ drift_points: driftPoints })]
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

  test('should generate resolution in under 5 seconds', async () => {
    const startTime = Date.now()

    const result = await driftResolutionService.resolveDrift(
      testDocumentId,
      testDriftRecordId,
      testUserId,
      'balanced'
    )

    const elapsed = Date.now() - startTime

    // Verify resolution was generated
    expect(result).toBeDefined()
    expect(result.resolvedContent).toBeDefined()
    expect(result.driftPoints).toHaveLength(2)

    // ⭐ CRITICAL: Verify performance requirement
    expect(elapsed).toBeLessThan(5000)
    
    console.log(`✅ Resolution generated in ${elapsed}ms (requirement: < 5000ms)`)
  }, 10000) // 10 second timeout for test itself

  test('should handle conservative strategy within 5 seconds', async () => {
    const startTime = Date.now()

    const result = await driftResolutionService.resolveDrift(
      testDocumentId,
      testDriftRecordId,
      testUserId,
      'conservative'
    )

    const elapsed = Date.now() - startTime

    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(5000)
    
    console.log(`✅ Conservative strategy: ${elapsed}ms`)
  }, 10000)

  test('should handle permissive strategy within 5 seconds', async () => {
    const startTime = Date.now()

    const result = await driftResolutionService.resolveDrift(
      testDocumentId,
      testDriftRecordId,
      testUserId,
      'permissive'
    )

    const elapsed = Date.now() - startTime

    expect(result).toBeDefined()
    expect(elapsed).toBeLessThan(5000)
    
    console.log(`✅ Permissive strategy: ${elapsed}ms`)
  }, 10000)

  test('should log performance metrics', async () => {
    // Spy on logger to verify performance metrics are logged
    const loggerSpy = jest.spyOn(require('../../utils/logger').logger, 'info')

    await driftResolutionService.resolveDrift(
      testDocumentId,
      testDriftRecordId,
      testUserId,
      'balanced'
    )

    // Verify that performance timing was logged
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Resolution generated successfully'),
      expect.objectContaining({
        totalTimeMs: expect.any(Number),
        aiTimeMs: expect.any(Number),
        meetsPerformanceTarget: expect.any(Boolean)
      })
    )

    loggerSpy.mockRestore()
  })

  test('should timeout after 5 seconds and throw error', async () => {
    // Mock slow AI service
    const { aiService } = require('../../services/aiService')
    const originalMock = aiService.generateWithFallback
    
    aiService.generateWithFallback = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        content: 'Slow response',
        provider: 'google',
        model: 'gemini-2.5-flash'
      }), 6000)) // 6 seconds - exceeds timeout
    )

    await expect(
      driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )
    ).rejects.toThrow('AI resolution timeout: exceeded 5 seconds')

    // Restore original mock
    aiService.generateWithFallback = originalMock
  }, 10000)
})
