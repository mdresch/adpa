/**
 * Baseline Entity Types Test Suite
 * TASK-722: Test all entity types in baseline and drift detection system
 * 
 * This test suite verifies that:
 * 1. All 14 entity types are properly defined and accessible
 * 2. Baseline creation from extracted entities includes all entity types
 * 3. Each entity type can be queried and stored correctly
 */

import { pool } from '../../database/connection'
import { createBaselineFromEntities } from '../../services/baselineService'

// Define all 14 entity types in the system
const ALL_ENTITY_TYPES = [
  'scope_items',
  'deliverables', 
  'requirements',
  'milestones',
  'phases',
  'activities',
  'resources',
  'technologies',
  'stakeholders',
  'constraints',
  'risks',
  'success_criteria',
  'quality_standards',
  'best_practices'
] as const

describe('Baseline Entity Types - All 14 Types', () => {
  let testProjectId: string
  let testUserId: string
  
  beforeAll(async () => {
    // Create a test project
    const projectResult = await pool.query(
      `INSERT INTO projects (id, name, description, owner_id, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id`,
      ['Test Project - Entity Types', 'Project for testing all 14 entity types', null, 'active']
    )
    testProjectId = projectResult.rows[0].id

    // Create or get a test user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      ['test-entity-types@example.com', 'hashed_password', 'Test User', 'admin']
    )
    testUserId = userResult.rows[0].id
  })

  afterAll(async () => {
    // Cleanup test data
    if (testProjectId) {
      await pool.query('DELETE FROM project_baselines WHERE project_id = $1', [testProjectId])
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE email = $1', ['test-entity-types@example.com'])
    }
    // Note: pool.end() is removed to avoid closing the global pool
    // The pool should be closed in a global teardown if needed
  })

  describe('Entity Type Tables Existence', () => {
    test.each(ALL_ENTITY_TYPES)(
      'should have table for %s entity type',
      async (entityType) => {
        const result = await pool.query(
          `SELECT table_name 
           FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = $1`,
          [entityType]
        )
        expect(result.rows.length).toBe(1)
        expect(result.rows[0].table_name).toBe(entityType)
      }
    )
  })

  describe('Entity Type Table Columns', () => {
    test.each(ALL_ENTITY_TYPES)(
      '%s table should have required columns (id, project_id, created_at)',
      async (entityType) => {
        // Validate entityType is in our whitelist to prevent SQL injection
        if (!ALL_ENTITY_TYPES.includes(entityType)) {
          throw new Error(`Invalid entity type: ${entityType}`)
        }
        
        const result = await pool.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_schema = 'public' 
             AND table_name = $1 
             AND column_name IN ('id', 'project_id', 'created_at')
           ORDER BY column_name`,
          [entityType]
        )
        
        const columnNames = result.rows.map(row => row.column_name)
        expect(columnNames).toContain('id')
        expect(columnNames).toContain('project_id')
        expect(columnNames).toContain('created_at')
      }
    )
  })

  describe('Entity Creation and Retrieval', () => {
    test.each([
      ['scope_items', { title: 'Test Scope Item', description: 'Test description', priority: 'high' }],
      ['deliverables', { name: 'Test Deliverable', description: 'Test deliverable', due_date: '2026-12-31', status: 'not_started' }],
      ['requirements', { title: 'Test Requirement', description: 'Test req', priority: 'high', status: 'approved' }],
      ['milestones', { name: 'Test Milestone', description: 'Test milestone', due_date: '2026-06-30' }],
      ['phases', { name: 'Test Phase', description: 'Test phase', start_date: '2026-01-01', end_date: '2026-03-31' }],
      ['activities', { name: 'Test Activity', description: 'Test activity', estimated_hours: 40 }],
      ['resources', { name: 'Test Resource', type: 'human', allocation: 100 }],
      ['technologies', { name: 'Test Tech', category: 'framework', version: '1.0' }],
      ['stakeholders', { name: 'Test Stakeholder', role: 'Tester', influence_level: 'high', interest_level: 'high' }],
      ['constraints', { type: 'technical', description: 'Test constraint' }],
      ['risks', { title: 'Test Risk', category: 'technical', probability: 'medium', impact: 'medium', mitigation: 'Test mitigation' }],
      ['success_criteria', { metric: 'Test Metric', target: '100%', measurement: 'Test measurement' }],
      ['quality_standards', { standard: 'Test Standard', description: 'Test quality standard' }],
      ['best_practices', { practice: 'Test Practice', description: 'Test best practice', category: 'development' }]
    ])(
      'should create and retrieve %s entity',
      async (tableName, entityData) => {
        // Build column names and placeholders dynamically
        const columns = ['project_id', ...Object.keys(entityData)]
        const values = [testProjectId, ...Object.values(entityData)]
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
        
        // Insert entity
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING id
        `
        const insertResult = await pool.query(insertQuery, values)
        const entityId = insertResult.rows[0].id
        
        expect(entityId).toBeDefined()
        
        // Retrieve entity
        const selectResult = await pool.query(
          `SELECT * FROM ${tableName} WHERE id = $1 AND project_id = $2`,
          [entityId, testProjectId]
        )
        
        expect(selectResult.rows.length).toBe(1)
        expect(selectResult.rows[0].project_id).toBe(testProjectId)
        
        // Cleanup
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [entityId])
      }
    )
  })

  describe('Baseline Service Integration', () => {
    beforeEach(async () => {
      // Clean up any existing test entities for this project
      for (const entityType of ALL_ENTITY_TYPES) {
        await pool.query(`DELETE FROM ${entityType} WHERE project_id = $1`, [testProjectId])
      }
    })

    test('should query all 14 entity types when creating baseline from extracted entities', async () => {
      // Create at least one entity for each type
      const entityInsertions = [
        pool.query('INSERT INTO scope_items (project_id, title, description, priority) VALUES ($1, $2, $3, $4)', 
          [testProjectId, 'Scope Item 1', 'Description', 'high']),
        pool.query('INSERT INTO deliverables (project_id, name, description, status) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Deliverable 1', 'Description', 'not_started']),
        pool.query('INSERT INTO requirements (project_id, title, description, priority, status) VALUES ($1, $2, $3, $4, $5)',
          [testProjectId, 'Requirement 1', 'Description', 'high', 'approved']),
        pool.query('INSERT INTO milestones (project_id, name, description, due_date) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Milestone 1', 'Description', '2026-06-30']),
        pool.query('INSERT INTO phases (project_id, name, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5)',
          [testProjectId, 'Phase 1', 'Description', '2026-01-01', '2026-03-31']),
        pool.query('INSERT INTO activities (project_id, name, description, estimated_hours) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Activity 1', 'Description', 40]),
        pool.query('INSERT INTO resources (project_id, name, type, allocation) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Resource 1', 'human', 100]),
        pool.query('INSERT INTO technologies (project_id, name, category, version) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Technology 1', 'framework', '1.0']),
        pool.query('INSERT INTO stakeholders (project_id, name, role, influence_level, interest_level) VALUES ($1, $2, $3, $4, $5)',
          [testProjectId, 'Stakeholder 1', 'Sponsor', 'high', 'high']),
        pool.query('INSERT INTO constraints (project_id, type, description) VALUES ($1, $2, $3)',
          [testProjectId, 'technical', 'Constraint 1']),
        pool.query('INSERT INTO risks (project_id, title, category, probability, impact, mitigation) VALUES ($1, $2, $3, $4, $5, $6)',
          [testProjectId, 'Risk 1', 'technical', 'medium', 'medium', 'Mitigation']),
        pool.query('INSERT INTO success_criteria (project_id, metric, target, measurement) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Metric 1', '100%', 'Measurement']),
        pool.query('INSERT INTO quality_standards (project_id, standard, description) VALUES ($1, $2, $3)',
          [testProjectId, 'Standard 1', 'Description']),
        pool.query('INSERT INTO best_practices (project_id, practice, description, category) VALUES ($1, $2, $3, $4)',
          [testProjectId, 'Practice 1', 'Description', 'development'])
      ]
      
      await Promise.all(entityInsertions)
      
      // Verify each entity type has data
      for (const entityType of ALL_ENTITY_TYPES) {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM ${entityType} WHERE project_id = $1`,
          [testProjectId]
        )
        expect(parseInt(result.rows[0].count)).toBeGreaterThan(0)
      }
      
      // Create baseline from extracted entities
      const baselineExtractionResult = await createBaselineFromEntities(testProjectId, testUserId)
      
      // Verify baseline extraction result
      expect(baselineExtractionResult).toBeDefined()
      expect(baselineExtractionResult.scope_baseline).toBeDefined()
      expect(baselineExtractionResult.technical_baseline).toBeDefined()
      expect(baselineExtractionResult.timeline_baseline).toBeDefined()
      expect(baselineExtractionResult.cost_baseline).toBeDefined()
      expect(baselineExtractionResult.resource_baseline).toBeDefined()
      expect(baselineExtractionResult.success_criteria).toBeDefined()
      
      // Verify entity breakdown in metadata
      const entityBreakdown = baselineExtractionResult.ai_processing_metadata.entity_breakdown
      expect(entityBreakdown.scope_items).toBeGreaterThan(0)
      expect(entityBreakdown.deliverables).toBeGreaterThan(0)
      expect(entityBreakdown.requirements).toBeGreaterThan(0)
      expect(entityBreakdown.milestones).toBeGreaterThan(0)
      expect(entityBreakdown.phases).toBeGreaterThan(0)
      expect(entityBreakdown.activities).toBeGreaterThan(0)
      expect(entityBreakdown.resources).toBeGreaterThan(0)
      expect(entityBreakdown.technologies).toBeGreaterThan(0)
      expect(entityBreakdown.stakeholders).toBeGreaterThan(0)
      expect(entityBreakdown.constraints).toBeGreaterThan(0)
      expect(entityBreakdown.risks).toBeGreaterThan(0)
      expect(entityBreakdown.success_criteria).toBeGreaterThan(0)
      expect(entityBreakdown.quality_standards).toBeGreaterThan(0)
      expect(entityBreakdown.best_practices).toBeGreaterThan(0)
    })

    test('should handle empty entity types gracefully', async () => {
      // Don't insert any entities - all types are empty
      
      // Create baseline should throw an error when no entities exist
      await expect(createBaselineFromEntities(testProjectId, testUserId)).rejects.toThrow(
        'No extracted entities found for this project'
      )
    })
  })

  describe('Entity Type Count Verification', () => {
    test('should have exactly 14 entity types defined', () => {
      expect(ALL_ENTITY_TYPES).toHaveLength(14)
    })

    test('should list all expected entity types', () => {
      const expectedTypes = [
        'scope_items',
        'deliverables',
        'requirements',
        'milestones',
        'phases',
        'activities',
        'resources',
        'technologies',
        'stakeholders',
        'constraints',
        'risks',
        'success_criteria',
        'quality_standards',
        'best_practices'
      ]
      
      expect(ALL_ENTITY_TYPES).toEqual(expectedTypes)
    })
  })
})
