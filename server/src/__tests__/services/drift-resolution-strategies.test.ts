/**
 * Test: Drift Resolution - All 3 Strategies
 * TASK-723: Test all 3 strategies
 * 
 * Validates that all three drift resolution strategies work correctly:
 * 1. Conservative: Revert ALL changes to match baseline exactly
 * 2. Balanced: Keep valid updates, revert unauthorized changes, flag major changes
 * 3. Permissive: Keep most changes, only revert critical baseline violations
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'
import * as aiServiceModule from '../../services/aiService'

// Mock the AI service
jest.mock('../../services/aiService', () => ({
  aiService: {
    generate: jest.fn(),
  },
}))

describe('Drift Resolution - All 3 Strategies', () => {
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
       VALUES ($1, 'test-strategies@example.com', 'hash', 'user')`,
      [testUserId]
    )

    // Create test project
    await pool.query(
      `INSERT INTO projects (id, name, owner_id)
       VALUES ($1, 'Test Strategies Project', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document with drifted content
    const documentContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence
- Charlie Brown (Developer) - NEW (not in baseline)

## Risks
- Risk A: High priority
- Risk B: Medium priority
(Note: Risk C from baseline was removed)

## Milestones
- Milestone 1: 2026-03-15 (changed from 2026-03-01 in baseline)
- Milestone 2: 2026-04-30

## Budget
Current budget: $550,000 (baseline was $500,000 - 10% increase)`

    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Test Document', $3, $4, $4)`,
      [testDocumentId, testProjectId, documentContent, testUserId]
    )

    // Create test baseline with structured data
    const baselineData = {
      scope_baseline: {
        stakeholders: [
          { name: 'Alice Johnson', role: 'PM', influence_level: 'high' },
          { name: 'Bob Smith', role: 'Tech Lead', influence_level: 'medium' }
        ],
        risks: [
          { name: 'Risk A', priority: 'high' },
          { name: 'Risk B', priority: 'medium' },
          { name: 'Risk C', priority: 'low' }
        ]
      },
      timeline_baseline: {
        milestones: [
          { name: 'Milestone 1', date: '2026-03-01' },
          { name: 'Milestone 2', date: '2026-04-30' }
        ]
      },
      cost_baseline: {
        budget: { amount: 500000, currency: 'USD' }
      }
    }

    await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, created_by,
        scope_baseline, timeline_baseline, cost_baseline
      ) VALUES ($1, $2, '1.0', 'approved', $3, $4, $5, $6)`,
      [
        testBaselineId,
        testProjectId,
        testUserId,
        JSON.stringify(baselineData.scope_baseline),
        JSON.stringify(baselineData.timeline_baseline),
        JSON.stringify(baselineData.cost_baseline)
      ]
    )

    // Create test drift record with drift points
    const driftPoints = [
      {
        entityType: 'stakeholder',
        driftType: 'added',
        description: 'New stakeholder added: Charlie Brown',
        baselineValue: null,
        currentValue: { name: 'Charlie Brown', role: 'Developer' },
        requiresApproval: false
      },
      {
        entityType: 'risk',
        driftType: 'removed',
        description: 'Risk removed: Risk C',
        baselineValue: { name: 'Risk C', priority: 'low' },
        currentValue: null,
        requiresApproval: false
      },
      {
        entityType: 'milestone',
        driftType: 'modified',
        description: 'Milestone date changed: Milestone 1',
        baselineValue: { name: 'Milestone 1', date: '2026-03-01' },
        currentValue: { name: 'Milestone 1', date: '2026-03-15' },
        requiresApproval: true
      },
      {
        entityType: 'budget',
        driftType: 'modified',
        description: 'Budget increased from $500K to $550K',
        baselineValue: { amount: 500000, currency: 'USD' },
        currentValue: { amount: 550000, currency: 'USD' },
        variance: 10,
        requiresApproval: true
      }
    ]

    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, 
        drift_description, source_document_id, ai_processing_metadata)
       VALUES ($1, $2, $3, 'scope_drift', 'high', 'Test drift with 4 points', $4, $5)`,
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
    await pool.query('DELETE FROM baseline_drift_detection WHERE id = $1', [testDriftRecordId])
    await pool.query('DELETE FROM project_baselines WHERE id = $1', [testBaselineId])
    await pool.query('DELETE FROM documents WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    
    // Close pool
    await pool.end()
  })

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  describe('Strategy 1: Conservative (Strict Baseline Adherence)', () => {
    test('should revert ALL changes to match baseline exactly', async () => {
      // Mock AI response for conservative strategy
      const conservativeResolvedContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-01
- Milestone 2: 2026-04-30

## Budget
Current budget: $500,000

<!-- REQUIRES APPROVAL: All changes reverted to baseline -->`

      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: conservativeResolvedContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 500,
          completion_tokens: 500,
          total_tokens: 1000
        }
      })

      // Call resolveDrift with conservative strategy
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      // Verify strategy was passed to AI
      expect(aiService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('RESOLUTION STRATEGY: CONSERVATIVE')
        })
      )

      // Verify resolved content reverts all changes
      expect(result.resolvedContent).toContain('Alice Johnson')
      expect(result.resolvedContent).toContain('Bob Smith')
      expect(result.resolvedContent).not.toContain('Charlie Brown') // Added stakeholder removed
      expect(result.resolvedContent).toContain('Risk C') // Removed risk restored
      expect(result.resolvedContent).toContain('2026-03-01') // Date reverted
      expect(result.resolvedContent).toContain('$500,000') // Budget reverted
      expect(result.resolvedContent).not.toContain('$550,000')

      // Verify metadata
      expect(result.strategy).toBe('conservative')
      expect(result.originalContent).toBeDefined()
      expect(result.driftPoints).toHaveLength(4)
    })

    test('should flag ALL changes for formal approval', async () => {
      const conservativeContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence

<!-- REQUIRES APPROVAL: Stakeholder changes reverted -->

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

<!-- REQUIRES APPROVAL: Risk changes reverted -->

## Milestones
- Milestone 1: 2026-03-01

<!-- REQUIRES APPROVAL: Milestone date reverted -->

## Budget
Current budget: $500,000

<!-- REQUIRES APPROVAL: Budget reverted -->`

      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: conservativeContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 500,
          completion_tokens: 500,
          total_tokens: 1000
        }
      })

      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      // Verify approval flags are present
      expect(result.resolvedContent).toContain('REQUIRES APPROVAL')
      
      // Count approval flags (should have multiple)
      const approvalCount = (result.resolvedContent.match(/REQUIRES APPROVAL/g) || []).length
      expect(approvalCount).toBeGreaterThan(0)
    })
  })

  describe('Strategy 2: Balanced (Intelligent Adaptation) - RECOMMENDED', () => {
    test('should keep minor updates and revert unauthorized changes', async () => {
      // Mock AI response for balanced strategy
      const balancedResolvedContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence
- Charlie Brown (Developer) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-01

<!-- REQUIRES APPROVAL: Milestone date change from 2026-03-15 to 2026-03-01 -->

## Budget
Current budget: $500,000

<!-- REQUIRES APPROVAL: Budget change from $550,000 to $500,000 (10% decrease) -->`

      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: balancedResolvedContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 600,
          completion_tokens: 600,
          total_tokens: 1200
        }
      })

      // Call resolveDrift with balanced strategy
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      // Verify strategy was passed to AI
      expect(aiService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('RESOLUTION STRATEGY: BALANCED')
        })
      )

      // Verify balanced behavior
      expect(result.resolvedContent).toContain('Charlie Brown') // Minor addition kept
      expect(result.resolvedContent).toContain('Risk C') // Baseline risk restored
      expect(result.resolvedContent).toContain('2026-03-01') // Date reverted
      expect(result.resolvedContent).toContain('$500,000') // Budget reverted

      expect(result.strategy).toBe('balanced')
    })

    test('should flag only major changes for approval', async () => {
      const balancedContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence
- Charlie Brown (Developer) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-01

<!-- REQUIRES APPROVAL: Critical milestone date changed -->

## Budget
Current budget: $500,000

<!-- REQUIRES APPROVAL: Budget modification exceeds 10% threshold -->`

      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: balancedContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 600,
          completion_tokens: 600,
          total_tokens: 1200
        }
      })

      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      // Should have fewer approval flags than conservative
      const approvalCount = (result.resolvedContent.match(/REQUIRES APPROVAL/g) || []).length
      expect(approvalCount).toBeGreaterThanOrEqual(1)
      expect(approvalCount).toBeLessThan(4) // Less than all drift points

      // Should identify major changes
      expect(result.majorChanges.length).toBeGreaterThan(0)
      expect(result.requiresApproval).toBe(true)
    })
  })

  describe('Strategy 3: Permissive (Flexible Adaptation)', () => {
    test('should keep most changes and only revert critical violations', async () => {
      // Mock AI response for permissive strategy
      const permissiveResolvedContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence
- Charlie Brown (Developer) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-15
- Milestone 2: 2026-04-30

## Budget
Current budget: $550,000

<!-- REQUIRES APPROVAL: Budget increase of 10% noted for review -->`

      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: permissiveResolvedContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 550,
          completion_tokens: 550,
          total_tokens: 1100
        }
      })

      // Call resolveDrift with permissive strategy
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      // Verify strategy was passed to AI
      expect(aiService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('RESOLUTION STRATEGY: PERMISSIVE')
        })
      )

      // Verify permissive behavior - keeps most changes
      expect(result.resolvedContent).toContain('Charlie Brown') // New stakeholder kept
      expect(result.resolvedContent).toContain('Risk C') // Baseline risk restored (critical)
      expect(result.resolvedContent).toContain('2026-03-15') // Date change kept
      expect(result.resolvedContent).toContain('$550,000') // Budget change kept but flagged

      expect(result.strategy).toBe('permissive')
    })

    test('should flag only critical changes (budget >10%, major scope)', async () => {
      const permissiveContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence
- Charlie Brown (Developer) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-15
- Milestone 2: 2026-04-30

## Budget
Current budget: $550,000

<!-- REQUIRES APPROVAL: Budget increase exceeds 10% threshold -->`

      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: permissiveContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 550,
          completion_tokens: 550,
          total_tokens: 1100
        }
      })

      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      // Should have minimal approval flags
      const approvalCount = (result.resolvedContent.match(/REQUIRES APPROVAL/g) || []).length
      expect(approvalCount).toBeLessThanOrEqual(2) // Only critical items flagged
    })
  })

  describe('Strategy Comparison', () => {
    test('conservative should revert more than balanced', async () => {
      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>

      // Conservative: reverts everything
      const conservativeContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-01

## Budget
Current budget: $500,000`

      aiService.generate.mockResolvedValueOnce({
        content: conservativeContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 500,
          completion_tokens: 500,
          total_tokens: 1000
        }
      })

      const conservativeResult = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      // Balanced: keeps some changes
      const balancedContent = `# Project Plan

## Stakeholders
- Alice Johnson (PM) - High influence
- Bob Smith (Tech Lead) - Medium influence
- Charlie Brown (Developer) - Medium influence

## Risks
- Risk A: High priority
- Risk B: Medium priority
- Risk C: Low priority

## Milestones
- Milestone 1: 2026-03-01

## Budget
Current budget: $500,000`

      aiService.generate.mockResolvedValueOnce({
        content: balancedContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 600,
          completion_tokens: 600,
          total_tokens: 1200
        }
      })

      const balancedResult = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      // Conservative should not have Charlie Brown
      expect(conservativeResult.resolvedContent).not.toContain('Charlie Brown')
      
      // Balanced should have Charlie Brown
      expect(balancedResult.resolvedContent).toContain('Charlie Brown')
    })

    test('permissive should keep more than balanced', async () => {
      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>

      // Balanced: reverts critical changes
      const balancedContent = `# Project Plan

## Milestones
- Milestone 1: 2026-03-01

## Budget
Current budget: $500,000`

      aiService.generate.mockResolvedValueOnce({
        content: balancedContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 600,
          completion_tokens: 600,
          total_tokens: 1200
        }
      })

      const balancedResult = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      // Permissive: keeps changes
      const permissiveContent = `# Project Plan

## Milestones
- Milestone 1: 2026-03-15

## Budget
Current budget: $550,000`

      aiService.generate.mockResolvedValueOnce({
        content: permissiveContent,
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 550,
          completion_tokens: 550,
          total_tokens: 1100
        }
      })

      const permissiveResult = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      // Balanced should have baseline date
      expect(balancedResult.resolvedContent).toContain('2026-03-01')
      
      // Permissive should keep changed date
      expect(permissiveResult.resolvedContent).toContain('2026-03-15')
    })

    test('all strategies should work with the same drift data', async () => {
      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>

      // Mock responses for all strategies
      const strategies: Array<'conservative' | 'balanced' | 'permissive'> = [
        'conservative',
        'balanced',
        'permissive'
      ]

      for (const strategy of strategies) {
        aiService.generate.mockResolvedValueOnce({
          content: `# Resolved with ${strategy} strategy`,
          provider: 'openai',
          model: 'gpt-4',
          usage: {
            prompt_tokens: 500,
            completion_tokens: 500,
            total_tokens: 1000
          }
        })

        const result = await driftResolutionService.resolveDrift(
          testDocumentId,
          testDriftRecordId,
          testUserId,
          strategy
        )

        expect(result).toBeDefined()
        expect(result.strategy).toBe(strategy)
        expect(result.resolvedContent).toContain(strategy)
        expect(result.driftPoints).toHaveLength(4)
        expect(aiService.generate).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining(`RESOLUTION STRATEGY: ${strategy.toUpperCase()}`)
          })
        )
      }

      // Verify all three strategies were called
      expect(aiService.generate).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should default to balanced strategy when no strategy specified', async () => {
      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockResolvedValue({
        content: '# Default resolution',
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 500,
          completion_tokens: 500,
          total_tokens: 1000
        }
      })

      // Call without strategy parameter (should default to 'balanced')
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId
        // No strategy parameter
      )

      expect(result.strategy).toBe('balanced')
      expect(aiService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('RESOLUTION STRATEGY: BALANCED')
        })
      )
    })

    test('should handle AI service errors gracefully', async () => {
      const aiService = aiServiceModule.aiService as jest.Mocked<typeof aiServiceModule.aiService>
      aiService.generate.mockRejectedValue(new Error('AI service unavailable'))

      await expect(
        driftResolutionService.resolveDrift(
          testDocumentId,
          testDriftRecordId,
          testUserId,
          'conservative'
        )
      ).rejects.toThrow('AI service unavailable')
    })

    test('should handle invalid drift record ID', async () => {
      const invalidDriftRecordId = uuidv4()

      await expect(
        driftResolutionService.resolveDrift(
          testDocumentId,
          invalidDriftRecordId,
          testUserId,
          'balanced'
        )
      ).rejects.toThrow()
    })
  })
})
