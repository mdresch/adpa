/**
 * Executive Dashboard Routes
 * TASK-744: Executive Dashboard Integration for Drift Detection
 * 
 * Provides executive-level views of drift alerts, budget overruns,
 * and change request status
 */

import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection'
import { authenticateToken } from '../middleware/auth'
import { validateQuery } from '../middleware/validation'
import { logger, childLogger } from '../utils/logger'
import { cache } from '../utils/redis'

interface AuthRequest extends express.Request {
  user?: {
    id: string
    email: string
    role: string
    permissions: any
  }
}

const router = express.Router()

/**
 * GET /api/executive-dashboard/drift-alerts
 * Get critical drift alerts for executive view
 */
router.get(
  '/drift-alerts',
  authenticateToken,
  validateQuery(
    Joi.object({
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
      status: Joi.string().valid('detected', 'acknowledged', 'investigating', 'resolved', 'false_positive').optional(),
      limit: Joi.number().min(1).max(100).default(20)
    })
  ),
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = req.user?.id
      const { severity, status, limit = 20 } = req.query

      // Check cache
      const cacheKey = `executive:drift-alerts:${userId}:${severity}:${status}:${limit}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      let query = `
        SELECT 
          bdd.id,
          bdd.project_id,
          bdd.detection_type,
          bdd.drift_severity,
          bdd.drift_description,
          bdd.drift_impact,
          bdd.detection_date,
          bdd.status,
          bdd.alert_sent,
          bdd.alert_sent_at,
          p.name as project_name,
          p.status as project_status,
          pb.version as baseline_version,
          d.title as document_title,
          u.email as assigned_to_email
        FROM baseline_drift_detection bdd
        JOIN projects p ON bdd.project_id = p.id
        LEFT JOIN project_baselines pb ON bdd.baseline_id = pb.id
        LEFT JOIN documents d ON bdd.source_document_id = d.id
        LEFT JOIN users u ON bdd.assigned_to = u.id
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
      `

      const params: any[] = [userId]
      let paramCount = 1

      if (severity) {
        paramCount++
        query += ` AND bdd.drift_severity = $${paramCount}`
        params.push(severity)
      }

      if (status) {
        paramCount++
        query += ` AND bdd.status = $${paramCount}`
        params.push(status)
      }

      query += ` ORDER BY 
        CASE bdd.drift_severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        bdd.detection_date DESC
        LIMIT $${paramCount + 1}
      `
      params.push(limit)

      const result = await pool.query(query, params)

      // Get summary statistics
      const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE drift_severity = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE drift_severity = 'high') as high_count,
          COUNT(*) FILTER (WHERE drift_severity = 'medium') as medium_count,
          COUNT(*) FILTER (WHERE drift_severity = 'low') as low_count,
          COUNT(*) FILTER (WHERE status = 'detected') as unaddressed_count,
          COUNT(*) FILTER (WHERE detection_date >= NOW() - INTERVAL '24 hours') as last_24h_count,
          COUNT(*) FILTER (WHERE detection_date >= NOW() - INTERVAL '7 days') as last_7d_count
        FROM baseline_drift_detection bdd
        JOIN projects p ON bdd.project_id = p.id
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
          AND bdd.status != 'resolved'
      `
      const statsResult = await pool.query(statsQuery, [userId])

      const response = {
        alerts: result.rows,
        statistics: statsResult.rows[0] || {
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          unaddressed_count: 0,
          last_24h_count: 0,
          last_7d_count: 0
        },
        generated_at: new Date().toISOString()
      }

      // Cache for 2 minutes
      await cache.set(cacheKey, response, 120)

      res.json(response)
    } catch (error) {
      log.error('Executive drift alerts error:', error)
      res.status(500).json({ error: 'Failed to fetch drift alerts' })
    }
  }
)

/**
 * GET /api/executive-dashboard/budget-alerts
 * Get budget overrun alerts for executive view
 */
router.get(
  '/budget-alerts',
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = req.user?.id

      // Check cache
      const cacheKey = `executive:budget-alerts:${userId}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Get budget drift (cost overruns)
      const budgetAlertsQuery = `
        SELECT 
          bdd.id,
          bdd.project_id,
          bdd.drift_severity,
          bdd.drift_description,
          bdd.drift_impact,
          bdd.detection_date,
          bdd.status,
          p.name as project_name,
          p.budget,
          pb.cost_baseline
        FROM baseline_drift_detection bdd
        JOIN projects p ON bdd.project_id = p.id
        LEFT JOIN project_baselines pb ON bdd.baseline_id = pb.id
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
          AND bdd.detection_type = 'cost_drift'
          AND bdd.status != 'resolved'
        ORDER BY 
          CASE bdd.drift_severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          bdd.detection_date DESC
        LIMIT 10
      `

      const result = await pool.query(budgetAlertsQuery, [userId])

      const response = {
        budget_alerts: result.rows,
        total_count: result.rows.length,
        critical_count: result.rows.filter(r => r.drift_severity === 'critical').length,
        generated_at: new Date().toISOString()
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, response, 300)

      res.json(response)
    } catch (error) {
      log.error('Executive budget alerts error:', error)
      res.status(500).json({ error: 'Failed to fetch budget alerts' })
    }
  }
)

/**
 * GET /api/executive-dashboard/positive-drift
 * Get positive drift opportunities for executive view
 */
router.get(
  '/positive-drift',
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = req.user?.id

      // Check cache
      const cacheKey = `executive:positive-drift:${userId}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Get innovation opportunities (positive drift)
      const opportunitiesQuery = `
        SELECT 
          io.id,
          io.project_id,
          io.opportunity_type,
          io.title,
          io.description,
          io.potential_value,
          io.novelty_score,
          io.patentability_score,
          io.status,
          io.created_at,
          p.name as project_name
        FROM innovation_opportunities io
        JOIN projects p ON io.project_id = p.id
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
          AND io.status IN ('identified', 'evaluating', 'pursuing')
        ORDER BY 
          io.novelty_score DESC,
          io.created_at DESC
        LIMIT 10
      `

      const result = await pool.query(opportunitiesQuery, [userId])

      const response = {
        opportunities: result.rows,
        total_count: result.rows.length,
        high_novelty_count: result.rows.filter(r => parseFloat(r.novelty_score) >= 0.7).length,
        generated_at: new Date().toISOString()
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, response, 600)

      res.json(response)
    } catch (error) {
      log.error('Executive positive drift error:', error)
      res.status(500).json({ error: 'Failed to fetch positive drift opportunities' })
    }
  }
)

/**
 * GET /api/executive-dashboard/summary
 * Get comprehensive executive summary
 */
router.get(
  '/summary',
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = req.user?.id

      // Check cache
      const cacheKey = `executive:summary:${userId}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Get drift statistics
      const driftStats = await pool.query(`
        SELECT 
          COUNT(*) as total_drift,
          COUNT(*) FILTER (WHERE drift_severity = 'critical') as critical_drift,
          COUNT(*) FILTER (WHERE drift_severity = 'high') as high_drift,
          COUNT(*) FILTER (WHERE status = 'detected') as unaddressed_drift,
          COUNT(*) FILTER (WHERE detection_type = 'cost_drift') as budget_overruns,
          COUNT(*) FILTER (WHERE detection_type = 'scope_drift') as scope_creep,
          COUNT(*) FILTER (WHERE detection_type = 'timeline_drift') as schedule_delays
        FROM baseline_drift_detection bdd
        JOIN projects p ON bdd.project_id = p.id
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
          AND bdd.status != 'resolved'
      `, [userId])

      // Get innovation opportunities stats
      const innovationStats = await pool.query(`
        SELECT 
          COUNT(*) as total_opportunities,
          COUNT(*) FILTER (WHERE opportunity_type = 'patent_opportunity') as patent_opportunities,
          COUNT(*) FILTER (WHERE opportunity_type = 'efficiency_gain') as efficiency_improvements,
          COUNT(*) FILTER (WHERE opportunity_type = 'cost_reduction') as cost_savings,
          AVG(novelty_score) as avg_novelty_score
        FROM innovation_opportunities io
        JOIN projects p ON io.project_id = p.id
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
          AND io.status IN ('identified', 'evaluating', 'pursuing')
      `, [userId])

      // Get project health overview
      const projectHealth = await pool.query(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE status = 'active') as active_projects,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM baseline_drift_detection bdd 
            WHERE bdd.project_id = p.id 
            AND bdd.drift_severity IN ('critical', 'high')
            AND bdd.status != 'resolved'
          )) as projects_at_risk
        FROM projects p
        WHERE (p.owner_id = $1 OR p.team_members ? $1::text)
      `, [userId])

      const response = {
        drift_statistics: driftStats.rows[0] || {
          total_drift: 0,
          critical_drift: 0,
          high_drift: 0,
          unaddressed_drift: 0,
          budget_overruns: 0,
          scope_creep: 0,
          schedule_delays: 0
        },
        innovation_statistics: innovationStats.rows[0] || {
          total_opportunities: 0,
          patent_opportunities: 0,
          efficiency_improvements: 0,
          cost_savings: 0,
          avg_novelty_score: 0
        },
        project_health: projectHealth.rows[0] || {
          total_projects: 0,
          active_projects: 0,
          projects_at_risk: 0
        },
        generated_at: new Date().toISOString()
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, response, 300)

      res.json(response)
    } catch (error) {
      log.error('Executive summary error:', error)
      res.status(500).json({ error: 'Failed to fetch executive summary' })
    }
  }
)

export default router
