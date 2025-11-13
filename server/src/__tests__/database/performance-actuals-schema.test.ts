/**
 * Test: Performance Actuals Database Schema
 * TASK-129: Verify database schema created with proper indexes
 * 
 * Tests:
 * - Table creation and structure
 * - Indexes exist and are properly configured
 * - Constraints and validations
 * - Triggers (variance calculation, updated_at)
 * - Foreign key relationships
 */

import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'

describe('Performance Actuals Database Schema', () => {
  let testProjectId: string
  let testUserId: string
  let testEntityId: string

  beforeAll(async () => {
    // Create test user
    testUserId = uuidv4()
    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'test-performance@example.com', 'hash', 'user', 'Test User')
       ON CONFLICT (id) DO NOTHING`,
      [testUserId]
    )

    // Create test project
    testProjectId = uuidv4()
    await pool!.query(
      `INSERT INTO projects (id, name, created_by)
       VALUES ($1, 'Test Performance Project', $2)
       ON CONFLICT (id) DO NOTHING`,
      [testProjectId, testUserId]
    )

    testEntityId = uuidv4()
  })

  afterAll(async () => {
    // Clean up test data
    await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
    await pool!.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool!.query('DELETE FROM users WHERE id = $1', [testUserId])
  })

  describe('Table Structure', () => {
    test('should have performance_actuals table', async () => {
      const result = await pool!.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'performance_actuals'
        )
      `)
      expect(result.rows[0].exists).toBe(true)
    })

    test('should have all required columns', async () => {
      const result = await pool!.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'performance_actuals'
        ORDER BY column_name
      `)

      const columns = result.rows.map((r: any) => r.column_name)
      
      // Required columns
      expect(columns).toContain('id')
      expect(columns).toContain('project_id')
      expect(columns).toContain('entity_type')
      expect(columns).toContain('entity_id')
      expect(columns).toContain('entity_name')
      expect(columns).toContain('measurement_date')
      expect(columns).toContain('measurement_method')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')

      // Schedule columns
      expect(columns).toContain('planned_start_date')
      expect(columns).toContain('actual_start_date')
      expect(columns).toContain('planned_end_date')
      expect(columns).toContain('actual_end_date')
      expect(columns).toContain('schedule_variance_days')
      expect(columns).toContain('schedule_variance_percent')

      // Cost columns
      expect(columns).toContain('planned_cost')
      expect(columns).toContain('actual_cost')
      expect(columns).toContain('cost_variance')
      expect(columns).toContain('cost_variance_percent')

      // Progress columns
      expect(columns).toContain('planned_progress_percent')
      expect(columns).toContain('actual_progress_percent')
      expect(columns).toContain('progress_variance')

      // Quality columns
      expect(columns).toContain('quality_score')
      expect(columns).toContain('defects_found')
      expect(columns).toContain('rework_hours')
    })

    test('should have correct data types', async () => {
      const result = await pool!.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'performance_actuals'
        AND column_name IN ('entity_type', 'entity_name', 'measurement_method', 'id', 'project_id')
      `)

      const columnMap = result.rows.reduce((acc: any, row: any) => {
        acc[row.column_name] = row
        return acc
      }, {})

      expect(columnMap.id.data_type).toBe('uuid')
      expect(columnMap.project_id.data_type).toBe('uuid')
      expect(columnMap.entity_type.data_type).toBe('character varying')
      expect(columnMap.entity_type.character_maximum_length).toBe(20)
      expect(columnMap.entity_name.data_type).toBe('character varying')
      expect(columnMap.entity_name.character_maximum_length).toBe(500)
      expect(columnMap.measurement_method.data_type).toBe('character varying')
      expect(columnMap.measurement_method.character_maximum_length).toBe(20)
    })
  })

  describe('Indexes', () => {
    test('should have index on project_id', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_project_id'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('project_id')
    })

    test('should have composite index on project_id and entity_type', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_project_entity_type'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('project_id')
      expect(result.rows[0].indexdef).toContain('entity_type')
    })

    test('should have composite index on project_id and measurement_date', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_project_measurement_date'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('project_id')
      expect(result.rows[0].indexdef).toContain('measurement_date')
      expect(result.rows[0].indexdef).toContain('DESC')
    })

    test('should have composite index on entity_type and entity_id', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_entity'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('entity_type')
      expect(result.rows[0].indexdef).toContain('entity_id')
    })

    test('should have index on measurement_date DESC', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_measurement_date'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('measurement_date')
      expect(result.rows[0].indexdef).toContain('DESC')
    })

    test('should have index on entity_name', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_entity_name'
      `)
      expect(result.rows.length).toBe(1)
    })

    test('should have composite index on project_id, entity_type, and measurement_date', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_project_entity_date'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('project_id')
      expect(result.rows[0].indexdef).toContain('entity_type')
      expect(result.rows[0].indexdef).toContain('measurement_date')
    })

    test('should have partial index on measured_by', async () => {
      const result = await pool!.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'performance_actuals'
        AND indexname = 'idx_performance_actuals_measured_by'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].indexdef).toContain('measured_by')
      expect(result.rows[0].indexdef).toContain('WHERE')
    })
  })

  describe('Constraints', () => {
    test('should have CHECK constraint on entity_type', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'c'
        AND conname LIKE '%entity_type%'
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const constraint = result.rows.find((r: any) => r.definition.includes("'milestone'"))
      expect(constraint).toBeDefined()
      expect(constraint.definition).toContain('milestone')
      expect(constraint.definition).toContain('deliverable')
      expect(constraint.definition).toContain('activity')
      expect(constraint.definition).toContain('phase')
      expect(constraint.definition).toContain('resource')
    })

    test('should have CHECK constraint on measurement_method', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'c'
        AND conname LIKE '%measurement_method%'
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const constraint = result.rows.find((r: any) => r.definition.includes("'manual'"))
      expect(constraint).toBeDefined()
      expect(constraint.definition).toContain('manual')
      expect(constraint.definition).toContain('automated')
      expect(constraint.definition).toContain('extracted')
      expect(constraint.definition).toContain('reported')
    })

    test('should have CHECK constraint on progress_percent values', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'c'
        AND (conname LIKE '%progress%' OR definition LIKE '%progress%')
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const progressConstraints = result.rows.filter((r: any) => 
        r.definition.includes('progress') && r.definition.includes('BETWEEN')
      )
      expect(progressConstraints.length).toBeGreaterThan(0)
    })

    test('should have CHECK constraint on quality_score', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'c'
        AND (conname LIKE '%quality%' OR definition LIKE '%quality_score%')
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const qualityConstraint = result.rows.find((r: any) => 
        r.definition.includes('quality_score') && r.definition.includes('BETWEEN')
      )
      expect(qualityConstraint).toBeDefined()
    })

    test('should have UNIQUE constraint on project_id, entity_type, entity_id, entity_name, measurement_date', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'u'
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const uniqueConstraint = result.rows.find((r: any) => 
        r.definition.includes('project_id') &&
        r.definition.includes('entity_type') &&
        r.definition.includes('entity_id') &&
        r.definition.includes('entity_name') &&
        r.definition.includes('measurement_date')
      )
      expect(uniqueConstraint).toBeDefined()
    })
  })

  describe('Foreign Keys', () => {
    test('should have foreign key to projects table', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'f'
        AND conname LIKE '%project%'
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const fkConstraint = result.rows.find((r: any) => 
        r.definition.includes('projects') && r.definition.includes('ON DELETE CASCADE')
      )
      expect(fkConstraint).toBeDefined()
    })

    test('should have foreign key to users table for measured_by', async () => {
      const result = await pool!.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'performance_actuals'::regclass
        AND contype = 'f'
        AND conname LIKE '%measured%'
      `)
      expect(result.rows.length).toBeGreaterThan(0)
      const fkConstraint = result.rows.find((r: any) => 
        r.definition.includes('users') && r.definition.includes('measured_by')
      )
      expect(fkConstraint).toBeDefined()
    })
  })

  describe('Triggers', () => {
    test('should have trigger for updated_at column', async () => {
      const result = await pool!.query(`
        SELECT tgname, tgtype
        FROM pg_trigger
        WHERE tgrelid = 'performance_actuals'::regclass
        AND tgname = 'trg_performance_actuals_updated_at'
        AND tgisinternal = false
      `)
      expect(result.rows.length).toBe(1)
    })

    test('should have trigger for variance calculation', async () => {
      const result = await pool!.query(`
        SELECT tgname, tgtype
        FROM pg_trigger
        WHERE tgrelid = 'performance_actuals'::regclass
        AND tgname = 'trg_calculate_performance_variances'
        AND tgisinternal = false
      `)
      expect(result.rows.length).toBe(1)
    })

    test('should have variance calculation function', async () => {
      const result = await pool!.query(`
        SELECT proname, prosrc
        FROM pg_proc
        WHERE proname = 'calculate_performance_variances'
      `)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].prosrc).toContain('schedule_variance')
      expect(result.rows[0].prosrc).toContain('cost_variance')
      expect(result.rows[0].prosrc).toContain('progress_variance')
    })
  })

  describe('Variance Calculation Trigger', () => {
    test('should automatically calculate schedule variance in days', async () => {
      const plannedEnd = new Date('2024-01-15')
      const actualEnd = new Date('2024-01-20') // 5 days late
      const plannedStart = new Date('2024-01-01')

      const result = await pool!.query(`
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_name,
          planned_start_date, planned_end_date, actual_end_date,
          measurement_date, measurement_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING schedule_variance_days, schedule_variance_percent
      `, [
        testProjectId,
        'milestone',
        'Test Milestone',
        plannedStart.toISOString(),
        plannedEnd.toISOString(),
        actualEnd.toISOString(),
        new Date().toISOString(),
        'manual'
      ])

      expect(result.rows[0].schedule_variance_days).toBe(-5) // Negative = behind schedule
      expect(result.rows[0].schedule_variance_percent).toBeDefined()
      
      // Clean up
      await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
    })

    test('should automatically calculate cost variance', async () => {
      const plannedCost = 10000.00
      const actualCost = 12000.00 // Over budget

      const result = await pool!.query(`
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_name,
          planned_cost, actual_cost,
          measurement_date, measurement_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING cost_variance, cost_variance_percent
      `, [
        testProjectId,
        'activity',
        'Test Activity',
        plannedCost,
        actualCost,
        new Date().toISOString(),
        'manual'
      ])

      expect(result.rows[0].cost_variance).toBe(-2000.00) // Negative = over budget
      expect(result.rows[0].cost_variance_percent).toBe(-20.00) // 20% over budget
      
      // Clean up
      await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
    })

    test('should automatically calculate progress variance', async () => {
      const plannedProgress = 75.0
      const actualProgress = 80.0 // Ahead of plan

      const result = await pool!.query(`
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_name,
          planned_progress_percent, actual_progress_percent,
          measurement_date, measurement_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING progress_variance
      `, [
        testProjectId,
        'deliverable',
        'Test Deliverable',
        plannedProgress,
        actualProgress,
        new Date().toISOString(),
        'manual'
      ])

      expect(result.rows[0].progress_variance).toBe(5.0) // Positive = ahead
      
      // Clean up
      await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
    })

    test('should update updated_at on row update', async () => {
      const initialDate = new Date('2024-01-01')
      
      const insertResult = await pool!.query(`
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_name,
          measurement_date, measurement_method
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING created_at, updated_at
      `, [
        testProjectId,
        'milestone',
        'Test Milestone',
        initialDate.toISOString(),
        'manual'
      ])

      const initialUpdatedAt = insertResult.rows[0].updated_at

      // Wait a moment and update
      await new Promise(resolve => setTimeout(resolve, 100))

      const updateResult = await pool!.query(`
        UPDATE performance_actuals
        SET notes = 'Updated notes'
        WHERE project_id = $1 AND entity_name = $2
        RETURNING updated_at
      `, [testProjectId, 'Test Milestone'])

      expect(new Date(updateResult.rows[0].updated_at).getTime()).toBeGreaterThan(
        new Date(initialUpdatedAt).getTime()
      )
      
      // Clean up
      await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
    })
  })

  describe('Data Validation', () => {
    test('should reject invalid entity_type', async () => {
      await expect(
        pool!.query(`
          INSERT INTO performance_actuals (
            project_id, entity_type, entity_name,
            measurement_date, measurement_method
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          testProjectId,
          'invalid_type',
          'Test',
          new Date().toISOString(),
          'manual'
        ])
      ).rejects.toThrow()
    })

    test('should reject invalid measurement_method', async () => {
      await expect(
        pool!.query(`
          INSERT INTO performance_actuals (
            project_id, entity_type, entity_name,
            measurement_date, measurement_method
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          testProjectId,
          'milestone',
          'Test',
          new Date().toISOString(),
          'invalid_method'
        ])
      ).rejects.toThrow()
    })

    test('should reject progress_percent > 100', async () => {
      await expect(
        pool!.query(`
          INSERT INTO performance_actuals (
            project_id, entity_type, entity_name,
            planned_progress_percent,
            measurement_date, measurement_method
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          testProjectId,
          'milestone',
          'Test',
          150.0,
          new Date().toISOString(),
          'manual'
        ])
      ).rejects.toThrow()
    })

    test('should reject quality_score > 10', async () => {
      await expect(
        pool!.query(`
          INSERT INTO performance_actuals (
            project_id, entity_type, entity_name,
            quality_score,
            measurement_date, measurement_method
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          testProjectId,
          'milestone',
          'Test',
          15.0,
          new Date().toISOString(),
          'manual'
        ])
      ).rejects.toThrow()
    })
  })
})

