import express from "express"
import Joi from "joi"
import multer from "multer"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, validateQuery } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { sharepointService } from "../services/sharepointService"

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// Test SharePoint connection
router.post("/test", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    log.info("SharePoint test endpoint hit")
    log.debug("Request body:", req.body)

    const { tenantId, clientId, clientSecret } = req.body

    if (!tenantId || !clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tenantId, clientId, clientSecret"
      })
    }

    // Test Azure authentication directly
    const axios = require('axios')

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    const params = new URLSearchParams()
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)
    params.append('scope', 'https://graph.microsoft.com/.default')
    params.append('grant_type', 'client_credentials')

    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    // Test Graph API access
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/sites?$top=1', {
      headers: { 'Authorization': 'Bearer ' + response.data.access_token }
    })

    res.json({
      success: true,
      message: "SharePoint connection successful",
      sitesFound: graphResponse.data.value?.length || 0
    })

  } catch (error: any) {
    log.error("SharePoint connection test failed:", error)
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_description || error.message || "Connection test failed"
    })
  }
})

// Get SharePoint sites
router.get("/:integrationId/sites",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
  })),
  validateQuery(Joi.object({
    search: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(25),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId } = req.params
      const { search, limit = 25 } = req.query

      // Get integration configuration
  const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      const sites = await sharepointService.getSites(search as string, Number(limit))

      res.json({ 
        success: true, 
        sites 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Failed to get SharePoint sites:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to get sites" 
      })
    }
  }
)

// Get document libraries for a site
router.get("/:integrationId/sites/:siteId/drives",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
    siteId: Joi.string().required(),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId, siteId } = req.params

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      const drives = await sharepointService.getSiteDrives(siteId)

      res.json({ 
        success: true, 
        drives 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Failed to get SharePoint drives:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to get drives" 
      })
    }
  }
)

// Get files from a document library
router.get("/:integrationId/drives/:driveId/files",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
    driveId: Joi.string().required(),
  })),
  validateQuery(Joi.object({
    folderId: Joi.string().default("root"),
    limit: Joi.number().integer().min(1).max(100).default(100),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId, driveId } = req.params
      const { folderId = "root", limit = 100 } = req.query

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      const files = await sharepointService.getDriveFiles(driveId, folderId as string, Number(limit))

      res.json({ 
        success: true, 
        files 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Failed to get SharePoint files:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to get files" 
      })
    }
  }
)

// Sync documents from SharePoint
router.post("/:integrationId/sync",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
  })),
  validate(Joi.object({
    siteId: Joi.string().optional(),
    driveId: Joi.string().optional(),
    projectId: Joi.string().uuid().optional(),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId } = req.params
      const { siteId, driveId, projectId } = req.body

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      // Start sync

  const syncResult = await sharepointService.syncDocuments(siteId, driveId, projectId)

      // Update integration with sync status
      await pool.query(
        "UPDATE integrations SET last_sync = $1, sync_status = $2 WHERE id = $3",
        [
          syncResult.lastSyncTime,
          syncResult.success ? "completed" : "failed",
          integrationId,
        ]
      )

      res.json({ 
        success: syncResult.success,
        syncedFiles: syncResult.syncedFiles,
        syncedFolders: syncResult.syncedFolders,
        errors: syncResult.errors,
        lastSyncTime: syncResult.lastSyncTime,
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("SharePoint sync failed:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Sync failed" 
      })
    }
  }
)

// Search SharePoint files
router.get("/:integrationId/search",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
  })),
  validateQuery(Joi.object({
    query: Joi.string().min(1).required(),
    siteId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(25),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId } = req.params
      const { query, siteId, limit = 25 } = req.query

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      const files = await sharepointService.searchFiles(query as string, siteId as string, Number(limit))

      res.json({ 
        success: true, 
        results: files 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("SharePoint search failed:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Search failed" 
      })
    }
  }
)

// Upload file to SharePoint
router.post("/:integrationId/drives/:driveId/upload",
  authenticateToken,
  requirePermission("integrations.update"),
  upload.single("file"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
    driveId: Joi.string().required(),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId, driveId } = req.params
      const { parentFolderId = "root" } = req.body

      if (!req.file) {
        return res.status(400).json({ error: "No file provided" })
      }

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

  const uploadedFile = await sharepointService.uploadDocument(
        driveId,
        req.file.originalname,
        req.file.buffer,
        parentFolderId
      )

      res.json({ 
        success: true, 
        file: uploadedFile 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("SharePoint file upload failed:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Upload failed" 
      })
    }
  }
)

// Get OneDrive
router.get("/:integrationId/onedrive",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId } = req.params

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      const drive = await sharepointService.getMyDrive()

      res.json({ 
        success: true, 
        drive 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Failed to get OneDrive:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to get OneDrive" 
      })
    }
  }
)

// Get OneDrive files
router.get("/:integrationId/onedrive/files",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({
    integrationId: Joi.string().uuid().required(),
  })),
  validateQuery(Joi.object({
    folderId: Joi.string().default("root"),
    limit: Joi.number().integer().min(1).max(100).default(100),
  })),
  async (req, res) => {
    try {
      const log = childLogger({ requestId: (req as any).requestId })
      const { integrationId } = req.params
      const { folderId = "root", limit = 100 } = req.query

      // Get integration configuration
      const integration = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND type = 'sharepoint' AND is_active = true",
        [integrationId]
      )

      if (integration.rows.length === 0) {
        return res.status(404).json({ error: "SharePoint integration not found or inactive" })
      }

      const config = integration.rows[0].configuration

      // Initialize SharePoint service
      await sharepointService.initialize({
        tenantId: config.tenant_id,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        defaultSiteId: config.default_site_id,
        syncEnabled: config.sync_enabled || false,
        autoSync: config.auto_sync || false,
        syncInterval: config.sync_interval,
      })

      const files = await sharepointService.getMyDriveFiles(folderId as string, Number(limit))

      res.json({ 
        success: true, 
        files 
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Failed to get OneDrive files:", error)
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to get OneDrive files" 
      })
    }
  }
)

export default router
