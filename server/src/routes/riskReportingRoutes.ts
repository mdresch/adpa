/**
 * Risk Reporting API Routes
 * Provides comprehensive risk registry and mitigation reporting
 */

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'
import { validate } from '../middleware/validation'
import Joi from 'joi'
import { logger, childLogger } from '../utils/logger'
import { pool } from '../database/connection'

const router = Router()

/**
 * GET /api/risks/registry
 * Get comprehensive risk registry with mitigation status
 */
router.get(
  '/registry',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { project_id, program_id, risk_level, status, priority } = req.query
      
      // Check if risk_registry view exists, if not fall back to direct risks query
      let useView = true
      try {
        await pool.query('SELECT 1 FROM risk_registry LIMIT 1')
      } catch (viewError: any) {
        log.warn('[RISK-REGISTRY] View does not exist, falling back to direct query:', viewError.message)
        useView = false
      }
      
      let query: string
      const params: any[] = []
      let paramCount = 0
      
      if (useView) {
        query = 'SELECT * FROM risk_registry WHERE 1=1'
      } else {
        // Fallback: query risks table directly with joins
        query = `
          SELECT 
            r.id,
            r.title,
            r.description,
            r.category,
            r.probability,
            r.impact,
            COALESCE(r.risk_level, 'project') as risk_level,
            r.status,
            r.mitigation_strategy,
            r.contingency_plan,
            r.owner,
            r.project_id,
            p.name as project_name,
            r.program_id,
            pr.name as program_name,
            r.financial_impact,
            r.schedule_impact_days,
            r.exceeds_threshold,
            r.cross_program,
            r.systemic_risk,
            r.last_review_date,
            r.monthly_review_status,
            r.next_review_due_date,
            -- Document source tracking (for extracted risks)
            r.source_document_id,
            d.name as source_document_name,
            -- Risk origin tracking
            CASE 
              WHEN r.source_document_id IS NOT NULL THEN 'project-extraction'
              WHEN r.risk_level IN ('portfolio', 'systemic') THEN 'portfolio-level'
              WHEN r.program_id IS NOT NULL THEN 'program-level'
              ELSE 'manual-entry'
            END as risk_origin,
            (SELECT COUNT(*) FROM mitigation_plans mp WHERE mp.risk_id = r.id) as mitigation_plan_count,
            (SELECT COUNT(*) FROM mitigation_plans mp WHERE mp.risk_id = r.id AND mp.status = 'completed') as completed_mitigation_count,
            (SELECT ROUND(AVG(mp.completion_percentage), 0) FROM mitigation_plans mp WHERE mp.risk_id = r.id) as avg_mitigation_completion,
            (SELECT COUNT(*) FROM issues i WHERE i.related_risk_id = r.id) as related_issues_count,
            (SELECT COUNT(*) FROM issues i WHERE i.related_risk_id = r.id AND i.status NOT IN ('closed', 'resolved')) as active_related_issues_count,
            r.created_at,
            r.updated_at
          FROM risks r
          LEFT JOIN projects p ON r.project_id = p.id
          LEFT JOIN programs pr ON r.program_id = pr.id OR (p.program_id = pr.id)
          LEFT JOIN documents d ON r.source_document_id = d.id
          WHERE 1=1
        `
      }
      
      if (project_id) {
        paramCount++
        query += ` AND project_id = $${paramCount}`
        params.push(project_id)
      }
      
      if (program_id) {
        paramCount++
        query += ` AND program_id = $${paramCount}`
        params.push(program_id)
      }
      
      if (risk_level) {
        paramCount++
        query += ` AND ${useView ? 'risk_level' : 'COALESCE(r.risk_level, \'project\')'} = $${paramCount}`
        params.push(risk_level)
      }
      
      if (status) {
        paramCount++
        query += ` AND status = $${paramCount}`
        params.push(status)
      }
      
      if (!useView && !status) {
        // Only filter out closed/mitigated for non-view query if no status filter
        query += ` AND (r.status NOT IN ('closed', 'mitigated') OR COALESCE(r.risk_level, 'project') IN ('portfolio', 'systemic'))`
      }
      
      query += ` ORDER BY 
        CASE 
          WHEN priority = 'critical' THEN 1
          WHEN priority = 'high' THEN 2
          WHEN priority = 'medium' THEN 3
          WHEN priority = 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      `
      
      const result = await pool.query(query, params)
      
      log.info('[RISK-REGISTRY] Retrieved risk registry', { 
        count: result.rows.length,
        usingView: useView,
        project_id,
        filters: { risk_level, status }
      })
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      })
    } catch (error: any) {
      log.error('[RISK-REGISTRY] Failed to get risk registry:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk registry',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
)

/**
 * GET /api/risks/report
 * Get risk mitigation report with detailed tracking
 */
router.get(
  '/report',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { project_id, program_id, risk_id, status, overdue_only } = req.query
      
      let query = 'SELECT * FROM risk_mitigation_report WHERE 1=1'
      const params: any[] = []
      let paramCount = 0
      
      if (project_id) {
        paramCount++
        query += ` AND risk_id IN (SELECT id FROM risks WHERE project_id = $${paramCount})`
        params.push(project_id)
      }
      
      if (program_id) {
        paramCount++
        query += ` AND risk_id IN (SELECT id FROM risks WHERE program_id = $${paramCount})`
        params.push(program_id)
      }
      
      if (risk_id) {
        paramCount++
        query += ` AND risk_id = $${paramCount}`
        params.push(risk_id)
      }
      
      if (status) {
        paramCount++
        query += ` AND mitigation_status = $${paramCount}`
        params.push(status)
      }
      
      if (overdue_only === 'true') {
        query += ` AND is_overdue = TRUE`
      }
      
      query += ` ORDER BY risk_id, mitigation_priority DESC, due_date ASC NULLS LAST`
      
      const result = await pool.query(query, params)
      
      log.info('[RISK-REPORT] Retrieved risk mitigation report', { count: result.rows.length })
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      })
    } catch (error: any) {
      log.error('[RISK-REPORT] Failed to get risk mitigation report:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk mitigation report',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/risks/summary
 * Get portfolio risk summary statistics
 */
router.get(
  '/summary',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { program_id } = req.query
      
      let query = 'SELECT * FROM portfolio_risk_summary WHERE 1=1'
      const params: any[] = []
      let paramCount = 0
      
      if (program_id) {
        paramCount++
        query += ` AND program_id = $${paramCount}`
        params.push(program_id)
      }
      
      query += ` ORDER BY total_risks DESC`
      
      const result = await pool.query(query, params)
      
      log.info('[RISK-SUMMARY] Retrieved risk summary', { count: result.rows.length })
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      })
    } catch (error: any) {
      log.error('[RISK-SUMMARY] Failed to get risk summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk summary',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/risks/review-compliance
 * Get monthly review compliance status
 */
router.get(
  '/review-compliance',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { program_id } = req.query
      
      let query = 'SELECT * FROM portfolio_risk_review_compliance WHERE 1=1'
      const params: any[] = []
      let paramCount = 0
      
      if (program_id) {
        paramCount++
        query += ` AND program_id = $${paramCount}`
        params.push(program_id)
      }
      
      query += ` ORDER BY compliance_percentage DESC`
      
      const result = await pool.query(query, params)
      
      log.info('[RISK-COMPLIANCE] Retrieved review compliance', { count: result.rows.length })
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      })
    } catch (error: any) {
      log.error('[RISK-COMPLIANCE] Failed to get review compliance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve review compliance',
        message: error.message
      })
    }
  }
)

export default router

