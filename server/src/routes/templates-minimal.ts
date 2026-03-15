import express from "express"
import { pool } from "../database/connection"
import { authenticateToken } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"

const router = express.Router()

// Get templates - Ultra minimal version without deleted_at
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  console.log("🚀 MINIMAL TEMPLATES ROUTE CALLED!")
  try {
    // Ultra simple query without deleted_at column
    const result = await pool.query(`
      SELECT id, name, description, framework, category, is_public, created_at, updated_at
      FROM templates 
      WHERE is_public = true
      ORDER BY name ASC
    `)

    console.log(`✅ Found ${result.rows.length} templates`)

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
    console.error("❌ Templates query error:", error)
    log.error(error, "Get templates error:")
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
})

// Get template by ID - Ultra minimal version
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  console.log(`🔍 Getting template with ID: ${req.params.id}`)
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT * FROM templates WHERE id = $1 AND is_public = true`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" })
    }

    res.json({ template: result.rows[0] })
  } catch (error) {
    console.error("❌ Template query error:", error)
    log.error(error, "Get template error:")
    res.status(500).json({ error: "Internal server error", details: error.message })
  }
})

export default router
