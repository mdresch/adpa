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

export type ProjectPhase = 'initiating' | 'planning' | 'executing' | 'monitoring_controlling' | 'closing'

export interface EntityDomainWeight {
  domain: PmbokDomain
  weight: number // 0.0 to 1.0 (percentage as decimal)
  isPrimary: boolean // Highest weight = primary allocation
}

export interface EntityPhaseWeight {
  phase: ProjectPhase
  weight: number // 0.0 to 1.0 (percentage as decimal)
  isPrimary: boolean // Highest weight = primary allocation
}

export type EntityWeightMap = Record<string, EntityDomainWeight[]>
export type EntityPhaseWeightMap = Record<string, EntityPhaseWeight[]>

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
  
  // Stakeholders - Performance Domain Primary
  stakeholders: [
    { domain: 'stakeholders', weight: 1.0, isPrimary: true }         // Stakeholder Performance Domain (100%)
  ],
  
  // Requirements - Primary anchor for Planning
  requirements: [
    { domain: 'planning', weight: 0.80, isPrimary: true },           // Planning Performance Domain (Primary)
    { domain: 'scope', weight: 0.20, isPrimary: false }              // Scope Knowledge Domain (Secondary)
  ],
  
  // Risks - Primary anchor for Uncertainty
  risks: [
    { domain: 'uncertainty', weight: 0.90, isPrimary: true },        // Uncertainty Performance Domain (Primary)
    { domain: 'risk', weight: 0.10, isPrimary: false }               // Risk Knowledge Domain (Secondary)
  ],
  
  // Milestones - Primary for Planning
  milestones: [
    { domain: 'planning', weight: 0.70, isPrimary: true },           // Planning Performance Domain (Primary)
    { domain: 'schedule', weight: 0.30, isPrimary: false }           // Schedule Knowledge Domain (Secondary)
  ],
  
  // Constraints - Primary for Uncertainty
  constraints: [
    { domain: 'uncertainty', weight: 0.80, isPrimary: true },        // Uncertainty Performance Domain (Primary)
    { domain: 'risk', weight: 0.20, isPrimary: false }               // Risk Knowledge Domain (Secondary)
  ],
  
  // Success Criteria - Primary for Measurement
  success_criteria: [
    { domain: 'measurement', weight: 0.70, isPrimary: true },        // Measurement Performance Domain (Primary)
    { domain: 'stakeholders', weight: 0.30, isPrimary: false }       // Stakeholder Performance Domain (Secondary)
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
  
  // Deliverables - Performance Domain Primary
  deliverables: [
    { domain: 'delivery', weight: 0.90, isPrimary: true },           // Delivery Performance Domain (Primary)
    { domain: 'scope', weight: 0.10, isPrimary: false }              // Scope Knowledge Area (Secondary)
  ],
  
  // Scope Items - Dual allocation
  scope_items: [
    { domain: 'scope', weight: 0.70, isPrimary: true },    // Scope Knowledge Domain (Primary)
    { domain: 'planning', weight: 0.30, isPrimary: false } // Planning Performance Domain (Secondary)
  ],
  
  // Activities - Performance Domain Primary
  activities: [
    { domain: 'project_work', weight: 0.80, isPrimary: true },       // Project Work Performance (Primary)
    { domain: 'schedule', weight: 0.20, isPrimary: false }           // Schedule Knowledge Area (Secondary)
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
  
  // Development Approaches - Corrected to Development Approach Performance Domain
  development_approaches: [
    { domain: 'development_approach', weight: 0.80, isPrimary: true }, // Performance Domain (Primary)
    { domain: 'governance', weight: 0.20, isPrimary: false }           // Knowledge Domain (Secondary)
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

// =============================================================================
// PROJECT PHASE WEIGHTS (Temporal Allocation)
// =============================================================================

/**
 * Phase weight allocation for each entity type
 * 
 * Purpose: Show WHEN in the project lifecycle entities are active
 * 
 * Phases:
 * - Initiating: Project authorization, high-level planning
 * - Planning: Detailed planning, requirement analysis
 * - Executing: Implementation, deliverable creation
 * - Monitoring & Controlling: Progress tracking, change management
 * - Closing: Project closure, lessons learned
 * 
 * Rules:
 * 1. Weights for each entity must sum to 1.0 (100%)
 * 2. Highest weight = Primary phase (when entity is most active)
 * 3. Shows temporal distribution across project lifecycle
 */
export const ENTITY_PHASE_WEIGHTS: EntityPhaseWeightMap = {
  // Core entities
  stakeholders: [
    { phase: 'initiating', weight: 0.35, isPrimary: true },  // Identify stakeholders
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Plan engagement
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Active engagement
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false }, // Monitor satisfaction
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Final communication
  ],
  
  requirements: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // High-level requirements
    { phase: 'planning', weight: 0.60, isPrimary: true },    // Detailed requirements
    { phase: 'executing', weight: 0.15, isPrimary: false },  // Refinement
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false }, // Changes
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  risks: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Initial risk assessment
    { phase: 'planning', weight: 0.30, isPrimary: true },    // Risk planning
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Risk monitoring
    { phase: 'monitoring_controlling', weight: 0.25, isPrimary: false }, // Risk response
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Risk review
  ],
  
  milestones: [
    { phase: 'initiating', weight: 0.05, isPrimary: false }, // Project kickoff
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Planning milestones
    { phase: 'executing', weight: 0.30, isPrimary: true },   // Deliverable milestones
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false }, // Review milestones
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Project closure
  ],
  
  constraints: [
    { phase: 'initiating', weight: 0.25, isPrimary: false }, // Identify constraints
    { phase: 'planning', weight: 0.40, isPrimary: true },    // Plan around constraints
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Manage constraints
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  success_criteria: [
    { phase: 'initiating', weight: 0.40, isPrimary: true },  // Define success
    { phase: 'planning', weight: 0.30, isPrimary: false },   // Measure planning
    { phase: 'executing', weight: 0.10, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Evaluate success
  ],
  
  best_practices: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.30, isPrimary: true },    // Establish practices
    { phase: 'executing', weight: 0.40, isPrimary: false },  // Apply practices
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  phases: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.60, isPrimary: true },    // Define phases
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Execute phases
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  resources: [
    { phase: 'initiating', weight: 0.10, isPrimary: false }, // Identify resources
    { phase: 'planning', weight: 0.30, isPrimary: true },    // Plan resources
    { phase: 'executing', weight: 0.40, isPrimary: false },  // Use resources
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Release resources
  ],
  
  technologies: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Select technologies
    { phase: 'planning', weight: 0.35, isPrimary: true },    // Plan technology stack
    { phase: 'executing', weight: 0.40, isPrimary: false },  // Implement technologies
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  quality_standards: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.40, isPrimary: true },    // Define quality standards
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Apply standards
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false }, // Quality control
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  compliance_security: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Compliance requirements
    { phase: 'planning', weight: 0.35, isPrimary: true },    // Compliance planning
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Implement compliance
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false }, // Audit
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  deliverables: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Plan deliverables
    { phase: 'executing', weight: 0.50, isPrimary: true },   // Create deliverables
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Hand off deliverables
  ],
  
  scope_items: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // High-level scope
    { phase: 'planning', weight: 0.55, isPrimary: true },    // Define scope
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Deliver scope
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  activities: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.30, isPrimary: false },   // Plan activities
    { phase: 'executing', weight: 0.50, isPrimary: true },   // Execute activities
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  // PMBOK 8 Performance Domain entities
  team_agreements: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Form team
    { phase: 'planning', weight: 0.45, isPrimary: true },    // Establish agreements
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Follow agreements
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  development_approaches: [
    { phase: 'initiating', weight: 0.30, isPrimary: true },  // Select approach
    { phase: 'planning', weight: 0.40, isPrimary: false },   // Tailor approach
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Apply approach
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  project_iterations: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Plan iterations
    { phase: 'executing', weight: 0.55, isPrimary: true },   // Execute iterations
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  work_items: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Define work items
    { phase: 'executing', weight: 0.60, isPrimary: true },   // Complete work items
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  capacity_plans: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.50, isPrimary: true },    // Plan capacity
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Adjust capacity
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  performance_measurements: [
    { phase: 'initiating', weight: 0.10, isPrimary: false }, // Define metrics
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Plan measurement
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Collect data
    { phase: 'monitoring_controlling', weight: 0.35, isPrimary: true }, // Analyze performance
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  earned_value_metrics: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.30, isPrimary: false },   // Establish baseline
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Track EVM
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true }, // Analyze EVM
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  opportunities: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Identify opportunities
    { phase: 'planning', weight: 0.30, isPrimary: true },    // Plan exploitation
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Exploit opportunities
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  risk_responses: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.40, isPrimary: true },    // Plan responses
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Implement responses
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  performance_actuals: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.05, isPrimary: false },
    { phase: 'executing', weight: 0.45, isPrimary: true },   // Record actuals
    { phase: 'monitoring_controlling', weight: 0.45, isPrimary: false }, // Compare actuals
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  // Knowledge Domain entities - mostly distributed evenly or concentrated where relevant
  governance_decisions: [
    { phase: 'initiating', weight: 0.25, isPrimary: false }, // Initial decisions
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Planning decisions
    { phase: 'executing', weight: 0.20, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.25, isPrimary: true }, // Control decisions
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  approval_workflows: [
    { phase: 'initiating', weight: 0.30, isPrimary: true },  // Project approval
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Plan approval
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Deliverable approval
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false }, // Change approval
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  steering_committees: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Committee formation
    { phase: 'planning', weight: 0.20, isPrimary: false },
    { phase: 'executing', weight: 0.25, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.30, isPrimary: true }, // Committee reviews
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  change_control_boards: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.20, isPrimary: false },   // CCB setup
    { phase: 'executing', weight: 0.30, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true }, // Change control
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  policy_compliance: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Compliance requirements
    { phase: 'planning', weight: 0.30, isPrimary: true },    // Compliance planning
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Compliance execution
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false }, // Compliance audit
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  // Scope Domain entities
  scope_baselines: [
    { phase: 'initiating', weight: 0.15, isPrimary: false },
    { phase: 'planning', weight: 0.60, isPrimary: true },    // Establish baseline
    { phase: 'executing', weight: 0.15, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false }, // Control baseline
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  wbs_nodes: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.65, isPrimary: true },    // Create WBS
    { phase: 'executing', weight: 0.20, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.05, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  scope_change_requests: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.15, isPrimary: false },
    { phase: 'executing', weight: 0.35, isPrimary: true },   // Changes during execution
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false }, // Change control
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  requirements_traceability: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.50, isPrimary: true },    // Establish traceability
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Maintain traceability
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  scope_verification: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Plan verification
    { phase: 'executing', weight: 0.40, isPrimary: true },   // Verify deliverables
    { phase: 'monitoring_controlling', weight: 0.35, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  // Schedule Domain entities
  schedule_baselines: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.65, isPrimary: true },    // Establish schedule baseline
    { phase: 'executing', weight: 0.15, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  schedule_activities: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.35, isPrimary: false },   // Plan activities
    { phase: 'executing', weight: 0.45, isPrimary: true },   // Execute activities
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  critical_path_activities: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.45, isPrimary: true },    // Identify critical path
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Execute critical path
    { phase: 'monitoring_controlling', weight: 0.25, isPrimary: false }, // Monitor critical path
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  schedule_variances: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.10, isPrimary: false },
    { phase: 'executing', weight: 0.40, isPrimary: false },  // Detect variances
    { phase: 'monitoring_controlling', weight: 0.50, isPrimary: true }, // Analyze variances
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  schedule_forecasts: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Initial forecast
    { phase: 'executing', weight: 0.35, isPrimary: false },  // Update forecast
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true }, // Forecast completion
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  // Finance Domain entities
  budget_baselines: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Initial budget
    { phase: 'planning', weight: 0.60, isPrimary: true },    // Detailed budget
    { phase: 'executing', weight: 0.15, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  cost_actuals: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.05, isPrimary: false },
    { phase: 'executing', weight: 0.50, isPrimary: true },   // Record costs
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false }, // Track costs
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Final costs
  ],
  
  cost_estimates: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Rough estimates
    { phase: 'planning', weight: 0.60, isPrimary: true },    // Detailed estimates
    { phase: 'executing', weight: 0.15, isPrimary: false },  // Re-estimates
    { phase: 'monitoring_controlling', weight: 0.05, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  funding_tranches: [
    { phase: 'initiating', weight: 0.30, isPrimary: true },  // Initial funding
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Budget approval
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Additional funding
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  financial_variances: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.10, isPrimary: false },
    { phase: 'executing', weight: 0.40, isPrimary: false },  // Detect variances
    { phase: 'monitoring_controlling', weight: 0.50, isPrimary: true }, // Analyze variances
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  procurement_costs: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.30, isPrimary: false },   // Plan procurement
    { phase: 'executing', weight: 0.45, isPrimary: true },   // Procure and pay
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  // Resources Domain entities
  resource_assignments: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Initial assignments
    { phase: 'planning', weight: 0.40, isPrimary: true },    // Detailed assignments
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Manage assignments
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  resource_pool: [
    { phase: 'initiating', weight: 0.25, isPrimary: false }, // Identify pool
    { phase: 'planning', weight: 0.45, isPrimary: true },    // Establish pool
    { phase: 'executing', weight: 0.20, isPrimary: false },  // Manage pool
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  capacity_forecasts: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.45, isPrimary: true },    // Plan capacity
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Adjust forecast
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  utilization_records: [
    { phase: 'initiating', weight: 0.00, isPrimary: false },
    { phase: 'planning', weight: 0.10, isPrimary: false },
    { phase: 'executing', weight: 0.50, isPrimary: true },   // Track utilization
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false }, // Analyze utilization
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  resource_conflicts: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Identify conflicts
    { phase: 'executing', weight: 0.40, isPrimary: true },   // Resolve conflicts
    { phase: 'monitoring_controlling', weight: 0.30, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  onboarding_offboarding: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Initial onboarding
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Plan onboarding
    { phase: 'executing', weight: 0.35, isPrimary: true },   // Onboard team members
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.20, isPrimary: false }     // Offboard team
  ],
  
  // Risk Domain entities
  risk_assessments: [
    { phase: 'initiating', weight: 0.25, isPrimary: false }, // Initial assessment
    { phase: 'planning', weight: 0.35, isPrimary: true },    // Detailed assessment
    { phase: 'executing', weight: 0.20, isPrimary: false },
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false }, // Ongoing assessment
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  risk_response_plans: [
    { phase: 'initiating', weight: 0.15, isPrimary: false },
    { phase: 'planning', weight: 0.50, isPrimary: true },    // Plan responses
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Execute responses
    { phase: 'monitoring_controlling', weight: 0.10, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  risk_triggers: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.30, isPrimary: false },   // Define triggers
    { phase: 'executing', weight: 0.35, isPrimary: true },   // Monitor triggers
    { phase: 'monitoring_controlling', weight: 0.25, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  risk_reviews: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Plan reviews
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Conduct reviews
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: true }, // Regular reviews
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  contingency_reserves: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.50, isPrimary: true },    // Establish reserves
    { phase: 'executing', weight: 0.25, isPrimary: false },  // Use reserves
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  risk_metrics: [
    { phase: 'initiating', weight: 0.10, isPrimary: false }, // Define metrics
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Establish metrics
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Track metrics
    { phase: 'monitoring_controlling', weight: 0.35, isPrimary: true }, // Analyze metrics
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  // Stakeholders Ops Domain entities
  engagement_actions: [
    { phase: 'initiating', weight: 0.20, isPrimary: false }, // Initial engagement
    { phase: 'planning', weight: 0.25, isPrimary: false },   // Plan engagement
    { phase: 'executing', weight: 0.35, isPrimary: true },   // Active engagement
    { phase: 'monitoring_controlling', weight: 0.15, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  communication_logs: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Initial communications
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Communication plan
    { phase: 'executing', weight: 0.40, isPrimary: true },   // Active communication
    { phase: 'monitoring_controlling', weight: 0.20, isPrimary: false },
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ],
  
  satisfaction_surveys: [
    { phase: 'initiating', weight: 0.05, isPrimary: false },
    { phase: 'planning', weight: 0.15, isPrimary: false },   // Plan surveys
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Conduct surveys
    { phase: 'monitoring_controlling', weight: 0.45, isPrimary: true }, // Analyze feedback
    { phase: 'closing', weight: 0.05, isPrimary: false }     // Final survey
  ],
  
  stakeholder_issues: [
    { phase: 'initiating', weight: 0.10, isPrimary: false },
    { phase: 'planning', weight: 0.15, isPrimary: false },
    { phase: 'executing', weight: 0.35, isPrimary: true },   // Resolve issues
    { phase: 'monitoring_controlling', weight: 0.40, isPrimary: false }, // Track issues
    { phase: 'closing', weight: 0.00, isPrimary: false }
  ],
  
  relationship_health: [
    { phase: 'initiating', weight: 0.15, isPrimary: false }, // Initial relationships
    { phase: 'planning', weight: 0.20, isPrimary: false },   // Plan relationships
    { phase: 'executing', weight: 0.30, isPrimary: false },  // Maintain relationships
    { phase: 'monitoring_controlling', weight: 0.30, isPrimary: true }, // Monitor health
    { phase: 'closing', weight: 0.05, isPrimary: false }
  ]
}

/**
 * Get phase weight allocations for a specific entity type
 */
export function getEntityPhaseWeights(entityType: string): EntityPhaseWeight[] {
  // Convert camelCase to snake_case for lookup
  const snakeCase = entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  return ENTITY_PHASE_WEIGHTS[snakeCase] || []
}

/**
 * Validate that phase weights sum to 1.0 (100%)
 */
export function validateEntityPhaseWeights(entityType: string): { isValid: boolean; sum: number } {
  const weights = getEntityPhaseWeights(entityType)
  const sum = weights.reduce((total, w) => total + w.weight, 0)
  const isValid = Math.abs(sum - 1.0) < 0.0001
  return { isValid, sum }
}

