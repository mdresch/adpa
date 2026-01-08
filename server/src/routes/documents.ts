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
import { extractionQueue } from "../services/queueService"
import { markdownToPdf } from "../utils/pdfGenerator"
import { PdfService } from "../services/pdf-service"
import { DocxService } from "../services/docxService"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
} from "docx"
// @ts-ignore - archiver v7 CommonJS compatibility
import archiver from "archiver"

const router = express.Router()

// Get quality audit details for a document
router.get("/:id/quality-audit", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id: documentId } = req.params
    const userId = (req as any).user?.id

    // Get document and verify access
    const docResult = await pool.query(
      `SELECT d.*, p.owner_id, p.created_by, p.team_members
       FROM documents d
       JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [documentId]
    )

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const doc = docResult.rows[0]
    const teamMembers = doc.team_members || []

    // Check permissions
    const isOwner = doc.owner_id === userId
    const isCreator = doc.created_by === userId
    const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId)

    if (!isOwner && !isCreator && !isInTeam) {
      return res.status(403).json({ error: "Access denied" })
    }

    // Get quality audit data
    const auditResult = await pool.query(
      `SELECT 
        qa.*,
        d.id as document_id,
        COALESCE(d.title, d.name) as document_title,
        COALESCE(d.framework, d.template_category, 'General') as document_type
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE qa.document_id = $1
       ORDER BY qa.audited_at DESC
       LIMIT 1`,
      [documentId]
    )

    if (auditResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Quality audit not found for this document"
      })
    }

    const audit = auditResult.rows[0]

    // Parse JSONB fields if they're strings
    let findings = audit.findings
    if (typeof findings === 'string') {
      try {
        findings = JSON.parse(findings)
      } catch (e) {
        findings = {}
      }
    }

    let issues = audit.issues
    if (typeof issues === 'string') {
      try {
        issues = JSON.parse(issues)
      } catch (e) {
        issues = []
      }
    }

    let recommendations = audit.recommendations
    if (typeof recommendations === 'string') {
      try {
        recommendations = JSON.parse(recommendations)
      } catch (e) {
        recommendations = []
      }
    }

    const qualityAudit = {
      id: audit.id,
      documentId: audit.document_id,
      documentTitle: audit.document_title,
      documentType: audit.document_type,
      overallScore: audit.overall_score,
      overallGrade: audit.overall_grade,
      qualityLevel: audit.quality_level,
      completenessScore: audit.completeness_score,
      consistencyScore: audit.consistency_score,
      professionalQualityScore: audit.professional_quality_score,
      standardsComplianceScore: audit.standards_compliance_score,
      accuracyScore: audit.accuracy_score,
      contextRelevanceScore: audit.context_relevance_score,
      findings: findings || {},
      issues: issues || [],
      recommendations: recommendations || [],
      aiProvider: audit.ai_provider,
      aiModel: audit.ai_model,
      analysisTokens: audit.analysis_tokens,
      analysisCost: audit.analysis_cost,
      analysisTime: audit.analysis_time,
      auditedAt: audit.audited_at,
      auditedBy: audit.audited_by
    }

    res.json({
      success: true,
      data: qualityAudit
    })

  } catch (error) {
    log.error("Error fetching quality audit:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch quality audit"
    })
  }
})

// Export document as PDF
router.get("/:id/export/pdf",
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // 1. Fetch document content
      const result = await pool.query(
        `SELECT d.name, d.content, d.metadata, p.name as project_name
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1 AND d.deleted_at IS NULL`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const doc = result.rows[0]
      let content = ""

      // Handle different content formats (string vs object)
      // Priority: markdown field > content field > text field > string > fallback
      if (typeof doc.content === 'string') {
        content = doc.content
      } else if (doc.content && typeof doc.content === 'object') {
        // Check for markdown field first (most common in JSONB storage)
        content = doc.content.markdown || doc.content.content || doc.content.text || JSON.stringify(doc.content)
      }

      if (!content || content.trim() === '') {
        log.warn(`Document ${id} has no content to export`)
        return res.status(400).json({ error: "Document has no content to export" })
      }

      log.info(`Exporting document ${id} to PDF (content length: ${content.length} chars)`)

      // 2. Generate PDF using service
      const pdfBuffer = await PdfService.generatePdf(
        content,
        doc.name,
        {
          project: doc.project_name,
          ...doc.metadata
        }
      )

      // 3. Send response
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${doc.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`)
      res.send(pdfBuffer)

    } catch (error) {
      log.error("Failed to export PDF:", error)
      res.status(500).json({ error: "Failed to generate PDF" })
    }
  }
)

// Export document as DOCX
router.get("/:id/export/docx",
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // 1. Fetch document content
      const result = await pool.query(
        `SELECT d.name, d.content, d.metadata, p.name as project_name
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1 AND d.deleted_at IS NULL`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const doc = result.rows[0]
      let content = ""

      // Handle different content formats (string vs object)
      if (typeof doc.content === 'string') {
        content = doc.content
      } else if (doc.content && typeof doc.content === 'object') {
        content = doc.content.content || doc.content.text || JSON.stringify(doc.content)
      }

      // 2. Generate DOCX using service
      const docxBuffer = await DocxService.generateDocx(
        content || "",
        doc.name,
        {
          project: doc.project_name,
          ...doc.metadata
        }
      )

      // 3. Send response
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename="${doc.name.replace(/[^a-z0-9]/gi, '_')}.docx"`)
      res.send(docxBuffer)

    } catch (error) {
      log.error("Failed to export DOCX:", error)
      res.status(500).json({ error: "Failed to generate DOCX" })
    }
  }
)


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
    const { page = 1, limit = 50, search, status, framework, project_id } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = `
      SELECT
        d.id,
        d.name,
        d.framework,
        d.status,
        d.created_at,
        d.updated_at,
        d.project_id,
        p.name as project_name,
        t.name as template_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.deleted_at IS NULL
    `
    const params: any[] = []

    // Add search filter if provided
    if (search) {
      params.push(`%${search}%`)
      query += ` AND (d.name ILIKE $${params.length} OR p.name ILIKE $${params.length})`
    }

    // Add status filter
    if (status && status !== 'all') {
      params.push(status)
      query += ` AND d.status = $${params.length}`
    }

    // Add framework filter
    if (framework && framework !== 'all') {
      params.push(framework)
      query += ` AND (d.framework = $${params.length} OR t.framework = $${params.length})`
    }

    // Add project_id filter
    if (project_id && project_id !== 'all') {
      params.push(project_id)
      query += ` AND d.project_id = $${params.length}`
    }

    // Add ordering and pagination
    params.push(Number(limit))
    query += ` ORDER BY d.updated_at DESC LIMIT $${params.length}`

    params.push(offset)
    query += ` OFFSET $${params.length}`

    const result = await pool.query(query, params)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM documents d 
      LEFT JOIN projects p ON d.project_id = p.id 
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.deleted_at IS NULL
    `
    const countParams: any[] = []

    if (search) {
      countParams.push(`%${search}%`)
      countQuery += ` AND (d.name ILIKE $${countParams.length} OR p.name ILIKE $${countParams.length})`
    }

    if (status && status !== 'all') {
      countParams.push(status)
      countQuery += ` AND d.status = $${countParams.length}`
    }

    if (framework && framework !== 'all') {
      countParams.push(framework)
      countQuery += ` AND (d.framework = $${countParams.length} OR t.framework = $${countParams.length})`
    }

    if (project_id && project_id !== 'all') {
      countParams.push(project_id)
      countQuery += ` AND d.project_id = $${countParams.length}`
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
    // Super admin can access all projects
    // Admin can access projects from their company
    const userRole = (req as any).user?.role?.toLowerCase()
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'

    let hasAccess = false

    if (isSuperAdmin) {
      // Super admin can access any project - just verify project exists
      const projectExists = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [projectId]
      )
      hasAccess = projectExists.rows.length > 0
    } else if (isAdmin) {
      // Admin can access projects from their company
      const userCompanyId = (req as any).user?.company_id
      if (userCompanyId) {
        const projectCheck = await pool.query(
          'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
          [projectId, userCompanyId]
        )
        hasAccess = projectCheck.rows.length > 0
      } else {
        // Admin with no company_id - fall back to ownership check
        const projectCheck = await pool.query(
          `SELECT p.id FROM projects p
           WHERE p.id = $1 AND (p.owner_id = $2 OR p.team_members ? $2::text)`,
          [projectId, req.user?.id]
        )
        hasAccess = projectCheck.rows.length > 0
      }
    } else {
      // Regular users: check ownership, creation, or team membership
      const projectCheck = await pool.query(
        `SELECT p.id, p.created_by, u.email as creator_email
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = $1 
         AND (
           p.owner_id = $2 
           OR p.created_by = $2 
           OR p.team_members ? $2::text
         )`,
        [projectId, req.user?.id]
      )
      hasAccess = projectCheck.rows.length > 0
    }

    if (!hasAccess) {
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
    const { page = 1, limit = 10, status, search, template, framework, grade } = req.query

    // Check if user has access to project
    // Super admin can access all projects
    // Admin can access projects from their company
    const userRole = (req as any).user?.role?.toLowerCase()
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'

    let hasAccess = false

    if (isSuperAdmin) {
      // Super admin can access any project - just verify project exists
      const projectExists = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [projectId]
      )
      hasAccess = projectExists.rows.length > 0
    } else if (isAdmin) {
      // Admin can access projects from their company
      const userCompanyId = (req as any).user?.company_id
      if (userCompanyId) {
        const projectCheck = await pool.query(
          'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
          [projectId, userCompanyId]
        )
        hasAccess = projectCheck.rows.length > 0
      } else {
        // Admin with no company_id - fall back to ownership check
        const projectCheck = await pool.query(
          `SELECT p.id FROM projects p
           WHERE p.id = $1 AND (p.owner_id = $2 OR p.team_members ? $2::text)`,
          [projectId, req.user?.id]
        )
        hasAccess = projectCheck.rows.length > 0
      }
    } else {
      // Regular users: check ownership, creation, or team membership
      const projectCheck = await pool.query(
        `SELECT p.id, p.created_by, u.email as creator_email, u.role as creator_role
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = $1 
         AND (
           p.owner_id = $2 
           OR p.created_by = $2 
           OR p.team_members ? $2::text
         )`,
        [projectId, req.user?.id]
      )
      hasAccess = projectCheck.rows.length > 0
    }

    if (!hasAccess) {
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

    // Template filter - match by template name
    if (template) {
      paramCount++
      query += ` AND t.name = $${paramCount}`
      params.push(template)
    }

    // Framework filter - match by template framework
    if (framework) {
      paramCount++
      query += ` AND t.framework = $${paramCount}`
      params.push(framework)
    }

    // Grade filter - filter by quality audit grade based on quality_score
    // Grades: A (90-100), B (80-89), C (70-79), D (60-69), F (0-59), not_audited (NULL)
    if (grade) {
      if (grade === 'not_audited') {
        query += ` AND d.quality_score IS NULL`
      } else if (grade === 'A') {
        query += ` AND d.quality_score >= 90`
      } else if (grade === 'B') {
        query += ` AND d.quality_score >= 80 AND d.quality_score < 90`
      } else if (grade === 'C') {
        query += ` AND d.quality_score >= 70 AND d.quality_score < 80`
      } else if (grade === 'D') {
        query += ` AND d.quality_score >= 60 AND d.quality_score < 70`
      } else if (grade === 'F') {
        query += ` AND d.quality_score < 60 AND d.quality_score IS NOT NULL`
      }
    }

    query += ` ORDER BY d.updated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    // Get total count (must match WHERE conditions of main query)
    let countQuery = `
      SELECT COUNT(*) 
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1 AND d.deleted_at IS NULL AND d.parent_document_id IS NULL
    `
    const countParams: any[] = [projectId]
    let countParamCount = 1

    if (status) {
      countParamCount++
      countQuery += ` AND d.status = $${countParamCount}`
      countParams.push(status as string)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND d.name ILIKE $${countParamCount}`
      countParams.push(`%${search}%`)
    }

    if (template) {
      countParamCount++
      countQuery += ` AND t.name = $${countParamCount}`
      countParams.push(template as string)
    }

    if (framework) {
      countParamCount++
      countQuery += ` AND t.framework = $${countParamCount}`
      countParams.push(framework as string)
    }

    if (grade) {
      if (grade === 'not_audited') {
        countQuery += ` AND d.quality_score IS NULL`
      } else if (grade === 'A') {
        countQuery += ` AND d.quality_score >= 90`
      } else if (grade === 'B') {
        countQuery += ` AND d.quality_score >= 80 AND d.quality_score < 90`
      } else if (grade === 'C') {
        countQuery += ` AND d.quality_score >= 70 AND d.quality_score < 80`
      } else if (grade === 'D') {
        countQuery += ` AND d.quality_score >= 60 AND d.quality_score < 70`
      } else if (grade === 'F') {
        countQuery += ` AND d.quality_score < 60 AND d.quality_score IS NOT NULL`
      }
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

    res.json({
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

// Generate PDF preview for signing
// NOTE: Must be defined BEFORE /:id route to avoid route conflicts
router.get("/:id/pdf-preview",
  authenticateToken,
  requirePermission("documents.read"),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Get document content
      const docResult = await pool.query(
        "SELECT id, name, content FROM documents WHERE id = $1",
        [id]
      )

      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const doc = docResult.rows[0]

      // Extract markdown content
      let markdownContent = ''
      if (typeof doc.content === 'string') {
        markdownContent = doc.content
      } else if (doc.content && typeof doc.content === 'object') {
        markdownContent = doc.content.content || doc.content.text || JSON.stringify(doc.content)
      } else {
        markdownContent = String(doc.content || '')
      }

      if (!markdownContent || markdownContent.trim() === '') {
        log.warn(`Document ${id} has no content to convert`)
        return res.status(400).json({ error: "Document has no content to convert to PDF" })
      }

      log.info(`Converting document ${id} to PDF (content length: ${markdownContent.length} chars)`)

      // Convert Markdown to PDF
      const pdfBuffer = await markdownToPdf(markdownContent, {
        format: "A4",
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
        printBackground: true
      })

      // Return PDF
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `inline; filename="${doc.name || 'document'}.pdf"`)
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
      res.send(pdfBuffer)

      log.info(`PDF preview generated successfully for document ${id} (size: ${pdfBuffer.length} bytes)`)
    } catch (error: any) {
      log.error("Error generating PDF preview:", error)
      res.status(500).json({ error: error.message || "Failed to generate PDF preview" })
    }
  }
)

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
    // Super admin can access all projects
    // Admin can access projects from their company
    const userRole = (req as any).user?.role?.toLowerCase()
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'

    let hasAccess = false

    if (isSuperAdmin) {
      // Super admin can access any project - just verify project exists
      const projectExists = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [document.project_id]
      )
      hasAccess = projectExists.rows.length > 0
    } else if (isAdmin) {
      // Admin can access projects from their company
      const userCompanyId = (req as any).user?.company_id
      if (userCompanyId) {
        const projectCheck = await pool.query(
          'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
          [document.project_id, userCompanyId]
        )
        hasAccess = projectCheck.rows.length > 0
      } else {
        // Admin with no company_id - fall back to ownership check
        const projectCheck = await pool.query(
          "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
          [document.project_id, req.user?.id]
        )
        hasAccess = projectCheck.rows.length > 0
      }
    } else {
      // Regular users: check ownership or team membership
      const projectCheck = await pool.query(
        "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
        [document.project_id, req.user?.id]
      )
      hasAccess = projectCheck.rows.length > 0
    }

    if (!hasAccess) {
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

// Get document version history
router.get("/:id/versions", authenticateToken, validateParams(Joi.object({ id: schemas.uuid })), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    log.info(`Fetching version history for document ${id}`)

    // Get all versions from document_versions table
    const versionsResult = await pool.query(
      `SELECT 
        dv.id,
        dv.document_id,
        dv.version,
        dv.semantic_version,
        dv.content,
        dv.change_description as changes,
        dv.change_type,
        dv.created_at,
        dv.author_id,
        u.name as author_name,
        dv.generation_metadata
       FROM document_versions dv
       LEFT JOIN users u ON dv.author_id = u.id
       WHERE dv.document_id = $1
       ORDER BY dv.created_at DESC`,
      [id]
    )

    // Also get current document version
    const currentDocResult = await pool.query(
      `SELECT 
        d.id,
        d.id as document_id,
        d.version,
        d.semantic_version,
        d.content,
        'Current version' as changes,
        'current' as change_type,
        d.updated_at as created_at,
        d.updated_by as author_id,
        u.name as author_name,
        d.generation_metadata
       FROM documents d
       LEFT JOIN users u ON d.updated_by = u.id
       WHERE d.id = $1 AND d.deleted_at IS NULL`,
      [id]
    )

    // Combine versions: current version + historical versions
    const allVersions = [
      ...(currentDocResult.rows.length > 0 ? currentDocResult.rows : []),
      ...versionsResult.rows
    ]

    log.info(`Found ${versionsResult.rows.length} historical versions + ${currentDocResult.rows.length} current version`)

    res.json(allVersions)
  } catch (error) {
    log.error("Failed to get document versions:", error)
    res.status(500).json({ error: "Failed to retrieve document versions" })
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
      // Super admin and admin can access all projects
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'

      let hasAccess = false

      if (isSuperAdmin || isAdmin) {
        // Super admin and admin can access any project - just verify project exists
        const projectExists = await pool.query(
          'SELECT id FROM projects WHERE id = $1',
          [projectId]
        )
        hasAccess = projectExists.rows.length > 0
      } else {
        // Regular users: check ownership or team membership
        const projectCheck = await pool.query(
          "SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)",
          [projectId, req.user?.id]
        )
        hasAccess = projectCheck.rows.length > 0
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to project" })
      }

      const id = uuidv4()

      // CRITICAL: Convert content to Markdown string if it's an object
      // Reject file metadata objects - these should go through the upload endpoint
      let contentString = content
      if (typeof content === 'object' && content !== null) {
        // Check if this is a file metadata object (should be rejected)
        if (content.fileName && content.fileSize && content.fileType && content.note === "Binary file uploaded - content stored separately") {
          log.error('Rejected file metadata object - PDF/DOCX files must be uploaded via file upload endpoint', {
            fileName: content.fileName,
            fileType: content.fileType,
            projectId
          })
          return res.status(400).json({
            error: "PDF and DOCX files must be uploaded using the file upload feature, not created directly. The upload will automatically convert them to Markdown."
          })
        }

        // Handle different content object formats
        if (content.text) {
          contentString = content.text
        } else if (content.markdown) {
          contentString = content.markdown
        } else if (content.content) {
          contentString = content.content
        } else {
          // If it's a complex object without recognized fields, reject it
          log.error('Rejected document creation with unrecognized content object format', {
            contentKeys: Object.keys(content),
            projectId
          })
          return res.status(400).json({
            error: "Invalid content format. Content must be a Markdown string or an object with 'text', 'markdown', or 'content' property. For PDF/DOCX files, use the upload endpoint."
          })
        }
      }

      // Ensure content is a string
      if (typeof contentString !== 'string') {
        contentString = String(contentString || '')
      }

      // Validate content is not empty
      if (!contentString || contentString.trim() === '') {
        return res.status(400).json({ error: "Document content cannot be empty" })
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

      // 🔍 Check for template conflicts and handle versioning
      if (template_id) {
        const { VersioningService } = await import('../services/document/VersioningService');
        const versioningService = new VersioningService();

        const creationResult = await versioningService.createDocumentFromTemplate(
          template_id,
          projectId,
          {
            userId: req.user?.id || '',
            content: contentString,
            documentName: name,
            metadata: templateMetadata
          }
        );

        if (creationResult.conflict) {
          // Conflict detected - return conflict information to frontend
          return res.status(409).json({
            conflict: true,
            conflictId: creationResult.conflictId,
            conflictResult: creationResult.conflictResult,
            message: 'Template conflict detected',
            options: creationResult.conflictResult.resolutionOptions
          });
        } else if (creationResult.success && creationResult.documentId) {
          // If document was created or updated, return the result
          // Skip the rest of the document creation logic since it's already handled
          if (creationResult.document) {
            return res.status(201).json({
              message: "Document created successfully",
              document: creationResult.document,
            });
          } else {
            // Document was updated, return the version info
            return res.status(200).json({
              message: "Document updated to new version due to template conflict resolution",
              documentId: creationResult.documentId,
              versionId: creationResult.versionId,
              semanticVersion: creationResult.semanticVersion
            });
          }
        }
      }

      // Proceed with original document creation logic if no template or no conflict

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
          word_count, character_count, version, semantic_version,
          template_version, template_author, template_framework, template_category, 
          template_complexity, template_metadata, generation_metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `,
        [
          id, projectId, name, contentString, template_id, status, req.user?.id,
          wordCount, characterCount, 1, '1.0.0', // Initial version and semantic_version
          templateVersion, templateAuthor, templateFramework, templateCategory,
          templateComplexity, templateMetadata ? JSON.stringify(templateMetadata) : null,
          generationMetadata ? JSON.stringify(generationMetadata) : null
        ]
      )

      // 📸 Save initial version snapshot to document_versions table
      // This ensures v1.0.0 is always available in version history
      try {
        await pool.query(
          `INSERT INTO document_versions 
           (id, document_id, version, semantic_version, content, author_id, created_at, change_type, change_description, generation_metadata)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
           ON CONFLICT (document_id, version) DO NOTHING`,
          [
            uuidv4(),
            id,
            '1',
            '1.0.0',
            contentString,
            req.user?.id,
            'initial',
            'Initial version - document created',
            generationMetadata ? JSON.stringify(generationMetadata) : null
          ]
        )

        log.info(`📸 Initial version v1.0.0 saved to version history`)
      } catch (versionError: any) {
        log.warn('[VERSION-SNAPSHOT] Failed to save initial version', { error: versionError.message })
        // Don't fail document creation if version snapshot fails
      }

      // Track template usage
      if (template_id && result.rows[0]) {
        try {
          // Insert into template_usage table
          await pool.query(`
            INSERT INTO template_usage (
              template_id, document_id, user_id, project_id, 
              used_at, word_count, success
            )
            VALUES ($1, $2, $3, $4, NOW(), $5, true)
          `, [template_id, id, req.user?.id, projectId, wordCount])

          log.info('Template usage tracked in template_usage table')

          // 🔧 FIX: Increment template's usage_count (displayed in UI)
          // This must be done separately from validation_count/success_count
          try {
            await pool.query(
              `UPDATE templates 
               SET usage_count = usage_count + 1,
                   last_used_at = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [template_id]
            )
            log.info('✅ Template usage_count incremented', { template_id })
          } catch (usageError) {
            log.error('⚠️ Failed to increment template usage_count:', {
              template_id,
              error: usageError.message
            })
            // Don't fail the document creation if counter update fails
          }

          // 🔧 FIX: Also increment template's validation_count and success_count
          // This was previously only done for AI-generated documents, causing counters to get stuck
          try {
            // Default quality score of 0.85 (85%) for manually created documents
            // This marks them as successful since default quality_threshold is 0.70 (70%)
            const qualityScore = 0.85

            await pool.query(
              'SELECT update_template_validation($1, $2, $3)',
              [template_id, qualityScore, req.user?.id]
            )

            log.info('✅ Template validation counters incremented', {
              template_id,
              quality_score: qualityScore
            })

            // Clear template cache so UI shows updated metrics immediately
            try {
              const { cache } = require('../utils/redis')
              await cache.del(`template:${template_id}`)
              log.info('🔄 Template cache cleared for fresh metrics display')
            } catch (cacheError) {
              log.warn('Failed to clear template cache:', cacheError)
            }
          } catch (validationError) {
            log.error('⚠️ Failed to increment template validation counters:', {
              template_id,
              error: validationError.message
            })
            // Don't fail the document creation if counter update fails
          }
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

      // 🚀 Automatic Entity Extraction: Trigger extraction for newly created document
      // This runs asynchronously and doesn't block the response
      if (contentString && contentString.trim().length > 0) {
        try {
          log.info('🔍 [AUTO-EXTRACTION] Starting automatic extraction trigger', {
            documentId: id,
            documentName: name,
            projectId,
            contentLength: contentString.length,
            hasContent: !!contentString.trim()
          })

          // Create extraction job record
          const extractionJobResult = await pool.query(
            `INSERT INTO jobs (
              type, status, data, created_by, project_id
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id`,
            [
              'project-data-extraction',
              'pending',
              JSON.stringify({
                projectId,
                documentIds: [id], // Extract only from this newly created document
                autoTriggered: true,
                sourceDocumentId: id,
                sourceDocumentName: name
              }),
              req.user?.id,
              projectId
            ]
          )

          const extractionJobId = extractionJobResult.rows[0].id
          log.info('✅ [AUTO-EXTRACTION] Extraction job record created', { extractionJobId })

          // Enqueue extraction job (non-blocking)
          const bullJob = await extractionQueue.add(
            'extract-project-data',
            {
              jobId: extractionJobId,
              projectId,
              userId: req.user?.id,
              documentIds: [id], // Extract entities from this document only
              aiProvider: undefined, // Use default provider
              aiModel: undefined // Use default model
            },
            { jobId: extractionJobId }
          )

          log.info('🚀 [AUTO-EXTRACTION] Automatic entity extraction triggered for new document', {
            documentId: id,
            documentName: name,
            extractionJobId,
            bullJobId: bullJob.id,
            projectId,
            queueName: 'project-data-extraction'
          })
        } catch (extractionError: any) {
          // Don't fail document creation if extraction trigger fails
          log.error('❌ [AUTO-EXTRACTION] Failed to trigger automatic entity extraction', {
            documentId: id,
            documentName: name,
            projectId,
            error: extractionError.message,
            stack: extractionError.stack,
            errorType: extractionError.constructor?.name
          })
        }
      } else {
        log.info('⏭️ [AUTO-EXTRACTION] Skipping extraction - document has no content', {
          documentId: id,
          documentName: name,
          contentLength: contentString?.length || 0
        })
      }

      // 🔗 Auto-integration: Check project settings and auto-publish to Confluence/Jira if enabled
      // This runs asynchronously and doesn't block the response
      const document = result.rows[0]
      setImmediate(() => {
        (async () => {
          try {
            // Get project integration settings
            const projectSettingsResult = await pool.query(
              `SELECT 
                confluence_enabled,
                confluence_auto_publish,
                confluence_space_key_override,
                confluence_parent_page_id_override,
                jira_enabled,
                jira_auto_create,
                jira_project_key_override,
                jira_issue_type_override,
                jira_priority_override
               FROM project_integrations 
               WHERE project_id = $1`,
              [projectId]
            )

            if (projectSettingsResult.rows.length > 0) {
              const settings = projectSettingsResult.rows[0]
              let confluenceUrl: string | null = null

              // Auto-publish to Confluence if enabled
              if (settings.confluence_enabled === true && settings.confluence_auto_publish === true) {
                try {
                  log.info('🔗 [AUTO-INTEGRATION] Auto-publishing document to Confluence', {
                    documentId: id,
                    documentName: name,
                    projectId
                  })

                  // Get latest active Confluence integration
                  const integrationResult = await pool.query(
                    `SELECT * FROM integrations WHERE type = 'confluence' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
                  )

                  if (integrationResult.rows.length > 0) {
                    const integration = integrationResult.rows[0]

                    // Parse configuration (JSONB might be string or object)
                    const config = typeof integration.configuration === 'string'
                      ? JSON.parse(integration.configuration)
                      : integration.configuration || {}

                    // Decrypt credentials
                    let credentials: any = {}
                    try {
                      if (integration.credentials_encrypted) {
                        const decryptedData = Buffer.from(integration.credentials_encrypted, "base64").toString("utf-8")
                        credentials = JSON.parse(decryptedData)
                      }
                    } catch (e) {
                      log.warn('Failed to decrypt Confluence credentials for auto-publish', e)
                      throw new Error('Invalid credentials')
                    }

                    const { ConfluenceIntegration } = await import('../integrations/confluence')
                    const confluenceIntegration = new ConfluenceIntegration(
                      {
                        baseUrl: config.base_url || config.baseUrl || credentials.baseUrl,
                        username: credentials.username,
                        apiToken: credentials.api_token,
                        cloudId: config.cloud_id || config.cloudId
                      },
                      integration.id
                    )

                    const projectSettings = {
                      confluence_enabled: settings.confluence_enabled,
                      confluence_space_key_override: settings.confluence_space_key_override,
                      confluence_parent_page_id_override: settings.confluence_parent_page_id_override
                    }

                    confluenceUrl = await confluenceIntegration.uploadDocument({
                      id: document.id,
                      title: document.name,
                      content: document.content,
                      project_id: projectId,
                      framework: document.framework,
                      status: document.status,
                    }, projectSettings)

                    // Update document with Confluence URL
                    await pool.query(
                      `UPDATE documents SET confluence_page_url = $1 WHERE id = $2`,
                      [confluenceUrl, id]
                    )

                    log.info('✅ [AUTO-INTEGRATION] Document auto-published to Confluence', {
                      documentId: id,
                      confluenceUrl
                    })
                  } else {
                    log.warn('⚠️ [AUTO-INTEGRATION] No active Confluence integration found for auto-publish')
                  }
                } catch (confluenceError: any) {
                  // Don't fail document creation if auto-publish fails
                  log.error('❌ [AUTO-INTEGRATION] Failed to auto-publish to Confluence', {
                    documentId: id,
                    error: confluenceError.message,
                    stack: confluenceError.stack
                  })
                }
              }

              // Auto-create Jira issue if enabled
              if (settings.jira_enabled === true && settings.jira_auto_create === true) {
                try {
                  log.info('🔗 [AUTO-INTEGRATION] Auto-creating Jira issue for document', {
                    documentId: id,
                    documentName: name,
                    projectId
                  })

                  const { jiraLinkageService } = await import('../services/jiraLinkageService')
                  const jiraResult = await jiraLinkageService.linkDocumentToJira(
                    id,
                    name,
                    projectId,
                    confluenceUrl || undefined,
                    `Document: ${name}\n\nProject: ${projectId}\nDocument ID: ${id}`,
                    settings.jira_issue_type_override || undefined,
                    settings.jira_priority_override || undefined
                  )

                  if (jiraResult) {
                    log.info('✅ [AUTO-INTEGRATION] Jira issue auto-created for document', {
                      documentId: id,
                      issueKey: jiraResult.issueKey,
                      issueUrl: jiraResult.issueUrl,
                      created: jiraResult.created
                    })
                  } else {
                    log.warn('⚠️ [AUTO-INTEGRATION] Jira linkage service returned null (may be disabled or misconfigured)')
                  }
                } catch (jiraError: any) {
                  // Don't fail document creation if auto-create fails
                  log.error('❌ [AUTO-INTEGRATION] Failed to auto-create Jira issue', {
                    documentId: id,
                    error: jiraError.message,
                    stack: jiraError.stack
                  })
                }
              }
            } else {
              log.debug('ℹ️ [AUTO-INTEGRATION] No project integration settings found, skipping auto-integration')
            }
          } catch (integrationError: any) {
            // Don't fail document creation if integration check fails
            log.error('❌ [AUTO-INTEGRATION] Error checking project integration settings', {
              documentId: id,
              projectId,
              error: integrationError.message,
              stack: integrationError.stack
            })
          }
        })().catch((err: any) => {
          // Catch any unhandled promise rejections
          log.error('❌ [AUTO-INTEGRATION] Unhandled error in auto-integration', {
            documentId: id,
            projectId,
            error: err?.message || 'Unknown error',
            stack: err?.stack
          })
        })
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

      // Semantic versioning: MAJOR.MINOR.PATCH
      // - Template change: Major (1.0 → 2.0)
      // - AI re-generation: Minor (1.0 → 1.1)
      // - Manual edit: Patch (1.0.0 → 1.0.1)
      let versionIncrement = ""
      let newVersion = doc.version || 1

      if (content) {
        // Parse current version (handles both "1" and "1.0" and "1.0.0" formats)
        const versionStr = String(doc.version || "1")
        const versionParts = versionStr.split('.')
        let major = parseInt(versionParts[0]) || 1
        let minor = parseInt(versionParts[1]) || 0
        let patch = parseInt(versionParts[2]) || 0

        // Determine version increment type
        const templateChanged = template_id && template_id !== doc.template_id
        const isRegeneration = metadata?.regenerated === true

        if (templateChanged) {
          // Major version change: 1.0.0 → 2.0.0
          major += 1
          minor = 0
          patch = 0
        } else if (isRegeneration) {
          // Minor version change: 1.0.0 → 1.1.0
          minor += 1
          patch = 0
        } else {
          // Patch version change (manual edit): 1.0.0 → 1.0.1
          patch += 1
        }

        newVersion = `${major}.${minor}.${patch}`
        versionIncrement = `, version = $${999}` // Placeholder, we'll add it to params later
      }

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

      // Add version to params if content changed
      if (content) {
        versionIncrement = `, version = $${params.length + 1}`
        params.push(newVersion)
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

      log.info(`Document updated: ${id} by ${req.user?.email}`, {
        oldVersion: doc.version,
        newVersion: content ? newVersion : doc.version,
        versionType: template_id !== doc.template_id ? 'major' :
          metadata?.regenerated ? 'minor' : 'patch',
        hasContent: !!content,
        hasContentString: !!contentString,
        hasProjectId: !!result.rows[0]?.project_id
      })

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

      // 🔥 NEW: Trigger quality audit if content was modified
      if (content && contentString && result.rows[0]) {
        try {
          const { qualityAuditService } = await import('../services/qualityAuditService')

          log.info('[MANUAL-EDIT] Triggering quality audit after content modification', {
            documentId: id,
            documentName: result.rows[0].name,
            userId: req.user?.id,
            oldVersion: doc.version,
            newVersion: result.rows[0].version
          })

          // Run audit asynchronously (don't block response)
          qualityAuditService.auditDocument(
            id,
            contentString,
            result.rows[0].type || 'unknown',
            { id: result.rows[0].project_id, name: 'Project' }, // Minimal project info
            req.user?.id
          ).catch((auditError: any) => {
            log.error('[MANUAL-EDIT] Quality audit failed', {
              documentId: id,
              error: auditError.message
            })
            // Don't fail the update if audit fails
          })
        } catch (importError: any) {
          log.error('[MANUAL-EDIT] Failed to import quality audit service', importError)
        }
      }

      // ⭐ AUTOMATIC DRIFT DETECTION on document save
      let driftRevalidation = null

      // Only run drift validation if content has ACTUALLY CHANGED
      // This prevents false drift detection on every save
      // Note: We check both contentString existence AND inequality to handle edge cases
      const contentHasChanged = contentString !== undefined && doc.content !== contentString

      if (contentHasChanged && result.rows[0]?.project_id && result.rows[0]?.content) {
        try {
          const { driftDetectionService } = await import('../services/driftDetectionService')

          log.info(`[DRIFT] Auto-detecting drift after document content change`, {
            projectId: result.rows[0].project_id,
            documentId: id,
            documentName: result.rows[0].name,
            oldContentLength: doc.content?.length || 0,
            newContentLength: contentString?.length || 0
          })

          // Check for drift using new drift detection service
          const driftResult = await driftDetectionService.checkForDrift(
            result.rows[0].project_id,
            id
          )

          driftRevalidation = {
            hasDrift: driftResult.hasDrift,
            severity: driftResult.severity,
            driftCount: driftResult.driftPoints.length,
            summary: driftResult.summary
          }

          if (driftResult.hasDrift) {
            log.warn(`[DRIFT] Detected drift after document update`, {
              documentId: id,
              severity: driftResult.severity,
              driftCount: driftResult.driftPoints.length
            })

            // Get baseline ID for drift record
            const baselineResult = await pool.query(
              `SELECT id FROM project_baselines 
               WHERE project_id = $1 
               AND status IN ('approved', 'active')
               ORDER BY approved_at DESC LIMIT 1`,
              [result.rows[0].project_id]
            )

            if (baselineResult.rows.length > 0) {
              // Create drift record
              const driftRecord = await driftDetectionService.createDriftRecord({
                projectId: result.rows[0].project_id,
                documentId: id,
                baselineId: baselineResult.rows[0].id,
                driftPoints: driftResult.driftPoints,
                severity: driftResult.severity,
                triggeredBy: 'manual' // Manual user edit
              })

              // Add drift record ID to response
              driftRevalidation.driftRecordId = driftRecord.id

              // Trigger escalation check (TASK-742: Escalation matrix)
              try {
                await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftResult.driftPoints)
                log.info('[DRIFT] Escalation check completed', { driftRecordId: driftRecord.id })
              } catch (escalationError) {
                log.error('[DRIFT] Error triggering escalation:', escalationError)
                // Don't fail the request if escalation fails
              }

              // Emit WebSocket event for drift detection
              try {
                const { io } = await import('../server')
                io.to(`project:${result.rows[0].project_id}`).emit('drift:detected', {
                  documentId: id,
                  documentTitle: result.rows[0].name,
                  driftRecordId: driftRecord.id,
                  severity: driftResult.severity,
                  driftCount: driftResult.driftPoints.length
                })
              } catch (ioError) {
                log.debug('[DRIFT] Socket.io not available for drift notification')
              }
            }
          } else {
            log.info(`[DRIFT] ✅ No drift detected - document aligns with baseline`)

            // Mark any existing drift as resolved
            await pool.query(
              `UPDATE baseline_drift_detection 
               SET status = 'resolved',
                   resolution_notes = 'Drift resolved via manual edit',
                   resolved_at = CURRENT_TIMESTAMP,
                   assigned_to = $1
               WHERE source_document_id = $2 
               AND status = 'detected'`,
              [req.user?.id, id]
            )
          }

        } catch (driftErr: any) {
          log.error('[DRIFT] Drift validation failed:', driftErr)
          // Don't fail the update if drift validation fails
        }
      }

      // 🔗 AUTO-INTEGRATION: Trigger Confluence and Jira integration after document update
      const updatedDocument = result.rows[0]
      const projectId = updatedDocument.project_id

      setImmediate(() => {
        (async () => {
          try {
            // Get project integration settings
            const projectSettingsResult = await pool.query(
              `SELECT 
                confluence_enabled,
                confluence_auto_publish,
                confluence_space_key_override,
                confluence_parent_page_id_override,
                jira_enabled,
                jira_auto_create,
                jira_project_key_override,
                jira_issue_type_override,
                jira_priority_override
               FROM project_integrations 
               WHERE project_id = $1`,
              [projectId]
            )

            if (projectSettingsResult.rows.length > 0) {
              const settings = projectSettingsResult.rows[0]
              let confluenceUrl: string | null = updatedDocument.confluence_page_url || null

              // Auto-publish to Confluence if enabled
              if (settings.confluence_enabled === true && settings.confluence_auto_publish === true) {
                try {
                  log.info('🔗 [AUTO-INTEGRATION] Auto-publishing updated document to Confluence', {
                    documentId: id,
                    documentName: updatedDocument.name,
                    projectId
                  })

                  // Get latest active Confluence integration
                  const integrationResult = await pool.query(
                    `SELECT * FROM integrations WHERE type = 'confluence' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
                  )

                  if (integrationResult.rows.length > 0) {
                    const integration = integrationResult.rows[0]

                    // Parse configuration (JSONB might be string or object)
                    const config = typeof integration.configuration === 'string'
                      ? JSON.parse(integration.configuration)
                      : integration.configuration || {}

                    // Decrypt credentials
                    let credentials: any = {}
                    try {
                      if (integration.credentials_encrypted) {
                        const decryptedData = Buffer.from(integration.credentials_encrypted, "base64").toString("utf-8")
                        credentials = JSON.parse(decryptedData)
                      }
                    } catch (e) {
                      log.warn('Failed to decrypt Confluence credentials for auto-publish', e)
                      throw new Error('Invalid credentials')
                    }

                    const { ConfluenceIntegration } = await import('../integrations/confluence')
                    const confluenceIntegration = new ConfluenceIntegration(
                      {
                        baseUrl: config.base_url || config.baseUrl || credentials.baseUrl,
                        username: credentials.username,
                        apiToken: credentials.api_token,
                        cloudId: config.cloud_id || config.cloudId
                      },
                      integration.id
                    )

                    const projectSettings = {
                      confluence_enabled: settings.confluence_enabled,
                      confluence_space_key_override: settings.confluence_space_key_override,
                      confluence_parent_page_id_override: settings.confluence_parent_page_id_override
                    }

                    confluenceUrl = await confluenceIntegration.uploadDocument({
                      id: updatedDocument.id,
                      title: updatedDocument.name,
                      content: updatedDocument.content,
                      project_id: projectId,
                      framework: updatedDocument.framework,
                      status: updatedDocument.status,
                    }, projectSettings)

                    // Update document with Confluence URL
                    await pool.query(
                      `UPDATE documents SET confluence_page_url = $1 WHERE id = $2`,
                      [confluenceUrl, id]
                    )

                    log.info('✅ [AUTO-INTEGRATION] Updated document auto-published to Confluence', {
                      documentId: id,
                      confluenceUrl
                    })
                  } else {
                    log.warn('⚠️ [AUTO-INTEGRATION] No active Confluence integration found for auto-publish')
                  }
                } catch (confluenceError: any) {
                  // Don't fail document update if auto-publish fails
                  log.error('❌ [AUTO-INTEGRATION] Failed to auto-publish to Confluence', {
                    documentId: id,
                    error: confluenceError.message,
                    stack: confluenceError.stack
                  })
                }
              }

              // Auto-create/update Jira issue if enabled
              if (settings.jira_enabled === true && settings.jira_auto_create === true) {
                try {
                  log.info('🔗 [AUTO-INTEGRATION] Auto-creating/updating Jira issue for updated document', {
                    documentId: id,
                    documentName: updatedDocument.name,
                    projectId
                  })

                  const { jiraLinkageService } = await import('../services/jiraLinkageService')
                  const jiraResult = await jiraLinkageService.linkDocumentToJira(
                    id,
                    updatedDocument.name,
                    projectId,
                    confluenceUrl || undefined,
                    `Document: ${updatedDocument.name}\n\nProject: ${projectId}\nDocument ID: ${id}`,
                    settings.jira_issue_type_override || undefined,
                    settings.jira_priority_override || undefined
                  )

                  if (jiraResult) {
                    log.info('✅ [AUTO-INTEGRATION] Jira issue auto-created/updated for document', {
                      documentId: id,
                      issueKey: jiraResult.issueKey,
                      issueUrl: jiraResult.issueUrl,
                      created: jiraResult.created
                    })
                  } else {
                    log.warn('⚠️ [AUTO-INTEGRATION] Jira linkage service returned null (may be disabled or misconfigured)')
                  }
                } catch (jiraError: any) {
                  // Don't fail document update if auto-create fails
                  log.error('❌ [AUTO-INTEGRATION] Failed to auto-create/update Jira issue', {
                    documentId: id,
                    error: jiraError.message,
                    stack: jiraError.stack
                  })
                }
              }
            } else {
              log.debug('ℹ️ [AUTO-INTEGRATION] No project integration settings found, skipping auto-integration')
            }
          } catch (integrationError: any) {
            // Don't fail document update if integration check fails
            log.error('❌ [AUTO-INTEGRATION] Error checking project integration settings', {
              documentId: id,
              projectId,
              error: integrationError.message,
              stack: integrationError.stack
            })
          }
        })().catch((err: any) => {
          // Catch any unhandled promise rejections
          log.error('❌ [AUTO-INTEGRATION] Unhandled error in auto-integration', {
            documentId: id,
            projectId,
            error: err?.message || 'Unknown error',
            stack: err?.stack
          })
        })
      })

      return res.json({
        message: "Document updated successfully",
        document: result.rows[0],
        driftRevalidation
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
      // Include company_id for admin access control
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.created_by, p.team_members, p.company_id
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

      // SECURITY: Verify user has access to this document
      // Super admin can delete any document
      // Admin can delete documents from their company
      // Regular users can delete documents from projects they own or are team members of
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      const userId = (req as any).user?.id

      let hasAccess = false

      if (isSuperAdmin) {
        // Super admin can delete any document
        hasAccess = true
      } else if (isAdmin) {
        // Admin can delete documents from their company
        const userCompanyId = (req as any).user?.company_id
        if (userCompanyId && doc.company_id) {
          hasAccess = doc.company_id === userCompanyId
        } else if (!userCompanyId) {
          // Admin with no company_id - fall back to ownership check
          const isOwner = doc.owner_id === userId || doc.created_by === userId
          const teamMembers = doc.team_members || []
          let isInTeam = false

          if (Array.isArray(teamMembers)) {
            isInTeam = teamMembers.includes(userId)
          } else if (typeof teamMembers === 'object' && teamMembers !== null) {
            isInTeam = Object.values(teamMembers).includes(userId)
          }

          hasAccess = isOwner || isInTeam
        }
      } else {
        // Regular users: Check if user is the project owner or a team member
        const isOwner = doc.owner_id === userId || doc.created_by === userId
        const teamMembers = doc.team_members || []
        let isInTeam = false

        if (Array.isArray(teamMembers)) {
          isInTeam = teamMembers.includes(userId)
        } else if (typeof teamMembers === 'object' && teamMembers !== null) {
          // Handle JSONB case
          isInTeam = Object.values(teamMembers).includes(userId)
        }

        hasAccess = isOwner || isInTeam
      }

      if (!hasAccess) {
        log.warn('Access denied to delete document', {
          documentId: id,
          userId: userId,
          ownerId: doc.owner_id,
          userRole: userRole,
          projectCompanyId: doc.company_id,
          userCompanyId: (req as any).user?.company_id
        })
        return res.status(403).json({ error: "Access denied - you do not have permission to delete this document" })
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
      // Super admin and admin can access all projects
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'

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

      // Check if user is owner or in team_members array (unless super admin or admin)
      if (!isSuperAdmin && !isAdmin) {
        const isOwner = project.owner_id === req.user?.id
        const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(req.user?.id)

        if (!isOwner && !isInTeam) {
          return res.status(403).json({ error: "Access denied" })
        }
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
      // Include company_id for admin access control
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.created_by, p.team_members, p.company_id
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

      // SECURITY: Verify user has access to restore this document
      // Super admin can restore any document
      // Admin can restore documents from their company
      // Regular users can restore documents from projects they own or are team members of
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      const userId = (req as any).user?.id

      let hasAccess = false

      if (isSuperAdmin) {
        // Super admin can restore any document
        hasAccess = true
      } else if (isAdmin) {
        // Admin can restore documents from their company
        const userCompanyId = (req as any).user?.company_id
        if (userCompanyId && doc.company_id) {
          hasAccess = doc.company_id === userCompanyId
        } else if (!userCompanyId) {
          // Admin with no company_id - fall back to ownership check
          const isOwner = doc.owner_id === userId || doc.created_by === userId
          const teamMembers = doc.team_members || []
          const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId)
          hasAccess = isOwner || isInTeam
        }
      } else {
        // Regular users: Check if user is the project owner or a team member
        const isOwner = doc.owner_id === userId || doc.created_by === userId
        const teamMembers = doc.team_members || []
        const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId)
        hasAccess = isOwner || isInTeam
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied - you do not have permission to restore this document" })
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
      // Include company_id for admin access control
      const docCheck = await pool.query(
        `
        SELECT d.*, p.owner_id, p.created_by, p.team_members, p.company_id
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

      // SECURITY: Verify user has access to permanently delete this document
      // Super admin can permanently delete any document
      // Admin can permanently delete documents from their company
      // Regular users can permanently delete documents from projects they own or are team members of
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      const userId = (req as any).user?.id

      let hasAccess = false

      if (isSuperAdmin) {
        // Super admin can permanently delete any document
        hasAccess = true
      } else if (isAdmin) {
        // Admin can permanently delete documents from their company
        const userCompanyId = (req as any).user?.company_id
        if (userCompanyId && doc.company_id) {
          hasAccess = doc.company_id === userCompanyId
        } else if (!userCompanyId) {
          // Admin with no company_id - fall back to ownership check
          const isOwner = doc.owner_id === userId || doc.created_by === userId
          const teamMembers = doc.team_members || []
          const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId)
          hasAccess = isOwner || isInTeam
        }
      } else {
        // Regular users: Check if user is the project owner or a team member
        const isOwner = doc.owner_id === userId || doc.created_by === userId
        const teamMembers = doc.team_members || []
        const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId)
        hasAccess = isOwner || isInTeam
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied - you do not have permission to permanently delete this document" })
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

// Bulk export endpoints
/**
 * POST /api/documents/bulk-export/pdf
 * Export multiple documents as PDF files in a ZIP archive
 */
router.post(
  "/bulk-export/pdf",
  authenticateToken,
  requirePermission("documents.read"),
    validate(
    Joi.object({
      document_ids: Joi.array().items(schemas.uuid).min(1).max(100).required(),
    })
  ),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { document_ids } = req.body

      log.info(`Bulk PDF export requested for ${document_ids.length} documents`)

      // Fetch all documents
      const placeholders = document_ids.map((_, i) => `$${i + 1}`).join(",")
      const result = await pool.query(
        `SELECT id, name, content FROM documents WHERE id IN (${placeholders})`,
        document_ids
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No documents found" })
      }

      // Create ZIP archive
      const archive = (archiver as any)("zip", { zlib: { level: 9 } })
      res.setHeader("Content-Type", "application/zip")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="documents-export-${Date.now()}.zip"`
      )

      archive.pipe(res)

      // Process each document
      for (const doc of result.rows) {
        try {
          // Extract markdown content
          let markdownContent = ""
          if (typeof doc.content === "string") {
            markdownContent = doc.content
          } else if (doc.content && typeof doc.content === "object") {
            markdownContent =
              doc.content.content || doc.content.text || JSON.stringify(doc.content)
          } else {
            markdownContent = String(doc.content || "")
          }

          if (!markdownContent || markdownContent.trim() === "") {
            log.warn(`Document ${doc.id} has no content, skipping`)
            continue
          }

          // Convert to PDF
          const pdfBuffer = await markdownToPdf(markdownContent, {
            format: "A4",
            margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
            printBackground: true,
          })

          // Add to ZIP
          const sanitizedName = doc.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
          archive.append(pdfBuffer, { name: `${sanitizedName}.pdf` })
        } catch (error: any) {
          log.error(`Failed to export document ${doc.id}:`, error)
          // Continue with other documents
        }
      }

      // Finalize ZIP
      await archive.finalize()

      log.info(`Bulk PDF export completed for ${result.rows.length} documents`)
    } catch (error: any) {
      log.error("Bulk PDF export error:", error)
      res.status(500).json({ error: "Failed to export documents" })
    }
  }
)

/**
 * Parse Markdown content into Word document elements with proper styling
 */
function parseMarkdownToWordElements(markdown: string): any[] {
  const elements: any[] = []
  const lines = markdown.split("\n")
  let i = 0
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  let listStack: { type: "bullet" | "number"; level: number }[] = []

  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Handle code blocks
    if (trimmedLine.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBlockContent.join("\n")
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeText,
                font: "Courier New",
                size: 20,
                color: "333333",
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: "F5F5F5",
            },
            spacing: { before: 120, after: 120 },
            indent: { left: 360 },
          })
        )
        codeBlockContent = []
        inCodeBlock = false
      } else {
        // Start code block
        inCodeBlock = true
      }
      i++
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      i++
      continue
    }

    // Handle tables
    if (trimmedLine.includes("|") && trimmedLine.split("|").length > 2) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      const cells = trimmedLine
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0)
      if (cells.length > 0) {
        // Skip separator row (|---|---|)
        if (!cells.every((cell) => /^:?-+:?$/.test(cell))) {
          tableRows.push(cells)
        }
      }
      i++
      continue
    } else if (inTable && tableRows.length > 0) {
      // End table - ensure we have valid rows
      if (tableRows.length > 0 && tableRows[0].length > 0) {
        const tableCells = tableRows.map((row, rowIndex) => {
          const isHeader = rowIndex === 0
          // Ensure all rows have the same number of cells
          const maxCells = Math.max(...tableRows.map((r) => r.length))
          const paddedRow = [...row]
          while (paddedRow.length < maxCells) {
            paddedRow.push("")
          }

          return new TableRow({
            children: paddedRow.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: cell ? parseInlineMarkdown(cell) : [new TextRun({ text: "" })],
                      alignment: AlignmentType.LEFT,
                    }),
                  ],
                  shading: isHeader
                    ? {
                      type: ShadingType.SOLID,
                      color: "E0E0E0",
                    }
                    : undefined,
                })
            ),
          })
        })

        elements.push(
          new Table({
            rows: tableCells,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          })
        )
      }
      tableRows = []
      inTable = false
    }

    // Handle horizontal rules
    if (/^[-*_]{3,}$/.test(trimmedLine)) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "─────────────────────────────────────────────────────────",
              color: "CCCCCC",
            }),
          ],
          spacing: { before: 240, after: 240 },
        })
      )
      i++
      continue
    }

    // Handle headings
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      let text = headingMatch[2]
      // Strip markdown formatting from heading text (headings use Word styles, not markdown formatting)
      text = stripMarkdownFormatting(text)
      const headingLevels = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
        HeadingLevel.HEADING_5,
        HeadingLevel.HEADING_6,
      ]
      elements.push(
        new Paragraph({
          text: text,
          heading: headingLevels[Math.min(level - 1, 5)],
          spacing: { before: level === 1 ? 240 : 180, after: 120 },
        })
      )
      i++
      continue
    }

    // Handle blockquotes
    if (trimmedLine.startsWith(">")) {
      const quoteText = trimmedLine.substring(1).trim()
      // Use indentation and visual indicator instead of border (border syntax may cause Word errors)
      const quoteRuns = parseInlineMarkdown(quoteText)
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "│ ", color: "3498DB", bold: true }),
            ...quoteRuns,
          ],
          indent: { left: 360 },
          spacing: { before: 120, after: 120 },
        })
      )
      i++
      continue
    }

    // Handle lists
    const bulletMatch = trimmedLine.match(/^(\s*)([-*+])\s+(.+)$/)
    const numberMatch = trimmedLine.match(/^(\s*)(\d+\.)\s+(.+)$/)

    if (bulletMatch || numberMatch) {
      const match = bulletMatch || numberMatch!
      const indent = match[1].length
      const level = Math.floor(indent / 2)
      const text = match[3]
      const isNumbered = !!numberMatch

      // Close deeper list levels
      while (listStack.length > 0 && listStack[listStack.length - 1].level >= level) {
        listStack.pop()
      }

      // For numbered lists, use manual numbering for now (1., 2., etc.)
      // Word numbering requires predefined numbering styles which we don't have
      if (isNumbered) {
        const numberMatch = match[2].match(/(\d+)\./)
        const number = numberMatch ? numberMatch[1] : "1"
        elements.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${number}. `, bold: true }),
              ...parseInlineMarkdown(text),
            ],
            indent: { left: level * 360 },
            spacing: { after: 60 },
          })
        )
      } else {
        elements.push(
          new Paragraph({
            children: parseInlineMarkdown(text),
            bullet: { level },
            spacing: { after: 60 },
          })
        )
      }

      if (listStack.length === 0 || listStack[listStack.length - 1].level < level) {
        listStack.push({ type: isNumbered ? "number" : "bullet", level })
      }

      i++
      continue
    }

    // Handle empty lines
    if (trimmedLine === "") {
      // Only add empty paragraph if previous element wasn't already spacing
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1]
        if (lastElement instanceof Paragraph && lastElement.children?.length === 0) {
          // Skip duplicate empty paragraphs
        } else {
          elements.push(new Paragraph({ text: "" }))
        }
      }
      i++
      continue
    }

    // Regular paragraph with inline formatting
    elements.push(
      new Paragraph({
        children: parseInlineMarkdown(trimmedLine),
        spacing: { after: 120 },
      })
    )
    i++
  }

  // Handle any remaining code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    const codeText = codeBlockContent.join("\n")
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: codeText,
            font: "Courier New",
            size: 20,
            color: "333333",
          }),
        ],
        shading: {
          type: ShadingType.SOLID,
          color: "F5F5F5",
        },
        spacing: { before: 120, after: 120 },
        indent: { left: 360 },
      })
    )
  }

  // Handle any remaining table
  if (inTable && tableRows.length > 0 && tableRows[0].length > 0) {
    const maxCells = Math.max(...tableRows.map((r) => r.length))
    const tableCells = tableRows.map((row, rowIndex) => {
      const isHeader = rowIndex === 0
      const paddedRow = [...row]
      while (paddedRow.length < maxCells) {
        paddedRow.push("")
      }

      return new TableRow({
        children: paddedRow.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: cell ? parseInlineMarkdown(cell) : [new TextRun({ text: "" })],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              shading: isHeader
                ? {
                  type: ShadingType.SOLID,
                  color: "E0E0E0",
                }
                : undefined,
            })
        ),
      })
    })

    elements.push(
      new Table({
        rows: tableCells,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
      })
    )
  }

  return elements
}

/**
 * Strip markdown formatting from text (remove **, *, _, `, etc.)
 * This is used for headings where Word styles are applied instead of markdown formatting
 */
function stripMarkdownFormatting(text: string): string {
  let cleaned = text

  // Remove bold: **text** (must come before single *)
  cleaned = cleaned.replace(/\*\*([^*]+?)\*\*/g, '$1')
  cleaned = cleaned.replace(/__([^_]+?)__/g, '$1')

  // Remove italic: *text* (single asterisk, not double)
  cleaned = cleaned.replace(/\*([^*\s][^*]*?)\*/g, '$1')
  cleaned = cleaned.replace(/_([^_\s][^_]*?)_/g, '$1')

  // Remove inline code: `code`
  cleaned = cleaned.replace(/`([^`]+?)`/g, '$1')

  // Remove links: [text](url) -> keep text
  cleaned = cleaned.replace(/\[([^\]]+?)\]\([^)]+?\)/g, '$1')

  // Remove any remaining markdown syntax (cleanup)
  cleaned = cleaned.replace(/\*\*/g, '') // Any remaining **
  cleaned = cleaned.replace(/__/g, '') // Any remaining __
  cleaned = cleaned.replace(/\*/g, '') // Any remaining single *
  cleaned = cleaned.replace(/_/g, '') // Any remaining single _

  return cleaned.trim()
}

/**
 * Parse inline Markdown formatting (bold, italic, code, links) into TextRun elements
 */
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = []
  let currentIndex = 0
  let buffer = ""

  const flushBuffer = (bold = false, italic = false, code = false, link?: { text: string; url: string }) => {
    if (buffer.length > 0) {
      if (code) {
        runs.push(
          new TextRun({
            text: buffer,
            font: "Courier New",
            size: 20,
            color: "D63384",
            shading: {
              type: ShadingType.SOLID,
              color: "F8F9FA",
            },
          })
        )
      } else if (link) {
        runs.push(
          new TextRun({
            text: link.text,
            color: "0066CC",
            underline: {
              type: "single",
            },
          })
        )
      } else {
        runs.push(
          new TextRun({
            text: buffer,
            bold,
            italics: italic,
          })
        )
      }
      buffer = ""
    }
  }

  while (currentIndex < text.length) {
    // Inline code: `code`
    if (text[currentIndex] === "`" && currentIndex + 1 < text.length) {
      const codeEnd = text.indexOf("`", currentIndex + 1)
      if (codeEnd !== -1) {
        flushBuffer()
        const codeText = text.substring(currentIndex + 1, codeEnd)
        runs.push(
          new TextRun({
            text: codeText,
            font: "Courier New",
            size: 20,
            color: "D63384",
            shading: {
              type: ShadingType.SOLID,
              color: "F8F9FA",
            },
          })
        )
        currentIndex = codeEnd + 1
        continue
      }
    }

    // Links: [text](url)
    const linkMatch = text.substring(currentIndex).match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      flushBuffer()
      runs.push(
        new TextRun({
          text: linkMatch[1],
          color: "0066CC",
          underline: {
            type: "single",
          },
        })
      )
      currentIndex += linkMatch[0].length
      continue
    }

    // Bold: **text** or __text__
    const boldMatch = text.substring(currentIndex).match(/^(\*\*|__)(.+?)\1/)
    if (boldMatch) {
      flushBuffer()
      buffer = boldMatch[2]
      flushBuffer(true, false)
      currentIndex += boldMatch[0].length
      continue
    }

    // Italic: *text* or _text_ (but not ** or __)
    // Check for single asterisk or underscore (not double) - must come after bold check
    if (!boldMatch) {
      const singleAsteriskMatch = text.substring(currentIndex).match(/^\*([^*\s][^*]*?)\*/)
      const singleUnderscoreMatch = text.substring(currentIndex).match(/^_([^_\s][^_]*?)_/)

      if (singleAsteriskMatch) {
        flushBuffer()
        buffer = singleAsteriskMatch[1]
        flushBuffer(false, true)
        currentIndex += singleAsteriskMatch[0].length
        continue
      }

      if (singleUnderscoreMatch) {
        flushBuffer()
        buffer = singleUnderscoreMatch[1]
        flushBuffer(false, true)
        currentIndex += singleUnderscoreMatch[0].length
        continue
      }
    }

    buffer += text[currentIndex]
    currentIndex++
  }

  flushBuffer()
  return runs.length > 0 ? runs : [new TextRun({ text })]
}

/**
 * POST /api/documents/bulk-export/docx
 * Export multiple documents as a single combined Word (DOCX) file
 */
router.post(
  "/bulk-export/docx",
  authenticateToken,
  requirePermission("documents.read"),
  validate(
    Joi.object({
      document_ids: Joi.array().items(schemas.uuid).min(1).max(100).required(),
    })
  ),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { document_ids } = req.body

      log.info(`Bulk DOCX export requested for ${document_ids.length} documents`)

      // Fetch all documents
      const placeholders = document_ids.map((_, i) => `$${i + 1}`).join(",")
      const result = await pool.query(
        `SELECT id, name, content FROM documents WHERE id IN (${placeholders}) ORDER BY created_at ASC`,
        document_ids
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No documents found" })
      }

      // Collect all paragraphs from all documents into a single array
      const allParagraphs: any[] = []
      let documentCount = 0

      // Process each document
      for (const doc of result.rows) {
        try {
          // Extract markdown content
          let markdownContent = ""
          if (typeof doc.content === "string") {
            markdownContent = doc.content
          } else if (doc.content && typeof doc.content === "object") {
            markdownContent =
              doc.content.content || doc.content.text || JSON.stringify(doc.content)
          } else {
            markdownContent = String(doc.content || "")
          }

          if (!markdownContent || markdownContent.trim() === "") {
            log.warn(`Document ${doc.id} has no content, skipping`)
            continue
          }

          // Add separator before this document (except the first one)
          if (documentCount > 0) {
            // Add extra spacing and a separator line
            allParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "─────────────────────────────────────────────────────────",
                    color: "CCCCCC",
                  }),
                ],
              })
            )
            allParagraphs.push(new Paragraph({ text: "" }))
          }

          // Add document title with page break (except for first document)
          allParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: doc.name || "Untitled Document",
                  bold: true,
                  size: 32,
                }),
              ],
              pageBreakBefore: documentCount > 0, // Page break for all documents except the first
            })
          )

          // Add spacing after title
          allParagraphs.push(new Paragraph({ text: "" }))

          // Parse markdown with proper Word styling
          const wordElements = parseMarkdownToWordElements(markdownContent)
          allParagraphs.push(...wordElements)

          documentCount++
        } catch (error: any) {
          log.error(`Failed to process document ${doc.id}:`, error)
          // Continue with other documents
        }
      }

      // Create single DOCX document with all content in one section
      const combinedDoc = new Document({
        sections: [
          {
            properties: {},
            children: allParagraphs,
          },
        ],
      })

      // Generate buffer
      log.info(`Generating combined DOCX with ${allParagraphs.length} paragraphs from ${documentCount} documents`)
      const docxBuffer = await Packer.toBuffer(combinedDoc)
      log.info(`DOCX buffer generated: ${docxBuffer.length} bytes`)

      // Set headers for DOCX download (not ZIP!)
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="combined-documents-${Date.now()}.docx"`
      )
      res.setHeader("Content-Length", docxBuffer.length.toString())

      // Send the combined DOCX file directly (not as ZIP)
      res.end(docxBuffer)

      log.info(`Bulk DOCX export completed: ${result.rows.length} documents combined into single file (${docxBuffer.length} bytes)`)
    } catch (error: any) {
      log.error("Bulk DOCX export error:", error)
      res.status(500).json({ error: "Failed to export documents" })
    }
  }
)

/**
 * POST /api/documents/bulk-export/markdown
 * Export multiple documents as Markdown files in a ZIP archive
 */
router.post(
  "/bulk-export/markdown",
  authenticateToken,
  requirePermission("documents.read"),
  validate(
    Joi.object({
      document_ids: Joi.array().items(schemas.uuid).min(1).max(100).required(),
    })
  ),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { document_ids } = req.body

      log.info(`Bulk Markdown export requested for ${document_ids.length} documents`)

      // Fetch all documents
      const placeholders = document_ids.map((_, i) => `$${i + 1}`).join(",")
      const result = await pool.query(
        `SELECT id, name, content, created_at, updated_at FROM documents WHERE id IN (${placeholders})`,
        document_ids
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No documents found" })
      }

      // Create ZIP archive
      const archive = (archiver as any)("zip", { zlib: { level: 9 } })
      res.setHeader("Content-Type", "application/zip")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="documents-export-${Date.now()}.zip"`
      )

      archive.pipe(res)

      // Process each document
      for (const doc of result.rows) {
        try {
          // Extract markdown content
          let markdownContent = ""
          if (typeof doc.content === "string") {
            markdownContent = doc.content
          } else if (doc.content && typeof doc.content === "object") {
            markdownContent =
              doc.content.content || doc.content.text || JSON.stringify(doc.content)
          } else {
            markdownContent = String(doc.content || "")
          }

          // Add metadata header
          const fullMarkdown = `# ${doc.name || "Untitled Document"}

**Created:** ${new Date(doc.created_at).toLocaleDateString()}  
**Updated:** ${new Date(doc.updated_at).toLocaleDateString()}

---

${markdownContent}
`

          // Add to ZIP
          const sanitizedName = doc.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
          archive.append(fullMarkdown, { name: `${sanitizedName}.md` })
        } catch (error: any) {
          log.error(`Failed to export document ${doc.id}:`, error)
          // Continue with other documents
        }
      }

      // Finalize ZIP
      await archive.finalize()

      log.info(`Bulk Markdown export completed for ${result.rows.length} documents`)
    } catch (error: any) {
      log.error("Bulk Markdown export error:", error)
      res.status(500).json({ error: "Failed to export documents" })
    }
  }
)

export default router
