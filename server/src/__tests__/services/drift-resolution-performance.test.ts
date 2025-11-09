/**
 * Test: Drift Resolution - Performance Requirements
 * 
 * Verifies that drift resolution meets the < 5 second performance requirement.
 * Tests various scenarios to ensure consistent performance under different conditions.
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { v4 as uuidv4 } from 'uuid'

// Mock database connection
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }
}))

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

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

describe('Drift Resolution - Performance Tests', () => {
  let testProjectId: string
  let testDocumentId: string
  let testUserId: string
  let testBaselineId: string
  let testDriftRecordId: string

  const { pool } = require('../../database/connection')

  beforeAll(() => {
    // Create test data
    testProjectId = uuidv4()
    testDocumentId = uuidv4()
    testUserId = uuidv4()
    testBaselineId = uuidv4()
    testDriftRecordId = uuidv4()

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

    // Mock database responses
    pool.query.mockImplementation((query: string) => {
      if (query.includes('baseline_drift_detection')) {
        return Promise.resolve({
          rows: [{
            id: testDriftRecordId,
            baseline_id: testBaselineId,
            project_id: testProjectId,
            source_document_id: testDocumentId,
            ai_processing_metadata: {
              drift_points: driftPoints
            }
          }]
        })
      }
      if (query.includes('project_baselines')) {
        return Promise.resolve({
          rows: [{
            id: testBaselineId,
            project_id: testProjectId,
            version: '1.0',
            status: 'approved',
            ...baselineData
          }]
        })
      }
      if (query.includes('documents')) {
        return Promise.resolve({
          rows: [{
            id: testDocumentId,
            project_id: testProjectId,
            title: 'Performance Test Document',
            content: '# Test Content\n\nThis is a test document.',
            created_by: testUserId,
            updated_by: testUserId
          }]
        })
      }
      return Promise.resolve({ rows: [] })
    })
  })

  afterAll(() => {
    jest.clearAllMocks()
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
