/**
 * Knowledge Base Integration Tests
 */

import {
  createKnowledgeBaseFromDrift,
  createKnowledgeBaseFromInnovation
} from '../integration'
import { knowledgeBaseService } from '../service'

// Mock the knowledge base service
jest.mock('../service', () => ({
  knowledgeBaseService: {
    createEntry: jest.fn()
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

describe('Knowledge Base Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createKnowledgeBaseFromDrift', () => {
    const mockDrift = {
      id: 'drift-123',
      project_id: 'project-123',
      baseline_id: 'baseline-123',
      detection_type: 'cost_drift',
      drift_description: 'Achieved 50% cost reduction by switching AI providers',
      drift_impact: 'Significant cost savings',
      ai_confidence: 0.9,
      ai_processing_metadata: { model: 'gpt-4', tokens: 1000 }
    }

    const userId = 'user-123'

    it('should create knowledge base entry from drift detection', async () => {
      const mockEntry = {
        id: 'entry-123',
        project_id: 'project-123',
        drift_detection_id: 'drift-123',
        entry_type: 'cost_reduction',
        category: 'cost_management'
      }

      ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

      await createKnowledgeBaseFromDrift(mockDrift, userId)

      expect(knowledgeBaseService.createEntry).toHaveBeenCalledTimes(1)
      expect(knowledgeBaseService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-123',
          baseline_id: 'baseline-123',
          drift_detection_id: 'drift-123',
          entry_type: 'cost_reduction',
          category: 'cost_management',
          description: 'Achieved 50% cost reduction by switching AI providers'
        }),
        userId
      )
    })

    it('should include additional data when provided', async () => {
      const mockEntry = {
        id: 'entry-123',
        project_id: 'project-123'
      }

      ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

      const additionalData = {
        baseline_approach: {
          description: 'Using GPT-4',
          cost: 50000,
          timeline: 180
        },
        improved_approach: {
          implementation_details: 'Switched to Claude Sonnet',
          tools_used: ['Claude Sonnet'],
          techniques: ['Provider optimization']
        },
        value_metrics: {
          cost_savings: 25000,
          time_saved: 0,
          efficiency_gain: 50
        },
        similar_project_ids: ['project-456', 'project-789']
      }

      await createKnowledgeBaseFromDrift(mockDrift, userId, additionalData)

      expect(knowledgeBaseService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          baseline_approach: additionalData.baseline_approach,
          value_metrics: additionalData.value_metrics,
          similar_project_ids: additionalData.similar_project_ids
        }),
        userId
      )
    })

    it('should map different drift types correctly', async () => {
      const driftTypes = [
        { type: 'scope_drift', expectedType: 'process_improvement', expectedCategory: 'scope_management' },
        { type: 'technical_drift', expectedType: 'technology_innovation', expectedCategory: 'technical_approach' },
        { type: 'timeline_drift', expectedType: 'timeline_acceleration', expectedCategory: 'timeline_management' },
        { type: 'resource_drift', expectedType: 'efficiency_improvement', expectedCategory: 'resource_management' }
      ]

      for (const { type, expectedType, expectedCategory } of driftTypes) {
        const drift = { ...mockDrift, detection_type: type }
        const mockEntry = { id: 'entry-123', project_id: 'project-123' }
        
        ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

        await createKnowledgeBaseFromDrift(drift, userId)

        expect(knowledgeBaseService.createEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            entry_type: expectedType,
            category: expectedCategory
          }),
          userId
        )

        jest.clearAllMocks()
      }
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error')
      ;(knowledgeBaseService.createEntry as jest.Mock).mockRejectedValueOnce(error)

      await expect(createKnowledgeBaseFromDrift(mockDrift, userId))
        .rejects.toThrow('Database error')
    })
  })

  describe('createKnowledgeBaseFromInnovation', () => {
    const mockInnovation = {
      id: 'innovation-123',
      project_id: 'project-123',
      baseline_id: 'baseline-123',
      opportunity_type: 'patent_opportunity',
      title: 'Novel AI Document Generation Approach',
      description: 'Discovered a novel approach to AI-powered document generation',
      potential_value: '$100K annual savings',
      ai_confidence: 0.85,
      novelty_score: 0.9,
      ai_processing_metadata: { model: 'gpt-4' }
    }

    const userId = 'user-123'

    it('should create knowledge base entry from innovation opportunity', async () => {
      const mockEntry = {
        id: 'entry-123',
        project_id: 'project-123',
        innovation_opportunity_id: 'innovation-123'
      }

      ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

      await createKnowledgeBaseFromInnovation(mockInnovation, userId)

      expect(knowledgeBaseService.createEntry).toHaveBeenCalledTimes(1)
      expect(knowledgeBaseService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-123',
          baseline_id: 'baseline-123',
          innovation_opportunity_id: 'innovation-123',
          entry_type: 'innovation',
          category: 'technical_approach',
          title: 'Novel AI Document Generation Approach'
        }),
        userId
      )
    })

    it('should parse value from potential_value string', async () => {
      const innovationWithValue = {
        ...mockInnovation,
        potential_value: '$50,000 cost savings and 30% improvement'
      }

      const mockEntry = { id: 'entry-123', project_id: 'project-123' }
      ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

      await createKnowledgeBaseFromInnovation(innovationWithValue, userId)

      const callArgs = (knowledgeBaseService.createEntry as jest.Mock).mock.calls[0][0]
      expect(callArgs.value_metrics).toBeDefined()
      expect(callArgs.value_metrics.cost_savings).toBeGreaterThan(0)
    })

    it('should include replication guide from additional data', async () => {
      const mockEntry = { id: 'entry-123', project_id: 'project-123' }
      ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

      const additionalData = {
        replication_guide: {
          steps: ['Step 1', 'Step 2'],
          prerequisites: ['Prereq 1'],
          resources_needed: ['Resource 1'],
          estimated_effort: '2 weeks',
          risks: ['Risk 1']
        }
      }

      await createKnowledgeBaseFromInnovation(mockInnovation, userId, additionalData)

      expect(knowledgeBaseService.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          replication_guide: expect.objectContaining({
            steps: ['Step 1', 'Step 2'],
            prerequisites: ['Prereq 1'],
            resources_needed: ['Resource 1'],
            estimated_effort: '2 weeks',
            risks: ['Risk 1']
          })
        }),
        userId
      )
    })

    it('should map innovation types correctly', async () => {
      const innovationTypes = [
        { type: 'patent_opportunity', expectedType: 'innovation', expectedCategory: 'technical_approach' },
        { type: 'process_improvement', expectedType: 'process_improvement', expectedCategory: 'other' },
        { type: 'technology_innovation', expectedType: 'technology_innovation', expectedCategory: 'technical_approach' },
        { type: 'efficiency_gain', expectedType: 'efficiency_improvement', expectedCategory: 'resource_management' }
      ]

      for (const { type, expectedType, expectedCategory } of innovationTypes) {
        const innovation = { ...mockInnovation, opportunity_type: type }
        const mockEntry = { id: 'entry-123', project_id: 'project-123' }
        
        ;(knowledgeBaseService.createEntry as jest.Mock).mockResolvedValueOnce(mockEntry)

        await createKnowledgeBaseFromInnovation(innovation, userId)

        expect(knowledgeBaseService.createEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            entry_type: expectedType,
            category: expectedCategory
          }),
          userId
        )

        jest.clearAllMocks()
      }
    })
  })
})
