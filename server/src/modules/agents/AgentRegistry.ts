/**
 * Agent Registry for ADPA
 * Maps domains to agent classes
 */

import { BaseAgent } from './BaseAgent'
import { GeneralPurposeAgent } from './GeneralPurposeAgent'
import { PMBOKProcessAgent, createPmbokAgents } from '../pmbok6/PMBOKProcessAgent'
import { AGENT_CAPABILITY_PROFILES } from './AgentCapabilities'

export type AgentDomain = 'pmbok' | 'discovery' | 'integration' | 'general'

/**
 * A simple specialized agent for Discovery if we don't have a standalone one yet
 */
class DiscoveryAgent extends GeneralPurposeAgent {
  constructor() {
    super()
    this.capabilityProfile = AGENT_CAPABILITY_PROFILES['discovery']
  }
  protected override systemPrompt = `You are an ADPA Discovery Agent.
    Your primary goal is to find relevant information in internal documentation and external web sources.
    Use the available search tools extensively.`
}

/**
 * Registry to handle agent instantiation by domain
 */
export class AgentRegistry {
  private static pmbokAgents = createPmbokAgents()

  /**
   * Instantiate an agent for the given domain
   */
  static getAgent(domain: AgentDomain, specialty?: string): BaseAgent {
    let agent: BaseAgent

    switch (domain) {
      case 'pmbok':
        if (specialty && this.pmbokAgents[specialty]) {
          agent = this.pmbokAgents[specialty]
        } else {
          agent = this.pmbokAgents['4.1'] || new GeneralPurposeAgent()
        }
        agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['pmbok']
        break
      
      case 'discovery':
        agent = new DiscoveryAgent()
        break
      
      case 'integration':
        agent = new GeneralPurposeAgent()
        agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['integration']
        break
      
      case 'general':
      default:
        agent = new GeneralPurposeAgent()
        agent.capabilityProfile = AGENT_CAPABILITY_PROFILES['general']
    }

    return agent
  }

  /**
   * List all available PMBOK process codes
   */
  static getAvailablePmbokProcesses(): string[] {
    return Object.keys(this.pmbokAgents)
  }
}
