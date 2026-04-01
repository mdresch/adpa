/**
 * Playbook Management Module Types
 * Defines TypeScript interfaces for playbook lifecycle management
 */

export interface PlaybookTemplate {
  id: string
  name: string
  description?: string
  purpose: string
  severity_model: SeverityModel
  escalation_rules: EscalationRule[]
  actions: PlaybookAction[]
  automations?: PlaybookAutomation[]
  compliance_references?: ComplianceReference[]
  
  // Lifecycle
  status: 'draft' | 'testing' | 'active' | 'deprecated'
  version_major: number
  version_minor: number
  version_micro: number
  
  // QA & Quality
  qa_score?: number
  qa_last_run_at?: Date
  qa_status?: 'passed' | 'failed' | 'pending'
  quality_gate_status?: 'passed' | 'failed' | 'blocked'
  
  // Drift & Alignment
  drift_detection_enabled: boolean
  drift_last_check_at?: Date
  alignment_score?: number
  
  // Review Workflow
  review_workflow_state: 'draft' | 'in_review' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: Date
  review_notes?: string
  
  // Metadata
  created_by: string
  created_at: Date
  updated_at: Date
  updated_by?: string
  deleted_at?: Date
  deleted_by?: string
  usage_count: number
  is_public: boolean
}

export interface SeverityModel {
  levels: SeverityLevel[]
  classification_rules: ClassificationRule[]
  escalation_thresholds: EscalationThreshold[]
}

export interface SeverityLevel {
  level: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  response_time_sla?: string
  escalation_path?: string[]
}

export interface ClassificationRule {
  rule_id: string
  condition: string
  severity_level: string
  confidence_score?: number
}

export interface EscalationThreshold {
  metric: string
  threshold_value: number
  action: string
}

export interface EscalationRule {
  rule_id: string
  trigger_condition: string
  escalation_path: string[]
  timing: string
  notification_template?: string
}

export interface PlaybookAction {
  action_id: string
  action_name: string
  description: string
  responsible_role: string
  timing: string
  prerequisites?: string[]
  success_criteria?: string[]
}

export interface PlaybookAutomation {
  automation_id: string
  automation_name: string
  trigger_condition: string
  actions: string[]
  enabled: boolean
}

export interface ComplianceReference {
  framework: string
  requirement_id: string
  requirement_description: string
  mapping: string
}

export interface PlaybookVersion {
  id: string
  playbook_id: string
  version_major: number
  version_minor: number
  version_micro: number
  content: Record<string, any>
  system_prompt?: string
  change_summary?: string
  change_type: 'editorial' | 'structural' | 'policy'
  qa_score?: number
  qa_results?: Record<string, any>
  qa_passed_at?: Date
  created_by: string
  created_at: Date
}

export interface ExtractedEntity {
  id: string
  playbook_id: string
  version_id: string
  entity_type: 'role' | 'timeline' | 'risk_definition' | 'tool' | 'incident_category'
  entity_name: string
  entity_value: Record<string, any>
  extracted_at: Date
  extraction_confidence?: number
  source_section?: string
}

export interface DriftRecord {
  id: string
  playbook_id: string
  from_version_id: string
  to_version_id: string
  drift_type: string
  entity_type: string
  entity_name: string
  old_value: Record<string, any>
  new_value: Record<string, any>
  notification_sent: boolean
  notified_at?: Date
  notified_to?: string
  detected_at: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface QAResult {
  id: string
  playbook_id: string
  version_id: string
  severity_coverage_score: number
  escalation_timing_score: number
  decision_tree_score: number
  governance_links_score: number
  entity_consistency_score: number
  pmbok_alignment_score: number
  overall_score: number
  status: 'passed' | 'failed' | 'pending'
  failed_checks?: Record<string, any>
  recommendations?: Record<string, any>
  run_by?: string
  run_at: Date
}

export interface EscalationRecord {
  id: string
  playbook_id: string
  trigger_type: 'ai_prediction' | 'threshold' | 'user_submission'
  trigger_data?: Record<string, any>
  guidance_content: Record<string, any>
  decision_tree?: Record<string, any>
  communication_templates?: string[]
  risk_assessment?: Record<string, any>
  automations_triggered?: string[]
  user_id: string
  guidance_provided_at: Date
  user_action?: 'accepted' | 'modified' | 'rejected'
  user_action_at?: Date
  resolution_status: 'pending' | 'in_progress' | 'resolved' | 'escalated'
  resolved_at?: Date
  resolution_notes?: string
}

export interface ResolutionAnalytics {
  id: string
  escalation_record_id: string
  playbook_id: string
  expected_outcome?: Record<string, any>
  actual_outcome?: Record<string, any>
  outcome_variance?: number
  extracted_entities?: Record<string, any>
  entity_changes?: Record<string, any>
  model_update_recommended: boolean
  model_update_reason?: string
  model_update_data?: Record<string, any>
  version_update_recommended: boolean
  version_update_reason?: string
  version_update_suggestions?: Record<string, any>
  analyzed_at: Date
  analyzed_by?: string
}

// Request/Response Types

export interface CreatePlaybookRequest {
  name: string
  description?: string
  purpose: string
  severity_model: SeverityModel
  escalation_rules: EscalationRule[]
  actions: PlaybookAction[]
  automations?: PlaybookAutomation[]
  compliance_references?: ComplianceReference[]
  is_public?: boolean
}

export interface UpdatePlaybookRequest {
  name?: string
  description?: string
  purpose?: string
  severity_model?: SeverityModel
  escalation_rules?: EscalationRule[]
  actions?: PlaybookAction[]
  automations?: PlaybookAutomation[]
  compliance_references?: ComplianceReference[]
  is_public?: boolean
}

export interface PlaybookListQuery {
  page?: number
  limit?: number
  status?: string
  search?: string
  is_public?: boolean
}

export interface PlaybookListResponse {
  playbooks: PlaybookTemplate[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  permissions?: any
}
