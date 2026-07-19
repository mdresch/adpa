import { agentRegistryService } from './AgentRegistry';

/**
 * PMBOK Process Mapping
 * Maps the 49 PMBOK processes to agents.
 */
export const PMBOK_PROCESS_MAPPING: Record<string, { primary_agent: string; supporting_agents: string[] }> = {
  'Develop Project Charter': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Identify Stakeholders': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Develop Project Management Plan': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-RISK-001', 'AGT-FINANCE-001', 'AGT-QA-001'] },
  'Plan Scope Management': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-BA-001'] },
  'Collect Requirements': { primary_agent: 'AGT-BA-001', supporting_agents: ['AGT-PM-001', 'AGT-STAKEHOLDER-001'] },
  'Define Scope': { primary_agent: 'AGT-BA-001', supporting_agents: ['AGT-PM-001'] },
  'Create WBS': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-BA-001'] },
  'Plan Schedule Management': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Define Activities': { primary_agent: 'AGT-WS-LEAD-001', supporting_agents: ['AGT-PM-001'] },
  'Sequence Activities': { primary_agent: 'AGT-WS-LEAD-001', supporting_agents: ['AGT-PM-001'] },
  'Estimate Activity Durations': { primary_agent: 'AGT-WS-LEAD-001', supporting_agents: ['AGT-PM-001'] },
  'Develop Schedule': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Plan Cost Management': { primary_agent: 'AGT-FINANCE-001', supporting_agents: ['AGT-PM-001'] },
  'Estimate Costs': { primary_agent: 'AGT-FINANCE-001', supporting_agents: ['AGT-PM-001', 'AGT-WS-LEAD-001'] },
  'Determine Budget': { primary_agent: 'AGT-FINANCE-001', supporting_agents: ['AGT-PM-001'] },
  'Plan Quality Management': { primary_agent: 'AGT-QA-001', supporting_agents: ['AGT-PM-001'] },
  'Manage Quality': { primary_agent: 'AGT-QA-001', supporting_agents: ['AGT-PM-001'] },
  'Control Quality': { primary_agent: 'AGT-QA-001', supporting_agents: ['AGT-PM-001'] },
  'Plan Resource Management': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Estimate Activity Resources': { primary_agent: 'AGT-WS-LEAD-001', supporting_agents: ['AGT-PM-001'] },
  'Acquire Resources': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Develop Team': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Manage Team': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Control Resources': { primary_agent: 'AGT-WS-LEAD-001', supporting_agents: ['AGT-PM-001'] },
  'Plan Communications Management': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Manage Communications': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Monitor Communications': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Plan Risk Management': { primary_agent: 'AGT-RISK-001', supporting_agents: ['AGT-PM-001'] },
  'Identify Risks': { primary_agent: 'AGT-RISK-001', supporting_agents: ['AGT-PM-001', 'AGT-FINANCE-001'] },
  'Perform Qualitative Risk Analysis': { primary_agent: 'AGT-RISK-001', supporting_agents: ['AGT-PM-001'] },
  'Perform Quantitative Risk Analysis': { primary_agent: 'AGT-RISK-001', supporting_agents: ['AGT-FINANCE-001'] },
  'Plan Risk Responses': { primary_agent: 'AGT-RISK-001', supporting_agents: ['AGT-PM-001'] },
  'Implement Risk Responses': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-RISK-001'] },
  'Monitor Risks': { primary_agent: 'AGT-RISK-001', supporting_agents: ['AGT-PM-001'] },
  'Plan Procurement Management': { primary_agent: 'AGT-FINANCE-001', supporting_agents: ['AGT-PM-001'] },
  'Conduct Procurements': { primary_agent: 'AGT-FINANCE-001', supporting_agents: ['AGT-PM-001'] },
  'Control Procurements': { primary_agent: 'AGT-FINANCE-001', supporting_agents: ['AGT-PM-001'] },
  'Plan Stakeholder Engagement': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Manage Stakeholder Engagement': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Monitor Stakeholder Engagement': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-STAKEHOLDER-001'] },
  'Direct and Manage Project Work': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-WS-LEAD-001'] },
  'Manage Project Knowledge': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-BA-001'] },
  'Monitor and Control Project Work': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-QA-001'] },
  'Perform Integrated Change Control': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-RISK-001', 'AGT-FINANCE-001'] },
  'Close Project or Phase': { primary_agent: 'AGT-PM-001', supporting_agents: ['AGT-QA-001', 'AGT-FINANCE-001'] },
};

/**
 * Agent Orchestrator
 * Resolves tasks to agents based on the PMBOK mapping.
 */
export class AgentOrchestrator {
  /**
   * Resolve which agent should execute a PMBOK process
   */
  async resolveProcessToAgent(processName: string) {
    const mapping = PMBOK_PROCESS_MAPPING[processName];
    if (!mapping) {
      throw new Error(`Process ${processName} not found in PMBOK mapping.`);
    }

    const primaryAgent = agentRegistryService.getAgent(mapping.primary_agent);
    if (!primaryAgent) {
      throw new Error(`Primary agent ${mapping.primary_agent} for process ${processName} is not registered.`);
    }

    const supportingAgents = mapping.supporting_agents
      .map(id => agentRegistryService.getAgent(id))
      .filter(Boolean);

    return {
      primaryAgent,
      supportingAgents,
      mapping
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();
