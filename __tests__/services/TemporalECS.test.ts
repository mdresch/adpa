import { OrchestratorAgent } from '../../server/src/modules/agents/OrchestratorAgent'
import { AgentRegistry } from '../../server/src/modules/agents/AgentRegistry'
import { AIService } from '../../server/src/services/aiService'
import { globalTemporalMemoryStore } from '../../server/src/modules/agents/ecs/TemporalMemoryStore'

jest.mock('../../server/src/services/aiService')

describe('Phase 9: Temporal Reasoning & State Persistence', () => {
  let orchestrator: OrchestratorAgent
  let mockAiService: jest.Mocked<AIService>

  beforeEach(() => {
    jest.clearAllMocks()
    globalTemporalMemoryStore.clear()
    orchestrator = new OrchestratorAgent()
    mockAiService = (orchestrator as any).aiService
  })

  it('should increase confidence score over multiple stable runs', async () => {
    const projectId = 'test-proj-temporal'
    const goal = 'Test goal'
    
    // Mock standard responses
    const mockPlan = [{ id: 'task_1', goal: 'Test', domain: 'general' }]
    const mockAgent = { run: jest.fn().mockResolvedValue({ success: true, finalAnswer: 'Ans', history: [], metadata: {} }) }
    jest.spyOn(AgentRegistry, 'getAgent').mockReturnValue(mockAgent as any)

    mockAiService.generateWithFallback.mockResolvedValue({ content: JSON.stringify({
      type: 'agreement', content: 'OK', confidenceAdjustment: 0.1, justification: 'J', // Review
      finalAnswer: 'Synthesis', consensusScore: 90, // Consensus
      finalConclusion: 'Final', confidenceScore: 80, reasoningSteps: [] // ECS
    }) } as any)

    // Run 1
    const res1 = await orchestrator.orchestrate(goal, { projectId })
    const initialConfidence = res1.ecsResult?.confidenceScore || 0

    // Run 2
    const res2 = await orchestrator.orchestrate(goal, { projectId })
    const secondConfidence = res2.ecsResult?.confidenceScore || 0

    // Run 3
    const res3 = await orchestrator.orchestrate(goal, { projectId })
    const thirdConfidence = res3.ecsResult?.confidenceScore || 0

    expect(secondConfidence).toBeGreaterThan(initialConfidence)
    expect(thirdConfidence).toBeGreaterThan(secondConfidence)
    
    // Check memory
    const state = await globalTemporalMemoryStore.loadProjectState(projectId)
    expect(state.consensusHistory).toHaveLength(3)
  })
})
