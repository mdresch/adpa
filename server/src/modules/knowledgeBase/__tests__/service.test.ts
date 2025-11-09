/**
 * Knowledge Base Service Tests
 */

import { KnowledgeBaseService } from '../service'
import type {
  CreateKnowledgeBaseEntryRequest,
  UpdateKnowledgeBaseEntryRequest,
  CreateKnowledgeBaseApplicationRequest
} from '../types'

// Mock dependencies
jest.mock('../../../database/connection', () => ({
  pool: {
    connect: jest.fn()
  }
}))

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService
  let mockClient: any

  beforeEach(() => {
    service = new KnowledgeBaseService()
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    }

    const { pool } = require('../../../database/connection')
    pool.connect.mockResolvedValue(mockClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createEntry', () => {
    const mockEntryRequest: CreateKnowledgeBaseEntryRequest = {
      project_id: 'project-123',
      entry_type: 'efficiency_improvement',
      category: 'ai_optimization',
      title: 'Claude Sonnet Cost Optimization',
      description: 'Switched from GPT-4 to Claude Sonnet for document generation',
      improved_approach: {
        description: 'Use Claude Sonnet instead of GPT-4',
        implementation_details: 'Updated AI provider configuration',
        tools_used: ['Claude Sonnet'],
        techniques: ['Provider optimization']
      },
      replication_guide: {
        steps: [
          'Review AI provider costs',
          'Test Claude Sonnet quality',
          'Update configuration',
          'Monitor results'
        ],
        prerequisites: ['AI provider access'],
        resources_needed: ['Development time'],
        estimated_effort: '2 hours',
        risks: ['Quality differences']
      },
      value_metrics: {
        cost_savings: 25000,
        time_saved: 0,
        efficiency_gain: 50
      },
      tags: ['ai', 'cost-optimization'],
      keywords: ['claude', 'gpt-4', 'cost']
    }

    it('should create a knowledge base entry successfully', async () => {
      const mockEntry = {
        id: 'entry-123',
        ...mockEntryRequest,
        created_by: 'user-123',
        created_at: new Date(),
        status: 'draft',
        view_count: 0,
        application_count: 0,
        success_rate: 0,
        ai_confidence: 0,
        novelty_score: 0,
        replication_potential: 0,
        updated_at: new Date()
      }

      mockClient.query.mockResolvedValueOnce({
        rows: [mockEntry]
      })

      const result = await service.createEntry(mockEntryRequest, 'user-123')

      expect(result).toMatchObject({
        id: 'entry-123',
        title: 'Claude Sonnet Cost Optimization',
        entry_type: 'efficiency_improvement'
      })
      expect(mockClient.query).toHaveBeenCalledTimes(1)
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'))

      await expect(service.createEntry(mockEntryRequest, 'user-123'))
        .rejects.toThrow('Database error')
      
      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('getEntryById', () => {
    it('should retrieve an entry and increment view count', async () => {
      const mockEntry = {
        id: 'entry-123',
        project_id: 'project-123',
        title: 'Test Entry',
        entry_type: 'efficiency_improvement',
        category: 'ai_optimization',
        description: 'Test description',
        improved_approach: { description: 'Test', implementation_details: 'Test' },
        replication_guide: { steps: ['Test'] },
        status: 'published',
        created_by: 'user-123',
        created_at: new Date(),
        view_count: 5,
        application_count: 0,
        success_rate: 0,
        ai_confidence: 0.9,
        novelty_score: 0.8,
        replication_potential: 0.7,
        updated_at: new Date()
      }

      // Mock update view count
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      // Mock select entry
      mockClient.query.mockResolvedValueOnce({ rows: [mockEntry] })

      const result = await service.getEntryById('entry-123')

      expect(result).toMatchObject({
        id: 'entry-123',
        title: 'Test Entry'
      })
      expect(mockClient.query).toHaveBeenCalledTimes(2)
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        'UPDATE knowledge_base_entries SET view_count = view_count + 1 WHERE id = $1',
        ['entry-123']
      )
    })

    it('should return null for non-existent entry', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await service.getEntryById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('searchEntries', () => {
    it('should search entries with filters', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          title: 'Entry 1',
          entry_type: 'efficiency_improvement',
          category: 'ai_optimization',
          status: 'published',
          created_at: new Date()
        },
        {
          id: 'entry-2',
          title: 'Entry 2',
          entry_type: 'cost_reduction',
          category: 'cost_management',
          status: 'published',
          created_at: new Date()
        }
      ]

      // Mock count query
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '2' }] })
      // Mock select query
      mockClient.query.mockResolvedValueOnce({ rows: mockEntries })

      const result = await service.searchEntries({
        status: 'published',
        entry_type: 'efficiency_improvement'
      }, 50, 0)

      expect(result.total).toBe(2)
      expect(result.entries).toHaveLength(2)
      expect(mockClient.query).toHaveBeenCalledTimes(2)
    })

    it('should support full-text search', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '1' }] })
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          id: 'entry-1',
          title: 'Claude Optimization',
          description: 'Using Claude for cost savings'
        }]
      })

      const result = await service.searchEntries({
        search_query: 'claude cost'
      })

      expect(result.total).toBe(1)
      expect(result.entries[0].title).toBe('Claude Optimization')
    })
  })

  describe('createApplication', () => {
    const mockApplicationRequest: CreateKnowledgeBaseApplicationRequest = {
      knowledge_base_entry_id: 'entry-123',
      target_project_id: 'project-456',
      implementation_notes: 'Applied successfully',
      adaptation_required: false,
      expected_value: {
        cost_savings: 25000
      }
    }

    it('should create an application and increment entry count', async () => {
      const mockApplication = {
        id: 'app-123',
        ...mockApplicationRequest,
        applied_by: 'user-123',
        applied_at: new Date(),
        status: 'planned',
        adaptation_required: false,
        updated_at: new Date()
      }

      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [mockApplication] }) // INSERT
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // UPDATE count
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // COMMIT

      const result = await service.createApplication(mockApplicationRequest, 'user-123')

      expect(result).toMatchObject({
        id: 'app-123',
        knowledge_base_entry_id: 'entry-123',
        target_project_id: 'project-456'
      })
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback on error', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Database error'))
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // ROLLBACK

      await expect(service.createApplication(mockApplicationRequest, 'user-123'))
        .rejects.toThrow('Database error')
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('updateEntry', () => {
    const updateData: UpdateKnowledgeBaseEntryRequest = {
      title: 'Updated Title',
      status: 'published'
    }

    it('should update an entry successfully', async () => {
      const mockUpdatedEntry = {
        id: 'entry-123',
        title: 'Updated Title',
        status: 'published',
        published_at: new Date(),
        updated_at: new Date()
      }

      mockClient.query.mockResolvedValueOnce({ rows: [mockUpdatedEntry] })

      const result = await service.updateEntry('entry-123', updateData)

      expect(result.title).toBe('Updated Title')
      expect(result.status).toBe('published')
    })

    it('should throw error when no fields to update', async () => {
      await expect(service.updateEntry('entry-123', {}))
        .rejects.toThrow('No fields to update')
    })

    it('should throw error when entry not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] })

      await expect(service.updateEntry('non-existent', updateData))
        .rejects.toThrow('Entry not found')
    })
  })

  describe('getStats', () => {
    it('should return knowledge base statistics', async () => {
      // Mock stats query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          total_entries: '10',
          entries_by_type: { efficiency_improvement: 5, cost_reduction: 5 },
          entries_by_category: { ai_optimization: 7, cost_management: 3 },
          entries_by_status: { published: 8, draft: 2 },
          total_applications: '15',
          average_success_rate: '0.8'
        }]
      })

      // Mock metrics query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          total_cost_savings: '250000',
          total_time_saved: '500'
        }]
      })

      // Mock successful applications query
      mockClient.query.mockResolvedValueOnce({
        rows: [{ successful_applications: '12' }]
      })

      const stats = await service.getStats()

      expect(stats.total_entries).toBe(10)
      expect(stats.total_applications).toBe(15)
      expect(stats.successful_applications).toBe(12)
      expect(stats.total_cost_savings).toBe(250000)
      expect(stats.total_time_saved).toBe(500)
    })
  })
})
