/**
 * Performance Actuals API Routes
 * Tracks actual vs. planned performance data for PMBOK 8 Measurement Domain
 * 
 * Endpoints:
 * - GET /api/performance-actuals/:projectId - Get all performance actuals
 * - GET /api/performance-actuals/:projectId/summary - Get performance summary (SPI, CPI)
 * - POST /api/performance-actuals/:projectId - Add/update performance actual manually
 */

import express, { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { authenticateToken } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'

const router = express.Router()

/**
 * Helper function to check project access (admin or project owner)
 */
async function checkProjectAccess(projectId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') {
    // Admin can access any project - just verify it exists
    const projectCheck = await pool!.query('SELECT id FROM projects WHERE id = $1', [projectId])
    return projectCheck.rows.length > 0
  }

  // Check if user is project owner
  const result = await pool!.query(
    'SELECT id FROM projects WHERE id = $1 AND created_by = $2',
    [projectId, userId]
  )
  return result.rows.length > 0
}

/**
 * Determine project health based on SPI, CPI, and quality score
 */
function determineProjectHealth(
  spi: number | null,
  cpi: number | null,
  quality: number | null
): 'healthy' | 'at_risk' | 'unhealthy' | 'unknown' {
  if (!spi || !cpi) return 'unknown'

  if (spi >= 0.95 && cpi >= 0.95 && (quality || 7) >= 7) return 'healthy'
  if (spi >= 0.85 && cpi >= 0.85) return 'at_risk'
  return 'unhealthy'
}

/**
 * GET /api/performance-actuals/:projectId
 * Get all performance actuals for a project
 * 
 * Query parameters:
 * - entity_type: Filter by entity type (milestone, deliverable, activity, phase, resource)
 * - entity_id: Filter by specific entity ID
 * - start_date: Filter by measurement date (from)
 * - end_date: Filter by measurement date (to)
 * - limit: Limit results (default: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get(
  '/:projectId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const log = logger.child({ requestId: (req as any).requestId })
    
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.id
      const userRole = (req as any).user?.role || 'user'

      // Check project access
      const hasAccess = await checkProjectAccess(projectId, userId, userRole)
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to view this project'
        })
      }

      // Parse query parameters
      const entityType = req.query.entity_type as string | undefined
      const entityId = req.query.entity_id as string | undefined
      const startDate = req.query.start_date as string | undefined
      const endDate = req.query.end_date as string | undefined
      const limit = parseInt(req.query.limit as string) || 100
      const offset = parseInt(req.query.offset as string) || 0

      // Build query with filters
      let query = `
        SELECT 
          pa.*,
          u.name as measured_by_name
        FROM performance_actuals pa
        LEFT JOIN users u ON pa.measured_by = u.id
        WHERE pa.project_id = $1
      `
      const params: any[] = [projectId]
      let paramIndex = 2

      if (entityType) {
        query += ` AND pa.entity_type = $${paramIndex}`
        params.push(entityType)
        paramIndex++
      }

      if (entityId) {
        query += ` AND pa.entity_id = $${paramIndex}`
        params.push(entityId)
        paramIndex++
      }

      if (startDate) {
        query += ` AND pa.measurement_date >= $${paramIndex}`
        params.push(startDate)
        paramIndex++
      }

      if (endDate) {
        query += ` AND pa.measurement_date <= $${paramIndex}`
        params.push(endDate)
        paramIndex++
      }

      query += ` ORDER BY pa.measurement_date DESC, pa.entity_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(limit, offset)

      const result = await pool!.query(query, params)

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM performance_actuals WHERE project_id = $1'
      const countParams: any[] = [projectId]
      let countParamIndex = 2

      if (entityType) {
        countQuery += ` AND entity_type = $${countParamIndex}`
        countParams.push(entityType)
        countParamIndex++
      }

      if (entityId) {
        countQuery += ` AND entity_id = $${countParamIndex}`
        countParams.push(entityId)
        countParamIndex++
      }

      if (startDate) {
        countQuery += ` AND measurement_date >= $${countParamIndex}`
        countParams.push(startDate)
        countParamIndex++
      }

      if (endDate) {
        countQuery += ` AND measurement_date <= $${countParamIndex}`
        countParams.push(endDate)
        countParamIndex++
      }

      const countResult = await pool!.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)

      log.info('[PERFORMANCE-ACTUALS] Fetched performance actuals', {
        projectId,
        count: result.rows.length,
        total,
        filters: { entityType, entityId, startDate, endDate }
      })

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      })
    } catch (error: unknown) {
      log.error('[PERFORMANCE-ACTUALS] Failed to fetch performance actuals', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/performance-actuals/:projectId/summary
 * Get performance summary (SPI, CPI, overall health)
 */
router.get(
  '/:projectId/summary',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const log = logger.child({ requestId: (req as any).requestId })
    
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.id
      const userRole = (req as any).user?.role || 'user'

      // Check project access
      const hasAccess = await checkProjectAccess(projectId, userId, userRole)
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to view this project'
        })
      }

      // Calculate overall performance indices
      const result = await pool!.query(
        `
        SELECT 
          COUNT(*) as total_measurements,
          AVG(schedule_variance_days) as avg_schedule_variance_days,
          AVG(schedule_variance_percent) as avg_schedule_variance_percent,
          AVG(cost_variance) as avg_cost_variance,
          AVG(cost_variance_percent) as avg_cost_variance_percent,
          AVG(progress_variance) as avg_progress_variance,
          AVG(quality_score) as avg_quality_score,
          SUM(defects_found) as total_defects,
          SUM(rework_hours) as total_rework_hours,
          COUNT(DISTINCT entity_type) as entity_types_count,
          COUNT(DISTINCT entity_name) as unique_entities_count
        FROM performance_actuals
        WHERE project_id = $1
        `,
        [projectId]
      )

      const summary = result.rows[0]

      // Calculate SPI and CPI from variance percentages
      // SPI = 1 + (schedule_variance_percent / 100)
      // CPI = 1 + (cost_variance_percent / 100)
      // Note: Negative variance = behind/over budget, positive = ahead/under budget
      const avgScheduleVariancePercent = parseFloat(summary.avg_schedule_variance_percent) || 0
      const avgCostVariancePercent = parseFloat(summary.avg_cost_variance_percent) || 0
      
      // SPI: > 1.0 = ahead, < 1.0 = behind
      // If variance is negative (behind), SPI < 1.0
      const spi = summary.avg_schedule_variance_percent !== null
        ? 1 + (avgScheduleVariancePercent / 100)
        : null

      // CPI: > 1.0 = under budget, < 1.0 = over budget
      // If variance is negative (over budget), CPI < 1.0
      const cpi = summary.avg_cost_variance_percent !== null
        ? 1 + (avgCostVariancePercent / 100)
        : null

      const avgQualityScore = parseFloat(summary.avg_quality_score) || null
      const overallHealth = determineProjectHealth(spi, cpi, avgQualityScore)

      const response = {
        success: true,
        data: {
          total_measurements: parseInt(summary.total_measurements) || 0,
          entity_types_count: parseInt(summary.entity_types_count) || 0,
          unique_entities_count: parseInt(summary.unique_entities_count) || 0,
          schedule: {
            avg_variance_days: parseFloat(summary.avg_schedule_variance_days) || 0,
            avg_variance_percent: avgScheduleVariancePercent,
            performance_index: spi,
            status: spi !== null ? (spi >= 1.0 ? 'ahead' : 'behind') : 'unknown'
          },
          cost: {
            avg_variance: parseFloat(summary.avg_cost_variance) || 0,
            avg_variance_percent: avgCostVariancePercent,
            performance_index: cpi,
            status: cpi !== null ? (cpi >= 1.0 ? 'under_budget' : 'over_budget') : 'unknown'
          },
          progress: {
            avg_variance: parseFloat(summary.avg_progress_variance) || 0
          },
          quality: {
            avg_score: avgQualityScore,
            total_defects: parseInt(summary.total_defects) || 0,
            total_rework_hours: parseFloat(summary.total_rework_hours) || 0
          },
          overall_health: overallHealth
        }
      }

      log.info('[PERFORMANCE-ACTUALS] Calculated performance summary', {
        projectId,
        spi,
        cpi,
        overallHealth
      })

      res.json(response)
    } catch (error: unknown) {
      log.error('[PERFORMANCE-ACTUALS] Failed to calculate performance summary', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/performance-actuals/:projectId
 * Add/update performance actual manually
 */
const createPerformanceActualSchema = Joi.object({
  entity_type: Joi.string().valid('milestone', 'deliverable', 'activity', 'phase', 'resource').required(),
  entity_id: Joi.string().uuid().optional().allow(null),
  entity_name: Joi.string().max(500).required(),
  planned_start_date: Joi.string().isoDate().optional().allow(null),
  actual_start_date: Joi.string().isoDate().optional().allow(null),
  planned_end_date: Joi.string().isoDate().optional().allow(null),
  actual_end_date: Joi.string().isoDate().optional().allow(null),
  planned_cost: Joi.number().optional().allow(null),
  actual_cost: Joi.number().optional().allow(null),
  planned_progress_percent: Joi.number().min(0).max(100).optional().allow(null),
  actual_progress_percent: Joi.number().min(0).max(100).optional().allow(null),
  quality_score: Joi.number().min(0).max(10).optional().allow(null),
  defects_found: Joi.number().integer().min(0).optional().allow(null),
  rework_hours: Joi.number().min(0).optional().allow(null),
  measurement_date: Joi.string().isoDate().optional(),
  notes: Joi.string().optional().allow(null)
})

router.post(
  '/:projectId',
  authenticateToken,
  validate(createPerformanceActualSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const log = logger.child({ requestId: (req as any).requestId })
    
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.id
      const userRole = (req as any).user?.role || 'user'

      // Check project access
      const hasAccess = await checkProjectAccess(projectId, userId, userRole)
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to modify this project'
        })
      }

      const actual = req.body
      const measurementDate = actual.measurement_date || new Date().toISOString()

      // Insert performance actual (database trigger will calculate variances)
      const result = await pool!.query(
        `
        INSERT INTO performance_actuals (
          project_id, entity_type, entity_id, entity_name,
          planned_start_date, actual_start_date, planned_end_date, actual_end_date,
          planned_cost, actual_cost,
          planned_progress_percent, actual_progress_percent,
          quality_score, defects_found, rework_hours,
          measurement_date, measurement_method, measured_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (project_id, entity_type, entity_id, entity_name, measurement_date) 
        DO UPDATE SET
          planned_start_date = COALESCE(EXCLUDED.planned_start_date, performance_actuals.planned_start_date),
          actual_start_date = COALESCE(EXCLUDED.actual_start_date, performance_actuals.actual_start_date),
          planned_end_date = COALESCE(EXCLUDED.planned_end_date, performance_actuals.planned_end_date),
          actual_end_date = COALESCE(EXCLUDED.actual_end_date, performance_actuals.actual_end_date),
          planned_cost = COALESCE(EXCLUDED.planned_cost, performance_actuals.planned_cost),
          actual_cost = COALESCE(EXCLUDED.actual_cost, performance_actuals.actual_cost),
          planned_progress_percent = COALESCE(EXCLUDED.planned_progress_percent, performance_actuals.planned_progress_percent),
          actual_progress_percent = COALESCE(EXCLUDED.actual_progress_percent, performance_actuals.actual_progress_percent),
          quality_score = COALESCE(EXCLUDED.quality_score, performance_actuals.quality_score),
          defects_found = COALESCE(EXCLUDED.defects_found, performance_actuals.defects_found),
          rework_hours = COALESCE(EXCLUDED.rework_hours, performance_actuals.rework_hours),
          notes = COALESCE(EXCLUDED.notes, performance_actuals.notes),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
        `,
        [
          projectId,
          actual.entity_type,
          actual.entity_id || null,
          actual.entity_name,
          actual.planned_start_date || null,
          actual.actual_start_date || null,
          actual.planned_end_date || null,
          actual.actual_end_date || null,
          actual.planned_cost !== undefined ? actual.planned_cost : null,
          actual.actual_cost !== undefined ? actual.actual_cost : null,
          actual.planned_progress_percent !== undefined ? actual.planned_progress_percent : null,
          actual.actual_progress_percent !== undefined ? actual.actual_progress_percent : null,
          actual.quality_score !== undefined ? actual.quality_score : null,
          actual.defects_found !== undefined ? actual.defects_found : null,
          actual.rework_hours !== undefined ? actual.rework_hours : null,
          measurementDate,
          'manual',
          userId,
          actual.notes || null
        ]
      )

      log.info('[PERFORMANCE-ACTUALS] Created/updated performance actual', {
        projectId,
        entityType: actual.entity_type,
        entityName: actual.entity_name,
        measurementDate
      })

      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error: unknown) {
      log.error('[PERFORMANCE-ACTUALS] Failed to save performance actual', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

export default router

