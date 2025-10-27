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
import AuditService from "../services/auditService"

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

// Get all cached summaries for a document (different compression levels)
router.get("/:id/summaries",
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      
      // Check if document_summaries table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'document_summaries'
        ) as exists
      `)
      
      if (!tableCheck.rows[0].exists) {
        return res.json({
          success: true,
          summaries: [],
          message: 'Summary caching not yet enabled. Run migration to enable.'
        })
      }
      
      // Get all summaries for this document, grouped by compression level
      const result = await pool.query(
        `SELECT 
          id,
          compression_method,
          compression_level,
          original_tokens,
          compressed_tokens,
          compression_ratio,
          compressed_content,
          ai_provider,
          ai_model,
          times_reused,
          last_reused_at,
          is_valid,
          created_at,
          updated_at
        FROM document_summaries
        WHERE document_id = $1
        ORDER BY compression_level ASC, created_at DESC`,
        [id]
      )
      
      log.info(`Retrieved ${result.rows.length} summaries for document: ${id}`)
      
      res.json({
        success: true,
        summaries: result.rows,
        count: result.rows.length
      })
      
    } catch (error) {
      log.error("Error fetching summaries:", error)
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch summaries" 
      })
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

// Get comprehensive stats for a project (across all documents)
router.get("/project/:projectId/stats", authenticateToken, validateParams(Joi.object({ projectId: schemas.uuid })), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    // Check if user has access to project
    const projectCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
      [projectId, req.user?.id]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied to project" })
    }

    // Get all documents for stats (excluding deleted)
    const docsResult = await pool.query(
      `
      SELECT 
        d.id, 
        d.status, 
        d.word_count, 
        d.character_count,
        d.file_size,
        d.metadata,
        d.created_at,
        d.updated_at,
        t.name as template_name,
        t.framework as template_framework
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1 AND d.deleted_at IS NULL
    `,
      [projectId]
    )

    const docs = docsResult.rows

    // Calculate statistics
    const byStatus = docs.reduce((acc: any, doc: any) => {
      const status = doc.status || 'draft'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const byTemplate = docs.reduce((acc: any[], doc: any) => {
      if (doc.template_name) {
        const existing = acc.find(t => t.template_name === doc.template_name)
        if (existing) {
          existing.count++
        } else {
          acc.push({
            template_name: doc.template_name,
            template_framework: doc.template_framework || 'Unknown',
            count: 1
          })
        }
      }
      return acc
    }, [])

    const byFramework = docs.reduce((acc: any[], doc: any) => {
      const framework = doc.template_framework || 'Unknown'
      const existing = acc.find((f: any) => f.framework === framework)
      if (existing) {
        existing.count++
      } else {
        acc.push({ framework, count: 1 })
      }
      return acc
    }, [])

    // Calculate total words and reading time
    const totalWords = docs.reduce((sum: number, doc: any) => sum + (doc.word_count || 0), 0)
    const totalCharacters = docs.reduce((sum: number, doc: any) => sum + (doc.character_count || 0), 0)
    const totalSize = docs.reduce((sum: number, doc: any) => sum + (doc.file_size || 0), 0)
    
    // Average reading speed is 200-250 words per minute, using 225
    const readingTimeMinutes = Math.ceil(totalWords / 225)

    // Count by specific statuses
    const publishedCount = byStatus['published'] || 0
    const generatedCount = byStatus['generated'] || 0
    const underReviewCount = byStatus['under_review'] || 0
    const reviewedCount = byStatus['reviewed'] || 0
    const draftCount = byStatus['draft'] || 0

    const stats = {
      totalDocuments: docs.length,
      byStatus,
      byTemplate: byTemplate.sort((a, b) => b.count - a.count),
      byFramework: byFramework.sort((a, b) => b.count - a.count),
      totalWords,
      totalCharacters,
      totalSize,
      readingTimeMinutes,
      readingTimeFormatted: readingTimeMinutes < 60 
        ? `${readingTimeMinutes} min` 
        : `${Math.floor(readingTimeMinutes / 60)}h ${readingTimeMinutes % 60}m`,
      counts: {
        published: publishedCount,
        generated: generatedCount,
        underReview: underReviewCount,
        reviewed: reviewedCount,
        draft: draftCount
      }
    }

    res.json(stats)

  } catch (error) {
    log.error("Error fetching project stats:", error)
    res.status(500).json({ error: "Internal server error" })
  }
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
      SELECT d.*, 
             u.name as created_by_name, 
             u2.name as updated_by_name,
             t.name as template_name,
             t.framework as template_framework
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1 AND d.deleted_at IS NULL AND d.parent_document_id IS NULL
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

    // Parse JSON fields for each document
    log.info(`📊 [GET-PROJECT-DOCS] Parsing ${result.rows.length} documents`)
    const documents = result.rows.map(doc => {
      if (doc.generation_metadata && typeof doc.generation_metadata === 'string') {
        try {
          log.info(`⚠️ [PARSE] generation_metadata is STRING for doc ${doc.name}, parsing...`)
          doc.generation_metadata = JSON.parse(doc.generation_metadata)
          log.info(`✅ [PARSE] Parsed successfully. Keys: ${Object.keys(doc.generation_metadata).join(', ')}`)
        } catch (e) {
          log.warn(`Failed to parse generation_metadata for doc ${doc.id}:`, e)
        }
      } else if (doc.generation_metadata) {
        log.info(`✅ [PARSE] generation_metadata is already OBJECT for doc ${doc.name}`)
      } else {
        log.info(`❌ [PARSE] No generation_metadata for doc ${doc.name}`)
      }
      if (doc.metadata && typeof doc.metadata === 'string') {
        try {
          doc.metadata = JSON.parse(doc.metadata)
        } catch (e) {
          log.warn(`Failed to parse metadata for doc ${doc.id}:`, e)
        }
      }
      if (doc.template_metadata && typeof doc.template_metadata === 'string') {
        try {
          doc.template_metadata = JSON.parse(doc.template_metadata)
        } catch (e) {
          log.warn(`Failed to parse template_metadata for doc ${doc.id}:`, e)
        }
      }
      return doc
    })

    return res.json({
      documents,
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
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const document = result.rows[0]
    
    // 🔍 DEBUG: Log what we got from database
    log.info('📊 [GET-DOC] Retrieved from database:', {
      id: document.id,
      name: document.name,
      has_generation_metadata: !!document.generation_metadata,
      generation_metadata_type: typeof document.generation_metadata,
      generation_metadata_is_string: typeof document.generation_metadata === 'string',
      generation_metadata_length: document.generation_metadata ? JSON.stringify(document.generation_metadata).length : 0
    })
    
    // Parse JSON fields if they're strings
    if (document.generation_metadata && typeof document.generation_metadata === 'string') {
      try {
        log.info('⚠️ [GET-DOC] generation_metadata is STRING, parsing...')
        document.generation_metadata = JSON.parse(document.generation_metadata)
        log.info('✅ [GET-DOC] generation_metadata parsed successfully')
      } catch (e) {
        log.error('❌ [GET-DOC] Failed to parse generation_metadata:', e)
      }
    } else if (document.generation_metadata) {
      log.info('✅ [GET-DOC] generation_metadata is already an OBJECT (pg parsed it)')
    }
    
    if (document.metadata && typeof document.metadata === 'string') {
      try {
        document.metadata = JSON.parse(document.metadata)
      } catch (e) {
        log.warn('Failed to parse metadata:', e)
      }
    }
    
    if (document.template_metadata && typeof document.template_metadata === 'string') {
      try {
        document.template_metadata = JSON.parse(document.template_metadata)
      } catch (e) {
        log.warn('Failed to parse template_metadata:', e)
      }
    }
    
    // 🔍 DEBUG: Log what we're sending
    log.info('📤 [GET-DOC] Sending to frontend:', {
      id: document.id,
      has_generation_metadata: !!document.generation_metadata,
      generation_metadata_type: typeof document.generation_metadata,
      has_aiProcessing: !!(document.generation_metadata?.aiProcessing),
      has_quality: !!(document.generation_metadata?.quality || document.generation_metadata?.qualityMetrics)
    })

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

    // Track document view
    if (req.user?.id) {
      trackActivity.viewDocument(
        req.user.id,
        document.id,
        document.project_id
      )
    }

    // Audit read (reason optional via header X-Access-Reason)
    await AuditService.log({
      table: 'documents',
      rowId: document.id,
      action: 'read',
      reason: (req.headers['x-access-reason'] as string) || undefined,
      ctx: {
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string,
        requestId: (req as any).requestId,
      }
    })

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
      
      // 🔍 DEBUG: Log what we received
      log.info('📊 [CREATE-DOC] Received generation_metadata:', {
        has_metadata: !!generationMetadata,
        metadata_type: typeof generationMetadata,
        metadata_keys: generationMetadata ? Object.keys(generationMetadata) : [],
        metadata_size: generationMetadata ? JSON.stringify(generationMetadata).length : 0
      })

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

      // Track document creation
      if (req.user?.id) {
        trackActivity.createDocument(
          req.user.id,
          id,
          projectId,
          {
            template_id,
            template_name: templateMetadata?.template_name,
            word_count: wordCount,
            character_count: characterCount,
            status
          }
        )

        // Track template usage
        if (template_id) {
          trackActivity.useTemplate(req.user.id, template_id, {
            document_id: id,
            project_id: projectId,
            word_count: wordCount
          })
        }
      }

      // Audit create
      await AuditService.log({
        table: 'documents',
        rowId: result.rows[0].id,
        action: 'create',
        newValues: result.rows[0],
        reason: (req.headers['x-access-reason'] as string) || undefined,
        ctx: { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] as string, requestId: (req as any).requestId }
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

      // Track document edit
      if (req.user?.id && result.rows[0]) {
        trackActivity.editDocument(
          req.user.id,
          id,
          result.rows[0].project_id
        )
      }

      // Audit update
      await AuditService.log({
        table: 'documents',
        rowId: id,
        action: 'update',
        oldValues: doc,
        newValues: result.rows[0],
        reason: (req.headers['x-access-reason'] as string) || undefined,
        ctx: { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] as string, requestId: (req as any).requestId }
      })

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

      // Check if document exists and user has access (exclude already deleted)
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.team_members
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1 AND d.deleted_at IS NULL
      `,
        [id]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found or already deleted" })
      }

      const doc = docCheck.rows[0]
      
      // Check if user is owner or has project access
      const isOwner = doc.owner_id === req.user?.id
      const teamMembers = doc.team_members || []
      let isInTeam = false
      
      if (Array.isArray(teamMembers)) {
        isInTeam = teamMembers.includes(req.user?.id)
      } else if (typeof teamMembers === 'object' && teamMembers !== null) {
        // Handle JSONB case
        isInTeam = Object.values(teamMembers).includes(req.user?.id)
      }

      if (!isOwner && !isInTeam) {
        log.warn('Access denied to delete document', {
          documentId: id,
          userId: req.user?.id,
          ownerId: doc.owner_id
        })
        return res.status(403).json({ error: "Access denied - you must be the project owner or a team member" })
      }

      // Soft delete using the function
      const deleteResult = await pool.query(
        "SELECT soft_delete_document($1, $2) as deleted",
        [id, req.user?.id]
      )

      if (!deleteResult.rows[0].deleted) {
        return res.status(404).json({ error: "Document not found or already deleted" })
      }

      // Clear cache
      await cache.del(`document:${id}`)

  log.info(`Document soft deleted: ${id} by ${req.user?.email}`)

      // Audit delete
      await AuditService.log({
        table: 'documents',
        rowId: id,
        action: 'soft_delete',
        oldValues: doc,
        reason: (req.headers['x-access-reason'] as string) || undefined,
        ctx: { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] as string, requestId: (req as any).requestId }
      })

      return res.json({ message: "Document moved to trash successfully" })
    } catch (error) {
      log.error("Delete document error:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get deleted documents for a project
router.get("/project/:projectId/deleted", 
  authenticateToken, 
  validateParams(Joi.object({ projectId: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params

      // Check if user has access to project
      const projectCheck = await pool.query(
        `
        SELECT p.owner_id, p.team_members
        FROM projects p
        WHERE p.id = $1
      `,
        [projectId]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" })
      }

      const project = projectCheck.rows[0]
      const teamMembers = project.team_members || []

      // Check if user is owner or in team_members array
      const isOwner = project.owner_id === req.user?.id
      const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

      if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Get deleted documents using the view
      const result = await pool.query(
        `
        SELECT *
        FROM documents_deleted
        WHERE project_id = $1
        ORDER BY deleted_at DESC
      `,
        [projectId]
      )

      res.json({
        documents: result.rows,
        count: result.rows.length
      })

    } catch (error) {
      log.error("Error fetching deleted documents:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Restore a soft-deleted document
router.post("/:id/restore", 
  authenticateToken, 
  requirePermission("documents.update"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check if document exists and is deleted
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.team_members
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1 AND d.deleted_at IS NOT NULL
      `,
        [id]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: "Deleted document not found" })
      }

      const doc = docCheck.rows[0]
      const teamMembers = doc.team_members || []

      // Check if user is owner or in team_members array
      const isOwner = doc.owner_id === req.user?.id
      const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

      if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Restore using the function
      const restoreResult = await pool.query(
        "SELECT restore_document($1, $2) as restored",
        [id, req.user?.id]
      )

      if (!restoreResult.rows[0].restored) {
        return res.status(404).json({ error: "Document not found or not deleted" })
      }

      log.info(`Document restored: ${id} by ${req.user?.email}`)

      // Audit restore
      await AuditService.log({
        table: 'documents',
        rowId: id,
        action: 'restore',
        oldValues: doc,
        reason: (req.headers['x-access-reason'] as string) || undefined,
        ctx: { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] as string, requestId: (req as any).requestId }
      })

      res.json({ 
        message: "Document restored successfully",
        documentId: id 
      })

    } catch (error) {
      log.error("Error restoring document:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Permanently delete a soft-deleted document (hard delete)
router.delete("/:id/permanent", 
  authenticateToken, 
  requirePermission("documents.delete"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check if document exists and is deleted
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.team_members
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1 AND d.deleted_at IS NOT NULL
      `,
        [id]
      )

      if (docCheck.rows.length === 0) {
        return res.status(404).json({ error: "Deleted document not found" })
      }

      const doc = docCheck.rows[0]
      const teamMembers = doc.team_members || []

      // Check if user is owner or in team_members array
      const isOwner = doc.owner_id === req.user?.id
      const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

      if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Hard delete
      await pool.query("DELETE FROM documents WHERE id = $1", [id])

      // Clear cache
      await cache.del(`document:${id}`)

      log.info(`Document permanently deleted: ${id} by ${req.user?.email}`)

      // Audit permanent delete
      await AuditService.log({
        table: 'documents',
        rowId: id,
        action: 'permanent_delete',
        oldValues: doc,
        reason: (req.headers['x-access-reason'] as string) || undefined,
        ctx: { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] as string, requestId: (req as any).requestId }
      })

      res.json({ 
        message: "Document permanently deleted",
        documentId: id 
      })

    } catch (error) {
      log.error("Error permanently deleting document:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
