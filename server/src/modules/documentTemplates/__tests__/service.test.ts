/**
 * Document Templates Service Tests
 */

import { DocumentTemplateService } from '../service'
import { pool } from '../../../database/connection'
import { cache } from '../../../utils/redis'
import { logger } from '../../../utils/logger'
import type { AuthenticatedUser, CreateTemplateRequest, UpdateTemplateRequest } from '../types'

// Mock dependencies
jest.mock('../../../database/connection')
jest.mock('../../../utils/redis')
jest.mock('../../../utils/logger')
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}))

const mockPool = pool as jest.Mocked<typeof pool>
const mockCache = cache as jest.Mocked<typeof cache>
const mockLogger = logger as jest.Mocked<typeof logger>

describe('DocumentTemplateService', () => {
  let service: DocumentTemplateService
  let mockUser: AuthenticatedUser

  beforeEach(() => {
    service = new DocumentTemplateService()
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: { 'templates.create': true, 'templates.update': true, 'templates.delete': true }
    }

    jest.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('should return paginated templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Test Template',
          framework: 'TOGAF',
          content: {},
          variables: [],
          is_public: true,
          created_by: 'user-123',
          usage_count: 5,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]

      mockPool.query
        .mockResolvedValueOnce({ rows: mockTemplates } as any)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)

      const result = await service.getTemplates({ page: 1, limit: 10 }, mockUser)

      expect(result).toEqual({
        templates: mockTemplates,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      })

      expect(mockPool.query).toHaveBeenCalledTimes(2)
    })

    it('should apply filters correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any)

      await service.getTemplates({
        page: 1,
        limit: 10,
        framework: 'TOGAF',
        category: 'Architecture',
        search: 'test',
        is_public: true
      }, mockUser)

      const firstCall = mockPool.query.mock.calls[0]
      expect(firstCall[0]).toContain('AND t.framework = $2')
      expect(firstCall[0]).toContain('AND t.category = $3')
      expect(firstCall[0]).toContain('AND (t.name ILIKE $4 OR t.description ILIKE $4)')
      expect(firstCall[0]).toContain('AND t.is_public = $5')
      expect(firstCall[1]).toEqual(['user-123', 'TOGAF', 'Architecture', '%test%', true, 10, 0])
    })
  })

  describe('getTemplateById', () => {
    it('should return cached template if available', async () => {
      const mockTemplate = { id: 'template-1', name: 'Test Template' }
      mockCache.get.mockResolvedValue(mockTemplate)

      const result = await service.getTemplateById('template-1', mockUser)

      expect(result).toEqual(mockTemplate)
      expect(mockCache.get).toHaveBeenCalledWith('template:template-1')
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it('should fetch from database and cache if not cached', async () => {
      const mockTemplate = { id: 'template-1', name: 'Test Template' }
      mockCache.get.mockResolvedValue(null)
      mockPool.query.mockResolvedValue({ rows: [mockTemplate] } as any)

      const result = await service.getTemplateById('template-1', mockUser)

      expect(result).toEqual(mockTemplate)
      expect(mockCache.set).toHaveBeenCalledWith('template:template-1', mockTemplate, 3600)
    })

    it('should return null if template not found', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await service.getTemplateById('template-1', mockUser)

      expect(result).toBeNull()
    })
  })

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const createData: CreateTemplateRequest = {
        name: 'New Template',
        description: 'Test description',
        framework: 'TOGAF',
        category: 'Architecture',
        content: { sections: [] },
        variables: [],
        is_public: false
      }

      const mockCreatedTemplate = {
        id: 'test-uuid-123',
        ...createData,
        created_by: 'user-123',
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      mockPool.query.mockResolvedValue({ rows: [mockCreatedTemplate] } as any)

      const result = await service.createTemplate(createData, mockUser)

      expect(result).toEqual(mockCreatedTemplate)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO templates'),
        expect.arrayContaining([
          'test-uuid-123',
          'New Template',
          'Test description',
          'TOGAF',
          'Architecture',
          JSON.stringify({ sections: [] }),
          JSON.stringify([]),
          false,
          'user-123'
        ])
      )
      expect(mockLogger.info).toHaveBeenCalledWith('Template created: New Template by test@example.com')
    })
  })

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updateData: UpdateTemplateRequest = {
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

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ created_by: 'user-123' }] } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedTemplate] } as any)

      const result = await service.updateTemplate('template-1', updateData, mockUser)

      expect(result).toEqual(mockUpdatedTemplate)
      expect(mockCache.del).toHaveBeenCalledWith('template:template-1')
      expect(mockLogger.info).toHaveBeenCalledWith('Template updated: template-1 by test@example.com')
    })

    it('should return null if template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await service.updateTemplate('template-1', {}, mockUser)

      expect(result).toBeNull()
    })

    it('should throw error if user lacks permission', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ created_by: 'other-user' }] } as any)

      await expect(service.updateTemplate('template-1', {}, mockUser))
        .rejects.toThrow('Access denied')
    })

    it('should allow admin to update any template', async () => {
      const adminUser = { ...mockUser, role: 'admin' }
      const mockUpdatedTemplate = { id: 'template-1', name: 'Updated' }

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ created_by: 'other-user' }] } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedTemplate] } as any)

      const result = await service.updateTemplate('template-1', { name: 'Updated' }, adminUser)

      expect(result).toEqual(mockUpdatedTemplate)
    })
  })

  describe('deleteTemplate', () => {
    it('should soft delete a template', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ created_by: 'user-123', name: 'Test Template' }] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.deleteTemplate('template-1', mockUser)

      expect(result).toBe(true)
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE templates SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2 WHERE id = $1',
        ['template-1', 'user-123']
      )
      expect(mockCache.del).toHaveBeenCalledWith('template:template-1')
      expect(mockLogger.info).toHaveBeenCalledWith('Template soft-deleted: template-1 by test@example.com')
    })

    it('should return false if template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await service.deleteTemplate('template-1', mockUser)

      expect(result).toBe(false)
    })

    it('should throw error if template is being used', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ created_by: 'user-123', name: 'Test Template' }] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] } as any)

      await expect(service.deleteTemplate('template-1', mockUser))
        .rejects.toThrow('Template is being used by 5 documents and cannot be deleted')
    })
  })

  describe('cloneTemplate', () => {
    it('should clone an existing template', async () => {
      const cloneData = {
        name: 'Cloned Template',
        description: 'Cloned description',
        is_public: false
      }

      const originalTemplate = {
        id: 'original-id',
        name: 'Original Template',
        framework: 'TOGAF',
        category: 'Architecture',
        content: { sections: [] },
        variables: [],
        is_public: true,
        created_by: 'other-user'
      }

      const clonedTemplate = {
        id: 'test-uuid-123',
        name: 'Cloned Template',
        description: 'Cloned description',
        framework: 'TOGAF',
        category: 'Architecture',
        content: { sections: [] },
        variables: [],
        is_public: false,
        created_by: 'user-123'
      }

      mockPool.query
        .mockResolvedValueOnce({ rows: [originalTemplate] } as any)
        .mockResolvedValueOnce({ rows: [clonedTemplate] } as any)

      const result = await service.cloneTemplate('original-id', cloneData, mockUser)

      expect(result).toEqual(clonedTemplate)
      expect(mockLogger.info).toHaveBeenCalledWith('Template cloned: original-id -> test-uuid-123 by test@example.com')
    })

    it('should return null if original template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await service.cloneTemplate('template-1', { name: 'Clone' }, mockUser)

      expect(result).toBeNull()
    })
  })

  describe('recordTemplateUsage', () => {
    it('should increment usage count', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ usage_count: 6 }] } as any)

      const result = await service.recordTemplateUsage('template-1', mockUser)

      expect(result).toBe(6)
      expect(mockCache.del).toHaveBeenCalledWith('template:template-1')
    })

    it('should return null if template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any)

      const result = await service.recordTemplateUsage('template-1', mockUser)

      expect(result).toBeNull()
    })
  })
})