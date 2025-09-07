import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import { logger } from "../../utils/logger"
import { pool } from "../../database/connection"

export interface GoogleConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
  defaultHeaders?: Record<string, string>
}

export interface GoogleProvider {
  id: string
  name: string
  config: GoogleConfig
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

export interface GoogleRequest {
  model: string
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  temperature?: number
  max_tokens?: number
  top_p?: number
  top_k?: number
  stop?: string | string[]
  stream?: boolean
}

export interface GoogleResponse {
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

export interface GoogleError {
  type: "rate_limit" | "authentication" | "api_error" | "network_error" | "timeout" | "safety_error"
  message: string
  code?: string
  statusCode?: number
  retryAfter?: number
}

class GoogleConnector {
  private providers: Map<string, GoogleProvider> = new Map()
  private clients: Map<string, GoogleGenerativeAI> = new Map()
  private failoverQueue: string[] = []

  constructor() {
    this.initializeProviders()
  }

  /**
   * Initialize Google AI providers from database
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
        WHERE provider_type = 'google' 
        ORDER BY priority ASC, name ASC
      `)

      for (const row of result.rows) {
        const config: GoogleConfig = {
          apiKey: this.decryptApiKey(row.api_key_encrypted),
          ...row.configuration
        }

        const rateLimits = row.rate_limits || {}
        const usageStats = row.usage_stats || {}

        const provider: GoogleProvider = {
          id: row.id,
          name: row.name,
          config,
          isActive: row.is_active,
          priority: row.priority,
          rateLimits: {
            requestsPerMinute: rateLimits.requestsPerMinute || 60, // Google's default limits
            tokensPerMinute: rateLimits.tokensPerMinute || 32000,
            requestsPerDay: rateLimits.requestsPerDay || 1500,
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

      logger.info(`Initialized ${this.providers.size} Google AI providers`)
    } catch (error) {
      logger.error("Failed to initialize Google AI providers:", error)
      throw error
    }
  }

  /**
   * Add a new Google AI provider
   */
  async addProvider(provider: GoogleProvider): Promise<void> {
    try {
      // Validate API key
      await this.validateApiKey(provider.config.apiKey)

      // Create Google AI client
      const client = new GoogleGenerativeAI(provider.config.apiKey)

      this.providers.set(provider.name, provider)
      this.clients.set(provider.name, client)

      // Update failover queue based on priority
      this.updateFailoverQueue()

      logger.info(`Added Google AI provider: ${provider.name}`)
    } catch (error) {
      logger.error(`Failed to add Google AI provider ${provider.name}:`, error)
      throw error
    }
  }

  /**
   * Generate completion using Google AI API with failover logic
   */
  async generateCompletion(request: GoogleRequest, preferredProvider?: string): Promise<GoogleResponse> {
    const providers = this.getAvailableProviders(preferredProvider)
    
    if (providers.length === 0) {
      throw new Error("No available Google AI providers")
    }

    let lastError: GoogleError | null = null

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
    throw new Error(`All Google AI providers failed. Last error: ${lastError?.message || "Unknown error"}`)
  }

  /**
   * Get available models for Google AI
   */
  async getAvailableModels(providerName?: string): Promise<string[]> {
    const defaultModels = [
      "gemini-pro",
      "gemini-pro-vision",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.0-pro"
    ]

    if (!providerName) {
      return defaultModels
    }

    try {
      const client = this.clients.get(providerName)
      if (!client) {
        return defaultModels
      }

      // Google AI SDK doesn't expose a models.list method like OpenAI
      // Return the known available models
      return defaultModels
    } catch (error) {
      logger.warn(`Failed to fetch models for ${providerName}, using defaults:`, error)
      return defaultModels
    }
  }

  /**
   * Test connection to Google AI API
   */
  async testConnection(providerName: string): Promise<boolean> {
    try {
      const client = this.clients.get(providerName)
      if (!client) {
        throw new Error(`Provider ${providerName} not found`)
      }

      // Make a simple API call to test connection
      const model = client.getGenerativeModel({ model: "gemini-pro" })
      await model.generateContent("Test connection")
      return true
    } catch (error) {
      logger.error(`Connection test failed for ${providerName}:`, error)
      return false
    }
  }

  /**
   * Get provider statistics
   */
  getProviderStats(providerName: string): GoogleProvider | null {
    return this.providers.get(providerName) || null
  }

  /**
   * Get all provider statistics
   */
  getAllProviderStats(): GoogleProvider[] {
    return Array.from(this.providers.values())
  }

  // Private helper methods

  private async validateApiKey(apiKey: string): Promise<void> {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error("Invalid Google AI API key format")
    }

    try {
      const testClient = new GoogleGenerativeAI(apiKey)
      const model = testClient.getGenerativeModel({ model: "gemini-pro" })
      await model.generateContent("Test")
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

  private checkRateLimits(provider: GoogleProvider): boolean {
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

  private async makeApiCall(client: GoogleGenerativeAI, request: GoogleRequest, provider: GoogleProvider): Promise<any> {
    const startTime = Date.now()

    try {
      // Convert messages to a single prompt for Google AI
      const prompt = this.convertMessagesToPrompt(request.messages)
      
      const modelName = request.model || "gemini-pro"
      const model = client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.max_tokens,
          topP: request.top_p,
          topK: request.top_k,
          stopSequences: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
        }
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const content = response.text()

      const duration = Date.now() - startTime
      logger.info(`Google AI API call completed in ${duration}ms for provider ${provider.name}`)

      // Convert to OpenAI-compatible format
      const usageMetadata = (response as any)?.usageMetadata
      
      return {
        id: `google-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: modelName,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: content
            },
            finish_reason: response.candidates?.[0]?.finishReason || "stop"
          }
        ],
        usage: {
          prompt_tokens: usageMetadata?.promptTokenCount || 0,
          completion_tokens: usageMetadata?.candidatesTokenCount || 0,
          total_tokens: usageMetadata?.totalTokenCount || 0,
        },
        metadata: {
          provider_type: 'google',
          safety: response.candidates?.[0]?.safetyRatings,
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`Google AI API call failed after ${duration}ms for provider ${provider.name}:`, error)
      throw error
    }
  }

  private convertMessagesToPrompt(messages: Array<{role: string, content: string}>): string {
    // Convert OpenAI-style messages to a single prompt for Google AI
    let prompt = ""
    
    for (const message of messages) {
      if (message.role === "system") {
        prompt += `System: ${message.content}\n\n`
      } else if (message.role === "user") {
        prompt += `User: ${message.content}\n\n`
      } else if (message.role === "assistant") {
        prompt += `Assistant: ${message.content}\n\n`
      }
    }
    
    return prompt.trim()
  }

  private async updateUsageStats(provider: GoogleProvider, usage: any): Promise<void> {
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

  private parseError(error: any): GoogleError {
    if (error.status === 429 || error.message?.includes("quota") || error.message?.includes("rate limit")) {
      return {
        type: "rate_limit",
        message: "Rate limit exceeded",
        statusCode: error.status || 429,
        retryAfter: 60 // Default retry after 60 seconds
      }
    }

    if (error.status === 401 || error.status === 403 || error.message?.includes("API key")) {
      return {
        type: "authentication",
        message: "Authentication failed",
        statusCode: error.status || 401
      }
    }

    if (error.message?.includes("SAFETY") || error.message?.includes("safety")) {
      return {
        type: "safety_error",
        message: "Content blocked by safety filters",
        statusCode: error.status || 400
      }
    }

    if (error.status >= 500) {
      return {
        type: "api_error",
        message: "Google AI API error",
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

  private isRetryableError(error: GoogleError): boolean {
    return ["rate_limit", "api_error", "network_error", "timeout"].includes(error.type)
  }

  private async handleRateLimitError(providerName: string, error: GoogleError): Promise<void> {
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
export const googleConnector = new GoogleConnector()

// Export types and interfaces
export type {
  GoogleConfig,
  GoogleProvider,
  GoogleRequest,
  GoogleResponse,
  GoogleError
}

