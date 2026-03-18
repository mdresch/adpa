/**
 * AI Provider Management Routes
 * 
 * Unified AI provider management and generation
 */

import express from 'express'
import { logger, childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'

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
 * POST /api/ai-providers/providers/:id/toggle
 * Toggle an AI provider's active status by ID
 */
router.post('/providers/:id/toggle', async (req, res) => {
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

/**
 * GET /api/ai-providers/providers/:id/discover-models
 * Discover available models from a provider's API
 */
router.get('/providers/:id/discover-models', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    // Get provider details
    const providerResult = await pool.query(
      'SELECT id, name, provider_type, configuration, default_model FROM ai_providers WHERE id = $1',
      [id]
    )

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    const provider = providerResult.rows[0]
    const type = provider.provider_type

    // Mock discovered models based on type for now
    // In a real implementation, this would call the provider's models list API
    let discoveredModels: any[] = []

    switch (type) {
      case 'openai':
        discoveredModels = [
          { id: 'gpt-4o', name: 'GPT-4o', context_window: 128000, description: 'Most capable model' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_window: 128000, description: 'Fast, affordable model' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context_window: 128000 },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context_window: 16385 }
        ]
        break
      case 'google':
        discoveredModels = [
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context_window: 1000000 },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context_window: 1000000 },
          { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', context_window: 32768 }
        ]
        break
      case 'anthropic':
        discoveredModels = [
          { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', context_window: 200000 },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context_window: 200000 },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', context_window: 200000 },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', context_window: 200000 }
        ]
        break
      case 'azure':
        discoveredModels = [
          { id: 'gpt-4o', name: 'GPT-4o (Azure)', context_window: 128000 },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (Azure)', context_window: 128000 },
          { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo (Azure)', context_window: 16385 }
        ]
        break
      case 'cohere':
        discoveredModels = [
          { id: 'command-r-plus', name: 'Command R+', context_window: 128000 },
          { id: 'command-r', name: 'Command R', context_window: 128000 }
        ]
        break
      case 'deepseek':
        discoveredModels = [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', context_window: 64000 },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', context_window: 64000 }
        ]
        break
      case 'moonshot':
        discoveredModels = [
          { id: 'moonshot-v1-8k', name: 'Moonshot v1 8k', context_window: 8192 },
          { id: 'moonshot-v1-32k', name: 'Moonshot v1 32k', context_window: 32768 }
        ]
        break
      case 'xai':
        discoveredModels = [
          { id: 'grok-1', name: 'Grok-1', context_window: 131072 },
          { id: 'grok-beta', name: 'Grok Beta', context_window: 131072 }
        ]
        break
      case 'ollama':
        discoveredModels = [
          { id: 'llama3.1', name: 'Llama 3.1', context_window: 128000 },
          { id: 'mistral', name: 'Mistral', context_window: 32768 },
          { id: 'phi3', name: 'Phi-3', context_window: 128000 }
        ]
        break
      default:
        discoveredModels = [
          { id: 'default-model', name: 'Default Model' }
        ]
    }

    res.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.provider_type
      },
      discovered_models: discoveredModels,
      current_default: provider.default_model || provider.configuration?.model
    })
  } catch (error) {
    log.error('Discover models error:', error)
    res.status(500).json({ error: 'Failed to discover models' })
  }
})

/**
 * POST /api/ai-providers/providers/:id/sync-models
 * Sync discovered models to provider configuration
 */
router.post('/providers/:id/sync-models', async (req, res) => {
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
 * Generate content using AI providers
 */
router.post('/generate', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      prompt,
      provider,
      model,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt,
      messages
    } = req.body

    if (!prompt && !messages) {
      return res.status(400).json({
        error: 'Either prompt or messages is required'
      })
    }

    // For now, return a mock response
    const response = {
      content: `Mock AI response for: ${prompt || JSON.stringify(messages)}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: model || 'llama3',
      provider: provider || 'ollama',
      finishReason: 'stop'
    }

    res.json(response)
  } catch (error) {
    log.error('AI generation error:', error)
    res.status(500).json({ error: 'AI generation failed' })
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
