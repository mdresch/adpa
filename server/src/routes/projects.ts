import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import projectService from "../services/projectService"
import { v4 as uuidv4 } from "uuid"
import { trackActivity } from "../middleware/analyticsMiddleware"

const router = express.Router()

// Get all projects
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { page = 1, limit = 10, status, framework, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = `
      SELECT p.*, u.name as owner_name, u.email as owner_email,
             COUNT(d.id) as document_count,
             MAX(d.updated_at) as last_document_activity,
             GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity
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

    query += ` GROUP BY p.id, u.name, u.email ORDER BY last_activity DESC NULLS LAST`

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

// Get project context for AI generation (must be before /:id route)
router.get("/:id/context", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const userId = req.user?.id

    // Get project details with document count
    const projectResult = await pool.query(
      `
      SELECT p.*, 
             u.name as owner_name,
             COUNT(DISTINCT d.id) as documents_count,
             MAX(d.updated_at) as last_document_update
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `,
      [id]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Get recent documents (last 10) with title only
    const documentsResult = await pool.query(
      `
      SELECT id, title, template_id, created_at, updated_at
      FROM documents 
      WHERE project_id = $1 
      ORDER BY updated_at DESC 
      LIMIT 10
    `,
      [id]
    )

    // Get recent changes (last 5 documents created/updated)
    const recentChangesResult = await pool.query(
      `
      SELECT 
        title, 
        created_at, 
        updated_at,
        CASE 
          WHEN created_at > (updated_at - INTERVAL '1 hour') THEN 'created' 
          ELSE 'updated' 
        END as change_type
      FROM documents 
      WHERE project_id = $1 
      ORDER BY GREATEST(created_at, updated_at) DESC 
      LIMIT 5
    `,
      [id]
    )

    // Get baseline info if exists
    const baselineResult = await pool.query(
      `
      SELECT id, version, status, created_at
      FROM project_baselines 
      WHERE project_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `,
      [id]
    )

    const context = {
      id: projectResult.rows[0].id,
      name: projectResult.rows[0].name,
      description: projectResult.rows[0].description,
      status: projectResult.rows[0].status,
      created_at: projectResult.rows[0].created_at,
      documents_count: parseInt(projectResult.rows[0].documents_count) || 0,
      last_document_update: projectResult.rows[0].last_document_update,
      documents: documentsResult.rows,
      recent_changes: recentChangesResult.rows,
      baseline: baselineResult.rows[0] || null
    }

    log.info(`Project context retrieved for project ${id}`, {
      documentsCount: context.documents_count,
      hasBaseline: !!context.baseline
    })

    res.json(context)
  } catch (error) {
    log.error("Get project context error:", error)
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

    // Track project view
    if (req.user?.id) {
      trackActivity.viewProject(req.user.id, id)
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

    // Convert empty strings to null for date and numeric fields
    const startDateValue = start_date && start_date.trim() !== '' ? start_date : null
    const endDateValue = end_date && end_date.trim() !== '' ? end_date : null
    const budgetValue = budget && budget !== '' ? parseFloat(budget) : null

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
        startDateValue,
        endDateValue,
        budgetValue,
        req.user?.id,
        JSON.stringify(team_members),
      ],
    )

  log.info(`Project created: ${name} by ${req.user?.email}`)

    // Track project creation
    if (req.user?.id) {
      trackActivity.createProject(
        req.user.id,
        id,
        {
          name,
          framework,
          priority,
          team_members: team_members.length
        }
      )
    }

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
    const { name, description, framework, status, priority, start_date, end_date, budget, team_members, program_id } = req.body

    // Convert empty strings to null for date and numeric fields
    const startDateValue = start_date && start_date.trim() !== '' ? start_date : null
    const endDateValue = end_date && end_date.trim() !== '' ? end_date : null
    const budgetValue = budget && budget !== '' && budget !== null ? parseFloat(budget.toString()) : null

    // Build update payload for service
    const updates: any = {
      name,
      description,
      framework,
      status,
      priority,
      start_date: startDateValue,
      end_date: endDateValue,
      budget: budgetValue,
      team_members: JSON.stringify(team_members),
    }

    // Only include program_id if present in request (allow null to unassign)
    if (Object.prototype.hasOwnProperty.call(req.body, 'program_id')) {
      updates.program_id = program_id
    }

    const project = await projectService.update(id, updates, req.user?.id)
    if (!project) return res.status(404).json({ error: "Project not found" })

    log.info(`Project updated: ${id} by ${req.user?.email}`)

    res.json({ message: "Project updated successfully", project })
  } catch (error) {
    // Convert our service codes to appropriate HTTP responses
    if ((error as any).code === 'PROGRAM_NOT_FOUND') {
      return res.status(404).json({ error: 'Program not found' })
    }

    if ((error as any).code === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

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

// Project Document Routes

// Create a new document in a project
router.post("/:projectId/documents", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const { title, content, template_id, generation_metadata } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Verify user has access to project
    const projectCheck = await pool.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Create document
    const documentId = uuidv4()
    const result = await pool.query(
      `
      INSERT INTO documents 
      (id, project_id, title, content, template_id, generation_metadata, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
      `,
      [
        documentId,
        projectId,
        title,
        content,
        template_id || null,
        generation_metadata ? JSON.stringify(generation_metadata) : null,
        userId
      ]
    )

    log.info(`Document created in project ${projectId}`, {
      documentId,
      title,
      hasTemplate: !!template_id
    })

    res.json(result.rows[0])
  } catch (error) {
    log.error("Create document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get a specific document from a project
router.get("/:projectId/documents/:documentId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params

    const query = `
      SELECT 
        d.id,
        COALESCE(d.title, d.name) as title,
        d.content,
        COALESCE(d.author, u.name, 'Unknown') as author,
        d.created_at,
        d.updated_at,
        d.status,
        d.project_id,
        p.name as project_name,
        d.version,
        d.word_count,
        d.character_count,
        d.metadata,
        d.generation_metadata,
        d.template_metadata,
        d.template_id,
        d.framework,
        t.name as template_name
      FROM documents d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.id = $1 AND d.project_id = $2
    `

    const result = await pool.query(query, [documentId, projectId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const document = result.rows[0]
    
    // 🔍 DEBUG: Log what we got from database
    log.info('📊 [GET-PROJECT-DOC] Retrieved document:', {
      id: document.id,
      name: document.title,
      has_generation_metadata: !!document.generation_metadata,
      generation_metadata_type: typeof document.generation_metadata,
      generation_metadata_length: document.generation_metadata ? JSON.stringify(document.generation_metadata).length : 0
    })

    // Parse metadata if it exists and is a string
    if (document.metadata && typeof document.metadata === 'string') {
      try {
        document.metadata = JSON.parse(document.metadata)
      } catch (e) {
        // If parsing fails, keep as is
        document.metadata = {}
      }
    }
    
    // Parse generation_metadata if it exists and is a string
    if (document.generation_metadata && typeof document.generation_metadata === 'string') {
      try {
        log.info('⚠️ [GET-PROJECT-DOC] generation_metadata is STRING, parsing...')
        document.generation_metadata = JSON.parse(document.generation_metadata)
        log.info('✅ [GET-PROJECT-DOC] Parsed successfully. Keys:', Object.keys(document.generation_metadata))
      } catch (e) {
        log.error('❌ [GET-PROJECT-DOC] Failed to parse generation_metadata:', e)
        document.generation_metadata = null
      }
    } else if (document.generation_metadata) {
      log.info('✅ [GET-PROJECT-DOC] generation_metadata is already OBJECT')
    } else {
      log.info('❌ [GET-PROJECT-DOC] No generation_metadata in database')
    }
    
    // Parse template_metadata if it exists and is a string
    if (document.template_metadata && typeof document.template_metadata === 'string') {
      try {
        document.template_metadata = JSON.parse(document.template_metadata)
      } catch (e) {
        log.warn('Failed to parse template_metadata:', e)
        document.template_metadata = null
      }
    }
    
    // 🔍 DEBUG: Log what we're sending
    log.info('📤 [GET-PROJECT-DOC] Sending to frontend:', {
      id: document.id,
      has_generation_metadata: !!document.generation_metadata,
      has_aiProcessing: !!(document.generation_metadata?.aiProcessing),
      has_source_documents: !!(document.generation_metadata?.source_documents)
    })

    res.json(document)
  } catch (error) {
    log.error("Get project document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get document versions (now queries documents table, not document_versions)
router.get("/:projectId/documents/:documentId/versions", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params

    // First verify the document exists and belongs to the project
    const verifyQuery = `
      SELECT id FROM documents 
      WHERE id = $1 AND project_id = $2
    `
    const verifyResult = await pool.query(verifyQuery, [documentId, projectId])
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    // Use the get_document_versions function to get all related documents
    const query = `
      SELECT 
        id,
        name,
        semantic_version as version,
        content,
        created_at,
        updated_at,
        author_name as author,
        word_count,
        is_regeneration,
        generation_metadata as metadata,
        is_current,
        CASE 
          WHEN is_regeneration THEN 'Regenerated with updated project context'
          ELSE name
        END as changes
      FROM get_document_versions($1::UUID)
      ORDER BY created_at DESC
    `

    const result = await pool.query(query, [documentId])
    res.json(result.rows)
  } catch (error) {
    log.error("Get document versions error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update a document
router.put("/:projectId/documents/:documentId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params
    const { content, title, tags } = req.body
    const userId = (req as any).user.id

    // First, verify the document exists and belongs to the project
    const verifyQuery = `
      SELECT id FROM documents 
      WHERE id = $1 AND project_id = $2
    `
    const verifyResult = await pool.query(verifyQuery, [documentId, projectId])

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    // Update the document
    const updateQuery = `
      UPDATE documents 
      SET 
        content = $1,
        title = COALESCE($2, title),
        tags = COALESCE($3, tags),
        updated_at = NOW()
      WHERE id = $4 AND project_id = $5
      RETURNING *
    `

    const result = await pool.query(updateQuery, [
      content,
      title,
      tags ? JSON.stringify(tags) : null,
      documentId,
      projectId
    ])

    // Create a new version entry
    const versionQuery = `
      INSERT INTO document_versions (id, document_id, version, changes, word_count, author_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `

    const wordCount = content ? content.split(/\s+/).length : 0
    const versionNumber = `1.${Date.now()}` // Simple versioning for now

    await pool.query(versionQuery, [
      uuidv4(),
      documentId,
      versionNumber,
      "Document updated",
      wordCount,
      userId
    ])

    res.json(result.rows[0])
  } catch (error) {
    log.error("Update document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add a comment to a document
router.post("/:projectId/documents/:documentId/comments", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params
    const { content, author_id } = req.body
    const userId = (req as any).user.id

    // First, verify the document exists and belongs to the project
    const verifyQuery = `
      SELECT id FROM documents 
      WHERE id = $1 AND project_id = $2
    `
    const verifyResult = await pool.query(verifyQuery, [documentId, projectId])

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    // Get user info for the comment
    const userQuery = `SELECT name FROM users WHERE id = $1`
    const userResult = await pool.query(userQuery, [author_id || userId])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    // Create the comment
    const comment = {
      id: uuidv4(),
      author: userResult.rows[0].name,
      content,
      created_at: new Date().toISOString()
    }

    // Update the document's comments array
    const updateQuery = `
      UPDATE documents 
      SET 
        comments = COALESCE(comments, '[]'::jsonb) || $1::jsonb,
        updated_at = NOW()
      WHERE id = $2 AND project_id = $3
      RETURNING comments
    `

    const result = await pool.query(updateQuery, [
      JSON.stringify([comment]),
      documentId,
      projectId
    ])

    res.json(comment)
  } catch (error) {
    log.error("Add comment error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
