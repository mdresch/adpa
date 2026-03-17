import { ECSEngine } from '../../server/src/modules/agents/ecs/ECSEngine'
import { SubGoalExecutionResult } from '../../server/src/modules/agents/OrchestrationTypes'
import { AIService } from '../../server/src/services/aiService'

// Mock AIService
jest.mock('../../server/src/services/aiService')

describe('ECSEngine', () => {
  let ecsEngine: ECSEngine
  let mockAiService: jest.Mocked<AIService>

  beforeEach(() => {
    jest.clearAllMocks()
    ecsEngine = new ECSEngine()
    // Access the private synthesisEngine's aiService for mocking
    mockAiService = (ecsEngine as any).synthesisEngine.aiService
  })

  it('should evaluate results and produce a synthesized ECSResult', async () => {
    const results: Record<string, SubGoalExecutionResult> = {
      'task_1': {
        goalId: 'task_1',
        success: true,
        finalAnswer: 'Evidence from task 1',
        history: [],
        durationMs: 100,
        endTime: new Date().toISOString()
      },
      'task_2': {
        goalId: 'task_2',
        success: true,
        finalAnswer: 'Evidence from task 2',
        history: [],
        durationMs: 150,
        endTime: new Date().toISOString()
      }
    }

    const mockSynthesisResponse = {
      finalConclusion: 'Synthesized conclusion',
      confidenceScore: 90,
      justification: 'Weighted synthesis of task 1 and task 2',
      reasoningSteps: [
        { type: 'aggregation', justification: 'Combined multiple sources', authorityScore: 0.9 }
      ]
    }

    mockAiService.generateWithFallback.mockResolvedValueOnce({
      content: JSON.stringify(mockSynthesisResponse)
    } as any)

    const result = await ecsEngine.evaluate('Test goal', results, { primaryDomain: 'discovery' })

    expect(result.finalConclusion).toBe('Synthesized conclusion')
    expect(result.confidenceScore).toBe(90)
    expect(result.evidenceGraph).toHaveLength(2)
    expect(result.reasoningChain).toHaveLength(1)
    
    // Check if weighting was applied (AuthorityScoring.calculateWeight)
    // Default weight is 0.5, plus bonuses for matching domain (if we had it in evidence)
    // For now, raw nodes default to domain 'general' in ECSEngine.ts
    expect(result.evidenceGraph[0].weight).toBeDefined()
  })
})
