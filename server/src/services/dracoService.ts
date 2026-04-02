/**
 * DRACO Service — Top-Level Orchestrator
 * Public API for running the full DRACO review pipeline:
 *   QualityAudit → Board Review → Strategic Assessment → Verdict → DB Persist → Template Feedback
 *
 * Usage:
 *   const result = await dracoService.runFullReview({ documentId, content, projectContext, userId })
 */

import { logger } from '../utils/logger'
import { getDatabasePoolSafe } from '../database/connection'
import { runBoardReview } from './dracoReviewBoard'
import { runStrategicValueAssessment } from './dracoStrategicValueAssessor'
import { renderVerdict } from './dracoVerdictEngine'
import type {
  DracoReviewRequest,
  DracoReviewResult,
  DracoThresholds,
  DracoMode,
  DracoQualityScores,
} from '../types/draco'
import { DRACO_DEFAULT_THRESHOLDS } from '../types/draco'

// ─── Template Config Loader ───────────────────────────────────────────────────

interface TemplateConfig {
  draco_enabled: boolean
  draco_blocking_enabled: boolean
  draco_thresholds: Partial<DracoThresholds> | null
}

async function getTemplateConfig(templateId: string | undefined): Promise<TemplateConfig | null> {
  if (!templateId) return null
  try {
    const pool = getDatabasePoolSafe()
    if (!pool) return null

    const result = await pool.query<TemplateConfig>(
      `SELECT draco_enabled, draco_blocking_enabled, draco_thresholds 
       FROM templates 
       WHERE id = $1 AND deleted_at IS NULL 
       LIMIT 1`,
      [templateId]
    )
    return result.rows[0] ?? null
  } catch (err) {
    logger.warn('[DRACO] Failed to load template config', { templateId, error: String(err) })
    return null
  }
}

function buildThresholds(templateConfig: TemplateConfig | null): DracoThresholds {
  if (!templateConfig?.draco_thresholds) return { ...DRACO_DEFAULT_THRESHOLDS }
  return {
    ...DRACO_DEFAULT_THRESHOLDS,
    ...templateConfig.draco_thresholds,
  }
}

// ─── Quality Score Extraction from Audit ─────────────────────────────────────

/**
 * If a standard quality audit result is available, extract its scores to
 * populate the DRACO quality dimensions. Otherwise use board member results.
 */
function buildQualityScores(
  auditScores: Record<string, number> | null,
  boardObjectivity: number,
  boardCitationIntegrity: number
): DracoQualityScores {
  return {
    accuracy:             auditScores?.accuracy             ?? 75,
    completeness:         auditScores?.completeness         ?? 70,
    objectivity:          boardObjectivity,
    citation_integrity:   boardCitationIntegrity,
    professional_quality: auditScores?.professionalQuality  ?? 70,
    standards_compliance: auditScores?.standardsCompliance  ?? 70,
  }
}

// ─── Persist to Database ──────────────────────────────────────────────────────

async function persistDracoReview(
  result: DracoReviewResult,
  userId: string,
  templateId: string | undefined
): Promise<void> {
  try {
    const pool = getDatabasePoolSafe()
    if (!pool) {
      logger.warn('[DRACO] DB pool unavailable, skipping persist')
      return
    }

    await pool.query(
      `INSERT INTO draco_reviews (
        id, document_id, verdict, mode, overall_draco_score,
        accuracy_score, completeness_score, professional_quality_score, standards_compliance_score,
        objectivity_score, citation_integrity_score,
        evidence_score, governance_score, resilience_score, strategic_alignment_score,
        board_deliberation, remediation_steps, thresholds_used, model_rotation_used, publication_advisory,
        template_id, created_by, processing_time_ms, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, NOW()
      )`,
      [
        result.review_id,
        result.document_id,
        result.verdict,
        result.mode,
        result.overall_draco_score,
        result.quality_scores.accuracy,
        result.quality_scores.completeness,
        result.quality_scores.professional_quality,
        result.quality_scores.standards_compliance,
        result.quality_scores.objectivity,
        result.quality_scores.citation_integrity,
        result.board_results.evidence_validator.score,
        result.board_results.governance_evaluator.score,
        result.board_results.counterfactual_challenger.score,
        result.strategic_assessment.score,
        JSON.stringify(result),           // Full board deliberation stored as JSONB
        JSON.stringify(result.remediation_steps),
        JSON.stringify(result.thresholds_applied),
        JSON.stringify(result.model_rotation_used),
        JSON.stringify(result.publication_advisory),
        templateId ?? null,
        userId,
        result.processing_time_ms,
      ]
    )

    // Update quality_audit with new dimensions if related quality audit exists
    await pool.query(
      `UPDATE quality_audits 
       SET objectivity_score = $1, citation_integrity_score = $2, draco_review_id = $3
       WHERE document_id = $4 
       AND id = (SELECT id FROM quality_audits WHERE document_id = $4 ORDER BY audited_at DESC LIMIT 1)`,
      [
        result.quality_scores.objectivity,
        result.quality_scores.citation_integrity,
        result.review_id,
        result.document_id,
      ]
    )

    logger.info('[DRACO] Review persisted to database', {
      review_id: result.review_id,
      verdict: result.verdict,
      document_id: result.document_id,
    })
  } catch (err) {
    logger.error('[DRACO] Failed to persist DRACO review', { error: String(err) })
    // Non-blocking — don't throw, review result is still returned to caller
  }
}

// ─── Template Improvement Feedback ───────────────────────────────────────────

async function feedTemplateImprovements(result: DracoReviewResult, userId: string): Promise<void> {
  const improvements = result.template_prompt_improvements
  if (!improvements.length) return

  // Group improvements by template_id 
  const templateId = improvements[0]?.template_id
  if (!templateId) return

  try {
    // Save DRACO board suggestions directly to template_improvement_suggestions table
    // This follows the same pattern as templateImprovementService.saveImprovementSuggestions
    const pool = getDatabasePoolSafe()
    if (!pool) return

    const mappedImprovements = improvements.slice(0, 10).map(imp => ({
      issue_addressed: `DRACO Board: ${imp.originating_board_member}`,
      proposed_change: imp.suggested_change,
      change_type: 'draco_board_recommendation',
      section: 'system_prompt',
      expected_impact: { dimension: imp.improvement_type, current_score: 70, predicted_score: 85, gain: 15 },
      priority: imp.priority,
      implementation_difficulty: 'moderate',
      rationale: `${imp.current_behavior}. Expected: ${imp.expected_impact}`,
    }))

    await pool.query(
      `INSERT INTO template_improvement_suggestions (
        template_id, analysis_period_start, analysis_period_end, documents_analyzed,
        current_avg_quality, current_completeness, current_consistency,
        current_professional_quality, current_standards_compliance,
        common_issues, issue_frequency, suggested_improvements,
        improvement_rationale, expected_quality_gain, priority,
        analyzer_ai_provider, analyzer_ai_model, analysis_tokens, analysis_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        templateId,
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
        1, // document count for this DRACO review
        result.overall_draco_score,
        result.quality_scores.completeness,
        85, // consistency not tracked by DRACO separately
        result.quality_scores.professional_quality,
        result.quality_scores.standards_compliance,
        JSON.stringify([{ severity: 'medium', dimension: 'DRACO', description: 'Board review findings', count: improvements.length }]),
        JSON.stringify({}),
        JSON.stringify(mappedImprovements),
        `DRACO AI Review Board identified ${improvements.length} template prompt improvements. Verdict: ${result.verdict}`,
        12, // expected gain estimate
        improvements[0]?.priority === 'critical' ? 'critical' :
          improvements[0]?.priority === 'high' ? 'high' : 'medium',
        `draco_board`,
        `rotated_providers (${result.model_rotation_used.map(r => r.provider).join(',')})`,
        0,
        0,
      ]
    )

    logger.info('[DRACO] Template improvements saved to template_improvement_suggestions', {
      count: mappedImprovements.length,
      templateId,
      verdict: result.verdict,
    })

    // Also trigger a fresh analyzeTemplateQuality pass asynchronously
    // so the standard audit pipeline re-evaluates with any new DRACO findings
    const { templateImprovementService } = await import('./templateImprovementService')
    templateImprovementService.analyzeTemplateQuality(templateId).catch((err: Error) =>
      logger.warn('[DRACO] analyzeTemplateQuality kick-off failed (non-blocking)', { error: err.message })
    )
  } catch (err) {
    logger.warn('[DRACO] Failed to feed template improvements', { error: String(err) })
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface FullReviewOptions {
  documentId: string
  content: string
  documentType: string
  projectContext: Record<string, unknown>
  templateId?: string
  userId: string
  existingAuditScores?: Record<string, number> | null
}

export class DracoService {
  /**
   * Run the full DRACO review pipeline for a document.
   *
   * Returns the full review result regardless of mode (advisory always returns, blocking same).
   * Actual publication blocking is enforced at the route layer by checking
   * result.publication_advisory.blocking_enabled && result.verdict === 'REJECT'
   */
  async runFullReview(options: FullReviewOptions): Promise<DracoReviewResult> {
    const startTime = Date.now()
    const {
      documentId, content, documentType, projectContext,
      templateId, userId, existingAuditScores,
    } = options

    logger.info('[DRACO] Starting full DRACO review', {
      documentId,
      documentType,
      templateId,
      contentLength: content.length,
    })

    // Load template config (includes draco_enabled check, thresholds, mode)
    const templateConfig = await getTemplateConfig(templateId)

    // Check if DRACO is enabled for this template
    if (templateId && templateConfig && !templateConfig.draco_enabled) {
      logger.info('[DRACO] Skipped — DRACO not enabled for this template', { templateId })
      throw new Error('DRACO_DISABLED_FOR_TEMPLATE')
    }

    const thresholds = buildThresholds(templateConfig)
    const mode: DracoMode = (templateConfig?.draco_blocking_enabled) ? 'blocking' : 'advisory'

    logger.info('[DRACO] Configuration loaded', {
      mode,
      thresholds_accuracy: thresholds.accuracy,
      thresholds_completeness: thresholds.completeness,
    })

    // Run board review and strategic assessment in parallel for speed
    const [boardReview, strategicAssessment] = await Promise.all([
      runBoardReview({
        content,
        documentType,
        projectContext,
        thresholds,
      }),
      runStrategicValueAssessment(content, documentType, projectContext, thresholds),
    ])

    // Build quality scores (merging existing audit with new DRACO dimensions)
    const qualityScores = buildQualityScores(
      existingAuditScores ?? null,
      boardReview.objectivity_score,
      boardReview.citation_integrity_score
    )

    const totalTime = Date.now() - startTime

    // Render final verdict
    const result = renderVerdict({
      document_id: documentId,
      mode,
      thresholds,
      templateId,
      quality_scores: qualityScores,
      evidence_result: boardReview.evidence_validator,
      governance_result: boardReview.governance_evaluator,
      challenger_result: boardReview.counterfactual_challenger,
      strategic_result: strategicAssessment,
      model_rotation_used: boardReview.model_rotation_used,
      objectivity_score: boardReview.objectivity_score,
      citation_integrity_score: boardReview.citation_integrity_score,
      total_processing_time_ms: totalTime,
    })

    // Persist and feed improvements asynchronously (non-blocking)
    Promise.all([
      persistDracoReview(result, userId, templateId),
      feedTemplateImprovements(result, userId),
    ]).catch(err => logger.error('[DRACO] Post-review tasks failed', { error: String(err) }))

    logger.info('[DRACO] Full review complete', {
      review_id: result.review_id,
      verdict: result.verdict,
      overall_score: result.overall_draco_score,
      mode,
      processing_time_ms: totalTime,
    })

    return result
  }

  /**
   * Get the latest DRACO review result for a document.
   */
  async getDocumentReview(documentId: string): Promise<DracoReviewResult | null> {
    try {
      const pool = getDatabasePoolSafe()
      if (!pool) return null

      const result = await pool.query(
        `SELECT board_deliberation FROM draco_reviews
         WHERE document_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [documentId]
      )

      if (!result.rows.length) return null
      return result.rows[0].board_deliberation as DracoReviewResult
    } catch (err) {
      logger.error('[DRACO] Failed to fetch review', { documentId, error: String(err) })
      return null
    }
  }

  /**
   * Get DRACO reviews for admin/analytics
   */
  async getReviewStats(): Promise<Record<string, unknown>> {
    try {
      const pool = getDatabasePoolSafe()
      if (!pool) return {}

      const [verdictStats, topProviders] = await Promise.all([
        pool.query(`
          SELECT verdict, COUNT(*) as count, AVG(overall_draco_score) as avg_score
          FROM draco_reviews WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY verdict ORDER BY count DESC
        `),
        pool.query(`
          SELECT board_role, provider, model, AVG(independence_rating) as avg_independence, review_count
          FROM draco_provider_performance
          ORDER BY avg_independence DESC
          LIMIT 15
        `),
      ])

      return {
        verdict_distribution: verdictStats.rows,
        provider_independence_leaders: topProviders.rows,
      }
    } catch (err) {
      logger.error('[DRACO] Failed to fetch stats', { error: String(err) })
      return {}
    }
  }
}

export const dracoService = new DracoService()
