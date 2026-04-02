/**
 * DRACO Verdict Engine
 * Aggregates board member results, quality scores, and strategic assessment
 * into a final DRACO verdict with detailed remediation guidance.
 *
 * In advisory mode (default): verdict is always recorded but never blocks publication.
 * In blocking mode: REJECT prevents document approval.
 */

import { logger } from '../utils/logger'
import type {
  DracoVerdict,
  DracoThresholds,
  DracoReviewResult,
  DracoQualityScores,
  RemediationStep,
  TemplatePromptImprovement,
  PublicationAdvisory,
  EvidenceValidatorResult,
  GovernanceEvaluatorResult,
  CounterfactualChallengerResult,
  StrategicValueAssessmentResult,
  ModelRotationRecord,
  DracoMode,
} from '../types/draco'
import { v4 as uuidv4 } from 'uuid'

// ─── Score Weighting ──────────────────────────────────────────────────────────

const BOARD_WEIGHTS = {
  evidence_validator:       0.30,
  governance_evaluator:     0.30,
  counterfactual_challenger: 0.25,
  strategic_alignment:      0.15,
}

const QUALITY_WEIGHTS = {
  accuracy:             0.25,
  completeness:         0.20,
  objectivity:          0.18,
  citation_integrity:   0.17,
  professional_quality: 0.12,
  standards_compliance: 0.08,
}

// ─── Composite Score Calculation ──────────────────────────────────────────────

function calcOverallDracoScore(
  boardScores: { evidence: number; governance: number; challenger: number },
  qualityScores: DracoQualityScores,
  strategicScore: number
): number {
  const boardComposite =
    boardScores.evidence       * BOARD_WEIGHTS.evidence_validator +
    boardScores.governance     * BOARD_WEIGHTS.governance_evaluator +
    boardScores.challenger     * BOARD_WEIGHTS.counterfactual_challenger +
    strategicScore             * BOARD_WEIGHTS.strategic_alignment

  const qualityComposite =
    qualityScores.accuracy             * QUALITY_WEIGHTS.accuracy +
    qualityScores.completeness         * QUALITY_WEIGHTS.completeness +
    qualityScores.objectivity          * QUALITY_WEIGHTS.objectivity +
    qualityScores.citation_integrity   * QUALITY_WEIGHTS.citation_integrity +
    qualityScores.professional_quality * QUALITY_WEIGHTS.professional_quality +
    qualityScores.standards_compliance * QUALITY_WEIGHTS.standards_compliance

  // 60% board + 40% quality dimensions
  return Math.round((boardComposite * 0.6) + (qualityComposite * 0.4))
}

// ─── Verdict Determination ────────────────────────────────────────────────────

function determineVerdict(
  overallScore: number,
  thresholds: DracoThresholds,
  evidenceResult: EvidenceValidatorResult,
  governanceResult: GovernanceEvaluatorResult,
  challengerResult: CounterfactualChallengerResult,
  strategicResult: StrategicValueAssessmentResult,
  qualityScores: DracoQualityScores
): { verdict: DracoVerdict; reasoning: string; failedDimensions: string[] } {
  const failedDimensions: string[] = []

  // Check board member pass/fail
  if (!evidenceResult.passed)   failedDimensions.push(`Evidence Validator (${evidenceResult.score} < ${thresholds.evidence_score})`)
  if (!governanceResult.passed) failedDimensions.push(`Governance Evaluator (${governanceResult.score} < ${thresholds.governance_score})`)
  if (!challengerResult.passed) failedDimensions.push(`Counterfactual Challenger (${challengerResult.score} < ${thresholds.resilience_score})`)
  if (!strategicResult.passed)  failedDimensions.push(`Strategic Value (${strategicResult.score} < ${thresholds.strategic_alignment})`)

  // Check quality dimension thresholds
  if (qualityScores.accuracy < thresholds.accuracy)
    failedDimensions.push(`Accuracy (${qualityScores.accuracy} < ${thresholds.accuracy})`)
  if (qualityScores.completeness < thresholds.completeness)
    failedDimensions.push(`Completeness (${qualityScores.completeness} < ${thresholds.completeness})`)
  if (qualityScores.objectivity < thresholds.objectivity)
    failedDimensions.push(`Objectivity (${qualityScores.objectivity} < ${thresholds.objectivity})`)
  if (qualityScores.citation_integrity < thresholds.citation_integrity)
    failedDimensions.push(`Citation Integrity (${qualityScores.citation_integrity} < ${thresholds.citation_integrity})`)
  if (qualityScores.professional_quality < thresholds.professional_quality)
    failedDimensions.push(`Professional Quality (${qualityScores.professional_quality} < ${thresholds.professional_quality})`)
  if (qualityScores.standards_compliance < thresholds.standards_compliance)
    failedDimensions.push(`Standards Compliance (${qualityScores.standards_compliance} < ${thresholds.standards_compliance})`)

  const criticalFailures = failedDimensions.filter(d =>
    d.includes('Evidence') || d.includes('Accuracy') || d.includes('Governance')
  )

  let verdict: DracoVerdict
  let reasoning: string

  if (failedDimensions.length === 0 && overallScore >= thresholds.overall_draco_score) {
    verdict = 'PASS'
    reasoning = `Document passed all DRACO quality thresholds with an overall score of ${overallScore}. All board members approved and strategic value is confirmed.`
  } else if (criticalFailures.length > 0 || failedDimensions.length >= 4) {
    verdict = 'REJECT'
    reasoning = `Document failed ${failedDimensions.length} DRACO dimension(s), including critical failures: ${criticalFailures.join(', ')}. Overall score: ${overallScore}. Significant revision required before this document is ready for publication.`
  } else {
    verdict = 'CONDITIONAL_PASS'
    reasoning = `Document partially meets DRACO standards with a score of ${overallScore}. ${failedDimensions.length} dimension(s) below threshold: ${failedDimensions.join(', ')}. Document may be published in advisory mode with these issues logged. Improvements recommended.`
  }

  return { verdict, reasoning, failedDimensions }
}

// ─── Remediation Steps ────────────────────────────────────────────────────────

function buildRemediationSteps(
  failedDimensions: string[],
  evidenceResult: EvidenceValidatorResult,
  governanceResult: GovernanceEvaluatorResult,
  challengerResult: CounterfactualChallengerResult,
  strategicResult: StrategicValueAssessmentResult
): RemediationStep[] {
  const steps: RemediationStep[] = []

  // Evidence Validator findings → remediation steps
  evidenceResult.recommendations.forEach((rec, i) => {
    if (i < 5) { // Cap at 5 per board member
      steps.push({
        priority: evidenceResult.hallucination_risk === 'critical' ? 'critical' :
                  evidenceResult.hallucination_risk === 'high' ? 'high' : 'medium',
        dimension: 'Evidence & Factual Accuracy',
        description: rec,
        action_required: rec,
        originating_board_member: 'evidence_validator',
      })
    }
  })

  // Governance Evaluator compliance gaps → remediation steps
  governanceResult.compliance_gaps.forEach((gap, i) => {
    if (i < 5) {
      steps.push({
        priority: gap.severity === 'critical' ? 'critical' : gap.severity === 'major' ? 'high' : 'medium',
        dimension: `Governance: ${gap.framework}`,
        description: gap.gap_description,
        action_required: `Address ${gap.framework} requirement: ${gap.requirement}`,
        originating_board_member: 'governance_evaluator',
      })
    }
  })

  // Governance risk flags
  governanceResult.risk_flags.forEach((flag, i) => {
    if (i < 3) {
      steps.push({
        priority: 'high',
        dimension: `Governance Risk: ${flag.risk_type}`,
        description: flag.description,
        action_required: flag.remediation,
        originating_board_member: 'governance_evaluator',
      })
    }
  })

  // Counterfactual Challenger vulnerabilities → remediation
  challengerResult.logical_vulnerabilities.forEach((vuln, i) => {
    if (i < 5) {
      steps.push({
        priority: 'medium',
        dimension: 'Logical Resilience',
        description: vuln.description,
        action_required: vuln.suggested_fix,
        originating_board_member: 'counterfactual_challenger',
      })
    }
  })

  // Strategic alignment gaps
  strategicResult.alignment_gaps.forEach((gap, i) => {
    if (i < 3) {
      steps.push({
        priority: gap.impact === 'high' ? 'high' : 'medium',
        dimension: 'Strategic Alignment',
        description: gap.gap_description,
        action_required: gap.recommendation,
      })
    }
  })

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return steps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

// ─── Template Prompt Improvements ────────────────────────────────────────────

function collectTemplateImprovements(
  templateId: string | undefined,
  evidenceResult: EvidenceValidatorResult,
  governanceResult: GovernanceEvaluatorResult,
  challengerResult: CounterfactualChallengerResult,
  strategicResult: StrategicValueAssessmentResult
): TemplatePromptImprovement[] {
  if (!templateId) return []

  const improvements: TemplatePromptImprovement[] = []
  const allSuggestions = [
    ...evidenceResult.template_prompt_suggestions.map(s => ({ text: s, role: 'evidence_validator' as const })),
    ...governanceResult.template_prompt_suggestions.map(s => ({ text: s, role: 'governance_evaluator' as const })),
    ...challengerResult.template_prompt_suggestions.map(s => ({ text: s, role: 'counterfactual_challenger' as const })),
    ...strategicResult.template_prompt_suggestions.map(s => ({ text: s, role: 'strategic_assessor' as const })),
  ]

  allSuggestions.slice(0, 15).forEach((suggestion, i) => {
    improvements.push({
      template_id: templateId,
      improvement_type: 'prompt_guidance',
      current_behavior: 'Current template prompt does not adequately guide the AI on this aspect',
      suggested_change: suggestion.text,
      expected_impact: 'Improved document quality in subsequent generations from this template',
      priority: i < 3 ? 'high' : i < 7 ? 'medium' : 'low',
      originating_board_member: suggestion.role,
    })
  })

  return improvements
}

// ─── Publication Advisory ─────────────────────────────────────────────────────

function buildPublicationAdvisory(
  verdict: DracoVerdict,
  mode: DracoMode,
  failedDimensions: string[]
): PublicationAdvisory {
  const blockingEnabled = mode === 'blocking'

  if (verdict === 'PASS') {
    return {
      advisable_to_publish: true,
      advisory_summary: '✅ DRACO Review Board unanimously approves this document for publication. All quality thresholds met.',
      blocking_enabled: blockingEnabled,
    }
  }

  if (verdict === 'CONDITIONAL_PASS') {
    return {
      advisable_to_publish: true,
      advisory_summary: `⚠️ DRACO Review Board recommends addressing ${failedDimensions.length} quality issue(s) before publication. Document is conditionally approved in advisory mode.`,
      blocking_enabled: blockingEnabled,
      conditions_for_approval: failedDimensions,
    }
  }

  return {
    advisable_to_publish: blockingEnabled ? false : true,
    advisory_summary: blockingEnabled
      ? `🚫 DRACO Review Board has rejected this document. Publication is blocked until critical issues are resolved: ${failedDimensions.slice(0, 3).join(', ')}.`
      : `❌ DRACO Review Board rejected this document in advisory mode. Publication proceeds but significant quality issues were identified: ${failedDimensions.slice(0, 3).join(', ')}. Immediate revision recommended.`,
    blocking_enabled: blockingEnabled,
    conditions_for_approval: failedDimensions,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface VerdictInput {
  document_id: string
  mode: DracoMode
  thresholds: DracoThresholds
  templateId?: string
  quality_scores: DracoQualityScores
  evidence_result: EvidenceValidatorResult
  governance_result: GovernanceEvaluatorResult
  challenger_result: CounterfactualChallengerResult
  strategic_result: StrategicValueAssessmentResult
  model_rotation_used: ModelRotationRecord[]
  objectivity_score: number
  citation_integrity_score: number
  total_processing_time_ms: number
}

export function renderVerdict(input: VerdictInput): DracoReviewResult {
  const boardScores = {
    evidence:  input.evidence_result.score,
    governance: input.governance_result.score,
    challenger: input.challenger_result.score,
  }

  const overallScore = calcOverallDracoScore(boardScores, input.quality_scores, input.strategic_result.score)

  const { verdict, reasoning, failedDimensions } = determineVerdict(
    overallScore,
    input.thresholds,
    input.evidence_result,
    input.governance_result,
    input.challenger_result,
    input.strategic_result,
    input.quality_scores
  )

  const remediationSteps = buildRemediationSteps(
    failedDimensions,
    input.evidence_result,
    input.governance_result,
    input.challenger_result,
    input.strategic_result
  )

  const templateImprovements = collectTemplateImprovements(
    input.templateId,
    input.evidence_result,
    input.governance_result,
    input.challenger_result,
    input.strategic_result
  )

  const publicationAdvisory = buildPublicationAdvisory(verdict, input.mode, failedDimensions)

  logger.info('[DRACO-VERDICT] Verdict rendered', {
    document_id: input.document_id,
    verdict,
    overallScore,
    failedDimensions: failedDimensions.length,
    mode: input.mode,
  })

  return {
    review_id: uuidv4(),
    document_id: input.document_id,
    verdict,
    mode: input.mode,
    overall_draco_score: overallScore,
    quality_scores: input.quality_scores,
    board_results: {
      evidence_validator: input.evidence_result,
      governance_evaluator: input.governance_result,
      counterfactual_challenger: input.challenger_result,
    },
    strategic_assessment: input.strategic_result,
    model_rotation_used: input.model_rotation_used,
    thresholds_applied: input.thresholds,
    verdict_reasoning: reasoning,
    remediation_steps: remediationSteps,
    template_prompt_improvements: templateImprovements,
    publication_advisory: publicationAdvisory,
    processing_time_ms: input.total_processing_time_ms,
    created_at: new Date(),
  }
}
