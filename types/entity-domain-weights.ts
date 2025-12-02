/**
 * Entity Domain Weight Allocation System
 * 
 * Purpose: Distribute entities across domains based on their relevance weight.
 * Rule: Weights for each entity must sum to 100% (1.0)
 * 
 * Benefits:
 * - Total entities across domains equals total extracted entities
 * - Shows primary (highest weight) and secondary allocations
 * - Prevents double-counting confusion
 * - Accurate domain-specific analytics
 * 
 * Example:
 * milestones (57 extracted)
 * - Schedule: 57 × 0.60 = 34.2 entities (Primary 60%)
 * - Governance: 57 × 0.25 = 14.25 entities (Secondary 25%)
 * - Planning: 57 × 0.15 = 8.55 entities (Secondary 15%)
 * Total: 34.2 + 14.25 + 8.55 = 57.0 ✓
 */

import type { PmbokDomain } from './pmbok'

export interface EntityDomainWeight {
  domain: PmbokDomain
  weight: number // 0.0 to 1.0 (percentage as decimal)
  isPrimary: boolean // Highest weight = primary allocation
}

export type EntityWeightMap = Record<string, EntityDomainWeight[]>

/**
 * Weight allocation for each entity type across PMBOK domains
 * 
 * Rules:
 * 1. Weights for each entity must sum to 1.0 (100%)
 * 2. Highest weight = Primary allocation
 * 3. Other weights = Secondary allocations
 * 4. Single domain = 1.0 (100%) to that domain
 */
export const ENTITY_DOMAIN_WEIGHTS: EntityWeightMap = {
  // ==========================================================================
  // CORE ENTITIES - Distributed across Performance & Knowledge Domains
  // ==========================================================================
  
  // Stakeholders - Dual allocation
  stakeholders: [
    { domain: 'stakeholders', weight: 0.60, isPrimary: true },        // Performance Domain (Primary)
    { domain: 'stakeholders_ops', weight: 0.40, isPrimary: false }    // Knowledge Domain (Secondary)
  ],
  
  // Requirements - Dual allocation
  requirements: [
    { domain: 'scope', weight: 0.70, isPrimary: true },    // Scope Knowledge Domain (Primary)
    { domain: 'planning', weight: 0.30, isPrimary: false } // Planning Performance Domain (Secondary)
  ],
  
  // Risks - Dual allocation
  risks: [
    { domain: 'uncertainty', weight: 0.50, isPrimary: true }, // Performance Domain (Equal Primary)
    { domain: 'risk', weight: 0.50, isPrimary: true }         // Knowledge Domain (Equal Primary)
  ],
  
  // Milestones - Triple allocation
  milestones: [
    { domain: 'schedule', weight: 0.60, isPrimary: true },    // Schedule Knowledge Domain (Primary)
    { domain: 'governance', weight: 0.25, isPrimary: false }, // Governance Knowledge Domain (Secondary)
    { domain: 'planning', weight: 0.15, isPrimary: false }    // Planning Performance Domain (Secondary)
  ],
  
  // Constraints - Dual allocation
  constraints: [
    { domain: 'uncertainty', weight: 0.60, isPrimary: true }, // Uncertainty Performance Domain (Primary)
    { domain: 'risk', weight: 0.40, isPrimary: false }        // Risk Knowledge Domain (Secondary)
  ],
  
  // Success Criteria - Dual allocation
  success_criteria: [
    { domain: 'stakeholders', weight: 0.50, isPrimary: true },  // Stakeholders Performance (Equal Primary)
    { domain: 'measurement', weight: 0.50, isPrimary: true }    // Measurement Performance (Equal Primary)
  ],
  
  // Best Practices - Single allocation
  best_practices: [
    { domain: 'delivery', weight: 1.0, isPrimary: true } // Delivery Performance Domain (100%)
  ],
  
  // Phases - Dual allocation (60% Schedule, 40% Governance to sum to 100%)
  phases: [
    { domain: 'schedule', weight: 0.60, isPrimary: true },     // Schedule Knowledge Domain (Primary)
    { domain: 'governance', weight: 0.40, isPrimary: false }   // Governance Knowledge Domain (Secondary)
  ],
  
  // Resources - Dual allocation
  resources: [
    { domain: 'resources', weight: 0.60, isPrimary: true }, // Resources Knowledge Domain (Primary)
    { domain: 'team', weight: 0.40, isPrimary: false }      // Team Performance Domain (Secondary)
  ],
  
  // Technologies - Single allocation
  technologies: [
    { domain: 'development_approach', weight: 1.0, isPrimary: true } // Dev Approach Performance (100%)
  ],
  
  // Quality Standards - Single allocation
  quality_standards: [
    { domain: 'delivery', weight: 1.0, isPrimary: true } // Delivery Performance Domain (100%)
  ],
  
  // Compliance Security - Single allocation
  compliance_security: [
    { domain: 'governance', weight: 1.0, isPrimary: true } // Governance Knowledge Domain (100%)
  ],
  
  // Deliverables - Triple allocation
  deliverables: [
    { domain: 'scope', weight: 0.50, isPrimary: true },    // Scope Knowledge Domain (Primary)
    { domain: 'delivery', weight: 0.40, isPrimary: false }, // Delivery Performance Domain (Secondary)
    { domain: 'planning', weight: 0.10, isPrimary: false }  // Planning Performance Domain (Tertiary)
  ],
  
  // Scope Items - Dual allocation
  scope_items: [
    { domain: 'scope', weight: 0.70, isPrimary: true },    // Scope Knowledge Domain (Primary)
    { domain: 'planning', weight: 0.30, isPrimary: false } // Planning Performance Domain (Secondary)
  ],
  
  // Activities - Triple allocation
  activities: [
    { domain: 'schedule', weight: 0.60, isPrimary: true },           // Schedule Knowledge Domain (Primary)
    { domain: 'development_approach', weight: 0.25, isPrimary: false }, // Dev Approach Performance (Secondary)
    { domain: 'planning', weight: 0.15, isPrimary: false }           // Planning Performance Domain (Tertiary)
  ],
  
  // ==========================================================================
  // PMBOK 8 PERFORMANCE DOMAIN ENTITIES
  // ==========================================================================
  
  // Team Agreements - Triple allocation
  team_agreements: [
    { domain: 'team', weight: 0.50, isPrimary: true },        // Team Performance Domain (Primary)
    { domain: 'governance', weight: 0.30, isPrimary: false }, // Governance Knowledge Domain (Secondary)
    { domain: 'resources', weight: 0.20, isPrimary: false }   // Resources Knowledge Domain (Tertiary)
  ],
  
  // Development Approaches - SINGLE allocation per user request
  development_approaches: [
    { domain: 'governance', weight: 1.0, isPrimary: true } // Governance Knowledge Domain (100%)
  ],
  
  // Project Iterations - Dual allocation
  project_iterations: [
    { domain: 'development_approach', weight: 0.70, isPrimary: true }, // Dev Approach Performance (Primary)
    { domain: 'schedule', weight: 0.30, isPrimary: false }             // Schedule Knowledge Domain (Secondary)
  ],
  
  // Work Items - Single allocation
  work_items: [
    { domain: 'project_work', weight: 1.0, isPrimary: true } // Project Work Performance (100%)
  ],
  
  // Capacity Plans - Dual allocation
  capacity_plans: [
    { domain: 'resources', weight: 0.60, isPrimary: true },    // Resources Knowledge Domain (Primary)
    { domain: 'project_work', weight: 0.40, isPrimary: false } // Project Work Performance (Secondary)
  ],
  
  // Performance Measurements - Single allocation
  performance_measurements: [
    { domain: 'measurement', weight: 1.0, isPrimary: true } // Measurement Performance (100%)
  ],
  
  // Earned Value Metrics - Dual allocation
  earned_value_metrics: [
    { domain: 'measurement', weight: 0.60, isPrimary: true }, // Measurement Performance (Primary)
    { domain: 'finance', weight: 0.40, isPrimary: false }     // Finance Knowledge Domain (Secondary)
  ],
  
  // Opportunities - Dual allocation
  opportunities: [
    { domain: 'uncertainty', weight: 0.50, isPrimary: true }, // Uncertainty Performance (Equal Primary)
    { domain: 'risk', weight: 0.50, isPrimary: true }         // Risk Knowledge Domain (Equal Primary)
  ],
  
  // Risk Responses - Dual allocation
  risk_responses: [
    { domain: 'uncertainty', weight: 0.50, isPrimary: true }, // Uncertainty Performance (Equal Primary)
    { domain: 'risk', weight: 0.50, isPrimary: true }         // Risk Knowledge Domain (Equal Primary)
  ],
  
  // Performance Actuals - Single allocation
  performance_actuals: [
    { domain: 'project_work', weight: 1.0, isPrimary: true } // Project Work Performance (100%)
  ],
  
  // ==========================================================================
  // PMBOK 8 KNOWLEDGE AREA DOMAIN ENTITIES (Tier 2)
  // ==========================================================================
  
  // Governance Domain entities (100% to governance)
  governance_decisions: [
    { domain: 'governance', weight: 1.0, isPrimary: true }
  ],
  approval_workflows: [
    { domain: 'governance', weight: 1.0, isPrimary: true }
  ],
  steering_committees: [
    { domain: 'governance', weight: 1.0, isPrimary: true }
  ],
  change_control_boards: [
    { domain: 'governance', weight: 1.0, isPrimary: true }
  ],
  policy_compliance: [
    { domain: 'governance', weight: 1.0, isPrimary: true }
  ],
  
  // Scope Domain entities (100% to scope)
  scope_baselines: [
    { domain: 'scope', weight: 1.0, isPrimary: true }
  ],
  wbs_nodes: [
    { domain: 'scope', weight: 1.0, isPrimary: true }
  ],
  scope_change_requests: [
    { domain: 'scope', weight: 1.0, isPrimary: true }
  ],
  requirements_traceability: [
    { domain: 'scope', weight: 1.0, isPrimary: true }
  ],
  scope_verification: [
    { domain: 'scope', weight: 1.0, isPrimary: true }
  ],
  
  // Schedule Domain entities (100% to schedule)
  schedule_baselines: [
    { domain: 'schedule', weight: 1.0, isPrimary: true }
  ],
  schedule_activities: [
    { domain: 'schedule', weight: 1.0, isPrimary: true }
  ],
  critical_path_activities: [
    { domain: 'schedule', weight: 1.0, isPrimary: true }
  ],
  schedule_variances: [
    { domain: 'schedule', weight: 1.0, isPrimary: true }
  ],
  schedule_forecasts: [
    { domain: 'schedule', weight: 1.0, isPrimary: true }
  ],
  
  // Finance Domain entities (100% to finance)
  budget_baselines: [
    { domain: 'finance', weight: 1.0, isPrimary: true }
  ],
  cost_actuals: [
    { domain: 'finance', weight: 1.0, isPrimary: true }
  ],
  cost_estimates: [
    { domain: 'finance', weight: 1.0, isPrimary: true }
  ],
  funding_tranches: [
    { domain: 'finance', weight: 1.0, isPrimary: true }
  ],
  financial_variances: [
    { domain: 'finance', weight: 1.0, isPrimary: true }
  ],
  procurement_costs: [
    { domain: 'finance', weight: 1.0, isPrimary: true }
  ],
  
  // Resources Domain entities (100% to resources - except those already defined above)
  resource_assignments: [
    { domain: 'resources', weight: 1.0, isPrimary: true }
  ],
  resource_pool: [
    { domain: 'resources', weight: 1.0, isPrimary: true }
  ],
  capacity_forecasts: [
    { domain: 'resources', weight: 1.0, isPrimary: true }
  ],
  utilization_records: [
    { domain: 'resources', weight: 1.0, isPrimary: true }
  ],
  resource_conflicts: [
    { domain: 'resources', weight: 1.0, isPrimary: true }
  ],
  onboarding_offboarding: [
    { domain: 'resources', weight: 1.0, isPrimary: true }
  ],
  
  // Risk Domain entities (100% to risk - except those already defined above)
  risk_assessments: [
    { domain: 'risk', weight: 1.0, isPrimary: true }
  ],
  risk_response_plans: [
    { domain: 'risk', weight: 1.0, isPrimary: true }
  ],
  risk_triggers: [
    { domain: 'risk', weight: 1.0, isPrimary: true }
  ],
  risk_reviews: [
    { domain: 'risk', weight: 1.0, isPrimary: true }
  ],
  contingency_reserves: [
    { domain: 'risk', weight: 1.0, isPrimary: true }
  ],
  risk_metrics: [
    { domain: 'risk', weight: 1.0, isPrimary: true }
  ],
  
  // Stakeholders Ops Domain entities (100% to stakeholders_ops - except stakeholders already defined)
  engagement_actions: [
    { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
  ],
  communication_logs: [
    { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
  ],
  satisfaction_surveys: [
    { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
  ],
  stakeholder_issues: [
    { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
  ],
  relationship_health: [
    { domain: 'stakeholders_ops', weight: 1.0, isPrimary: true }
  ]
}

/**
 * Get weight allocation for a specific entity type
 */
export function getEntityWeights(entityType: string): EntityDomainWeight[] {
  // Convert camelCase to snake_case for lookup
  const snakeCase = entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  return ENTITY_DOMAIN_WEIGHTS[snakeCase] || []
}

/**
 * Validate that all weights for an entity sum to 1.0 (100%)
 */
export function validateEntityWeights(entityType: string): { isValid: boolean; sum: number } {
  const weights = getEntityWeights(entityType)
  const sum = weights.reduce((total, w) => total + w.weight, 0)
  const isValid = Math.abs(sum - 1.0) < 0.0001 // Allow tiny floating point error
  return { isValid, sum }
}

/**
 * Calculate weighted entity count for a domain
 */
export function calculateWeightedCount(entityCount: number, weight: number): number {
  return entityCount * weight
}

/**
 * Format weighted count for display
 * Example: "34.2 entities (Primary 60%)"
 */
export function formatWeightedCount(
  count: number,
  weight: number,
  isPrimary: boolean
): string {
  const weightedCount = calculateWeightedCount(count, weight)
  const percentage = Math.round(weight * 100)
  const badge = isPrimary ? 'Primary' : 'Secondary'
  return `${weightedCount.toFixed(1)} entities (${badge} ${percentage}%)`
}

