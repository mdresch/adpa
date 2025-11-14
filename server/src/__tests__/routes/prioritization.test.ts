/**
 * Test: Prioritization API Routes
 * TASK-328: Integration tests for prioritization endpoints
 * 
 * Tests:
 * - Criteria CRUD operations
 * - Score creation and updates
 * - Rankings retrieval
 * - Authentication and authorization
 * - Validation
 */

import express from 'express'
import request from 'supertest'
import { pool } from '../../database/connection'
import { v4 as uuidv4 } from 'uuid'
import prioritizationRoutes from '../../routes/prioritizationRoutes'

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      id: req.query.testUserId || 'test-user-id',
      email: 'test@example.com',
      role: req.query.testUserRole || 'user',
      permissions: req.query.testUserPermissions ? JSON.parse(req.query.testUserPermissions) : []
    }
    next()
  },
  requirePermission: (permission: string) => {
    return (req: any, res: any, next: any) => {
      const userPermissions = req.query.testUserPermissions 
        ? JSON.parse(req.query.testUserPermissions) 
        : []
      
      if (req.user.role === 'admin' || userPermissions.includes(permission)) {
        next()
      } else {
        res.status(403).json({ error: 'Forbidden' })
      }
    }
  }
}))

describe('Prioritization API Routes', () => {
  let testProjectId: string
  let testProgramId: string
  let testUserId: string
  let testAdminId: string
  let testCriteriaId: string
  let defaultCriteriaIds: string[] = []
  let app: express.Application

  beforeAll(async () => {
    // Create test users
    testUserId = uuidv4()
    testAdminId = uuidv4()

    await pool!.query(
      `INSERT INTO users (id, email, password_hash, role, name)
       VALUES ($1, 'test-prioritization-user@example.com', 'hash', 'user', 'Test User'),
              ($2, 'test-prioritization-admin@example.com', 'hash', 'admin', 'Test Admin')
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`,
      [testUserId, testAdminId]
    )

    // Create test program
    testProgramId = uuidv4()
    await pool!.query(
      `INSERT INTO programs (id, name, owner_id, start_date, end_date)
       VALUES ($1, 'Test Prioritization Program', $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
       ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id`,
      [testProgramId, testUserId]
    )

    // Create test project
    testProjectId = uuidv4()
    await pool!.query(
      `INSERT INTO projects (id, name, program_id, created_by)
       VALUES ($1, 'Test Prioritization Project', $2, $3)
       ON CONFLICT (id) DO UPDATE SET program_id = EXCLUDED.program_id`,
      [testProjectId, testProgramId, testUserId]
    )

    // Get default criteria IDs
    const criteriaResult = await pool!.query(
      `SELECT id FROM prioritization_criteria WHERE is_active = TRUE ORDER BY sort_order LIMIT 5`
    )
    defaultCriteriaIds = criteriaResult.rows.map((r: any) => r.id)

    // Setup Express app
    app = express()
    app.use(express.json())
    app.use('/api/prioritization', prioritizationRoutes)
  })

  afterAll(async () => {
    // Clean up test data
    await pool!.query('DELETE FROM project_priority_scores WHERE project_id = $1', [testProjectId])
    await pool!.query('DELETE FROM prioritization_criteria WHERE id = $1', [testCriteriaId])
    await pool!.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool!.query('DELETE FROM programs WHERE id = $1', [testProgramId])
    await pool!.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, testAdminId])
  })

  beforeEach(async () => {
    // Clean up scores before each test
    await pool!.query('DELETE FROM project_priority_scores WHERE project_id = $1', [testProjectId])
  })

  // ============================================================================
  // CRITERIA TESTS
  // ============================================================================

  describe('GET /api/prioritization/criteria', () => {
    test('should list all criteria', async () => {
      const res = await request(app)
        .get('/api/prioritization/criteria')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(res.body.data.length).toBeGreaterThanOrEqual(5) // Default 5 criteria
      expect(res.body.count).toBe(res.body.data.length)
    })

    test('should filter by is_active', async () => {
      const res = await request(app)
        .get('/api/prioritization/criteria')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, is_active: 'true' })

      expect(res.status).toBe(200)
      expect(res.body.data.every((c: any) => c.is_active === true)).toBe(true)
    })
  })

  describe('GET /api/prioritization/criteria/:id', () => {
    test('should get a single criterion', async () => {
      if (defaultCriteriaIds.length === 0) {
        return // Skip if no default criteria
      }

      const res = await request(app)
        .get(`/api/prioritization/criteria/${defaultCriteriaIds[0]}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe(defaultCriteriaIds[0])
      expect(res.body.data.name).toBeDefined()
      expect(res.body.data.weight).toBeDefined()
    })

    test('should return 404 for non-existent criterion', async () => {
      const fakeId = uuidv4()
      const res = await request(app)
        .get(`/api/prioritization/criteria/${fakeId}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Criterion not found')
    })
  })

  describe('POST /api/prioritization/criteria', () => {
    test('should create a new criterion', async () => {
      const criterionData = {
        name: 'Test Criterion',
        weight: 10.0,
        description: 'Test description',
        scale_min: 1,
        scale_max: 5,
        is_inverted: false,
        sort_order: 10
      }

      const res = await request(app)
        .post('/api/prioritization/criteria')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.manage']) })
        .send(criterionData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe(criterionData.name)
      expect(res.body.data.weight).toBe(criterionData.weight)
      
      testCriteriaId = res.body.data.id
    })

    test('should require prioritization.manage permission', async () => {
      const criterionData = {
        name: 'Unauthorized Criterion',
        weight: 10.0
      }

      const res = await request(app)
        .post('/api/prioritization/criteria')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify([]) })
        .send(criterionData)

      expect(res.status).toBe(403)
    })

    test('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/prioritization/criteria')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.manage']) })
        .send({}) // Missing required fields

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    })
  })

  describe('PUT /api/prioritization/criteria/:id', () => {
    test('should update a criterion', async () => {
      if (!testCriteriaId) {
        return // Skip if no test criterion created
      }

      const updateData = {
        name: 'Updated Test Criterion',
        weight: 15.0
      }

      const res = await request(app)
        .put(`/api/prioritization/criteria/${testCriteriaId}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.manage']) })
        .send(updateData)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe(updateData.name)
      expect(res.body.data.weight).toBe(updateData.weight)
    })
  })

  describe('DELETE /api/prioritization/criteria/:id', () => {
    test('should delete a criterion without scores', async () => {
      // Create a criterion to delete
      const createRes = await request(app)
        .post('/api/prioritization/criteria')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId: testAdminId, testUserPermissions: JSON.stringify(['prioritization.manage']) })
        .send({
          name: 'Criterion to Delete',
          weight: 5.0
        })

      const criterionId = createRes.body.data.id

      const res = await request(app)
        .delete(`/api/prioritization/criteria/${criterionId}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId: testAdminId, testUserPermissions: JSON.stringify(['prioritization.manage']) })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    test('should prevent deletion of criterion with scores', async () => {
      if (defaultCriteriaIds.length === 0) {
        return
      }

      // Create a score first
      await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          project_id: testProjectId,
          criteria_id: defaultCriteriaIds[0],
          raw_score: 4
        })

      // Try to delete the criterion
      const res = await request(app)
        .delete(`/api/prioritization/criteria/${defaultCriteriaIds[0]}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId: testAdminId, testUserPermissions: JSON.stringify(['prioritization.manage']) })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Cannot delete criterion')
    })
  })

  // ============================================================================
  // SCORE TESTS
  // ============================================================================

  describe('GET /api/prioritization/projects/:projectId/scores', () => {
    test('should get project scores', async () => {
      const res = await request(app)
        .get(`/api/prioritization/projects/${testProjectId}/scores`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeInstanceOf(Array)
    })

    test('should return empty array for project with no scores', async () => {
      const res = await request(app)
        .get(`/api/prioritization/projects/${testProjectId}/scores`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
    })
  })

  describe('POST /api/prioritization/scores', () => {
    test('should create a new score', async () => {
      if (defaultCriteriaIds.length === 0) {
        return
      }

      const scoreData = {
        project_id: testProjectId,
        criteria_id: defaultCriteriaIds[0],
        raw_score: 4,
        justification: 'Test justification'
      }

      const res = await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send(scoreData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.raw_score).toBe(scoreData.raw_score)
      expect(res.body.data.weighted_score).toBeDefined()
      expect(res.body.data.justification).toBe(scoreData.justification)
    })

    test('should upsert existing score', async () => {
      if (defaultCriteriaIds.length === 0) {
        return
      }

      // Create initial score
      await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          project_id: testProjectId,
          criteria_id: defaultCriteriaIds[0],
          raw_score: 3
        })

      // Update with same project/criteria
      const res = await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          project_id: testProjectId,
          criteria_id: defaultCriteriaIds[0],
          raw_score: 5
        })

      expect(res.status).toBe(201)
      expect(res.body.data.raw_score).toBe(5) // Updated score
    })

    test('should reject invalid score range', async () => {
      if (defaultCriteriaIds.length === 0) {
        return
      }

      const res = await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          project_id: testProjectId,
          criteria_id: defaultCriteriaIds[0],
          raw_score: 10 // Invalid: > 5
        })

      expect(res.status).toBe(400)
    })

    test('should reject non-existent project', async () => {
      if (defaultCriteriaIds.length === 0) {
        return
      }

      const fakeProjectId = uuidv4()
      const res = await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          project_id: fakeProjectId,
          criteria_id: defaultCriteriaIds[0],
          raw_score: 4
        })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Project not found')
    })
  })

  describe('PUT /api/prioritization/scores/:id', () => {
    test('should update a score', async () => {
      if (defaultCriteriaIds.length === 0) {
        return
      }

      // Create score first
      const createRes = await request(app)
        .post('/api/prioritization/scores')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          project_id: testProjectId,
          criteria_id: defaultCriteriaIds[0],
          raw_score: 3
        })

      const scoreId = createRes.body.data.id

      // Update score
      const res = await request(app)
        .put(`/api/prioritization/scores/${scoreId}`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
        .send({
          raw_score: 5,
          justification: 'Updated justification'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.raw_score).toBe(5)
      expect(res.body.data.justification).toBe('Updated justification')
    })
  })

  // ============================================================================
  // RANKING TESTS
  // ============================================================================

  describe('GET /api/prioritization/rankings', () => {
    test('should get all rankings', async () => {
      const res = await request(app)
        .get('/api/prioritization/rankings')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.total).toBeDefined()
    })

    test('should filter by program_id', async () => {
      const res = await request(app)
        .get('/api/prioritization/rankings')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, program_id: testProgramId })

      expect(res.status).toBe(200)
      expect(res.body.data.every((r: any) => r.program_id === testProgramId || r.program_id === null)).toBe(true)
    })

    test('should support pagination', async () => {
      const res = await request(app)
        .get('/api/prioritization/rankings')
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId, limit: 5, offset: 0 })

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('GET /api/prioritization/projects/:projectId/ranking', () => {
    test('should get project ranking', async () => {
      // Create some scores first
      if (defaultCriteriaIds.length > 0) {
        for (const criteriaId of defaultCriteriaIds.slice(0, 3)) {
          await request(app)
            .post('/api/prioritization/scores')
            .set('Authorization', 'Bearer test-token')
            .query({ testUserId, testUserPermissions: JSON.stringify(['prioritization.score']) })
            .send({
              project_id: testProjectId,
              criteria_id: criteriaId,
              raw_score: 4
            })
        }
      }

      const res = await request(app)
        .get(`/api/prioritization/projects/${testProjectId}/ranking`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.project_id).toBe(testProjectId)
      expect(res.body.data.total_score).toBeDefined()
      expect(res.body.data.rank).toBeDefined()
      expect(res.body.data.priority_tier).toBeDefined()
    })

    test('should return 404 for project with no ranking', async () => {
      const fakeProjectId = uuidv4()
      const res = await request(app)
        .get(`/api/prioritization/projects/${fakeProjectId}/ranking`)
        .set('Authorization', 'Bearer test-token')
        .query({ testUserId })

      expect(res.status).toBe(404)
    })
  })
})

