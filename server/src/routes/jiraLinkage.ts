import express from "express"
import Joi from "joi"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { jiraLinkageService } from "../services/jiraLinkageService"

const router = express.Router()

// Get Jira linkage configuration
router.get("/config",
  authenticateToken,
  requirePermission("settings.read"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const config = await jiraLinkageService.getJiraLinkageConfig()
      const availableIntegrations = await jiraLinkageService.getAvailableJiraIntegrations()
      
      res.json({
        config,
        availableIntegrations
      })
    } catch (error) {
      log.error("Failed to get Jira linkage config:", error)
      res.status(500).json({ error: "Failed to load configuration" })
    }
  }
)

// Update Jira linkage configuration
const updateConfigSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  integrationId: Joi.string().uuid().optional(),
  autoCreateIssues: Joi.boolean().optional(),
  linkConfluencePages: Joi.boolean().optional(),
  defaultIssueType: Joi.string().optional(),
  defaultPriority: Joi.string().optional()
})

router.put("/config",
  authenticateToken,
  requirePermission("settings.update"),
  validate(updateConfigSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const config = req.body
      const updatedBy = req.user?.email || req.user?.id || 'unknown'
      
      await jiraLinkageService.updateJiraLinkageConfig(config, updatedBy)
      
      // Return updated config
      const updatedConfig = await jiraLinkageService.getJiraLinkageConfig()
      
      log.info(`Jira linkage config updated by ${updatedBy}`)
      
      res.json({
        message: "Jira linkage configuration updated successfully",
        config: updatedConfig
      })
    } catch (error) {
      log.error("Failed to update Jira linkage config:", error)
      res.status(500).json({ 
        error: "Failed to update configuration",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

// Get document Jira linkage
router.get("/document/:documentId",
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const { documentId } = req.params
    
    try {
      // Check if user has access to the document
      const { pool } = await import("../database/connection")
      const documentCheck = await pool.query(
        `SELECT d.id, d.project_id, p.owner_id, p.team_members, p.created_by
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1 AND d.deleted_at IS NULL`,
        [documentId]
      )
      
      if (documentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }
      
      const document = documentCheck.rows[0]
      const hasAccess = 
        document.owner_id === req.user?.id ||
        document.created_by === req.user?.id ||
        (document.team_members && document.team_members.includes(req.user?.id)) ||
        req.user?.role === 'admin' ||
        req.user?.role === 'super_admin'
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" })
      }
      
      // Get Jira linkage
      const linkageResult = await pool.query(
        `SELECT djl.*, i.name as integration_name
         FROM document_jira_links djl
         JOIN integrations i ON djl.integration_id = i.id
         WHERE djl.document_id = $1`,
        [documentId]
      )
      
      if (linkageResult.rows.length === 0) {
        return res.json({ linked: false })
      }
      
      const linkage = linkageResult.rows[0]
      res.json({
        linked: true,
        issueKey: linkage.jira_issue_key,
        issueUrl: linkage.jira_issue_url,
        integrationName: linkage.integration_name,
        createdAt: linkage.created_at,
        updatedAt: linkage.updated_at
      })
    } catch (error) {
      log.error(`Failed to get document Jira linkage for ${documentId}:`, error)
      res.status(500).json({ error: "Failed to get linkage information" })
    }
  }
)

// Manually create Jira issue for document
const createIssueSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  issueTitle: Joi.string().min(1).max(255).optional(),
  issueDescription: Joi.string().max(2000).optional(),
  issueType: Joi.string().optional(),
  priority: Joi.string().optional(),
  confluenceUrl: Joi.string().uri().optional()
})

router.post("/create-issue",
  authenticateToken,
  requirePermission("documents.update"),
  validate(createIssueSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    // Extract documentId at function scope so it's accessible in catch block
    const documentId = req.body?.documentId
    
    try {
      const { issueTitle, issueDescription, issueType, priority, confluenceUrl } = req.body
      
      // Check if user has access to the document
      const { pool } = await import("../database/connection")
      const documentCheck = await pool.query(
        `SELECT d.id, d.name, d.project_id, p.owner_id, p.team_members, p.created_by
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1 AND d.deleted_at IS NULL`,
        [documentId]
      )
      
      if (documentCheck.rows.length === 0) {
        return res.status(404).json({ error: "Document not found" })
      }
      
      const document = documentCheck.rows[0]
      const hasAccess = 
        document.owner_id === req.user?.id ||
        document.created_by === req.user?.id ||
        (document.team_members && document.team_members.includes(req.user?.id)) ||
        req.user?.role === 'admin' ||
        req.user?.role === 'super_admin'
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" })
      }
      
      // Check project-specific settings first (allows project-level override)
      const projectSettingsResult = await pool.query(
        `SELECT jira_enabled, jira_auto_create FROM project_integrations WHERE project_id = $1`,
        [document.project_id]
      )
      
      let jiraEnabled = false
      if (projectSettingsResult.rows.length > 0) {
        const projectSettings = projectSettingsResult.rows[0]
        // If project has explicit settings, use them
        if (projectSettings.jira_enabled === false) {
          return res.status(400).json({ 
            error: "Jira integration is disabled for this project",
            details: "Enable it in Project Settings → Integrations"
          })
        }
        if (projectSettings.jira_enabled === true) {
          jiraEnabled = true
        }
      }
      
      // If no project-specific setting, check global setting
      if (!jiraEnabled) {
        const config = await jiraLinkageService.getJiraLinkageConfig()
        if (!config.enabled) {
          return res.status(400).json({ 
            error: "Jira linkage is not enabled",
            details: "Enable it globally in Settings → Integrations or enable it for this project in Project Settings → Integrations"
          })
        }
        jiraEnabled = true
      }
      
      // Verify a Jira integration exists before attempting to create issue
      const config = await jiraLinkageService.getJiraLinkageConfig()
      if (!config.integrationId) {
        return res.status(400).json({ 
          error: "No Jira integration configured",
          details: "Please configure a Jira integration in Settings → Integrations before creating issues. Go to Settings → Integrations and add a Jira integration with valid credentials."
        })
      }
      
      // Create or link Jira issue (will use project settings if available)
      // Note: linkDocumentToJira now throws errors instead of returning null
      const result = await jiraLinkageService.linkDocumentToJira(
        documentId,
        issueTitle || document.name,
        document.project_id,
        confluenceUrl,
        issueDescription,
        issueType || undefined, // Use project settings if not provided
        priority || undefined   // Use project settings if not provided
      )
      
      log.info(`Manually created Jira issue ${result.issueKey} for document ${documentId}`)
      
      res.status(201).json({
        message: result.created ? "Jira issue created successfully" : "Document linked to existing Jira issue",
        issueKey: result.issueKey,
        issueUrl: result.issueUrl,
        created: result.created
      })
    } catch (error: any) {
      log.error("Failed to create Jira issue:", {
        error: error.message,
        stack: error.stack,
        documentId,
        userId: req.user?.id
      })
      
      // Provide more specific error messages
      let errorMessage = "Failed to create Jira issue"
      let errorDetails = error instanceof Error ? error.message : "Unknown error"
      
      // Check for common error types
      if (error.message?.includes("credentials") || error.message?.includes("authentication")) {
        errorDetails = "Invalid Jira credentials. Please verify your Jira integration credentials in Settings → Integrations."
      } else if (error.message?.includes("project") || error.message?.includes("Project")) {
        errorDetails = "Invalid Jira project key. Please verify the project key in your Jira integration settings."
      } else if (error.message?.includes("INVALID_INPUT") || error.message?.includes("400")) {
        errorDetails = "Invalid input to Jira API. This may be due to invalid issue type, priority, or other field values."
      } else if (error.message?.includes("401") || error.message?.includes("403")) {
        errorDetails = "Jira authentication failed. Please verify your API token and email in Settings → Integrations."
      } else if (error.message?.includes("404")) {
        errorDetails = "Jira project or resource not found. Please verify the project key and Jira instance URL."
      } else if (error.message?.includes("network") || error.message?.includes("ECONNREFUSED")) {
        errorDetails = "Network error connecting to Jira. Please verify the Jira instance URL is correct and accessible."
      }
      
      res.status(500).json({ 
        error: errorMessage,
        details: errorDetails,
        ...(process.env.NODE_ENV === 'development' && { 
          originalError: error.message,
          stack: error.stack 
        })
      })
    }
  }
)

// Test Jira connection for a specific integration
router.post("/test/:integrationId",
  authenticateToken,
  requirePermission("integrations.test"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const { integrationId } = req.params
    
    try {
      const { pool } = await import("../database/connection")
      
      // Get integration
      const integrationResult = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'jira' AND is_active = true`,
        [integrationId]
      )
      
      if (integrationResult.rows.length === 0) {
        return res.status(404).json({ error: "Jira integration not found or inactive" })
      }
      
      const integration = integrationResult.rows[0]
      
      // Decrypt credentials with validation
      let credentials: any
      try {
        const decryptedData = Buffer.from(integration.credentials_encrypted, "base64").toString("utf-8")
        credentials = JSON.parse(decryptedData)
        
        // Validate required credential fields
        if (!credentials.email || !credentials.apiToken) {
          return res.status(400).json({ error: "Invalid integration credentials: missing required fields" })
        }
      } catch (error) {
        log.error("Failed to decrypt Jira credentials:", error)
        return res.status(500).json({ error: "Failed to decrypt integration credentials" })
      }
      
      // Test connection
      const { JiraService } = await import("../services/jiraService")
      const jiraService = new JiraService({
        baseUrl: integration.configuration.baseUrl || credentials.baseUrl,
        email: credentials.email,
        apiToken: credentials.apiToken
      })
      
      const connected = await jiraService.testConnection()
      
      // Test project access if configured
      let projectAccess = null
      if (integration.configuration.defaultProjectKey) {
        try {
          await jiraService.getProject(integration.configuration.defaultProjectKey)
          projectAccess = integration.configuration.defaultProjectKey
        } catch (projectError) {
          log.warn(`Cannot access Jira project ${integration.configuration.defaultProjectKey}:`, projectError)
        }
      }
      
      res.json({
        success: connected,
        message: connected ? "Jira connection successful" : "Jira connection failed",
        details: {
          integrationName: integration.name,
          projectAccess: projectAccess,
          tested_at: new Date().toISOString()
        }
      })
    } catch (error) {
      log.error(`Failed to test Jira integration ${integrationId}:`, error)
      res.status(500).json({ 
        error: "Failed to test Jira connection",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

export default router