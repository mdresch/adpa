import express from "express"
import multer from "multer"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, schemas } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { cache } from "../utils/redis"
import { v4 as uuidv4 } from "uuid"
import { trackActivity } from "../middleware/analyticsMiddleware"

const router = express.Router()

// Test endpoint to verify server is working
router.get("/test", (req, res) => {
  res.json({ message: "Documents route is working", timestamp: new Date().toISOString() })
})

// Test feedback endpoint (no auth required for testing)
router.post("/test-feedback", (req, res) => {
  res.json({ 
    message: "Feedback endpoint is working", 
    body: req.body,
    timestamp: new Date().toISOString() 
  })
})

// Submit feedback for a document
router.post("/:id/feedback", 
  authenticateToken, 
  requirePermission("documents.update"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { comment, rating, category } = req.body
      
      // Debug logging
      log.info("Submit feedback request:", { id, body: req.body })
      
      // Basic validation
      if (!id) {
        return res.status(400).json({ error: "Document ID is required" })
      }
      
      if (!comment || comment.trim() === "") {
        return res.status(400).json({ error: "Comment is required" })
      }
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" })
      }
      
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

      // Check if user is owner or in team_members array
      const isOwner = doc.owner_id === req.user?.id
      const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

      if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Create new feedback
      const newFeedback = {
        id: uuidv4(),
        user: req.user?.email || "Unknown User",
        user_id: req.user?.id,
        comment: comment.trim(),
        rating: parseInt(rating),
        category: category || "general",
        timestamp: new Date().toISOString()
      }

      // Get current metadata and add feedback
      const currentMetadata = doc.metadata || {}
      const currentFeedback = currentMetadata.stakeholder_feedback || []
      
      const updatedMetadata = {
        ...currentMetadata,
        stakeholder_feedback: [...currentFeedback, newFeedback]
      }

      // Update document with new feedback
      const result = await pool.query(
        `
        UPDATE documents 
        SET metadata = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `,
        [JSON.stringify(updatedMetadata), req.user?.id, id]
      )

      // Clear cache
      await cache.del(`document:${id}`)

      log.info(`Feedback submitted for document: ${id} by ${req.user?.email}`)

      res.json({
        success: true,
        feedback: newFeedback,
        document: result.rows[0]
      })

    } catch (error) {
      log.error("Error submitting feedback:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get all documents (for export functionality)
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { page = 1, limit = 50, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = `
      SELECT
        d.id,
        d.name,
        d.framework,
        d.status,
        d.created_at,
        d.updated_at,
        p.name as project_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    // Add search filter if provided
    if (search) {
      query += ` AND (d.name ILIKE $${params.length + 1} OR p.name ILIKE $${params.length + 1})`
      params.push(`%${search}%`)
    }

    // Add ordering and pagination
    query += ` ORDER BY d.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(Number(limit), offset)

    const result = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE 1=1`
    const countParams: any[] = []

    if (search) {
      countQuery += ` AND (d.name ILIKE $1 OR p.name ILIKE $1)`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    res.json({
      documents: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    log.error("Failed to get documents:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

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
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const { page = 1, limit = 10, status, search } = req.query

    // Check if user has access to project
    const projectCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
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
      countParams.push(status as string)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND name ILIKE $${countParamCount}`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    return res.json({
      documents: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    log.error("Get project documents error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Get document by ID
router.get("/:id", authenticateToken, validateParams(Joi.object({ id: schemas.uuid })), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
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
      "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
      [document.project_id, req.user?.id]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Cache the document
    await cache.set(cacheKey, document, 1800) // 30 minutes

    return res.json({ document })
  } catch (error) {
    log.error("Get document error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Create document
router.post("/project/:projectId", 
  authenticateToken, 
  requirePermission("documents.create"),
  validateParams(Joi.object({ projectId: schemas.uuid })),
  validate(schemas.createDocument),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const { name, content, template_id, status = "draft" } = req.body

      // Check if user has access to project
      const projectCheck = await pool.query(
        "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
        [projectId, req.user?.id]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied to project" })
      }

      const id = uuidv4()

      // Convert content to Markdown string if it's an object
      let contentString = content
      if (typeof content === 'object' && content !== null) {
        // Handle different content object formats
        if (content.text) {
          contentString = content.text
        } else if (content.markdown) {
          contentString = content.markdown
        } else if (content.content) {
          contentString = content.content
        } else {
          // If it's a complex object, stringify it as JSON
          contentString = JSON.stringify(content, null, 2)
        }
      }

      // Calculate word count and character count
      const wordCount = contentString ? contentString.trim().split(/\s+/).filter(Boolean).length : 0
      const characterCount = contentString ? contentString.length : 0

      // Fetch template metadata if template_id is provided
      let templateMetadata: any = null
      let templateVersion: string | null = null
      let templateAuthor: string | null = null
      let templateFramework: string | null = null
      let templateCategory: string | null = null
      let templateComplexity: string | null = null

      if (template_id) {
        try {
          const templateResult = await pool.query(`
            SELECT 
              t.*,
              u.name as author_name,
              (t.content::jsonb -> 'metadata' ->> 'version') as version,
              (t.content::jsonb -> 'metadata' ->> 'complexity') as complexity,
              t.content::jsonb -> 'metadata' as metadata
            FROM templates t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.id = $1
          `, [template_id])

          if (templateResult.rows.length > 0) {
            const template = templateResult.rows[0]
            templateVersion = template.version || '1.0'
            templateAuthor = template.author_name || 'System'
            templateFramework = template.framework
            templateCategory = template.category
            templateComplexity = template.complexity || 'intermediate'
            templateMetadata = {
              template_id: template.id,
              template_name: template.name,
              version: templateVersion,
              framework: templateFramework,
              category: templateCategory,
              complexity: templateComplexity,
              author: templateAuthor,
              description: template.description,
              created_at: template.created_at,
              updated_at: template.updated_at
            }
            
            log.info('Template metadata captured:', templateMetadata)
          }
        } catch (error) {
          log.warn('Failed to fetch template metadata:', error)
        }
      }

      // Extract generation metadata from request if provided
      const generationMetadata = req.body.generation_metadata || null

      const result = await pool.query(
        `
        INSERT INTO documents (
          id, project_id, name, content, template_id, status, created_by, updated_by, 
          word_count, character_count,
          template_version, template_author, template_framework, template_category, 
          template_complexity, template_metadata, generation_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `,
        [
          id, projectId, name, contentString, template_id, status, req.user?.id, 
          wordCount, characterCount,
          templateVersion, templateAuthor, templateFramework, templateCategory,
          templateComplexity, templateMetadata ? JSON.stringify(templateMetadata) : null,
          generationMetadata ? JSON.stringify(generationMetadata) : null
        ]
      )

      // Track template usage
      if (template_id && result.rows[0]) {
        try {
          await pool.query(`
            INSERT INTO template_usage (
              template_id, document_id, user_id, project_id, 
              used_at, word_count, success
            )
            VALUES ($1, $2, $3, $4, NOW(), $5, true)
          `, [template_id, id, req.user?.id, projectId, wordCount])
          
          log.info('Template usage tracked')
        } catch (error) {
          log.warn('Failed to track template usage:', error)
        }
      }

  log.info(`Document created: ${name} in project ${projectId} by ${req.user?.email}`, {
    templateUsed: !!template_id,
    templateVersion: templateVersion,
    wordCount: wordCount
  })

      return res.status(201).json({
        message: "Document created successfully",
        document: result.rows[0],
      })
    } catch (error) {
      log.error("Create document error:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update document
router.put("/:id", 
  authenticateToken, 
  requirePermission("documents.update"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { name, content, status, tags, template_id, metadata } = req.body
      
      // Debug logging
      log.info("Update document request:", { 
        id, 
        body: req.body,
        hasTemplateId: !!template_id,
        hasMetadata: !!metadata,
        templateIdType: typeof template_id,
        metadataType: typeof metadata
      })
      
      // Manual validation
      if (!id) {
        return res.status(400).json({ error: "Document ID is required" })
      }
      
      // Validate template_id if provided
      if (template_id && template_id.trim() !== "") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(template_id)) {
          return res.status(400).json({ error: "Invalid template_id format" })
        }
      }
      
      // Validate status if provided
      if (status && !["draft", "review", "approved", "published"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" })
      }
      
      // Validate name if provided
      if (name && (typeof name !== "string" || name.length < 1 || name.length > 255)) {
        return res.status(400).json({ error: "Invalid name format" })
      }

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

      // Check if user is owner or in team_members array
      const isOwner = doc.owner_id === req.user?.id
      const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

      if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Increment version if content changed
      const versionIncrement = content ? ", version = version + 1" : ""

      // Prepare metadata update
      let metadataUpdate = doc.metadata || {}
      if (metadata) {
        metadataUpdate = { ...metadataUpdate, ...metadata }
      }
      if (tags) {
        metadataUpdate.tags = tags
      }

      // Convert content to Markdown string if it's an object
      let contentString = content
      if (content && typeof content === 'object') {
        // Handle different content object formats
        if (content.text) {
          contentString = content.text
        } else if (content.markdown) {
          contentString = content.markdown
        } else if (content.content) {
          contentString = content.content
        } else {
          // If it's a complex object, stringify it as JSON
          contentString = JSON.stringify(content, null, 2)
        }
      }

      // Calculate word count and character count if content is being updated
      let wordCountUpdate = ""
      let characterCountUpdate = ""
      const params: any[] = [name, contentString, status, template_id, JSON.stringify(metadataUpdate), req.user?.id]
      
      if (contentString) {
        const wordCount = contentString.trim().split(/\s+/).filter(Boolean).length
        const characterCount = contentString.length
        wordCountUpdate = `, word_count = $${params.length + 1}`
        characterCountUpdate = `, character_count = $${params.length + 2}`
        params.push(wordCount, characterCount)
      }
      
      params.push(id)

      const result = await pool.query(
        `
        UPDATE documents 
        SET name = COALESCE($1, name), 
            content = COALESCE($2, content), 
            status = COALESCE($3, status),
            template_id = COALESCE($4, template_id),
            metadata = COALESCE($5, metadata),
            updated_by = $6,
            updated_at = CURRENT_TIMESTAMP
            ${versionIncrement}
            ${wordCountUpdate}
            ${characterCountUpdate}
        WHERE id = $${params.length}
        RETURNING *
      `,
        params
      )

      // Clear cache
      await cache.del(`document:${id}`)

  log.info(`Document updated: ${id} by ${req.user?.email}`)

      return res.json({
        message: "Document updated successfully",
        document: result.rows[0],
      })
    } catch (error) {
      log.error("Update document error:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete document
router.delete("/:id", 
  authenticateToken, 
  requirePermission("documents.delete"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
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

      // Check if user is owner or in team_members array
      const isOwner = doc.owner_id === req.user?.id
      const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

      if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" })
      }

      await pool.query("DELETE FROM documents WHERE id = $1", [id])

      // Clear cache
      await cache.del(`document:${id}`)

  log.info(`Document deleted: ${id} by ${req.user?.email}`)

      return res.json({ message: "Document deleted successfully" })
    } catch (error) {
      log.error("Delete document error:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
