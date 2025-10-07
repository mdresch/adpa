import express from "express"
import { pool } from "../database/connection"
import { authenticateToken } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"

const router = express.Router()

// Get templates - Simple working version
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  console.log("🎯 SIMPLE TEMPLATES ROUTE CALLED - This should appear in logs!")
  try {
    // Simple query to get all public templates
    const result = await pool.query(`
      SELECT id, name, description, framework, category, is_public, created_at, updated_at
      FROM templates 
      WHERE is_public = true AND deleted_at IS NULL
      ORDER BY name ASC
    `)

    res.json({
      templates: result.rows,
      pagination: {
        page: 1,
        limit: result.rows.length,
        total: result.rows.length,
        pages: 1,
      },
    })
  } catch (error) {
    log.error("Get templates error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get template by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT * FROM templates WHERE id = $1 AND is_public = true AND deleted_at IS NULL`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" })
    }

    res.json({ template: result.rows[0] })
  } catch (error) {
    log.error("Get template error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
