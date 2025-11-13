/**
 * Knowledge Base Service Tests
 * Tests for CR-2026-001 Phase 3: Knowledge Base Integration
 */

import { knowledgeBaseService, KnowledgeBaseEntry } from '../../services/knowledgeBaseService'
import { pool } from '../../database/connection'

// Mock dependencies
jest.mock('../../database/connection')
jest.mock('../../utils/logger')
jest.mock('../../services/aiService')

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createEntry', () => {
    it('should create a knowledge base entry successfully', async () => {
      const mockEntry: KnowledgeBaseEntry = {
        entry_type: 'efficiency_improvement',
        category: 'positive_drift',
        title: 'Test Efficiency Improvement',
        description: 'A test improvement',
        approach: 'Used new approach',
        source_project_id: 'project-123',
        business_value_score: 0.8,
        replicable: true,
        tags: ['efficiency', 'testing'],
        created_by: 'user-123'
      }

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ ...mockEntry, id: 'kb-entry-123' }] }),
        release: jest.fn()
      }

      ;(pool.connect as jest.Mock).mockResolvedValue(mockClient)

      const result = await knowledgeBaseService.createEntry(mockEntry)

      expect(result.id).toBe('kb-entry-123')
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO knowledge_base_entries'),
        expect.any(Array)
      )
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback on error', async () => {
      const mockEntry: KnowledgeBaseEntry = {
        entry_type: 'efficiency_improvement',
        category: 'positive_drift',
        title: 'Test Entry',
        description: 'Test',
        approach: 'Test approach',
        created_by: 'user-123'
      }

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // INSERT
        release: jest.fn()
      }

      ;(pool.connect as jest.Mock).mockResolvedValue(mockClient)

      await expect(knowledgeBaseService.createEntry(mockEntry)).rejects.toThrow('Database error')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('search', () => {
    it('should search knowledge base entries with query', async () => {
      const mockEntries = [
        { id: 'kb-1', title: 'Entry 1', business_value_score: 0.9 },
        { id: 'kb-2', title: 'Entry 2', business_value_score: 0.7 }
      ]

      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // COUNT
        .mockResolvedValueOnce({ rows: mockEntries }) // SELECT

      const result = await knowledgeBaseService.search({
        query: 'efficiency',
        limit: 10,
        offset: 0
      })

      expect(result.entries).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('search_vector'),
        expect.arrayContaining(['efficiency'])
      )
    })

    it('should filter by entry type', async () => {
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'kb-1' }] })

      await knowledgeBaseService.search({
        entry_type: 'efficiency_improvement',
        limit: 50
      })

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('entry_type = $1'),
        expect.arrayContaining(['efficiency_improvement'])
      )
    })

    it('should filter by tags', async () => {
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'kb-1' }] })

      await knowledgeBaseService.search({
        tags: ['efficiency', 'cost-saving'],
        limit: 50
      })

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('tags &&'),
        expect.any(Array)
      )
    })

    it('should filter by minimum business value', async () => {
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'kb-1', business_value_score: 0.9 }] })

      await knowledgeBaseService.search({
        min_business_value: 0.8,
        limit: 50
      })

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('business_value_score >= $1'),
        expect.arrayContaining([0.8])
      )
    })

    it('should filter replicable entries only', async () => {
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'kb-1', replicable: true }] })

      await knowledgeBaseService.search({
        replicable_only: true,
        limit: 50
      })

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('replicable = TRUE'),
        expect.any(Array)
      )
    })
  })

  describe('applyToProject', () => {
    it('should apply knowledge base entry to project', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 'app-123' }] }) // INSERT application
          .mockResolvedValueOnce({}) // UPDATE entry count
          .mockResolvedValueOnce({}) // UPDATE recommendation
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn()
      }

      ;(pool.connect as jest.Mock).mockResolvedValue(mockClient)

      const result = await knowledgeBaseService.applyToProject(
        'kb-entry-123',
        'project-456',
        'user-789',
        'Testing application'
      )

      expect(result.id).toBe('app-123')
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO knowledge_base_applications'),
        ['kb-entry-123', 'project-456', 'user-789', 'Testing application']
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_base_entries'),
        ['kb-entry-123']
      )
    })
  })

  describe('updateApplicationOutcome', () => {
    it('should update application outcome and recalculate success rate', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}) // UPDATE application
          .mockResolvedValueOnce({ rows: [{ knowledge_entry_id: 'kb-123' }] }) // GET entry ID
          .mockResolvedValueOnce({ rows: [{ total: 5, successes: 4 }] }) // GET stats
          .mockResolvedValueOnce({}) // UPDATE success rate
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn()
      }

      ;(pool.connect as jest.Mock).mockResolvedValue(mockClient)

      await knowledgeBaseService.updateApplicationOutcome('app-123', {
        success: true,
        actual_cost_impact: 5000,
        notes: 'Worked great!'
      })

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_base_applications'),
        expect.arrayContaining(['app-123', true, 5000])
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_base_entries SET success_rate'),
        ['kb-123', 0.8] // 4/5 = 0.8
      )
    })
  })

  describe('createFromDrift', () => {
    it('should create knowledge base entry from drift detection', async () => {
      const mockDrift = {
        id: 'drift-123',
        project_id: 'project-456',
        baseline_id: 'baseline-789',
        drift_description: 'Efficiency improvement detected',
        drift_severity: 'medium',
        detection_type: 'scope_drift',
        source_document_id: 'doc-123',
        ai_processing_metadata: {}
      }

      ;(pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockDrift]
      })

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 'kb-entry-123' }] }) // INSERT
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn()
      }

      ;(pool.connect as jest.Mock).mockResolvedValue(mockClient)

      const result = await knowledgeBaseService.createFromDrift(
        'drift-123',
        'project-456',
        'user-789'
      )

      expect(result.id).toBe('kb-entry-123')
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM baseline_drift_detection'),
        ['drift-123']
      )
    })
  })

  describe('getRecommendationsForProject', () => {
    it('should get AI recommendations for a project', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
        tags: [{ name: 'efficiency' }]
      }

      const mockEntries = [
        { id: 'kb-1', title: 'Entry 1', business_value_score: 0.9 },
        { id: 'kb-2', title: 'Entry 2', business_value_score: 0.8 }
      ]

      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockProject] }) // Get project
        .mockResolvedValueOnce({ rows: [] }) // Get existing recs
        .mockResolvedValueOnce({ rows: mockEntries }) // Get entries
        .mockResolvedValue({}) // Insert recommendations

      const result = await knowledgeBaseService.getRecommendationsForProject(
        'project-123',
        10
      )

      expect(Array.isArray(result)).toBe(true)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM projects'),
        ['project-123']
      )
    })

    it('should throw error if project not found', async () => {
      ;(pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await expect(
        knowledgeBaseService.getRecommendationsForProject('nonexistent', 10)
      ).rejects.toThrow('Project not found')
    })
  })
})
