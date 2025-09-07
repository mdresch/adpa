/**
 * Document Generator Integration Tests
 */

import request from 'supertest'
import { app } from '../../../server'
import { OutputFormat } from '../types'

// Mock dependencies
jest.mock('../../../database/connection')
jest.mock('../../../utils/redis')
jest.mock('../../../utils/logger')
jest.mock('../../documentTemplates/service')
jest.mock('puppeteer')
jest.mock('fs/promises')

describe('Document Generator Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    permissions: {}
  }

  // Mock authentication middleware
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth middleware to inject user
    const authMiddleware = require('../../../middleware/auth').authMiddleware
    authMiddleware.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser
      next()
    })
  })

  describe('GET /api/document-generator/formats', () => {
    it('should return supported formats', async () => {
      const response = await request(app)
        .get('/api/document-generator/formats')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.formats).toHaveLength(4)
      expect(response.body.data.formats.map((f: any) => f.value)).toEqual(
        expect.arrayContaining([
          OutputFormat.MARKDOWN,
          OutputFormat.PDF,
          OutputFormat.DOCX,
          OutputFormat.HTML
        ])
      )
    })
  })

  describe('POST /api/document-generator/generate', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/document-generator/generate')
        .send({})
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'template_id' }),
          expect.objectContaining({ field: 'output_format' })
        ])
      )
    })

    it('should validate output format', async () => {
      const response = await request(app)
        .post('/api/document-generator/generate')
        .send({
          template_id: 'template-123',
          output_format: 'invalid'
        })
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            field: 'output_format',
            message: expect.stringContaining('must be one of')
          })
        ])
      )
    })

    it('should accept valid generation request', async () => {
      // Mock the document generator service
      const { documentGeneratorService } = require('../service')
      documentGeneratorService.generateDocument = jest.fn().mockResolvedValue({
        id: 'gen-123',
        status: 'completed',
        output_format: OutputFormat.MARKDOWN,
        file_path: '/path/to/document.md',
        file_url: '/api/document-generator/download/document.md',
        file_size: 1024,
        metadata: {
          template_name: 'Test Template',
          generated_by: mockUser.id,
          generation_time_ms: 1000,
          variables_used: ['title']
        },
        created_at: new Date(),
        completed_at: new Date()
      })

      const response = await request(app)
        .post('/api/document-generator/generate')
        .send({
          template_id: 'template-123',
          data: { title: 'Test Document' },
          output_format: OutputFormat.MARKDOWN
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe('gen-123')
      expect(response.body.data.status).toBe('completed')
    })
  })

  describe('GET /api/document-generator/generation/:id/status', () => {
    it('should validate generation ID format', async () => {
      const response = await request(app)
        .get('/api/document-generator/generation/invalid-id/status')
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            field: 'id',
            message: expect.stringContaining('valid UUID')
          })
        ])
      )
    })

    it('should return generation status', async () => {
      const mockStatus = {
        id: 'gen-123',
        status: 'completed',
        progress: 100,
        created_at: new Date()
      }

      const { documentGeneratorService } = require('../service')
      documentGeneratorService.getGenerationStatus = jest.fn().mockResolvedValue(mockStatus)

      const response = await request(app)
        .get('/api/document-generator/generation/550e8400-e29b-41d4-a716-446655440000/status')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockStatus)
    })

    it('should return 404 for non-existent generation', async () => {
      const { documentGeneratorService } = require('../service')
      documentGeneratorService.getGenerationStatus = jest.fn().mockResolvedValue(null)

      const response = await request(app)
        .get('/api/document-generator/generation/550e8400-e29b-41d4-a716-446655440000/status')
        .expect(404)

      expect(response.body.error).toBe('Generation not found')
    })
  })

  describe('GET /api/document-generator/generation/stats', () => {
    it('should return generation statistics', async () => {
      const mockStats = {
        total_generations: 10,
        successful_generations: 8,
        failed_generations: 2,
        average_generation_time: 2500,
        most_used_formats: {
          [OutputFormat.PDF]: 5,
          [OutputFormat.DOCX]: 3,
          [OutputFormat.MARKDOWN]: 2,
          [OutputFormat.HTML]: 0
        },
        most_used_templates: [
          { template_id: 'template-1', count: 5 },
          { template_id: 'template-2', count: 3 }
        ]
      }

      const { documentGeneratorService } = require('../service')
      documentGeneratorService.getGenerationStats = jest.fn().mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/document-generator/generation/stats')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockStats)
    })
  })

  describe('POST /api/document-generator/validate', () => {
    it('should validate template data request', async () => {
      const response = await request(app)
        .post('/api/document-generator/validate')
        .send({})
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'template_id' }),
          expect.objectContaining({ field: 'data' })
        ])
      )
    })

    it('should return validation result', async () => {
      const response = await request(app)
        .post('/api/document-generator/validate')
        .send({
          template_id: 'template-123',
          data: { title: 'Test' }
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.valid).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      const { documentGeneratorService } = require('../service')
      documentGeneratorService.generateDocument = jest.fn().mockRejectedValue(
        new Error('Service error')
      )

      const response = await request(app)
        .post('/api/document-generator/generate')
        .send({
          template_id: 'template-123',
          data: { title: 'Test' },
          output_format: OutputFormat.MARKDOWN
        })
        .expect(500)

      expect(response.body.error).toBe('Document generation failed')
    })

    it('should handle template not found error', async () => {
      const error = new Error('Template not found')
      error.code = 'TEMPLATE_NOT_FOUND'

      const { documentGeneratorService } = require('../service')
      documentGeneratorService.generateDocument = jest.fn().mockRejectedValue(error)

      const response = await request(app)
        .post('/api/document-generator/generate')
        .send({
          template_id: 'non-existent',
          data: { title: 'Test' },
          output_format: OutputFormat.MARKDOWN
        })
        .expect(404)

      expect(response.body.error).toBe('Template not found')
      expect(response.body.code).toBe('TEMPLATE_NOT_FOUND')
    })
  })
})