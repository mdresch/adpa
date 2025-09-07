import OpenAI from "openai"
import { logger } from "../../utils/logger"
import { pool } from "../../database/connection"

export interface OpenAIConfig {
  apiKey: string
  organization?: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
  defaultHeaders?: Record<string, string>
}

export interface OpenAIProvider {
  id: string
  name: string
  config: OpenAIConfig
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

export interface OpenAIRequest {
  model: string
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  stream?: boolean
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: string
  metadata?: any
}

export interface OpenAIError {
  type: "rate_limit" | "authentication" | "api_error" | "network_error" | "timeout"
  message: string
  code?: string
  statusCode?: number
  retryAfter?: number
}

class OpenAIConnector {
  private providers: Map<string, OpenAIProvider> = new Map()
  private clients: Map<string, OpenAI> = new Map()
  private failoverQueue: string[] = []

  constructor() {
    this.initializeProviders()
  }

  /**
   * Initialize OpenAI providers from database
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
        WHERE provider_type = 'openai' 
        ORDER BY priority ASC, name ASC
      `)

      for (const row of result.rows) {
        const config: OpenAIConfig = {
          apiKey: this.decryptApiKey(row.api_key_encrypted),
          ...row.configuration
        }

        const rateLimits = row.rate_limits || {}
        const usageStats = row.usage_stats || {}

        const provider: OpenAIProvider = {
          id: row.id,
          name: row.name,
          config,
          isActive: row.is_active,
          priority: row.priority,
          rateLimits: {
            requestsPerMinute: rateLimits.requestsPerMinute || 3500,
            tokensPerMinute: rateLimits.tokensPerMinute || 90000,
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
      }

      logger.info(`Initialized ${this.providers.size} OpenAI providers`)
    } catch (error) {
      logger.error("Failed to initialize OpenAI providers:", error)
      throw error
    }
  }

  /**
   * Add a new OpenAI provider
   */
  async addProvider(provider: OpenAIProvider): Promise<void> {
    try {
      // Validate API key
      await this.validateApiKey(provider.config.apiKey)

      // Create OpenAI client
      const client = new OpenAI({
        apiKey: provider.config.apiKey,
        organization: provider.config.organization,
        baseURL: provider.config.baseURL,
        timeout: provider.config.timeout || 60000,
        maxRetries: provider.config.maxRetries || 3,
        defaultHeaders: provider.config.defaultHeaders,
      })

      this.providers.set(provider.name, provider)
      this.clients.set(provider.name, client)

      // Update failover queue based on priority
      this.updateFailoverQueue()

      logger.info(`Added OpenAI provider: ${provider.name}`)
    } catch (error) {
      logger.error(`Failed to add OpenAI provider ${provider.name}:`, error)
      throw error
    }
  }

  /**
   * Generate completion using OpenAI API with failover logic
   */
  async generateCompletion(request: OpenAIRequest, preferredProvider?: string): Promise<OpenAIResponse> {
    const providers = this.getAvailableProviders(preferredProvider)
    
    if (providers.length === 0) {
      throw new Error("No available OpenAI providers")
    }

    let lastError: OpenAIError | null = null

    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName)!
        const client = this.clients.get(providerName)!

        // Check rate limits
        if (!this.checkRateLimits(provider)) {
          logger.warn(`Rate limit exceeded for provider ${providerName}, trying next provider`)
          continue
        }

        // Make API call
        const response = await this.makeApiCall(client, request, provider)
        
        // Update usage statistics
        await this.updateUsageStats(provider, response.usage)

        return {
          ...response,
          provider: providerName,
        }

      } catch (error) {
        lastError = this.parseError(error)
        logger.warn(`Provider ${providerName} failed: ${lastError.message}`)

        // If it's a rate limit error, mark provider as temporarily unavailable
        if (lastError.type === "rate_limit") {
          await this.handleRateLimitError(providerName, lastError)
        }

        // Continue to next provider for retryable errors
        if (this.isRetryableError(lastError)) {
          continue
        } else {
          // Non-retryable error, stop trying
          break
        }
      }
    }

    // All providers failed
    throw new Error(`All OpenAI providers failed. Last error: ${lastError?.message || "Unknown error"}`)
  }

  /**
   * Get available models for OpenAI
   */
  async getAvailableModels(providerName?: string): Promise<string[]> {
    const defaultModels = [
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4-turbo-preview",
      "gpt-4-0125-preview",
      "gpt-4-1106-preview",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-16k",
      "gpt-3.5-turbo-1106",
      "gpt-3.5-turbo-0125"
    ]

    if (!providerName) {
      return defaultModels
    }

    try {
      const client = this.clients.get(providerName)
      if (!client) {
        return defaultModels
      }

      const models = await client.models.list()
      return models.data
        .filter(model => model.id.startsWith("gpt-"))
        .map(model => model.id)
        .sort()
    } catch (error) {
      logger.warn(`Failed to fetch models for ${providerName}, using defaults:`, error)
      return defaultModels
    }
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(providerName: string): Promise<boolean> {
    try {
      const client = this.clients.get(providerName)
      if (!client) {
        throw new Error(`Provider ${providerName} not found`)
      }

      // Make a simple API call to test connection
      await client.models.list()
      return true
    } catch (error) {
      logger.error(`Connection test failed for ${providerName}:`, error)
      return false
    }
  }

  /**
   * Get provider statistics
   */
  getProviderStats(providerName: string): OpenAIProvider | null {
    return this.providers.get(providerName) || null
  }

  /**
   * Get all provider statistics
   */
  getAllProviderStats(): OpenAIProvider[] {
    return Array.from(this.providers.values())
  }

  // Private helper methods

  private async validateApiKey(apiKey: string): Promise<void> {
    if (!apiKey || !apiKey.startsWith("sk-")) {
      throw new Error("Invalid OpenAI API key format")
    }

    try {
      const testClient = new OpenAI({ apiKey })
      await testClient.models.list()
    } catch (error) {
      throw new Error(`API key validation failed: ${error}`)
    }
  }

  private decryptApiKey(encryptedKey: string): string {
    // TODO: Implement proper encryption/decryption
    try {
      return Buffer.from(encryptedKey, "base64").toString("utf-8")
    } catch {
      return encryptedKey // Fallback to plain text
    }
  }

  private updateFailoverQueue(): void {
    this.failoverQueue = Array.from(this.providers.values())
      .filter(provider => provider.isActive)
      .sort((a, b) => a.priority - b.priority)
      .map(provider => provider.name)
  }

  private getAvailableProviders(preferredProvider?: string): string[] {
    const available = this.failoverQueue.filter(name => {
      const provider = this.providers.get(name)
      return provider?.isActive && this.checkRateLimits(provider)
    })

    if (preferredProvider && available.includes(preferredProvider)) {
      // Move preferred provider to front
      return [preferredProvider, ...available.filter(name => name !== preferredProvider)]
    }

    return available
  }

  private checkRateLimits(provider: OpenAIProvider): boolean {
    const now = new Date()
    const minutesSinceReset = (now.getTime() - provider.currentUsage.lastReset.getTime()) / (1000 * 60)

    // Reset counters if a minute has passed
    if (minutesSinceReset >= 1) {
      provider.currentUsage.requestsThisMinute = 0
      provider.currentUsage.tokensThisMinute = 0
      provider.currentUsage.lastReset = now
    }

    // Reset daily counter if a day has passed
    const daysSinceReset = minutesSinceReset / (60 * 24)
    if (daysSinceReset >= 1) {
      provider.currentUsage.requestsToday = 0
    }

    // Check limits
    return (
      provider.currentUsage.requestsThisMinute < provider.rateLimits.requestsPerMinute &&
      provider.currentUsage.tokensThisMinute < provider.rateLimits.tokensPerMinute &&
      provider.currentUsage.requestsToday < provider.rateLimits.requestsPerDay
    )
  }

  private async makeApiCall(client: OpenAI, request: OpenAIRequest, provider: OpenAIProvider): Promise<any> {
    const startTime = Date.now()

    try {
      const response = await client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: request.stream || false,
      })

      const duration = Date.now() - startTime
      logger.info(`OpenAI API call completed in ${duration}ms for provider ${provider.name}`)

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`OpenAI API call failed after ${duration}ms for provider ${provider.name}:`, error)
      throw error
    }
  }

  private async updateUsageStats(provider: OpenAIProvider, usage: any): Promise<void> {
    try {
      // Update in-memory stats
      provider.currentUsage.requestsThisMinute += 1
      provider.currentUsage.tokensThisMinute += usage.total_tokens || 0
      provider.currentUsage.requestsToday += 1

      // Update database stats
      await pool.query(`
        UPDATE ai_providers 
        SET 
          usage_stats = jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(usage_stats, '{}'),
                '{total_requests}',
                (COALESCE((usage_stats->>'total_requests')::int, 0) + 1)::text::jsonb
              ),
              '{total_tokens}',
              (COALESCE((usage_stats->>'total_tokens')::int, 0) + $2)::text::jsonb
            ),
            '{last_used}',
            to_jsonb(CURRENT_TIMESTAMP)
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [provider.id, usage.total_tokens || 0])

    } catch (error) {
      logger.error(`Failed to update usage stats for provider ${provider.name}:`, error)
    }
  }

  private parseError(error: any): OpenAIError {
    if (error.status === 429) {
      return {
        type: "rate_limit",
        message: "Rate limit exceeded",
        statusCode: 429,
        retryAfter: error.headers?.["retry-after"] ? parseInt(error.headers["retry-after"]) : 60
      }
    }

    if (error.status === 401 || error.status === 403) {
      return {
        type: "authentication",
        message: "Authentication failed",
        statusCode: error.status
      }
    }

    if (error.status >= 500) {
      return {
        type: "api_error",
        message: "OpenAI API error",
        statusCode: error.status
      }
    }

    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      return {
        type: "network_error",
        message: "Network error",
        code: error.code
      }
    }

    if (error.name === "TimeoutError") {
      return {
        type: "timeout",
        message: "Request timeout"
      }
    }

    return {
      type: "api_error",
      message: error.message || "Unknown error"
    }
  }

  private isRetryableError(error: OpenAIError): boolean {
    return ["rate_limit", "api_error", "network_error", "timeout"].includes(error.type)
  }

  private async handleRateLimitError(providerName: string, error: OpenAIError): Promise<void> {
    const provider = this.providers.get(providerName)
    if (!provider) return

    // Temporarily disable provider
    provider.isActive = false

    // Re-enable after retry period
    const retryAfter = (error.retryAfter || 60) * 1000
    setTimeout(() => {
      provider.isActive = true
      this.updateFailoverQueue()
      logger.info(`Re-enabled provider ${providerName} after rate limit cooldown`)
    }, retryAfter)

    this.updateFailoverQueue()
    logger.warn(`Temporarily disabled provider ${providerName} due to rate limit`)
  }
}

// Export singleton instance
export const openaiConnector = new OpenAIConnector()

// Export types and interfaces
export type {
  OpenAIConfig,
  OpenAIProvider,
  OpenAIRequest,
  OpenAIResponse,
  OpenAIError
}