/**
 * Discovery Agent for ADPA
 * Specialized agent focused on finding relevant information in
 * internal documentation and external web sources.
 */

import { GeneralPurposeAgent } from './GeneralPurposeAgent'
import { AGENT_CAPABILITY_PROFILES } from './AgentCapabilities'

export class DiscoveryAgent extends GeneralPurposeAgent {
  constructor() {
    super()
    this.capabilityProfile = AGENT_CAPABILITY_PROFILES['discovery']
  }

  protected override systemPrompt = `You are an ADPA Discovery Agent.
    Your primary goal is to find relevant information in internal documentation and external web sources.
    Use the available search tools extensively.`
}
