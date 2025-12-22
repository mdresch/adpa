import { Router, Request, Response } from "express"
import { ConfluenceIntegration } from "../integrations/confluence"
import { ConfluenceConfig } from "../services/confluenceService"
import { authenticateToken } from "../middleware/auth"
import { pool } from "../database/connection"
import { logger, childLogger } from "../utils/logger"

// Static module-level child logger for helper code that runs outside request handlers
const staticLog = childLogger({ component: "confluenceRoutes" })

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

/**
 * Test Confluence connection
 * POST /api/integrations/confluence/test
 */
router.post("/test", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { baseUrl, credentials } = req.body

    if (!baseUrl || !credentials || !credentials.username || !credentials.api_token) {
      return res.status(400).json({
        error: "Missing required fields: baseUrl, credentials.username, credentials.api_token"
      })
    }

    const config: ConfluenceConfig = {
      baseUrl,
      username: credentials.username,
      apiToken: credentials.api_token,
    }

    const confluenceIntegration = new ConfluenceIntegration(config, "test")
    const isConnected = await confluenceIntegration.authenticate()

    if (isConnected) {
      res.json({
        success: true,
        message: "Confluence connection successful"
      })
    } else {
      res.status(400).json({
        error: "Failed to connect to Confluence. Please check your credentials."
      })
    }
  } catch (error) {
    log.error("Confluence connection test failed:", error)
    res.status(500).json({
      error: "Connection test failed",
      details: error.message
    })
  }
})

/**
 * Get Confluence spaces
 * GET /api/integrations/confluence/:integrationId/spaces
 */
router.get("/:integrationId/spaces", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { integrationId } = req.params

    // Determine which integration to use: explicit id or latest active
    const wantLatest = integrationId === 'latest'
    let integration = wantLatest ? await getLatestActiveIntegrationConfig() : await getIntegrationConfig(integrationId)
    let fallbackUsed = false
    if (!integration) {
      // Fallback to latest active if explicit id missing or invalid
      integration = await getLatestActiveIntegrationConfig()
      fallbackUsed = true
    }

    if (!integration) {
      return res.status(200).json({ success: true, spaces: [], diagnostics: { reason: 'no_active_integration', usedIntegrationId: null, fallbackUsed } })
    }

    // Basic diagnostics before attempting API
    const baseUrl = integration.config.baseUrl
    const username = (integration.config as any).username
    const apiToken = (integration.config as any).apiToken

    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      return res.status(200).json({ success: true, spaces: [], diagnostics: { reason: 'invalid_base_url', usedIntegrationId: wantLatest ? 'latest' : integrationId, fallbackUsed } })
    }
    if (!username || !apiToken) {
      return res.status(200).json({ success: true, spaces: [], diagnostics: { reason: 'missing_credentials', usedIntegrationId: wantLatest ? 'latest' : integrationId, fallbackUsed } })
    }

    // Use the actual integration ID from the database, not the route parameter
    const realIntegrationId = integration.id
    const confluenceIntegration = new ConfluenceIntegration(integration.config, realIntegrationId)
    const spaces = await confluenceIntegration.getSpaces()

    res.json({
      success: true,
      spaces,
      diagnostics: { reason: spaces?.length ? 'ok' : 'empty', usedIntegrationId: wantLatest ? 'latest' : integrationId, fallbackUsed }
    })
  } catch (error: any) {
    log.error("Failed to get Confluence spaces:", error)
    res.status(200).json({
      success: true,
      spaces: [],
      diagnostics: { reason: 'api_error', message: error?.message || 'Unknown error' }
    })
  }
})

/**
 * Search Confluence content
 * GET /api/integrations/confluence/:integrationId/search
 */
router.get("/:integrationId/search", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { integrationId } = req.params
    const { query, spaceKey } = req.query

    if (!query) {
      return res.status(400).json({ error: "Search query is required" })
    }

    // Get integration configuration
    const integration = await getIntegrationConfig(integrationId)
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" })
    }

    // Use the actual integration ID from the database
    const confluenceIntegration = new ConfluenceIntegration(integration.config, integration.id)
    const results = await confluenceIntegration.searchContent(
      query as string,
      spaceKey as string
    )

    res.json({
      success: true,
      results
    })
  } catch (error) {
    log.error("Confluence search failed:", error)
    res.status(500).json({
      error: "Search failed",
      details: error.message
    })
  }
})

/**
 * Sync documents from Confluence
 * POST /api/integrations/confluence/:integrationId/sync
 */
router.post("/:integrationId/sync", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { integrationId } = req.params

    // Get integration configuration
    const integration = await getIntegrationConfig(integrationId)
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" })
    }

    // Use the actual integration ID from the database
    const confluenceIntegration = new ConfluenceIntegration(integration.config, integration.id)
    
    // Start sync process
    const syncedDocuments = await confluenceIntegration.syncDocuments()

    // Update integration sync status
    await pool.query(
      `UPDATE integrations SET last_sync = CURRENT_TIMESTAMP, sync_status = 'completed' WHERE id = $1`,
      [integrationId]
    )

    res.json({
      success: true,
      message: `Successfully synced ${syncedDocuments.length} documents`,
      syncedDocuments: syncedDocuments.length
    })
  } catch (error) {
    log.error("Confluence sync failed:", error)
    // Update integration sync status to failed
    await pool.query(
      `UPDATE integrations SET sync_status = 'failed' WHERE id = $1`,
      [req.params.integrationId]
    )

    res.status(500).json({
      error: "Sync failed",
      details: error.message
    })
  }
})

/**
 * Import specific Confluence page
 * POST /api/integrations/confluence/:integrationId/import
 */
router.post("/:integrationId/import", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { integrationId } = req.params
    const { pageId, projectId } = req.body

    if (!pageId) {
      return res.status(400).json({ error: "Page ID is required" })
    }

    // Get integration configuration
    const integration = await getIntegrationConfig(integrationId)
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" })
    }

    // Use the actual integration ID from the database
    const confluenceIntegration = new ConfluenceIntegration(integration.config, integration.id)
    const document = await confluenceIntegration.importPage(pageId, projectId)

    res.json({
      success: true,
      message: "Page imported successfully",
      document
    })
  } catch (error) {
    log.error("Confluence page import failed:", error)
    res.status(500).json({
      error: "Import failed",
      details: error.message
    })
  }
})

/**
 * Export ADPA document to Confluence
 * POST /api/integrations/confluence/:integrationId/export
 */
router.post("/:integrationId/export", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { integrationId } = req.params
    const { documentId } = req.body

    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required" })
    }

    // Get document from database
    const documentResult = await pool.query(
      `SELECT * FROM documents WHERE id = $1`,
      [documentId]
    )

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const document = documentResult.rows[0]

    // Determine integration configuration (supports 'latest' and fallback)
    const wantLatest = integrationId === 'latest'
    let integration = wantLatest ? await getLatestActiveIntegrationConfig() : await getIntegrationConfig(integrationId)
    if (!integration) {
      // Fallback to latest active if explicit id missing or invalid
      integration = await getLatestActiveIntegrationConfig()
    }
    if (!integration) {
      return res.status(404).json({ error: "Integration not found or not active" })
    }

    const realIntegrationId = integration.id
    const confluenceIntegration = new ConfluenceIntegration(integration.config, realIntegrationId)
    const confluenceUrl = await confluenceIntegration.uploadDocument({
      id: document.id,
      title: document.name,
      content: document.content,
      project_id: document.project_id,
      framework: document.framework,
      status: document.status,
    })

    res.json({
      success: true,
      message: "Document exported successfully",
      confluenceUrl
    })
  } catch (error) {
    log.error("Confluence export failed:", error)
    const message = (error as any)?.message || 'Unknown error'
    const reason = /No target space/.test(message) ? 'space_not_configured'
      : /Space does not exist|404/.test(message) ? 'space_not_found'
      : /Unauthorized|Forbidden|403/.test(message) ? 'not_authorized'
      : /already exists/i.test(message) ? 'title_conflict'
      : 'api_error'
    res.status(500).json({
      error: "Export failed",
      reason,
      details: message
    })
  }
})

/**
 * Get sync status for integration
 * GET /api/integrations/confluence/:integrationId/status
 */
router.get("/:integrationId/status", async (req: Request, res: Response) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { integrationId } = req.params

    // Get integration status
    const integrationResult = await pool.query(
      `SELECT last_sync, sync_status FROM integrations WHERE id = $1`,
      [integrationId]
    )

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: "Integration not found" })
    }

    const integration = integrationResult.rows[0]

    // Get sync metadata count
    const syncMetadataResult = await pool.query(
      `SELECT COUNT(*) as synced_documents FROM integration_sync_metadata WHERE integration_id = $1`,
      [integrationId]
    )

    const syncedDocuments = parseInt(syncMetadataResult.rows[0].synced_documents)

    res.json({
      success: true,
      status: {
        lastSync: integration.last_sync,
        syncStatus: integration.sync_status,
        syncedDocuments
      }
    })
  } catch (error) {
    log.error("Failed to get sync status:", error)
    res.status(500).json({
      error: "Failed to get status",
      details: error.message
    })
  }
})

/**
 * Helper function to get integration configuration
 */
async function getIntegrationConfig(integrationId: string): Promise<{
  id: string,
  config: ConfluenceConfig
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, configuration, credentials_encrypted FROM integrations WHERE id = $1 AND type = 'confluence' AND is_active = true`,
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
        credentials = JSON.parse(Buffer.from(encryptedCredentials, "base64").toString())
      } catch (error) {
        staticLog.error("Failed to decrypt credentials:", error)
        return null
      }
    }

    return {
      id: result.rows[0].id,
      config: {
        baseUrl: config.base_url,
        username: credentials.username,
        apiToken: credentials.api_token,
        cloudId: config.cloud_id,
      }
    }
    } catch (error) {
      staticLog.error("Failed to get integration configuration:", error)
      return null
    }
}

export default router

// Helper: get latest active confluence integration config
async function getLatestActiveIntegrationConfig(): Promise<{ id: string, config: ConfluenceConfig } | null> {
  try {
    const result = await pool.query(
      `SELECT id, configuration, credentials_encrypted FROM integrations WHERE type = 'confluence' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
    )
    if (result.rows.length === 0) return null

    const config = result.rows[0].configuration
    const encryptedCredentials = result.rows[0].credentials_encrypted

    let credentials: any = {}
    if (encryptedCredentials) {
      try {
        credentials = JSON.parse(Buffer.from(encryptedCredentials, "base64").toString())
      } catch (error) {
        staticLog.error("Failed to decrypt credentials:", error)
        return null
      }
    }

    return {
      id: result.rows[0].id,
      config: {
        baseUrl: config.base_url,
        username: credentials.username,
        apiToken: credentials.api_token,
        cloudId: config.cloud_id,
      }
    }
  } catch (error) {
    staticLog.error("Failed to get latest active integration:", error)
    return null
  }
}

