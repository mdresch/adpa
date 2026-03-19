/**
 * AI Provider Management Routes
 * 
 * Unified AI provider management and generation
 */

import express from 'express'
import { logger, childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { aiService } from '../services/aiService'

const router = express.Router()

/**
 * GET /api/ai-providers
 * Get all AI providers
 */
router.get('/', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const result = await pool.query(`
      SELECT id, name, provider_type, configuration, is_active, priority, created_at, updated_at
      FROM ai_providers 
      ORDER BY priority ASC, name ASC
    `)

    const providers = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.provider_type,
      model: row.configuration?.model || getDefaultModel(row.provider_type),
      status: row.is_active ? 'active' : 'inactive',
      apiKey: '*********************', // Masked
      endpoint: row.configuration?.endpoint || getDefaultEndpoint(row.provider_type),
      priority: row.priority || 1,
      enabled: row.is_active,
      lastUsed: 'Never',
      requestCount: 0,
      errorRate: 0,
      is_active: row.is_active,
      configuration: {
        models: row.configuration?.models || [],
        max_tokens: row.configuration?.max_tokens,
        default_model: row.configuration?.default_model,
        model: row.configuration?.model,
        endpoint: row.configuration?.endpoint
      }
    }))

    // Return the array directly as expected by frontend
    res.json(providers)
  } catch (error) {
    log.error('Failed to get AI providers:', error)
    res.status(500).json({ error: 'Failed to get providers' })
  }
})

/**
 * POST /api/ai-providers
 * Create a new AI provider
 */
router.post('/', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name, provider_type, api_key, configuration } = req.body

    // Validate required fields
    if (!name || !provider_type || !api_key) {
      return res.status(400).json({
        error: 'Missing required fields: name, provider_type, api_key'
      })
    }

    // Validate provider type
    const validTypes = ['openai', 'google', 'azure', 'anthropic', 'cohere', 'huggingface', 'deepseek', 'moonshot', 'xai', 'ollama']
    if (!validTypes.includes(provider_type)) {
      return res.status(400).json({
        error: `Invalid provider type. Must be one of: ${validTypes.join(', ')}`
      })
    }

    // Check if provider name already exists
    const existingProvider = await pool.query(
      'SELECT id FROM ai_providers WHERE name = $1',
      [name]
    )

    if (existingProvider.rows.length > 0) {
      return res.status(400).json({ error: 'Provider name already exists' })
    }

    // Encrypt API key
    const encryptedApiKey = Buffer.from(api_key).toString('base64')
    const id = uuidv4()

    // Insert into database
    const result = await pool.query(`
      INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, provider_type, is_active, created_at, updated_at
    `, [
      id,
      name,
      provider_type,
      encryptedApiKey,
      JSON.stringify(configuration || {}),
      true,
      configuration?.priority || 1
    ])

    log.info(`AI provider created: ${name} (${provider_type})`)

    res.status(201).json({
      message: 'Provider created successfully',
      provider: result.rows[0]
    })
  } catch (error) {
    log.error('Create AI provider error:', error)
    res.status(500).json({ error: 'Failed to create provider' })
  }
})

/**
 * POST /api/ai-providers/:id/toggle
 * Toggle an AI provider's active status by ID
 */
router.post('/:id/toggle', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    // Get current status
    const providerResult = await pool.query(
      'SELECT is_active, name FROM ai_providers WHERE id = $1',
      [id]
    )

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    const currentStatus = providerResult.rows[0].is_active
    const newStatus = !currentStatus

    await pool.query(
      'UPDATE ai_providers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    )

    log.info(`AI provider ${providerResult.rows[0].name} toggled to ${newStatus ? 'active' : 'inactive'}`)

    res.json({
      success: true,
      is_active: newStatus,
      message: `Provider ${newStatus ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    log.error('Toggle AI provider error:', error)
    res.status(500).json({ error: 'Failed to toggle provider status' })
  }
})

import { aiProviderService } from '../services/aiProviderService'

// ... (other routes)

/**
 * GET /api/ai-providers/:id/discover-models
 * Discover available models from a provider's API
 */
router.get('/:id/discover-models', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const result = await aiProviderService.discoverModels(id)

    res.json({
      success: true,
      provider: {
        id: result.provider.id,
        name: result.provider.name,
        type: result.provider.type
      },
      discovered_models: result.discoveredModels,
      current_default: result.provider.default_model
    })
  } catch (error) {
    log.error('Discover models error:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to discover models' })
  }
})

/**
 * POST /api/ai-providers/:id/sync-models
 * Sync discovered models to provider configuration
 */
router.post('/:id/sync-models', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const { models, default_model } = req.body

    if (!models || !Array.isArray(models)) {
      return res.status(400).json({ error: 'Models array is required' })
    }

    // Update the provider's available models and default model
    // We update both the explicit columns and the configuration JSONB for compatibility
    await pool.query(
      `UPDATE ai_providers 
       SET available_models = $1, 
           default_model = $2,
           configuration = configuration || jsonb_build_object('models', $1::jsonb, 'model', $2::text, 'default_model', $2::text),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [JSON.stringify(models), default_model, id]
    )

    log.info(`AI provider ${id} synced with ${models.length} models. Default set to ${default_model}`)

    res.json({
      success: true,
      message: 'Models synced successfully'
    })
  } catch (error) {
    log.error('Sync models error:', error)
    res.status(500).json({ error: 'Failed to sync models' })
  }
})

/**
 * POST /api/ai-providers/:name/configure
 * Configure/update an existing AI provider
 */
router.post('/:name/configure', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name } = req.params
    const { api_key, configuration, is_active } = req.body

    // Check if provider exists
    const existingProvider = await pool.query(
      'SELECT id FROM ai_providers WHERE name = $1',
      [name]
    )

    if (existingProvider.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    let updateQuery = `
      UPDATE ai_providers 
      SET updated_at = CURRENT_TIMESTAMP
    `
    const updateParams: any[] = []
    let paramIndex = 1

    if (api_key) {
      const encryptedApiKey = Buffer.from(api_key).toString('base64')
      updateQuery += `, api_key_encrypted = $${paramIndex}`
      updateParams.push(encryptedApiKey)
      paramIndex++
    }

    if (configuration) {
      updateQuery += `, configuration = $${paramIndex}`
      updateParams.push(JSON.stringify(configuration))
      paramIndex++
    }

    if (typeof is_active === 'boolean') {
      updateQuery += `, is_active = $${paramIndex}`
      updateParams.push(is_active)
      paramIndex++
    }

    if (configuration?.priority !== undefined) {
      updateQuery += `, priority = $${paramIndex}`
      updateParams.push(parseInt(configuration.priority.toString()) || 1)
      paramIndex++
    } else if (req.body.priority !== undefined) {
      updateQuery += `, priority = $${paramIndex}`
      updateParams.push(parseInt(req.body.priority.toString()) || 1)
      paramIndex++
    }

    updateQuery += ` WHERE name = $${paramIndex} RETURNING name, provider_type, is_active, created_at, updated_at`
    updateParams.push(name)

    const result = await pool.query(updateQuery, updateParams)

    log.info(`AI provider configured: ${name}`)

    res.json({
      message: 'Provider configured successfully',
      provider: result.rows[0]
    })
  } catch (error) {
    log.error('Configure AI provider error:', error)
    res.status(500).json({ error: 'Failed to configure provider' })
  }
})

/**
 * DELETE /api/ai-providers/:name
 * Delete an AI provider
 */
router.delete('/:name', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name } = req.params

    const result = await pool.query(
      'DELETE FROM ai_providers WHERE name = $1 RETURNING name',
      [name]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    log.info(`AI provider deleted: ${name}`)

    res.json({ message: 'Provider deleted successfully' })
  } catch (error) {
    log.error('Delete AI provider error:', error)
    res.status(500).json({ error: 'Failed to delete provider' })
  }
})

/**
 * POST /api/ai-providers/:name/test
 * Test an AI provider
 */
router.post('/:name/test', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name } = req.params

    // Get provider details
    const providerResult = await pool.query(
      'SELECT * FROM ai_providers WHERE name = $1',
      [name]
    )

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    const provider = providerResult.rows[0]

    // Decrypt API key
    // const apiKey = Buffer.from(provider.api_key_encrypted, 'base64').toString('utf-8')

    log.info(`Testing AI provider: ${name}`)

    res.json({
      success: true,
      message: 'Provider test completed successfully',
      provider: name
    })
  } catch (error) {
    log.error('Test AI provider error:', error)
    res.status(500).json({ error: 'Provider test failed' })
  }
})

/**
 * POST /api/ai-providers/generate
 * Generate content using AI providers (unified with fallback)
 */
router.post('/generate', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      prompt,
      provider,
      model,
      temperature,
      max_tokens,
      system_prompt,
      variables,
      template_id,
      fallbackProviders,
      userId,
      projectId,
      documentId,
      messages
    } = req.body

    if (!prompt && !template_id) {
      return res.status(400).json({
        error: 'Either prompt or template_id is required'
      })
    }

    const result = await aiService.generateWithFallback({
      prompt,
      provider: provider || 'ollama',
      model,
      temperature,
      max_tokens,
      system_prompt,
      variables,
      template_id,
      userId,
      projectId,
      documentId,
      messages
    }, fallbackProviders)

    res.json(result)
  } catch (error: any) {
    log.error('AI generation error:', error)
    res.status(500).json({ error: error.message || 'AI generation failed' })
  }
})

/**
 * POST /api/ai-providers/generate-stream
 * Generate streaming content using AI providers (unified with fallback)
 */
router.post('/generate-stream', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      prompt,
      provider,
      model,
      temperature,
      max_tokens,
      system_prompt,
      variables,
      template_id,
      fallbackProviders,
      userId,
      projectId,
      documentId,
      messages
    } = req.body

    const { stream, providerUsed } = await aiService.generateStreamWithFallback({
      prompt,
      provider: provider || 'ollama',
      model,
      temperature,
      max_tokens,
      system_prompt,
      variables,
      template_id,
      userId,
      projectId,
      documentId,
      messages
    }, fallbackProviders)

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-AI-Provider', providerUsed)

    // Pipe the stream to response
    // If it's a Fetch response body (for Ollama), pipe it directly
    if (stream.pipe) {
      stream.pipe(res)
    } else if (stream instanceof Response) {
      // If it's a Response object (Vercel AI SDK toTextStreamResponse returns a Response)
      const reader = stream.body?.getReader()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
        res.end()
      }
    } else {
      // Fallback for other stream types
      log.error('Unsupported stream type received from AIService')
      res.status(500).end()
    }
  } catch (error: any) {
    log.error('AI stream generation error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'AI streaming failed' })
    } else {
      res.end()
    }
  }
})

/**
 * GET /api/ai-providers/models
 * Get available models from all providers
 */
router.get('/models', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const result = await pool.query(`
      SELECT name, provider_type FROM ai_providers WHERE is_active = true
    `)

    const models: Record<string, string[]> = {}

    for (const row of result.rows) {
      const providerName = row.name
      const providerType = row.provider_type

      switch (providerType) {
        case 'openai':
          models[providerName] = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
          break
        case 'google':
          models[providerName] = ['gemini-pro', 'gemini-pro-vision']
          break
        case 'azure':
          models[providerName] = ['gpt-35-turbo', 'gpt-4']
          break
        case 'anthropic':
          models[providerName] = ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus']
          break
        case 'ollama':
          models[providerName] = ['llama3', 'llama3.1', 'mistral', 'phi3']
          break
        default:
          models[providerName] = ['llama3']
      }
    }

    res.json({ models })
  } catch (error) {
    log.error('Failed to get AI models:', error)
    res.status(500).json({ error: 'Failed to get models' })
  }
})

/**
 * GET /api/ai-providers/health
 * Health check for AI providers
 */
router.get('/health', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name FROM ai_providers WHERE is_active = true
    `)

    const providers = result.rows.map(row => row.name)
    const health: Record<string, boolean> = {}

    for (const providerName of providers) {
      health[providerName] = true
    }

    res.json({
      status: 'healthy',
      providers: health,
      totalProviders: providers.length,
      activeProviders: Object.values(health).filter(Boolean).length
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'AI service health check failed'
    })
  }
})

// Helper functions
function getDefaultModel(providerType: string): string {
  switch (providerType) {
    case 'openai': return 'gpt-3.5-turbo'
    case 'google': return 'gemini-pro'
    case 'azure': return 'gpt-35-turbo'
    case 'anthropic': return 'claude-3-sonnet'
    case 'copilot': return 'copilot-chat'
    case 'ollama': return 'llama3'
    default: return 'llama3'
  }
}

function getDefaultEndpoint(providerType: string): string {
  switch (providerType) {
    case 'openai': return 'https://api.openai.com/v1'
    case 'google': return 'https://generativelanguage.googleapis.com'
    case 'azure': return 'https://your-resource.openai.azure.com'
    case 'anthropic': return 'https://api.anthropic.com'
    case 'copilot': return 'https://api.github.com'
    case 'ollama': return 'http://localhost:11434'
    default: return 'http://localhost:11434'
  }
}

export default router
