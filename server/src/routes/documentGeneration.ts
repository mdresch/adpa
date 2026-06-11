import express from "express"
import Joi from "joi"
import { v4 as uuidv4 } from "uuid"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { documentGenerationService } from "../services/documentGenerationService"
import { DocumentRegenerationService } from "../services/documentRegenerationService"
import { pool } from "../database/connection"
import { getQueueService } from "../services/queueService"
import { semanticVersionService } from "../services/semanticVersionService"
import { storageArchivalService } from "../services/storageArchivalService"
import { findExistingTemplateDocument, getAIProviderQuotaDetails } from "../utils/documentGenerationRouteGuards"

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
  description: Joi.string().max(1000).allow('').optional(),
  templateId: Joi.string().uuid().optional(),
  userPrompt: Joi.string().min(1).required(),
  provider: Joi.string().required(),
  model: Joi.string().optional(),
  temperature: Joi.number().min(0).max(2).default(0.7),
  includeStakeholders: Joi.boolean().default(true),
  includeDocuments: Joi.boolean().default(true),
  customContext: Joi.string().max(5000).optional(),
  async: Joi.boolean().default(false), // Force async/background mode
  allowMultiple: Joi.boolean().default(false), // Bypass conflict checks
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
        allowMultiple,
      } = req.body

      log.info(`Generating document for project ${projectId}`)

      // Check user has access to project (including onboarding/guest-created projects)
      const projectCheck = await pool.query(
        `SELECT id, name FROM projects 
         WHERE id = $1 AND (owner_id = $2 OR created_by = $2 OR team_members ? $2::text)`,
        [projectId, req.user?.id]
      )

      if (projectCheck.rows.length === 0) {
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin'
        if (!isAdmin) {
          return res.status(403).json({ error: "Access denied to project" })
        }
      }

      // 🔍 Check for template conflicts without creating a placeholder document.
      if (templateId && !allowMultiple) {
        const existing = await findExistingTemplateDocument(pool, projectId, templateId)

        if (existing) {
          return res.status(409).json({
            code: 'TEMPLATE_ALREADY_USED',
            message: 'A document from this template already exists in this project',
            conflict: true,
            existing: {
              id: existing.id,
              name: existing.name,
              version: existing.version,
              semantic_version: existing.semantic_version,
              updated_at: existing.updated_at
            },
            options: {
              createNewVersion: true,
              createSeparate: true,
              viewExisting: true
            }
          })
        }
      }

      // 🚀 ASYNC PATH: Route ALL template-based generation to the background job queue.
      // Even a 1-section template can take several minutes with the agentic planning pipeline,
      // which would exceed the Next.js proxy timeout and cause ECONNRESET.
      // Prompt-only generation (no templateId) stays synchronous since it's usually fast.
      const forceAsync = req.body.async === true
      const shouldRunAsync = forceAsync || !!templateId

      if (shouldRunAsync) {
        const jobId = uuidv4()
        const jobPayload = {
          jobId,
          userId: req.user?.id || null,
          projectId,
          prompt: userPrompt,
          provider,
          model: model || null,
          temperature,
          template_id: templateId || null,
          name: name?.trim() || undefined,
          description: description?.trim() || undefined,
          use_context: true,
          template_name: undefined as string | undefined,
        }

        // Resolve template name for the job record (non-fatal if it fails)
        if (templateId) {
          try {
            const tmpl = await pool.query('SELECT name FROM templates WHERE id = $1', [templateId])
            if (tmpl.rows.length > 0) jobPayload.template_name = tmpl.rows[0].name
          } catch (_) { /* non-fatal */ }
        }

        try {
          await getQueueService().addJob('ai-generate', jobPayload)
        } catch (queueErr) {
          log.error('[DOC-GEN] Failed to enqueue ai-generate job', queueErr)
          return res.status(503).json({
            error: 'Job queue is unavailable. Please try again shortly or contact support.',
            details: queueErr instanceof Error ? queueErr.message : String(queueErr),
          })
        }

        log.info(`[DOC-GEN] Enqueued async job ${jobId} for project ${projectId}`)
        return res.status(202).json({
          jobId,
          async: true,
          message: 'Document generation queued. Track progress via the Job Monitor.',
        })
      }

      const documentId = uuidv4()

      // Generate document using service
      const result = await documentGenerationService.generateDocument({
        projectId,
        templateId,
        userPrompt,
        provider,
        model,
        temperature,
        userId: req.user?.id || '',
        documentId,
        name: req.body.name || undefined,
      })

      // Calculate word and character counts
      const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length
      const characterCount = result.content.length
      const sentenceCount = (result.content.match(/[.!?]+/g) || []).length
      const paragraphCount = (result.content.match(/\n\n+/g) || []).length + 1

      // Get template version and framework if template is specified
      let templateVersion = '1'
      let framework: string | undefined
      if (templateId) {
        const templateResult = await pool.query(
          `SELECT prompt_version, framework FROM templates WHERE id = $1`,
          [templateId]
        )
        if (templateResult.rows.length > 0) {
          templateVersion = templateResult.rows[0].prompt_version?.toString() || '1'
          framework = templateResult.rows[0].framework
        }
      }

      // Get project framework if not from template
      if (!framework) {
        const projectResult = await pool.query(
          `SELECT framework FROM projects WHERE id = $1`,
          [projectId]
        )
        if (projectResult.rows.length > 0) {
          framework = projectResult.rows[0].framework
        }
      }

      // Always initialize source documents array (project context is always included)
      let sourceDocuments: any[] = []
      let contextStats: any = null

      // 🆕 Always add project context as a source document (project context is always used)
      // Project context is ALWAYS used in document generation, so it should ALWAYS be in source documents
      try {
        const projectResult = await pool.query(
          `SELECT name, description, framework FROM projects WHERE id = $1`,
          [projectId]
        )

        if (projectResult.rows.length > 0) {
          const project = projectResult.rows[0]
          // Project context is ALWAYS used - even if project has no name/description/framework,
          // the project itself is context (project ID, project existence, etc.)
          const projectContextEntry = {
            id: `project_context:${projectId}`, // Unique identifier for project context
            title: `Project Context: ${project.name || 'Project'}`,
            name: `Project Context: ${project.name || 'Project'}`,
            type: 'Project Context',
            template_id: null,
            status: 'active',
            lifecycle_phase: 0, // Project context is foundational (phase 0)
            phase_name: 'Foundation',
            priority_rank: 0, // Highest priority - always first
            character_count: (project.description?.length || 0) + (project.name?.length || 0) + (project.framework?.length || 0),
            word_count: Math.round(((project.description?.length || 0) + (project.name?.length || 0) + (project.framework?.length || 0)) / 5),
            reading_time_minutes: 0,
            is_project_context: true // Flag to identify this as project context
          }
          // Insert at the beginning (highest priority)
          sourceDocuments.push(projectContextEntry)
          log.info('[DOC-GEN] Project context added to source documents', {
            projectId,
            projectName: project.name || 'Unknown',
            sourceDocumentsCount: sourceDocuments.length,
            hasProjectContext: true
          })
        } else {
          // Project not found, but still add a placeholder entry
          log.warn('[DOC-GEN] Project not found, but adding project context placeholder', { projectId })
          const projectContextEntry = {
            id: `project_context:${projectId}`,
            title: `Project Context: Project ${projectId.substring(0, 8)}...`,
            name: `Project Context: Project ${projectId.substring(0, 8)}...`,
            type: 'Project Context',
            template_id: null,
            status: 'active',
            lifecycle_phase: 0,
            phase_name: 'Foundation',
            priority_rank: 0,
            character_count: 0,
            word_count: 0,
            reading_time_minutes: 0,
            is_project_context: true
          }
          sourceDocuments.push(projectContextEntry)
        }
      } catch (error) {
        log.error('[DOC-GEN] Failed to fetch project context for source documents, adding placeholder', {
          projectId,
          error: error instanceof Error ? error.message : String(error)
        })
        // Even on error, add a placeholder so we know project context was intended to be used
        const projectContextEntry = {
          id: `project_context:${projectId}`,
          title: `Project Context: Project ${projectId.substring(0, 8)}...`,
          name: `Project Context: Project ${projectId.substring(0, 8)}...`,
          type: 'Project Context',
          template_id: null,
          status: 'active',
          lifecycle_phase: 0,
          phase_name: 'Foundation',
          priority_rank: 0,
          character_count: 0,
          word_count: 0,
          reading_time_minutes: 0,
          is_project_context: true
        }
        sourceDocuments.push(projectContextEntry)
      }

      // Fetch other source documents if includeDocuments is true
      if (includeDocuments) {
        try {
          // Get relevant documents from the project (exclude AI regenerations)
          // Note: We can't exclude the current document yet since it doesn't exist, but that's fine
          // as source documents should be existing documents used as context
          const documentsResult = await pool.query(
            `SELECT d.id, d.name, d.content, d.template_id, d.status, d.word_count, d.character_count,
                    t.name as template_name
             FROM documents d
             LEFT JOIN templates t ON d.template_id = t.id
             WHERE d.project_id = $1 
               AND d.parent_document_id IS NULL
             ORDER BY d.updated_at DESC
             LIMIT 10`,
            [projectId]
          )

          const relevantDocs = documentsResult.rows || []

          // Build source documents metadata (append to existing project context)
          const otherDocuments = relevantDocs.map((doc: any, index: number) => {
            // Determine lifecycle phase for this document
            const docNameLower = (doc.name || '').toLowerCase()
            const templateNameLower = (doc.template_name || '').toLowerCase()
            const lifecycleOrder: { [key: string]: number } = {
              'ideation': 1, 'business case': 2, 'charter': 3, 'stakeholder': 4,
              'scope': 5, 'requirement': 6, 'schedule': 7, 'cost': 8, 'budget': 8,
              'resource': 9, 'quality': 10, 'risk': 11, 'communication': 12,
              'procurement': 13, 'integration': 14, 'closeout': 15, 'lessons': 16
            }

            let phase = 99
            let phaseName = 'Other'
            for (const [key, phaseNum] of Object.entries(lifecycleOrder)) {
              if (docNameLower.includes(key) || templateNameLower.includes(key)) {
                if (phaseNum < phase) {
                  phase = phaseNum
                  phaseName = key.charAt(0).toUpperCase() + key.slice(1)
                }
              }
            }

            // Calculate reading metrics for this document
            const charCount = doc.character_count || (typeof doc.content === 'string' ? doc.content.length : 0)
            const wordCount = doc.word_count || Math.round(charCount / 5) // Estimate if not available
            const readingTimeMinutes = Math.round((wordCount / 250) * 10) / 10 // 250 words/min

            return {
              id: doc.id,
              title: doc.name,
              name: doc.name,
              type: doc.template_name || 'Document',
              template_id: doc.template_id,
              status: doc.status,
              lifecycle_phase: phase,
              phase_name: phaseName,
              priority_rank: index + 1,
              character_count: charCount,
              word_count: wordCount,
              reading_time_minutes: readingTimeMinutes
            }
          })

          // Append other documents to the existing sourceDocuments array (which already has project context)
          sourceDocuments.push(...otherDocuments)

          // Get total document count for context stats
          const totalDocsResult = await pool.query(
            `SELECT COUNT(*) as count FROM documents 
             WHERE project_id = $1 AND parent_document_id IS NULL`,
            [projectId]
          )
          const totalDocuments = parseInt(totalDocsResult.rows[0]?.count || '0', 10)

          // Get stakeholder count if includeStakeholders is true
          let stakeholderCount = 0
          if (includeStakeholders) {
            const stakeholdersResult = await pool.query(
              `SELECT COUNT(*) as count FROM stakeholders WHERE project_id = $1`,
              [projectId]
            )
            stakeholderCount = parseInt(stakeholdersResult.rows[0]?.count || '0', 10)
          }

          // Estimate context tokens from prompt length (rough estimate)
          const estimatedContextTokens = Math.round((userPrompt.length + (result.content?.length || 0)) / 4)

          contextStats = {
            total_documents: totalDocuments,
            documents_used: relevantDocs.length,
            documents_available: totalDocuments,
            project_context_used: true, // Project context is always used
            stakeholders_included: stakeholderCount,
            stakeholders_available: stakeholderCount,
            estimated_context_tokens: estimatedContextTokens
          }

          log.info('[DOC-GEN] Source documents fetched', {
            projectId,
            sourceDocumentsCount: sourceDocuments.length,
            totalDocuments,
            stakeholderCount
          })
        } catch (error) {
          log.warn('[DOC-GEN] Failed to fetch source documents', {
            projectId,
            error: error instanceof Error ? error.message : String(error)
          })
          // Continue without source documents - non-blocking
        }
      } else {
        // Even if includeDocuments is false, we still have project context, so set contextStats
        contextStats = {
          total_documents: 0,
          documents_used: 0,
          documents_available: 0,
          project_context_used: true, // Project context is always used
          stakeholders_included: 0,
          stakeholders_available: 0,
          estimated_context_tokens: Math.round((userPrompt.length + (result.content?.length || 0)) / 4)
        }

        log.info('[DOC-GEN] Project context added (no other documents)', {
          projectId,
          sourceDocumentsCount: sourceDocuments.length,
          hasProjectContext: sourceDocuments.length > 0
        })
      }

      // Calculate quality and compliance metrics
      const { analyzeDocumentQuality, calculateDocumentMetadata } = await import('../utils/documentMetadata')
      const tempMetadata = {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        templateId: templateId || undefined,
        framework
      } as any
      const qualityMetrics = analyzeDocumentQuality(result.content, tempMetadata, sourceDocuments.length)

      // Build generation metadata with compliance metrics and source documents
      const generationMetadata = {
        aiProcessing: {
          provider: result.metadata.provider,
          model: result.metadata.model,
          tokens: {
            prompt: 0,
            completion: 0,
            total: result.metadata.tokens_used || 0
          }
        },
        contentMetrics: {
          wordCount,
          characterCount,
          sentenceCount,
          paragraphCount
        },
        qualityMetrics: {
          overallQuality: qualityMetrics.overallQuality,
          completeness: qualityMetrics.completeness,
          structureScore: qualityMetrics.structureScore,
          formattingScore: qualityMetrics.formattingScore,
          contentDepth: qualityMetrics.contentDepth,
          accuracy: qualityMetrics.accuracy,
          consistency: qualityMetrics.consistency,
          contextRelevance: qualityMetrics.contextRelevance,
          professionalQuality: qualityMetrics.professionalQuality,
          standardsCompliance: qualityMetrics.standardsCompliance,
          complexityScore: qualityMetrics.complexityScore,
          recommendations: qualityMetrics.recommendations
        },
        complianceMetrics: {
          pmbokGuide: qualityMetrics.complianceMetrics.pmbokGuide,
          gdpr: qualityMetrics.complianceMetrics.gdpr,
          hipaa: qualityMetrics.complianceMetrics.hipaa,
          soc2: qualityMetrics.complianceMetrics.soc2,
          industryStandards: qualityMetrics.complianceMetrics.industryStandards,
          bestPractices: qualityMetrics.complianceMetrics.bestPractices,
          templateAdherence: qualityMetrics.complianceMetrics.templateAdherence,
          overallComplianceRating: qualityMetrics.complianceMetrics.overallComplianceRating
        },
        // Always include source_documents (should always have at least project context)
        // Use sourceDocuments directly - it should always have project context by this point
        source_documents: sourceDocuments,
        ...(contextStats && { context_stats: contextStats }),
        // Injected GKG context (when template has gkg_context_strategy and Generate Document used it)
        ...(result.gkg_context_snapshot && { gkg_context_snapshot: result.gkg_context_snapshot })
      }

      // 🔍 CRITICAL: Verify project context was added before saving
      if (sourceDocuments.length === 0) {
        log.error('[DOC-GEN] ⚠️ CRITICAL: sourceDocuments is empty! Adding project context as fallback', { projectId })
        // Emergency fallback: add project context if somehow missing
        const emergencyProjectContext = {
          id: `project_context:${projectId}`,
          title: `Project Context: Project ${projectId.substring(0, 8)}...`,
          name: `Project Context: Project ${projectId.substring(0, 8)}...`,
          type: 'Project Context',
          template_id: null,
          status: 'active',
          lifecycle_phase: 0,
          phase_name: 'Foundation',
          priority_rank: 0,
          character_count: 0,
          word_count: 0,
          reading_time_minutes: 0,
          is_project_context: true
        }
        sourceDocuments.push(emergencyProjectContext)
      }

      // 🔍 DEBUG: Log what we're saving
      log.info('[DOC-GEN] Generation metadata being saved:', {
        hasSourceDocuments: sourceDocuments.length > 0,
        sourceDocumentsCount: sourceDocuments.length,
        sourceDocumentsIds: sourceDocuments.map((doc: any) => doc.id),
        hasProjectContext: sourceDocuments.some((doc: any) => doc.is_project_context),
        hasContextStats: !!contextStats,
        contextStatsProjectContextUsed: contextStats?.project_context_used,
        firstSourceDocId: sourceDocuments[0]?.id,
        firstSourceDocType: sourceDocuments[0]?.type
      })

      // Create or update document in database
      const documentResult = await pool.query(
        `INSERT INTO documents 
         (id, project_id, name, content, template_id, template_version, 
          created_by, metadata, generation_metadata, status, word_count, character_count, 
          version, semantic_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           content = EXCLUDED.content,
           template_version = EXCLUDED.template_version,
           metadata = EXCLUDED.metadata,
           generation_metadata = EXCLUDED.generation_metadata,
           status = EXCLUDED.status,
           word_count = EXCLUDED.word_count,
           character_count = EXCLUDED.character_count,
           version = EXCLUDED.version,
           semantic_version = EXCLUDED.semantic_version
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
          JSON.stringify(generationMetadata),
          'draft',
          wordCount,
          characterCount,
          1,
          '1.0.0', // Initial semantic version
        ]
      )

      log.info(`Document generated successfully: ${documentId}`, {
        hasSourceDocuments: sourceDocuments.length > 0,
        sourceDocumentsCount: sourceDocuments.length,
        hasProjectContext: sourceDocuments.some((doc: any) => doc.is_project_context),
        generationMetadataKeys: Object.keys(generationMetadata)
      })

      // 🔍 Increment template usage
      if (templateId) {
        try {
          await pool.query(
            `UPDATE templates SET usage_count = usage_count + 1, last_used_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [templateId]
          )
          log.info(`Template usage incremented for ${templateId}`)
        } catch (usageErr) {
          log.warn(`Failed to increment template usage for ${templateId}`, usageErr)
        }
      }

      // 🔍 Automatic Quality Audit: Trigger quality audit after document generation
      // This runs asynchronously and doesn't block the response
      setImmediate(() => {
        (async () => {
          try {
            // Get project context for quality audit
            const projectResult = await pool.query(
              'SELECT * FROM projects WHERE id = $1',
              [projectId]
            )

            if (projectResult.rows.length > 0 && result.content && result.content.trim().length > 0) {
              log.info('🔍 [AUTO-QUALITY-AUDIT] Triggering automatic quality audit after document generation', {
                documentId,
                documentName: name,
                projectId,
                contentLength: result.content.length
              })

              // Use queue service for async processing
              const { getQueueService } = await import('../services/queueService')
              const auditJobId = uuidv4()

              await getQueueService().addJob('quality-audit', {
                jobId: auditJobId,
                documentId,
                documentContent: result.content,
                documentType: name || 'Document',
                projectContext: projectResult.rows[0],
                userId: req.user?.id || 'system'
              })

              log.info('🔍 [AUTO-QUALITY-AUDIT] Quality audit job enqueued successfully', {
                documentId,
                auditJobId
              })
            } else {
              log.warn('🔍 [AUTO-QUALITY-AUDIT] Skipping quality audit - no project or content', {
                documentId,
                hasProject: projectResult.rows.length > 0,
                hasContent: !!(result.content && result.content.trim().length > 0)
              })
            }
          } catch (auditError: any) {
            // Don't fail document generation if quality audit trigger fails
            log.error('🔍 [AUTO-QUALITY-AUDIT] Failed to trigger automatic quality audit', {
              documentId,
              error: auditError.message,
              stack: auditError.stack
            })
          }
        })()
      })

      // 🎯 DRACO Review: Trigger AI Review Board analysis after quality audit
      // Advisory mode by default — never blocks document creation
      // Only runs if draco_enabled = true on the template
      if (templateId) {
        setImmediate(() => {
          (async () => {
            try {
              // Check if DRACO is enabled for this template
              const templateDracoCheck = await pool.query(
                'SELECT draco_enabled FROM templates WHERE id = $1 LIMIT 1',
                [templateId]
              )
              const dracoEnabled = templateDracoCheck.rows[0]?.draco_enabled === true

              if (!dracoEnabled) {
                log.info('🎯 [DRACO] Skipping DRACO review — not enabled for template', { templateId })
                return
              }

              log.info('🎯 [DRACO] Triggering DRACO AI Review Board for generated document', {
                documentId,
                documentName: name,
                templateId,
              })

              const projectCtxResult = await pool.query(
                'SELECT * FROM projects WHERE id = $1',
                [projectId]
              )
              const projectCtx = projectCtxResult.rows[0] ?? {}

              const { dracoService } = await import('../services/dracoService')
              const dracoResult = await dracoService.runFullReview({
                documentId,
                content: result.content,
                documentType: name || 'Document',
                projectContext: projectCtx,
                templateId,
                userId: req.user?.id || 'system',
              })

              log.info('🎯 [DRACO] Review Board completed', {
                documentId,
                verdict: dracoResult.verdict,
                overall_score: dracoResult.overall_draco_score,
                mode: dracoResult.mode,
              })
            } catch (dracoError: any) {
              if (dracoError?.message === 'DRACO_DISABLED_FOR_TEMPLATE') {
                return // silently skip
              }
              // Non-blocking — log but don't fail
              log.error('🎯 [DRACO] Review Board failed (non-blocking)', {
                documentId,
                error: dracoError?.message,
              })
            }
          })()
        })
      }

      // 🔗 Auto-integration: Check project settings and auto-publish to Confluence/Jira if enabled
      // This runs asynchronously and doesn't block the response
      let confluenceUrl: string | null = null
      let jiraLinkage = null

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

              // Auto-publish to Confluence if enabled
              if (settings.confluence_enabled === true && settings.confluence_auto_publish === true) {
                try {
                  log.info('🔗 [AUTO-INTEGRATION] Auto-publishing generated document to Confluence', {
                    documentId,
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
                      id: documentId,
                      title: name,
                      content: result.content,
                      project_id: projectId,
                      framework: undefined,
                      status: 'draft',
                    }, projectSettings)

                    // Update document with Confluence URL
                    await pool.query(
                      `UPDATE documents SET confluence_page_url = $1 WHERE id = $2`,
                      [confluenceUrl, documentId]
                    )

                    log.info('✅ [AUTO-INTEGRATION] Generated document auto-published to Confluence', {
                      documentId,
                      confluenceUrl
                    })
                  } else {
                    log.warn('⚠️ [AUTO-INTEGRATION] No active Confluence integration found for auto-publish')
                  }
                } catch (confluenceError: any) {
                  // Don't fail document generation if auto-publish fails
                  log.error('❌ [AUTO-INTEGRATION] Failed to auto-publish to Confluence', {
                    documentId,
                    error: confluenceError.message,
                    stack: confluenceError.stack
                  })
                }
              }

              // Auto-create Jira issue if enabled
              if (settings.jira_enabled === true && settings.jira_auto_create === true) {
                try {
                  log.info('🔗 [AUTO-INTEGRATION] Auto-creating Jira issue for generated document', {
                    documentId,
                    documentName: name,
                    projectId
                  })

                  const { jiraLinkageService } = await import('../services/jiraLinkageService')
                  jiraLinkage = await jiraLinkageService.linkDocumentToJira(
                    documentId,
                    name,
                    projectId,
                    confluenceUrl || undefined,
                    `Document: ${name}\n\nProject: ${projectId}\nDocument ID: ${documentId}`,
                    settings.jira_issue_type_override || undefined,
                    settings.jira_priority_override || undefined
                  )

                  if (jiraLinkage) {
                    log.info('✅ [AUTO-INTEGRATION] Jira issue auto-created for generated document', {
                      documentId,
                      issueKey: jiraLinkage.issueKey,
                      issueUrl: jiraLinkage.issueUrl,
                      created: jiraLinkage.created
                    })
                  } else {
                    log.warn('⚠️ [AUTO-INTEGRATION] Jira linkage service returned null (may be disabled or misconfigured)')
                  }
                } catch (jiraError: any) {
                  // Don't fail document generation if auto-create fails
                  log.error('❌ [AUTO-INTEGRATION] Failed to auto-create Jira issue', {
                    documentId,
                    error: jiraError.message,
                    stack: jiraError.stack
                  })
                }
              }
            } else {
              // Fallback: Try legacy Jira linkage if no project settings (for backward compatibility)
              try {
                const jiraLinkageModule = await import('../services/jiraLinkageService')
                if (jiraLinkageModule.jiraLinkageService) {
                  jiraLinkage = await jiraLinkageModule.jiraLinkageService.linkDocumentToJira(
                    documentId,
                    name,
                    projectId
                  )
                  if (jiraLinkage) {
                    log.info(`Document linked to Jira issue: ${jiraLinkage.issueKey}`)
                  }
                }
              } catch (jiraError) {
                log.warn('Failed to link document to Jira (non-blocking):', jiraError)
              }
            }
          } catch (integrationError: any) {
            // Don't fail document generation if integration check fails
            log.error('❌ [AUTO-INTEGRATION] Error checking project integration settings', {
              documentId,
              projectId,
              error: integrationError.message,
              stack: integrationError.stack
            })
          }
        })().catch((err: any) => {
          // Catch any unhandled promise rejections
          log.error('❌ [AUTO-INTEGRATION] Unhandled error in auto-integration', {
            documentId,
            projectId,
            error: err?.message || 'Unknown error',
            stack: err?.stack
          })
        })
      })

      // 💾 Storage Archival: Push to ProjectWise and SharePoint if enabled
      setImmediate(() => {
        (async () => {
          try {
            log.info('💾 [STORAGE-ARCHIVAL] Starting multi-platform archival for generated document', {
              documentId,
              projectId
            })

            await storageArchivalService.archiveDocument({
              projectId,
              documentId,
              fileName: name,
              content: result.content,
              mimeType: 'text/markdown'
            })

            log.info('✅ [STORAGE-ARCHIVAL] Multi-platform archival orchestration completed for document', { documentId })
          } catch (archivalError: any) {
            log.error('❌ [STORAGE-ARCHIVAL] Failed to orchestrate storage archival', {
              documentId,
              error: archivalError.message
            })
          }
        })()
      })

      // 🔍 RAG Sync: Sync document to Gemini File Search for AI Search
      setImmediate(() => {
        (async () => {
          try {
            const { ragSyncService } = await import('../services/ragSyncService')
            if (ragSyncService.isAvailable()) {
              log.info('🔍 [RAG-SYNC] Syncing generated document to File Search', {
                documentId,
                projectId,
                documentName: name
              })

              const syncResult = await ragSyncService.syncDocument(documentId, projectId)

              if (syncResult.success) {
                log.info('✅ [RAG-SYNC] Document synced to File Search', {
                  documentId,
                  fileName: syncResult.fileName
                })
              } else {
                log.warn('⚠️ [RAG-SYNC] Document sync failed (non-blocking)', {
                  documentId,
                  error: syncResult.error
                })
              }
            }
          } catch (ragError: any) {
            // Don't fail document generation if RAG sync fails
            log.error('❌ [RAG-SYNC] Failed to sync to File Search', {
              documentId,
              error: ragError.message
            })
          }
        })()
      })


      res.status(201).json({
        message: "Document generated successfully",
        document: documentResult.rows[0],
        generation: result.metadata,
        jiraLinkage: jiraLinkage
      })
    } catch (error) {
      log.error("Document generation error:", error)

      const quotaDetails = getAIProviderQuotaDetails(error)
      if (quotaDetails) {
        return res.status(429).json({
          error: "AI provider quota exceeded",
          code: "AI_PROVIDER_QUOTA_EXCEEDED",
          details: quotaDetails,
          provider: req.body.provider,
          model: req.body.model
        })
      }

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
        getQueueService().addJob('quality-audit', {
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

      // 🔗 Update Jira issue if linked
      try {
        const { jiraLinkageService } = await import('../services/jiraLinkageService')
        await jiraLinkageService.updateJiraForDocumentRegeneration(
          existingDocumentId,
          newVersion,
          `Document regenerated using ${provider}${model ? ` (${model})` : ''}`
        )
      } catch (jiraError) {
        log.warn('Failed to update Jira issue (non-blocking):', jiraError)
      }

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
  max_tokens: Joi.number().integer().min(100).max(32000).optional().default(8000),
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
        max_tokens,
      } = req.body

      log.info(`Regenerating document ${documentId}`)

      const userId = req.user?.id
      const userRole = (req as any).user?.role
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      const userCompanyId = (req as any).user?.company_id

      // Check document exists and user has access
      let documentCheck
      try {
        if (isSuperAdmin) {
          // Super admin can access any document - just verify document exists
          documentCheck = await pool.query(
            `SELECT d.id, d.project_id, d.template_id, d.name,
                    p.owner_id, p.created_by, p.team_members, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1 AND d.deleted_at IS NULL`,
            [documentId]
          )
        } else if (isAdmin && userCompanyId) {
          // Admin can access documents from their company
          documentCheck = await pool.query(
            `SELECT d.id, d.project_id, d.template_id, d.name,
                    p.owner_id, p.created_by, p.team_members, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1 AND d.deleted_at IS NULL AND p.company_id = $2`,
            [documentId, userCompanyId]
          )
        } else {
          // Regular users: check project-level access (created_by, owner_id, team_members)
          documentCheck = await pool.query(
            `SELECT d.id, d.project_id, d.template_id, d.name,
                    p.owner_id, p.created_by, p.team_members, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1 
             AND d.deleted_at IS NULL
             AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)`,
            [documentId, userId]
          )
        }
      } catch (err: any) {
        // If company_id column doesn't exist, fall back to owner check
        if (err.message?.includes('column') && err.message?.includes('company_id')) {
          documentCheck = await pool.query(
            `SELECT d.id, d.project_id, d.template_id, d.name,
                    p.owner_id, p.created_by, p.team_members
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1 
             AND d.deleted_at IS NULL
             AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)`,
            [documentId, userId]
          )
        } else {
          throw err
        }
      }

      if (documentCheck.rows.length === 0) {
        log.warn('Access denied to regenerate document', {
          documentId,
          userId,
          userRole,
          userCompanyId
        })
        return res.status(403).json({ error: "Access denied to document" })
      }

      const document = documentCheck.rows[0]

      // Create regeneration job in database
      const jobId = uuidv4()
      const metadata = {
        max_tokens: max_tokens || 8000
      }
      await pool.query(
        `INSERT INTO regeneration_jobs 
         (id, document_id, template_id, provider, model, version_type, temperature, user_id, status, progress, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
          0,
          JSON.stringify(metadata)
        ]
      )

      log.info(`Created regeneration job ${jobId}`)

      // Enqueue job for background processing
      await getQueueService().addJob('document-regeneration', {
        documentId,
        templateId: templateId || document.template_id,
        provider,
        model,
        versionType,
        temperature,
        max_tokens: max_tokens || 8000,
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

