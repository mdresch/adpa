import { OrchestratorAgent } from '../../server/src/modules/agents/OrchestratorAgent'
import { AgentRegistry } from '../../server/src/modules/agents/AgentRegistry'
import { AIService } from '../../server/src/services/aiService'
import { BaseAgent, AgentResult } from '../../server/src/modules/agents/BaseAgent'

// Mock AIService
jest.mock('../../server/src/services/aiService')

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent
  let mockAiService: jest.Mocked<AIService>

  beforeEach(() => {
    jest.clearAllMocks()
    orchestrator = new OrchestratorAgent()
    // Access the private aiService for mocking
    mockAiService = (orchestrator as any).aiService
  })

  it('should plan and execute subgoals in parallel', async () => {
    // 1. Mock the plan response
    const mockPlan = [
      { id: 'task_1', goal: 'Discovery task', domain: 'discovery' },
      { id: 'task_2', goal: 'PMBOK task', domain: 'pmbok', dependsOn: ['task_1'] },
      { id: 'task_3', goal: 'Another discovery', domain: 'discovery' }
    ]

    mockAiService.generateWithFallback
      .mockResolvedValueOnce({ content: JSON.stringify(mockPlan) } as any) // For plan()
      .mockResolvedValueOnce({ content: 'Final Synthesis' } as any) // For summarizeResults()

    // 2. Mock AgentRegistry.getAgent
    const mockAgent = {
      run: jest.fn().mockResolvedValue({
        success: true,
        finalAnswer: 'Task completed',
        history: []
      } as AgentResult)
    } as unknown as BaseAgent

    const getAgentSpy = jest.spyOn(AgentRegistry, 'getAgent').mockReturnValue(mockAgent)

    // 3. Run orchestration
    const result = await orchestrator.orchestrate('Test goal', {}, 'parallel')

    // 4. Verify
    expect(result.success).toBe(true)
    expect(result.plan).toHaveLength(3)
    expect(result.summary).toBe('Final Synthesis')
    expect(result.executionStats?.mode).toBe('parallel')
    
    // Check that getAgent was called for each subgoal
    expect(getAgentSpy).toHaveBeenCalledTimes(3)
    
    // Check execution order logic indirectly via number of batches
    // task_1 and task_3 should be in batch 1, task_2 in batch 2
    // So agent.run should have been called
    expect(mockAgent.run).toHaveBeenCalledTimes(3)
    
    getAgentSpy.mockRestore()
  })

  it('should handle failures in subgoals gracefully', async () => {
    // 1. Mock the plan response
    const mockPlan = [
      { id: 'task_1', goal: 'Failing task', domain: 'discovery' }
    ]

    mockAiService.generateWithFallback
      .mockResolvedValueOnce({ content: JSON.stringify(mockPlan) } as any)
      .mockResolvedValueOnce({ content: 'Summary of failure' } as any)

    // 2. Mock a failing agent
    const mockFailingAgent = {
      run: jest.fn().mockResolvedValue({
        success: false,
        finalAnswer: 'Task failed',
        history: []
      } as AgentResult)
    } as unknown as BaseAgent

    const getAgentSpy = jest.spyOn(AgentRegistry, 'getAgent').mockReturnValue(mockFailingAgent)

    // 3. Run orchestration
    const result = await orchestrator.orchestrate('Test goal')

    // 4. Verify
    expect(result.success).toBe(false)
    expect(result.results['task_1'].success).toBe(false)
    
    getAgentSpy.mockRestore()
  })
})
