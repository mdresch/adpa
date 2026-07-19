import { z } from 'zod';

/**
 * ADPA Agent Registry Types
 * Aligned with V7-STRICT governance and ECS principles.
 */

export const AuthorityFrameworkSchema = z.enum(['PMBOK', 'BABOK', 'DMBOK', 'ISO']);

export const AgentTierSchema = z.enum(['Governance-T1', 'Governance-T2', 'Operational-T3']);

export const AgentCriticalitySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);

export const ExecutionModeSchema = z.enum(['DETERMINISTIC', 'PROBABILISTIC', 'HYBRID']);

export const IsolationLevelSchema = z.enum(['GLOBAL', 'PROJECT_SCOPED', 'ROLE_SCOPED']);

export const AgentDefinitionSchema = z.object({
  agent_id: z.string().regex(/^AGT-/, 'Agent ID must start with AGT-'),
  role_id: z.string().regex(/^ROLE-/, 'Role ID must start with ROLE-'),
  name: z.string(),
  classification: z.object({
    domain: z.string(),
    tier: AgentTierSchema,
    criticality: AgentCriticalitySchema,
  }),
  authority: z.object({
    standards: z.array(z.string()),
    decision_scope: z.array(z.string()),
    escalation_path: z.array(z.string()),
  }),
  responsibilities: z.array(z.object({
    id: z.string().regex(/^RESP-/, 'Responsibility ID must start with RESP-'),
    description: z.string(),
    success_criteria: z.array(z.string()).optional(),
  })),
  capabilities: z.array(z.string()),
  inputs: z.object({
    required: z.array(z.string()),
    optional: z.array(z.string()).optional(),
  }),
  outputs: z.array(z.object({
    type: z.string(),
    format: z.string(),
  })),
  execution: z.object({
    mode: ExecutionModeSchema,
    retry_policy: z.object({
      retries: z.number().int().nonnegative(),
      condition: z.string(),
    }),
  }),
  rules: z.object({
    validation_rules: z.array(z.object({
      id: z.string().regex(/^VAL-/, 'Validation rule ID must start with VAL-'),
      description: z.string(),
    })),
  }),
  knowledge_base: z.object({
    skb_id: z.string().regex(/^SKB-/, 'SKB ID must start with SKB-'),
    layers: z.object({
      ontology: z.string(),
      authority_sources: z.array(z.string()),
      evidence: z.array(z.string()),
      execution_assets: z.array(z.string()),
    }),
  }),
  context_policy: z.object({
    isolation_level: IsolationLevelSchema,
    shared_context_access: z.array(z.string()),
  }),
  observability: z.object({
    logging: z.object({
      level: z.string(),
      store: z.string(),
    }),
    metrics: z.array(z.string()),
  }),
  compliance: z.object({
    audit_required: z.boolean(),
    traceability: z.object({
      enabled: z.boolean(),
      hash_algorithm: z.string(),
    }),
  }),
  lifecycle: z.object({
    version: z.string(),
    status: z.string(),
    last_updated: z.string(),
  }),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export const AgentRelationshipSchema = z.object({
  relationship_id: z.string().regex(/^REL-AGT-/, 'Relationship ID must start with REL-AGT-'),
  source_agent: z.string(),
  target_agent: z.string(),
  type: z.string(),
  description: z.string(),
  interaction_mode: z.enum(['SEQUENTIAL', 'PARALLEL', 'ITERATIVE']),
  data_exchange: z.object({
    format: z.string(),
  }),
  constraints: z.array(z.string()),
});

export type AgentRelationship = z.infer<typeof AgentRelationshipSchema>;

export const SemanticKnowledgeBaseSchema = z.object({
  skb_id: z.string().regex(/^SKB-/, 'SKB ID must start with SKB-'),
  ontology_layer: z.object({
    concepts: z.array(z.string()),
    relationships: z.array(z.string()),
  }),
  authority_layer: z.object({
    standards: z.array(z.object({
      name: z.string(),
      weight: z.number().min(0).max(1),
    })),
  }),
  evidence_layer: z.object({
    sources: z.array(z.string()),
  }),
  execution_layer: z.object({
    templates: z.array(z.string()),
    rulesets: z.array(z.string()),
  }),
});

export type SemanticKnowledgeBase = z.infer<typeof SemanticKnowledgeBaseSchema>;

export const RegistryPolicySchema = z.object({
  policy_id: z.string().regex(/^POL-AGT-/, 'Policy ID must start with POL-AGT-'),
  name: z.string(),
  rules: z.array(z.string()),
  enforcement: z.object({
    mechanism: z.string(),
    failure_action: z.string(),
  }),
});

export type RegistryPolicy = z.infer<typeof RegistryPolicySchema>;

export const AgentRegistrySchema = z.object({
  version: z.string(),
  governance_mode: z.string(),
  authority_framework: z.array(AuthorityFrameworkSchema),
  agents: z.array(AgentDefinitionSchema),
  relationships: z.array(AgentRelationshipSchema),
  policies: z.array(RegistryPolicySchema),
});

export type AgentRegistry = z.infer<typeof AgentRegistrySchema>;
