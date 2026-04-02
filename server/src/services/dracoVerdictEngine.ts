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
  evidence_validator: 0.30,
  governance_evaluator: 0.30,
  counterfactual_challenger: 0.25,
  strategic_alignment: 0.15,
}

const QUALITY_WEIGHTS = {
  accuracy: 0.25,
  completeness: 0.20,
  objectivity: 0.18,
  citation_integrity: 0.17,
  professional_quality: 0.12,
  standards_compliance: 0.08,
}

// ─── Board Agreement Analysis ─────────────────────────────────────────────────
// High agreement across board members is NOT always a success signal.
// Models sharing training priors can produce silent convergence on the same
// blind spots. We surface this as a governance signal, not a quality score.
//
// "Over‑agreement + high score = possible shared blind spot, not reliability."

const OVER_AGREEMENT_THRESHOLD = 8  // Score spread ≤ 8 points → flag
const HEALTHY_DIVERGENCE_MIN   = 12 // Score spread ≥ 12 points → healthy independence

export interface BoardAgreementSignal {
  score_spread: number            // max − min of the three board scores
  mean_score: number
  is_over_agreed: boolean         // spread ≤ OVER_AGREEMENT_THRESHOLD
  is_healthily_divergent: boolean // spread ≥ HEALTHY_DIVERGENCE_MIN
  signal: 'BLIND_SPOT_RISK' | 'LOW_INDEPENDENCE' | 'HEALTHY_DIVERGENCE' | 'NORMAL'
  note: string
}

function analyseAgreement(
  evidenceScore: number,
  governanceScore: number,
  challengerScore: number
): BoardAgreementSignal {
  const scores = [evidenceScore, governanceScore, challengerScore]
  const spread = Math.max(...scores) - Math.min(...scores)
  const mean   = scores.reduce((s, v) => s + v, 0) / 3

  let signal: BoardAgreementSignal['signal']
  let note: string

  if (spread <= OVER_AGREEMENT_THRESHOLD && mean >= 80) {
    // High agreement at high scores = potential shared blind spot
    signal = 'BLIND_SPOT_RISK'
    note = `All three board members scored within ${spread} points of each other `
         + `(${scores.join('/')}) at a high mean of ${Math.round(mean)}. `
         + `This convergence may indicate shared training priors rather than genuine independent validation. `
         + `Consider whether the Counterfactual Challenger was sufficiently adversarial.`
  } else if (spread <= OVER_AGREEMENT_THRESHOLD && mean < 80) {
    // High agreement on a weak document — consistent problem detection is fine
    signal = 'LOW_INDEPENDENCE'
    note = `Board members are tightly converged (spread: ${spread} pts) on a weak document. `
         + `Consistent failure detection is acceptable and does not indicate shared blind spots.`
  } else if (spread >= HEALTHY_DIVERGENCE_MIN) {
    signal = 'HEALTHY_DIVERGENCE'
    note = `Board shows healthy score divergence (spread: ${spread} pts, scores: ${scores.join('/')}). `
         + `Independent reasoning is evident across roles.`
  } else {
    signal = 'NORMAL'
    note = `Board agreement within normal range (spread: ${spread} pts).`
  }

  return {
    score_spread: spread,
    mean_score: Math.round(mean),
    is_over_agreed: spread <= OVER_AGREEMENT_THRESHOLD,
    is_healthily_divergent: spread >= HEALTHY_DIVERGENCE_MIN,
    signal,
    note,
  }
}



function calcOverallDracoScore(
  boardScores: { evidence: number; governance: number; challenger: number },
  qualityScores: DracoQualityScores,
  strategicScore: number
): number {
  const boardComposite =
    boardScores.evidence * BOARD_WEIGHTS.evidence_validator +
    boardScores.governance * BOARD_WEIGHTS.governance_evaluator +
    boardScores.challenger * BOARD_WEIGHTS.counterfactual_challenger +
    strategicScore * BOARD_WEIGHTS.strategic_alignment

  const qualityComposite =
    qualityScores.accuracy * QUALITY_WEIGHTS.accuracy +
    qualityScores.completeness * QUALITY_WEIGHTS.completeness +
    qualityScores.objectivity * QUALITY_WEIGHTS.objectivity +
    qualityScores.citation_integrity * QUALITY_WEIGHTS.citation_integrity +
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
  if (!evidenceResult.passed) failedDimensions.push(`Evidence Validator (${evidenceResult.score} < ${thresholds.evidence_score})`)
  if (!governanceResult.passed) failedDimensions.push(`Governance Evaluator (${governanceResult.score} < ${thresholds.governance_score})`)
  if (!challengerResult.passed) failedDimensions.push(`Counterfactual Challenger (${challengerResult.score} < ${thresholds.resilience_score})`)
  if (!strategicResult.passed) failedDimensions.push(`Strategic Value (${strategicResult.score} < ${thresholds.strategic_alignment})`)

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
  failedDimensions: string[],
  agreementSignal: BoardAgreementSignal
): PublicationAdvisory {
  const blockingEnabled = mode === 'blocking'
  const blindSpotWarning = agreementSignal.signal === 'BLIND_SPOT_RISK'
    ? ` ⚠ Note: Board agreement is unusually high — see deliberation for potential shared blind spot analysis.`
    : ''

  if (verdict === 'PASS') {
    return {
      advisable_to_publish: true,
      advisory_summary: `✅ Review Board approved this document (score: ${agreementSignal.mean_score}/100). `
        + `All quality thresholds met.${blindSpotWarning} `
        + `Next: Consider whether any board findings warrant a template prompt improvement before the next generation.`,
      blocking_enabled: blockingEnabled,
    }
  }

  if (verdict === 'CONDITIONAL_PASS') {
    const topIssues = failedDimensions.slice(0, 2).join(' and ')
    return {
      advisable_to_publish: true,
      advisory_summary: `⚠ Board has concerns — specifically around ${topIssues}. `
        + `Document may proceed in advisory mode, but these ${failedDimensions.length} issue(s) should be resolved in the next revision. `
        + `What to do: Review the Remediation tab and address critical items before promoting to approved status.${blindSpotWarning}`,
      blocking_enabled: blockingEnabled,
      conditions_for_approval: failedDimensions,
    }
  }

  return {
    advisable_to_publish: blockingEnabled ? false : true,
    advisory_summary: blockingEnabled
      ? `🚫 Board rejected this document. ${failedDimensions.length} dimension(s) failed including: ${failedDimensions.slice(0, 3).join(', ')}. `
        + `What to do: Address the issues listed in the Remediation tab — then re-run the board review.`
      : `❌ Board rejected this document (advisory mode — publication not blocked). `
        + `${failedDimensions.length} dimension(s) require attention: ${failedDimensions.slice(0, 3).join(', ')}. `
        + `What to do: Review Remediation steps and revise the document. Continued publication without resolution will be tracked in audit history.${blindSpotWarning}`,
    blocking_enabled: blockingEnabled,
    override_required: blockingEnabled ? true : false,
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

export function renderVerdict(input: VerdictInput): DracoReviewResult & { board_agreement: BoardAgreementSignal } {
  const boardScores = {
    evidence: input.evidence_result.score,
    governance: input.governance_result.score,
    challenger: input.challenger_result.score,
  }

  const overallScore = calcOverallDracoScore(boardScores, input.quality_scores, input.strategic_result.score)

  // Analyse board agreement before rendering verdict — high convergence at high scores
  // may indicate shared blind spots rather than genuine independent validation.
  const agreementSignal = analyseAgreement(boardScores.evidence, boardScores.governance, boardScores.challenger)

  if (agreementSignal.signal === 'BLIND_SPOT_RISK') {
    logger.warn('[DRACO-VERDICT] ⚠ Board over-agreement detected — possible shared blind spot', {
      document_id: input.document_id,
      score_spread: agreementSignal.score_spread,
      scores: [boardScores.evidence, boardScores.governance, boardScores.challenger],
      note: agreementSignal.note,
    })
  }

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

  const publicationAdvisory = buildPublicationAdvisory(verdict, input.mode, failedDimensions, agreementSignal)

  logger.info('[DRACO-VERDICT] Verdict rendered', {
    document_id: input.document_id,
    verdict,
    overallScore,
    failedDimensions: failedDimensions.length,
    mode: input.mode,
    agreement_signal: agreementSignal.signal,
    score_spread: agreementSignal.score_spread,
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
    board_agreement: agreementSignal,
  }
}
