import request from 'supertest'
import express from 'express'
import contextRoutes from '../../../routes/contextRoutes'
import { authenticateToken, requirePermission } from '../../../middleware/auth'

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      permissions: ['contexts.read', 'confluence.read', 'jira.read', 'contexts.refresh']
    }
    next()
  },
  requirePermission: (permission: string) => (req: any, res: any, next: any) => {
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}))

// Mock adapters
jest.mock('../../../contexts/providerRegistry', () => ({
  getProviderAdapter: (provider: string) => {
    if (provider === 'confluence') {
      return {
        search: jest.fn().mockResolvedValue([
          {
            id: '123',
            provider: 'confluence',
            title: 'Test Page',
            summary: 'Test content',
            url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/123',
            fetched_at: new Date().toISOString()
          }
        ]),
        fetchById: jest.fn().mockResolvedValue({
          id: '123',
          provider: 'confluence',
          title: 'Test Page',
          summary: 'Test content',
          url: 'https://test.atlassian.net/wiki/spaces/TEST/pages/123',
          fetched_at: new Date().toISOString()
        })
      }
    }
    if (provider === 'jira') {
      return {
        search: jest.fn().mockResolvedValue([
          {
            id: 'TEST-123',
            provider: 'jira',
            title: 'Test Issue',
            summary: 'Issue description',
            url: 'https://test.atlassian.net/browse/TEST-123',
            fetched_at: new Date().toISOString()
          }
        ]),
        fetchById: jest.fn().mockResolvedValue({
          id: 'TEST-123',
          provider: 'jira',
          title: 'Test Issue',
          summary: 'Issue description',
          url: 'https://test.atlassian.net/browse/TEST-123',
          fetched_at: new Date().toISOString()
        })
      }
    }
    throw new Error('Unknown provider')
  }
}))

// Mock AuditService
jest.mock('../../../services/auditService', () => ({
  AuditService: {
    log: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('Context Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/contexts', contextRoutes)
  })

  describe('GET /api/contexts', () => {
    it('should search contexts with valid parameters', async () => {
      const response = await request(app)
        .get('/api/contexts')
        .query({ provider: 'confluence', query: 'test' })
        .expect(200)

      expect(response.body).toHaveProperty('results')
      expect(response.body.results).toHaveLength(1)
      expect(response.body.results[0].provider).toBe('confluence')
    })

    it('should require contexts.read permission', async () => {
      // Mock user without permission
      const originalAuth = require('../../../middleware/auth').authenticateToken
      jest.spyOn(require('../../../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'test-user-id',
          permissions: [] // No permissions
        }
        next()
      })

      await request(app)
        .get('/api/contexts')
        .query({ provider: 'confluence', query: 'test' })
        .expect(403)

      // Restore
      jest.spyOn(require('../../../middleware/auth'), 'authenticateToken').mockImplementation(originalAuth)
    })

    it('should require provider-specific permission', async () => {
      // Mock user without confluence.read
      jest.spyOn(require('../../../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'test-user-id',
          permissions: ['contexts.read'] // Missing confluence.read
        }
        next()
      })

      await request(app)
        .get('/api/contexts')
        .query({ provider: 'confluence', query: 'test' })
        .expect(403)
    })

    it('should allow fresh=true with contexts.refresh permission', async () => {
      const response = await request(app)
        .get('/api/contexts')
        .query({ provider: 'confluence', query: 'test', fresh: 'true' })
        .expect(200)

      expect(response.body.results).toBeDefined()
    })

    it('should reject fresh=true without contexts.refresh permission', async () => {
      jest.spyOn(require('../../../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
        req.user = {
          id: 'test-user-id',
          permissions: ['contexts.read', 'confluence.read'] // Missing contexts.refresh
        }
        next()
      })

      await request(app)
        .get('/api/contexts')
        .query({ provider: 'confluence', query: 'test', fresh: 'true' })
        .expect(403)
    })
  })

  describe('GET /api/contexts/:provider/:id', () => {
    it('should fetch context by ID', async () => {
      const response = await request(app)
        .get('/api/contexts/confluence/123')
        .expect(200)

      expect(response.body).toHaveProperty('item')
      expect(response.body.item.id).toBe('123')
      expect(response.body.item.provider).toBe('confluence')
    })

    it('should return 404 for non-existent resource', async () => {
      const { getProviderAdapter } = require('../../../contexts/providerRegistry')
      const adapter = getProviderAdapter('confluence')
      adapter.fetchById = jest.fn().mockResolvedValue(null)

      await request(app)
        .get('/api/contexts/confluence/nonexistent')
        .expect(404)
    })

    it('should reject invalid provider', async () => {
      await request(app)
        .get('/api/contexts/invalid/123')
        .expect(400)
    })
  })
})

