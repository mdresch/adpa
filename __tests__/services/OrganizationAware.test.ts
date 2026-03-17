import { ToolRegistry, BaseTool } from '../../server/src/modules/agents/ToolRegistry'
import { OrganizationPolicyEngine } from '../../server/src/modules/agents/OrganizationPolicyEngine'
import { ResolvedContext } from '../../server/src/modules/agents/OrganizationalContext'
import { AuthorityScoring } from '../../server/src/modules/agents/ecs/AuthorityScoring'

describe('Phase 7: Organization-Aware Routing', () => {
  let registry: ToolRegistry

  class PolicyTool extends BaseTool {
    constructor(public name: string) { super() }
    description = 'Test'
    parameters = {}
    contract = {
      capability: 'search_documents' as any,
      domain: 'discovery' as any,
      reliabilityScore: 0.9
    }
    async execute() { return {} }
  }

  const mockContext: ResolvedContext = {
    projectId: 'p1',
    policies: [
      {
        id: 'pol1',
        rules: {
          restrictedTools: ['restricted_tool'],
          ecsWeightOverrides: { 'discovery': 1.5 }
        }
      }
    ],
    metadata: {}
  }

  beforeEach(() => {
    registry = new ToolRegistry()
  })

  it('should restrict tools based on organizational policy', () => {
    const allowed = new PolicyTool('allowed_tool')
    const restricted = new PolicyTool('restricted_tool')
    
    registry.registerTool(allowed)
    registry.registerTool(restricted)

    const tool = registry.getToolByCapability('search_documents', mockContext)
    expect(tool?.name).toBe('allowed_tool')
  })

  it('should apply policy-driven weight overrides in ECS', () => {
    const node: any = {
      domain: 'discovery',
      sourceType: 'tool',
      timestamp: new Date().toISOString(),
      metadata: {}
    }

    const weight = AuthorityScoring.calculateWeight(node, { resolvedContext: mockContext })
    
    // Base 0.5 + 0.05 (tool) = 0.55
    // Policy override for 'discovery' is 1.5x
    // Expected: 0.55 * 1.5 = 0.825
    expect(weight).toBeCloseTo(0.825)
  })
})
