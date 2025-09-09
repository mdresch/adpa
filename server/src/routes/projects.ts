import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Get all projects
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { page = 1, limit = 10, status, framework, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = `
      SELECT p.*, u.name as owner_name, u.email as owner_email,
             COUNT(d.id) as document_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id
      WHERE 1=1
    `

    const params: any[] = []
    let paramCount = 0

    if (status) {
      paramCount++
      query += ` AND p.status = $${paramCount}`
      params.push(status)
    }

    if (framework) {
      paramCount++
      query += ` AND p.framework = $${paramCount}`
      params.push(framework)
    }

    if (search) {
      paramCount++
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    query += ` GROUP BY p.id, u.name, u.email ORDER BY p.created_at DESC`

    paramCount++
    query += ` LIMIT $${paramCount}`
    params.push(Number(limit))

    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await pool.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM projects WHERE 1=1"
    const countParams: any[] = []
    let countParamCount = 0

    if (status) {
      countParamCount++
      countQuery += ` AND status = $${countParamCount}`
      countParams.push(status)
    }

    if (framework) {
      countParamCount++
      countQuery += ` AND framework = $${countParamCount}`
      countParams.push(framework)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      projects: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    log.error("Get projects error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get project by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Get project documents
    const documentsResult = await pool.query(
      `
      SELECT d.*, u.name as created_by_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.project_id = $1
      ORDER BY d.created_at DESC
    `,
      [id],
    )

    const project = {
      ...result.rows[0],
      documents: documentsResult.rows,
    }

    res.json({ project })
  } catch (error) {
    log.error("Get project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create project
router.post("/", authenticateToken, requirePermission("projects.create"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      name,
      description,
      framework,
      priority = "medium",
      start_date,
      end_date,
      budget,
      team_members = [],
    } = req.body

    const id = uuidv4()

    const result = await pool.query(
      `
      INSERT INTO projects (id, name, description, framework, priority, start_date, end_date, budget, owner_id, team_members)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        id,
        name,
        description,
        framework,
        priority,
        start_date,
        end_date,
        budget,
        req.user?.id,
        JSON.stringify(team_members),
      ],
    )

  log.info(`Project created: ${name} by ${req.user?.email}`)

    res.status(201).json({
      message: "Project created successfully",
      project: result.rows[0],
    })
  } catch (error) {
    log.error("Create project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update project
router.put("/:id", authenticateToken, requirePermission("projects.update"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const { name, description, framework, status, priority, start_date, end_date, budget, team_members } = req.body

    const result = await pool.query(
      `
      UPDATE projects 
      SET name = $1, description = $2, framework = $3, status = $4, 
          priority = $5, start_date = $6, end_date = $7, budget = $8, 
          team_members = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `,
      [name, description, framework, status, priority, start_date, end_date, budget, JSON.stringify(team_members), id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

  log.info(`Project updated: ${id} by ${req.user?.email}`)

    res.json({
      message: "Project updated successfully",
      project: result.rows[0],
    })
  } catch (error) {
    log.error("Update project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete project
router.delete("/:id", authenticateToken, requirePermission("projects.delete"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM projects WHERE id = $1 RETURNING name", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

  log.info(`Project deleted: ${id} by ${req.user?.email}`)

    res.json({ message: "Project deleted successfully" })
  } catch (error) {
    log.error("Delete project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
