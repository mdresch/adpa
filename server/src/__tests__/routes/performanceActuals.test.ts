/**
 * Test: Performance Actuals API Routes
 * TASK-129: Integration tests for performance actuals endpoints
 * 
 * Tests:
 * - GET /api/performance-actuals/:projectId
 * - GET /api/performance-actuals/:projectId/summary
 * - POST /api/performance-actuals/:projectId
 * - Authentication and authorization
 * - Query parameters and filtering
 * - Variance calculations
 */

import express from 'express'
import request from 'supertest'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'
import performanceActualsRoutes from '../../routes/performanceActuals'
import { authenticateToken } from '../../middleware/auth'

// Mock authentication middleware to allow test users
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    // Set test user from query param or use default
    req.user = {
      id: req.query.testUserId || 'test-user-id',
      email: 'test@example.com',
      role: req.query.testUserRole || 'user',
      permissions: []
    }
    next()
  }
}))

describe('Performance Actuals API Routes', () => {
  let testProjectId: string
  let testUserId: string
  let testAdminId: string
  let app: express.Application

  beforeAll(async () => {
    // Create test users
    testUserId = uuidv4()
    testAdminId = uuidv4()

    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'test-user@example.com', 'hash', 'user', 'Test User'),
              ($2, 'test-admin@example.com', 'hash', 'admin', 'Test Admin')
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`,
      [testUserId, testAdminId]
    )

    // Create test project owned by test user
    testProjectId = uuidv4()
    await pool!.query(
      `INSERT INTO projects (id, name, created_by)
       VALUES ($1, 'Test Performance Project', $2)
       ON CONFLICT (id) DO UPDATE SET created_by = EXCLUDED.created_by`,
      [testProjectId, testUserId]
    )

    // Setup Express app with routes
    app = express()
    app.use(express.json())
    app.use('/api/performance-actuals', performanceActualsRoutes)
  })

  afterAll(async () => {
    // Clean up test data
    await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
    await pool!.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool!.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, testAdminId])
  })

  beforeEach(async () => {
    // Clean up performance actuals before each test
    await pool!.query('DELETE FROM performance_actuals WHERE project_id = $1', [testProjectId])
  })

  describe('POST /api/performance-actuals/:projectId', () => {
    test('should create a new performance actual', async () => {
      const actualData = {
        entity_type: 'milestone',
        entity_name: 'Design Phase Complete',
        planned_start_date: '2024-01-01T00:00:00Z',
        actual_start_date: '2024-01-01T00:00:00Z',
        planned_end_date: '2024-01-15T00:00:00Z',
        actual_end_date: '2024-01-20T00:00:00Z',
        planned_cost: 40000,
        actual_cost: 42800,
        planned_progress_percent: 100,
        actual_progress_percent: 100,
        quality_score: 8.5,
        measurement_date: '2024-01-20T00:00:00Z',
        notes: 'Delay caused by additional stakeholder review cycles'
      }

      const res = await request(app)
        .post(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')
        .send(actualData)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.entity_type).toBe('milestone')
      expect(res.body.data.entity_name).toBe('Design Phase Complete')
      expect(res.body.data.schedule_variance_days).toBe(-5) // 5 days behind
      expect(res.body.data.cost_variance).toBe(-2800) // Over budget
      expect(res.body.data.measurement_method).toBe('manual')
    })

    test('should calculate variances automatically', async () => {
      const actualData = {
        entity_type: 'activity',
        entity_name: 'Requirements Gathering',
        planned_cost: 25000,
        actual_cost: 23500,
        planned_progress_percent: 100,
        actual_progress_percent: 100,
        measurement_date: '2024-01-10T00:00:00Z'
      }

      const res = await request(app)
        .post(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')
        .send(actualData)

      expect(res.status).toBe(200)
      expect(res.body.data.cost_variance).toBe(1500) // Under budget
      expect(res.body.data.cost_variance_percent).toBe(6.0) // 6% under budget
      expect(res.body.data.progress_variance).toBe(0) // On track
    })

    test('should reject invalid entity_type', async () => {
      const actualData = {
        entity_type: 'invalid_type',
        entity_name: 'Test',
        measurement_date: '2024-01-01T00:00:00Z'
      }

      const res = await request(app)
        .post(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')
        .send(actualData)

      expect(res.status).toBe(400)
    })

    test('should reject progress_percent > 100', async () => {
      const actualData = {
        entity_type: 'milestone',
        entity_name: 'Test',
        planned_progress_percent: 150,
        measurement_date: '2024-01-01T00:00:00Z'
      }

      const res = await request(app)
        .post(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')
        .send(actualData)

      expect(res.status).toBe(400)
    })

    test('should reject access for non-owner user', async () => {
      const otherUserId = uuidv4()
      await pool!.query(
        `INSERT INTO users (id, email, password_hash, role, name)
         VALUES ($1, 'other@example.com', 'hash', 'user', 'Other User')
         ON CONFLICT (id) DO NOTHING`,
        [otherUserId]
      )

      const actualData = {
        entity_type: 'milestone',
        entity_name: 'Test',
        measurement_date: '2024-01-01T00:00:00Z'
      }

      const res = await request(app)
        .post(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId: otherUserId })
        .send(actualData)

      expect(res.status).toBe(403)

      await pool!.query('DELETE FROM users WHERE id = $1', [otherUserId])
    })
  })

  describe('GET /api/performance-actuals/:projectId', () => {
    beforeEach(async () => {
      // Insert test data
      await pool!.query(`
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_id, entity_name,
          planned_start_date, actual_start_date, planned_end_date, actual_end_date,
          planned_cost, actual_cost,
          planned_progress_percent, actual_progress_percent,
          quality_score, measurement_date, measurement_method, measured_by
        ) VALUES
        ($1, 'milestone', $2, 'Design Complete', 
         '2024-01-01', '2024-01-01', '2024-01-15', '2024-01-20',
         40000, 42800, 100, 100, 8.5, '2024-01-20', 'manual', $3),
        ($1, 'deliverable', $2, 'Requirements Document',
         NULL, NULL, NULL, NULL,
         25000, 23500, 100, 100, NULL, '2024-01-10', 'manual', $3),
        ($1, 'activity', $2, 'Development',
         NULL, NULL, NULL, NULL,
         80000, 76200, 75, 80, NULL, '2024-01-25', 'manual', $3)
      `, [testProjectId, uuidv4(), testUserId])
    })

    test('should return all performance actuals for project', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBe(3)
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.total).toBe(3)
    })

    test('should filter by entity_type', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}`)
        .query({ entity_type: 'milestone' })
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].entity_type).toBe('milestone')
    })

    test('should filter by date range', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}`)
        .query({
          start_date: '2024-01-15T00:00:00Z',
          end_date: '2024-01-30T00:00:00Z'
        })
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(2) // Only activities after Jan 15
    })

    test('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}`)
        .query({ limit: 2, offset: 0 })
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(2)
      expect(res.body.pagination.limit).toBe(2)
      expect(res.body.pagination.offset).toBe(0)
      expect(res.body.pagination.hasMore).toBe(true)
    })

    test('should order by measurement_date DESC', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      const dates = res.body.data.map((d: any) => new Date(d.measurement_date).getTime())
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1])
      expect(dates[1]).toBeGreaterThanOrEqual(dates[2])
    })
  })

  describe('GET /api/performance-actuals/:projectId/summary', () => {
    beforeEach(async () => {
      // Insert test data with various performance metrics
      await pool!.query(`
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_id, entity_name,
          planned_start_date, actual_start_date, planned_end_date, actual_end_date,
          planned_cost, actual_cost,
          planned_progress_percent, actual_progress_percent,
          quality_score, defects_found, rework_hours,
          measurement_date, measurement_method, measured_by
        ) VALUES
        ($1, 'milestone', $2, 'Design Complete',
         '2024-01-01', '2024-01-01', '2024-01-15', '2024-01-20',
         40000, 42800, 100, 100, 8.5, 2, 4.5, '2024-01-20', 'manual', $3),
        ($1, 'deliverable', $2, 'Requirements',
         NULL, NULL, NULL, NULL,
         25000, 23500, 100, 100, 9.0, 0, 0, '2024-01-10', 'manual', $3),
        ($1, 'activity', $2, 'Development',
         NULL, NULL, NULL, NULL,
         80000, 76200, 75, 80, 8.0, 1, 2.0, '2024-01-25', 'manual', $3)
      `, [testProjectId, uuidv4(), testUserId])
    })

    test('should calculate performance summary', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}/summary`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.total_measurements).toBe(3)
      expect(res.body.data.entity_types_count).toBe(3)
      expect(res.body.data.unique_entities_count).toBe(3)
    })

    test('should calculate schedule performance index (SPI)', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}/summary`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.schedule).toBeDefined()
      expect(res.body.data.schedule.performance_index).toBeDefined()
      expect(res.body.data.schedule.status).toBeDefined()
    })

    test('should calculate cost performance index (CPI)', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}/summary`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.cost).toBeDefined()
      expect(res.body.data.cost.performance_index).toBeDefined()
      expect(res.body.data.cost.status).toBeDefined()
      
      // Should be under budget (positive variance)
      const avgCostVariance = res.body.data.cost.avg_variance
      expect(avgCostVariance).toBeGreaterThan(0) // Under budget overall
    })

    test('should calculate quality metrics', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}/summary`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.quality).toBeDefined()
      expect(res.body.data.quality.avg_score).toBeDefined()
      expect(res.body.data.quality.total_defects).toBe(3) // 2 + 0 + 1
      expect(res.body.data.quality.total_rework_hours).toBe(6.5) // 4.5 + 0 + 2.0
    })

    test('should determine overall health', async () => {
      const res = await request(app)
        .get(`/api/performance-actuals/${testProjectId}/summary`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.overall_health).toBeDefined()
      expect(['healthy', 'at_risk', 'unhealthy', 'unknown']).toContain(
        res.body.data.overall_health
      )
    })

    test('should return empty summary for project with no actuals', async () => {
      const emptyProjectId = uuidv4()
      await pool!.query(
        `INSERT INTO projects (id, name, created_by)
         VALUES ($1, 'Empty Project', $2)`,
        [emptyProjectId, testUserId]
      )

      const res = await request(app)
        .get(`/api/performance-actuals/${emptyProjectId}/summary`)
        .set('Authorization', 'Bearer test-token')

      expect(res.status).toBe(200)
      expect(res.body.data.total_measurements).toBe(0)
      expect(res.body.data.overall_health).toBe('unknown')

      await pool!.query('DELETE FROM projects WHERE id = $1', [emptyProjectId])
    })
  })
})

