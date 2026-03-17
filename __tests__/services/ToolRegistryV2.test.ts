import { ToolRegistry, BaseTool } from '../../server/src/modules/agents/ToolRegistry'
import { ToolCapability } from '../../server/src/modules/agents/ToolContract'

describe('ToolRegistry Phase 4 - Contract-Driven', () => {
  let registry: ToolRegistry

  class MockSearchTool extends BaseTool {
    name = 'mockSearch'
    description = 'Mock search tool'
    parameters = {}
    contract = {
      capability: 'search_documents' as ToolCapability,
      domain: 'discovery' as const,
      reliabilityScore: 0.8,
      validateInput: (args: any) => {
        if (!args.q) throw new Error('Missing q')
        return { query: args.q }
      },
      transformOutput: (out: any) => ({ results: out.items })
    }

    async execute(args: any) {
      return { items: [`Result for ${args.query}`] }
    }
  }

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  it('should register and find a tool by capability', () => {
    const tool = new MockSearchTool()
    registry.registerTool(tool)

    const found = registry.getToolByCapability('search_documents')
    expect(found).toBeDefined()
    expect(found?.name).toBe('mockSearch')
  })

  it('should validate input via contract', async () => {
    const tool = new MockSearchTool()
    
    // Call with wrong input schema for the contract (uses 'q' instead of 'query')
    const result = await tool.call({ q: 'test' })
    
    expect(result.success).toBe(true)
    expect(result.data.results).toContain('Result for test')
    expect(result.metadata?.evidenceWeight).toBe(0.8)
  })

  it('should fail if contract validation fails', async () => {
    const tool = new MockSearchTool()
    const result = await tool.call({}) // Missing 'q'
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Missing q')
    expect(result.metadata?.evidenceWeight).toBe(0.1)
  })

  it('should select the most reliable tool for a capability', () => {
    const lowReliabilityTool = new MockSearchTool()
    lowReliabilityTool.name = 'low'
    if (lowReliabilityTool.contract) lowReliabilityTool.contract.reliabilityScore = 0.5

    const highReliabilityTool = new MockSearchTool()
    highReliabilityTool.name = 'high'
    if (highReliabilityTool.contract) highReliabilityTool.contract.reliabilityScore = 0.9

    registry.registerTool(lowReliabilityTool)
    registry.registerTool(highReliabilityTool)

    const selected = registry.getToolByCapability('search_documents')
    expect(selected?.name).toBe('high')
  })
})
