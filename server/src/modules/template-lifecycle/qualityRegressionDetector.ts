/**
 * Quality Regression Detector (REQ-006)
 * 
 * Detects quality regression in template-generated documents and triggers review audits.
 * - If template's average document quality drops > 15% over 30 days, triggers review audit
 * - Regression detection compares current avg quality vs baseline (first 10 documents)
 * - Regression audit includes document failure context in prompt
 * - Regression audit is rate-limited (max 1 per 12 hours per template)
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { templateAuditService } from '../../services/templateAuditService'

interface RegressionDetectionResult {
  templateId: string
  baselineQuality: number
  currentQuality: number
  qualityDrop: number
  hasRegression: boolean
  triggeredAudit: boolean
  auditId?: string
}

interface DocumentQualitySnapshot {
  documentId: string
  overallScore: number
  auditedAt: Date
}

class QualityRegressionDetector {
  /**
   * Check for quality regression and trigger review audit if needed
   */
  async checkRegression(templateId: string): Promise<RegressionDetectionResult> {
    logger.info('[REGRESSION-DETECTOR] Checking for quality regression', { templateId })

    // 1. Get baseline quality (first 10 documents)
    const baselineQuality = await this.getBaselineQuality(templateId)
    if (baselineQuality === null) {
      logger.info('[REGRESSION-DETECTOR] Insufficient data for baseline', { templateId })
      return {
        templateId,
        baselineQuality: 0,
        currentQuality: 0,
        qualityDrop: 0,
        hasRegression: false,
        triggeredAudit: false
      }
    }

    // 2. Get current quality (last 30 days)
    const currentQuality = await this.getCurrentQuality(templateId, 30)
    if (currentQuality === null) {
      logger.info('[REGRESSION-DETECTOR] Insufficient data for current quality', { templateId })
      return {
        templateId,
        baselineQuality,
        currentQuality: 0,
        qualityDrop: 0,
        hasRegression: false,
        triggeredAudit: false
      }
    }

    // 3. Calculate quality drop
    const qualityDrop = baselineQuality - currentQuality
    const hasRegression = qualityDrop > 15 // 15% threshold

    logger.info('[REGRESSION-DETECTOR] Quality analysis complete', {
      templateId,
      baselineQuality,
      currentQuality,
      qualityDrop,
      hasRegression
    })

    // 4. Check rate limit (max 1 per 12 hours)
    if (hasRegression) {
      const isRateLimited = await this.isRateLimited(templateId)
      if (isRateLimited) {
        logger.info('[REGRESSION-DETECTOR] Rate limited, skipping audit', { templateId })
        return {
          templateId,
          baselineQuality,
          currentQuality,
          qualityDrop,
          hasRegression: true,
          triggeredAudit: false
        }
      }

      // 5. Trigger regression audit
      const auditId = await this.triggerRegressionAudit(templateId, baselineQuality, currentQuality, qualityDrop)
      
      return {
        templateId,
        baselineQuality,
        currentQuality,
        qualityDrop,
        hasRegression: true,
        triggeredAudit: true,
        auditId
      }
    }

    return {
      templateId,
      baselineQuality,
      currentQuality,
      qualityDrop,
      hasRegression: false,
      triggeredAudit: false
    }
  }

  /**
   * Get baseline quality from first 10 documents
   */
  private async getBaselineQuality(templateId: string): Promise<number | null> {
    const result = await pool.query(
      `SELECT AVG(qa.overall_score) as avg_score
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND COALESCE(qa.audit_performed, true) = true
       AND qa.overall_score IS NOT NULL
       ORDER BY qa.audited_at ASC
       LIMIT 10`,
      [templateId]
    )

    if (result.rows.length === 0 || result.rows[0].avg_score === null) {
      return null
    }

    return Math.round(result.rows[0].avg_score)
  }

  /**
   * Get current quality over specified days
   */
  private async getCurrentQuality(templateId: string, days: number): Promise<number | null> {
    const result = await pool.query(
      `SELECT AVG(qa.overall_score) as avg_score
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND COALESCE(qa.audit_performed, true) = true
       AND qa.overall_score IS NOT NULL
       AND qa.audited_at > NOW() - ($2 * INTERVAL '1 day')`,
      [templateId, days]
    )

    if (result.rows.length === 0 || result.rows[0].avg_score === null) {
      return null
    }

    return Math.round(result.rows[0].avg_score)
  }

  /**
   * Check if regression audit is rate-limited
   */
  private async isRateLimited(templateId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM template_audits
       WHERE template_id = $1
       AND trigger_type = 'regression'
       AND created_at > NOW() - INTERVAL '12 hours'`,
      [templateId]
    )

    return Number(result.rows[0].count) > 0
  }

  /**
   * Trigger regression audit with failure context
   */
  private async triggerRegressionAudit(
    templateId: string,
    baselineQuality: number,
    currentQuality: number,
    qualityDrop: number
  ): Promise<string> {
    // Get template data
    const templateResult = await pool.query(
      "SELECT * FROM templates WHERE id = $1 AND deleted_at IS NULL",
      [templateId]
    )

    if (templateResult.rows.length === 0) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const templateData = templateResult.rows[0]

    // Get recent failing documents for context
    const failureContext = await this.getFailureContext(templateId)

    // Get audit version
    const versionResult = await pool.query(
      "SELECT COUNT(*) FROM template_audits WHERE template_id = $1",
      [templateId]
    )
    const version = Number(versionResult.rows[0].count) + 1

    // Create pending audit
    const auditId = await templateAuditService.createPendingAudit(templateId, 'regression', version)

    // Run audit with failure context
    const regressionContext = {
      baselineQuality,
      currentQuality,
      qualityDrop,
      recentFailures: failureContext
    }

    // Run audit in background
    setImmediate(async () => {
      try {
        await templateAuditService.runAudit(auditId, templateData, regressionContext)
        logger.info('[REGRESSION-DETECTOR] Regression audit completed', { auditId, templateId })
      } catch (err) {
        logger.error('[REGRESSION-DETECTOR] Regression audit failed', { auditId, templateId, error: err })
      }
    })

    logger.info('[REGRESSION-DETECTOR] Regression audit triggered', {
      auditId,
      templateId,
      qualityDrop
    })

    return auditId
  }

  /**
   * Get failure context from recent low-quality documents
   */
  private async getFailureContext(templateId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT qa.document_id, qa.overall_score, qa.issues, qa.recommendations
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND COALESCE(qa.audit_performed, true) = true
       AND qa.overall_score IS NOT NULL
       AND qa.overall_score < 70
       ORDER BY qa.audited_at DESC
       LIMIT 5`,
      [templateId]
    )

    return result.rows.map(row => ({
      documentId: row.document_id,
      documentScore: row.overall_score,
      issues: row.issues,
      recommendations: row.recommendations
    }))
  }

  /**
   * Run regression check for all templates (scheduled job)
   */
  async checkAllTemplates(): Promise<void> {
    logger.info('[REGRESSION-DETECTOR] Running regression check for all templates')

    const result = await pool.query(
      `SELECT id FROM templates WHERE deleted_at IS NULL`
    )

    for (const row of result.rows) {
      try {
        await this.checkRegression(row.id)
      } catch (err) {
        logger.error('[REGRESSION-DETECTOR] Failed to check regression for template', {
          templateId: row.id,
          error: err
        })
      }
    }

    logger.info('[REGRESSION-DETECTOR] Regression check complete for all templates')
  }
}

export const qualityRegressionDetector = new QualityRegressionDetector()
