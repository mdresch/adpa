import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, validateQuery } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { dynamics365GuidesService, Guide, GuideStep } from "../integrations/dynamics365-guides"

const router = express.Router()

// =============================================================================
// Validation Schemas
// =============================================================================

const generateGuideSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  options: Joi.object({
    includeMedia: Joi.boolean().default(true),
    include3DAnchors: Joi.boolean().default(true),
    aiEnhancement: Joi.boolean().default(false)
  }).default()
})

const bulkSyncSchema = Joi.object({
  documentIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required()
})

const createGuideSchema = Joi.object({
  name: Joi.string().max(200).required(),
  description: Joi.string().max(2000).optional(),
  sourceDocumentId: Joi.string().uuid().optional(),
  assetRef: Joi.string().max(200).optional(),
  steps: Joi.array().items(Joi.object({
    stepNumber: Joi.number().integer().min(1).required(),
    name: Joi.string().max(100).required(),
    instructionText: Joi.string().max(500).required(),
    extendedDescription: Joi.string().max(2000).optional(),
    warningText: Joi.string().max(500).optional(),
    mediaType: Joi.string().valid('none', 'image', 'video', '3d').default('none'),
    mediaRef: Joi.string().optional(),
    toolsRequired: Joi.string().optional(),
    validationChecklist: Joi.array().items(Joi.string()).optional(),
    anchorType: Joi.string().valid('none', 'qr', '3d_model', 'spatial').default('none'),
    anchorId: Joi.string().optional()
  })).optional()
})

const updateGuideSchema = Joi.object({
  name: Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional().allow(''),
  assetRef: Joi.string().max(200).optional()
})

// =============================================================================
// Integration Configuration Endpoints
// =============================================================================

/**
 * Test D365 Guides connection
 */
router.post("/test",
  authenticateToken,
  requirePermission("integrations.write"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      log.info("D365 Guides test endpoint hit")
      
      const { tenantId, clientId, clientSecret, environmentUrl } = req.body

      if (!tenantId || !clientId || !clientSecret || !environmentUrl) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: tenantId, clientId, clientSecret, environmentUrl"
        })
      }

      // Initialize service with provided credentials
      await dynamics365GuidesService.initialize({
        tenantId,
        clientId,
        clientSecret,
        environmentUrl
      })

      // Test connection
      const result = await dynamics365GuidesService.testConnection()

      res.json({
        success: result.success,
        message: result.message,
        guidesCount: result.guidesCount
      })
    } catch (error: any) {
      log.error("D365 Guides connection test failed:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Connection test failed"
      })
    }
  }
)

/**
 * Initialize D365 Guides integration from stored configuration
 */
router.post("/:integrationId/initialize",
  authenticateToken,
  requirePermission("integrations.write"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { integrationId } = req.params

      // Get integration configuration
      const integration = await pool.query(
        `SELECT * FROM integrations 
         WHERE id = $1 AND type = 'dynamics365_guides' AND is_active = true`,
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: "D365 Guides integration not found or inactive" 
        })
      }

      const config = integration.rows[0].configuration

      // Initialize service
      await dynamics365GuidesService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        environmentUrl: config.environment_url,
        guidesAppId: config.guides_app_id
      })

      // Test connection
      const testResult = await dynamics365GuidesService.testConnection()

      if (!testResult.success) {
        return res.status(500).json({
          success: false,
          error: `Connection failed: ${testResult.message}`
        })
      }

      res.json({
        success: true,
        message: "D365 Guides integration initialized",
        guidesCount: testResult.guidesCount
      })
    } catch (error: any) {
      log.error("Failed to initialize D365 Guides integration:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

// =============================================================================
// Guide Generation Endpoints
// =============================================================================

/**
 * Generate guide from ADPA document
 */
router.post("/generate",
  authenticateToken,
  requirePermission("documents.write"),
  validate(generateGuideSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { documentId, options } = req.body
      const userId = (req as any).user?.id

      log.info("Generating D365 Guide from document", { documentId, userId })

      // Fetch document from database
      const docResult = await pool.query(
        `SELECT d.*, p.name as project_name 
         FROM documents d
         LEFT JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
        [documentId]
      )

      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Document not found"
        })
      }

      const document = docResult.rows[0]

      // Parse content to extract sections
      const sections = parseDocumentSections(document.content)

      // Transform to guide format
      const guideData = {
        id: document.id,
        title: document.title || document.name,
        description: document.description,
        summary: document.summary,
        asset_ref: document.asset_ref || document.metadata?.asset_ref,
        version: document.version?.toString(),
        sections
      }

      // Sync to D365 Guides
      const result = await dynamics365GuidesService.syncFromDocument(guideData)

      // Record sync in database
      await pool.query(
        `INSERT INTO document_integrations 
         (document_id, integration_type, external_id, synced_at, synced_by, metadata)
         VALUES ($1, 'dynamics365_guides', $2, NOW(), $3, $4)
         ON CONFLICT (document_id, integration_type) 
         DO UPDATE SET external_id = $2, synced_at = NOW(), synced_by = $3, metadata = $4`,
        [
          documentId,
          result.guideId,
          userId,
          JSON.stringify({ created: result.created, options })
        ]
      )

      // Get sync status with URL
      const syncStatus = await dynamics365GuidesService.getSyncStatus(documentId)

      res.json({
        success: true,
        data: {
          guideId: result.guideId,
          created: result.created,
          documentId,
          guideUrl: syncStatus.guideUrl,
          message: result.created ? 'Guide created successfully' : 'Guide updated successfully'
        }
      })
    } catch (error: any) {
      log.error("Failed to generate D365 Guide:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate guide"
      })
    }
  }
)

/**
 * Bulk sync documents to guides
 */
router.post("/sync",
  authenticateToken,
  requirePermission("documents.write"),
  validate(bulkSyncSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { documentIds } = req.body
      const userId = (req as any).user?.id

      log.info("Bulk syncing documents to D365 Guides", { 
        count: documentIds.length, 
        userId 
      })

      const results = await Promise.allSettled(
        documentIds.map(async (documentId: string) => {
          // Fetch document
          const docResult = await pool.query(
            `SELECT * FROM documents WHERE id = $1`,
            [documentId]
          )

          if (docResult.rows.length === 0) {
            throw new Error(`Document not found: ${documentId}`)
          }

          const document = docResult.rows[0]
          const sections = parseDocumentSections(document.content)

          const guideData = {
            id: document.id,
            title: document.title || document.name,
            description: document.description,
            asset_ref: document.asset_ref,
            version: document.version?.toString(),
            sections
          }

          return dynamics365GuidesService.syncFromDocument(guideData)
        })
      )

      const summary = {
        total: documentIds.length,
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        details: results.map((r, i) => ({
          documentId: documentIds[i],
          status: r.status,
          guideId: r.status === 'fulfilled' ? (r as PromiseFulfilledResult<any>).value.guideId : null,
          error: r.status === 'rejected' ? (r as PromiseRejectedResult).reason.message : null
        }))
      }

      res.json({ success: true, data: summary })
    } catch (error: any) {
      log.error("Bulk sync failed:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

// =============================================================================
// Guide Status & Management Endpoints
// =============================================================================

/**
 * Get sync status for a document
 */
router.get("/status/:documentId",
  authenticateToken,
  requirePermission("documents.read"),
  validateParams(Joi.object({
    documentId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { documentId } = req.params

      const syncStatus = await dynamics365GuidesService.getSyncStatus(documentId)

      res.json({
        success: true,
        data: syncStatus
      })
    } catch (error: any) {
      log.error("Failed to get sync status:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

/**
 * List all guides
 */
router.get("/guides",
  authenticateToken,
  requirePermission("integrations.read"),
  validateQuery(Joi.object({
    search: Joi.string().optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional(),
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { search, status, limit, offset } = req.query as any

      const result = await dynamics365GuidesService.listGuides({
        search,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })

      res.json({
        success: true,
        data: result.guides,
        pagination: {
          total: result.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      })
    } catch (error: any) {
      log.error("Failed to list guides:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

/**
 * Get a specific guide
 */
router.get("/guides/:guideId",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    guideId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { guideId } = req.params

      const guide = await dynamics365GuidesService.getGuide(guideId)

      if (!guide) {
        return res.status(404).json({
          success: false,
          error: "Guide not found"
        })
      }

      res.json({
        success: true,
        data: guide
      })
    } catch (error: any) {
      log.error("Failed to get guide:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

/**
 * Create a guide manually
 */
router.post("/guides",
  authenticateToken,
  requirePermission("integrations.write"),
  validate(createGuideSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const guide: Guide = req.body

      const guideId = await dynamics365GuidesService.createGuide(guide)

      res.status(201).json({
        success: true,
        data: {
          guideId,
          message: "Guide created successfully"
        }
      })
    } catch (error: any) {
      log.error("Failed to create guide:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

/**
 * Update a guide
 */
router.patch("/guides/:guideId",
  authenticateToken,
  requirePermission("integrations.write"),
  validateParams(Joi.object({
    guideId: Joi.string().uuid().required()
  })),
  validate(updateGuideSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { guideId } = req.params
      const updates = req.body

      await dynamics365GuidesService.updateGuide(guideId, updates)

      res.json({
        success: true,
        message: "Guide updated successfully"
      })
    } catch (error: any) {
      log.error("Failed to update guide:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

/**
 * Delete a guide
 */
router.delete("/guides/:guideId",
  authenticateToken,
  requirePermission("integrations.write"),
  validateParams(Joi.object({
    guideId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { guideId } = req.params

      await dynamics365GuidesService.deleteGuide(guideId)

      res.json({
        success: true,
        message: "Guide deleted successfully"
      })
    } catch (error: any) {
      log.error("Failed to delete guide:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

// =============================================================================
// Analytics Endpoints
// =============================================================================

/**
 * Get guide analytics
 */
router.get("/guides/:guideId/analytics",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    guideId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { guideId } = req.params

      const analytics = await dynamics365GuidesService.getGuideAnalytics(guideId)

      if (!analytics) {
        return res.json({
          success: true,
          data: null,
          message: "No analytics data available for this guide"
        })
      }

      res.json({
        success: true,
        data: analytics
      })
    } catch (error: any) {
      log.error("Failed to get guide analytics:", error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse document content (Markdown) into sections for guide steps
 */
function parseDocumentSections(content: string | object): Array<{
  id: string
  title: string
  content: string
  warnings?: string[]
  tools_required?: string[]
  validation?: string[]
}> {
  // Handle JSONB content
  let markdown: string
  if (typeof content === 'object') {
    markdown = (content as any).content || (content as any).markdown || JSON.stringify(content)
  } else {
    markdown = content || ''
  }

  const sections: Array<{
    id: string
    title: string
    content: string
    warnings?: string[]
    tools_required?: string[]
    validation?: string[]
  }> = []

  // Split by headers (## or ###)
  const headerRegex = /^(#{2,3})\s+(.+)$/gm
  const parts = markdown.split(headerRegex)

  let currentSection: any = null
  let sectionIndex = 0

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    
    // Check if this is a header marker
    if (part === '##' || part === '###') {
      // Next part is the title
      if (i + 1 < parts.length) {
        if (currentSection) {
          sections.push(currentSection)
        }
        
        sectionIndex++
        currentSection = {
          id: `step-${sectionIndex}`,
          title: parts[i + 1].trim(),
          content: '',
          warnings: [],
          tools_required: [],
          validation: []
        }
        i++ // Skip the title part
      }
    } else if (currentSection && part) {
      // This is content for the current section
      currentSection.content += part + '\n'
      
      // Extract warnings (lines starting with ⚠️ or WARNING:)
      const warningMatches = part.match(/(?:⚠️|WARNING:|CAUTION:|DANGER:)\s*(.+)/gi)
      if (warningMatches) {
        currentSection.warnings.push(...warningMatches.map((w: string) => 
          w.replace(/^(?:⚠️|WARNING:|CAUTION:|DANGER:)\s*/i, '')
        ))
      }

      // Extract tools (lines with "Tools:" or "Required:")
      const toolMatches = part.match(/(?:Tools|Required|Equipment):\s*(.+)/gi)
      if (toolMatches) {
        toolMatches.forEach((t: string) => {
          const tools = t.replace(/^(?:Tools|Required|Equipment):\s*/i, '').split(/[,;]/)
          currentSection.tools_required.push(...tools.map((tool: string) => tool.trim()))
        })
      }

      // Extract validation items (checkbox items)
      const checkboxMatches = part.match(/[-*]\s*\[[ x]\]\s*(.+)/gi)
      if (checkboxMatches) {
        currentSection.validation.push(...checkboxMatches.map((c: string) => 
          c.replace(/^[-*]\s*\[[ x]\]\s*/i, '')
        ))
      }
    }
  }

  // Don't forget the last section
  if (currentSection) {
    sections.push(currentSection)
  }

  // Clean up sections
  return sections.map(s => ({
    ...s,
    content: s.content.trim(),
    warnings: s.warnings.length > 0 ? s.warnings : undefined,
    tools_required: s.tools_required.length > 0 ? s.tools_required : undefined,
    validation: s.validation.length > 0 ? s.validation : undefined
  }))
}

export default router
