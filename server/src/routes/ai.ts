import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, schemas } from "../middleware/validation"
import { logger } from "../utils/logger"
import { aiService } from "../services/aiService"
import { addJob } from "../services/queueService"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Generate content using AI
router.post("/generate", 
  authenticateToken, 
  requirePermission("ai.generate"),
  validate(schemas.aiGenerate),
  async (req, res) => {
    try {
      const { prompt, provider, model, temperature, max_tokens, template_id, variables } = req.body

      // Check if provider exists and is active
      const providerCheck = await pool.query(
        "SELECT id, name, provider_type FROM ai_providers WHERE name = $1 AND is_active = true",
        [provider]
      )

      if (providerCheck.rows.length === 0) {
        return res.status(400).json({ error: "Provider not found or inactive" })
      }

      // For long-running requests, use job queue
      if (prompt.length > 2000 || max_tokens > 2000) {
        const jobId = uuidv4()
        
        await addJob("ai-generate", {
          jobId,
          userId: req.user?.id,
          prompt,
          provider,
          model,
          temperature,
          max_tokens,
          template_id,
          variables,
        })

        return res.status(202).json({
          message: "AI generation job queued",
          jobId,
          status: "queued",
        })
      }

      // For quick requests, process immediately
      const result = await aiService.generate({
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
      })

      // Update usage stats
      if (result.usage) {
        await aiService.updateUsageStats(provider, result.usage)
      }

      // Log the generation
      await pool.query(
        `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
        VALUES ($1, 'ai_generate', 'ai_provider', $2, $3)
      `,
        [req.user?.id, providerCheck.rows[0].id, JSON.stringify({
          prompt_length: prompt.length,
          provider,
          model: result.model,
          usage: result.usage,
        })]
      )

      res.json({
        message: "Content generated successfully",
        result,
      })
    } catch (error) {
      logger.error("AI generation error:", error)
      res.status(500).json({ 
        error: "AI generation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

// Get available AI providers
router.get("/providers", authenticateToken, async (req, res) => {
  try {
    const providers = await aiService.getAvailableProviders()
    res.json({ providers })
  } catch (error) {
    logger.error("Get AI providers error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get AI provider details
router.get("/providers/:name", 
  authenticateToken,
  validateParams(Joi.object({ name: Joi.string().required() })),
  async (req, res) => {
    try {
      const { name } = req.params

      const result = await pool.query(
        `
        SELECT name, provider_type, configuration, is_active, usage_stats, created_at, updated_at
        FROM ai_providers 
        WHERE name = $1
      `,
        [name]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }

      const provider = result.rows[0]
      
      // Remove sensitive information for non-admin users
      if (req.user?.role !== "admin") {
        delete provider.configuration
      }

      res.json({ provider })
    } catch (error) {
      logger.error("Get AI provider error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Configure AI provider (admin only)
router.post("/providers/:name/configure", 
  authenticateToken, 
  requirePermission("ai.configure"),
  validateParams(Joi.object({ name: Joi.string().required() })),
  validate(Joi.object({
    api_key: Joi.string().required(),
    configuration: Joi.object().default({}),
    is_active: Joi.boolean().default(true),
  })),
  async (req, res) => {
    try {
      const { name } = req.params
      const { api_key, configuration, is_active } = req.body

      // Encrypt API key (simple base64 for now, should use proper encryption)
      const encryptedApiKey = Buffer.from(api_key).toString("base64")

      // Check if provider exists
      const existingProvider = await pool.query(
        "SELECT id FROM ai_providers WHERE name = $1",
        [name]
      )

      let result
      if (existingProvider.rows.length > 0) {
        // Update existing provider
        result = await pool.query(
          `
          UPDATE ai_providers 
          SET api_key_encrypted = $1, configuration = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
          WHERE name = $4
          RETURNING name, provider_type, is_active, created_at, updated_at
        `,
          [encryptedApiKey, JSON.stringify(configuration), is_active, name]
        )
      } else {
        return res.status(404).json({ error: "Provider not found. Create provider first." })
      }

      // Re-initialize providers
      await aiService.initializeProviders()

      logger.info(`AI provider configured: ${name} by ${req.user?.email}`)

      res.json({
        message: "Provider configured successfully",
        provider: result.rows[0],
      })
    } catch (error) {
      logger.error("Configure AI provider error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Create AI provider (admin only)
router.post("/providers", 
  authenticateToken, 
  requirePermission("ai.configure"),
  validate(Joi.object({
    name: Joi.string().min(2).max(100).required(),
    provider_type: Joi.string().valid("openai", "google", "azure").required(),
    api_key: Joi.string().required(),
    configuration: Joi.object().default({}),
    is_active: Joi.boolean().default(true),
  })),
  async (req, res) => {
    try {
      const { name, provider_type, api_key, configuration, is_active } = req.body

      // Check if provider name already exists
      const existingProvider = await pool.query(
        "SELECT id FROM ai_providers WHERE name = $1",
        [name]
      )

      if (existingProvider.rows.length > 0) {
        return res.status(400).json({ error: "Provider name already exists" })
      }

      // Encrypt API key
      const encryptedApiKey = Buffer.from(api_key).toString("base64")

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, provider_type, is_active, created_at, updated_at
      `,
        [id, name, provider_type, encryptedApiKey, JSON.stringify(configuration), is_active]
      )

      // Initialize the new provider
      await aiService.addProvider({
        name,
        type: provider_type as any,
        apiKey: api_key,
        configuration,
      })

      logger.info(`AI provider created: ${name} (${provider_type}) by ${req.user?.email}`)

      res.status(201).json({
        message: "Provider created successfully",
        provider: result.rows[0],
      })
    } catch (error) {
      logger.error("Create AI provider error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete AI provider (admin only)
router.delete("/providers/:name", 
  authenticateToken, 
  requirePermission("ai.configure"),
  validateParams(Joi.object({ name: Joi.string().required() })),
  async (req, res) => {
    try {
      const { name } = req.params

      const result = await pool.query(
        "DELETE FROM ai_providers WHERE name = $1 RETURNING name",
        [name]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }

      // Re-initialize providers
      await aiService.initializeProviders()

      logger.info(`AI provider deleted: ${name} by ${req.user?.email}`)

      res.json({ message: "Provider deleted successfully" })
    } catch (error) {
      logger.error("Delete AI provider error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get AI generation history
router.get("/history", 
  authenticateToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      const result = await pool.query(
        `
        SELECT al.*, ap.name as provider_name, ap.provider_type
        FROM audit_logs al
        LEFT JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.user_id = $1 AND al.action = 'ai_generate'
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3
      `,
        [req.user?.id, limit, offset]
      )

      const countResult = await pool.query(
        "SELECT COUNT(*) FROM audit_logs WHERE user_id = $1 AND action = 'ai_generate'",
        [req.user?.id]
      )

      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        history: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      logger.error("Get AI history error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get OpenAI provider statistics
router.get(
  "/openai/stats/:name?",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.params
      const stats = await aiService.getOpenAIProviderStats(name)
      
      if (!stats) {
        return res.status(404).json({ error: "Provider not found or stats unavailable" })
      }

      res.json({ stats })
    } catch (error) {
      logger.error("Get OpenAI stats error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Test OpenAI provider connection
router.post(
  "/openai/test/:name",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.params
      
      // Verify provider exists
      const providerCheck = await pool.query(
        "SELECT name FROM ai_providers WHERE name = $1 AND provider_type = 'openai'",
        [name]
      )

      if (providerCheck.rows.length === 0) {
        return res.status(404).json({ error: "OpenAI provider not found" })
      }

      const isConnected = await aiService.testOpenAIConnection(name)
      
      res.json({ 
        provider: name,
        connected: isConnected,
        tested_at: new Date().toISOString()
      })
    } catch (error) {
      logger.error("Test OpenAI connection error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get OpenAI models for a specific provider
router.get(
  "/openai/models/:name",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.params
      
      // Verify provider exists
      const providerCheck = await pool.query(
        "SELECT name FROM ai_providers WHERE name = $1 AND provider_type = 'openai'",
        [name]
      )

      if (providerCheck.rows.length === 0) {
        return res.status(404).json({ error: "OpenAI provider not found" })
      }

      // Import openaiConnector directly for this specific functionality
      const { openaiConnector } = await import("../modules/ai/openai")
      const models = await openaiConnector.getAvailableModels(name)
      
      res.json({ 
        provider: name,
        models: models,
        fetched_at: new Date().toISOString()
      })
    } catch (error) {
      logger.error("Get OpenAI models error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Enhanced generate endpoint with failover information
router.post(
  "/generate/enhanced",
  async (req: express.Request, res: express.Response) => {
    try {
      const { prompt, provider, model, temperature, max_tokens, template_id, variables } = req.body

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" })
      }

      // Check if provider exists and is active
      const providerCheck = await pool.query(
        "SELECT id, name, provider_type FROM ai_providers WHERE name = $1 AND is_active = true",
        [provider]
      )

      if (providerCheck.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found or inactive" })
      }

      const providerInfo = providerCheck.rows[0]
      const startTime = Date.now()

      try {
        const result = await aiService.generate({
          prompt,
          provider,
          model,
          temperature,
          max_tokens,
          template_id,
          variables,
        })

        const duration = Date.now() - startTime

        // Log successful generation
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            req.user?.id || null,
            "ai_generate_enhanced",
            "ai_provider",
            providerInfo.id,
            JSON.stringify({
              model: result.model,
              usage: result.usage,
              duration_ms: duration,
              provider_type: providerInfo.provider_type,
              template_id,
            }),
          ]
        )

        res.json({
          ...result,
          metadata: {
            ...result.metadata,
            duration_ms: duration,
            requested_provider: provider,
            actual_provider: result.provider,
            failover_used: provider !== result.provider,
          }
        })

      } catch (generationError) {
        const duration = Date.now() - startTime
        
        // Log failed generation
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            req.user?.id || null,
            "ai_generate_enhanced_failed",
            "ai_provider",
            providerInfo.id,
            JSON.stringify({
              error: generationError.message,
              duration_ms: duration,
              provider_type: providerInfo.provider_type,
              template_id,
            }),
          ]
        )

        throw generationError
      }

    } catch (error) {
      logger.error("Enhanced AI generation error:", error)
      res.status(500).json({ 
        error: "AI generation failed",
        details: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
)

export default router
