/**
 * Digital Twin Analytics Service
 * TASK-745: Analytics Component Implementation
 * 
 * Provides aggregated metrics for drift trends, innovation value,
 * and baseline health scoring.
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface DriftTrendPoint {
    date: string
    count: number
    severity: string
}

export interface InnovationStats {
    totalOpportunities: number
    identifiedValue: number
    realizedValue: number
    avgNoveltyScore: number
}

export interface ProjectHealthScore {
    overallScore: number // 0-100
    driftImpact: number
    resolutionRate: number
    baselineAge: number
}

export class AnalyticsService {
    /**
     * Get drift detection trends over time for a project
     */
    async getProjectDriftTrends(projectId: string, days: number = 30): Promise<DriftTrendPoint[]> {
        try {
            const result = await pool.query(`
        SELECT 
          DATE_TRUNC('day', detection_date) as date,
          drift_severity as severity,
          COUNT(*) as count
        FROM baseline_drift_detection
        WHERE project_id = $1
          AND detection_date >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE_TRUNC('day', detection_date), drift_severity
        ORDER BY date ASC
      `, [projectId])

            return result.rows.map(row => ({
                date: row.date.toISOString().split('T')[0],
                count: parseInt(row.count, 10),
                severity: row.severity
            }))
        } catch (error) {
            logger.error('[ANALYTICS-SERVICE] Error fetching drift trends:', error)
            throw error
        }
    }

    /**
     * Get innovation and value capture statistics
     */
    async getInnovationStats(projectId: string): Promise<InnovationStats> {
        try {
            const result = await pool.query(`
        SELECT 
          COUNT(*) as total_opportunities,
          COALESCE(SUM((ai_processing_metadata->'metrics'->>'innovationValue')::numeric), 0) as identified_value,
          COALESCE(SUM((ai_processing_metadata->'metrics'->>'innovationValue')::numeric) FILTER (WHERE status = 'implemented'), 0) as realized_value,
          COALESCE(AVG(novelty_score), 0) as avg_novelty
        FROM innovation_opportunities
        WHERE project_id = $1
      `, [projectId])

            const row = result.rows[0]
            return {
                totalOpportunities: parseInt(row.total_opportunities, 10),
                identifiedValue: parseFloat(row.identified_value),
                realizedValue: parseFloat(row.realized_value),
                avgNoveltyScore: parseFloat(row.avg_novelty)
            }
        } catch (error) {
            logger.error('[ANALYTICS-SERVICE] Error fetching innovation stats:', error)
            throw error
        }
    }

    /**
     * Calculate a comprehensive "Baseline Health Score" for a project
     * Formula: 100 - (Sum of Drift Penalties)
     * Penalties: Critical=20, High=10, Medium=5, Low=2 (unresolved)
     */
    async getProjectHealthScore(projectId: string): Promise<ProjectHealthScore> {
        try {
            // Get unresolved drift
            const driftResult = await pool.query(`
        SELECT 
          drift_severity,
          COUNT(*) as count
        FROM baseline_drift_detection
        WHERE project_id = $1
          AND status IN ('detected', 'acknowledged', 'investigating')
        GROUP BY drift_severity
      `, [projectId])

            let driftImpact = 0
            const weights: Record<string, number> = {
                'critical': 20,
                'high': 10,
                'medium': 5,
                'low': 2
            }

            driftResult.rows.forEach(row => {
                driftImpact += (weights[row.drift_severity] || 0) * parseInt(row.count, 10)
            })

            // Get resolution rate (last 90 days)
            const resolutionResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved
        FROM baseline_drift_detection
        WHERE project_id = $1
          AND detection_date >= NOW() - INTERVAL '90 days'
      `, [projectId])

            const totalDrifts = parseInt(resolutionResult.rows[0].total, 10)
            const resolvedDrifts = parseInt(resolutionResult.rows[0].resolved, 10)
            const resolutionRate = totalDrifts > 0 ? (resolvedDrifts / totalDrifts) * 100 : 100

            // Get baseline age penalty (if baseline is older than 6 months, penalty)
            const baselineResult = await pool.query(`
        SELECT 
          EXTRACT(DAY FROM (NOW() - created_at)) as age_days
        FROM project_baselines
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [projectId])

            const ageDays = baselineResult.rows[0] ? parseInt(baselineResult.rows[0].age_days, 10) : 0
            const baselineAgePenalty = ageDays > 180 ? Math.min(20, (ageDays - 180) / 10) : 0

            const overallScore = Math.max(0, 100 - driftImpact - baselineAgePenalty)

            return {
                overallScore: Math.round(overallScore),
                driftImpact,
                resolutionRate: Math.round(resolutionRate),
                baselineAge: ageDays
            }
        } catch (error) {
            logger.error('[ANALYTICS-SERVICE] Error calculating health score:', error)
            throw error
        }
    }

    /**
     * Get breakdown of drift by category
     */
    async getDriftCategoryBreakdown(projectId: string): Promise<any> {
        try {
            const result = await pool.query(`
        SELECT 
          detection_type as category,
          COUNT(*) as count
        FROM baseline_drift_detection
        WHERE project_id = $1
        GROUP BY detection_type
      `, [projectId])

            return result.rows
        } catch (error) {
            logger.error('[ANALYTICS-SERVICE] Error fetching category breakdown:', error)
            throw error
        }
    }
}

export const analyticsService = new AnalyticsService()
