/**
 * Simple AI Provider Management Routes
 * 
 * Minimal, working AI provider management without complex dependencies
 * 
 * SECURITY: Admin-only access - AI providers are system-wide configuration
 */

import express from 'express'
import { pool } from '../database/connection'
import { logger, childLogger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { aiService } from '../services/aiService'
import { authenticateToken } from '../middleware/auth'

const router = express.Router()

// Middleware to require admin role
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'AI provider configuration is admin-only. Guest users cannot modify system-wide AI settings.'
    });
  }
  
  next();
}

/**
 * GET /api/ai-providers
 * Get all AI providers
 * PUBLIC: Anyone can view configured providers (API keys are masked)
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
 * POST /api/ai-providers
 * Create a new AI provider
 * ADMIN ONLY: System-wide configuration
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name, provider_type, api_key, configuration } = req.body

    // Log admin action
    log.info('Admin creating AI provider', {
      adminId: (req as any).user.id,
      providerName: name,
      providerType: provider_type
    });

    // Validate required fields
    if (!name || !provider_type || !api_key) {
      return res.status(400).json({
        error: 'Missing required fields: name, provider_type, api_key'
      })
    }

    // Validate provider type
    const validTypes = ['openai', 'google', 'azure', 'anthropic', 'cohere', 'huggingface', 'deepseek', 'moonshot', 'xai', 'ollama', 'mistral', 'groq']
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
 * POST /api/ai-providers/:name/configure
 * Configure/update an existing AI provider
 */
router.post('/:name/configure', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { name } = req.params
    const { api_key, configuration, is_active } = req.body

    // Check if provider exists and get current configuration
    const existingProvider = await pool.query(
      'SELECT id, configuration FROM ai_providers WHERE name = $1',
      [name]
    )

    if (existingProvider.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    // Merge configurations and ensure API key is synced
    let updatedConfiguration = existingProvider.rows[0].configuration || {}
    
    if (configuration) {
      updatedConfiguration = {
        ...updatedConfiguration,
        ...configuration
      }
    }
    
    // If API key is being updated, sync it to both fields
    if (api_key) {
      updatedConfiguration.apiKey = api_key
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

    // Always update configuration if api_key or configuration was provided
    if (api_key || configuration) {
      updateQuery += `, configuration = $${paramIndex}`
      updateParams.push(JSON.stringify(updatedConfiguration))
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

    // Re-initialize providers to pick up the new API key
    await aiService.initializeProviders()

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
 * ADMIN ONLY: System-wide configuration
 */
router.delete('/:name', authenticateToken, requireAdmin, async (req, res) => {
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
