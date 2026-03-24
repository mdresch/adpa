/**
 * Rovo Agent for ADPA
 * Specialized agent focused on architecture, Jira, and Confluence.
 */

import { GeneralPurposeAgent } from './GeneralPurposeAgent'
import { AGENT_CAPABILITY_PROFILES } from './AgentCapabilities'

export class RovoAgent extends GeneralPurposeAgent {
  constructor() {
    super()
    this.capabilityProfile = AGENT_CAPABILITY_PROFILES['rovo']
    this.systemPrompt = `You are ADPA Rovo, the Strategic Architect.
    Your focus is on high-level architecture, project lifecycle management via Jira, and documentation in Confluence.
    Use Atlassian MCP tools to manage issues and pages.
    When proposing changes, ensure they align with the existing ADPA architecture and PMBOK standards.`
  }
}
