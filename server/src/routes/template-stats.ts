/**
 * Template Statistics API
 * Provides usage analytics and metrics for templates
 */

import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"

const router = express.Router()

// Get template statistics
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const result = await pool.query(`
      SELECT * FROM template_statistics
      ORDER BY total_uses DESC, name ASC
    `)

    return res.json({
      statistics: result.rows,
      total_templates: result.rows.length
    })
  } catch (error) {
    log.error("Get template statistics error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Get statistics for a specific template
router.get("/:templateId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { templateId } = req.params

    const result = await pool.query(`
      SELECT * FROM template_statistics
      WHERE id = $1
    `, [templateId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" })
    }

    // Get recent usage history
    const usageHistory = await pool.query(`
      SELECT 
        tu.*,
        u.name as user_name,
        p.name as project_name,
        d.name as document_name
      FROM template_usage tu
      LEFT JOIN users u ON tu.user_id = u.id
      LEFT JOIN projects p ON tu.project_id = p.id
      LEFT JOIN documents d ON tu.document_id = d.id
      WHERE tu.template_id = $1
      ORDER BY tu.used_at DESC
      LIMIT 50
    `, [templateId])

    return res.json({
      statistics: result.rows[0],
      usage_history: usageHistory.rows
    })
  } catch (error) {
    log.error("Get template statistics error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Get usage trends over time
router.get("/:templateId/trends", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { templateId } = req.params
    const { days = 30 } = req.query

    const result = await pool.query(`
      SELECT 
        DATE(used_at) as date,
        COUNT(*) as usage_count,
        AVG(word_count) as avg_word_count,
        AVG(quality_score) as avg_quality,
        AVG(generation_time_ms) as avg_time_ms,
        COUNT(DISTINCT user_id) as unique_users
      FROM template_usage
      WHERE template_id = $1
      AND used_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(used_at)
      ORDER BY date DESC
    `, [templateId])

    return res.json({
      trends: result.rows,
      period_days: parseInt(days as string)
    })
  } catch (error) {
    log.error("Get template trends error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router

