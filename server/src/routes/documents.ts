import express from "express"
import multer from "multer"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, schemas } from "../middleware/validation"
import { logger } from "../utils/logger"
import { cache } from "../utils/redis"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/documents/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type"))
    }
  },
})

// Get documents for a project
router.get("/project/:projectId", authenticateToken, validateParams(Joi.object({ projectId: schemas.uuid })), async (req, res) => {
  try {
    const { projectId } = req.params
    const { page = 1, limit = 10, status, search } = req.query

    // Check if user has access to project
    const projectCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR $2 = ANY(team_members::uuid[]))",
      [projectId, req.user?.id]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied to project" })
    }

    const offset = (Number(page) - 1) * Number(limit)
    let query = `
      SELECT d.*, u.name as created_by_name, u2.name as updated_by_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
      WHERE d.project_id = $1
    `

    const params: any[] = [projectId]
    let paramCount = 1

    if (status) {
      paramCount++
      query += ` AND d.status = $${paramCount}`
      params.push(status)
    }

    if (search) {
      paramCount++
      query += ` AND d.name ILIKE $${paramCount}`
      params.push(`%${search}%`)
    }

    query += ` ORDER BY d.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM documents WHERE project_id = $1"
    const countParams = [projectId]
    let countParamCount = 1

    if (status) {
      countParamCount++
      countQuery += ` AND status = $${countParamCount}`
      countParams.push(status)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND name ILIKE $${countParamCount}`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      documents: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    logger.error("Get project documents error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get document by ID
router.get("/:id", authenticateToken, validateParams(Joi.object({ id: schemas.uuid })), async (req, res) => {
  try {
    const { id } = req.params

    // Check cache first
    const cacheKey = `document:${id}`
    const cached = await cache.get(cacheKey)
    if (cached) {
      return res.json({ document: cached })
    }

    const result = await pool.query(
      `
      SELECT d.*, u.name as created_by_name, u2.name as updated_by_name,
             p.name as project_name, t.name as template_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.id = $1
    `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const document = result.rows[0]

    // Check if user has access to the project
    const projectCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR $2 = ANY(team_members::uuid[]))",
      [document.project_id, req.user?.id]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Cache the document
    await cache.set(cacheKey, document, 1800) // 30 minutes

    res.json({ document })
  } catch (error) {
    logger.error("Get document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create document
router.post("/project/:projectId", 
  authenticateToken, 
  requirePermission("documents.create"),
  validateParams(Joi.object({ projectId: schemas.uuid })),
  validate(schemas.createDocument),
  async (req, res) => {
    try {
      const { projectId } = req.params
      const { name, content, template_id, status = "draft" } = req.body

      // Check if user has access to project
      const projectCheck = await pool.query(
        "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR $2 = ANY(team_members::uuid[]))",
        [projectId, req.user?.id]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied to project" })
      }

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *
      `,
        [id, projectId, name, JSON.stringify(content), template_id, status, req.user?.id]
      )

      logger.info(`Document created: ${name} in project ${projectId} by ${req.user?.email}`)

      res.status(201).json({
        message: "Document created successfully",
        document: result.rows[0],
      })
    } catch (error) {
      logger.error("Create document error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update document
router.put("/:id", 
  authenticateToken, 
  requirePermission("documents.update"),
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(schemas.updateDocument),
  async (req, res) => {
    try {
      const { id } = req.params
      const { name, content, status } = req.body

      // Check if document exists and user has access
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.team_members
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1
      `,
        [id]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const doc = docCheck.rows[0]
      const teamMembers = doc.team_members || []

      if (doc.owner_id !== req.user?.id && !teamMembers.includes(req.user?.id)) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Increment version if content changed
      const versionIncrement = content ? ", version = version + 1" : ""

      const result = await pool.query(
        `
        UPDATE documents 
        SET name = COALESCE($1, name), 
            content = COALESCE($2, content), 
            status = COALESCE($3, status),
            updated_by = $4,
            updated_at = CURRENT_TIMESTAMP
            ${versionIncrement}
        WHERE id = $5
        RETURNING *
      `,
        [name, content ? JSON.stringify(content) : null, status, req.user?.id, id]
      )

      // Clear cache
      await cache.del(`document:${id}`)

      logger.info(`Document updated: ${id} by ${req.user?.email}`)

      res.json({
        message: "Document updated successfully",
        document: result.rows[0],
      })
    } catch (error) {
      logger.error("Update document error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete document
router.delete("/:id", 
  authenticateToken, 
  requirePermission("documents.delete"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    try {
      const { id } = req.params

      // Check if document exists and user has access
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.team_members
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1
      `,
        [id]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const doc = docCheck.rows[0]
      const teamMembers = doc.team_members || []

      if (doc.owner_id !== req.user?.id && !teamMembers.includes(req.user?.id)) {
        return res.status(403).json({ error: "Access denied" })
      }

      await pool.query("DELETE FROM documents WHERE id = $1", [id])

      // Clear cache
      await cache.del(`document:${id}`)

      logger.info(`Document deleted: ${id} by ${req.user?.email}`)

      res.json({ message: "Document deleted successfully" })
    } catch (error) {
      logger.error("Delete document error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
