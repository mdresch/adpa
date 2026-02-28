import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, validateQuery } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"
import { NotionIntegration } from "../integrations/notion"
import { cache } from "../utils/redis"

const router = express.Router()

// Get integrations
router.get("/",
  authenticateToken,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    type: Joi.string().optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 10, type, is_active } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT i.*, u.name as created_by_name
        FROM integrations i
        LEFT JOIN users u ON i.created_by = u.id
        WHERE 1=1
      `

      const params: any[] = []
      let paramCount = 0

      if (type) {
        paramCount++
        query += ` AND i.type = $${paramCount}`
        params.push(type)
      }

      if (is_active !== undefined) {
        paramCount++
        query += ` AND i.is_active = $${paramCount}`
        params.push(is_active)
      }

      query += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Remove sensitive credentials from response
      const integrations = result.rows.map(integration => ({
        ...integration,
        credentials_encrypted: undefined,
        configuration: req.user?.role === "admin" ? integration.configuration : undefined,
      }))

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM integrations i WHERE 1=1"
      const countParams: any[] = []
      let countParamCount = 0

      if (type) {
        countParamCount++
        countQuery += ` AND i.type = $${countParamCount}`
        countParams.push(type)
      }

      if (is_active !== undefined) {
        countParamCount++
        countQuery += ` AND i.is_active = $${countParamCount}`
        countParams.push(is_active)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        integrations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get integrations error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get integration by ID
router.get("/:id",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        SELECT i.*, u.name as created_by_name
        FROM integrations i
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.id = $1
      `,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      const integration = result.rows[0]

      // Remove sensitive information for non-admin users
      if (req.user?.role !== "admin") {
        delete integration.credentials_encrypted
        delete integration.configuration
      }

      res.json({ integration })
    } catch (error) {
      log.error("Get integration error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Create integration (admin only)
router.post("/",
  authenticateToken,
  requirePermission("integrations.create"),
  validate(Joi.object({
    name: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid("confluence", "sharepoint", "github", "slack", "teams", "adobe", "jira", "notion", "mongodb", "pinecone", "supabase", "neo4j").required(),
    configuration: Joi.object().required(),
    credentials: Joi.object().required(),
    is_active: Joi.boolean().default(true),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { name, type, configuration, credentials, is_active } = req.body

      // Check if integration name already exists
      const existingIntegration = await pool.query(
        "SELECT id FROM integrations WHERE name = $1",
        [name]
      )

      if (existingIntegration.rows.length > 0) {
        return res.status(400).json({ error: "Integration name already exists" })
      }

      // Encrypt credentials (simple base64 for now, should use proper encryption)
      const encryptedCredentials = Buffer.from(JSON.stringify(credentials)).toString("base64")

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO integrations (id, name, type, configuration, credentials_encrypted, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, type, is_active, created_at, updated_at
      `,
        [id, name, type, JSON.stringify(configuration), encryptedCredentials, is_active, req.user?.id]
      )

      // If this is a Jira integration and it's active, automatically configure Jira linkage
      if (type === 'jira' && is_active) {
        try {
          const { jiraLinkageService } = await import('../services/jiraLinkageService')
          await jiraLinkageService.setDefaultJiraIntegration(id, req.user?.email || req.user?.id || 'system')
          await jiraLinkageService.setJiraLinkageEnabled(true, req.user?.email || req.user?.id || 'system')
          log.info(`Auto-configured Jira linkage for new integration: ${id}`)
        } catch (jiraError) {
          log.warn(`Failed to auto-configure Jira linkage: ${jiraError instanceof Error ? jiraError.message : 'Unknown error'}`)
          // Don't fail the integration creation if linkage config fails
        }
      }

      log.info(`Integration created: ${name} (${type}) by ${req.user?.email}`)

      res.status(201).json({
        message: "Integration created successfully",
        integration: result.rows[0],
      })
    } catch (error) {
      log.error("Create integration error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update integration (admin only)
router.put("/:id",
  authenticateToken,
  requirePermission("integrations.update"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    type: Joi.string().valid("confluence", "sharepoint", "github", "slack", "teams", "adobe", "jira", "notion", "mongodb", "pinecone", "supabase", "neo4j").optional(),
    configuration: Joi.object().optional(),
    credentials: Joi.object().optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { name, configuration, credentials, is_active } = req.body

      // Check if integration exists and get its current state
      const existingIntegration = await pool.query(
        "SELECT name, type, is_active FROM integrations WHERE id = $1",
        [id]
      )

      if (existingIntegration.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      const existingType = existingIntegration.rows[0]?.type
      const existingIsActive = existingIntegration.rows[0]?.is_active
      const newIsActive = is_active !== undefined ? is_active : existingIsActive

      // Check if name is already taken by another integration
      if (name) {
        const nameCheck = await pool.query(
          "SELECT id FROM integrations WHERE name = $1 AND id != $2",
          [name, id]
        )

        if (nameCheck.rows.length > 0) {
          return res.status(400).json({ error: "Integration name already exists" })
        }
      }

      // Encrypt credentials if provided
      let encryptedCredentials = null
      if (credentials) {
        encryptedCredentials = Buffer.from(JSON.stringify(credentials)).toString("base64")
      }

      const result = await pool.query(
        `
        UPDATE integrations 
        SET name = COALESCE($1, name),
            configuration = COALESCE($2, configuration),
            credentials_encrypted = COALESCE($3, credentials_encrypted),
            is_active = COALESCE($4, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, name, type, is_active, last_sync, sync_status, created_at, updated_at
      `,
        [
          name,
          configuration ? JSON.stringify(configuration) : null,
          encryptedCredentials,
          is_active,
          id,
        ]
      )

      // If this is a Jira integration, update Jira linkage settings
      if (existingType === 'jira') {
        try {
          const { jiraLinkageService } = await import('../services/jiraLinkageService')
          if (newIsActive) {
            // If integration is now active, set it as default and enable linkage
            await jiraLinkageService.setDefaultJiraIntegration(id, req.user?.email || req.user?.id || 'system')
            await jiraLinkageService.setJiraLinkageEnabled(true, req.user?.email || req.user?.id || 'system')
            log.info(`Auto-configured Jira linkage for updated integration: ${id}`)
          } else {
            // If integration is now inactive, check if it's the default and disable linkage if so
            const config = await jiraLinkageService.getJiraLinkageConfig()
            if (config.integrationId === id) {
              await jiraLinkageService.setJiraLinkageEnabled(false, req.user?.email || req.user?.id || 'system')
              log.info(`Disabled Jira linkage because default integration ${id} was deactivated`)
            }
          }
        } catch (jiraError) {
          log.warn(`Failed to update Jira linkage config: ${jiraError instanceof Error ? jiraError.message : 'Unknown error'}`)
          // Don't fail the integration update if linkage config fails
        }
      }

      log.info(`Integration updated: ${id} by ${req.user?.email}`)

      res.json({
        message: "Integration updated successfully",
        integration: result.rows[0],
      })
    } catch (error) {
      log.error("Update integration error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete integration (admin only)
router.delete("/:id",
  authenticateToken,
  requirePermission("integrations.delete"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        "DELETE FROM integrations WHERE id = $1 RETURNING name",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      log.info(`Integration deleted: ${id} by ${req.user?.email}`)

      res.json({ message: "Integration deleted successfully" })
    } catch (error) {
      log.error("Delete integration error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Test Notion connection directly (without existing integration)
// This route MUST come before /:id/test to avoid "notion" being matched as an ID
router.post("/notion/test",
  authenticateToken,
  validate(Joi.object({
    integrationToken: Joi.string().required(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { integrationToken } = req.body

      log.info("Testing Notion connection...", {
        tokenLength: integrationToken?.length,
        tokenPrefix: integrationToken?.substring(0, 10) + "..."
      })

      if (!integrationToken || integrationToken.trim().length === 0) {
        return res.json({
          success: false,
          message: "Connection test failed",
          error: "Integration token is required",
        })
      }

      const { NotionClient } = await import("../integrations/notion")
      const client = new NotionClient({ apiKey: integrationToken.trim() })

      // Test connection by getting current user
      const testResult = await client.testConnection()

      if (testResult) {
        // Try to search for pages to verify access
        const searchResult = await client.search("", undefined, 1)

        res.json({
          success: true,
          message: "Notion connection successful",
          workspaceName: "Connected",
          pagesFound: searchResult.results?.length || 0,
        })
      } else {
        res.json({
          success: false,
          message: "Failed to connect to Notion",
          error: "Connection test failed",
        })
      }
    } catch (error: any) {
      log.error("Notion connection test error:", error)
      res.json({
        success: false,
        message: "Connection test failed",
        error: error.message || "Unknown error",
      })
    }
  }
)

// Test integration connection
router.post("/:id/test",
  authenticateToken,
  requirePermission("integrations.test"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        "SELECT * FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      const integration = result.rows[0]
      const configuration = typeof integration.configuration === 'string'
        ? JSON.parse(integration.configuration)
        : integration.configuration

      // Decrypt credentials
      const credentials = decodeIntegrationCredentials(integration.credentials_encrypted)
      if (!credentials && integration.type !== 'pinecone') {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid integration credentials',
        })
      }

      if (credentials) {
        log.info("Decrypted credentials for test:", {
          hasIntegrationToken: !!credentials.integration_token,
          hasApiKey: !!credentials.apiKey,
          tokenLength: credentials.integration_token?.length || credentials.apiKey?.length || 0,
          tokenPrefix: (credentials.integration_token || credentials.apiKey)?.substring(0, 10) + "..."
        })
      }

      // Test connection based on integration type
      const testResult = await testIntegrationConnection(integration.type, configuration, credentials || {})

      // Update sync status
      await pool.query(
        "UPDATE integrations SET sync_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [testResult.success ? "connected" : "error", id]
      )

      log.info(`Integration test: ${id} - ${testResult.success ? "success" : "failed"}`)

      res.json({
        success: testResult.success,
        message: testResult.message,
        details: testResult.details,
      })
    } catch (error) {
      log.error("Test integration error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get sync status
router.get("/:id/sync/status",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Get status from Redis
      const status = await cache.get(`sync:progress:${id}`)

      if (!status) {
        // If not in Redis, check DB for last known status
        const integration = await pool.query(
          "SELECT sync_status, last_sync, updated_at FROM integrations WHERE id = $1",
          [id]
        )

        if (integration.rows.length === 0) {
          return res.status(404).json({ error: "Integration not found" })
        }

        return res.json({
          status: integration.rows[0].sync_status,
          progress: integration.rows[0].sync_status === 'completed' ? 100 : 0,
          details: {
            last_sync: integration.rows[0].last_sync
          }
        })
      }

      res.json(status)
    } catch (error) {
      log.error("Get sync status error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get MongoDB stats
router.get("/mongodb/stats",
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { mongoVectorStore } = await import('../services/mongoVectorStore')

      await mongoVectorStore.connect()
      const stats = await mongoVectorStore.getStats()

      res.json(stats)
    } catch (error: any) {
      log.error("Get MongoDB stats (global) error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

router.get("/:id/mongodb/stats",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check if integration is mongodb
      const result = await pool.query(
        "SELECT type FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'mongodb') {
        return res.status(400).json({ error: "Integration is not MongoDB type" })
      }

      const { mongoVectorStore } = await import('../services/mongoVectorStore')

      // Ensure connected
      await mongoVectorStore.connect()
      const stats = await mongoVectorStore.getStats()

      res.json(stats)
    } catch (error: any) {
      log.error("Get MongoDB stats error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Search MongoDB vector store
router.post("/mongodb/search",
  authenticateToken,
  validate(Joi.object({
    query: Joi.string().required(),
    topK: Joi.number().integer().min(1).max(100).default(10),
    indexName: Joi.string().optional(),
    numCandidates: Joi.number().integer().min(1).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { query, topK, indexName, numCandidates } = req.body

      const { mongoVectorStore } = await import('../services/mongoVectorStore')
      const { voyageAIService } = await import('../services/voyageAIService')

      await mongoVectorStore.connect()

      log.info("Generating embedding for query", { query: query.substring(0, 50) })
      const queryEmbedding = await voyageAIService.generateEmbedding(query, 'query', 'voyage-2')

      const matches = await mongoVectorStore.vectorSearch(queryEmbedding, topK, undefined, indexName, numCandidates)

      res.json({
        success: true,
        matches,
        query,
        resultsCount: matches.length
      })
    } catch (error: any) {
      log.error("MongoDB vector search (global) error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

router.post("/:id/mongodb/search",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    query: Joi.string().required(),
    topK: Joi.number().integer().min(1).max(100).default(10),
    indexName: Joi.string().optional(),
    numCandidates: Joi.number().integer().min(1).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { query, topK, indexName, numCandidates } = req.body

      // Check if integration is mongodb
      const result = await pool.query(
        "SELECT type FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'mongodb') {
        return res.status(400).json({ error: "Integration is not MongoDB type" })
      }

      const { mongoVectorStore } = await import('../services/mongoVectorStore')
      const { voyageAIService } = await import('../services/voyageAIService')

      // Ensure connected
      await mongoVectorStore.connect()

      // Generate embedding for query
      // Force voyage-2 (1024 dims) to match existing backfilled data
      // TODO: Update to voyage-4-large when all data is re-embedded
      log.info("Generating embedding for query", { query: query.substring(0, 50) })
      const queryEmbedding = await voyageAIService.generateEmbedding(query, 'query', 'voyage-2')

      // Perform vector search
      const matches = await mongoVectorStore.vectorSearch(queryEmbedding, topK, undefined, indexName, numCandidates)

      res.json({
        success: true,
        matches,
        query,
        resultsCount: matches.length
      })
    } catch (error: any) {
      log.error("MongoDB vector search error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Get Pinecone stats
router.get("/:id/pinecone/stats",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check if integration is pinecone
      const result = await pool.query(
        "SELECT type, configuration, credentials_encrypted FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'pinecone') {
        return res.status(400).json({ error: "Integration is not Pinecone type" })
      }

      const { PineconeService } = await import('../services/pineconeService')

      const integration = result.rows[0]
      const credentials = decodeIntegrationCredentials(integration.credentials_encrypted)
      const pineconeConfigs = resolvePineconeConnectionCandidates(integration, credentials)
      if (pineconeConfigs.length === 0) {
        return res.status(400).json({ error: 'Missing or invalid Pinecone credentials' })
      }

      let indexStats: any = null
      let selectedConfig: { apiKey: string; indexName?: string; indexHost?: string } | null = null

      for (const pineconeConfig of pineconeConfigs) {
        const pineconeService = new PineconeService(pineconeConfig)
        indexStats = await pineconeService.getIndexStats()

        if (indexStats) {
          selectedConfig = pineconeConfig
          break
        }
      }

      if (!indexStats) {
        return res.status(500).json({ error: "Failed to retrieve Pinecone stats" })
      }

      res.json({
        indexStats,
        indexName: selectedConfig?.indexName || process.env.PINECONE_INDEX_NAME || 'adpa-rag-index',
        environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp'
      })
    } catch (error: any) {
      log.error("Get Pinecone stats error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Search Pinecone index
router.post("/:id/pinecone/search",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    query: Joi.string().required(),
    topK: Joi.number().integer().min(1).max(100).default(10),
    namespace: Joi.string().optional().allow('')
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { query, topK, namespace } = req.body

      // Check if integration is pinecone
      const result = await pool.query(
        "SELECT type, configuration, credentials_encrypted FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'pinecone') {
        return res.status(400).json({ error: "Integration is not Pinecone type" })
      }

      const { PineconeService } = await import('../services/pineconeService')

      const integration = result.rows[0]
      const credentials = decodeIntegrationCredentials(integration.credentials_encrypted)
      const pineconeConfig = resolvePineconeConnectionConfig(integration, credentials)
      if (!pineconeConfig) {
        return res.status(400).json({ error: 'Missing or invalid Pinecone credentials' })
      }

      const pineconeService = new PineconeService(pineconeConfig)

      // Perform search
      const matches = await pineconeService.search(query, topK, undefined, namespace)

      res.json({
        success: true,
        matches,
        query,
        namespace: namespace || 'all'
      })
    } catch (error: any) {
      log.error("Pinecone search error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Get Supabase projects
router.get("/:id/supabase/projects",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        "SELECT type FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'supabase') {
        return res.status(400).json({ error: "Integration is not Supabase type" })
      }

      // Note: MCP calls need to be made from the client side
      // This endpoint will be used by the frontend to trigger MCP operations
      res.json({
        message: "Use MCP client to list projects",
        mcpTool: "mcp_supabase-mcp-server_list_projects"
      })
    } catch (error: any) {
      log.error("Get Supabase projects error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Get Supabase edge functions
router.get("/:id/supabase/functions",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { projectId } = req.query

      const result = await pool.query(
        "SELECT type, configuration FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'supabase') {
        return res.status(400).json({ error: "Integration is not Supabase type" })
      }

      res.json({
        message: "Use MCP client to list edge functions",
        mcpTool: "mcp_supabase-mcp-server_list_edge_functions",
        params: { project_id: projectId }
      })
    } catch (error: any) {
      log.error("Get Supabase functions error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Get Supabase database stats
router.get("/:id/supabase/stats",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        "SELECT type, configuration FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'supabase') {
        return res.status(400).json({ error: "Integration is not Supabase type" })
      }

      // Import supabaseService
      const { supabaseService } = require('../services/supabaseService');

      // Get database stats
      const dbStats = await supabaseService.getDatabaseStats(id);

      // Get Edge Function stats
      const functionStats = await supabaseService.getEdgeFunctionStats();

      res.json({
        message: 'Supabase stats retrieved successfully',
        database: dbStats,
        edgeFunctions: functionStats,
        mcpTools: {
          list_projects: 'mcp_supabase-mcp-server_list_projects',
          list_edge_functions: 'mcp_supabase-mcp-server_list_edge_functions',
          list_tables: 'mcp_supabase-mcp-server_list_tables',
          get_advisors: 'mcp_supabase-mcp-server_get_advisors',
          execute_sql: 'mcp_supabase-mcp-server_execute_sql',
          apply_migration: 'mcp_supabase-mcp-server_apply_migration'
        }
      })
    } catch (error: any) {
      log.error("Get Supabase stats error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Get Neo4j stats
router.get("/:id/neo4j/stats",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        "SELECT type FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'neo4j') {
        return res.status(400).json({ error: "Integration is not Neo4j type" })
      }

      const { getNeo4jDriver, isNeo4jConfigured } = await import('../utils/neo4j')

      if (!isNeo4jConfigured()) {
        return res.json({
          totalNodes: 0,
          totalRelationships: 0,
          status: 'unavailable',
          database: 'neo4j'
        })
      }

      const driver = getNeo4jDriver()
      if (!driver) {
        return res.json({
          totalNodes: 0,
          totalRelationships: 0,
          status: 'unavailable',
          database: 'neo4j'
        })
      }

      const session = driver.session()

      try {
        const nodesResult = await session.run('MATCH (n) RETURN count(n) as count')
        const relsResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count')

        res.json({
          totalNodes: nodesResult.records[0].get('count').toNumber(),
          totalRelationships: relsResult.records[0].get('count').toNumber(),
          status: 'active',
          database: 'neo4j'
        })
      } finally {
        await session.close()
      }

    } catch (error: any) {
      log.error("Get Neo4j stats error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

// Search Neo4j Graph
router.post("/:id/neo4j/search",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    query: Joi.string().required(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { query } = req.body

      const result = await pool.query(
        "SELECT type FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'neo4j') {
        return res.status(400).json({ error: "Integration is not Neo4j type" })
      }

      const { getNeo4jDriver } = await import('../utils/neo4j')
      const driver = getNeo4jDriver()

      if (!driver) {
        return res.status(503).json({ success: false, message: "Neo4j is not available or circuit is open" })
      }

      const session = driver.session()
      try {
        // Very basic search matching either node labels or a default 'name' property
        // For production, this should be replaced with full text search or an LLM-powered cypher generator
        const searchQuery = `
          MATCH (n) 
          WHERE any(label IN labels(n) WHERE toLower(label) CONTAINS toLower($searchTerm))
             OR toLower(n.name) CONTAINS toLower($searchTerm)
             OR toLower(n.title) CONTAINS toLower($searchTerm)
          RETURN n LIMIT 10
        `
        const searchResult = await session.run(searchQuery, { searchTerm: query })

        const matches = searchResult.records.map(record => {
          const node = record.get('n')
          return {
            id: node.elementId || node.identity?.toString(),
            labels: node.labels,
            properties: node.properties
          }
        })

        res.json({
          success: true,
          matches,
          query
        })
      } finally {
        await session.close()
      }
    } catch (error: any) {
      log.error("Neo4j search error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)


// Sync integration data
router.post("/:id/sync",
  authenticateToken,
  requirePermission("integrations.sync"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    log.info("Sync endpoint hit", { id: req.params.id, body: req.body })
    try {
      const { id } = req.params
      const { projectId, companyId } = req.body || {}
      const user = (req as any).user

      const result = await pool.query(
        "SELECT * FROM integrations WHERE id = $1 AND is_active = true",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found or inactive" })
      }

      const integration = result.rows[0]

      // Update sync status to in progress
      await pool.query(
        "UPDATE integrations SET sync_status = 'syncing', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      )

      // Perform sync with options (project, company, author)
      const syncOptions = {
        projectId: projectId || null,
        companyId: companyId || user?.company_id || null,
        authorId: user?.id || null
      }
      const syncResult = await performIntegrationSync(integration, syncOptions)
      const normalizedSyncResult = syncResult || {
        success: false,
        details: {
          synced_items: 0,
          error: 'Sync returned no result',
          last_sync: new Date().toISOString(),
        },
      }

      // Update sync status and timestamp
      await pool.query(
        `
        UPDATE integrations 
        SET sync_status = $1, last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `,
        [normalizedSyncResult.success ? "completed" : "error", id]
      )

      log.info(`Integration sync: ${id} - ${normalizedSyncResult.success ? "success" : "failed"}`)

      res.json({
        message: "Sync completed",
        success: normalizedSyncResult.success,
        details: normalizedSyncResult.details,
      })
    } catch (error: any) {
      log.error("Sync integration error:", {
        error: error.message,
        stack: error.stack,
        integrationId: req.params.id
      })

      // Update sync status to error
      try {
        await pool.query(
          "UPDATE integrations SET sync_status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [req.params.id]
        )
      } catch (updateError) {
        log.error("Failed to update sync status:", updateError)
      }

      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        success: false
      })
    }
  }
)

// Get available integration types
router.get("/types/available", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const types = [
      {
        type: "confluence",
        name: "Atlassian Confluence",
        description: "Sync documents and spaces from Confluence",
        features: ["document_sync", "space_management", "permissions"],
      },
      {
        type: "sharepoint",
        name: "Microsoft SharePoint",
        description: "Document management and collaboration",
        features: ["document_sync", "folder_structure", "permissions"],
      },
      {
        type: "github",
        name: "GitHub",
        description: "Version control for templates and documents",
        features: ["version_control", "collaboration", "issue_tracking"],
      },
      {
        type: "slack",
        name: "Slack",
        description: "Team notifications and collaboration",
        features: ["notifications", "chat_integration", "file_sharing"],
      },
      {
        type: "teams",
        name: "Microsoft Teams",
        description: "Team collaboration and notifications",
        features: ["notifications", "chat_integration", "file_sharing"],
      },
      {
        type: "adobe",
        name: "Adobe Document Services",
        description: "PDF generation and manipulation",
        features: ["pdf_generation", "document_conversion", "digital_signatures"],
      },
      {
        type: "jira",
        name: "Atlassian Jira",
        description: "Project management and issue tracking",
        features: ["project_sync", "issue_tracking", "workflow_management"],
      },
      {
        type: "notion",
        name: "Notion",
        description: "Full sync of pages and databases from Notion workspaces",
        features: ["document_sync", "database_sync", "markdown_conversion", "full_sync"],
      },
      {
        type: "mongodb",
        name: "MongoDB Vector Store",
        description: "Sync project documents to MongoDB Atlas for RAG",
        features: ["vector_search", "full_sync"],
      },
      {
        type: "pinecone",
        name: "Pinecone Vector Database",
        description: "Sync embeddings to Pinecone for vector search and RAG",
        features: ["vector_search", "embedding_sync", "namespace_management"],
      },
      {
        type: "supabase",
        name: "Supabase",
        description: "Postgres database and edge functions management",
        features: ["database_management", "edge_functions", "authentication"],
      },
      {
        type: "neo4j",
        name: "Neo4j Graph Database",
        description: "Graph database connection and vector sync status",
        features: ["graph_search", "entity_relationships", "analytics"],
      }
    ]

    res.json({ types })
  } catch (error) {
    log.error("Get integration types error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Placeholder functions for integration testing and syncing
async function testIntegrationConnection(type: string, configuration: any, credentials: any) {
  // Implement actual connection testing for each integration type
  switch (type) {
    case "notion":
      try {
        const { NotionClient } = await import("../integrations/notion")
        const client = new NotionClient({ apiKey: credentials.integration_token || credentials.apiKey })
        const connected = await client.testConnection()
        return {
          success: connected,
          message: connected ? "Connection test successful" : "Connection test failed",
          details: { type, tested_at: new Date().toISOString() },
        }
      } catch (error: any) {
        return {
          success: false,
          message: `Connection test failed: ${error.message}`,
          details: { type, tested_at: new Date().toISOString(), error: error.message },
        }
      }
    case "teams":
      try {
        const { teamsService } = await import("../services/teamsService")
        const connected = await teamsService.testConnection(credentials.webhookUrl || credentials.webhook_url)
        return {
          success: connected,
          message: connected ? "Teams connection successful" : "Teams connection failed",
          details: { type, tested_at: new Date().toISOString() },
        }
      } catch (error: any) {
        return {
          success: false,
          message: `Teams connection test failed: ${error.message}`,
          details: { type, tested_at: new Date().toISOString(), error: error.message },
        }
      }
    case "jira":
      try {
        const { JiraService } = await import("../services/jiraService")
        const jiraService = new JiraService({
          baseUrl: configuration.baseUrl || credentials.baseUrl,
          email: credentials.email,
          apiToken: credentials.apiToken
        })
        const connected = await jiraService.testConnection()

        // Also test project access if configured
        let projectAccess = null
        if (configuration.defaultProjectKey) {
          try {
            await jiraService.getProject(configuration.defaultProjectKey)
            projectAccess = configuration.defaultProjectKey
          } catch (projectError) {
            logger.warn(`Cannot access Jira project ${configuration.defaultProjectKey}:`, projectError)
          }
        }

        return {
          success: connected,
          message: connected ? "Jira connection successful" : "Jira connection failed",
          details: {
            type,
            tested_at: new Date().toISOString(),
            projectAccess: projectAccess
          },
        }
      } catch (error: any) {
        return {
          success: false,
          message: `Jira connection test failed: ${error.message}`,
          details: { type, tested_at: new Date().toISOString(), error: error.message },
        }
      }
    case "mongodb":
      try {
        const { mongoVectorStore } = await import('../services/mongoVectorStore')
        // Ensure connected checks the connection
        await mongoVectorStore.connect()
        return {
          success: true,
          message: "MongoDB connection successful",
          details: { type, tested_at: new Date().toISOString() },
        }
      } catch (error: any) {
        return {
          success: false,
          message: `MongoDB connection test failed: ${error.message}`,
          details: { type, tested_at: new Date().toISOString(), error: error.message },
        }
      }
    case "pinecone":
      try {
        const pineconeConfigs = resolvePineconeConnectionCandidates({ configuration }, credentials)

        if (pineconeConfigs.length === 0) {
          return {
            success: false,
            message: "Pinecone API key not configured",
            details: { type, tested_at: new Date().toISOString(), error: 'Missing API key in credentials/config/env' },
          }
        }

        const { PineconeService } = await import("../services/pineconeService")
        let connected = false

        for (const pineconeConfig of pineconeConfigs) {
          const pineconeService = new PineconeService(pineconeConfig)
          connected = await pineconeService.testConnection()
          if (connected) {
            break
          }
        }

        return {
          success: connected,
          message: connected ? "Pinecone connection successful" : "Pinecone connection failed",
          details: { type, tested_at: new Date().toISOString() },
        }
      } catch (error: any) {
        return {
          success: false,
          message: `Pinecone connection test failed: ${error.message}`,
          details: { type, tested_at: new Date().toISOString(), error: error.message },
        }
      }
    default:
      return {
        success: true,
        message: "Connection test successful",
        details: { type, tested_at: new Date().toISOString() },
      }
  }
}

interface SyncOptions {
  projectId?: string | null
  companyId?: string | null
  authorId?: string | null
}

function decodeIntegrationCredentials(encryptedCredentials: unknown): Record<string, any> | null {
  if (typeof encryptedCredentials !== 'string' || encryptedCredentials.trim() === '') {
    return null
  }

  try {
    const decoded = Buffer.from(encryptedCredentials, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function parseIntegrationConfiguration(configuration: unknown): Record<string, any> {
  if (!configuration) {
    return {}
  }

  if (typeof configuration === 'string') {
    try {
      return JSON.parse(configuration)
    } catch {
      return {}
    }
  }

  if (typeof configuration === 'object') {
    return configuration as Record<string, any>
  }

  return {}
}

function resolvePineconeConnectionConfig(
  integration: any,
  credentials?: Record<string, any> | null
): { apiKey: string; indexName?: string; indexHost?: string } | null {
  const candidates = resolvePineconeConnectionCandidates(integration, credentials)
  return candidates[0] || null
}

function resolvePineconeConnectionCandidates(
  integration: any,
  credentials?: Record<string, any> | null
): Array<{ apiKey: string; indexName?: string; indexHost?: string }> {
  const config = parseIntegrationConfiguration(integration?.configuration)

  const configIndexName = normalizeOptionalString(config.indexName) || normalizeOptionalString(config.index_name)
  const configIndexHost = normalizeOptionalString(config.indexHost) || normalizeOptionalString(config.index_host)
  const envIndexName = normalizeOptionalString(process.env.PINECONE_INDEX_NAME)
  const envIndexHost = normalizeOptionalString(process.env.PINECONE_INDEX_HOST)

  const rawApiKeys = [
    credentials?.apiKey,
    credentials?.api_key,
    config.apiKey,
    config.api_key,
    process.env.PINECONE_API_KEY,
  ]

  const apiKeys = uniqueNonEmptyStrings(rawApiKeys)

  const indexPairs = buildIndexCandidates(configIndexName, configIndexHost, envIndexName, envIndexHost)

  const combinations: Array<{ apiKey: string; indexName?: string; indexHost?: string }> = []
  const seen = new Set<string>()

  for (const apiKey of apiKeys) {
    for (const pair of indexPairs) {
      const dedupeKey = `${apiKey}|${pair.indexName || ''}|${pair.indexHost || ''}`
      if (seen.has(dedupeKey)) {
        continue
      }
      seen.add(dedupeKey)
      combinations.push({ apiKey, indexName: pair.indexName, indexHost: pair.indexHost })
    }
  }

  return combinations
}

function buildIndexCandidates(
  configIndexName?: string,
  configIndexHost?: string,
  envIndexName?: string,
  envIndexHost?: string
): Array<{ indexName: string; indexHost?: string }> {
  const pairs: Array<{ indexName: string; indexHost?: string }> = []
  const seen = new Set<string>()

  const push = (indexName?: string, indexHost?: string) => {
    if (!indexName) {
      return
    }
    const key = `${indexName}|${indexHost || ''}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    pairs.push({ indexName, indexHost })
  }

  // Source-aligned pairs first
  push(configIndexName, configIndexHost)
  push(envIndexName, envIndexHost)

  // Auto-discovery fallback for each index name (no host)
  push(configIndexName, undefined)
  push(envIndexName, undefined)

  // Final default
  push('adpa-rag-index', undefined)

  return pairs
}

function uniqueNonEmptyStrings(values: unknown[]): string[] {
  const uniqueValues = new Set<string>()

  for (const value of values) {
    const normalized = normalizeOptionalString(value)
    if (normalized) {
      uniqueValues.add(normalized)
    }
  }

  return Array.from(uniqueValues)
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

async function performIntegrationSync(integration: any, syncOptions: SyncOptions = {}) {
  const credentials = decodeIntegrationCredentials(integration.credentials_encrypted)

  // Non-pinecone integrations still require encrypted credentials
  if (!credentials && integration.type !== 'pinecone') {
    console.warn(`[SYNC] Skipping sync for integration ${integration.id} (${integration.type}): Missing encrypted credentials`)
    return {
      success: false,
      details: {
        synced_items: 0,
        skipped: true,
        error: 'Missing encrypted credentials',
        last_sync: new Date().toISOString(),
      },
    }
  }

  // Implement actual sync logic for each integration type
  switch (integration.type) {
    case "notion":
      try {
        const notionIntegration = new NotionIntegration(
          { apiKey: credentials.integration_token || credentials.apiKey },
          integration.id,
          {
            projectId: syncOptions.projectId || undefined,
            companyId: syncOptions.companyId || undefined,
            authorId: syncOptions.authorId || undefined
          }
        )

        // Perform full sync
        const documents = await notionIntegration.syncDocuments()

        return {
          success: true,
          details: {
            synced_items: documents.length,
            sync_duration: "completed",
            last_sync: new Date().toISOString(),
            projectId: syncOptions.projectId || null,
            companyId: syncOptions.companyId || null,
          },
        }
      } catch (error: any) {
        logger.error("Notion sync error:", error)
        return {
          success: false,
          details: {
            synced_items: 0,
            error: error.message,
            last_sync: new Date().toISOString(),
          },
        }
      }
    case "mongodb":
      try {
        const { mongoDBSyncService } = await import('../services/mongoDBSyncService')
        const projectId = syncOptions.projectId || null

        // Setup progress callback
        const onProgress = async (progress: any) => {
          await cache.set(`sync:progress:${integration.id}`, {
            ...progress,
            timestamp: new Date().toISOString(),
            projectId: projectId || 'all'
          }, 3600) // 1 hour TTL
        }

        const result = await mongoDBSyncService.syncProjectDocuments(
          projectId,
          undefined, // no limit
          onProgress
        )

        return {
          success: result.success,
          details: {
            ...result.details,
            sync_duration: "variable",
            last_sync: new Date().toISOString(),
          }
        }
      } catch (error: any) {
        logger.error("MongoDB sync error:", error)
        return {
          success: false,
          details: {
            synced_items: 0,
            error: error.message,
            last_sync: new Date().toISOString(),
          },
        }
      }
    case "pinecone":
      try {
        const { PineconeService } = await import('../services/pineconeService')
        const projectId = syncOptions.projectId || undefined

        // Setup progress callback
        const onProgress = async (progress: any) => {
          await cache.set(`sync:progress:${integration.id}`, {
            ...progress,
            timestamp: new Date().toISOString(),
            projectId: projectId || 'all'
          }, 3600) // 1 hour TTL
        }

        const pineconeConfig = resolvePineconeConnectionConfig(integration, credentials)
        if (!pineconeConfig) {
          console.warn(`[SYNC] Skipping sync for integration ${integration.id} (pinecone): Missing API key in credentials/config/env`)
          return {
            success: false,
            details: {
              synced_items: 0,
              skipped: true,
              error: 'Missing Pinecone API key in credentials/config/env',
              last_sync: new Date().toISOString(),
            },
          }
        }

        // Instantiate service with credentials
        const pineconeService = new PineconeService(pineconeConfig)

        const result = await pineconeService.syncAll(projectId, onProgress)

        return {
          success: result.success,
          details: {
            ...result.details,
            sync_duration: "variable",
            last_sync: new Date().toISOString(),
          }
        }
      } catch (error: any) {
        logger.error("Pinecone sync error:", error)
        return {
          success: false,
          details: {
            synced_items: 0,
            error: error.message,
            last_sync: new Date().toISOString(),
          },
        }
      }
    default:
      return {
        success: false,
        details: {
          synced_items: 0,
          error: `Sync not implemented for integration type: ${integration.type}`,
          last_sync: new Date().toISOString(),
        },
      }
  }
}

// Get Supabase extracted entities
router.get("/:id/supabase/entities",
  authenticateToken,
  requirePermission("integrations.read"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { limit = 50 } = req.query

      const result = await pool.query(
        "SELECT type FROM integrations WHERE id = $1",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (result.rows[0].type !== 'supabase') {
        return res.status(400).json({ error: "Integration is not Supabase type" })
      }

      // Import supabaseService
      const { supabaseService } = require('../services/supabaseService');

      // Get entities
      const entities = await supabaseService.listEntities(Number(limit));

      res.json({
        entities,
        count: entities.length
      })
    } catch (error: any) {
      log.error("Get Supabase entities error:", error)
      res.status(500).json({ error: "Internal server error", message: error.message })
    }
  }
)

export default router
