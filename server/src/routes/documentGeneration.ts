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
import { semanticVersionService } from "../services/semanticVersionService"

const router = express.Router()

// Validation schema for template conflict check
const checkTemplateSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  templateId: Joi.string().uuid().required(),
})

// Check if template is already used in project (pre-flight check)
router.post("/check-template",
  authenticateToken,
  validate(checkTemplateSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { projectId, templateId } = req.body
      
      log.info(`Checking template conflict for project ${projectId}, template ${templateId}`)
      
      // Check if document from this template already exists
      const existingCheck = await pool.query(
        `SELECT 
          d.id,
          d.name,
          d.version,
          d.semantic_version,
          d.updated_at,
          b.id as baseline_id,
          b.version as baseline_version,
          b.approved_at as baseline_date
         FROM documents d
         LEFT JOIN project_baselines b ON b.project_id = d.project_id 
           AND b.status = 'approved'
           AND b.document_corpus @> jsonb_build_array(d.id::text)
         WHERE d.project_id = $1 
           AND d.template_id = $2 
           AND d.deleted_at IS NULL
           AND d.parent_document_id IS NULL
         ORDER BY d.updated_at DESC
         LIMIT 1`,
        [projectId, templateId]
      )

      if (existingCheck.rows.length > 0) {
        // Document from this template already exists - return conflict
        const existing = existingCheck.rows[0]
        log.info(`Template conflict detected: existing document ${existing.id}`)
        
        return res.status(409).json({
          code: 'TEMPLATE_ALREADY_USED',
          message: 'A document from this template already exists in this project',
          existing: {
            id: existing.id,
            name: existing.name,
            version: existing.version,
            semantic_version: existing.semantic_version,
            updated_at: existing.updated_at,
            baseline_id: existing.baseline_id,
            baseline_version: existing.baseline_version,
            baseline_date: existing.baseline_date
          },
          options: {
            createNewVersion: true,
            createSeparate: true,
            viewExisting: true
          }
        })
      }
      
      // No conflict
      log.info(`No template conflict - safe to proceed`)
      return res.status(200).json({
        conflict: false,
        message: 'Template is available for use'
      })
      
    } catch (error) {
      log.error("Template check error:", error)
      res.status(500).json({ 
        error: "Failed to check template",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

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

      // Check user has access to project (including onboarding/guest-created projects)
      const projectCheck = await pool.query(
        `SELECT id, name FROM projects 
         WHERE id = $1 AND (owner_id = $2 OR created_by = $2 OR team_members ? $2::text)`,
        [projectId, req.user?.id]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied to project" })
      }

      // Check if document from this template already exists
      if (templateId) {
        const existingCheck = await pool.query(
          `SELECT 
            d.id,
            d.name,
            d.version,
            d.semantic_version,
            d.updated_at,
            b.id as baseline_id,
            b.version as baseline_version,
            b.approved_at as baseline_date
           FROM documents d
           LEFT JOIN project_baselines b ON b.project_id = d.project_id 
             AND b.status = 'approved'
             AND b.document_corpus @> jsonb_build_array(d.id::text)
           WHERE d.project_id = $1 
             AND d.template_id = $2 
             AND d.deleted_at IS NULL
             AND d.parent_document_id IS NULL
           ORDER BY d.updated_at DESC
           LIMIT 1`,
          [projectId, templateId]
        )

        if (existingCheck.rows.length > 0) {
          // Document from this template already exists - return conflict
          const existing = existingCheck.rows[0]
          log.info(`Template conflict detected: existing document ${existing.id}`)
          
          return res.status(409).json({
            code: 'TEMPLATE_ALREADY_USED',
            message: 'A document from this template already exists in this project',
            existing: {
              id: existing.id,
              name: existing.name,
              version: existing.version,
              semantic_version: existing.semantic_version,
              updated_at: existing.updated_at,
              baseline_id: existing.baseline_id,
              baseline_version: existing.baseline_version,
              baseline_date: existing.baseline_date
            },
            options: {
              createNewVersion: true,    // Update existing (recommended)
              createSeparate: true,       // Create new document
              viewExisting: true          // Open existing
            }
          })
        }
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

      // Get template version if template is specified
      let templateVersion = '1'
      if (templateId) {
        const templateResult = await pool.query(
          `SELECT prompt_version FROM templates WHERE id = $1`,
          [templateId]
        )
        if (templateResult.rows.length > 0) {
          templateVersion = templateResult.rows[0].prompt_version?.toString() || '1'
        }
      }

      // Create document in database
      const documentId = uuidv4()
      const documentResult = await pool.query(
        `INSERT INTO documents 
         (id, project_id, name, content, template_id, template_version, 
          created_by, metadata, status, word_count, character_count, 
          version, semantic_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          documentId,
          projectId,
          name,
          result.content,  // Markdown string
          templateId || null,
          templateVersion,
          req.user?.id,
          JSON.stringify(result.metadata),
          'draft',
          wordCount,
          characterCount,
          1,
          '1.0.0', // Initial semantic version
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

// Validation schema for generating as new version (conflict resolution)
const generateAsNewVersionSchema = Joi.object({
  existingDocumentId: Joi.string().uuid().required(),
  projectId: Joi.string().uuid().required(),
  templateId: Joi.string().uuid().required(),
  userPrompt: Joi.string().min(1).required(),
  provider: Joi.string().required(),
  model: Joi.string().optional(),
  temperature: Joi.number().min(0).max(2).default(0.7),
})

// Generate document as new version of existing document
router.post("/generate-new-version",
  authenticateToken,
  requirePermission("documents.create"),
  validate(generateAsNewVersionSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const {
        existingDocumentId,
        projectId,
        templateId,
        userPrompt,
        provider,
        model,
        temperature,
      } = req.body

      log.info(`Generating new version for document ${existingDocumentId}`)

      // Get existing document WITH template info
      const documentCheck = await pool.query(
        `SELECT d.id, d.name, d.semantic_version, d.version, d.project_id,
                d.template_id, d.template_version,
                p.owner_id, p.team_members
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1 AND d.project_id = $2`,
        [existingDocumentId, projectId]
      )

      if (documentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      const document = documentCheck.rows[0]
      const hasAccess = 
        document.owner_id === req.user?.id ||
        (document.team_members && document.team_members.includes(req.user?.id))

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" })
      }

      // Generate new content
      const result = await documentGenerationService.generateDocument({
        projectId,
        templateId,
        userPrompt,
        provider,
        model,
        temperature,
        userId: req.user?.id || '',
      })

      // Calculate metrics
      const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length
      const characterCount = result.content.length

      // Check if template has changed (for MAJOR version increment)
      let templateChanged = false
      let changeType = 'ai_regeneration'
      
      if (templateId && document.template_id) {
        // Different template = MAJOR version
        if (templateId !== document.template_id) {
          templateChanged = true
          changeType = 'template_change'
          log.info(`Template changed: ${document.template_id} → ${templateId}`)
        } else {
          // Same template, check version
          const templateInfo = await pool.query(
            'SELECT prompt_version FROM templates WHERE id = $1',
            [templateId]
          )
          if (templateInfo.rows.length > 0) {
            const newTemplateVersion = templateInfo.rows[0].prompt_version?.toString() || '1'
            const oldTemplateVersion = document.template_version?.toString() || '1'
            if (newTemplateVersion !== oldTemplateVersion) {
              templateChanged = true
              changeType = 'template_version_update'
              log.info(`Template version changed: ${oldTemplateVersion} → ${newTemplateVersion}`)
            }
          }
        }
      }

      // Increment version based on change type
      const currentVersion = document.semantic_version || '1.0.0'
      let newVersion: string
      
      if (templateChanged) {
        // MAJOR version: Template or template version changed
        newVersion = semanticVersionService.getNextTemplateVersion(currentVersion)
        log.info(`🎯 MAJOR version increment (template change): ${currentVersion} → ${newVersion}`)
      } else {
        // MINOR version: Regular AI regeneration
        newVersion = semanticVersionService.getNextAIVersion(currentVersion)
        log.info(`🔄 MINOR version increment (AI regeneration): ${currentVersion} → ${newVersion}`)
      }
      
      const newVersionNumber = document.version + 1

      // Save current version to history (if not already saved)
      await pool.query(
        `INSERT INTO document_versions 
         (id, document_id, version, semantic_version, content, author_id, created_at, change_type, generation_metadata)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
         ON CONFLICT (document_id, version) DO NOTHING`,
        [
          uuidv4(),
          existingDocumentId,
          document.version.toString(),
          currentVersion,
          typeof document.content === 'string' ? document.content : JSON.stringify(document.content),
          req.user?.id,
          changeType, // Use detected change type
          JSON.stringify({ provider, model, temperature, templateChanged })
        ]
      )
      
      log.info(`Version ${currentVersion} saved to history (or already exists)`)

      log.info(`Updating document ${existingDocumentId} from ${currentVersion} to ${newVersion}`)

      // Update document with new version
      const updateResult = await pool.query(
        `UPDATE documents
         SET 
           content = $1,
           version = $2,
           semantic_version = $3,
           updated_by = $4,
           updated_at = NOW(),
           word_count = $5,
           character_count = $6,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{regeneration}',
             jsonb_build_object(
               'regenerated_at', NOW(),
               'previous_version', $7::text,
               'reason', 'template_regeneration',
               'ai_provider', $8::text
             )
           )
         WHERE id = $9
         RETURNING *`,
        [
          result.content,
          newVersionNumber,
          newVersion,
          req.user?.id,
          wordCount,
          characterCount,
          currentVersion,
          provider,
          existingDocumentId
        ]
      )
      
      if (updateResult.rows.length === 0) {
        throw new Error(`Failed to update document ${existingDocumentId} - document not found or no changes made`)
      }
      
      log.info(`Document updated successfully to version ${newVersion}. Rows affected: ${updateResult.rowCount}`)

      // 🔥 Trigger quality audit after AI regeneration (MINOR version increment)
      try {
        const { qualityAuditService } = await import('../services/qualityAuditService')
        
        log.info('[AI-REGENERATION] Triggering quality audit after version increment', {
          documentId: existingDocumentId,
          documentName: updateResult.rows[0].name,
          previousVersion: currentVersion,
          newVersion: newVersion,
          provider,
          model
        })
        
        // Get project context for audit
        const projectQuery = await pool.query(
          'SELECT id, name, framework, description FROM projects WHERE id = $1',
          [projectId]
        )
        const projectContext = projectQuery.rows[0] || { id: projectId, name: 'Project' }
        
        // Enqueue quality audit job (async, non-blocking)
        const auditJobId = require('uuid').v4()
        queueService.addJob('quality-audit', {
          jobId: auditJobId,
          documentId: existingDocumentId,
          documentContent: result.content,
          documentType: templateId,
          projectContext,
          userId: req.user?.id || null
        }).catch((auditError: any) => {
          log.error('[AI-REGENERATION] Failed to enqueue quality audit (non-blocking)', {
            documentId: existingDocumentId,
            error: auditError.message
          })
        })
        
        log.info('[AI-REGENERATION] Quality audit job enqueued', { auditJobId })
      } catch (error: any) {
        // Don't fail document generation if audit fails
        log.warn('[AI-REGENERATION] Failed to trigger quality audit', {
          documentId: existingDocumentId,
          error: error.message
        })
      }

      // Check if document is baselined and trigger drift detection
      const baselineCheck = await pool.query(
        `SELECT id, version FROM project_baselines
         WHERE project_id = $1 
           AND status = 'approved'
           AND document_corpus @> jsonb_build_array($2::text)
         ORDER BY approved_at DESC
         LIMIT 1`,
        [projectId, existingDocumentId]
      )

      let driftDetected = false
      if (baselineCheck.rows.length > 0) {
        driftDetected = true
        log.info(`Document is baselined - drift detection will be triggered`)
        // Drift detection would be triggered here by the baseline system
      }

      // Log activity
      await pool.query(
        `INSERT INTO audit_logs 
         (id, user_id, action, resource_type, resource_id, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          req.user?.id,
          'document_version_created',
          'document',
          existingDocumentId,
          JSON.stringify({
            previous_version: currentVersion,
            new_version: newVersion,
            generated_by: 'ai',
            template_id: templateId,
            template_changed: templateChanged,
            change_type: changeType,
            drift_detected: driftDetected
          })
        ]
      )

      log.info(`Document updated to version ${newVersion}`)

      res.status(200).json({
        message: "Document updated to new version",
        document: updateResult.rows[0],
        previousVersion: currentVersion,
        newVersion,
        driftDetected,
        generation: result.metadata,
      })
    } catch (error) {
      log.error("Generate new version error:", error)
      res.status(500).json({ 
        error: "Failed to generate new version",
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
  versionType: Joi.string().valid('patch', 'minor', 'major').default('minor'), // AI regenerations default to minor
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

