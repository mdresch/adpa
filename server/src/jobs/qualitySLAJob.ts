/**
 * Quality SLA Monitoring Job
 * Runs periodically to check SLA compliance and send alerts for violations
 * 
 * SLA Thresholds:
 * - Critical: 85% (must maintain above 85% quality)
 * - Warning: 75% (warning if below 75%)
 * 
 * Runs: Every 4 hours
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { notificationService } from '../services/notificationService'

interface SLAViolation {
  template_id: string
  template_name: string
  framework: string
  current_quality: number
  violation_count: number
  last_violation: Date
}

const SLA_THRESHOLDS = {
  CRITICAL: 85,  // Documents must be above 85%
  WARNING: 75    // Warning if below 75%
}

export async function runSLAMonitoring() {
  logger.info('[SLA-MONITORING] Starting SLA compliance check')

  try {
    // Get current SLA violations (templates with recent low-quality audits)
    const violationsResult = await pool.query<SLAViolation>(`
      SELECT 
        t.id as template_id,
        t.name as template_name,
        t.framework,
        ROUND(AVG(qa.overall_score)) as current_quality,
        COUNT(*) as violation_count,
        MAX(qa.audited_at) as last_violation
      FROM quality_audits qa
      JOIN documents d ON qa.document_id = d.id
      JOIN templates t ON d.template_id = t.id
      WHERE qa.audited_at > NOW() - INTERVAL '24 hours'
      AND qa.overall_score < $1
      GROUP BY t.id, t.name, t.framework
      HAVING AVG(qa.overall_score) < $1
      ORDER BY current_quality ASC, violation_count DESC
    `, [SLA_THRESHOLDS.CRITICAL])

    if (violationsResult.rows.length === 0) {
      logger.info('[SLA-MONITORING] No SLA violations detected')
      return {
        success: true,
        violations: 0,
        message: 'All templates compliant with SLA'
      }
    }

    logger.warn('[SLA-MONITORING] SLA violations detected', {
      violationCount: violationsResult.rows.length
    })

    // Send alerts for each violation
    for (const violation of violationsResult.rows) {
      try {
        await notificationService.sendSLABreachAlert(
          violation.template_name,
          violation.current_quality,
          SLA_THRESHOLDS.CRITICAL
        )

        logger.info('[SLA-MONITORING] SLA breach alert sent', {
          templateId: violation.template_id,
          templateName: violation.template_name,
          currentQuality: violation.current_quality
        })

        // Log SLA violation in database for tracking
        await pool.query(`
          INSERT INTO sla_violations (
            template_id,
            violation_type,
            current_quality,
            threshold,
            violation_count,
            detected_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          violation.template_id,
          'quality_below_threshold',
          violation.current_quality,
          SLA_THRESHOLDS.CRITICAL,
          violation.violation_count
        ])

      } catch (error) {
        logger.error('[SLA-MONITORING] Failed to send SLA breach alert', {
          templateId: violation.template_id,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue with other violations even if one fails
      }
    }

    // Calculate overall SLA compliance
    const complianceResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN overall_score >= $1 THEN 1 END) as compliant,
        ROUND((COUNT(CASE WHEN overall_score >= $1 THEN 1 END)::numeric / COUNT(*)::numeric) * 100) as compliance_rate
      FROM quality_audits
      WHERE audited_at > NOW() - INTERVAL '30 days'
    `, [SLA_THRESHOLDS.CRITICAL])

    const compliance = complianceResult.rows[0]

    logger.info('[SLA-MONITORING] SLA compliance calculated', {
      totalAudits: compliance.total,
      compliantAudits: compliance.compliant,
      complianceRate: compliance.compliance_rate
    })

    return {
      success: true,
      violations: violationsResult.rows.length,
      overallCompliance: compliance.compliance_rate,
      message: `SLA monitoring complete: ${violationsResult.rows.length} violations, ${compliance.compliance_rate}% compliant`
    }

  } catch (error) {
    logger.error('[SLA-MONITORING] SLA monitoring failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Schedule SLA monitoring job
 * Run every 4 hours
 */
export function scheduleSLAMonitoring() {
  // Run every 4 hours
  const INTERVAL = 4 * 60 * 60 * 1000 // 4 hours in milliseconds

  logger.info('[SLA-MONITORING] Scheduling SLA monitoring job (every 4 hours)')

  // Run immediately on startup
  runSLAMonitoring().catch(err => {
    logger.error('[SLA-MONITORING] Initial SLA monitoring failed', { err })
  })

  // Then run every 4 hours
  setInterval(() => {
    runSLAMonitoring().catch(err => {
      logger.error('[SLA-MONITORING] Scheduled SLA monitoring failed', { err })
    })
  }, INTERVAL)
}

/**
 * Manual trigger for SLA monitoring (used by admin API endpoint)
 */
export async function triggerSLAMonitoring(): Promise<{
  success: boolean
  violations: number
  overallCompliance?: number
  message: string
}> {
  return await runSLAMonitoring()
}

