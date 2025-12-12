/**
 * Development Approach Entity Types
 * 
 * Represents project-level development approach metadata (ONE record per project).
 * Aligned with PMBOK 8 Development Approach & Life Cycle Performance Domain.
 */

export interface TailoringDecision {
  /** What was tailored */
  area: string
  /** Normal org process */
  standard_process: string
  /** How it was adapted */
  tailored_process: string
  /** Why */
  justification: string
}

export interface DevelopmentApproach {
  /** Approach type */
  approach: 'predictive' | 'adaptive' | 'hybrid' | 'incremental' | 'iterative'
  /** Methodology/framework */
  methodology?: 'waterfall' | 'scrum' | 'kanban' | 'lean' | 'safe' | 'prince2' | 'custom' | null
  /** Full explanation of why this approach was selected (Markdown format) */
  justification: string
  /** Uncertainty level */
  uncertainty_level?: 'low' | 'medium' | 'high' | null
  /** Requirements stability */
  requirements_stability?: 'stable' | 'evolving' | 'uncertain' | null
  /** Stakeholder engagement model */
  stakeholder_engagement_model?: 'periodic' | 'continuous' | null
  /** Delivery cadence */
  delivery_cadence?: 'single' | 'iterative' | 'incremental' | 'continuous' | null
  /** Organizational maturity */
  organizational_maturity?: 'low' | 'medium' | 'high' | null
  /** Team experience level */
  team_experience_level?: 'junior' | 'mixed' | 'senior' | null
  /** Regulatory constraints */
  regulatory_constraints?: boolean | null
  /** Life cycle phases */
  life_cycle_phases?: string[]
  /** Iteration length (in days or weeks) */
  iteration_length?: number | null
  /** Iteration unit */
  iteration_unit?: 'days' | 'weeks' | null
  /** Governance approach */
  governance_approach?: 'lightweight' | 'standard' | 'formal' | null
  /** Review gates */
  review_gates?: string[]
  /** Tailoring decisions */
  tailoring_decisions?: TailoringDecision[]
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
  
  // Legacy fields for backward compatibility
  framework?: string | null
  lifecycle_model?: string | null
  iteration_length_weeks?: number | null
  ceremonies?: string[]
  artifacts?: string[]
  tailoring_decisions_text?: string | null
  governance_notes?: string | null
}

