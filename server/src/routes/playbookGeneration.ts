/**
 * Playbook Generation API Routes
 * Provides endpoints for generating ADPA playbooks from templates
 */

import express from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { PlaybookService } from "../modules/documentTemplates/playbookService"
import { PlaybookTemplateGenerator, PLAYBOOK_TEMPLATE_CONFIGS } from "../modules/documentTemplates/playbookTemplate"
import { logger } from "../utils/logger"

const router = express.Router()

/**
 * GET /api/playbook-generation/templates
 * Get available playbook templates
 */
router.get(
  "/templates",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const templates = PlaybookService.getAvailableTemplates()
      
      const response = {
        success: true,
        templates: templates.map(t => ({
          key: t.key,
          name: t.name,
          description: t.description,
          config: {
            playbookType: t.config.playbookType,
            targetAudience: t.config.targetAudience,
            complexity: t.config.complexity,
            includeGkgContext: t.config.includeGkgContext
          }
        }))
      }

      logger.info('[Playbook Generation] Retrieved available templates', {
        count: templates.length
      })

      res.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[Playbook Generation] Failed to retrieve templates', { error: message })
      res.status(500).json({
        success: false,
        error: "Failed to retrieve templates",
        details: message
      })
    }
  }
)

/**
 * POST /api/playbook-generation/generate
 * Generate playbook from template configuration
 */
router.post(
  "/generate",
  authenticateToken,
  requirePermission("documents.create"),
  async (req, res) => {
    try {
      const {
        projectId,
        playbookType,
        targetAudience,
        complexity,
        outputFormat = 'pdf',
        customVariables = {},
        includeGkgContext = true
      } = req.body

      // Validate required fields
      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "projectId is required"
        })
      }

      if (!playbookType || !['program', 'framework', 'operational'].includes(playbookType)) {
        return res.status(400).json({
          success: false,
          error: "Invalid playbookType. Must be: program, framework, or operational"
        })
      }

      if (!targetAudience || !['executive', 'technical', 'operational'].includes(targetAudience)) {
        return res.status(400).json({
          success: false,
          error: "Invalid targetAudience. Must be: executive, technical, or operational"
        })
      }

      if (!complexity || !['basic', 'standard', 'comprehensive'].includes(complexity)) {
        return res.status(400).json({
          success: false,
          error: "Invalid complexity. Must be: basic, standard, or comprehensive"
        })
      }

      const generationRequest = {
        projectId,
        playbookType,
        targetAudience,
        complexity,
        outputFormat,
        customVariables,
        includeGkgContext
      }

      const result = await PlaybookService.generatePlaybook(
        generationRequest,
        req.user
      )

      if (result.success) {
        logger.info('[Playbook Generation] Successfully generated playbook', {
          projectId,
          playbookType,
          targetAudience,
          documentId: result.documentId,
          generationTime: result.metadata?.generationTime
        })

        res.json({
          success: true,
          documentId: result.documentId,
          downloadUrl: result.downloadUrl,
          templateId: result.templateId,
          generationId: result.generationId,
          metadata: result.metadata
        })
      } else {
        throw new Error(result.error || "Unknown generation error")
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[Playbook Generation] Failed to generate playbook', { 
        error: message,
        body: req.body 
      })
      res.status(500).json({
        success: false,
        error: "Failed to generate playbook",
        details: message
      })
    }
  }
)

/**
 * POST /api/playbook-generation/generate/standard
 * Generate playbook using predefined template configuration
 */
router.post(
  "/generate/standard",
  authenticateToken,
  requirePermission("documents.create"),
  async (req, res) => {
    try {
      const {
        templateKey,
        projectId,
        outputFormat = 'pdf'
      } = req.body

      // Validate required fields
      if (!templateKey) {
        return res.status(400).json({
          success: false,
          error: "templateKey is required"
        })
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "projectId is required"
        })
      }

      // Validate template key
      const validKeys = Object.keys(PLAYBOOK_TEMPLATE_CONFIGS)
      if (!validKeys.includes(templateKey)) {
        return res.status(400).json({
          success: false,
          error: `Invalid templateKey. Must be one of: ${validKeys.join(', ')}`
        })
      }

      const result = await PlaybookService.generateStandardPlaybook(
        templateKey as keyof typeof PLAYBOOK_TEMPLATE_CONFIGS,
        projectId,
        outputFormat,
        req.user
      )

      if (result.success) {
        logger.info('[Playbook Generation] Successfully generated standard playbook', {
          templateKey,
          projectId,
          documentId: result.documentId
        })

        res.json({
          success: true,
          documentId: result.documentId,
          downloadUrl: result.downloadUrl,
          templateId: result.templateId,
          generationId: result.generationId,
          metadata: result.metadata
        })
      } else {
        throw new Error(result.error || "Unknown generation error")
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[Playbook Generation] Failed to generate standard playbook', { 
        error: message,
        body: req.body 
      })
      res.status(500).json({
        success: false,
        error: "Failed to generate standard playbook",
        details: message
      })
    }
  }
)

/**
 * GET /api/playbook-generation/preview/:templateKey
 * Preview template configuration without generating document
 */
router.get(
  "/preview/:templateKey",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const { templateKey } = req.params

      // Validate template key
      const validKeys = Object.keys(PLAYBOOK_TEMPLATE_CONFIGS)
      if (!validKeys.includes(templateKey)) {
        return res.status(400).json({
          success: false,
          error: `Invalid templateKey. Must be one of: ${validKeys.join(', ')}`
        })
      }

      const config = PLAYBOOK_TEMPLATE_CONFIGS[templateKey as keyof typeof PLAYBOOK_TEMPLATE_CONFIGS]
      const template = PlaybookTemplateGenerator.generatePlaybookTemplate(config)

      const response = {
        success: true,
        templateKey,
        config,
        preview: {
          name: template.name,
          description: template.description,
          sections: template.content.sections.length,
          goToMarketParagraphs: Object.keys(template.content.goToMarketParagraphs).length,
          variables: template.variables.length,
          gkgContextEnabled: !!template.gkg_context_strategy
        }
      }

      logger.info('[Playbook Generation] Retrieved template preview', {
        templateKey,
        sections: response.preview.sections
      })

      res.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[Playbook Generation] Failed to preview template', { 
        error: message,
        templateKey: req.params.templateKey
      })
      res.status(500).json({
        success: false,
        error: "Failed to preview template",
        details: message
      })
    }
  }
)

/**
 * GET /api/playbook-generation/status/:generationId
 * Get status of playbook generation job
 */
router.get(
  "/status/:generationId",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const { generationId } = req.params

      // This would typically query a job queue or database for generation status
      // For now, return a mock response
      const response = {
        success: true,
        generationId,
        status: "completed", // pending, in_progress, completed, failed
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        documentId: "mock-document-id",
        downloadUrl: "/api/documents/download/mock-document-id"
      }

      logger.info('[Playbook Generation] Retrieved generation status', {
        generationId,
        status: response.status
      })

      res.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[Playbook Generation] Failed to get generation status', { 
        error: message,
        generationId: req.params.generationId
      })
      res.status(500).json({
        success: false,
        error: "Failed to get generation status",
        details: message
      })
    }
  }
)

export default router
