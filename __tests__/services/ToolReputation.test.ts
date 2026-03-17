import { ToolRegistry, BaseTool } from '../../server/src/modules/agents/ToolRegistry'
import { ToolCapability } from '../../server/src/modules/agents/ToolContract'
import { globalToolReputationService } from '../../server/src/modules/agents/ecs/ToolReputationService'

describe('ToolReputation Phase 6 - Adaptive Learning', () => {
  let registry: ToolRegistry

  class TestTool extends BaseTool {
    constructor(public name: string, public reliability: number) {
      super()
    }
    description = 'Test tool'
    parameters = {}
    contract = {
      capability: 'search_documents' as ToolCapability,
      domain: 'discovery' as const,
      reliabilityScore: this.reliability
    }
    async execute(args: any) {
      if (args.fail) throw new Error('Simulated failure')
      return { ok: true }
    }
  }

  beforeEach(() => {
    registry = new ToolRegistry()
    // We can't easily reset a singleton without adding a reset method, 
    // but we can use unique tool names for each test.
  })

  it('should decrease reputation score on failure', async () => {
    const tool = new TestTool('failing_tool', 1.0)
    
    // Initial baseline (usually around 0.8)
    const initialScore = globalToolReputationService.getScore('failing_tool')
    
    // Record multiple failures
    for (let i = 0; i < 5; i++) {
      await tool.call({ fail: true })
    }
    
    const lowerScore = globalToolReputationService.getScore('failing_tool')
    expect(lowerScore).toBeLessThan(initialScore)
  })

  it('should influence tool selection through reputation', async () => {
    const toolA = new TestTool('tool_A', 0.9) // Higher reliability
    const toolB = new TestTool('tool_B', 0.8) // Lower reliability
    
    registry.registerTool(toolA)
    registry.registerTool(toolB)

    // Initially toolA should be selected
    expect(registry.getToolByCapability('search_documents')?.name).toBe('tool_A')

    // Tank toolA's reputation
    for (let i = 0; i < 20; i++) {
      await toolA.call({ fail: true })
    }

    // Now toolB should be selected because toolA's reputation tanked
    const selected = registry.getToolByCapability('search_documents')
    expect(selected?.name).toBe('tool_B')
  })
})
