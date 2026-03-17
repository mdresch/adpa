import { OrchestratorAgent } from '../../server/src/modules/agents/OrchestratorAgent'
import { AgentRegistry } from '../../server/src/modules/agents/AgentRegistry'
import { AIService } from '../../server/src/services/aiService'

jest.mock('../../server/src/services/aiService')

describe('Phase 8: Multi-Agent Consensus', () => {
  let orchestrator: OrchestratorAgent
  let mockAiService: jest.Mocked<AIService>

  beforeEach(() => {
    jest.clearAllMocks()
    orchestrator = new OrchestratorAgent()
    mockAiService = (orchestrator as any).aiService
  })

  it('should execute the three-pass refinement cycle (Execute -> Review -> Consensus)', async () => {
    // 1. Mock Plan
    const mockPlan = [{ id: 'task_1', goal: 'Test', domain: 'discovery' }]
    
    // 2. Mock Agent Execution
    const mockAgent = {
      run: jest.fn().mockResolvedValue({
        success: true,
        finalAnswer: 'Initial finding',
        history: [],
        metadata: { provider: 'test', model: 'test' }
      })
    }
    jest.spyOn(AgentRegistry, 'getAgent').mockReturnValue(mockAgent as any)

    // 3. Mock AI Service responses for Plan, Review, and Consensus
    mockAiService.generateWithFallback
      .mockResolvedValueOnce({ content: JSON.stringify(mockPlan) } as any) // Pass 1: Plan
      .mockResolvedValueOnce({ content: JSON.stringify({ 
          type: 'agreement', 
          content: 'I agree', 
          confidenceAdjustment: 0.1, 
          justification: 'Looks good' 
        }) } as any) // Pass 2: Review
      .mockResolvedValueOnce({ content: JSON.stringify({ 
          finalAnswer: 'Consensus Answer', 
          consensusScore: 95, 
          justification: 'Peer reviewed' 
        }) } as any) // Pass 3: Consensus
      .mockResolvedValueOnce({ content: JSON.stringify({ 
          finalConclusion: 'ECS Answer', 
          confidenceScore: 90, 
          reasoningSteps: [] 
        }) } as any) // Pass 4: ECS Engine (internal)

    // 4. Orchestrate
    const result = await orchestrator.orchestrate('Target goal', { provider: 'test', model: 'test' })

    // 5. Verify
    expect(result.summary).toBe('Consensus Answer')
    expect(result.results['task_1'].reviews).toHaveLength(1)
    expect(result.results['task_1'].reviews?.[0].type).toBe('agreement')
    
    // Check call counts: 1 (plan) + 1 (review) + 1 (consensus) + 1 (ecs) = 4
    expect(mockAiService.generateWithFallback).toHaveBeenCalledTimes(4)
  })
})
