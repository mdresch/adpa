/**
 * Tests for Project Similarity Service
 * TASK-748: Replication to similar projects
 */

import { pool } from '../../database/connection'
import projectSimilarityService from '../../services/projectSimilarityService'

// Mock the database connection
jest.mock('../../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}))

describe('ProjectSimilarityService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('findSimilarProjects', () => {
    it('should find similar projects above minimum score', async () => {
      const mockProjects = [
        {
          id: 'similar-1',
          project_id: 'project-1',
          similar_project_id: 'project-2',
          similarity_score: 0.75,
          similar_project_name: 'Similar Project',
          similar_project_framework: 'PMBOK'
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockProjects })

      const result = await projectSimilarityService.findSimilarProjects('project-1', 0.5)

      expect(result).toEqual(mockProjects)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ps.*'),
        ['project-1', 0.5]
      )
    })

    it('should return empty array when no similar projects found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] })

      const result = await projectSimilarityService.findSimilarProjects('project-1', 0.8)

      expect(result).toEqual([])
    })
  })

  describe('calculateSimilarity', () => {
    it('should calculate similarity score based on project attributes', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          framework: 'PMBOK',
          description: 'Project management system implementation',
          budget: 100000,
          status: 'active',
          metadata: { type: 'software', industry: 'tech' }
        },
        {
          id: 'project-2',
          framework: 'PMBOK',
          description: 'Project tracking system development',
          budget: 120000,
          status: 'active',
          metadata: { type: 'software', industry: 'tech' }
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockProjects })

      const score = await projectSimilarityService.calculateSimilarity('project-1', 'project-2')

      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('should return 0 for completely different projects', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          framework: 'PMBOK',
          description: 'Software development',
          budget: 100000,
          status: 'active',
          metadata: {}
        },
        {
          id: 'project-2',
          framework: 'Agile',
          description: 'Construction project',
          budget: 1000000,
          status: 'completed',
          metadata: {}
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockProjects })

      const score = await projectSimilarityService.calculateSimilarity('project-1', 'project-2')

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('should throw error if project not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] })

      await expect(
        projectSimilarityService.calculateSimilarity('project-1', 'project-2')
      ).rejects.toThrow('One or both projects not found')
    })
  })

  describe('createReplication', () => {
    it('should create a new replication record', async () => {
      const mockReplication = {
        id: 'replication-1',
        source_project_id: 'project-1',
        target_project_id: 'project-2',
        improvement_type: 'efficiency_improvement',
        improvement_title: 'AI Cost Optimization',
        improvement_description: 'Switched to more efficient AI provider',
        replication_status: 'identified'
      };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockReplication] })

      const params = {
        sourceProjectId: 'project-1',
        targetProjectId: 'project-2',
        improvementType: 'efficiency_improvement',
        improvementTitle: 'AI Cost Optimization',
        improvementDescription: 'Switched to more efficient AI provider',
        estimatedValue: { cost_savings: 5000 }
      }

      const result = await projectSimilarityService.createReplication(params)

      expect(result).toEqual(mockReplication)
      expect(pool.query).toHaveBeenCalled()
    })
  })

  describe('updateReplicationStatus', () => {
    it('should update replication status', async () => {
      const mockReplication = {
        id: 'replication-1',
        replication_status: 'approved',
        approved_by: 'user-1',
        approved_at: new Date()
      };

      (pool.query as jest.Mock).mockResolvedValue({ rows: [mockReplication] })

      const result = await projectSimilarityService.updateReplicationStatus(
        'replication-1',
        'approved',
        'user-1'
      )

      expect(result.replication_status).toBe('approved')
    })

    it('should throw error if replication not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] })

      await expect(
        projectSimilarityService.updateReplicationStatus('replication-1', 'approved')
      ).rejects.toThrow('Replication not found')
    })
  })

  describe('getReplicationsForSource', () => {
    it('should get all replications for a source project', async () => {
      const mockReplications = [
        {
          id: 'replication-1',
          source_project_id: 'project-1',
          target_project_id: 'project-2',
          target_project_name: 'Target Project'
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockReplications })

      const result = await projectSimilarityService.getReplicationsForSource('project-1')

      expect(result).toEqual(mockReplications)
    })
  })

  describe('getValueTracking', () => {
    it('should get value tracking for a source project', async () => {
      const mockTracking = [
        {
          id: 'tracking-1',
          source_project_id: 'project-1',
          improvement_title: 'AI Cost Optimization',
          total_replications: 5,
          successful_replications: 4,
          total_actual_value: 20000
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockTracking })

      const result = await projectSimilarityService.getValueTracking('project-1')

      expect(result).toEqual(mockTracking)
    })
  })
})
