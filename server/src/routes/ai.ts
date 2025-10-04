import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams, schemas } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { aiService } from "../services/aiService"
import { ContextAwareAIService, generateWithContext } from "../modules/context/integration"
import { addJob } from "../services/queueService"
import { v4 as uuidv4 } from "uuid"
import { openaiConnector } from "../modules/ai/openai"
import { googleConnector } from "../modules/ai/google"
import { mistralConnector } from "../modules/ai/mistral"

const router = express.Router()

// Generate content using AI
router.post("/generate", 
  authenticateToken, 
  requirePermission("ai.generate"),
  validate(schemas.aiGenerate),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
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
      // If client requested context-aware generation or provided contextual identifiers, use ContextAwareAIService
      const useContext = req.query.use_context === 'true' || !!req.body.project_id || !!req.body.document_ids || !!req.body.template_id

      let result
      if (useContext) {
        result = await ContextAwareAIService.generateWithContext({
          prompt,
          provider,
          model,
          temperature,
          max_tokens,
          template_id,
          variables,
          user_id: req.user?.id,
          project_id: req.body.project_id,
          document_ids: req.body.document_ids,
          include_integrations: req.body.include_integrations,
          custom_context: req.body.custom_context,
        })
      } else {
        result = await aiService.generate({
          prompt,
          provider,
          model,
          temperature,
          max_tokens,
          template_id,
          variables,
        })
      }

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
      log.error("AI generation error:", error)
      res.status(500).json({ 
        error: "AI generation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }
)

// Get available AI providers
router.get("/providers", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const providers = await aiService.getAvailableProviders()
    res.json({ providers })
  } catch (error) {
    log.error("Get AI providers error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Toggle AI provider active status
router.post("/providers/:id/toggle", 
  authenticateToken,
  requirePermission("ai.configure"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      
      // Get current status
      const result = await pool.query(
        "SELECT is_active FROM ai_providers WHERE id = $1",
        [id]
      )
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }
      
      const currentStatus = result.rows[0].is_active
      const newStatus = !currentStatus
      
      // Update status
      await pool.query(
        "UPDATE ai_providers SET is_active = $1, updated_at = NOW() WHERE id = $2",
        [newStatus, id]
      )
      
      log.info(`Toggled provider ${id} from ${currentStatus} to ${newStatus}`)
      res.json({ 
        success: true, 
        is_active: newStatus,
        message: `Provider ${newStatus ? 'activated' : 'deactivated'} successfully`
      })
      
    } catch (error) {
      log.error("Toggle provider error:", error)
      res.status(500).json({ error: "Failed to toggle provider" })
    }
  }
)

// Get available models for a specific AI provider
router.get("/providers/:id/models", 
  authenticateToken,
  requirePermission("ai.read"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      
      // Get provider information
      const providerResult = await pool.query(
        'SELECT id, name, provider_type, configuration FROM ai_providers WHERE id = $1',
        [id]
      )
      
      if (providerResult.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }
      
      const provider = providerResult.rows[0]
      const config = JSON.parse(provider.configuration || '{}')
      
      let models: any[] = []
      
      // Get models based on provider type
      switch (provider.provider_type) {
        case 'openai':
          models = await openaiConnector.getAvailableModels(provider.name)
          break
        case 'google':
          models = await googleConnector.getAvailableModels(provider.name)
          break
        case 'mistral':
          models = await mistralConnector.getAvailableModels(provider.name)
          break
        case 'azure':
          // Azure models are typically deployment-specific
          models = [
            { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, maxTokens: 4096 },
            { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo', contextWindow: 4096, maxTokens: 2048 },
            { id: 'gpt-4-32k', name: 'GPT-4 32K', contextWindow: 32768, maxTokens: 8192 }
          ]
          break
        case 'ollama':
          // For Ollama, we'll return a generic list since models are installed locally
          models = [
            { id: 'llama3.1:latest', name: 'Llama 3.1 Latest', contextWindow: 128000, maxTokens: 4096 },
            { id: 'llama3.1:8b', name: 'Llama 3.1 8B', contextWindow: 128000, maxTokens: 4096 },
            { id: 'llama3.1:70b', name: 'Llama 3.1 70B', contextWindow: 128000, maxTokens: 4096 },
            { id: 'codellama:latest', name: 'Code Llama Latest', contextWindow: 16384, maxTokens: 4096 },
            { id: 'mistral:latest', name: 'Mistral Latest', contextWindow: 32768, maxTokens: 4096 }
          ]
          break
        default:
          models = []
      }
      
      // Convert string models to objects with metadata
      const modelsWithMetadata = models.map((model, index) => {
        if (typeof model === 'string') {
          return {
            id: model,
            name: model,
            contextWindow: getDefaultContextWindow(model, provider.provider_type),
            maxTokens: getDefaultMaxTokens(model, provider.provider_type),
            temperature: 0.7,
            type: 'chat'
          }
        }
        return model
      })
      
      res.json({ 
        success: true, 
        models: modelsWithMetadata,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.provider_type
        }
      })
      
    } catch (error) {
      log.error("Get provider models error:", error)
      res.status(500).json({ error: "Failed to get provider models" })
    }
  }
)

// Helper functions for default model parameters
function getDefaultContextWindow(modelId: string, providerType: string): number {
  const contextWindows: Record<string, Record<string, number>> = {
    openai: {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4-32k': 32768,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    },
    google: {
      'gemini-pro': 32768,
      'gemini-pro-vision': 16384,
      'gemini-1.5-pro': 2000000,
      'gemini-1.5-flash': 1000000,
      'gemini-2.5-flash': 2000000
    },
    mistral: {
      'mistral-large-latest': 128000,
      'mistral-medium-latest': 32000,
      'mistral-small-latest': 32000,
      'mistral-tiny': 8000
    }
  }
  
  return contextWindows[providerType]?.[modelId] || 4096
}

function getDefaultMaxTokens(modelId: string, providerType: string): number {
  const maxTokens: Record<string, Record<string, number>> = {
    openai: {
      'gpt-4': 4096,
      'gpt-4-turbo': 4096,
      'gpt-4-32k': 8192,
      'gpt-3.5-turbo': 2048,
      'gpt-3.5-turbo-16k': 4096
    },
    google: {
      'gemini-pro': 2048,
      'gemini-pro-vision': 4096,
      'gemini-1.5-pro': 8192,
      'gemini-1.5-flash': 8192,
      'gemini-2.5-flash': 8192
    },
    mistral: {
      'mistral-large-latest': 8192,
      'mistral-medium-latest': 4096,
      'mistral-small-latest': 2048,
      'mistral-tiny': 1024
    }
  }
  
  return maxTokens[providerType]?.[modelId] || 2048
}

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
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get AI provider error:", error)
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

  const log = childLogger({ requestId: (req as any).requestId })
  log.info(`AI provider configured: ${name} by ${req.user?.email}`)

      res.json({
        message: "Provider configured successfully",
        provider: result.rows[0],
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Configure AI provider error:", error)
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
    provider_type: Joi.string().valid("openai", "google", "azure", "mistral", "ollama").required(),
    api_key: Joi.string().required(),
    configuration: Joi.object().default({}),
    is_active: Joi.boolean().default(true),
    // Model parameters
    contextWindow: Joi.number().integer().min(1000).max(10000000).default(128000),
    maxTokens: Joi.number().integer().min(1).max(100000).default(4096),
    temperature: Joi.number().min(0).max(2).default(0.7),
    topP: Joi.number().min(0).max(1).default(1.0),
    frequencyPenalty: Joi.number().min(-2).max(2).default(0.0),
    presencePenalty: Joi.number().min(-2).max(2).default(0.0),
  })),
  async (req, res) => {
    try {
      const { 
        name, 
        provider_type, 
        api_key, 
        configuration, 
        is_active,
        contextWindow,
        maxTokens,
        temperature,
        topP,
        frequencyPenalty,
        presencePenalty
      } = req.body

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

      // Create enhanced configuration with model parameters
      const enhancedConfiguration = {
        ...configuration,
        modelParameters: {
          contextWindow,
          maxTokens,
          temperature,
          topP,
          frequencyPenalty,
          presencePenalty
        }
      }

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, provider_type, is_active, created_at, updated_at
      `,
        [id, name, provider_type, encryptedApiKey, JSON.stringify(enhancedConfiguration), is_active]
      )

      // Initialize the new provider
      await aiService.addProvider({
        name,
        type: provider_type as any,
        apiKey: api_key,
        configuration: enhancedConfiguration,
      })

  const log = childLogger({ requestId: (req as any).requestId })
  log.info(`AI provider created: ${name} (${provider_type}) by ${req.user?.email}`)

      res.status(201).json({
        message: "Provider created successfully",
        provider: result.rows[0],
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Create AI provider error:", error)
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

  const log = childLogger({ requestId: (req as any).requestId })
  log.info(`AI provider deleted: ${name} by ${req.user?.email}`)

      res.json({ message: "Provider deleted successfully" })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Delete AI provider error:", error)
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
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get AI history error:", error)
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
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get OpenAI stats error:", error)
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
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Test OpenAI connection error:", error)
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
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get OpenAI models error:", error)
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
        // Use context-aware generation for enhanced endpoint
        const result = await ContextAwareAIService.generateWithContext({
          prompt,
          provider,
          model,
          temperature,
          max_tokens,
          template_id,
          variables,
          user_id: req.user?.id,
          project_id: req.body.project_id,
          document_ids: req.body.document_ids,
          include_integrations: req.body.include_integrations,
          custom_context: req.body.custom_context,
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
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Enhanced AI generation error:", error)
      res.status(500).json({ 
        error: "AI generation failed",
        details: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
)

// Get Google AI provider statistics
router.get(
  "/google/stats/:name?",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.params
      const stats = await aiService.getGoogleAIProviderStats(name)
      
      if (!stats) {
        return res.status(404).json({ error: "Provider not found or stats unavailable" })
      }

      res.json({ stats })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get Google AI stats error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Test Google AI provider connection
router.post(
  "/google/test/:name",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.params
      
      // Verify provider exists
      const providerCheck = await pool.query(
        "SELECT name FROM ai_providers WHERE name = $1 AND provider_type = 'google'",
        [name]
      )
      
      if (providerCheck.rows.length === 0) {
        return res.status(404).json({ error: "Google AI provider not found" })
      }
      
      const isConnected = await aiService.testGoogleAIConnection(name)
      
      res.json({ 
        connected: isConnected,
        provider: name,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Test Google AI connection error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get available models for Google AI provider
router.get(
  "/google/models/:name",
  async (req: express.Request, res: express.Response) => {
    try {
      const { name } = req.params
      
      // Verify provider exists
      const providerCheck = await pool.query(
        "SELECT name FROM ai_providers WHERE name = $1 AND provider_type = 'google'",
        [name]
      )
      
      if (providerCheck.rows.length === 0) {
        return res.status(404).json({ error: "Google AI provider not found" })
      }
      
      // Import googleConnector directly for this specific functionality
      const { googleConnector } = await import("../modules/ai/google")
      const models = await googleConnector.getAvailableModels(name)
      
      res.json({ 
        provider: name,
        models: models,
        fetched_at: new Date().toISOString()
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get Google AI models error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
