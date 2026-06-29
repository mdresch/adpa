import { logger } from '../../utils/logger';
import { 
  AgentDefinition, 
  AgentRelationship, 
  SemanticKnowledgeBase, 
  RegistryPolicy, 
  AgentRegistry,
  AgentDefinitionSchema,
  AgentRelationshipSchema,
  SemanticKnowledgeBaseSchema,
  RegistryPolicySchema
} from '../../types/agents';

/**
 * Agent Registry Service
 * 
 * Manages the role-driven agent execution model.
 * Handles registration, resolution, and validation of agents and their knowledge bases.
 */
export class AgentRegistryService {
  private agents = new Map<string, AgentDefinition>();
  private relationships = new Map<string, AgentRelationship>();
  private knowledgeBases = new Map<string, SemanticKnowledgeBase>();
  private policies = new Map<string, RegistryPolicy>();

  /**
   * Register an agent definition
   */
  registerAgent(definition: any): void {
    const validated = AgentDefinitionSchema.parse(definition);
    this.agents.set(validated.agent_id, validated);
    logger.debug(`[AGENT-REGISTRY] Registered agent: ${validated.agent_id} (${validated.name})`);
  }

  /**
   * Register a relationship between agents
   */
  registerRelationship(relationship: any): void {
    const validated = AgentRelationshipSchema.parse(relationship);
    this.relationships.set(validated.relationship_id, validated);
    logger.debug(`[AGENT-REGISTRY] Registered relationship: ${validated.relationship_id}`);
  }

  /**
   * Register a semantic knowledge base
   */
  registerKnowledgeBase(skb: any): void {
    const validated = SemanticKnowledgeBaseSchema.parse(skb);
    this.knowledgeBases.set(validated.skb_id, validated);
    logger.debug(`[AGENT-REGISTRY] Registered SKB: ${validated.skb_id}`);
  }

  /**
   * Register a registry policy
   */
  registerPolicy(policy: any): void {
    const validated = RegistryPolicySchema.parse(policy);
    this.policies.set(validated.policy_id, validated);
    logger.debug(`[AGENT-REGISTRY] Registered policy: ${validated.policy_id}`);
  }

  /**
   * Resolve a role to an agent
   */
  resolveRoleToAgent(roleId: string): AgentDefinition | null {
    for (const agent of this.agents.values()) {
      if (agent.role_id === roleId) {
        return agent;
      }
    }
    return null;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentDefinition | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get SKB for an agent
   */
  getSKBForAgent(agentId: string): SemanticKnowledgeBase | null {
    const agent = this.getAgent(agentId);
    if (!agent) return null;
    return this.knowledgeBases.get(agent.knowledge_base.skb_id) || null;
  }

  /**
   * Get relationships for an agent
   */
  getRelationshipsForAgent(agentId: string): AgentRelationship[] {
    return Array.from(this.relationships.values()).filter(
      rel => rel.source_agent === agentId || rel.target_agent === agentId
    );
  }

  /**
   * Get all registered agents
   */
  getAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Initialize registry with seed data (to be expanded)
   */
  async initializeRegistry(seedData?: any): Promise<void> {
    if (!seedData) return;

    if (seedData.agents) {
      seedData.agents.forEach((a: any) => this.registerAgent(a));
    }
    if (seedData.relationships) {
      seedData.relationships.forEach((r: any) => this.registerRelationship(r));
    }
    if (seedData.knowledgeBases) {
      seedData.knowledgeBases.forEach((k: any) => this.registerKnowledgeBase(k));
    }
    if (seedData.policies) {
      seedData.policies.forEach((p: any) => this.registerPolicy(p));
    }

    logger.info('[AGENT-REGISTRY] Registry initialized', {
      agentCount: this.agents.size,
      relationshipCount: this.relationships.size,
      skbCount: this.knowledgeBases.size,
      policyCount: this.policies.size,
    });
  }
}

export const agentRegistryService = new AgentRegistryService();
