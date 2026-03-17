import { GeneralPurposeAgent } from '../../modules/agents/GeneralPurposeAgent'
import { ToolRegistry } from '../../modules/agents/ToolRegistry'
import { AIService } from '../../services/aiService'

jest.mock('../../services/aiService')

describe('GeneralPurposeAgent', () => {
  let agent: GeneralPurposeAgent
  let toolRegistry: ToolRegistry
  let mockAIService: jest.Mocked<AIService>

  beforeEach(() => {
    toolRegistry = new ToolRegistry()
    mockAIService = new AIService() as jest.Mocked<AIService>
    agent = new GeneralPurposeAgent(toolRegistry)
    // Actually BaseAgent creates its own AIService, so we need to mock the module
  })

  it('should take a thought and return a final answer', async () => {
    const mockResponse = {
      content: "Thought: I should finish. Final Answer: The goal is achieved.",
      provider: 'test',
      model: 'test',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }

    // Mocking the prototype because AIService is instantiated inside BaseAgent
    jest.spyOn(AIService.prototype, 'generateWithFallback').mockResolvedValue({
      ...mockResponse,
      providerUsed: 'test'
    })

    const result = await agent.run("Test Goal")
    expect(result.success).toBe(true)
    expect(result.finalAnswer).toBe("The goal is achieved.")
  })

  it('should execute a tool when requested', async () => {
    const mockTool = {
      name: 'get_weather',
      description: 'Get weather',
      parameters: {},
      execute: jest.fn().mockResolvedValue({ temp: 72 })
    }
    toolRegistry.registerTool(mockTool)

    const thoughts = [
      {
        content: "Thought: I need weather. Action: get_weather({})",
        provider: 'test',
        model: 'test',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        providerUsed: 'test'
      },
      {
        content: "Thought: It is nice. Final Answer: Weather is 72.",
        provider: 'test',
        model: 'test',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        providerUsed: 'test'
      }
    ]

    let callCount = 0
    jest.spyOn(AIService.prototype, 'generateWithFallback').mockImplementation(async () => {
      return thoughts[callCount++]
    })

    const result = await agent.run("What is the weather?")
    
    expect(mockTool.execute).toHaveBeenCalled()
    expect(result.finalAnswer).toBe("Weather is 72.")
    expect(result.history).toHaveLength(4) // Thought, Action, Observation, Thought (Final Answer)
  })
})
