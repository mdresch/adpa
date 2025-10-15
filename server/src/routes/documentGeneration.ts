import express from "express"
import Joi from "joi"
import { v4 as uuidv4 } from "uuid"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { documentGenerationService } from "../services/documentGenerationService"
import { pool } from "../database/connection"

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

export default router

