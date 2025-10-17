/**
 * Context-Aware AI Routes
 * 
 * Enhanced AI routes that use the context injection system.
 */

import express from "express"
import { ContextAwareAIService } from "../modules/context/integration"
import { ContextPriority } from "../modules/context/types"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate, validateParams } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import Joi from "joi"
import { v4 as uuidv4 } from "uuid"
import { aiService } from "../services/aiService"

const router = express.Router()

/**
 * POST /api/context-ai/generate
 * Generate AI response with automatic context injection
 */
router.post("/generate", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { 
      prompt, 
      provider, 
      model, 
      temperature, 
      max_tokens,
      user_id,
      project_id,
      document_ids,
      template_id,
      include_integrations,
      max_context_tokens,
      context_priority,
      custom_context
    } = req.body

    // Validate required fields
    if (!prompt || !provider || !user_id) {
      return res.status(400).json({
        error: "Missing required fields: prompt, provider, user_id"
      })
    }

    // Check if provider exists and is active
    const providerCheck = await pool.query(
      "SELECT * FROM ai_providers WHERE name = $1 AND is_active = true",
      [provider]
    )

    if (providerCheck.rows.length === 0) {
      return res.status(404).json({
        error: `Provider '${provider}' not found or inactive`
      })
    }

    // Create job record
    const jobId = uuidv4()
    await pool.query(`
      INSERT INTO jobs (id, type, status, data, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      jobId,
      'context_ai_generation',
      'pending',
      JSON.stringify({
        prompt,
        provider,
        model,
        project_id,
        document_ids,
        template_id,
        include_integrations,
        max_context_tokens,
        context_priority,
        custom_context
      }),
      user_id
    ])

    // Generate response with context
    const startTime = Date.now()
    
  const response = await ContextAwareAIService.generateWithContext({
      prompt,
      provider,
      model,
      temperature,
      max_tokens,
      user_id,
      project_id,
      document_ids,
      template_id,
      include_integrations,
      max_context_tokens,
      context_priority,
      custom_context
    })

    const duration = Date.now() - startTime

  // Update job with success
    await pool.query(`
      UPDATE jobs 
      SET status = $1, result = $2, completed_at = CURRENT_TIMESTAMP, progress = 100
      WHERE id = $3
    `, [
      'completed',
      JSON.stringify({
        content: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        context_summary: response.context_summary,
        context_warnings: response.context_warnings,
        context_token_usage: response.context_token_usage,
        duration
      }),
      jobId
    ])

    res.json({
      job_id: jobId,
      content: response.content,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      context_summary: response.context_summary,
      context_warnings: response.context_warnings,
      context_token_usage: response.context_token_usage,
      duration,
      metadata: response.metadata
    })

  } catch (error) {
    log.error("Context-aware AI generation failed:", error)
    // Update job with error if jobId exists
    if (req.body.jobId) {
      await pool.query(`
        UPDATE jobs 
        SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, ['failed', error.message, req.body.jobId])
    }

    res.status(500).json({
      error: "AI generation failed",
      message: error.message
    })
  }
})

/**
 * POST /api/context-ai/preview
 * Get context preview without generating AI response
 */
router.post("/preview", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      prompt,
      user_id,
      project_id,
      document_ids,
      template_id,
      include_integrations,
      max_context_tokens,
      context_priority,
      custom_context,
      model = 'gpt-3.5-turbo'
    } = req.body

    if (!prompt || !user_id) {
      return res.status(400).json({
        error: "Missing required fields: prompt, user_id"
      })
    }

    const preview = await ContextAwareAIService.getContextPreview({
      prompt,
      user_id,
      model,
      project_id,
      document_ids,
      template_id,
      include_integrations,
      max_context_tokens,
      context_priority,
      custom_context
    })

    res.json(preview)

  } catch (error) {
    log.error("Context preview failed:", error)
    res.status(500).json({
      error: "Context preview failed",
      message: error.message
    })
  }
})

/**
 * POST /api/context-ai/statistics
 * Get context statistics and recommendations
 */
router.post("/statistics", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      prompt,
      user_id,
      project_id,
      document_ids,
      template_id,
      include_integrations,
      max_context_tokens,
      context_priority,
      custom_context,
      model = 'gpt-3.5-turbo'
    } = req.body

    if (!prompt || !user_id) {
      return res.status(400).json({
        error: "Missing required fields: prompt, user_id"
      })
    }

    const statistics = await ContextAwareAIService.getContextStatistics({
      prompt,
      user_id,
      model,
      project_id,
      document_ids,
      template_id,
      include_integrations,
      max_context_tokens,
      context_priority,
      custom_context
    })

    res.json(statistics)

  } catch (error) {
    log.error("Context statistics failed:", error)
    res.status(500).json({
      error: "Context statistics failed",
      message: error.message
    })
  }
})

/**
 * POST /api/context-ai/batch
 * Process multiple context-aware AI requests
 */
router.post("/batch", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { requests } = req.body

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        error: "Requests array is required and must not be empty"
      })
    }

    if (requests.length > 10) {
      return res.status(400).json({
        error: "Maximum 10 requests allowed per batch"
      })
    }

    // Validate all requests have required fields
    for (const request of requests) {
      if (!request.prompt || !request.provider || !request.user_id) {
        return res.status(400).json({
          error: "All requests must have prompt, provider, and user_id"
        })
      }
    }

    const startTime = Date.now()
    const responses = await ContextAwareAIService.batchGenerateWithContext(requests)
    const duration = Date.now() - startTime

    res.json({
      responses,
      batch_duration: duration,
      total_requests: requests.length,
      successful_requests: responses.filter(r => !r.metadata?.error).length
    })

  } catch (error) {
    log.error("Batch context-aware AI generation failed:", error)
    res.status(500).json({
      error: "Batch AI generation failed",
      message: error.message
    })
  }
})

/**
 * GET /api/context-ai/providers
 * Get available providers with context capabilities
 */
router.get("/providers", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const result = await pool.query(`
      SELECT id, name, provider_type, configuration, is_active, priority, created_at, updated_at
      FROM ai_providers 
      WHERE is_active = true
      ORDER BY name
    `)

    const providers = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.provider_type,
      is_active: row.is_active,
      priority: row.priority,
      supports_context: true, // All providers support context injection
      configuration: {
        // Only expose non-sensitive configuration
        model: row.configuration?.model,
        models: row.configuration?.models || [],
        max_tokens: row.configuration?.max_tokens,
        default_model: row.configuration?.default_model,
        endpoint: row.configuration?.endpoint,
        priority: row.configuration?.priority
      }
    }))

    res.json({ providers })

  } catch (error) {
    log.error("Failed to get context-aware providers:", error)
    res.status(500).json({
      error: "Failed to get providers",
      message: error.message
    })
  }
})

/**
 * POST /api/context-ai/providers/:id/configure
 * Update an existing AI provider configuration
 */
router.post("/providers/:id/configure", 
  authenticateToken,
  requirePermission("ai.configure"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    api_key: Joi.string().optional(),
    configuration: Joi.object().optional(),
    is_active: Joi.boolean().optional(),
    // Model parameters
    contextWindow: Joi.number().integer().min(1000).max(10000000).optional(),
    maxTokens: Joi.number().integer().min(1).max(100000).optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    topP: Joi.number().min(0).max(1).optional(),
    frequencyPenalty: Joi.number().min(-2).max(2).optional(),
    presencePenalty: Joi.number().min(-2).max(2).optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { id } = req.params
      const { 
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

      // Check if provider exists
      const existingProvider = await pool.query(
        "SELECT id, name, provider_type FROM ai_providers WHERE id = $1",
        [id]
      )

      if (existingProvider.rows.length === 0) {
        return res.status(404).json({ error: "Provider not found" })
      }

      const provider = existingProvider.rows[0]
      let updateFields: string[] = []
      let updateValues: any[] = []
      let paramCount = 1

      // Update API key if provided
      if (api_key) {
        const encryptedApiKey = Buffer.from(api_key).toString("base64")
        updateFields.push(`api_key_encrypted = $${paramCount}`)
        updateValues.push(encryptedApiKey)
        paramCount++
      }

      // Update configuration if provided
      if (configuration || contextWindow || maxTokens || temperature || topP || frequencyPenalty || presencePenalty || api_key) {
        // Get existing configuration
        const existingConfig = await pool.query(
          "SELECT configuration FROM ai_providers WHERE id = $1",
          [id]
        )
        
        let existingConfigObj = {}
        if (existingConfig.rows.length > 0 && existingConfig.rows[0].configuration) {
          const config = existingConfig.rows[0].configuration
          // Check if configuration is already an object or needs to be parsed
          existingConfigObj = typeof config === 'string' ? JSON.parse(config) : config
        }

        // Merge configurations and ensure API key is synced
        const updatedConfig = {
          ...existingConfigObj,
          ...configuration,
          modelParameters: {
            ...existingConfigObj.modelParameters,
            ...(contextWindow && { contextWindow }),
            ...(maxTokens && { maxTokens }),
            ...(temperature && { temperature }),
            ...(topP && { topP }),
            ...(frequencyPenalty && { frequencyPenalty }),
            ...(presencePenalty && { presencePenalty })
          }
        }

        // If API key is being updated, sync it to configuration.apiKey
        if (api_key) {
          updatedConfig.apiKey = api_key
        }

        updateFields.push(`configuration = $${paramCount}`)
        updateValues.push(JSON.stringify(updatedConfig))
        paramCount++
      }

      // Update active status if provided
      if (typeof is_active === 'boolean') {
        updateFields.push(`is_active = $${paramCount}`)
        updateValues.push(is_active)
        paramCount++
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      updateValues.push(id)

      if (updateFields.length === 1) { // Only updated_at
        return res.status(400).json({ error: "No fields to update" })
      }

      const updateQuery = `
        UPDATE ai_providers 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, provider_type, is_active, updated_at
      `

      const result = await pool.query(updateQuery, updateValues)

      // Re-initialize providers if API key was updated
      if (api_key) {
        await aiService.initializeProviders()
        log.info(`AI providers reinitialized after API key update`)
      }

      log.info(`AI provider updated: ${provider.name} (${provider.provider_type}) by ${req.user?.email}`)

      res.json({
        message: "Provider updated successfully",
        provider: result.rows[0]
      })

    } catch (error) {
      log.error("Failed to update AI provider:", error)
      res.status(500).json({
        error: "Failed to update provider",
        message: error.message
      })
    }
  }
)

/**
 * POST /api/context-ai/providers
 * Create a new AI provider with context capabilities
 */
router.post("/providers", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name, provider_type, api_key, configuration } = req.body

    // Validate required fields
    if (!name || !provider_type || !api_key) {
      return res.status(400).json({
        error: "Missing required fields: name, provider_type, api_key"
      })
    }

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

    const result = await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, provider_type, is_active, created_at, updated_at
    `, [
      id, 
      name, 
      provider_type, 
      encryptedApiKey, 
      JSON.stringify(configuration || {}), 
      true // Set as active by default
    ])

    log.info(`AI provider created: ${name} (${provider_type})`)

    res.status(201).json({
      message: "Provider created successfully",
      provider: result.rows[0]
    })

  } catch (error) {
    log.error("Failed to create AI provider:", error)
    res.status(500).json({
      error: "Failed to create provider",
      message: error.message
    })
  }
})

/**
 * GET /api/context-ai/priority-options
 * Get available context priority options
 */
router.get("/priority-options", (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  log.info("Returning context priority options")

  res.json({
    priority_levels: {
      LOW: ContextPriority.LOW,
      MEDIUM: ContextPriority.MEDIUM,
      HIGH: ContextPriority.HIGH,
      CRITICAL: ContextPriority.CRITICAL
    },
    context_types: [
      'project',
      'documents',
      'templates',
      'user',
      'integrations',
      'custom'
    ],
    default_configuration: {
      project: ContextPriority.HIGH,
      documents: ContextPriority.HIGH,
      templates: ContextPriority.MEDIUM,
      user: ContextPriority.LOW,
      integrations: ContextPriority.LOW,
      custom: ContextPriority.MEDIUM
    }
  })
})

export default router