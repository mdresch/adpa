/**
 * Context-Aware AI Routes
 * 
 * Enhanced AI routes that use the context injection system.
 */

import express from "express"
import { ContextAwareAIService } from "../modules/context/integration"
import { ContextPriority } from "../modules/context/types"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

/**
 * POST /api/context-ai/generate
 * Generate AI response with automatic context injection
 */
router.post("/generate", async (req, res) => {
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
    logger.error("Context-aware AI generation failed:", error)
    
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
    logger.error("Context preview failed:", error)
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
    logger.error("Context statistics failed:", error)
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
    logger.error("Batch context-aware AI generation failed:", error)
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
  try {
    const result = await pool.query(`
      SELECT name, provider_type, configuration, is_active
      FROM ai_providers 
      WHERE is_active = true
      ORDER BY name
    `)

    const providers = result.rows.map(row => ({
      name: row.name,
      type: row.provider_type,
      is_active: row.is_active,
      supports_context: true, // All providers support context injection
      configuration: {
        // Only expose non-sensitive configuration
        models: row.configuration?.models || [],
        max_tokens: row.configuration?.max_tokens,
        default_model: row.configuration?.default_model
      }
    }))

    res.json({ providers })

  } catch (error) {
    logger.error("Failed to get context-aware providers:", error)
    res.status(500).json({
      error: "Failed to get providers",
      message: error.message
    })
  }
})

/**
 * GET /api/context-ai/priority-options
 * Get available context priority options
 */
router.get("/priority-options", (req, res) => {
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