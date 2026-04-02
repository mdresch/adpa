/**
 * DRACO (Document Reasoning and Assessment Compliance Orchestra)
 * TypeScript type definitions for the AI Review Board Quality Control System
 */

// ─── Verdict Types ────────────────────────────────────────────────────────────

export type DracoVerdict = 'PASS' | 'CONDITIONAL_PASS' | 'REJECT'

export type DracoBoardRole = 'evidence_validator' | 'governance_evaluator' | 'counterfactual_challenger'

export type DracoMode = 'advisory' | 'blocking'

// ─── Quality Thresholds ───────────────────────────────────────────────────────

export interface DracoThresholds {
  accuracy: number             // default 90
  completeness: number         // default 85
  objectivity: number          // default 80 (NEW dimension)
  citation_integrity: number   // default 85 (NEW dimension)
  professional_quality: number // default 82
  standards_compliance: number // default 85
  evidence_score: number       // board member: Evidence Validator (default 75 pre-tuning)
  governance_score: number     // board member: Governance Evaluator (default 75 pre-tuning)
  resilience_score: number     // board member: Counterfactual Challenger (default 70 pre-tuning)
  strategic_alignment: number  // Strategic Value Assessor (default 70 pre-tuning)
  overall_draco_score: number  // composite (default 78 pre-tuning)
}

export const DRACO_DEFAULT_THRESHOLDS: DracoThresholds = {
  accuracy: 90,
  completeness: 85,
  objectivity: 80,
  citation_integrity: 85,
  professional_quality: 82,
  standards_compliance: 85,
  evidence_score: 75,
  governance_score: 75,
  resilience_score: 70,
  strategic_alignment: 70,
  overall_draco_score: 78,
}

// ─── Board Member Results ─────────────────────────────────────────────────────

export interface BoardMemberResult {
  role: DracoBoardRole
  role_display_name: string
  provider_used: string
  model_used: string
  score: number                    // 0–100
  passed: boolean
  threshold_applied: number
  reasoning: string                // Board member's deliberation rationale
  findings: string[]               // Specific issues found
  strengths: string[]              // What the document does well
  recommendations: string[]        // Actionable improvements for the document
  template_prompt_suggestions: string[] // Prompt improvements for the template
  processing_time_ms: number
  raw_response?: string            // Full AI response for audit trail
}

export interface EvidenceValidatorResult extends BoardMemberResult {
  role: 'evidence_validator'
  unverified_claims: UnverifiedClaim[]
  evidence_coverage_percent: number  // % of factual claims that are grounded
  hallucination_risk: 'low' | 'medium' | 'high' | 'critical'
}

export interface GovernanceEvaluatorResult extends BoardMemberResult {
  role: 'governance_evaluator'
  compliance_gaps: ComplianceGap[]
  risk_flags: ComplianceRiskFlag[]
  frameworks_assessed: string[]
}

export interface CounterfactualChallengerResult extends BoardMemberResult {
  role: 'counterfactual_challenger'
  challenged_assumptions: ChallengedAssumption[]
  logical_vulnerabilities: LogicalVulnerability[]
  unchallenged_weaknesses: string[]
  overall_resilience: 'strong' | 'adequate' | 'weak' | 'fragile'
}

// ─── Supporting Types ─────────────────────────────────────────────────────────

export interface UnverifiedClaim {
  claim: string
  location: string
  reason_unverifiable: string
  severity: 'minor' | 'major' | 'critical'
}

export interface ComplianceGap {
  framework: string
  requirement: string
  gap_description: string
  severity: 'minor' | 'major' | 'critical'
}

export interface ComplianceRiskFlag {
  risk_type: string
  description: string
  affected_section: string
  remediation: string
}

export interface ChallengedAssumption {
  assumption: string
  counter_argument: string
  evidence_against: string
  severity: 'low' | 'medium' | 'high'
}

export interface LogicalVulnerability {
  location: string
  description: string
  suggested_fix: string
}

// ─── Strategic Value Assessment ───────────────────────────────────────────────

export interface StrategicValueAssessmentResult {
  score: number                 // 0–100
  passed: boolean
  alignment_gaps: AlignmentGap[]
  strategic_objectives_covered: string[]
  strategic_objectives_missing: string[]
  document_purpose_alignment: 'strong' | 'adequate' | 'weak' | 'misaligned'
  business_value_assessment: string
  template_prompt_suggestions: string[]
  provider_used: string
  model_used: string
  processing_time_ms: number
}

export interface AlignmentGap {
  objective: string
  gap_description: string
  impact: 'low' | 'medium' | 'high'
  recommendation: string
}

// ─── DRACO Review Result ──────────────────────────────────────────────────────

export interface DracoReviewRequest {
  document_id: string
  document_content: string
  document_type: string
  project_context: Record<string, unknown>
  template_id?: string
  user_id: string
  thresholds?: Partial<DracoThresholds>
  mode: DracoMode
}

export interface DracoQualityScores {
  // Enhanced existing dimensions
  accuracy: number
  completeness: number
  professional_quality: number
  standards_compliance: number
  // New DRACO dimensions
  objectivity: number
  citation_integrity: number
}

export interface DracoReviewResult {
  review_id: string
  document_id: string
  verdict: DracoVerdict
  mode: DracoMode                           // advisory | blocking
  overall_draco_score: number
  quality_scores: DracoQualityScores
  board_results: {
    evidence_validator: EvidenceValidatorResult
    governance_evaluator: GovernanceEvaluatorResult
    counterfactual_challenger: CounterfactualChallengerResult
  }
  strategic_assessment: StrategicValueAssessmentResult
  model_rotation_used: ModelRotationRecord[]
  thresholds_applied: DracoThresholds
  verdict_reasoning: string                 // Aggregated narrative explanation
  remediation_steps: RemediationStep[]      // Ordered list of required fixes
  template_prompt_improvements: TemplatePromptImprovement[] // For templateImprovementService
  publication_advisory: PublicationAdvisory
  processing_time_ms: number
  created_at: Date
}

export interface RemediationStep {
  priority: 'critical' | 'high' | 'medium' | 'low'
  dimension: string
  description: string
  action_required: string
  originating_board_member?: DracoBoardRole
}

export interface TemplatePromptImprovement {
  template_id: string
  improvement_type: string
  current_behavior: string
  suggested_change: string
  expected_impact: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  originating_board_member: DracoBoardRole | 'strategic_assessor'
}

export interface PublicationAdvisory {
  advisable_to_publish: boolean
  advisory_summary: string
  blocking_enabled: boolean    // false in advisory mode
  conditions_for_approval?: string[]
}

// ─── Model Rotation ───────────────────────────────────────────────────────────

export interface ModelRotationRecord {
  board_role: DracoBoardRole
  session_index: number         // Which rotation slot was used
  provider: string
  model: string
  assigned_at: Date
}

export interface ProviderPerformanceRecord {
  id: string
  board_role: DracoBoardRole
  provider: string
  model: string
  review_count: number
  avg_score_delta: number       // Avg difference from other board members' scores (independence measure)
  avg_processing_time_ms: number
  failure_count: number
  last_used_at: Date
  independence_rating: number   // Calculated metric: higher = more independent deliberation
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface DracoReviewRow {
  id: string
  document_id: string
  verdict: DracoVerdict
  mode: DracoMode
  overall_draco_score: number
  accuracy_score: number | null
  completeness_score: number | null
  objectivity_score: number | null
  citation_integrity_score: number | null
  evidence_score: number | null
  governance_score: number | null
  resilience_score: number | null
  strategic_alignment_score: number | null
  board_deliberation: DracoReviewResult | null
  remediation_steps: RemediationStep[] | null
  thresholds_used: DracoThresholds | null
  created_by: string | null
  created_at: Date
}
