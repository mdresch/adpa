/**
 * Gemini Agent for ADPA
 * Specialized agent focused on implementation and local automation.
 */

import { GeneralPurposeAgent } from './GeneralPurposeAgent'
import { AGENT_CAPABILITY_PROFILES } from './AgentCapabilities'

export class GeminiAgent extends GeneralPurposeAgent {
  constructor() {
    super()
    this.capabilityProfile = AGENT_CAPABILITY_PROFILES['gemini']
    this.systemPrompt = `You are ADPA Gemini CLI, the Implementation Specialist.
    Your focus is on rapid code implementation, local environment automation, and Git workflows.
    You execute the heavy lifting of coding, run local tests, and ensure repository health.
    Adhere to the project's coding standards and provide surgical, high-quality updates.`
  }
}
