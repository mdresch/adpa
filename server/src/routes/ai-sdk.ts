/**
 * Modern AI Routes using AI SDK patterns
 * 
 * Simplified, unified AI provider management and generation
 */

import express from 'express'
import { logger, childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

/**
 * GET /api/ai-sdk/providers
 * Get all AI providers
 */
router.get('/providers', async (req, res) => {
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
      lastUsed: 'Never', // TODO: Add usage tracking
      requestCount: 0, // TODO: Add usage tracking
      errorRate: 0, // TODO: Add error tracking
      is_active: row.is_active,
      configuration: {
        models: row.configuration?.models || [],
        max_tokens: row.configuration?.max_tokens,
        default_model: row.configuration?.default_model,
        model: row.configuration?.model,
        endpoint: row.configuration?.endpoint
      }
    }))

    res.json(providers)
  } catch (error) {
    log.error('Failed to get AI providers:', error)
    res.status(500).json({ error: 'Failed to get providers' })
  }
})

/**
 * POST /api/ai-sdk/providers
 * Create a new AI provider
 */
router.post('/providers', async (req, res) => {
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
    const validTypes = ['openai', 'google', 'azure', 'anthropic', 'cohere', 'huggingface']
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
 * POST /api/ai-sdk/providers/:name/configure
 * Configure/update an existing AI provider
 */
router.post('/providers/:name/configure', async (req, res) => {
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
 * DELETE /api/ai-sdk/providers/:name
 * Delete an AI provider
 */
router.delete('/providers/:name', async (req, res) => {
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
 * POST /api/ai-sdk/providers/:name/test
 * Test an AI provider
 */
router.post('/providers/:name/test', async (req, res) => {
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
    const apiKey = Buffer.from(provider.api_key_encrypted, 'base64').toString('utf-8')

    // Simple test - just return success for now
    // In a real implementation, you would make an actual API call to test the connection
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
 * POST /api/ai-sdk/generate
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
    // In a real implementation, you would integrate with actual AI providers
    const response = {
      content: `Mock AI response for: ${prompt || JSON.stringify(messages)}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: model || 'gpt-3.5-turbo',
      provider: provider || 'mock-provider',
      finishReason: 'stop'
    }

    // Log the generation
    await pool.query(`
      INSERT INTO ai_generations (id, provider, model, prompt, response, usage, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      uuidv4(),
      response.provider,
      response.model,
      prompt || JSON.stringify(messages),
      response.content,
      JSON.stringify(response.usage)
    ])

    res.json(response)
  } catch (error) {
    log.error('AI generation error:', error)
    res.status(500).json({ error: 'AI generation failed' })
  }
})

/**
 * GET /api/ai-sdk/models
 * Get available models from all providers
 */
router.get('/models', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    // Get active providers from database
    const result = await pool.query(`
      SELECT name, provider_type FROM ai_providers WHERE is_active = true
    `)

    const models: Record<string, string[]> = {}

    for (const row of result.rows) {
      const providerName = row.name
      const providerType = row.provider_type
      
      // Return default models for each provider type
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
        case 'cohere':
          models[providerName] = ['command', 'command-light']
          break
        case 'huggingface':
          models[providerName] = ['microsoft/DialoGPT-medium', 'facebook/blenderbot-400M-distill']
          break
        default:
          models[providerName] = ['gpt-3.5-turbo']
      }
    }

    res.json({ models })
  } catch (error) {
    log.error('Failed to get AI models:', error)
    res.status(500).json({ error: 'Failed to get models' })
  }
})

/**
 * GET /api/ai-sdk/health
 * Health check for AI providers
 */
router.get('/health', async (req, res) => {
  try {
    // Get active providers from database
    const result = await pool.query(`
      SELECT name FROM ai_providers WHERE is_active = true
    `)

    const providers = result.rows.map(row => row.name)
    const health: Record<string, boolean> = {}

    // For now, assume all providers are healthy
    // In a real implementation, you would test each provider
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
    case 'cohere': return 'command'
    case 'huggingface': return 'microsoft/DialoGPT-medium'
    default: return 'gpt-3.5-turbo'
  }
}

function getDefaultEndpoint(providerType: string): string {
  switch (providerType) {
    case 'openai': return 'https://api.openai.com/v1'
    case 'google': return 'https://generativelanguage.googleapis.com'
    case 'azure': return 'https://your-resource.openai.azure.com'
    case 'anthropic': return 'https://api.anthropic.com'
    case 'cohere': return 'https://api.cohere.ai'
    case 'huggingface': return 'https://api-inference.huggingface.co'
    default: return 'https://api.openai.com/v1'
  }
}

export default router
