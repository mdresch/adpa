import express from 'express'
import request from 'supertest'

// We will stub authentication to allow the tests through
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'tester@example.com', role: 'user', permissions: [] }
    next()
  }
}))

// Mock core service that provides recommendations logic
jest.mock('../../../services/knowledgeBaseService', () => ({
  knowledgeBaseService: {
    getRecommendationsForProject: jest.fn()
  }
}))

import knowledgeBaseRoutes from '../routes'
import { knowledgeBaseService as coreService } from '../../../services/knowledgeBaseService'

describe('Knowledge Base recommendations route (modules)', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use(express.json())
    app.use('/api/knowledge-base', knowledgeBaseRoutes)
  })

  beforeEach(() => {
    ;(coreService.getRecommendationsForProject as jest.Mock).mockReset()
  })

  test('GET /api/knowledge-base/recommendations/:projectId returns recommendations', async () => {
    const fakeRecs = [{ knowledge_entry_id: 'kb-1', relevance_score: 0.9 }]
    ;(coreService.getRecommendationsForProject as jest.Mock).mockResolvedValueOnce(fakeRecs)

    const res = await request(app)
      .get('/api/knowledge-base/recommendations/proj-123')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBe(1)
    expect(coreService.getRecommendationsForProject).toHaveBeenCalledWith('proj-123', 10)
  })

  test('GET /api/knowledge-base/recommendations/:projectId returns 404 for missing project', async () => {
    ;(coreService.getRecommendationsForProject as jest.Mock).mockRejectedValueOnce(new Error('Project not found: proj-no'))

    const res = await request(app)
      .get('/api/knowledge-base/recommendations/proj-no')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Project not found')
    expect(coreService.getRecommendationsForProject).toHaveBeenCalledWith('proj-no', 10)
  })

  test('GET /api/knowledge-base/recommendations/:projectId returns dev sample when project missing in development', async () => {
      // Temporarily set NODE_ENV to development and ensure cleanup in a finally block
      const originalEnv = process.env.NODE_ENV
      try {
        process.env.NODE_ENV = 'development'

        ;(coreService.getRecommendationsForProject as jest.Mock).mockRejectedValueOnce(new Error('Project not found: anything'))

        const res = await request(app)
          .get('/api/knowledge-base/recommendations/missing-proj')
          .set('Authorization', 'Bearer test-token')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(Array.isArray(res.body.data)).toBe(true)
      } finally {
        // Restore NODE_ENV even if the test throws
        process.env.NODE_ENV = originalEnv
      }
  })
})
