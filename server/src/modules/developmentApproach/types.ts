/**
 * Development Approach Types
 * Purpose: Type definitions for development approach metadata
 * Domain: Development Approach & Life Cycle Performance Domain
 * Created: January 15, 2026
 */

export interface DevelopmentApproach {
  id: string;
  project_id: string;
  
  // Approach selection
  approach: 'predictive' | 'adaptive' | 'hybrid' | 'incremental' | 'iterative';
  methodology?: 'waterfall' | 'scrum' | 'kanban' | 'lean' | 'safe' | 'prince2' | 'custom';
  
  // Justification (WHY this approach was selected)
  justification: string;
  
  // Context factors (PMBOK 8 Domain 3)
  uncertainty_level?: 'low' | 'medium' | 'high';
  requirements_stability?: 'stable' | 'evolving' | 'uncertain';
  stakeholder_engagement_model?: 'periodic' | 'continuous';
  delivery_cadence: 'single' | 'iterative' | 'incremental' | 'continuous';
  
  // Organizational context
  organizational_maturity?: 'low' | 'medium' | 'high';
  team_experience_level?: 'junior' | 'mixed' | 'senior';
  regulatory_constraints?: boolean;
  
  // Tailoring decisions (JSONB array)
  tailoring_decisions?: Array<{
    area: string;
    standard_process: string;
    tailored_process: string;
    justification: string;
  }>;
  
  // Life cycle configuration
  life_cycle_phases?: string[];
  iteration_length?: number;
  iteration_unit?: 'days' | 'weeks';
  
  // Governance approach
  governance_approach: 'lightweight' | 'standard' | 'formal';
  review_gates?: string[];
  
  // Metadata
  source_document_id?: string;
  defined_by?: string;
  approved_by?: string;
  effective_date?: Date | string;
  
  // Timestamps
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DevelopmentApproachStatistics {
  byApproach: Record<string, number>;
  byMethodology: Record<string, number>;
  totalProjects: number;
  projectsWithApproach: number;
}

export interface DevelopmentApproachFilters {
  approach?: string;
  methodology?: string;
  limit?: number;
  offset?: number;
}