/**
 * Project Charter Module Types
 * 
 * Defines TypeScript interfaces for the Project Charter development workflow.
 * Supports AI-powered extraction of stakeholders, success criteria, constraints,
 * and best practices with automated document generation.
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface CharterStakeholder {
  id?: string
  name: string
  role: string
  organization?: string
  email?: string
  phone?: string
  interest_level: 'high' | 'medium' | 'low'
  influence_level: 'high' | 'medium' | 'low'
  engagement_strategy?: string
  expectations?: string
  concerns?: string
  communication_preference?: string
  category: 'sponsor' | 'team_member' | 'customer' | 'vendor' | 'regulator' | 'other'
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

export interface CharterSuccessCriterion {
  id?: string
  criterion: string
  description?: string
  measurement_method: string
  target_value: string
  baseline_value?: string
  category: 'schedule' | 'cost' | 'quality' | 'scope' | 'stakeholder' | 'risk' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  owner?: string
  verification_method?: string
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

export interface CharterConstraint {
  id?: string
  title: string
  description: string
  type: 'technical' | 'budget' | 'time' | 'resource' | 'regulatory' | 'business' | 'environmental' | 'legal'
  severity: 'critical' | 'high' | 'medium' | 'low'
  impact_area: string
  workaround?: string
  mitigation_strategy?: string
  source?: string
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

export interface CharterAssumption {
  id?: string
  assumption: string
  description?: string
  category: 'technical' | 'business' | 'resource' | 'schedule' | 'budget' | 'external' | 'organizational'
  risk_if_false: 'high' | 'medium' | 'low'
  validation_approach?: string
  validation_status: 'unvalidated' | 'validating' | 'validated' | 'invalidated'
  owner?: string
  due_date?: string
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

export interface CharterBestPractice {
  id?: string
  title: string
  description: string
  category: 'pmbok' | 'agile' | 'prince2' | 'industry' | 'organizational' | 'technical'
  source: string
  applicability: string
  implementation_notes?: string
  priority: 'must_have' | 'should_have' | 'nice_to_have'
  compliance_requirement?: boolean
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

export interface CharterRisk {
  id?: string
  title: string
  description: string
  category: string
  probability: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  impact: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  risk_score?: number
  mitigation_strategy?: string
  contingency_plan?: string
  owner?: string
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

export interface CharterMilestone {
  id?: string
  name: string
  description?: string
  due_date?: string
  deliverables: string[]
  dependencies?: string[]
  completion_criteria?: string
  source_document?: string
  source_document_id?: string
  confidence_score?: number
}

// ============================================================================
// Project Charter Structure
// ============================================================================

export interface ProjectCharterData {
  // Core Project Information
  project_name: string
  project_description: string
  project_purpose: string
  business_case?: string
  business_need?: string
  expected_benefits?: string[]
  
  // Objectives
  objectives: ProjectObjective[]
  
  // Scope
  in_scope: string[]
  out_of_scope: string[]
  
  // Extracted Entities
  stakeholders: CharterStakeholder[]
  success_criteria: CharterSuccessCriterion[]
  constraints: CharterConstraint[]
  assumptions: CharterAssumption[]
  best_practices: CharterBestPractice[]
  risks: CharterRisk[]
  milestones: CharterMilestone[]
  
  // Timeline
  start_date?: string
  end_date?: string
  duration_estimate?: string
  
  // Budget
  budget_estimate?: number
  currency?: string
  budget_notes?: string
  
  // Authority
  project_sponsor?: string
  project_manager?: string
  approval_requirements?: string[]
  
  // Governance
  change_control_process?: string
  escalation_path?: string
  reporting_requirements?: string
  
  // Metadata
  version?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ProjectObjective {
  name: string
  description: string
  measurable_target?: string
  alignment?: string // Business goal alignment
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface CharterWorkflowStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  order: number
  ai_technique: string
  entities_created?: string[]
  started_at?: Date
  completed_at?: Date
  error?: string
}

export interface CharterWorkflowState {
  id: string
  project_id: string
  current_step: number
  steps: CharterWorkflowStep[]
  charter_data: Partial<ProjectCharterData>
  validation_issues: ValidationIssue[]
  suggestions: AISuggestion[]
  created_at: Date
  updated_at: Date
  completed_at?: Date
  status: 'initializing' | 'extracting' | 'validating' | 'generating' | 'reviewing' | 'completed' | 'failed'
}

export interface ValidationIssue {
  id: string
  field: string
  type: 'missing' | 'unclear' | 'inconsistent' | 'incomplete'
  message: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
  auto_fixable?: boolean
}

export interface AISuggestion {
  id: string
  category: string
  title: string
  description: string
  rationale: string
  confidence: number
  applied?: boolean
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface InitiateCharterRequest {
  project_id: string
  source_documents?: string[] // Document IDs to analyze
  include_templates?: boolean
  ai_provider?: string
  ai_model?: string
}

export interface InitiateCharterResponse {
  workflow_id: string
  status: string
  message: string
  steps: CharterWorkflowStep[]
}

export interface ExtractEntitiesRequest {
  workflow_id: string
  entity_types: ('stakeholders' | 'success_criteria' | 'constraints' | 'assumptions' | 'best_practices' | 'risks' | 'milestones')[]
  options?: ExtractionOptions
}

export interface ExtractionOptions {
  temperature?: number
  max_tokens?: number
  use_cache?: boolean
  strict_source_resolution?: boolean
}

export interface ExtractEntitiesResponse {
  workflow_id: string
  extracted: {
    entity_type: string
    count: number
    entities: any[]
    rejected_count: number
  }[]
  validation_issues: ValidationIssue[]
  suggestions: AISuggestion[]
}

export interface GenerateCharterRequest {
  workflow_id: string
  output_format: 'markdown' | 'pdf' | 'docx' | 'html'
  include_sections?: string[]
  template_id?: string
  options?: GenerationOptions
}

export interface GenerationOptions {
  include_stakeholder_register?: boolean
  include_assumptions_log?: boolean
  include_risk_register?: boolean
  include_best_practices_checklist?: boolean
  page_size?: string
  orientation?: string
}

export interface GenerateCharterResponse {
  charter_document: GeneratedDocument
  stakeholder_register?: GeneratedDocument
  assumptions_log?: GeneratedDocument
  supporting_documents: GeneratedDocument[]
}

export interface GeneratedDocument {
  id: string
  name: string
  type: string
  format: string
  file_path?: string
  file_url?: string
  file_size?: number
  content?: string
  metadata: Record<string, any>
}

// ============================================================================
// AI Analysis Types
// ============================================================================

export interface StakeholderAnalysis {
  total_count: number
  by_category: Record<string, number>
  by_interest: Record<string, number>
  by_influence: Record<string, number>
  power_interest_matrix: PowerInterestMatrix
  engagement_recommendations: string[]
  missing_roles: string[]
}

export interface PowerInterestMatrix {
  manage_closely: CharterStakeholder[] // High power, High interest
  keep_satisfied: CharterStakeholder[] // High power, Low interest
  keep_informed: CharterStakeholder[] // Low power, High interest
  monitor: CharterStakeholder[] // Low power, Low interest
}

export interface ConstraintClassification {
  total_count: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
  critical_constraints: CharterConstraint[]
  interdependencies: ConstraintDependency[]
  mitigation_priorities: string[]
}

export interface ConstraintDependency {
  constraint_id: string
  depends_on: string[]
  impacts: string[]
}

export interface StandardsRuleCheck {
  standard: string // e.g., 'PMBOK 7', 'PRINCE2', 'ISO 21500'
  compliance_score: number
  passed_rules: string[]
  failed_rules: StandardViolation[]
  recommendations: string[]
}

export interface StandardViolation {
  rule_id: string
  rule_name: string
  description: string
  severity: 'critical' | 'major' | 'minor'
  remediation: string
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface ProjectCharterConfig {
  default_ai_provider: string
  default_ai_model: string
  extraction_temperature: number
  max_extraction_tokens: number
  enable_caching: boolean
  cache_ttl_seconds: number
  strict_source_resolution: boolean
  supported_standards: string[]
  template_directory: string
  output_directory: string
}

export const DEFAULT_CHARTER_CONFIG: ProjectCharterConfig = {
  default_ai_provider: 'openai',
  default_ai_model: 'gpt-4o',
  extraction_temperature: 0.3,
  max_extraction_tokens: 8000,
  enable_caching: true,
  cache_ttl_seconds: 3600,
  strict_source_resolution: true,
  supported_standards: ['PMBOK 7', 'PMBOK 6', 'PRINCE2', 'Agile', 'ISO 21500'],
  template_directory: './templates/charter',
  output_directory: './generated-documents/charters'
}
