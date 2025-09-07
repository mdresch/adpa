/**
 * Document Templates Controller Tests
 */

import { Request, Response } from 'express'
import { DocumentTemplateController } from '../controller'
import { documentTemplateService } from '../service'
import { logger } from '../../../utils/logger'
import type { AuthenticatedUser } from '../types'

// Mock dependencies
jest.mock('../service')
jest.mock('../../../utils/logger')

const mockService = documentTemplateService as jest.Mocked<typeof documentTemplateService>
const mockLogger = logger as jest.Mocked<typeof logger>

interface MockRequest extends Partial<Request> {
  user?: AuthenticatedUser
  params?: any
  query?: any
  body?: any
}

interface MockResponse extends Partial<Response> {
  status: jest.Mock
  json: jest.Mock
}

describe('DocumentTemplateController', () => {
  let controller: DocumentTemplateController
  let mockReq: MockRequest
  let mockRes: MockResponse
  let mockUser: AuthenticatedUser

  beforeEach(() => {
    controller = new DocumentTemplateController()
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: {}
    }

    mockReq = {
      user: mockUser,
      params: {},
      query: {},
      body: {}
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    jest.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('should return templates successfully', async () => {
      const mockResult = {
        templates: [{ id: 'template-1', name: 'Test Template' }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }

      mockService.getTemplates.mockResolvedValue(mockResult as any)

      await controller.getTemplates(mockReq as any, mockRes as any)

      expect(mockService.getTemplates).toHaveBeenCalledWith({}, mockUser)
      expect(mockRes.json).toHaveBeenCalledWith(mockResult)
    })

    it('should handle service errors', async () => {
      mockService.getTemplates.mockRejectedValue(new Error('Service error'))

      await controller.getTemplates(mockReq as any, mockRes as any)

      expect(mockLogger.error).toHaveBeenCalledWith('Get templates error:', expect.any(Error))
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    })
  })

  describe('getTemplateById', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
    })

    it('should return template successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'Test Template' }
      mockService.getTemplateById.mockResolvedValue(mockTemplate as any)

      await controller.getTemplateById(mockReq as any, mockRes as any)

      expect(mockService.getTemplateById).toHaveBeenCalledWith('template-1', mockUser)
      expect(mockRes.json).toHaveBeenCalledWith({ template: mockTemplate })
    })

    it('should return 404 if template not found', async () => {
      mockService.getTemplateById.mockResolvedValue(null)

      await controller.getTemplateById(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found' })
    })
  })

  describe('createTemplate', () => {
    beforeEach(() => {
      mockReq.body = {
        name: 'New Template',
        framework: 'TOGAF',
        content: {}
      }
    })

    it('should create template successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'New Template' }
      mockService.createTemplate.mockResolvedValue(mockTemplate as any)

      await controller.createTemplate(mockReq as any, mockRes as any)

      expect(mockService.createTemplate).toHaveBeenCalledWith(mockReq.body, mockUser)
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Template created successfully',
        template: mockTemplate
      })
    })
  })

  describe('updateTemplate', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
      mockReq.body = { name: 'Updated Template' }
    })

    it('should update template successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'Updated Template' }
      mockService.updateTemplate.mockResolvedValue(mockTemplate as any)

      await controller.updateTemplate(mockReq as any, mockRes as any)

      expect(mockService.updateTemplate).toHaveBeenCalledWith('template-1', mockReq.body, mockUser)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Template updated successfully',
        template: mockTemplate
      })
    })

    it('should return 404 if template not found', async () => {
      mockService.updateTemplate.mockResolvedValue(null)

      await controller.updateTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found' })
    })

    it('should return 403 for access denied error', async () => {
      mockService.updateTemplate.mockRejectedValue(new Error('Access denied'))

      await controller.updateTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' })
    })
  })

  describe('deleteTemplate', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
    })

    it('should delete template successfully', async () => {
      mockService.deleteTemplate.mockResolvedValue(true)

      await controller.deleteTemplate(mockReq as any, mockRes as any)

      expect(mockService.deleteTemplate).toHaveBeenCalledWith('template-1', mockUser)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Template deleted successfully' })
    })

    it('should return 404 if template not found', async () => {
      mockService.deleteTemplate.mockResolvedValue(false)

      await controller.deleteTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found' })
    })

    it('should return 400 for template in use error', async () => {
      mockService.deleteTemplate.mockRejectedValue(new Error('Template is being used by 5 documents and cannot be deleted'))

      await controller.deleteTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({ 
        error: 'Template is being used by 5 documents and cannot be deleted' 
      })
    })
  })

  describe('cloneTemplate', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
      mockReq.body = { name: 'Cloned Template' }
    })

    it('should clone template successfully', async () => {
      const mockTemplate = { id: 'template-2', name: 'Cloned Template' }
      mockService.cloneTemplate.mockResolvedValue(mockTemplate as any)

      await controller.cloneTemplate(mockReq as any, mockRes as any)

      expect(mockService.cloneTemplate).toHaveBeenCalledWith('template-1', mockReq.body, mockUser)
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Template cloned successfully',
        template: mockTemplate
      })
    })

    it('should return 404 if original template not found', async () => {
      mockService.cloneTemplate.mockResolvedValue(null)

      await controller.cloneTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found' })
    })
  })

  describe('recordTemplateUsage', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
    })

    it('should record usage successfully', async () => {
      mockService.recordTemplateUsage.mockResolvedValue(6)

      await controller.recordTemplateUsage(mockReq as any, mockRes as any)

      expect(mockService.recordTemplateUsage).toHaveBeenCalledWith('template-1', mockUser)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Template usage recorded',
        usage_count: 6
      })
    })

    it('should return 404 if template not found', async () => {
      mockService.recordTemplateUsage.mockResolvedValue(null)

      await controller.recordTemplateUsage(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found' })
    })
  })

  describe('getDeletedTemplates', () => {
    beforeEach(() => {
      mockReq.query = { page: '1', limit: '10' }
    })

    it('should return deleted templates successfully', async () => {
      const mockResult = {
        templates: [{ id: 'template-1', name: 'Deleted Template', deleted_at: new Date() }],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      }

      mockService.getDeletedTemplates.mockResolvedValue(mockResult as any)

      await controller.getDeletedTemplates(mockReq as any, mockRes as any)

      expect(mockService.getDeletedTemplates).toHaveBeenCalledWith(1, 10, mockUser)
      expect(mockRes.json).toHaveBeenCalledWith(mockResult)
    })
  })

  describe('restoreTemplate', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
    })

    it('should restore template successfully', async () => {
      const mockTemplate = { id: 'template-1', name: 'Restored Template' }
      mockService.restoreTemplate.mockResolvedValue(mockTemplate as any)

      await controller.restoreTemplate(mockReq as any, mockRes as any)

      expect(mockService.restoreTemplate).toHaveBeenCalledWith('template-1', mockUser)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Template restored successfully',
        template: mockTemplate
      })
    })

    it('should return 404 if template not found', async () => {
      mockService.restoreTemplate.mockResolvedValue(null)

      await controller.restoreTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found or not deleted' })
    })
  })

  describe('permanentlyDeleteTemplate', () => {
    beforeEach(() => {
      mockReq.params = { id: 'template-1' }
    })

    it('should permanently delete template successfully', async () => {
      mockService.permanentlyDeleteTemplate.mockResolvedValue(true)

      await controller.permanentlyDeleteTemplate(mockReq as any, mockRes as any)

      expect(mockService.permanentlyDeleteTemplate).toHaveBeenCalledWith('template-1', mockUser)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Template permanently deleted' })
    })

    it('should return 404 if template not found', async () => {
      mockService.permanentlyDeleteTemplate.mockResolvedValue(false)

      await controller.permanentlyDeleteTemplate(mockReq as any, mockRes as any)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template not found or not deleted' })
    })
  })
})