/**
 * Mistral AI Connector using Official Mistral SDK
 * Provides integration with Mistral AI models
 */

import { Mistral } from '@mistralai/mistralai'
import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'

export interface MistralConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
}

export interface MistralProvider {
  id: string
  name: string
  config: MistralConfig
  isActive: boolean
  priority: number
  rateLimits: {
    requestsPerMinute: number
    tokensPerMinute: number
    requestsPerDay: number
  }
  currentUsage: {
    requestsThisMinute: number
    tokensThisMinute: number
    requestsToday: number
    lastReset: Date
  }
}

export interface MistralRequest {
  prompt?: string
  messages?: Array<{ role: string; content: string }>
  model: string
  maxTokens?: number
  temperature?: number
  topP?: number
  stream?: boolean
}

export interface MistralResponse {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
  model?: string
}

export interface MistralError {
  code: string
  message: string
  type: string
  retryAfter?: number
}

class MistralConnector {
  private providers: Map<string, MistralProvider> = new Map()
  private clients: Map<string, Mistral> = new Map()
  private failoverQueue: string[] = []

  constructor() {
    // Don't initialize providers in constructor to avoid startup crashes
    // Providers will be initialized when needed
  }

  /**
   * Initialize Mistral AI providers from database
   */
  async initializeProviders(): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, api_key_encrypted, configuration, is_active,
          COALESCE(priority, 1) as priority,
          COALESCE(rate_limits, '{}') as rate_limits,
          COALESCE(usage_stats, '{}') as usage_stats
        FROM ai_providers 
        WHERE provider_type = 'mistral' 
        ORDER BY priority ASC, name ASC
      `)

      for (const row of result.rows) {
        try {
          const config: MistralConfig = {
            apiKey: this.decryptApiKey(row.api_key_encrypted),
            ...row.configuration
          }

          const rateLimits = row.rate_limits || {}
          const usageStats = row.usage_stats || {}

          const provider: MistralProvider = {
            id: row.id,
            name: row.name,
            config,
            isActive: row.is_active,
            priority: row.priority,
            rateLimits: {
              requestsPerMinute: rateLimits.requestsPerMinute || 100, // Mistral's default limits
              tokensPerMinute: rateLimits.tokensPerMinute || 100000,
              requestsPerDay: rateLimits.requestsPerDay || 10000,
            },
            currentUsage: {
              requestsThisMinute: usageStats.requestsThisMinute || 0,
              tokensThisMinute: usageStats.tokensThisMinute || 0,
              requestsToday: usageStats.requestsToday || 0,
              lastReset: new Date(usageStats.lastReset || Date.now()),
            }
          }

          await this.addProvider(provider)
        } catch (providerError) {
          logger.warn(`Failed to initialize Mistral AI provider '${row.name}', skipping:`, providerError)
          continue
        }
      }

      logger.info(`Initialized ${this.providers.size} Mistral AI providers`)
    } catch (error) {
      logger.error("Failed to initialize Mistral AI providers:", error)
      // Don't throw error to prevent server crash - just log and continue
    }
  }

  /**
   * Add a new Mistral AI provider
   */
  async addProvider(provider: MistralProvider): Promise<void> {
    try {
      // Validate API key
      await this.validateApiKey(provider.config.apiKey)

      // Create Mistral client
      const client = new Mistral({
        apiKey: provider.config.apiKey,
        baseURL: provider.config.baseURL,
      })

      this.clients.set(provider.name, client)
      this.providers.set(provider.name, provider)

      logger.info(`Added Mistral AI provider: ${provider.name}`)
    } catch (error) {
      logger.error(`Failed to add Mistral AI provider ${provider.name}:`, error)
      throw error
    }
  }

  /**
   * Generate content using Mistral AI
   */
  async generateContent(providerName: string, request: MistralRequest): Promise<MistralResponse> {
    try {
      const provider = this.providers.get(providerName)
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`)
      }

      if (!provider.isActive) {
        throw new Error(`Provider ${providerName} is not active`)
      }

      const client = this.clients.get(providerName)
      if (!client) {
        throw new Error(`Client for provider ${providerName} not found`)
      }

      // Check rate limits
      this.checkRateLimits(provider)

      // Prepare messages
      let messages: Array<{ role: string; content: string }> = []
      
      if (request.messages) {
        messages = request.messages
      } else if (request.prompt) {
        messages = [{ role: 'user', content: request.prompt }]
      } else {
        throw new Error('No prompt or messages provided')
      }

      // Generate content
      const response = await client.chat.complete({
        model: request.model,
        messages: messages,
        maxTokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        topP: request.topP,
        stream: request.stream || false,
      })

      // Update usage stats
      this.updateUsageStats(provider, response.usage)

      const result: MistralResponse = {
        text: response.choices[0]?.message?.content || '',
        usage: response.usage ? {
          promptTokens: response.usage.promptTokens || 0,
          completionTokens: response.usage.completionTokens || 0,
          totalTokens: response.usage.totalTokens || 0,
        } : undefined,
        finishReason: response.choices[0]?.finishReason,
        model: response.model,
      }

      logger.info(`Generated content using Mistral AI provider: ${providerName}`)
      return result

    } catch (error) {
      logger.error(`Failed to generate content with Mistral AI provider ${providerName}:`, error)
      
      // Handle rate limit errors
      if (this.isRateLimitError(error)) {
        await this.handleRateLimitError(providerName, error as MistralError)
      }
      
      throw error
    }
  }

  /**
   * Get available models for a provider
   */
  async getAvailableModels(providerName?: string): Promise<string[]> {
    // Mistral's available models
    const models = [
      'mistral-large-latest',
      'mistral-medium-latest', 
      'mistral-small-latest',
      'mistral-tiny',
      'codestral-latest',
      'pixtral-12b-2409',
      'pixtral-large-latest'
    ]

    return models
  }

  /**
   * Validate API key
   */
  private async validateApiKey(apiKey: string): Promise<void> {
    try {
      const client = new Mistral({ apiKey })
      
      // Test the API key by making a simple request
      await client.chat.complete({
        model: 'mistral-tiny',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 1,
      })
    } catch (error) {
      throw new Error(`API key validation failed: ${error.message}`)
    }
  }

  /**
   * Decrypt API key
   */
  private decryptApiKey(encryptedKey: string): string {
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf-8')
    } catch (error) {
      logger.error('Failed to decrypt API key:', error)
      throw new Error('Invalid API key format')
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimits(provider: MistralProvider): void {
    const now = new Date()
    const timeSinceReset = now.getTime() - provider.currentUsage.lastReset.getTime()
    
    // Reset counters if a minute has passed
    if (timeSinceReset >= 60000) {
      provider.currentUsage.requestsThisMinute = 0
      provider.currentUsage.tokensThisMinute = 0
      provider.currentUsage.lastReset = now
    }

    // Check if we're over the limits
    if (provider.currentUsage.requestsThisMinute >= provider.rateLimits.requestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${provider.rateLimits.requestsPerMinute} requests per minute`)
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(provider: MistralProvider, usage?: any): void {
    if (usage) {
      provider.currentUsage.requestsThisMinute++
      provider.currentUsage.tokensThisMinute += usage.totalTokens || 0
      provider.currentUsage.requestsToday++
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.code === 'rate_limit_exceeded' ||
           error?.message?.includes('rate limit')
  }

  /**
   * Handle rate limit errors
   */
  private async handleRateLimitError(providerName: string, error: MistralError): Promise<void> {
    const provider = this.providers.get(providerName)
    if (!provider) return

    // Temporarily disable the provider
    provider.isActive = false
    
    // Add to failover queue
    if (!this.failoverQueue.includes(providerName)) {
      this.failoverQueue.push(providerName)
    }

    // Re-enable after retry delay
    const retryAfter = error.retryAfter || 60 // Default to 60 seconds
    setTimeout(() => {
      provider.isActive = true
      const index = this.failoverQueue.indexOf(providerName)
      if (index > -1) {
        this.failoverQueue.splice(index, 1)
      }
    }, retryAfter * 1000)

    logger.warn(`Temporarily disabled provider ${providerName} due to rate limit`)
  }
}

// Export singleton instance
export const mistralConnector = new MistralConnector()
