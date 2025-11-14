/**
 * Database Schema Tests for OKRs and Key Results (TASK-1281)
 * 
 * Tests the database schema for:
 * - portfolio_okrs table
 * - portfolio_key_results table
 * - Triggers and functions
 * - Views and indexes
 */

import { getDatabasePool, connectDatabase } from '../../database/connection'
import { logger } from '../../utils/logger'

describe('OKR Database Schema Tests', () => {
  let pool: any

  beforeAll(async () => {
    try {
      await connectDatabase()
      pool = getDatabasePool()
    } catch (error) {
      logger.error('Failed to connect to database:', error)
      throw error
    }
  })

  afterAll(async () => {
    if (pool) {
      await pool.end()
    }
  })

  describe('Table Structure', () => {
    test('portfolio_okrs table exists', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'portfolio_okrs'
      `)
      expect(result.rows.length).toBe(1)
    })

    test('portfolio_key_results table exists', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'portfolio_key_results'
      `)
      expect(result.rows.length).toBe(1)
    })

    test('portfolio_okrs has required columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_okrs'
        ORDER BY ordinal_position
      `)
      
      const columnNames = result.rows.map((r: any) => r.column_name)
      
      expect(columnNames).toContain('id')
      expect(columnNames).toContain('objective_title')
      expect(columnNames).toContain('level')
      expect(columnNames).toContain('okr_period')
      expect(columnNames).toContain('progress_percentage')
      expect(columnNames).toContain('confidence_level')
      expect(columnNames).toContain('status')
      expect(columnNames).toContain('created_at')
      expect(columnNames).toContain('updated_at')
    })

    test('portfolio_key_results has required columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'portfolio_key_results'
        ORDER BY ordinal_position
      `)
      
      const columnNames = result.rows.map((r: any) => r.column_name)
      
      expect(columnNames).toContain('id')
      expect(columnNames).toContain('okr_id')
      expect(columnNames).toContain('key_result_title')
      expect(columnNames).toContain('baseline_value')
      expect(columnNames).toContain('target_value')
      expect(columnNames).toContain('current_value')
      expect(columnNames).toContain('progress_percentage')
      expect(columnNames).toContain('progress_status')
      expect(columnNames).toContain('created_at')
      expect(columnNames).toContain('updated_at')
    })
  })

  describe('Constraints and Data Types', () => {
    test('portfolio_okrs level constraint allows valid values', async () => {
      const validLevels = ['organization', 'portfolio', 'program', 'project']
      
      for (const level of validLevels) {
        const result = await pool.query(`
          INSERT INTO portfolio_okrs (objective_title, level)
          VALUES ($1, $2)
          RETURNING id
        `, [`Test OKR ${level}`, level])
        
        expect(result.rows.length).toBe(1)
        
        // Clean up
        await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [result.rows[0].id])
      }
    })

    test('portfolio_okrs level constraint rejects invalid values', async () => {
      await expect(
        pool.query(`
          INSERT INTO portfolio_okrs (objective_title, level)
          VALUES ('Invalid Level Test', 'invalid')
        `)
      ).rejects.toThrow()
    })

    test('portfolio_okrs progress_percentage constraint enforces 0-100 range', async () => {
      // Test valid range
      const validResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level, progress_percentage)
        VALUES ('Valid Progress Test', 'organization', 50)
        RETURNING id
      `)
      expect(validResult.rows.length).toBe(1)
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [validResult.rows[0].id])
      
      // Test invalid values
      await expect(
        pool.query(`
          INSERT INTO portfolio_okrs (objective_title, level, progress_percentage)
          VALUES ('Invalid Progress Test', 'organization', 150)
        `)
      ).rejects.toThrow()
      
      await expect(
        pool.query(`
          INSERT INTO portfolio_okrs (objective_title, level, progress_percentage)
          VALUES ('Invalid Progress Test', 'organization', -10)
        `)
      ).rejects.toThrow()
    })

    test('portfolio_key_results progress_percentage constraint enforces 0-100 range', async () => {
      // Create a test OKR first
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for KR Constraint', 'organization')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Test valid range
      const validResult = await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id, key_result_title, target_value, progress_percentage
        )
        VALUES ($1, 'Valid Progress KR', 100, 50)
        RETURNING id
      `, [okrId])
      expect(validResult.rows.length).toBe(1)
      await pool.query('DELETE FROM portfolio_key_results WHERE id = $1', [validResult.rows[0].id])
      
      // Test invalid values
      await expect(
        pool.query(`
          INSERT INTO portfolio_key_results (
            okr_id, key_result_title, target_value, progress_percentage
          )
          VALUES ($1, 'Invalid Progress KR', 100, 150)
        `, [okrId])
      ).rejects.toThrow()
      
      // Clean up
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })
  })

  describe('Foreign Key Relationships', () => {
    test('portfolio_key_results.okr_id references portfolio_okrs.id', async () => {
      // Create a test OKR
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for FK', 'organization')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Create a Key Result referencing the OKR
      const krResult = await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id, key_result_title, target_value
        )
        VALUES ($1, 'Test Key Result', 100)
        RETURNING id
      `, [okrId])
      
      expect(krResult.rows.length).toBe(1)
      
      // Verify the relationship
      const verifyResult = await pool.query(`
        SELECT kr.id, kr.okr_id, o.objective_title
        FROM portfolio_key_results kr
        JOIN portfolio_okrs o ON kr.okr_id = o.id
        WHERE kr.id = $1
      `, [krResult.rows[0].id])
      
      expect(verifyResult.rows.length).toBe(1)
      expect(verifyResult.rows[0].okr_id).toBe(okrId)
      
      // Clean up
      await pool.query('DELETE FROM portfolio_key_results WHERE id = $1', [krResult.rows[0].id])
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })

    test('portfolio_key_results cascade deletes when OKR is deleted', async () => {
      // Create a test OKR
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for Cascade Delete', 'organization')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Create Key Results
      const krResult1 = await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id, key_result_title, target_value
        )
        VALUES ($1, 'KR 1', 100)
        RETURNING id
      `, [okrId])
      
      const krResult2 = await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id, key_result_title, target_value
        )
        VALUES ($1, 'KR 2', 200)
        RETURNING id
      `, [okrId])
      
      // Delete the OKR
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
      
      // Verify Key Results were cascade deleted
      const verifyKR1 = await pool.query(
        'SELECT id FROM portfolio_key_results WHERE id = $1',
        [krResult1.rows[0].id]
      )
      const verifyKR2 = await pool.query(
        'SELECT id FROM portfolio_key_results WHERE id = $1',
        [krResult2.rows[0].id]
      )
      
      expect(verifyKR1.rows.length).toBe(0)
      expect(verifyKR2.rows.length).toBe(0)
    })
  })

  describe('Triggers and Functions', () => {
    test('calculate_kr_progress trigger auto-calculates progress percentage', async () => {
      // Create a test OKR
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for Progress Calculation', 'organization')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Insert Key Result with values that should result in 50% progress
      const krResult = await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id,
          key_result_title,
          baseline_value,
          target_value,
          current_value
        )
        VALUES ($1, 'Test KR', 0, 100, 50)
        RETURNING id, progress_percentage, progress_status
      `, [okrId])
      
      const kr = krResult.rows[0]
      
      // Verify progress was calculated (should be 50%)
      expect(parseFloat(kr.progress_percentage)).toBeCloseTo(50, 1)
      expect(kr.progress_status).toBe('at-risk') // 50% is in the at-risk range (40-70)
      
      // Clean up
      await pool.query('DELETE FROM portfolio_key_results WHERE id = $1', [kr.id])
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })

    test('calculate_kr_progress trigger sets status correctly', async () => {
      // Create a test OKR
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for Status Calculation', 'organization')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Test different progress levels
      const testCases = [
        { current: 100, expectedStatus: 'achieved' }, // 100% = achieved
        { current: 80, expectedStatus: 'on-track' },  // 80% = on-track (>=70)
        { current: 50, expectedStatus: 'at-risk' },   // 50% = at-risk (40-70)
        { current: 20, expectedStatus: 'behind' },    // 20% = behind (<40)
      ]
      
      for (const testCase of testCases) {
        const krResult = await pool.query(`
          INSERT INTO portfolio_key_results (
            okr_id,
            key_result_title,
            baseline_value,
            target_value,
            current_value
          )
          VALUES ($1, 'Test KR', 0, 100, $2)
          RETURNING id, progress_percentage, progress_status
        `, [okrId, testCase.current])
        
        const kr = krResult.rows[0]
        expect(kr.progress_status).toBe(testCase.expectedStatus)
        
        // Clean up
        await pool.query('DELETE FROM portfolio_key_results WHERE id = $1', [kr.id])
      }
      
      // Clean up OKR
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })

    test('update_updated_at_column trigger updates timestamp', async () => {
      // Create a test OKR
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for Updated At', 'organization')
        RETURNING id, created_at, updated_at
      `)
      const okrId = okrResult.rows[0].id
      const initialUpdatedAt = okrResult.rows[0].updated_at
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Update the OKR
      await pool.query(`
        UPDATE portfolio_okrs
        SET objective_title = 'Updated Test OKR'
        WHERE id = $1
      `, [okrId])
      
      // Verify updated_at changed
      const verifyResult = await pool.query(`
        SELECT updated_at FROM portfolio_okrs WHERE id = $1
      `, [okrId])
      
      expect(new Date(verifyResult.rows[0].updated_at).getTime()).toBeGreaterThan(
        new Date(initialUpdatedAt).getTime()
      )
      
      // Clean up
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })
  })

  describe('Indexes', () => {
    test('portfolio_okrs has required indexes', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'portfolio_okrs'
      `)
      
      const indexNames = result.rows.map((r: any) => r.indexname)
      
      expect(indexNames.some((name: string) => name.includes('level'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('status'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('created_at'))).toBe(true)
    })

    test('portfolio_key_results has required indexes', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'portfolio_key_results'
      `)
      
      const indexNames = result.rows.map((r: any) => r.indexname)
      
      expect(indexNames.some((name: string) => name.includes('okr'))).toBe(true)
      expect(indexNames.some((name: string) => name.includes('status'))).toBe(true)
    })
  })

  describe('Views', () => {
    test('portfolio_okr_summary view exists', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'portfolio_okr_summary'
      `)
      expect(result.rows.length).toBe(1)
    })

    test('portfolio_okr_summary view returns correct structure', async () => {
      // Create a test OKR with Key Results
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level, okr_period)
        VALUES ('Test OKR for Summary View', 'organization', 'Q1-2026')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Create Key Results
      await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id, key_result_title, baseline_value, target_value, current_value
        )
        VALUES
        ($1, 'KR 1', 0, 100, 50),
        ($1, 'KR 2', 0, 100, 80),
        ($1, 'KR 3', 0, 100, 100)
      `, [okrId])
      
      // Query the summary view
      const summaryResult = await pool.query(`
        SELECT *
        FROM portfolio_okr_summary
        WHERE okr_id = $1
      `, [okrId])
      
      expect(summaryResult.rows.length).toBe(1)
      const summary = summaryResult.rows[0]
      
      expect(summary.key_result_count).toBe(3)
      expect(summary.achieved_kr_count).toBe(1)
      expect(summary.on_track_kr_count).toBe(1)
      expect(summary.at_risk_kr_count).toBe(1)
      expect(summary.behind_kr_count).toBe(0)
      
      // Clean up
      await pool.query('DELETE FROM portfolio_key_results WHERE okr_id = $1', [okrId])
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })
  })

  describe('Functions', () => {
    test('calculate_okr_progress function exists and works', async () => {
      // Create a test OKR
      const okrResult = await pool.query(`
        INSERT INTO portfolio_okrs (objective_title, level)
        VALUES ('Test OKR for Function', 'organization')
        RETURNING id
      `)
      const okrId = okrResult.rows[0].id
      
      // Create Key Results with different progress levels
      await pool.query(`
        INSERT INTO portfolio_key_results (
          okr_id, key_result_title, baseline_value, target_value, current_value
        )
        VALUES
        ($1, 'KR 1', 0, 100, 50),
        ($1, 'KR 2', 0, 100, 75),
        ($1, 'KR 3', 0, 100, 100)
      `, [okrId])
      
      // Call the function
      const functionResult = await pool.query(`
        SELECT calculate_okr_progress($1) as avg_progress
      `, [okrId])
      
      const avgProgress = parseFloat(functionResult.rows[0].avg_progress)
      
      // Should be average of 50, 75, 100 = 75
      expect(avgProgress).toBeCloseTo(75, 1)
      
      // Clean up
      await pool.query('DELETE FROM portfolio_key_results WHERE okr_id = $1', [okrId])
      await pool.query('DELETE FROM portfolio_okrs WHERE id = $1', [okrId])
    })
  })
})

