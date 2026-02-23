/**
 * Unified AI Service using AI SDK
 * Provides a single interface for all AI providers using the AI SDK
 */

import { generateText, generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
// import { google } from '@ai-sdk/google' // Package not installed
import { mistral } from '@ai-sdk/mistral'
// import { azure } from '@ai-sdk/azure' // Package not installed
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { isTracingEnabled } from '../tracing'
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'google' | 'mistral' | 'azure'
  apiKey: string
  baseURL?: string
  isActive: boolean
  priority: number
  configuration?: any
}

export interface AIGenerateRequest {
  prompt: string
  provider: string
  model?: string
  temperature?: number
  max_tokens?: number
  messages?: Array<{ role: string; content: string }>
}

export interface AIGenerateResponse {
  content: string
  provider: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  metadata?: any
}

class UnifiedAIService {
  private providers: Map<string, AIProvider> = new Map()
  private clients: Map<string, any> = new Map()

  constructor() {
    // Initialize providers when service is created
  }

  /**
   * Initialize all AI providers from database
   */
  async initializeProviders(): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, provider_type, api_key_encrypted, configuration, is_active,
          COALESCE(priority, 1) as priority
        FROM ai_providers 
        WHERE is_active = true
        ORDER BY priority ASC, name ASC
      `)

      for (const row of result.rows) {
        try {
          const provider: AIProvider = {
            id: row.id,
            name: row.name,
            type: row.provider_type,
            apiKey: this.decryptApiKey(row.api_key_encrypted),
            baseURL: row.configuration?.baseURL,
            isActive: row.is_active,
            priority: row.priority,
            configuration: row.configuration
          }

          await this.addProvider(provider)
        } catch (providerError) {
          logger.warn(`Failed to initialize AI provider '${row.name}', skipping:`, providerError)
          continue
        }
      }

      logger.info(`Initialized ${this.providers.size} AI providers using AI SDK`)
    } catch (error) {
      logger.error("Failed to initialize AI providers:", error)
      // Don't throw error to prevent server crash
    }
  }

  /**
   * Add a new AI provider
   */
  async addProvider(provider: AIProvider): Promise<void> {
    try {
      // Validate API key
      await this.validateApiKey(provider)

      // Create AI SDK client based on provider type
      const client = this.createAISDKClient(provider)
      this.clients.set(provider.name, client)
      this.providers.set(provider.name, provider)

      logger.info(`Added AI provider: ${provider.name} (${provider.type})`)
    } catch (error) {
      logger.error(`Failed to add AI provider ${provider.name}:`, error)
      throw error
    }
  }

  /**
   * Create AI SDK client based on provider type
   */
  private createAISDKClient(provider: AIProvider): any {
    const config = {
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      ...provider.configuration
    }

    switch (provider.type) {
      case 'openai':
        return openai(config)
      case 'google':
        throw new Error('Google AI SDK not installed. Install @ai-sdk/google to use this provider.')
      // return google(config)
      case 'mistral':
        return mistral(config)
      case 'azure':
        throw new Error('Azure AI SDK not installed. Install @ai-sdk/azure to use this provider.')
      // return azure(config)
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`)
    }
  }

  private normalizeUsage(usage: any | undefined): {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  } {
    if (!usage) {
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    }

    return {
      promptTokens: usage.prompt_tokens ?? usage.promptTokens ?? 0,
      completionTokens: usage.completion_tokens ?? usage.completionTokens ?? 0,
      totalTokens: usage.total_tokens ?? usage.totalTokens ?? 0,
    }
  }

  /**
   * Generate content using AI SDK v5
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    let langfuseTrace: any = null
    let langfuseGeneration: any = null

    try {
      const provider = this.providers.get(request.provider)
      if (!provider) {
        throw new Error(`Provider ${request.provider} not found`)
      }

      if (!provider.isActive) {
        throw new Error(`Provider ${provider.name} is not active`)
      }

      const client = this.clients.get(request.provider)
      if (!client) {
        throw new Error(`Client for provider ${request.provider} not found`)
      }

      // Prepare messages
      let messages: Array<{ role: string; content: string }> = []

      if (request.messages) {
        messages = request.messages
      } else if (request.prompt) {
        messages = [{ role: 'user', content: request.prompt }]
      } else {
        throw new Error('No prompt or messages provided')
      }

      // Get default model if not specified
      const model = request.model || this.getDefaultModel(provider.type)

      // Create Langfuse trace and generation
      langfuseTrace = isTracingEnabled() ? langfuse.trace({
        name: `unified-ai-generate-${provider.type}-entity`,
        metadata: { provider: provider.name },
        tags: [provider.type, model]
      }) : null

      if (langfuseTrace) {
        langfuseGeneration = langfuseTrace.generation({
          name: `${provider.type}-generation`,
          model: model,
          modelParameters: {
            temperature: request.temperature,
            maxTokens: request.max_tokens
          },
          input: messages
        })
      }

      // Generate content using AI SDK
      const response = await generateText({
        model: client(model),
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        maxOutputTokens: request.max_tokens || 8000,
        temperature: request.temperature || 0.7,
        experimental_telemetry: {
          isEnabled: isTracingEnabled(),
          functionId: `unified-ai-generate-${provider.type}`,
          metadata: {
            provider: provider.name,
            model: model
          }
        }
      })

      logger.info(`Generated content using AI provider: ${provider.name}`)

      const {
        promptTokens,
        completionTokens,
        totalTokens,
      } = this.normalizeUsage(response.usage)

      if (langfuseGeneration) {
        langfuseGeneration.end({
          output: response.text,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens
          }
        })
        await langfuse.flushAsync()
      }

      return {
        content: response.text,
        provider: provider.name,
        model: model,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
        },
        metadata: {
          finishReason: response.finishReason,
          model: response.model,
        }
      }

    } catch (error) {
      logger.error(`Failed to generate content with AI provider ${request.provider}:`, error)
      if (langfuseGeneration) {
        langfuseGeneration.end({
          level: 'ERROR',
          statusMessage: error instanceof Error ? error.message : String(error)
        })
        await langfuse.flushAsync()
      }
      throw error
    }
  }

  /**
   * Get available models for a provider
   */
  async getAvailableModels(providerName?: string): Promise<string[]> {
    if (!providerName) {
      // Return all default models for all providers
      return [
        // OpenAI models
        'gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4-0125-preview',
        'gpt-4-1106-preview', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-1106', 'gpt-3.5-turbo-0125',
        // Google models
        'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
        // Mistral models
        'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
        'mistral-tiny', 'codestral-latest', 'pixtral-12b-2409', 'pixtral-large-latest',
        // Azure models (same as OpenAI)
        'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'
      ]
    }

    const provider = this.providers.get(providerName)
    if (!provider) {
      return this.getDefaultModels(providerName)
    }

    // For now, return default models for each provider type
    // In the future, we could make actual API calls to get available models
    return this.getDefaultModels(provider.type)
  }

  /**
   * Get default models for a provider type
   */
  private getDefaultModels(providerType: string): string[] {
    switch (providerType) {
      case 'openai':
      case 'azure':
        return [
          'gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4-0125-preview',
          'gpt-4-1106-preview', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k',
          'gpt-3.5-turbo-1106', 'gpt-3.5-turbo-0125'
        ]
      case 'google':
        return ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
      case 'mistral':
        return [
          'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
          'mistral-tiny', 'codestral-latest', 'pixtral-12b-2409', 'pixtral-large-latest'
        ]
      default:
        return []
    }
  }

  /**
   * Get default model for a provider type
   */
  private getDefaultModel(providerType: string): string {
    switch (providerType) {
      case 'openai':
      case 'azure':
        return 'gpt-3.5-turbo'
      case 'google':
        return 'gemini-2.5-flash'
      case 'mistral':
        return 'mistral-large-latest'
      default:
        return 'gpt-3.5-turbo'
    }
  }

  /**
   * Validate API key by making a simple test request
   */
  private async validateApiKey(provider: AIProvider): Promise<void> {
    try {
      const client = this.createAISDKClient(provider)
      const defaultModel = this.getDefaultModel(provider.type)

      // Test the API key by making a simple request
      await generateText({
        model: client(defaultModel),
        messages: [{ role: 'user', content: 'Hello' }],
        maxOutputTokens: 1,
      })
    } catch (error: any) {
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
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Stream content using AI SDK v5 streaming capabilities
   */
  async stream(request: AIGenerateRequest) {
    let langfuseTrace: any = null
    let langfuseGeneration: any = null

    try {
      const provider = this.providers.get(request.provider)
      if (!provider) {
        throw new Error(`Provider ${request.provider} not found`)
      }

      if (!provider.isActive) {
        throw new Error(`Provider ${provider.name} is not active`)
      }

      const client = this.clients.get(request.provider)
      if (!client) {
        throw new Error(`Client for provider ${request.provider} not found`)
      }

      // Prepare messages
      let messages: Array<{ role: string; content: string }> = []

      if (request.messages) {
        messages = request.messages
      } else if (request.prompt) {
        messages = [{ role: 'user', content: request.prompt }]
      } else {
        throw new Error('No prompt or messages provided')
      }

      // Get default model if not specified
      const model = request.model || this.getDefaultModel(provider.type)

      // Create Langfuse trace and generation
      langfuseTrace = isTracingEnabled() ? langfuse.trace({
        name: `unified-ai-stream-${provider.type}`,
        metadata: { provider: provider.name },
        tags: [provider.type, model]
      }) : null

      if (langfuseTrace) {
        langfuseGeneration = langfuseTrace.generation({
          name: `${provider.type}-stream`,
          model: model,
          modelParameters: {
            temperature: request.temperature,
            maxTokens: request.max_tokens
          },
          input: messages
        })
      }

      // Stream content using AI SDK v4 (generateText for now)
      const result = await generateText({
        model: client(model),
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        maxOutputTokens: request.max_tokens || 8000,
        temperature: request.temperature || 0.7,
        experimental_telemetry: {
          isEnabled: isTracingEnabled(),
          functionId: `unified-ai-stream-${provider.type}`,
          metadata: {
            provider: provider.name,
            model: model
          }
        }
      })

      logger.info(`Streaming content using AI provider: ${provider.name}`)

      if (langfuseGeneration) {
        langfuseGeneration.end({
          output: result.text,
          usage: {
            promptTokens: (result as any)?.usage?.promptTokens ?? 0,
            completionTokens: (result as any)?.usage?.completionTokens ?? 0,
            totalTokens: (result as any)?.usage?.totalTokens ?? 0
          }
        })
        await langfuse.flushAsync()
      }

      return result

    } catch (error) {
      logger.error(`Failed to stream content with AI provider ${request.provider}:`, error)
      if (langfuseGeneration) {
        langfuseGeneration.end({
          level: 'ERROR',
          statusMessage: error instanceof Error ? error.message : String(error)
        })
        await langfuse.flushAsync()
      }
      throw error
    }
  }

  /**
   * Update usage statistics (placeholder for future implementation)
   */
  async updateUsageStats(providerName: string, usage: any): Promise<void> {
    // TODO: Implement usage statistics tracking
    logger.debug(`Usage stats for ${providerName}:`, usage)
  }
}

// Export singleton instance
export const unifiedAIService = new UnifiedAIService()
