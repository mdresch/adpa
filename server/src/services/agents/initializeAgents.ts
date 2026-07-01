import { agentRegistryService } from './AgentRegistry';
import { AGENT_SEED_DATA } from './agentSeedData';

export async function initializeAgentRegistry(): Promise<void> {
  await agentRegistryService.initializeRegistry(AGENT_SEED_DATA);
}
