import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, validateQuery } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

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
    type: Joi.string().valid("confluence", "sharepoint", "github", "slack", "teams", "adobe", "jira").required(),
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
    configuration: Joi.object().optional(),
    credentials: Joi.object().optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { name, configuration, credentials, is_active } = req.body

      // Check if integration exists
      const existingIntegration = await pool.query(
        "SELECT name FROM integrations WHERE id = $1",
        [id]
      )

      if (existingIntegration.rows.length === 0) {
        return res.status(404).json({ error: "Integration not found" })
      }

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

      // Decrypt credentials
      const credentials = JSON.parse(
        Buffer.from(integration.credentials_encrypted, "base64").toString("utf-8")
      )

      // Test connection based on integration type
      const testResult = await testIntegrationConnection(integration.type, integration.configuration, credentials)

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

// Sync integration data
router.post("/:id/sync", 
  authenticateToken, 
  requirePermission("integrations.sync"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

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

      // Perform sync (placeholder implementation)
      const syncResult = await performIntegrationSync(integration)

      // Update sync status and timestamp
      await pool.query(
        `
        UPDATE integrations 
        SET sync_status = $1, last_sync = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `,
        [syncResult.success ? "completed" : "error", id]
      )

    log.info(`Integration sync: ${id} - ${syncResult.success ? "success" : "failed"}`)

      res.json({
        message: "Sync completed",
        success: syncResult.success,
        details: syncResult.details,
      })
    } catch (error) {
      log.error("Sync integration error:", error)
      
      // Update sync status to error
  await pool.query(
        "UPDATE integrations SET sync_status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [req.params.id]
      )

      res.status(500).json({ error: "Internal server error" })
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
    ]

    res.json({ types })
  } catch (error) {
    log.error("Get integration types error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Placeholder functions for integration testing and syncing
async function testIntegrationConnection(type: string, configuration: any, credentials: any) {
  // This would implement actual connection testing for each integration type
  return {
    success: true,
    message: "Connection test successful",
    details: { type, tested_at: new Date().toISOString() },
  }
}

async function performIntegrationSync(integration: any) {
  // This would implement actual sync logic for each integration type
  return {
    success: true,
    details: {
      synced_items: 0,
      sync_duration: "0.5s",
      last_sync: new Date().toISOString(),
    },
  }
}

export default router
