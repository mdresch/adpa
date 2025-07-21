import express from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { GitHubIntegration } from "../integrations/github"
import { GitHubService } from "../services/githubService"
import Joi from "joi"

const router = express.Router()

// Get GitHub repository information
router.get(
  "/:id/repository",
  authenticateToken,
  requirePermission("integrations.view"),
  async (req, res) => {
    try {
      const integrationId = req.params.id

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub service
      const githubService = new GitHubService({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: configuration.default_branch
      })

      // Get repository information
      const repository = await githubService.getRepository()

      res.json({
        success: true,
        repository
      })
    } catch (error) {
      logger.error("Failed to get GitHub repository:", error)
      res.status(500).json({ error: "Failed to get repository information" })
    }
  }
)

// Get GitHub pull requests
router.get(
  "/:id/pull-requests",
  authenticateToken,
  requirePermission("integrations.view"),
  async (req, res) => {
    try {
      const integrationId = req.params.id
      const state = req.query.state as string || "open"

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub integration
      const githubIntegration = new GitHubIntegration({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: configuration.default_branch
      }, integrationId)

      // Get pull requests
      const pullRequests = await githubIntegration.getPullRequests(state as any)

      res.json({
        success: true,
        pullRequests
      })
    } catch (error) {
      logger.error("Failed to get GitHub pull requests:", error)
      res.status(500).json({ error: "Failed to get pull requests" })
    }
  }
)

// Get GitHub issues
router.get(
  "/:id/issues",
  authenticateToken,
  requirePermission("integrations.view"),
  async (req, res) => {
    try {
      const integrationId = req.params.id
      const state = req.query.state as string || "open"

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub integration
      const githubIntegration = new GitHubIntegration({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: configuration.default_branch
      }, integrationId)

      // Get issues
      const issues = await githubIntegration.getIssues(state as any)

      res.json({
        success: true,
        issues
      })
    } catch (error) {
      logger.error("Failed to get GitHub issues:", error)
      res.status(500).json({ error: "Failed to get issues" })
    }
  }
)

// Test GitHub connection
router.post(
  "/:id/test",
  authenticateToken,
  requirePermission("integrations.manage"),
  async (req, res) => {
    try {
      const integrationId = req.params.id

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub integration
      const githubIntegration = new GitHubIntegration({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: configuration.default_branch
      }, integrationId)

      // Test connection
      const isConnected = await githubIntegration.authenticate()

      if (isConnected) {
        res.json({
          success: true,
          message: "GitHub connection successful"
        })
      } else {
        res.status(400).json({
          success: false,
          error: "GitHub connection failed"
        })
      }
    } catch (error) {
      logger.error("GitHub connection test failed:", error)
      res.status(500).json({ error: "Connection test failed" })
    }
  }
)

// Sync templates from GitHub
router.post(
  "/:id/sync",
  authenticateToken,
  requirePermission("integrations.manage"),
  validate(Joi.object({
    syncType: Joi.string().valid("templates", "documents", "all").default("templates"),
    targetBranch: Joi.string(),
    createPullRequests: Joi.boolean()
  })),
  async (req, res) => {
    try {
      const integrationId = req.params.id
      const { syncType, targetBranch, createPullRequests } = req.body

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub integration
      const githubIntegration = new GitHubIntegration({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: targetBranch || configuration.default_branch
      }, integrationId)

      // Sync templates
      const syncedDocuments = await githubIntegration.syncDocuments()

      // Update last sync time
      await pool.query(
        `UPDATE integrations SET last_sync = CURRENT_TIMESTAMP, sync_status = 'success' WHERE id = $1`,
        [integrationId]
      )

      res.json({
        success: true,
        message: "GitHub sync completed successfully",
        count: syncedDocuments.length,
        documents: syncedDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          framework: doc.framework,
          status: doc.status
        }))
      })
    } catch (error) {
      logger.error("GitHub sync failed:", error)

      // Update sync status to error
      await pool.query(
        `UPDATE integrations SET sync_status = 'error' WHERE id = $1`,
        [req.params.id]
      )

      res.status(500).json({ error: "Sync failed", message: error.message })
    }
  }
)

// Create a pull request
router.post(
  "/:id/pull-request",
  authenticateToken,
  requirePermission("integrations.manage"),
  validate(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    sourceBranch: Joi.string().required(),
    targetBranch: Joi.string().default("main")
  })),
  async (req, res) => {
    try {
      const integrationId = req.params.id
      const { title, description, sourceBranch, targetBranch } = req.body

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub integration
      const githubIntegration = new GitHubIntegration({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: configuration.default_branch
      }, integrationId)

      // Create pull request
      const pullRequest = await githubIntegration.createPullRequest(
        title,
        description,
        sourceBranch,
        targetBranch
      )

      res.json({
        success: true,
        pullRequest
      })
    } catch (error) {
      logger.error("Failed to create GitHub pull request:", error)
      res.status(500).json({ error: "Failed to create pull request" })
    }
  }
)

// Create an issue
router.post(
  "/:id/issue",
  authenticateToken,
  requirePermission("integrations.manage"),
  validate(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    labels: Joi.array().items(Joi.string()),
    assignees: Joi.array().items(Joi.string())
  })),
  async (req, res) => {
    try {
      const integrationId = req.params.id
      const { title, description, labels, assignees } = req.body

      // Get integration from database
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1 AND type = 'github'`,
        [integrationId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "GitHub integration not found" })
      }

      const integration = result.rows[0]
      const configuration = integration.configuration
      const credentials = JSON.parse(Buffer.from(integration.credentials_encrypted, "base64").toString())

      // Create GitHub integration
      const githubIntegration = new GitHubIntegration({
        owner: configuration.owner,
        repo: configuration.repo,
        apiToken: credentials.api_token,
        defaultBranch: configuration.default_branch
      }, integrationId)

      // Create issue
      const issue = await githubIntegration.createIssue(
        title,
        description,
        labels,
        assignees
      )

      res.json({
        success: true,
        issue
      })
    } catch (error) {
      logger.error("Failed to create GitHub issue:", error)
      res.status(500).json({ error: "Failed to create issue" })
    }
  }
)

export default router
