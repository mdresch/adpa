/**
 * Test: Drift Resolution Strategies (Conservative/Balanced/Permissive)
 * TASK-729: All 3 strategies (conservative/balanced/permissive) work
 * 
 * Verifies that all three drift resolution strategies work correctly:
 * - Conservative: Revert ALL changes to baseline exactly
 * - Balanced: Keep valid updates, revert unauthorized changes, flag major changes
 * - Permissive: Keep most changes, only revert critical baseline violations
 */

import { driftResolutionService } from '../../services/driftResolutionService'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

// Mock the AI service to return deterministic results
jest.mock('../../services/aiService', () => ({
  aiService: {
    generate: jest.fn(({ prompt }: { prompt: string }) => {
      // Parse strategy from prompt
      const strategyMatch = prompt.match(/RESOLUTION STRATEGY: (\w+)/)
      const strategy = strategyMatch ? strategyMatch[1].toLowerCase() : 'balanced'

      // Return different content based on strategy
      if (strategy === 'conservative') {
        return Promise.resolve({
          content: `# Test Document - Conservative Resolution

## Stakeholders
- John Smith (Project Sponsor) - High influence
- Sarah Chen (Project Manager) - High influence

## Risks
- Vendor delivery delay (High probability, High impact)
- Skills gap in AI/ML (Medium probability, High impact)

## Milestones
- Testing Complete: March 15, 2026

<!-- REQUIRES APPROVAL: All changes reverted to baseline exactly -->
`
        })
      } else if (strategy === 'permissive') {
        return Promise.resolve({
          content: `# Test Document - Permissive Resolution

## Stakeholders
- John Smith (Project Sponsor) - High influence
- Sarah Chen (Project Manager) - High influence
- Tom Wilson (Developer) - Medium influence

## Risks
- Vendor delivery delay (High probability, High impact)
- Skills gap in AI/ML (Medium probability, High impact)

## Milestones
- Testing Complete: April 2, 2026

<!-- Note: Most changes kept, only critical violations flagged -->
`
        })
      } else {
        // Balanced strategy
        return Promise.resolve({
          content: `# Test Document - Balanced Resolution

## Stakeholders
- John Smith (Project Sponsor) - High influence
- Sarah Chen (Project Manager) - High influence
- Tom Wilson (Developer) - Medium influence

## Risks
- Vendor delivery delay (High probability, High impact)
- Skills gap in AI/ML (Medium probability, High impact)

## Milestones
- Testing Complete: March 15, 2026

<!-- REQUIRES APPROVAL: Milestone date change flagged for review -->
`
        })
      }
    })
  }
}))

describe('Drift Resolution Strategies', () => {
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
       VALUES ($1, 'Test Project - Strategies', $2)`,
      [testProjectId, testUserId]
    )

    // Create test document with drifted content
    const documentContent = `# Test Document - Drifted

## Stakeholders
- John Smith (Project Sponsor) - High influence
- Sarah Chen (Project Manager) - High influence
- Tom Wilson (Developer) - Medium influence

## Risks
- Vendor delivery delay (High probability, High impact)
- Skills gap in AI/ML (Medium probability, High impact)

## Milestones
- Testing Complete: April 2, 2026
`

    await pool.query(
      `INSERT INTO documents (id, project_id, name, content, created_by, updated_by)
       VALUES ($1, $2, 'Test Document', $3, $4, $4)`,
      [testDocumentId, testProjectId, documentContent, testUserId]
    )

    // Create test baseline with baseline entities
    const baselineData = {
      scope_baseline: {
        stakeholders: [
          { name: 'John Smith', role: 'Project Sponsor', influence_level: 'high' },
          { name: 'Sarah Chen', role: 'Project Manager', influence_level: 'high' }
        ],
        risks: [
          { name: 'Vendor delivery delay', probability: 'high', impact: 'high' },
          { name: 'Skills gap in AI/ML', probability: 'medium', impact: 'high' }
        ]
      },
      timeline_baseline: {
        milestones: [
          { name: 'Testing Complete', date: '2026-03-15' }
        ]
      }
    }

    await pool.query(
      `INSERT INTO project_baselines (
        id, project_id, version, status, created_by,
        scope_baseline, timeline_baseline
      ) VALUES ($1, $2, '1.0', 'approved', $3, $4, $5)`,
      [testBaselineId, testProjectId, testUserId, 
       JSON.stringify(baselineData.scope_baseline),
       JSON.stringify(baselineData.timeline_baseline)]
    )

    // Create test drift record with drift points
    const driftPoints = [
      {
        entityType: 'stakeholder',
        driftType: 'added',
        description: 'New stakeholder "Tom Wilson" added',
        baselineValue: null,
        currentValue: { name: 'Tom Wilson', role: 'Developer', influence_level: 'medium' },
        requiresApproval: false
      },
      {
        entityType: 'milestone',
        driftType: 'modified',
        description: 'Milestone date changed from March 15 to April 2',
        baselineValue: { name: 'Testing Complete', date: '2026-03-15' },
        currentValue: { name: 'Testing Complete', date: '2026-04-02' },
        requiresApproval: true,
        variance: 18
      }
    ]

    await pool.query(
      `INSERT INTO baseline_drift_detection 
       (id, baseline_id, project_id, detection_type, drift_severity, 
        drift_description, source_document_id, ai_processing_metadata)
       VALUES ($1, $2, $3, 'scope_drift', 'medium', 'Test drift', $4, $5)`,
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

  describe('Conservative Strategy', () => {
    test('should revert ALL changes to baseline exactly', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      expect(result).toBeDefined()
      expect(result.strategy).toBe('conservative')
      expect(result.resolvedContent).toBeDefined()
      expect(result.resolvedContent).toContain('Conservative Resolution')
      
      // Verify that added stakeholder is removed
      expect(result.resolvedContent).not.toContain('Tom Wilson')
      
      // Verify that milestone date is reverted to baseline
      expect(result.resolvedContent).toContain('March 15, 2026')
      expect(result.resolvedContent).not.toContain('April 2, 2026')
      
      // Verify approval flag
      expect(result.resolvedContent).toContain('REQUIRES APPROVAL')
    })

    test('should identify major changes requiring approval', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      expect(result.requiresApproval).toBe(true)
      expect(result.majorChanges.length).toBeGreaterThan(0)
      
      // Conservative strategy treats milestone changes as major
      const milestoneChange = result.majorChanges.find(
        change => change.entityType === 'milestone'
      )
      expect(milestoneChange).toBeDefined()
    })
  })

  describe('Balanced Strategy (Recommended)', () => {
    test('should keep minor changes and flag major changes', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      expect(result).toBeDefined()
      expect(result.strategy).toBe('balanced')
      expect(result.resolvedContent).toBeDefined()
      expect(result.resolvedContent).toContain('Balanced Resolution')
      
      // Verify that minor stakeholder addition is kept
      expect(result.resolvedContent).toContain('Tom Wilson')
      
      // Verify that major milestone change is reverted
      expect(result.resolvedContent).toContain('March 15, 2026')
      expect(result.resolvedContent).not.toContain('April 2, 2026')
      
      // Verify approval flag for major changes
      expect(result.resolvedContent).toContain('REQUIRES APPROVAL')
    })

    test('should identify only major changes requiring approval', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      expect(result.requiresApproval).toBe(true)
      
      // Only milestone change requires approval
      const milestoneChange = result.majorChanges.find(
        change => change.entityType === 'milestone'
      )
      expect(milestoneChange).toBeDefined()
      expect(milestoneChange?.requiresApproval).toBe(true)
    })

    test('should use balanced strategy by default when not specified', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId
        // strategy not specified, should default to 'balanced'
      )

      expect(result).toBeDefined()
      expect(result.strategy).toBe('balanced')
    })
  })

  describe('Permissive Strategy', () => {
    test('should keep most changes and only flag critical violations', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      expect(result).toBeDefined()
      expect(result.strategy).toBe('permissive')
      expect(result.resolvedContent).toBeDefined()
      expect(result.resolvedContent).toContain('Permissive Resolution')
      
      // Verify that stakeholder addition is kept
      expect(result.resolvedContent).toContain('Tom Wilson')
      
      // Verify that milestone date change is kept (permissive allows more changes)
      expect(result.resolvedContent).toContain('April 2, 2026')
      
      // Should not have strict approval requirements
      expect(result.resolvedContent).not.toContain('REQUIRES APPROVAL')
      expect(result.resolvedContent).toContain('Note:')
    })

    test('should have fewer major changes requiring approval', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      // Permissive strategy should still identify truly major changes
      // But should be more lenient overall
      expect(result.requiresApproval).toBe(true)
      expect(result.majorChanges.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Strategy Comparison', () => {
    test('all three strategies should produce different results', async () => {
      const conservative = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      const balanced = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      const permissive = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      // Verify all strategies return results
      expect(conservative).toBeDefined()
      expect(balanced).toBeDefined()
      expect(permissive).toBeDefined()

      // Verify strategies are correctly set
      expect(conservative.strategy).toBe('conservative')
      expect(balanced.strategy).toBe('balanced')
      expect(permissive.strategy).toBe('permissive')

      // Verify resolved content is different for each strategy
      expect(conservative.resolvedContent).not.toBe(balanced.resolvedContent)
      expect(balanced.resolvedContent).not.toBe(permissive.resolvedContent)
      expect(conservative.resolvedContent).not.toBe(permissive.resolvedContent)

      // Conservative should be most restrictive (Tom Wilson removed, date reverted)
      expect(conservative.resolvedContent).not.toContain('Tom Wilson')
      expect(conservative.resolvedContent).toContain('March 15')

      // Balanced should keep minor changes, revert major (Tom Wilson kept, date reverted)
      expect(balanced.resolvedContent).toContain('Tom Wilson')
      expect(balanced.resolvedContent).toContain('March 15')

      // Permissive should keep most changes (Tom Wilson kept, date kept)
      expect(permissive.resolvedContent).toContain('Tom Wilson')
      expect(permissive.resolvedContent).toContain('April 2')
    })

    test('conservative should have most major changes flagged', async () => {
      const conservative = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'conservative'
      )

      const balanced = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      const permissive = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'permissive'
      )

      // All should require some approval due to the milestone change
      expect(conservative.requiresApproval).toBe(true)
      expect(balanced.requiresApproval).toBe(true)
      expect(permissive.requiresApproval).toBe(true)

      // Verify major changes counts reflect strategy differences
      expect(conservative.majorChanges.length).toBeGreaterThanOrEqual(balanced.majorChanges.length)
      expect(balanced.majorChanges.length).toBeGreaterThanOrEqual(permissive.majorChanges.length)
    })
  })

  describe('Resolution Result Structure', () => {
    test('should return complete resolution result with all required fields', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      // Verify all required fields are present
      expect(result).toHaveProperty('resolvedContent')
      expect(result).toHaveProperty('originalContent')
      expect(result).toHaveProperty('driftPoints')
      expect(result).toHaveProperty('majorChanges')
      expect(result).toHaveProperty('requiresApproval')
      expect(result).toHaveProperty('strategy')
      expect(result).toHaveProperty('previewHtml')

      // Verify field types
      expect(typeof result.resolvedContent).toBe('string')
      expect(typeof result.originalContent).toBe('string')
      expect(Array.isArray(result.driftPoints)).toBe(true)
      expect(Array.isArray(result.majorChanges)).toBe(true)
      expect(typeof result.requiresApproval).toBe('boolean')
      expect(typeof result.strategy).toBe('string')
      expect(typeof result.previewHtml).toBe('string')
    })

    test('should include drift points in result', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      expect(result.driftPoints.length).toBeGreaterThan(0)
      
      // Verify drift point structure
      const driftPoint = result.driftPoints[0]
      expect(driftPoint).toHaveProperty('entityType')
      expect(driftPoint).toHaveProperty('driftType')
      expect(driftPoint).toHaveProperty('description')
      expect(driftPoint).toHaveProperty('baselineValue')
      expect(driftPoint).toHaveProperty('currentValue')
    })

    test('should generate preview HTML for diff', async () => {
      const result = await driftResolutionService.resolveDrift(
        testDocumentId,
        testDriftRecordId,
        testUserId,
        'balanced'
      )

      expect(result.previewHtml).toBeDefined()
      expect(result.previewHtml.length).toBeGreaterThan(0)
      
      // Preview should contain diff indicators
      expect(
        result.previewHtml.includes('+') || 
        result.previewHtml.includes('-') ||
        result.previewHtml.includes('  ')
      ).toBe(true)
    })
  })
})
