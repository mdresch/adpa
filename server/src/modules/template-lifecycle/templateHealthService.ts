/**
 * Template Health Service (REQ-010)
 * 
 * Maintains template health dashboard with aggregated metrics.
 * - Template health score aggregates: success rate, avg quality, usage count
 * - Health score calculated and updated weekly
 * - Dashboard shows: audit history, improvement suggestions, quality trends
 * - Critical templates (health < 60) flagged for admin review
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'

interface TemplateHealthMetrics {
  templateId: string
  healthScore: number
  successRate: number
  avgQuality: number
  usageCount: number
  auditCount: number
  improvementCount: number
  lastCalculatedAt: Date
  isCritical: boolean
}

interface QualityTrend {
  date: string
  avgQuality: number
  documentCount: number
}

interface AuditHistoryItem {
  auditId: string
  triggerType: string
  overallScore: number | null
  verdict: string
  createdAt: Date
}

interface ImprovementSuggestionItem {
  suggestionId: string
  priority: string
  status: string
  expectedGain: number
  createdAt: Date
}

class TemplateHealthService {
  /**
   * Calculate and update health score for a template
   */
  async calculateHealthScore(templateId: string): Promise<TemplateHealthMetrics> {
    logger.info('[TEMPLATE-HEALTH] Calculating health score', { templateId })

    // 1. Get success rate (documents with quality >= 70)
    const successRate = await this.getSuccessRate(templateId)

    // 2. Get average quality
    const avgQuality = await this.getAverageQuality(templateId)

    // 3. Get usage count
    const usageCount = await this.getUsageCount(templateId)

    // 4. Get audit count
    const auditCount = await this.getAuditCount(templateId)

    // 5. Get improvement suggestion count
    const improvementCount = await this.getImprovementCount(templateId)

    // 6. Calculate health score (weighted average)
    const healthScore = this.calculateWeightedHealthScore(
      successRate,
      avgQuality,
      usageCount,
      auditCount
    )

    // 7. Determine if critical
    const isCritical = healthScore < 60

    // 8. Update or insert health record
    await this.upsertHealthRecord({
      templateId,
      healthScore,
      successRate,
      avgQuality,
      usageCount,
      auditCount,
      improvementCount,
      isCritical
    })

    const metrics: TemplateHealthMetrics = {
      templateId,
      healthScore,
      successRate,
      avgQuality,
      usageCount,
      auditCount,
      improvementCount,
      lastCalculatedAt: new Date(),
      isCritical
    }

    logger.info('[TEMPLATE-HEALTH] Health score calculated', {
      templateId,
      healthScore,
      isCritical
    })

    return metrics
  }

  /**
   * Get success rate (percentage of documents with quality >= 70)
   */
  private async getSuccessRate(templateId: string): Promise<number> {
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE qa.overall_score >= 70) as success_count,
         COUNT(*) as total_count
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND COALESCE(qa.audit_performed, true) = true
       AND qa.overall_score IS NOT NULL`,
      [templateId]
    )

    if (result.rows.length === 0 || result.rows[0].total_count === 0) {
      return 0
    }

    const successCount = Number(result.rows[0].success_count)
    const totalCount = Number(result.rows[0].total_count)

    return Math.round((successCount / totalCount) * 100)
  }

  /**
   * Get average quality score
   */
  private async getAverageQuality(templateId: string): Promise<number> {
    const result = await pool.query(
      `SELECT AVG(qa.overall_score) as avg_score
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND COALESCE(qa.audit_performed, true) = true
       AND qa.overall_score IS NOT NULL`,
      [templateId]
    )

    if (result.rows.length === 0 || result.rows[0].avg_score === null) {
      return 0
    }

    return Math.round(result.rows[0].avg_score)
  }

  /**
   * Get usage count
   */
  private async getUsageCount(templateId: string): Promise<number> {
    const result = await pool.query(
      `SELECT usage_count FROM templates WHERE id = $1`,
      [templateId]
    )

    if (result.rows.length === 0) {
      return 0
    }

    return Number(result.rows[0].usage_count) || 0
  }

  /**
   * Get audit count
   */
  private async getAuditCount(templateId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM template_audits WHERE template_id = $1`,
      [templateId]
    )

    return Number(result.rows[0].count)
  }

  /**
   * Get improvement suggestion count
   */
  private async getImprovementCount(templateId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM template_improvement_suggestions 
       WHERE template_id = $1 
       AND status IN ('pending_review', 'approved')`,
      [templateId]
    )

    return Number(result.rows[0].count)
  }

  /**
   * Calculate weighted health score
   * - Success rate: 40% weight
   * - Average quality: 40% weight
   * - Usage count (normalized): 10% weight
   * - Audit count (normalized): 10% weight
   */
  private calculateWeightedHealthScore(
    successRate: number,
    avgQuality: number,
    usageCount: number,
    auditCount: number
  ): number {
    // Normalize usage count (log scale to prevent dominance)
    const normalizedUsage = Math.min(Math.log10(usageCount + 1) / Math.log10(100), 1) * 100

    // Normalize audit count (log scale)
    const normalizedAudit = Math.min(Math.log10(auditCount + 1) / Math.log10(20), 1) * 100

    // Weighted average
    const healthScore = 
      (successRate * 0.4) +
      (avgQuality * 0.4) +
      (normalizedUsage * 0.1) +
      (normalizedAudit * 0.1)

    return Math.round(healthScore)
  }

  /**
   * Upsert health record
   */
  private async upsertHealthRecord(metrics: Omit<TemplateHealthMetrics, 'lastCalculatedAt'>): Promise<void> {
    await pool.query(
      `INSERT INTO template_health_metrics (
        template_id, health_score, success_rate, avg_quality, 
        usage_count, audit_count, improvement_count, is_critical, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (template_id) 
      DO UPDATE SET
        health_score = EXCLUDED.health_score,
        success_rate = EXCLUDED.success_rate,
        avg_quality = EXCLUDED.avg_quality,
        usage_count = EXCLUDED.usage_count,
        audit_count = EXCLUDED.audit_count,
        improvement_count = EXCLUDED.improvement_count,
        is_critical = EXCLUDED.is_critical,
        calculated_at = NOW()`,
      [
        metrics.templateId,
        metrics.healthScore,
        metrics.successRate,
        metrics.avgQuality,
        metrics.usageCount,
        metrics.auditCount,
        metrics.improvementCount,
        metrics.isCritical
      ]
    )
  }

  /**
   * Get health metrics for a template
   */
  async getHealthMetrics(templateId: string): Promise<TemplateHealthMetrics | null> {
    const result = await pool.query(
      `SELECT * FROM template_health_metrics WHERE template_id = $1`,
      [templateId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      templateId: row.template_id,
      healthScore: row.health_score,
      successRate: row.success_rate,
      avgQuality: row.avg_quality,
      usageCount: row.usage_count,
      auditCount: row.audit_count,
      improvementCount: row.improvement_count,
      lastCalculatedAt: row.calculated_at,
      isCritical: row.is_critical
    }
  }

  /**
   * Get all critical templates (health < 60)
   */
  async getCriticalTemplates(): Promise<TemplateHealthMetrics[]> {
    const result = await pool.query(
      `SELECT thm.*, t.name as template_name, t.framework
       FROM template_health_metrics thm
       JOIN templates t ON thm.template_id = t.id
       WHERE thm.is_critical = true
       AND t.deleted_at IS NULL
       ORDER BY thm.health_score ASC`,
      []
    )

    return result.rows.map(row => ({
      templateId: row.template_id,
      healthScore: row.health_score,
      successRate: row.success_rate,
      avgQuality: row.avg_quality,
      usageCount: row.usage_count,
      auditCount: row.audit_count,
      improvementCount: row.improvement_count,
      lastCalculatedAt: row.calculated_at,
      isCritical: row.is_critical
    }))
  }

  /**
   * Get quality trends for a template
   */
  async getQualityTrends(templateId: string, days: number = 30): Promise<QualityTrend[]> {
    const result = await pool.query(
      `SELECT 
         DATE(qa.audited_at) as date,
         AVG(qa.overall_score) as avg_quality,
         COUNT(*) as document_count
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND COALESCE(qa.audit_performed, true) = true
       AND qa.overall_score IS NOT NULL
       AND qa.audited_at > NOW() - ($2 * INTERVAL '1 day')
       GROUP BY DATE(qa.audited_at)
       ORDER BY date ASC`,
      [templateId, days]
    )

    return result.rows.map(row => ({
      date: row.date,
      avgQuality: Math.round(row.avg_quality),
      documentCount: Number(row.document_count)
    }))
  }

  /**
   * Get audit history for a template
   */
  async getAuditHistory(templateId: string, limit: number = 10): Promise<AuditHistoryItem[]> {
    const result = await pool.query(
      `SELECT 
         id as audit_id,
         trigger_type,
         overall_score,
         verdict,
         created_at
       FROM template_audits
       WHERE template_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [templateId, limit]
    )

    return result.rows.map(row => ({
      auditId: row.audit_id,
      triggerType: row.trigger_type,
      overallScore: row.overall_score,
      verdict: row.verdict,
      createdAt: row.created_at
    }))
  }

  /**
   * Get improvement suggestions for a template
   */
  async getImprovementSuggestions(templateId: string, limit: number = 10): Promise<ImprovementSuggestionItem[]> {
    const result = await pool.query(
      `SELECT 
         id as suggestion_id,
         priority,
         status,
         expected_quality_gain,
         created_at
       FROM template_improvement_suggestions
       WHERE template_id = $1
       ORDER BY 
         CASE priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         created_at DESC
       LIMIT $2`,
      [templateId, limit]
    )

    return result.rows.map(row => ({
      suggestionId: row.suggestion_id,
      priority: row.priority,
      status: row.status,
      expectedGain: row.expected_quality_gain,
      createdAt: row.created_at
    }))
  }

  /**
   * Calculate health scores for all templates (weekly scheduled job)
   */
  async calculateAllHealthScores(): Promise<void> {
    logger.info('[TEMPLATE-HEALTH] Calculating health scores for all templates')

    const result = await pool.query(
      `SELECT id FROM templates WHERE deleted_at IS NULL`
    )

    for (const row of result.rows) {
      try {
        await this.calculateHealthScore(row.id)
      } catch (err) {
        logger.error('[TEMPLATE-HEALTH] Failed to calculate health score for template', {
          templateId: row.id,
          error: err
        })
      }
    }

    logger.info('[TEMPLATE-HEALTH] Health score calculation complete for all templates')
  }
}

export const templateHealthService = new TemplateHealthService()
