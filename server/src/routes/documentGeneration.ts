import express from "express"
import Joi from "joi"
import { v4 as uuidv4 } from "uuid"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { documentGenerationService } from "../services/documentGenerationService"
import { DocumentRegenerationService } from "../services/documentRegenerationService"
import { pool } from "../database/connection"
import { queueService } from "../services/queueService"

const router = express.Router()

// Validation schema for document generation
const generateDocumentSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  templateId: Joi.string().uuid().optional(),
  userPrompt: Joi.string().min(1).required(),
  provider: Joi.string().required(),
  model: Joi.string().optional(),
  temperature: Joi.number().min(0).max(2).default(0.7),
  includeStakeholders: Joi.boolean().default(true),
  includeDocuments: Joi.boolean().default(true),
  customContext: Joi.string().max(5000).optional(),
})

// Generate document with AI
router.post("/generate",
  authenticateToken,
  requirePermission("documents.create"),
  validate(generateDocumentSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const {
        projectId,
        name,
        description,
        templateId,
        userPrompt,
        provider,
        model,
        temperature,
        includeStakeholders,
        includeDocuments,
        customContext,
      } = req.body

      log.info(`Generating document for project ${projectId}`)

      // Check user has access to project
      const projectCheck = await pool.query(
        `SELECT id, name FROM projects 
         WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)`,
        [projectId, req.user?.id]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied to project" })
      }

      // Generate document using service
      const result = await documentGenerationService.generateDocument({
        projectId,
        templateId,
        userPrompt,
        provider,
        model,
        temperature,
        userId: req.user?.id || '',
      })

      // Calculate word and character counts
      const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length
      const characterCount = result.content.length

      // Create document in database
      const documentId = uuidv4()
      const documentResult = await pool.query(
        `INSERT INTO documents 
         (id, project_id, name, content, template_id, created_by, metadata, status, 
          word_count, character_count, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          documentId,
          projectId,
          name,
          result.content,  // Markdown string
          templateId || null,
          req.user?.id,
          JSON.stringify(result.metadata),
          'draft',
          wordCount,
          characterCount,
          1,
        ]
      )

      log.info(`Document generated successfully: ${documentId}`)

      res.status(201).json({
        message: "Document generated successfully",
        document: documentResult.rows[0],
        generation: result.metadata,
      })
    } catch (error) {
      log.error("Document generation error:", error)
      res.status(500).json({ 
        error: "Document generation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

// Validation schema for document regeneration
const regenerateDocumentSchema = Joi.object({
  templateId: Joi.string().uuid().optional(),
  provider: Joi.string().required(),
  model: Joi.string().optional(),
  versionType: Joi.string().valid('patch', 'minor', 'major').default('patch'),
  temperature: Joi.number().min(0).max(2).default(0.7),
})

// Regenerate document with updated context
router.post("/regenerate/:documentId",
  authenticateToken,
  requirePermission("documents.create"),
  validate(regenerateDocumentSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const { documentId } = req.params
    
    try {
      const {
        templateId,
        provider,
        model,
        versionType,
        temperature,
      } = req.body

      log.info(`Regenerating document ${documentId}`)

      // Check document exists and user has access
      const documentCheck = await pool.query(
        `SELECT d.id, d.project_id, d.template_id, d.name, p.owner_id, p.team_members
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
        [documentId]
      )

      if (documentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const document = documentCheck.rows[0]
      const hasAccess = 
        document.owner_id === req.user?.id ||
        (document.team_members && document.team_members.includes(req.user?.id))

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to document" })
      }

      // Create regeneration job in database
      const jobId = uuidv4()
      await pool.query(
        `INSERT INTO regeneration_jobs 
         (id, document_id, template_id, provider, model, version_type, temperature, user_id, status, progress)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          jobId,
          documentId,
          templateId || document.template_id,
          provider,
          model || null,
          versionType,
          temperature,
          req.user?.id,
          'pending',
          0
        ]
      )

      log.info(`Created regeneration job ${jobId}`)

      // Enqueue job for background processing
      await queueService.addJob('document-regeneration', {
        documentId,
        templateId: templateId || document.template_id,
        provider,
        model,
        versionType,
        temperature,
        userId: req.user?.id,
        jobId
      })

      log.info(`Enqueued regeneration job ${jobId}`)

      res.status(202).json({
        message: "Document regeneration started",
        jobId,
        status: "pending"
      })
    } catch (error) {
      log.error("Document regeneration error:", error)
      res.status(500).json({ 
        error: "Failed to start document regeneration",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

// Get regeneration job status
router.get("/regenerate/job/:jobId",
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const { jobId } = req.params
    
    try {
      const jobResult = await pool.query(
        `SELECT id, document_id, status, progress, progress_message, created_at, 
                completed_at, error_message, new_version_id, context_summary
         FROM regeneration_jobs
         WHERE id = $1 AND user_id = $2`,
        [jobId, req.user?.id]
      )

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" })
      }

      res.json({
        job: jobResult.rows[0]
      })
    } catch (error) {
      log.error("Failed to fetch job status:", error)
      res.status(500).json({ 
        error: "Failed to fetch job status",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

export default router

