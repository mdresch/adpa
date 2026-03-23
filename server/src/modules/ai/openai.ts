import OpenAI from "openai"
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { pool } from "../../database/connection"
import { logger } from "../../utils/logger"
import { isTracingEnabled, isNativeLangfuseEnabled } from '../../tracing'
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

// Types for internal use
export interface OpenAIConfig {
  apiKey: string
  organization?: string
  baseURL?: string
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
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>
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
      role: 'assistant'
      content: string | null
    }
    finish_reason: string
    delta?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider?: string
}

export interface OpenAIError {
  message: string
  type: string
  code?: string
  param?: string
}

export class OpenAIConnector {
  private providers: Map<string, OpenAIProvider> = new Map()
  private clients: Map<string, OpenAI> = new Map() // Keep native clients for management/listing
  private failoverQueue: string[] = []
  private readonly RATE_LIMIT_RESET_INTERVAL = 60 * 1000 // 1 minute

  constructor() {
    this.startRateLimitResetTimer()
  }

  /**
   * Initialize providers from database
   */
  async initializeProviders(): Promise<void> {
    try {
      const result = await pool.query(
        "SELECT * FROM ai_providers WHERE provider_type = 'openai' AND is_active = true ORDER BY priority ASC"
      )

      for (const row of result.rows) {
        // Decrypt API key (assuming it's stored encrypted, for now just using raw or base64)
        // In a real app, use proper encryption/decryption
        let apiKey = row.api_key_encrypted
        try {
          // If it looks like base64, try decoding
          if (!apiKey.startsWith('sk-')) {
            apiKey = Buffer.from(apiKey, 'base64').toString('utf-8')
          }
        } catch (e) {
          // Keep as is if decode fails
        }

        const config: OpenAIConfig = {
          apiKey,
          organization: row.configuration?.organization,
          baseURL: row.configuration?.baseURL
        }

        const provider: OpenAIProvider = {
          id: row.id,
          name: row.name,
          config,
          isActive: row.is_active,
          priority: row.priority,
          rateLimits: {
            requestsPerMinute: row.rate_limits?.requestsPerMinute || 3500,
            tokensPerMinute: row.rate_limits?.tokensPerMinute || 90000,
            requestsPerDay: row.rate_limits?.requestsPerDay || 10000
          },
          currentUsage: {
            requestsThisMinute: 0,
            tokensThisMinute: 0,
            requestsToday: 0,
            lastReset: new Date()
          }
        }

        this.addProvider(provider)
      }

      logger.info(`Initialized ${this.providers.size} OpenAI providers`)
    } catch (error) {
      logger.error("Failed to initialize OpenAI providers:", error)
      throw error // Re-throw to handle initialization failure
    }
  }

  /**
   * Add a provider to the pool
   */
  addProvider(provider: OpenAIProvider): void {
    // Validate config
    if (!provider.config.apiKey) {
      logger.warn(`Skipping provider ${provider.name}: No API key provided`)
      return
    }

    try {
      // Initialize native client for management tasks
      const client = new OpenAI({
        apiKey: provider.config.apiKey,
        organization: provider.config.organization,
        baseURL: provider.config.baseURL,
        timeout: 30000,
        maxRetries: 1 // We handle retries manually for better failover control
      })

      this.providers.set(provider.name, provider)
      this.clients.set(provider.name, client)
      this.updateFailoverQueue()

      logger.info(`Added OpenAI provider: ${provider.name}`)
    } catch (error) {
      logger.error(`Failed to initialize client for provider ${provider.name}:`, error)
    }
  }

  /**
   * Update the failover queue based on priority
   */
  private updateFailoverQueue(): void {
    this.failoverQueue = Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority)
      .map(p => p.name)
  }

  /**
   * Generate completion with failover support
   */
  async generateCompletion(request: OpenAIRequest, preferredProvider?: string): Promise<OpenAIResponse> {
    const providers = this.getAvailableProvidersList(preferredProvider)

    if (providers.length === 0) {
      throw new Error("No available OpenAI providers")
    }

    let lastError: OpenAIError | null = null

    // Create Langfuse trace for the overall completion request
    const langfuseTrace = isNativeLangfuseEnabled() ? langfuse.trace({
      name: 'openai-connector-completion',
      metadata: { model: request.model },
      tags: ['openai', request.model]
    }) : null

    let langfuseGeneration: any = null
    if (langfuseTrace) {
      langfuseGeneration = langfuseTrace.generation({
        name: 'openai-completion',
        model: request.model,
        modelParameters: {
          temperature: request.temperature,
          maxTokens: request.max_tokens,
          topP: request.top_p
        },
        input: request.messages
      })
    }

    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName)!

        // Check rate limits
        if (!this.checkRateLimits(provider)) {
          logger.warn(`Rate limit exceeded for provider ${providerName}, trying next provider`)
          continue
        }

        // Make API call using Vercel AI SDK
        const response = await this.makeApiCall(provider, request)

        // Update usage statistics
        if (response.usage) {
          await this.updateUsageStats(provider, response.usage)
        }

        // End Langfuse generation on success
        if (langfuseGeneration) {
          langfuseGeneration.end({
            output: response.choices[0]?.message?.content || '',
            usage: {
              promptTokens: response.usage?.prompt_tokens ?? 0,
              completionTokens: response.usage?.completion_tokens ?? 0,
              totalTokens: response.usage?.total_tokens ?? 0
            }
          })
          await langfuse.flushAsync()
        }

        return {
          ...response,
          provider: providerName,
        }

      } catch (error: any) {
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

    // All providers failed — end Langfuse generation with error
    if (langfuseGeneration) {
      langfuseGeneration.end({
        level: 'ERROR',
        statusMessage: lastError?.message || 'All OpenAI providers failed'
      })
      await langfuse.flushAsync()
    }

    throw new Error(`All OpenAI providers failed. Last error: ${lastError?.message || "Unknown error"}`)
  }

  /**
   * Get list of available providers sorted by priority
   */
  private getAvailableProvidersList(preferred?: string): string[] {
    let queue = [...this.failoverQueue]

    // If preferred provider is available and active, move to front
    if (preferred && this.providers.has(preferred) && this.providers.get(preferred)!.isActive) {
      queue = [preferred, ...queue.filter(p => p !== preferred)]
    }

    // Filter out inactive providers
    return queue.filter(name => this.providers.get(name)!.isActive)
  }

  /**
   * Check if request is within rate limits
   */
  public checkRateLimits(provider: OpenAIProvider): boolean {
    const now = Date.now()
    const { rateLimits, currentUsage } = provider

    // Check reset timer
    if (now - currentUsage.lastReset.getTime() > this.RATE_LIMIT_RESET_INTERVAL) {
      this.resetRateLimits(provider)
    }

    // Check limits
    if (currentUsage.requestsThisMinute >= rateLimits.requestsPerMinute) {
      return false
    }

    // Note: To verify tokens strictly, we'd need to estimate token count before request
    // For now we check based on accumulated usage
    if (currentUsage.tokensThisMinute >= rateLimits.tokensPerMinute) {
      return false
    }

    // Check daily limit (approximate reset check)
    if (currentUsage.requestsToday >= rateLimits.requestsPerDay) {
      // Reset daily at midnight (simplified logic)
      const today = new Date().setHours(0, 0, 0, 0)
      const lastResetDay = new Date(currentUsage.lastReset).setHours(0, 0, 0, 0)

      if (today > lastResetDay) {
        currentUsage.requestsToday = 0
      } else {
        return false
      }
    }

    return true
  }

  /**
   * Execute API call using Vercel AI SDK
   */
  private async makeApiCall(provider: OpenAIProvider, request: OpenAIRequest): Promise<OpenAIResponse> {
    const openai = createOpenAI({
      apiKey: provider.config.apiKey,
      organization: provider.config.organization,
      baseURL: provider.config.baseURL,
    })

    // Map legacy prompt/messages format if needed
    // The request.messages is already in the correct format for AI SDK

    const result = await generateText({
      model: openai(request.model),
      messages: request.messages as any, // Cast to any to avoid strict type checks on role
      temperature: request.temperature,
      maxOutputTokens: request.max_tokens, // updated for LanguageModelV2
      topP: request.top_p,
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
      stopSequences: typeof request.stop === 'string' ? [request.stop] : request.stop,
      experimental_telemetry: {
        isEnabled: isTracingEnabled(),
        functionId: 'openai-connector-api-call',
        metadata: {
          provider: provider.name,
          model: request.model
        }
      }
    } as any)

    // Normalize usage
    const usage = {
      prompt_tokens: (result as any)?.usage?.promptTokens ?? 0,
      completion_tokens: (result as any)?.usage?.completionTokens ?? 0,
      total_tokens: (result as any)?.usage?.totalTokens ?? ((result as any)?.usage?.promptTokens ?? 0) + ((result as any)?.usage?.completionTokens ?? 0)
    }

    return {
      id: `chatcmpl-${Date.now()}`, // AI SDK doesn't always perform exposed ID in same way
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.text
          },
          finish_reason: result.finishReason
        }
      ],
      usage
    }
  }

  private async updateUsageStats(provider: OpenAIProvider, usage: NonNullable<OpenAIResponse['usage']>) {
    provider.currentUsage.requestsThisMinute++
    provider.currentUsage.tokensThisMinute += usage.total_tokens
    provider.currentUsage.requestsToday++

    // Update DB asynchronously
    try {
      await pool.query(
        `UPDATE ai_providers 
         SET usage_stats = jsonb_set(
           jsonb_set(
             COALESCE(usage_stats, '{}'), 
             '{requestsToday}', 
             $2::text::jsonb
           ),
           '{tokensToday}',
           (COALESCE((usage_stats->>'tokensToday')::int, 0) + $3)::text::jsonb
         )
         WHERE id = $1`,
        [provider.id, provider.currentUsage.requestsToday, usage.total_tokens]
      )
    } catch (error) {
      logger.error(`Failed to update usage stats for provider ${provider.name}`, error)
    }
  }

  /**
   * Handle rate limit errors
   */
  private async handleRateLimitError(providerName: string, error: OpenAIError): Promise<void> {
    const provider = this.providers.get(providerName)
    if (!provider) return

    logger.warn(`Rate limit hit for ${providerName}. Pausing provider for 1 minute.`)

    // Deactivate temporarily
    provider.isActive = false

    // Schedule reactivation
    setTimeout(() => {
      provider.isActive = true
      this.resetRateLimits(provider)
      logger.info(`Reactivated provider ${providerName} after rate limit cooldown`)
    }, 60000)
  }

  private resetRateLimits(provider: OpenAIProvider) {
    provider.currentUsage.requestsThisMinute = 0
    provider.currentUsage.tokensThisMinute = 0
    provider.currentUsage.lastReset = new Date()
  }

  private startRateLimitResetTimer() {
    setInterval(() => {
      for (const provider of this.providers.values()) {
        if (Date.now() - provider.currentUsage.lastReset.getTime() > this.RATE_LIMIT_RESET_INTERVAL) {
          this.resetRateLimits(provider)
        }
      }
    }, 10000) // Check every 10 seconds
  }

  private parseError(error: any): OpenAIError {
    if (error.response?.data?.error) {
      return error.response.data.error
    }
    return {
      message: error.message || "Unknown error",
      type: error.type || "unknown",
      code: error.code
    }
  }

  private isRetryableError(error: OpenAIError): boolean {
    const retryableCodes = [
      'rate_limit_exceeded',
      'insufficient_quota',
      'server_error',
      'timeout'
    ]
    return retryableCodes.includes(error.code || '') || error.type === 'server_error'
  }

  /**
   * Get available models from providers
   * Uses the native OpenAI client for this management task as AI SDK doesn't support listing models yet
   */
  async getAvailableModels(preferredProvider?: string): Promise<any[]> {
    const providers = this.getAvailableProvidersList(preferredProvider)
    const defaultModels = ["gpt-4", "gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4-turbo"].map(id => ({ id, name: id }))

    for (const providerName of providers) {
      try {
        const client = this.clients.get(providerName)
        if (!client) continue

        const response = await client.models.list()
        const models = response.data
          .filter(model => model.id.startsWith('gpt')) // Filter for GPT models
          .map(model => ({
            id: model.id,
            name: model.id, // Or a more display-friendly name if available
            context_window: (model as any).context_window || 0, // Assuming context_window is available
            description: `Owner: ${model.owned_by}`
          }))

        if (models.length > 0) {
          return models
        }
      } catch (error) {
        logger.warn(`Failed to fetch models from ${providerName}`, error)
        continue
      }
    }

    return defaultModels
  }

  /**
   * Test connection to specific provider
   * Keeping native client check for connection verification
   */
  async testConnection(providerName: string): Promise<boolean> {
    try {
      const client = this.clients.get(providerName)
      if (!client) return false

      await client.models.list()
      return true
    } catch (error) {
      logger.error(`Connection test failed for provider ${providerName}`, error)
      return false
    }
  }
}

// Export singleton instance
export const openaiConnector = new OpenAIConnector()
