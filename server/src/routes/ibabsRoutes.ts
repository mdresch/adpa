/**
 * iBabs Routes - Board Portal Integration API
 * API endpoints for iBabs board report upload and management
 */

import express, { Request, Response } from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, validateQuery } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { IBabsService, IBabsConfig } from "../services/ibabsService"
import { IBabsUploadService, ReportType } from "../services/ibabsUploadService"

const router = express.Router()

// Test iBabs connection
router.post("/test", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    log.info("iBabs test endpoint hit")
    log.debug("Request body:", req.body)

    const { baseUrl, clientId, clientSecret } = req.body

    if (!baseUrl || !clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: baseUrl, clientId, clientSecret",
      })
    }

    const config: IBabsConfig = {
      baseUrl,
      clientId,
      clientSecret,
    }

    const ibabsService = new IBabsService(config, "test")
    
    // Test authentication
    await ibabsService.authenticate()
    
    // Test API access
    const isConnected = await ibabsService.testConnection()

    if (isConnected) {
      res.json({
        success: true,
        message: "iBabs connection successful",
      })
    } else {
      res.status(400).json({
        success: false,
        error: "Failed to connect to iBabs. Please check your credentials.",
      })
    }
  } catch (error: any) {
    log.error("iBabs connection test failed:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Connection test failed",
    })
  }
})

// Get upcoming meetings
router.get(
  "/:integrationId/meetings",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  validateQuery(
    Joi.object({
      daysAhead: Joi.number().integer().min(1).max(90).default(30),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params
      const { daysAhead = 30 } = req.query

      // Get integration configuration
      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const ibabsService = new IBabsService(integration.config, integrationId)
      await ibabsService.initialize()

      const meetings = await ibabsService.getUpcomingMeetings(Number(daysAhead))

      res.json({
        success: true,
        meetings,
      })
    } catch (error: any) {
      log.error("Failed to get iBabs meetings:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get meetings",
      })
    }
  }
)

// Get meeting details
router.get(
  "/:integrationId/meetings/:meetingId",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
      meetingId: Joi.string().required(),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId, meetingId } = req.params

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const ibabsService = new IBabsService(integration.config, integrationId)
      await ibabsService.initialize()

      const meeting = await ibabsService.getMeeting(meetingId)

      res.json({
        success: true,
        meeting,
      })
    } catch (error: any) {
      log.error("Failed to get iBabs meeting:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get meeting",
      })
    }
  }
)

// Upload report to meeting
router.post(
  "/:integrationId/upload-report",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  validate(
    Joi.object({
      meetingId: Joi.string().required(),
      reportType: Joi.string().valid("ceo", "cfo", "audit", "program-detail").required(),
      programId: Joi.string().uuid().optional(),
      quarter: Joi.string().optional(),
      year: Joi.number().integer().min(2020).max(2050).optional(),
      agendaItem: Joi.string().optional(),
      classification: Joi.string().optional(),
      accessControl: Joi.array().items(Joi.string()).optional(),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params
      const {
        meetingId,
        reportType,
        programId,
        quarter,
        year,
        agendaItem,
        classification,
        accessControl,
      } = req.body

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const uploadService = new IBabsUploadService(integration.config, integrationId)
      await uploadService.initialize()

      // Generate report
      const { pdf } = await uploadService.generateBoardReport({
        reportType: reportType as ReportType,
        programId,
        quarter,
        year,
        includeFinancials: true,
        includeRisks: true,
        includeMilestones: true,
      })

      const reportTitle = `${reportType.toUpperCase()} Report - ${quarter || uploadService["getCurrentQuarter"]()} ${year || new Date().getFullYear()}`

      // Upload to iBabs
      const result = await uploadService.uploadDocumentToMeeting(meetingId, {
        title: reportTitle,
        content: pdf,
        contentType: "application/pdf",
        agendaItem,
        classification: classification || "confidential",
        accessControl: accessControl || ["board_directors"],
      })

      res.json({
        success: true,
        message: "Report uploaded successfully",
        documentId: result.documentId,
        url: result.url,
      })
    } catch (error: any) {
      log.error("Failed to upload report:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to upload report",
      })
    }
  }
)

// Schedule auto-generation of reports
router.post(
  "/:integrationId/schedule-reports",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  validate(
    Joi.object({
      meetingDate: Joi.date().iso().required(),
      programs: Joi.array().items(Joi.string().uuid()).optional(),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params
      const { meetingDate, programs = [] } = req.body

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const uploadService = new IBabsUploadService(integration.config, integrationId)
      await uploadService.initialize()

      const job = uploadService.scheduleBoardReportGeneration(
        new Date(meetingDate),
        programs
      )

      res.json({
        success: true,
        message: "Board report generation scheduled",
        scheduledFor: job.nextInvocation(),
      })
    } catch (error: any) {
      log.error("Failed to schedule reports:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to schedule reports",
      })
    }
  }
)

// Sync action items from iBabs
router.post(
  "/:integrationId/sync-actions",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  validate(
    Joi.object({
      meetingId: Joi.string().required(),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params
      const { meetingId } = req.body

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const uploadService = new IBabsUploadService(integration.config, integrationId)
      await uploadService.initialize()

      const syncedCount = await uploadService.syncActionItems(meetingId)

      res.json({
        success: true,
        message: `Synced ${syncedCount} action items`,
        syncedCount,
      })
    } catch (error: any) {
      log.error("Failed to sync action items:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to sync action items",
      })
    }
  }
)

// Generate report preview (without uploading)
router.post(
  "/:integrationId/preview-report",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  validate(
    Joi.object({
      reportType: Joi.string().valid("ceo", "cfo", "audit", "program-detail").required(),
      programId: Joi.string().uuid().optional(),
      quarter: Joi.string().optional(),
      year: Joi.number().integer().min(2020).max(2050).optional(),
      format: Joi.string().valid("markdown", "pdf").default("markdown"),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params
      const { reportType, programId, quarter, year, format } = req.body

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const uploadService = new IBabsUploadService(integration.config, integrationId)
      await uploadService.initialize()

      const { markdown, pdf } = await uploadService.generateBoardReport({
        reportType: reportType as ReportType,
        programId,
        quarter,
        year,
        includeFinancials: true,
        includeRisks: true,
        includeMilestones: true,
      })

      if (format === "pdf") {
        res.contentType("application/pdf")
        res.send(pdf)
      } else {
        res.json({
          success: true,
          markdown,
          pdfSize: pdf.length,
        })
      }
    } catch (error: any) {
      log.error("Failed to preview report:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to preview report",
      })
    }
  }
)

// Start auto-scheduling
router.post(
  "/:integrationId/start-auto-scheduling",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const uploadService = new IBabsUploadService(integration.config, integrationId)
      await uploadService.initialize()

      uploadService.startAutoScheduling()

      // Update integration config
      await pool.query(
        `UPDATE integrations SET configuration = configuration || '{"auto_scheduling": true}'::jsonb WHERE id = $1`,
        [integrationId]
      )

      res.json({
        success: true,
        message: "Auto-scheduling started (runs every Monday at 9 AM)",
      })
    } catch (error: any) {
      log.error("Failed to start auto-scheduling:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to start auto-scheduling",
      })
    }
  }
)

// Stop auto-scheduling
router.post(
  "/:integrationId/stop-auto-scheduling",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(
    Joi.object({
      integrationId: Joi.string().uuid().required(),
    })
  ),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationId } = req.params

      const integration = await getIntegrationConfig(integrationId)
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: "iBabs integration not found or inactive",
        })
      }

      const uploadService = new IBabsUploadService(integration.config, integrationId)
      await uploadService.initialize()

      uploadService.stopAutoScheduling()

      // Update integration config
      await pool.query(
        `UPDATE integrations SET configuration = configuration || '{"auto_scheduling": false}'::jsonb WHERE id = $1`,
        [integrationId]
      )

      res.json({
        success: true,
        message: "Auto-scheduling stopped",
      })
    } catch (error: any) {
      log.error("Failed to stop auto-scheduling:", error)
      res.status(500).json({
        success: false,
        error: error.message || "Failed to stop auto-scheduling",
      })
    }
  }
)

/**
 * Helper function to get integration configuration
 */
async function getIntegrationConfig(integrationId: string): Promise<{
  config: IBabsConfig
} | null> {
  try {
    const result = await pool.query(
      `SELECT configuration, credentials_encrypted FROM integrations WHERE id = $1 AND type = 'ibabs' AND is_active = true`,
      [integrationId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const config = result.rows[0].configuration
    const encryptedCredentials = result.rows[0].credentials_encrypted

    // Decrypt credentials (simple base64 for now, should use proper encryption)
    let credentials: any = {}
    if (encryptedCredentials) {
      try {
        credentials = JSON.parse(
          Buffer.from(encryptedCredentials, "base64").toString()
        )
      } catch (error) {
        logger.error("Failed to decrypt credentials:", error)
        return null
      }
    }

    return {
      config: {
        baseUrl: config.base_url,
        clientId: credentials.client_id || config.client_id,
        clientSecret: credentials.client_secret || config.client_secret,
        redirectUri: config.redirect_uri,
      },
    }
  } catch (error) {
    logger.error("Failed to get integration configuration:", error)
    return null
  }
}

export default router
