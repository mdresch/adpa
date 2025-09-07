/**
 * Document Templates Routes Integration Tests
 */

import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import documentTemplateRoutes from '../routes'
import { documentTemplateService } from '../service'
import { pool } from '../../../database/connection'

// Mock dependencies
jest.mock('../service')
jest.mock('../../../database/connection')
jest.mock('../../../utils/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }
}))
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

const mockService = documentTemplateService as jest.Mocked<typeof documentTemplateService>
const mockPool = pool as jest.Mocked<typeof pool>

describe('Document Templates Routes', () => {
  let app: express.Application
  let authToken: string

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/document-templates', documentTemplateRoutes)

    // Create a valid JWT token for testing
    authToken = jwt.sign(
      { userId: 'user-123' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    // Mock user lookup for authentication
    mockPool.query.mockResolvedValue({
      rows: [{
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        permissions: {
          'templates.create': true,
          'templates.update': true,
          'templates.delete': true,
          'templates.view': true
        },
        is_active: true
      }]
    } as any)

    jest.clearAllMocks()
  })

  describe('GET /api/document-templates', () => {
    it('should return templates with valid authentication', async () => {
      const mockResult = {
        templates: [
          {
            id: 'template-1',
            name: 'Test Template',
            framework: 'TOGAF',
            content: {},
            variables: [],
            is_public: true,
            created_by: 'user-123',
            usage_count: 0,
            created_at: new Date(),
            updated_at: new Date()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      }

      mockService.getTemplates.mockResolvedValue(mockResult)

      const response = await request(app)
        .get('/api/document-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockResult)
      expect(mockService.getTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        expect.objectContaining({ id: 'user-123' })
      )
    })

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/document-templates')
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe('Access token required')
        })
    })

    it('should apply query filters', async () => {
      mockService.getTemplates.mockResolvedValue({
        templates: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      })

      await request(app)
        .get('/api/document-templates')
        .query({
          page: 2,
          limit: 5,
          framework: 'TOGAF',
          category: 'Architecture',
          search: 'test',
          is_public: 'true'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(mockService.getTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
          framework: 'TOGAF',
          category: 'Architecture',
          search: 'test',
          is_public: true
        }),
        expect.any(Object)
      )
    })
  })

  describe('GET /api/document-templates/:id', () => {
    it('should return template by ID', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        framework: 'TOGAF',
        content: {},
        variables: [],
        is_public: true,
        created_by: 'user-123',
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockService.getTemplateById.mockResolvedValue(mockTemplate)

      const response = await request(app)
        .get('/api/document-templates/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({ template: mockTemplate })
    })

    it('should return 404 for non-existent template', async () => {
      mockService.getTemplateById.mockResolvedValue(null)

      await request(app)
        .get('/api/document-templates/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe('Template not found')
        })
    })

    it('should return 400 for invalid UUID', async () => {
      await request(app)
        .get('/api/document-templates/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })
  })

  describe('POST /api/document-templates', () => {
    it('should create a new template', async () => {
      const createData = {
        name: 'New Template',
        description: 'Test description',
        framework: 'TOGAF',
        category: 'Architecture',
        content: { sections: [] },
        variables: [],
        is_public: false
      }

      const mockCreatedTemplate = {
        id: 'template-1',
        ...createData,
        created_by: 'user-123',
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockService.createTemplate.mockResolvedValue(mockCreatedTemplate)

      const response = await request(app)
        .post('/api/document-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createData)
        .expect(201)

      expect(response.body).toEqual({
        message: 'Template created successfully',
        template: mockCreatedTemplate
      })
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: 'A', // Too short
        framework: 'INVALID', // Invalid framework
        // Missing required content field
      }

      await request(app)
        .post('/api/document-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })
  })

  describe('PUT /api/document-templates/:id', () => {
    it('should update an existing template', async () => {
      const updateData = {
        name: 'Updated Template',
        description: 'Updated description'
      }

      const mockUpdatedTemplate = {
        id: 'template-1',
        name: 'Updated Template',
        description: 'Updated description',
        framework: 'TOGAF',
        content: {},
        variables: [],
        is_public: false,
        created_by: 'user-123',
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockService.updateTemplate.mockResolvedValue(mockUpdatedTemplate)

      const response = await request(app)
        .put('/api/document-templates/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Template updated successfully',
        template: mockUpdatedTemplate
      })
    })

    it('should return 404 for non-existent template', async () => {
      mockService.updateTemplate.mockResolvedValue(null)

      await request(app)
        .put('/api/document-templates/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404)
    })
  })

  describe('DELETE /api/document-templates/:id', () => {
    it('should delete a template', async () => {
      mockService.deleteTemplate.mockResolvedValue(true)

      await request(app)
        .delete('/api/document-templates/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Template deleted successfully')
        })
    })

    it('should return 404 for non-existent template', async () => {
      mockService.deleteTemplate.mockResolvedValue(false)

      await request(app)
        .delete('/api/document-templates/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('POST /api/document-templates/:id/clone', () => {
    it('should clone a template', async () => {
      const cloneData = {
        name: 'Cloned Template',
        description: 'Cloned description',
        is_public: false
      }

      const mockClonedTemplate = {
        id: 'template-2',
        name: 'Cloned Template',
        description: 'Cloned description',
        framework: 'TOGAF',
        content: {},
        variables: [],
        is_public: false,
        created_by: 'user-123',
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockService.cloneTemplate.mockResolvedValue(mockClonedTemplate)

      const response = await request(app)
        .post('/api/document-templates/550e8400-e29b-41d4-a716-446655440000/clone')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cloneData)
        .expect(201)

      expect(response.body).toEqual({
        message: 'Template cloned successfully',
        template: mockClonedTemplate
      })
    })
  })

  describe('POST /api/document-templates/:id/use', () => {
    it('should record template usage', async () => {
      mockService.recordTemplateUsage.mockResolvedValue(6)

      const response = await request(app)
        .post('/api/document-templates/550e8400-e29b-41d4-a716-446655440000/use')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Template usage recorded',
        usage_count: 6
      })
    })
  })

  describe('GET /api/document-templates/trash', () => {
    it('should return deleted templates', async () => {
      const mockResult = {
        templates: [
          {
            id: 'template-1',
            name: 'Deleted Template',
            deleted_at: new Date(),
            deleted_by: 'user-123'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      }

      mockService.getDeletedTemplates.mockResolvedValue(mockResult)

      const response = await request(app)
        .get('/api/document-templates/trash')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual(mockResult)
    })
  })

  describe('POST /api/document-templates/:id/restore', () => {
    it('should restore a deleted template', async () => {
      const mockRestoredTemplate = {
        id: 'template-1',
        name: 'Restored Template',
        deleted_at: null,
        deleted_by: null
      }

      mockService.restoreTemplate.mockResolvedValue(mockRestoredTemplate)

      const response = await request(app)
        .post('/api/document-templates/550e8400-e29b-41d4-a716-446655440000/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Template restored successfully',
        template: mockRestoredTemplate
      })
    })
  })

  describe('DELETE /api/document-templates/:id/permanent', () => {
    it('should permanently delete a template', async () => {
      mockService.permanentlyDeleteTemplate.mockResolvedValue(true)

      await request(app)
        .delete('/api/document-templates/550e8400-e29b-41d4-a716-446655440000/permanent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Template permanently deleted')
        })
    })
  })
})