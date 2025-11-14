/**
 * Test: Prioritization Criteria, Scores, and Rankings Database Schema
 * TASK-280: Verify database schema created with proper indexes, constraints, and default data
 * 
 * Tests:
 * - Table creation and structure
 * - Indexes exist and are properly configured
 * - Constraints and validations
 * - Triggers (weighted score calculation, updated_at)
 * - Foreign key relationships
 * - Default criteria insertion
 * - View functionality
 */

import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('Prioritization Database Schema', () => {
  let testProjectId: string
  let testProgramId: string
  let testUserId: string
  let testCriteriaId: string

  beforeAll(async () => {
    // Create test user
    testUserId = uuidv4()
    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'test-prioritization@example.com', 'hash', 'user', 'Test User')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId]
    )

    // Create test program
    testProgramId = uuidv4()
    await pool!.query(
      `INSERT INTO programs (id, name, owner_id, start_date, end_date)
       VALUES ($1, 'Test Program', $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
       ON CONFLICT (id) DO NOTHING`,
      [testProgramId, testUserId]
    )

    // Create test project
    testProjectId = uuidv4()
    await pool!.query(
      `INSERT INTO projects (id, name, program_id, created_by)
       VALUES ($1, 'Test Prioritization Project', $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [testProjectId, testProgramId, testUserId]
    )
  })

  afterAll(async () => {
    // Clean up test data
    await pool!.query('DELETE FROM project_priority_scores WHERE project_id = $1', [testProjectId])
    await pool!.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool!.query('DELETE FROM programs WHERE id = $1', [testProgramId])
    await pool!.query('DELETE FROM prioritization_criteria WHERE id = $1', [testCriteriaId])
    await pool!.query('DELETE FROM users WHERE id = $1', [testUserId])
  })

  describe('Prioritization Criteria Table', () => {
    test('should have prioritization_criteria table', async () => {
      const result = await pool!.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'prioritization_criteria'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    test('should have all required columns', async () => {
      const result = await pool!.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'prioritization_criteria'
        ORDER BY column_name
      `)

      const columns = result.rows.map((r: any) => r.column_name)
      
      expect(columns).toContain('id')
      expect(columns).toContain('organization_id')
      expect(columns).toContain('name')
      expect(columns).toContain('weight')
      expect(columns).toContain('scale_min')
      expect(columns).toContain('scale_max')
      expect(columns).toContain('is_inverted')
      expect(columns).toContain('description')
      expect(columns).toContain('sort_order')
      expect(columns).toContain('is_active')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
      expect(columns).toContain('created_by')
    })

    test('should have proper indexes', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'prioritization_criteria'
      `)

      const indexNames = result.rows.map((r: any) => r.indexname)
      
      expect(indexNames.some((name: string) => name.includes('idx_prioritization_criteria_org'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('idx_prioritization_criteria_active'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('idx_prioritization_criteria_sort'))).toBe(true)
    })

    test('should enforce weight constraint (0-100)', async () => {
      testCriteriaId = uuidv4()
      
      // Should fail with weight > 100
      await expect(
        pool!.query(
          `INSERT INTO prioritization_criteria (id, name, weight)
           VALUES ($1, 'Test Criterion', 101)`,
          [testCriteriaId]
        )
      ).rejects.toThrow()

      // Should fail with weight < 0
      await expect(
        pool!.query(
          `INSERT INTO prioritization_criteria (id, name, weight)
           VALUES ($1, 'Test Criterion', -1)`,
          [testCriteriaId]
        )
      ).rejects.toThrow()

      // Should succeed with valid weight
      await pool!.query(
        `INSERT INTO prioritization_criteria (id, name, weight)
         VALUES ($1, 'Test Criterion', 25.0)`,
        [testCriteriaId]
      )
    })

    test('should enforce scale constraints', async () => {
      const invalidCriteriaId = uuidv4()
      
      // Should fail if scale_max < scale_min
      await expect(
        pool!.query(
          `INSERT INTO prioritization_criteria (id, name, weight, scale_min, scale_max)
           VALUES ($1, 'Test Criterion', 25.0, 5, 1)`,
          [invalidCriteriaId]
        )
      ).rejects.toThrow()
    })

    test('should have default 5 criteria inserted', async () => {
      const result = await pool!.query(`
        SELECT name, weight, sort_order, is_inverted
        FROM prioritization_criteria
        WHERE is_active = TRUE
        ORDER BY sort_order
      `)

      expect(result.rows.length).toBeGreaterThanOrEqual(5)
      
      const criteriaNames = result.rows.map((r: any) => r.name)
      expect(criteriaNames).toContain('Strategic Alignment')
      expect(criteriaNames).toContain('Value Contribution')
      expect(criteriaNames).toContain('Risk Level')
      expect(criteriaNames).toContain('Resource Availability')
      expect(criteriaNames).toContain('Urgency')
    })

    test('should have default criteria with correct weights', async () => {
      const result = await pool!.query(`
        SELECT name, weight
        FROM prioritization_criteria
        WHERE name IN ('Strategic Alignment', 'Value Contribution', 'Risk Level', 'Resource Availability', 'Urgency')
        ORDER BY name
      `)

      const weights = result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.weight), 0)
      expect(weights).toBe(100.0)
    })

    test('should have Risk Level as inverted criterion', async () => {
      const result = await pool!.query(`
        SELECT is_inverted
        FROM prioritization_criteria
        WHERE name = 'Risk Level'
      `)

      expect(result.rows[0].is_inverted).toBe(true)
    })

    test('should update updated_at on modification', async () => {
      const initialResult = await pool!.query(`
        SELECT updated_at
        FROM prioritization_criteria
        WHERE id = $1
      `, [testCriteriaId])

      const initialUpdatedAt = initialResult.rows[0].updated_at

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000))

      await pool!.query(`
        UPDATE prioritization_criteria
        SET description = 'Updated description'
        WHERE id = $1
      `, [testCriteriaId])

      const updatedResult = await pool!.query(`
        SELECT updated_at
        FROM prioritization_criteria
        WHERE id = $1
      `, [testCriteriaId])

      expect(new Date(updatedResult.rows[0].updated_at).getTime())
        .toBeGreaterThan(new Date(initialUpdatedAt).getTime())
    })
  })

  describe('Project Priority Scores Table', () => {
    let testScoreId: string
    let defaultCriteriaId: string

    beforeAll(async () => {
      // Get a default criteria ID
      const criteriaResult = await pool!.query(`
        SELECT id FROM prioritization_criteria WHERE name = 'Strategic Alignment' LIMIT 1
      `)
      defaultCriteriaId = criteriaResult.rows[0].id
    })

    test('should have project_priority_scores table', async () => {
      const result = await pool!.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_priority_scores'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    test('should have all required columns', async () => {
      const result = await pool!.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'project_priority_scores'
        ORDER BY column_name
      `)

      const columns = result.rows.map((r: any) => r.column_name)
      
      expect(columns).toContain('id')
      expect(columns).toContain('project_id')
      expect(columns).toContain('criteria_id')
      expect(columns).toContain('raw_score')
      expect(columns).toContain('weighted_score')
      expect(columns).toContain('justification')
      expect(columns).toContain('scored_by')
      expect(columns).toContain('scored_at')
      expect(columns).toContain('updated_at')
    })

    test('should have proper indexes', async () => {
      const result = await pool!.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'project_priority_scores'
      `)

      const indexNames = result.rows.map((r: any) => r.indexname)
      
      expect(indexNames.some((name: string) => name.includes('idx_project_priority_scores_project'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('idx_project_priority_scores_criteria'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('idx_project_priority_scores_composite'))).toBe(true)
    })

    test('should enforce raw_score constraint (1-5)', async () => {
      testScoreId = uuidv4()
      
      // Should fail with score > 5
      await expect(
        pool!.query(
          `INSERT INTO project_priority_scores (id, project_id, criteria_id, raw_score)
           VALUES ($1, $2, $3, 6)`,
          [testScoreId, testProjectId, defaultCriteriaId]
        )
      ).rejects.toThrow()

      // Should fail with score < 1
      await expect(
        pool!.query(
          `INSERT INTO project_priority_scores (id, project_id, criteria_id, raw_score)
           VALUES ($1, $2, $3, 0)`,
          [testScoreId, testProjectId, defaultCriteriaId]
        )
      ).rejects.toThrow()

      // Should succeed with valid score
      await pool!.query(
        `INSERT INTO project_priority_scores (id, project_id, criteria_id, raw_score, scored_by)
         VALUES ($1, $2, $3, 4, $4)`,
        [testScoreId, testProjectId, defaultCriteriaId, testUserId]
      )
    })

    test('should enforce unique constraint on (project_id, criteria_id)', async () => {
      const duplicateScoreId = uuidv4()
      
      // Should fail when trying to insert duplicate
      await expect(
        pool!.query(
          `INSERT INTO project_priority_scores (id, project_id, criteria_id, raw_score)
           VALUES ($1, $2, $3, 3)`,
          [duplicateScoreId, testProjectId, defaultCriteriaId]
        )
      ).rejects.toThrow()
    })

    test('should auto-calculate weighted_score on insert', async () => {
      const criteriaResult = await pool!.query(`
        SELECT id, weight FROM prioritization_criteria WHERE name = 'Strategic Alignment' LIMIT 1
      `)
      const criteria = criteriaResult.rows[0]
      const expectedWeightedScore = 4 * (criteria.weight / 100.0) // raw_score = 4, weight = 30%

      const scoreResult = await pool!.query(`
        SELECT weighted_score
        FROM project_priority_scores
        WHERE id = $1
      `, [testScoreId])

      expect(parseFloat(scoreResult.rows[0].weighted_score)).toBeCloseTo(expectedWeightedScore, 4)
    })

    test('should auto-calculate weighted_score on update', async () => {
      const criteriaResult = await pool!.query(`
        SELECT id, weight FROM prioritization_criteria WHERE name = 'Strategic Alignment' LIMIT 1
      `)
      const criteria = criteriaResult.rows[0]
      const newRawScore = 5
      const expectedWeightedScore = newRawScore * (criteria.weight / 100.0)

      await pool!.query(`
        UPDATE project_priority_scores
        SET raw_score = $1
        WHERE id = $2
      `, [newRawScore, testScoreId])

      const scoreResult = await pool!.query(`
        SELECT weighted_score
        FROM project_priority_scores
        WHERE id = $1
      `, [testScoreId])

      expect(parseFloat(scoreResult.rows[0].weighted_score)).toBeCloseTo(expectedWeightedScore, 4)
    })

    test('should cascade delete when project is deleted', async () => {
      const tempProjectId = uuidv4()
      const tempScoreId = uuidv4()

      await pool!.query(
        `INSERT INTO projects (id, name, created_by)
         VALUES ($1, 'Temp Project', $2)`,
        [tempProjectId, testUserId]
      )

      await pool!.query(
        `INSERT INTO project_priority_scores (id, project_id, criteria_id, raw_score)
         VALUES ($1, $2, $3, 3)`,
        [tempScoreId, tempProjectId, defaultCriteriaId]
      )

      await pool!.query('DELETE FROM projects WHERE id = $1', [tempProjectId])

      const result = await pool!.query(
        'SELECT COUNT(*) FROM project_priority_scores WHERE id = $1',
        [tempScoreId]
      )

      expect(parseInt(result.rows[0].count)).toBe(0)
    })

    test('should update updated_at on modification', async () => {
      const initialResult = await pool!.query(`
        SELECT updated_at
        FROM project_priority_scores
        WHERE id = $1
      `, [testScoreId])

      const initialUpdatedAt = initialResult.rows[0].updated_at

      await new Promise(resolve => setTimeout(resolve, 1000))

      await pool!.query(`
        UPDATE project_priority_scores
        SET justification = 'Updated justification'
        WHERE id = $1
      `, [testScoreId])

      const updatedResult = await pool!.query(`
        SELECT updated_at
        FROM project_priority_scores
        WHERE id = $1
      `, [testScoreId])

      expect(new Date(updatedResult.rows[0].updated_at).getTime())
        .toBeGreaterThan(new Date(initialUpdatedAt).getTime())
    })
  })

  describe('Project Priority Rankings View', () => {
    test('should have project_priority_rankings view', async () => {
      const result = await pool!.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = 'project_priority_rankings'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    test('should return all projects with rankings', async () => {
      const result = await pool!.query(`
        SELECT project_id, project_name, program_id, total_score, rank, priority_tier
        FROM project_priority_rankings
        WHERE project_id = $1
      `, [testProjectId])

      expect(result.rows.length).toBe(1)
      expect(result.rows[0].project_id).toBe(testProjectId)
      expect(result.rows[0].project_name).toBe('Test Prioritization Project')
      expect(result.rows[0]).toHaveProperty('total_score')
      expect(result.rows[0]).toHaveProperty('rank')
      expect(result.rows[0]).toHaveProperty('priority_tier')
    })

    test('should calculate correct priority tier based on total_score', async () => {
      // Create multiple projects with different scores
      const project1Id = uuidv4()
      const project2Id = uuidv4()
      const project3Id = uuidv4()

      await pool!.query(
        `INSERT INTO projects (id, name, program_id, created_by)
         VALUES ($1, 'High Priority Project', $2, $3),
                ($2, 'Medium Priority Project', $2, $3),
                ($3, 'Low Priority Project', $2, $3)`,
        [project1Id, project2Id, project3Id, testProgramId, testUserId]
      )

      // Get criteria IDs
      const criteriaResult = await pool!.query(`
        SELECT id, weight FROM prioritization_criteria WHERE is_active = TRUE ORDER BY sort_order
      `)

      // Score project1 with high scores (should be Critical tier)
      for (const criteria of criteriaResult.rows) {
        await pool!.query(
          `INSERT INTO project_priority_scores (project_id, criteria_id, raw_score, scored_by)
           VALUES ($1, $2, 5, $3)`,
          [project1Id, criteria.id, testUserId]
        )
      }

      // Score project2 with medium scores (should be High tier)
      for (const criteria of criteriaResult.rows) {
        await pool!.query(
          `INSERT INTO project_priority_scores (project_id, criteria_id, raw_score, scored_by)
           VALUES ($1, $2, 3, $3)`,
          [project2Id, criteria.id, testUserId]
        )
      }

      // Score project3 with low scores (should be Medium tier)
      for (const criteria of criteriaResult.rows) {
        await pool!.query(
          `INSERT INTO project_priority_scores (project_id, criteria_id, raw_score, scored_by)
           VALUES ($1, $2, 2, $3)`,
          [project3Id, criteria.id, testUserId]
        )
      }

      const result = await pool!.query(`
        SELECT project_id, project_name, total_score, priority_tier
        FROM project_priority_rankings
        WHERE project_id IN ($1, $2, $3)
        ORDER BY total_score DESC
      `, [project1Id, project2Id, project3Id])

      expect(result.rows[0].priority_tier).toBe('Critical')
      expect(result.rows[1].priority_tier).toBe('High')
      expect(result.rows[2].priority_tier).toBe('Medium')

      // Cleanup
      await pool!.query('DELETE FROM project_priority_scores WHERE project_id IN ($1, $2, $3)', 
        [project1Id, project2Id, project3Id])
      await pool!.query('DELETE FROM projects WHERE id IN ($1, $2, $3)', 
        [project1Id, project2Id, project3Id])
    })

    test('should rank projects correctly within program', async () => {
      const project1Id = uuidv4()
      const project2Id = uuidv4()

      await pool!.query(
        `INSERT INTO projects (id, name, program_id, created_by)
         VALUES ($1, 'Rank 1 Project', $2, $3),
                ($2, 'Rank 2 Project', $2, $3)`,
        [project1Id, project2Id, testProgramId, testUserId]
      )

      const criteriaResult = await pool!.query(`
        SELECT id FROM prioritization_criteria WHERE is_active = TRUE LIMIT 1
      `)
      const criteriaId = criteriaResult.rows[0].id

      // Project 1: score = 5
      await pool!.query(
        `INSERT INTO project_priority_scores (project_id, criteria_id, raw_score, scored_by)
         VALUES ($1, $2, 5, $3)`,
        [project1Id, criteriaId, testUserId]
      )

      // Project 2: score = 3
      await pool!.query(
        `INSERT INTO project_priority_scores (project_id, criteria_id, raw_score, scored_by)
         VALUES ($1, $2, 3, $3)`,
        [project2Id, criteriaId, testUserId]
      )

      const result = await pool!.query(`
        SELECT project_id, project_name, rank
        FROM project_priority_rankings
        WHERE project_id IN ($1, $2)
        ORDER BY rank
      `, [project1Id, project2Id])

      expect(result.rows[0].rank).toBeLessThan(result.rows[1].rank)
      expect(result.rows[0].project_id).toBe(project1Id)

      // Cleanup
      await pool!.query('DELETE FROM project_priority_scores WHERE project_id IN ($1, $2)', 
        [project1Id, project2Id])
      await pool!.query('DELETE FROM projects WHERE id IN ($1, $2)', 
        [project1Id, project2Id])
    })
  })

  describe('Integration Tests', () => {
    test('should calculate example from roadmap correctly', async () => {
      // Example: Project Alpha
      // Strategic Alignment: 5 × 30% = 1.50
      // Value Contribution: 4 × 25% = 1.00
      // Risk Level: 4 × 15% = 0.60
      // Resource Availability: 3 × 20% = 0.60
      // Urgency: 4 × 10% = 0.40
      // Total: 4.10 (Critical tier)

      const exampleProjectId = uuidv4()
      await pool!.query(
        `INSERT INTO projects (id, name, program_id, created_by)
         VALUES ($1, 'Project Alpha', $2, $3)`,
        [exampleProjectId, testProgramId, testUserId]
      )

      const criteriaResult = await pool!.query(`
        SELECT id, name, weight FROM prioritization_criteria 
        WHERE name IN ('Strategic Alignment', 'Value Contribution', 'Risk Level', 'Resource Availability', 'Urgency')
        ORDER BY name
      `)

      const scores = [
        { name: 'Strategic Alignment', score: 5 },
        { name: 'Value Contribution', score: 4 },
        { name: 'Risk Level', score: 4 },
        { name: 'Resource Availability', score: 3 },
        { name: 'Urgency', score: 4 }
      ]

      for (const scoreData of scores) {
        const criteria = criteriaResult.rows.find((c: any) => c.name === scoreData.name)
        await pool!.query(
          `INSERT INTO project_priority_scores (project_id, criteria_id, raw_score, scored_by)
           VALUES ($1, $2, $3, $4)`,
          [exampleProjectId, criteria.id, scoreData.score, testUserId]
        )
      }

      const result = await pool!.query(`
        SELECT total_score, priority_tier
        FROM project_priority_rankings
        WHERE project_id = $1
      `, [exampleProjectId])

      expect(parseFloat(result.rows[0].total_score)).toBeCloseTo(4.10, 2)
      expect(result.rows[0].priority_tier).toBe('Critical')

      // Cleanup
      await pool!.query('DELETE FROM project_priority_scores WHERE project_id = $1', [exampleProjectId])
      await pool!.query('DELETE FROM projects WHERE id = $1', [exampleProjectId])
    })
  })
})

