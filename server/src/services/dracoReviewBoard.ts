/**
 * DRACO Review Board
 * Orchestrates three independent AI judges, each using a rotating AI provider
 * to ensure independence of deliberation.
 *
 * Board Roles:
 *  1. Evidence Validator  — factual grounding, hallucination detection
 *  2. Governance Evaluator — compliance focus (PMBOK, GDPR, SOC2, etc.)
 *  3. Counterfactual Challenger — adversarial critic of the document's claims
 */

import { getDatabasePoolSafe } from '../database/connection'
import { aiService } from './aiService'
import { logger } from '../utils/logger'
import type {
  DracoBoardRole,
  DracoThresholds,
  EvidenceValidatorResult,
  GovernanceEvaluatorResult,
  CounterfactualChallengerResult,
  BoardMemberResult,
  ModelRotationRecord,
} from '../types/draco'

// ─── Model Rotation Registry ──────────────────────────────────────────────────

interface RotationCandidate {
  provider: string
  model?: string
}

/**
 * Fetches active providers from DB and builds a rotation list.
 * Each board role uses a different slot (offset) to ensure they never
 * call the same provider in the same session.
 */
async function getRotationCandidates(): Promise<RotationCandidate[]> {
  try {
    const pool = getDatabasePoolSafe()
    if (!pool) return [{ provider: 'google' }, { provider: 'openai' }, { provider: 'anthropic' }]

    const result = await pool.query<{ provider_type: string; configuration: any }>(
      `SELECT provider_type, configuration 
       FROM ai_providers 
       WHERE is_active = true 
       ORDER BY priority ASC, name ASC`
    )

    if (!result.rows.length) {
      logger.warn('[DRACO-ROTATION] No active providers found, using fallback list')
      return [{ provider: 'google' }, { provider: 'openai' }, { provider: 'anthropic' }]
    }

    return result.rows.map(row => ({
      provider: row.provider_type,
      model: row.configuration?.default_model || row.configuration?.model || undefined,
    }))
  } catch (err) {
    logger.error('[DRACO-ROTATION] Failed to fetch rotation candidates', { error: String(err) })
    return [{ provider: 'google' }, { provider: 'openai' }, { provider: 'anthropic' }]
  }
}

/**
 * Advances the rotation cursor for a board role and returns the assigned provider.
 * Uses the DB draco_rotation_state table for persistent cursor state.
 */
async function assignProviderForRole(
  role: DracoBoardRole,
  candidates: RotationCandidate[],
  sessionOffsets: Map<DracoBoardRole, number>
): Promise<{ provider: string; model?: string; sessionIndex: number }> {
  if (candidates.length === 0) {
    return { provider: 'google', sessionIndex: 0 }
  }

  const offset = sessionOffsets.get(role) ?? 0
  const idx = offset % candidates.length
  const candidate = candidates[idx]

  // Advance cursor in DB asynchronously (non-blocking)
  const pool = getDatabasePoolSafe()
  if (pool) {
    pool.query(
      `UPDATE draco_rotation_state 
       SET current_index = ($1 + 1) % $2, total_reviews = total_reviews + 1, updated_at = NOW()
       WHERE board_role = $3`,
      [idx, candidates.length, role]
    ).catch((err: Error) => logger.warn('[DRACO-ROTATION] Cursor update failed', { error: err.message }))
  }

  return {
    provider: candidate.provider,
    model: candidate.model,
    sessionIndex: idx,
  }
}

/**
 * Builds per-role offsets so each board member uses a DIFFERENT provider
 * in the same review session, maximising independence.
 */
async function buildSessionOffsets(
  candidates: RotationCandidate[]
): Promise<Map<DracoBoardRole, number>> {
  const offsets = new Map<DracoBoardRole, number>()
  const roles: DracoBoardRole[] = ['evidence_validator', 'governance_evaluator', 'counterfactual_challenger']

  try {
    const pool = getDatabasePoolSafe()
    if (pool) {
      const result = await pool.query<{ board_role: string; current_index: number }>(
        `SELECT board_role, current_index FROM draco_rotation_state WHERE board_role = ANY($1)`,
        [roles]
      )
      for (const row of result.rows) {
        offsets.set(row.board_role as DracoBoardRole, row.current_index)
      }
    }
  } catch {
    // Fall back to staggered static offsets
  }

  // Ensure each role has a distinct offset by staggering if not in DB
  roles.forEach((role, i) => {
    if (!offsets.has(role)) {
      offsets.set(role, i % Math.max(candidates.length, 1))
    }
  })

  return offsets
}

// ─── Provider Performance Tracking ───────────────────────────────────────────

async function recordProviderPerformance(
  role: DracoBoardRole,
  provider: string,
  model: string | undefined,
  score: number,
  peerAvg: number,
  processingTimeMs: number,
  failed: boolean
) {
  try {
    const pool = getDatabasePoolSafe()
    if (!pool) return

    const delta = Math.abs(score - peerAvg)
    // Independence rating: higher delta from peer average = more independent
    // We use a 0–100 scale where 30+ delta = fully independent
    const independenceRating = Math.min(100, (delta / 30) * 100)

    await pool.query(
      `INSERT INTO draco_provider_performance 
         (board_role, provider, model, review_count, avg_score, avg_score_delta, avg_processing_time_ms, failure_count, independence_rating, last_used_at, updated_at)
       VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (board_role, provider, model) DO UPDATE SET
         review_count = draco_provider_performance.review_count + 1,
         avg_score = (draco_provider_performance.avg_score * draco_provider_performance.review_count + $4) / (draco_provider_performance.review_count + 1),
         avg_score_delta = (draco_provider_performance.avg_score_delta * draco_provider_performance.review_count + $5) / (draco_provider_performance.review_count + 1),
         avg_processing_time_ms = (draco_provider_performance.avg_processing_time_ms * draco_provider_performance.review_count + $6) / (draco_provider_performance.review_count + 1),
         failure_count = draco_provider_performance.failure_count + $7,
         independence_rating = ($5 / 30.0) * 100,
         last_used_at = NOW(),
         updated_at = NOW()`,
      [role, provider, model ?? 'default', score, delta, processingTimeMs, failed ? 1 : 0, independenceRating]
    )
  } catch (err) {
    logger.warn('[DRACO-PERF] Failed to record provider performance', { error: String(err) })
  }
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

function buildEvidenceValidatorPrompt(content: string, documentType: string, projectContext: Record<string, unknown>): string {
  return `You are the Evidence Validator on the DRACO AI Review Board — a specialist in factual verification.

Your role: Rigorously examine the following ${documentType} document and verify that every factual claim, statistic, and assertion is GROUNDED in the provided project context. Identify any hallucinated or unverifiable content.

## Project Context Available as Evidence:
- Project Name: ${projectContext.name || 'N/A'}
- Framework: ${projectContext.framework || 'N/A'}
- Description: ${projectContext.description || 'N/A'}
- Status: ${projectContext.status || 'N/A'}

## Document to Review (${documentType}):
\`\`\`
${content.substring(0, 45000)}${content.length > 45000 ? '\n... [truncated for length]' : ''}
\`\`\`

## Your Evidence Validation Task:
1. **Score (0-100)**: Rate factual grounding. 100 = every claim verifiable. 0 = pervasive hallucination.
2. **Unverified Claims**: List specific claims not supported by the project context
3. **Evidence Coverage**: What percentage of factual claims ARE grounded?
4. **Hallucination Risk**: overall risk level (low/medium/high/critical)
5. **Strengths**: What factual aspects are well-grounded?
6. **Recommendations**: Document corrections needed
7. **Template Prompt Suggestions**: How should the template prompt be improved to prevent these issues?

Respond ONLY with valid JSON in this exact structure:
\`\`\`json
{
  "score": <0-100>,
  "reasoning": "<your deliberation rationale>",
  "findings": ["<specific issue 1>", "<specific issue 2>"],
  "strengths": ["<strength 1>"],
  "recommendations": ["<actionable fix 1>"],
  "template_prompt_suggestions": ["<prompt improvement 1>"],
  "unverified_claims": [
    {"claim": "<claim text>", "location": "<section>", "reason_unverifiable": "<why>", "severity": "minor|major|critical"}
  ],
  "evidence_coverage_percent": <0-100>,
  "hallucination_risk": "low|medium|high|critical"
}
\`\`\`
CRITICAL: Respond ONLY with the JSON block. No preamble, no explanation outside JSON.`
}

function buildGovernanceEvaluatorPrompt(content: string, documentType: string, projectContext: Record<string, unknown>): string {
  return `You are the Governance Evaluator on the DRACO AI Review Board — a specialist in regulatory compliance and governance risk.

Your role: Evaluate the following ${documentType} document for compliance with applicable frameworks (PMBOK, BABOK, GDPR, SOC2, HIPAA, ISO standards) and identify any governance risks introduced by the document itself.

## Project Context:
- Project Name: ${projectContext.name || 'N/A'}
- Framework: ${projectContext.framework || 'N/A'}
- Description: ${projectContext.description || 'N/A'}

## Document to Review (${documentType}):
\`\`\`
${content.substring(0, 45000)}${content.length > 45000 ? '\n... [truncated for length]' : ''}
\`\`\`

## Your Governance Evaluation Task:
1. **Score (0-100)**: Rate governance compliance. 100 = fully compliant, no risks.
2. **Compliance Gaps**: Identify specific requirements not met
3. **Risk Flags**: Any governance risks the document introduces
4. **Frameworks Assessed**: Which frameworks apply to this document type
5. **Objectivity Score (0-100)**: Is the document neutral and unbiased?
6. **Citation Integrity Score (0-100)**: Are references accurate and verifiable?
7. **Template Prompt Suggestions**: How to improve the template prompt for better compliance?

Respond ONLY with valid JSON:
\`\`\`json
{
  "score": <0-100>,
  "objectivity_score": <0-100>,
  "citation_integrity_score": <0-100>,
  "reasoning": "<deliberation rationale>",
  "findings": ["<compliance issue 1>"],
  "strengths": ["<compliance strength 1>"],
  "recommendations": ["<actionable fix>"],
  "template_prompt_suggestions": ["<prompt improvement>"],
  "compliance_gaps": [
    {"framework": "<name>", "requirement": "<req>", "gap_description": "<desc>", "severity": "minor|major|critical"}
  ],
  "risk_flags": [
    {"risk_type": "<type>", "description": "<desc>", "affected_section": "<section>", "remediation": "<fix>"}
  ],
  "frameworks_assessed": ["<framework1>", "<framework2>"]
}
\`\`\`
CRITICAL: Respond ONLY with the JSON block.`
}

function buildCounterfactualChallengerPrompt(content: string, documentType: string, projectContext: Record<string, unknown>): string {
  return `You are the Counterfactual Challenger on the DRACO AI Review Board — a rigorous adversarial critic whose job is to CHALLENGE this document.

Your role: Take a critical, adversarial perspective. Question every assumption. Test every argument. Identify logical vulnerabilities. Your goal is NOT to be supportive — it is to stress-test the document's claims, recommendations, and logic.

If the document says "X will succeed" — ask why it might FAIL.
If the document makes a recommendation — propose a credible counter-position.
If the document presents risks — question whether the most serious risks are even listed.

## Project Context:
- Project Name: ${projectContext.name || 'N/A'}
- Framework: ${projectContext.framework || 'N/A'}

## Document to Challenge (${documentType}):
\`\`\`
${content.substring(0, 45000)}${content.length > 45000 ? '\n... [truncated for length]' : ''}
\`\`\`

## Your Counterfactual Challenge Task:
1. **Score (0-100)**: Rate the document's logical resilience. 100 = withstood all challenges. 0 = completely fragile.
2. **Challenged Assumptions**: List key assumptions, the counter-argument, and evidence against each
3. **Logical Vulnerabilities**: Specific logical gaps, non-sequiturs, or circular reasoning
4. **Unchallenged Weaknesses**: Significant risk areas the document fails to acknowledge
5. **Overall Resilience**: strong/adequate/weak/fragile
6. **Recommendations**: What the document needs to address to become more resilient
7. **Template Prompt Suggestions**: How to improve the template prompt to produce more critically resilient documents?

This is NOT quality assurance from a friendly editor — you are a sharp critical thinker who assumes the worst.

Respond ONLY with valid JSON:
\`\`\`json
{
  "score": <0-100>,
  "reasoning": "<adversarial deliberation>",
  "findings": ["<logical flaw 1>"],
  "strengths": ["<what withstood challenge>"],
  "recommendations": ["<what must be addressed>"],
  "template_prompt_suggestions": ["<prompt improvement>"],
  "challenged_assumptions": [
    {"assumption": "<assumption>", "counter_argument": "<counter>", "evidence_against": "<evidence>", "severity": "low|medium|high"}
  ],
  "logical_vulnerabilities": [
    {"location": "<section>", "description": "<vulnerability>", "suggested_fix": "<fix>"}
  ],
  "unchallenged_weaknesses": ["<weakness 1>"],
  "overall_resilience": "strong|adequate|weak|fragile"
}
\`\`\`
CRITICAL: Respond ONLY with the JSON block.`
}

// ─── JSON Parsing ─────────────────────────────────────────────────────────────

function parseAIJson(raw: string): Record<string, unknown> {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const sanitized = cleaned
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    return JSON.parse(sanitized)
  }
}

function safeNum(val: unknown, fallback = 70): number {
  const n = Number(val)
  return isNaN(n) || n < 0 || n > 100 ? fallback : n
}

// ─── Board Member Execution ───────────────────────────────────────────────────

async function runEvidenceValidator(
  content: string,
  documentType: string,
  projectContext: Record<string, unknown>,
  provider: string,
  model: string | undefined,
  threshold: number
): Promise<EvidenceValidatorResult> {
  const start = Date.now()
  const prompt = buildEvidenceValidatorPrompt(content, documentType, projectContext)

  try {
    const result = await aiService.generateWithFallback({
      provider,
      model,
      prompt,
      temperature: 0.2,
      max_tokens: 3000,
      aiCallType: 'draco_evidence_validation',
    })

    const data = parseAIJson(result.content)
    const score = safeNum(data.score, 70)
    const processingTime = Date.now() - start

    return {
      role: 'evidence_validator',
      role_display_name: 'Evidence Validator',
      provider_used: result.providerUsed ?? provider,
      model_used: result.model ?? model ?? 'default',
      score,
      passed: score >= threshold,
      threshold_applied: threshold,
      reasoning: String(data.reasoning ?? ''),
      findings: Array.isArray(data.findings) ? data.findings : [],
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      template_prompt_suggestions: Array.isArray(data.template_prompt_suggestions) ? data.template_prompt_suggestions : [],
      processing_time_ms: processingTime,
      raw_response: result.content,
      unverified_claims: Array.isArray(data.unverified_claims) ? data.unverified_claims : [],
      evidence_coverage_percent: safeNum(data.evidence_coverage_percent, 75),
      hallucination_risk: (['low', 'medium', 'high', 'critical'].includes(String(data.hallucination_risk))
        ? data.hallucination_risk : 'medium') as 'low' | 'medium' | 'high' | 'critical',
    }
  } catch (err) {
    logger.error('[DRACO-BOARD] Evidence Validator failed', { provider, error: String(err) })
    return buildFallbackBoardResult('evidence_validator', 'Evidence Validator', provider, model, threshold, Date.now() - start) as EvidenceValidatorResult
  }
}

async function runGovernanceEvaluator(
  content: string,
  documentType: string,
  projectContext: Record<string, unknown>,
  provider: string,
  model: string | undefined,
  threshold: number
): Promise<GovernanceEvaluatorResult> {
  const start = Date.now()
  const prompt = buildGovernanceEvaluatorPrompt(content, documentType, projectContext)

  try {
    const result = await aiService.generateWithFallback({
      provider,
      model,
      prompt,
      temperature: 0.2,
      max_tokens: 3000,
      aiCallType: 'draco_governance_evaluation',
    })

    const data = parseAIJson(result.content)
    const score = safeNum(data.score, 70)
    const processingTime = Date.now() - start

    return {
      role: 'governance_evaluator',
      role_display_name: 'Governance Evaluator',
      provider_used: result.providerUsed ?? provider,
      model_used: result.model ?? model ?? 'default',
      score,
      passed: score >= threshold,
      threshold_applied: threshold,
      reasoning: String(data.reasoning ?? ''),
      findings: Array.isArray(data.findings) ? data.findings : [],
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      template_prompt_suggestions: Array.isArray(data.template_prompt_suggestions) ? data.template_prompt_suggestions : [],
      processing_time_ms: processingTime,
      raw_response: result.content,
      compliance_gaps: Array.isArray(data.compliance_gaps) ? data.compliance_gaps : [],
      risk_flags: Array.isArray(data.risk_flags) ? data.risk_flags : [],
      frameworks_assessed: Array.isArray(data.frameworks_assessed) ? data.frameworks_assessed : [],
      // Expose objectivity + citation scores for the quality audit linkage
      _objectivity_score: safeNum(data.objectivity_score, 75),
      _citation_integrity_score: safeNum(data.citation_integrity_score, 80),
    } as GovernanceEvaluatorResult & { _objectivity_score: number; _citation_integrity_score: number }
  } catch (err) {
    logger.error('[DRACO-BOARD] Governance Evaluator failed', { provider, error: String(err) })
    return buildFallbackBoardResult('governance_evaluator', 'Governance Evaluator', provider, model, threshold, Date.now() - start) as GovernanceEvaluatorResult
  }
}

async function runCounterfactualChallenger(
  content: string,
  documentType: string,
  projectContext: Record<string, unknown>,
  provider: string,
  model: string | undefined,
  threshold: number
): Promise<CounterfactualChallengerResult> {
  const start = Date.now()
  const prompt = buildCounterfactualChallengerPrompt(content, documentType, projectContext)

  try {
    const result = await aiService.generateWithFallback({
      provider,
      model,
      prompt,
      temperature: 0.4, // Slightly higher for creative counter-thinking
      max_tokens: 3500,
      aiCallType: 'draco_counterfactual_challenge',
    })

    const data = parseAIJson(result.content)
    const score = safeNum(data.score, 65)
    const processingTime = Date.now() - start

    const resilience = ['strong', 'adequate', 'weak', 'fragile'].includes(String(data.overall_resilience))
      ? (data.overall_resilience as 'strong' | 'adequate' | 'weak' | 'fragile')
      : 'adequate'

    return {
      role: 'counterfactual_challenger',
      role_display_name: 'Counterfactual Challenger',
      provider_used: result.providerUsed ?? provider,
      model_used: result.model ?? model ?? 'default',
      score,
      passed: score >= threshold,
      threshold_applied: threshold,
      reasoning: String(data.reasoning ?? ''),
      findings: Array.isArray(data.findings) ? data.findings : [],
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      template_prompt_suggestions: Array.isArray(data.template_prompt_suggestions) ? data.template_prompt_suggestions : [],
      processing_time_ms: processingTime,
      raw_response: result.content,
      challenged_assumptions: Array.isArray(data.challenged_assumptions) ? data.challenged_assumptions : [],
      logical_vulnerabilities: Array.isArray(data.logical_vulnerabilities) ? data.logical_vulnerabilities : [],
      unchallenged_weaknesses: Array.isArray(data.unchallenged_weaknesses) ? data.unchallenged_weaknesses : [],
      overall_resilience: resilience,
    }
  } catch (err) {
    logger.error('[DRACO-BOARD] Counterfactual Challenger failed', { provider, error: String(err) })
    return buildFallbackBoardResult('counterfactual_challenger', 'Counterfactual Challenger', provider, model, threshold, Date.now() - start) as CounterfactualChallengerResult
  }
}

function buildFallbackBoardResult(
  role: DracoBoardRole,
  displayName: string,
  provider: string,
  model: string | undefined,
  threshold: number,
  processingTimeMs: number
): BoardMemberResult {
  return {
    role,
    role_display_name: displayName,
    provider_used: provider,
    model_used: model ?? 'default',
    score: 60,
    passed: false,
    threshold_applied: threshold,
    reasoning: 'Board member AI call failed — using conservative fallback score.',
    findings: ['Board member evaluation could not be completed due to AI provider error.'],
    strengths: [],
    recommendations: ['Please trigger a manual DRACO re-review once AI providers are available.'],
    template_prompt_suggestions: [],
    processing_time_ms: processingTimeMs,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BoardReviewInput {
  content: string
  documentType: string
  projectContext: Record<string, unknown>
  thresholds: DracoThresholds
}

export interface BoardReviewOutput {
  evidence_validator: EvidenceValidatorResult
  governance_evaluator: GovernanceEvaluatorResult
  counterfactual_challenger: CounterfactualChallengerResult
  model_rotation_used: ModelRotationRecord[]
  objectivity_score: number
  citation_integrity_score: number
}

export async function runBoardReview(input: BoardReviewInput): Promise<BoardReviewOutput> {
  logger.info('[DRACO-BOARD] Starting board review with model rotation')

  const candidates = await getRotationCandidates()
  const sessionOffsets = await buildSessionOffsets(candidates)

  const [evAssignment, govAssignment, challengerAssignment] = await Promise.all([
    assignProviderForRole('evidence_validator', candidates, sessionOffsets),
    assignProviderForRole('governance_evaluator', candidates, sessionOffsets),
    assignProviderForRole('counterfactual_challenger', candidates, sessionOffsets),
  ])

  logger.info('[DRACO-BOARD] Model rotation assigned', {
    evidence_validator: evAssignment.provider,
    governance_evaluator: govAssignment.provider,
    counterfactual_challenger: challengerAssignment.provider,
  })

  // Run all three board members in parallel
  const [evResult, govResult, challengerResult] = await Promise.all([
    runEvidenceValidator(
      input.content, input.documentType, input.projectContext,
      evAssignment.provider, evAssignment.model, input.thresholds.evidence_score
    ),
    runGovernanceEvaluator(
      input.content, input.documentType, input.projectContext,
      govAssignment.provider, govAssignment.model, input.thresholds.governance_score
    ),
    runCounterfactualChallenger(
      input.content, input.documentType, input.projectContext,
      challengerAssignment.provider, challengerAssignment.model, input.thresholds.resilience_score
    ),
  ])

  // Calculate peer average for independence metrics
  const peerAvg = (evResult.score + govResult.score + challengerResult.score) / 3

  // Record performance asynchronously
  Promise.all([
    recordProviderPerformance('evidence_validator', evResult.provider_used, evResult.model_used, evResult.score, peerAvg, evResult.processing_time_ms, false),
    recordProviderPerformance('governance_evaluator', govResult.provider_used, govResult.model_used, govResult.score, peerAvg, govResult.processing_time_ms, false),
    recordProviderPerformance('counterfactual_challenger', challengerResult.provider_used, challengerResult.model_used, challengerResult.score, peerAvg, challengerResult.processing_time_ms, false),
  ]).catch(err => logger.warn('[DRACO-BOARD] Performance recording failed', { error: String(err) }))

  const rotationUsed: ModelRotationRecord[] = [
    { board_role: 'evidence_validator', session_index: evAssignment.sessionIndex, provider: evResult.provider_used, model: evResult.model_used, assigned_at: new Date() },
    { board_role: 'governance_evaluator', session_index: govAssignment.sessionIndex, provider: govResult.provider_used, model: govResult.model_used, assigned_at: new Date() },
    { board_role: 'counterfactual_challenger', session_index: challengerAssignment.sessionIndex, provider: challengerResult.provider_used, model: challengerResult.model_used, assigned_at: new Date() },
  ]

  // Extract objectivity + citation scores from governance evaluator (which is the compliance specialist)
  const govExtended = govResult as GovernanceEvaluatorResult & { _objectivity_score?: number; _citation_integrity_score?: number }
  const objectivity_score = govExtended._objectivity_score ?? 75
  const citation_integrity_score = govExtended._citation_integrity_score ?? 80

  logger.info('[DRACO-BOARD] Board review complete', {
    evidence: evResult.score,
    governance: govResult.score,
    challenger: challengerResult.score,
    objectivity: objectivity_score,
    citation_integrity: citation_integrity_score,
  })

  return {
    evidence_validator: evResult,
    governance_evaluator: govResult,
    counterfactual_challenger: challengerResult,
    model_rotation_used: rotationUsed,
    objectivity_score,
    citation_integrity_score,
  }
}
