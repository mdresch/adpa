/**
 * Agent Registry for ADPA
 * Maps domains to agent classes.
 *
 * IMPORTANT: Agents are instantiated fresh on each call to `getAgent()` rather than
 * being stored as shared singletons. BaseAgent accumulates mutable state (this.history)
 * during a run, so sharing a single instance across concurrent requests would corrupt
 * per-request execution traces.
 */

import { BaseAgent } from './BaseAgent'
import { GeneralPurposeAgent } from './GeneralPurposeAgent'
import { DiscoveryAgent } from './DiscoveryAgent'
import { PMBOKProcessAgent } from '../pmbok6/PMBOKProcessAgent'
import { PMBOK6_PROCESSES } from '../../../../types/pmbok6-data'
import { AGENT_CAPABILITY_PROFILES } from './AgentCapabilities'

export type AgentDomain = 'pmbok' | 'discovery' | 'integration' | 'general'

/**
 * Registry to handle agent instantiation by domain.
 * PMBOK process data is cached at class-load time but individual PMBOKProcessAgent
 * instances are created fresh on every getAgent() call to avoid shared mutable state.
 */
export class AgentRegistry {
  // Pre-index PMBOK process data by code for fast lookup
  private static pmbokProcessData: Record<string, (typeof PMBOK6_PROCESSES)[number]> = (() => {
    const map: Record<string, (typeof PMBOK6_PROCESSES)[number]> = {}
    PMBOK6_PROCESSES.forEach(p => { map[p.code] = p })
    return map
  })()

  /**
   * Instantiates a new agent for the given domain on every call.
   * This is intentional — agents carry mutable state (history) during a run
   * and must not be shared between concurrent requests.
   */
  static getAgent(domain: AgentDomain, specialty?: string): BaseAgent {
    switch (domain) {
      case 'pmbok': {
        const processCode = specialty && this.pmbokProcessData[specialty]
          ? specialty
          : '4.1'
        const p = this.pmbokProcessData[processCode]

        if (!p) {
          // Fallback if the process code isn't found
          const agent = new GeneralPurposeAgent()
          agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['pmbok']
          return agent
        }

        // Create a fresh instance using the stored process data
        const agent = new PMBOKProcessAgent(
          p.code,
          p.name,
          p.description,
          p.inputs,
          p.tools,
          p.outputs,
          p.knowledgeArea
        )
        agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['pmbok']
        return agent
      }

      case 'discovery':
        return new DiscoveryAgent()

      case 'integration': {
        const agent = new GeneralPurposeAgent()
        agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['integration']
        return agent
      }

      case 'general':
      default: {
        const agent = new GeneralPurposeAgent()
        agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['general']
        return agent
      }
    }
  }

  /**
   * List all available PMBOK process codes
   */
  static getAvailablePmbokProcesses(): string[] {
    return Object.keys(this.pmbokProcessData)
  }
}
