/**
 * Document Generator Service Tests
 */

import { DocumentGeneratorService } from '../service'
import { OutputFormat, GenerationStatus } from '../types'
import type { AuthenticatedUser, DocumentGenerationRequest } from '../types'

// Mock dependencies
jest.mock('../../database/connection')
jest.mock('../../utils/redis')
jest.mock('../../utils/logger')
jest.mock('../documentTemplates/service')
jest.mock('puppeteer')
jest.mock('fs/promises')

describe('DocumentGeneratorService', () => {
  let service: DocumentGeneratorService
  let mockUser: AuthenticatedUser

  beforeEach(() => {
    service = new DocumentGeneratorService()
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: {}
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateDocument', () => {
    const mockRequest: DocumentGenerationRequest = {
      template_id: 'template-123',
      data: { title: 'Test Document', content: 'Test content' },
      output_format: OutputFormat.MARKDOWN,
      options: { filename: 'test-document.md' }
    }

    it('should generate a markdown document successfully', async () => {
      // Mock template service
      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        content: '# {{title}}\n\n{{content}}',
        variables: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'text', required: true }
        ],
        framework: 'Custom',
        category: 'Test'
      }

      // Mock the template service method
      jest.spyOn(service as any, 'getTemplateData').mockResolvedValue(mockTemplate)
      jest.spyOn(service as any, 'generateMarkdown').mockResolvedValue('/path/to/document.md')
      
      // Mock fs.stat
      const fs = require('fs/promises')
      fs.stat = jest.fn().mockResolvedValue({ size: 1024 })

      const result = await service.generateDocument(mockRequest, mockUser)

      expect(result).toMatchObject({
        status: GenerationStatus.COMPLETED,
        output_format: OutputFormat.MARKDOWN,
        file_path: '/path/to/document.md'
      })
      expect(result.metadata.template_name).toBe('Test Template')
      expect(result.metadata.generated_by).toBe(mockUser.id)
    })

    it('should throw error for missing template', async () => {
      jest.spyOn(service as any, 'getTemplateData').mockResolvedValue(null)

      await expect(service.generateDocument(mockRequest, mockUser))
        .rejects.toThrow('Template not found')
    })

    it('should throw error for missing required variables', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        content: '# {{title}}\n\n{{content}}',
        variables: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'text', required: true },
          { name: 'author', type: 'text', required: true }
        ],
        framework: 'Custom',
        category: 'Test'
      }

      jest.spyOn(service as any, 'getTemplateData').mockResolvedValue(mockTemplate)

      await expect(service.generateDocument(mockRequest, mockUser))
        .rejects.toThrow('Missing required variables: author')
    })

    it('should handle unsupported output format', async () => {
      const invalidRequest = {
        ...mockRequest,
        output_format: 'invalid' as OutputFormat
      }

      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        content: '# {{title}}',
        variables: [],
        framework: 'Custom',
        category: 'Test'
      }

      jest.spyOn(service as any, 'getTemplateData').mockResolvedValue(mockTemplate)

      await expect(service.generateDocument(invalidRequest, mockUser))
        .rejects.toThrow('Unsupported output format')
    })
  })

  describe('processTemplate', () => {
    it('should process template with handlebars correctly', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        content: '# {{title}}\n\nAuthor: {{author}}\n\n{{content}}',
        variables: [
          { name: 'title', type: 'text', required: true },
          { name: 'author', type: 'text', required: false, default: 'Unknown' },
          { name: 'content', type: 'text', required: true }
        ],
        framework: 'Custom',
        category: 'Test'
      }

      const data = {
        title: 'My Document',
        content: 'This is the content'
      }

      const result = await (service as any).processTemplate(mockTemplate, data)

      expect(result.variables_resolved).toEqual({
        title: 'My Document',
        author: 'Unknown',
        content: 'This is the content'
      })
      expect(result.missing_variables).toHaveLength(0)
      expect(result.warnings).toContain('Using default value for required variable: author')
    })

    it('should identify missing required variables', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        content: '# {{title}}\n\n{{content}}',
        variables: [
          { name: 'title', type: 'text', required: true },
          { name: 'content', type: 'text', required: true }
        ],
        framework: 'Custom',
        category: 'Test'
      }

      const data = {
        title: 'My Document'
        // missing content
      }

      await expect((service as any).processTemplate(mockTemplate, data))
        .rejects.toThrow('Missing required variables: content')
    })
  })

  describe('getGenerationStatus', () => {
    it('should return generation status from cache', async () => {
      const mockJob = {
        id: 'gen-123',
        status: GenerationStatus.COMPLETED,
        progress: 100,
        created_at: new Date()
      }

      const cache = require('../../utils/redis').cache
      cache.get = jest.fn().mockResolvedValue(mockJob)

      const result = await service.getGenerationStatus('gen-123')

      expect(result).toEqual(mockJob)
      expect(cache.get).toHaveBeenCalledWith('generation:gen-123')
    })

    it('should return null for non-existent generation', async () => {
      const cache = require('../../utils/redis').cache
      cache.get = jest.fn().mockResolvedValue(null)

      const result = await service.getGenerationStatus('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('cleanupOldFiles', () => {
    it('should remove files older than configured hours', async () => {
      const fs = require('fs/promises')
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      const newDate = new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago

      fs.readdir = jest.fn().mockResolvedValue(['old-file.pdf', 'new-file.pdf'])
      fs.stat = jest.fn()
        .mockResolvedValueOnce({ mtime: oldDate })
        .mockResolvedValueOnce({ mtime: newDate })
      fs.unlink = jest.fn().mockResolvedValue(undefined)

      await service.cleanupOldFiles()

      expect(fs.unlink).toHaveBeenCalledTimes(1)
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('old-file.pdf'))
    })
  })

  describe('validation helpers', () => {
    it('should validate CSS measurements correctly', () => {
      const { validationHelpers } = require('../validation')
      
      expect(validationHelpers.isCSSMeasurement('1in')).toBe(true)
      expect(validationHelpers.isCSSMeasurement('2.5cm')).toBe(true)
      expect(validationHelpers.isCSSMeasurement('10px')).toBe(true)
      expect(validationHelpers.isCSSMeasurement('invalid')).toBe(false)
    })

    it('should validate safe filenames correctly', () => {
      const { validationHelpers } = require('../validation')
      
      expect(validationHelpers.isSafeFilename('document.pdf')).toBe(true)
      expect(validationHelpers.isSafeFilename('my-document_v1.docx')).toBe(true)
      expect(validationHelpers.isSafeFilename('../../../etc/passwd')).toBe(false)
      expect(validationHelpers.isSafeFilename('file/with/slashes.pdf')).toBe(false)
    })

    it('should sanitize filenames correctly', () => {
      const { validationHelpers } = require('../validation')
      
      expect(validationHelpers.sanitizeFilename('My Document!.pdf')).toBe('My_Document_.pdf')
      expect(validationHelpers.sanitizeFilename('file___with___underscores')).toBe('file_with_underscores')
    })
  })
})