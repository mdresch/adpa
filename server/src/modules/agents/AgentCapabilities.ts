import { ToolCapability } from './ToolContract'

/**
 * Defines the capabilities and domain expertise of an agent.
 */
export interface AgentCapabilityProfile {
  supportedCapabilities: ToolCapability[]
  preferredDomains: string[]
  authorityMultiplier: number // Base multiplier for ECS weighting (0.5 to 2.0)
}

/**
 * Mapping of specialized agent types to their capability profiles.
 */
export const AGENT_CAPABILITY_PROFILES: Record<string, AgentCapabilityProfile> = {
  'pmbok': {
    supportedCapabilities: ['create_tasks', 'decompose_tasks', 'analyze_risks', 'generate_report'],
    preferredDomains: ['pmbok'],
    authorityMultiplier: 1.2
  },
  'discovery': {
    supportedCapabilities: ['search_documents', 'fetch_project_data'],
    preferredDomains: ['discovery'],
    authorityMultiplier: 1.1
  },
  'integration': {
    supportedCapabilities: ['sync_external_system', 'fetch_project_data'],
    preferredDomains: ['integration'],
    authorityMultiplier: 1.0
  },
  'general': {
    supportedCapabilities: ['general_utility'],
    preferredDomains: ['general'],
    authorityMultiplier: 0.8
  }
}
