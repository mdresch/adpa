export type PortfolioRiskLevel = 'project' | 'program' | 'portfolio' | 'systemic'
export type ProbabilityLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface PortfolioRiskRecord {
  id: string
  portfolio_id?: string | null
  risk_title: string
  risk_description?: string | null
  risk_category?: string | null
  likelihood_level: ProbabilityLevel
  impact_level: ProbabilityLevel
  severity?: SeverityLevel | null
  risk_level?: PortfolioRiskLevel | null
  risk_status?: string | null
  aggregation_level?: string | null
  aggregated_financial_impact?: number | null
  schedule_impact_days?: number | null
  systemic?: boolean
  escalation_status?: string | null
  threshold_breach_reason?: string | null
  last_reviewed_at?: string | null
  next_review_due?: string | null
  mitigation_plan_count?: number | null
  mitigation_completed_count?: number | null
  avg_completion_percentage?: number | null
}

export interface RiskEscalationStep {
  id: string
  policy_id: string
  step_order: number
  role_name: string | null
  notify_team: string | null
  notify_user_id: string | null
  channel: string
  sla_hours: number
  instructions: string | null
  created_at: string
  updated_at: string
}

export interface RiskEscalationPolicy {
  id: string
  name: string
  description: string | null
  severity_levels: string[] | null
  probability_levels: string[] | null
  impact_levels: string[] | null
  financial_exposure_min: number | null
  financial_exposure_max: number | null
  schedule_impact_min: number | null
  schedule_impact_max: number | null
  systemic_only: boolean
  auto_trigger: boolean
  sla_hours: number
  notification_channel: string
  escalation_type: string
  active: boolean
  steps: RiskEscalationStep[]
  created_at: string
  updated_at: string
}

export interface RiskEscalationEventStep {
  id: string
  event_id: string
  step_id: string
  status: 'pending' | 'sent' | 'acknowledged' | 'completed' | 'skipped'
  completed_by: string | null
  completed_at: string | null
  notes: string | null
}

export interface RiskEscalationEvent {
  id: string
  portfolio_risk_id: string
  policy_id: string
  current_step_id: string | null
  status: 'pending' | 'acknowledged' | 'resolved' | 'cancelled'
  triggered_by: string
  triggered_at: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  notes: string | null
  threshold_breach_reason: string | null
  metadata: Record<string, unknown> | null
  policy_name?: string
  notification_channel?: string
  steps?: RiskEscalationEventStep[]
}

