/**
 * Unified AI Service using AI SDK
 * Provides a single interface for all AI providers using the AI SDK
 */

import { generateText, generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createAzure } from '@ai-sdk/azure'
import { createOllama } from 'ollama-ai-provider-v2'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { isTracingEnabled, isNativeLangfuseEnabled } from '../tracing'
import { Langfuse } from 'langfuse'
import { asyncLocalStorage } from '../infrastructure/logger'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'google' | 'mistral' | 'azure' | 'ollama' | 'foundry-local'
  apiKey: string
  baseURL?: string
  isActive: boolean
  priority: number
  configuration?: any
  default_model?: string
}

export interface AIGenerateRequest {
  prompt: string
  provider: string
  model?: string
  temperature?: number
  max_tokens?: number
  messages?: Array<{ role: string; content: string }>
  traceName?: string
  projectId?: string
  documentId?: string
  userId?: string
  template_id?: string
}

export interface AIStructuredGenerateRequest extends AIGenerateRequest {
  schema: any // Zod schema
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

  private initialized = false

  constructor() {
    // Initialize providers when service is created
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeProviders()
    }
  }

  /**
   * Initialize all AI providers from database
   */
  async initializeProviders(): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT 
          id, name, provider_type, api_key_encrypted, configuration, is_active,
          default_model,
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
            apiKey: this.resolveApiKey(row.provider_type, row.api_key_encrypted),
            baseURL: row.configuration?.baseURL,
            isActive: row.is_active,
            priority: row.priority,
            configuration: row.configuration,
            default_model: row.default_model,
          }

          await this.addProvider(provider)
        } catch (providerError) {
          logger.warn(`Failed to initialize AI provider '${row.name}', skipping:`, providerError)
          continue
        }
      }

      this.initialized = true
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
      ...provider.configuration,
      apiKey: provider.apiKey,
      baseURL: provider.baseURL || provider.configuration?.baseURL,
    }

    switch (provider.type) {
      case 'openai':
        return createOpenAI(config)
      case 'google':
        return createGoogleGenerativeAI(config)
      case 'mistral':
        return createMistral(config)
      case 'azure':
        return createAzure(config)
      case 'ollama': {
        const ollamaBaseUrl = provider.baseURL || provider.configuration?.endpoint || 'http://localhost:11434'
        const baseURL = ollamaBaseUrl.endsWith('/api') ? ollamaBaseUrl : `${ollamaBaseUrl}/api`
        return createOllama({ baseURL })
      }
      case 'foundry-local': {
        const foundryBaseUrl = provider.baseURL || provider.configuration?.endpoint || 'http://localhost:8080/v1'
        const baseURL = foundryBaseUrl.endsWith('/v1') ? foundryBaseUrl : `${foundryBaseUrl}/v1`
        return createOpenAI({
          ...provider.configuration,
          baseURL,
          apiKey: provider.apiKey || 'not-required',
        })
      }
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

    try {
      await this.ensureInitialized()

      // 1. Resolve starting provider
      let startingProvider = this.providers.get(request.provider)
      if (!startingProvider) {
        const lower = request.provider.toLowerCase()
        startingProvider = Array.from(this.providers.values()).find(
          p => p.name.toLowerCase() === lower || p.type.toLowerCase() === lower
        )
      }

      // 2. Build provider fallback chain
      const activeProviders = Array.from(this.providers.values()).filter(p => p.isActive)
      const chain: AIProvider[] = []
      if (startingProvider && startingProvider.isActive) {
        chain.push(startingProvider)
      }
      for (const p of activeProviders) {
        if (!chain.some(item => item.id === p.id)) {
          chain.push(p)
        }
      }

      if (chain.length === 0) {
        throw new Error(`Provider ${request.provider} not found and no active fallback provider available`)
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

      // Create Langfuse trace (overall trace, once)
      langfuseTrace = isNativeLangfuseEnabled() ? langfuse.trace({
        name: request.traceName || `unified-ai-generate-chain`,
        sessionId: request.projectId || request.documentId || undefined,
        userId: request.userId,
        metadata: {
          requestedProvider: request.provider,
          projectId: request.projectId,
          documentId: request.documentId,
          templateId: request.template_id,
          correlationId: asyncLocalStorage.getStore(),
        },
        tags: [request.provider]
      }) : null

      let lastError: any = null

      for (let i = 0; i < chain.length; i++) {
        const provider = chain[i]
        const isFallbackChainStep = i > 0
        
        let model = request.model
        if (isFallbackChainStep || !model) {
          model = provider.configuration?.defaultModel || provider.configuration?.default_model || provider.default_model || this.getDefaultModel(provider.type)
        }

        const client = this.clients.get(provider.name)
        if (!client) {
          logger.warn(`[UNIFIED-AI] Client for provider '${provider.name}' not found, skipping fallback`)
          continue
        }

        if (isFallbackChainStep) {
          logger.warn(`[UNIFIED-AI] Previous provider failed. Falling back to '${provider.name}' using model '${model}'`)
        }

        // Langfuse generation inside the loop
        let langfuseGeneration: any = null
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

        try {
          // Generate content using AI SDK with maxRetries set to 1 to fail fast and fallback
          const response = await generateText({
            model: client(model),
            messages: messages.map(msg => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
            })),
            maxOutputTokens: request.max_tokens || 8000,
            temperature: request.temperature || 0.7,
            maxRetries: 1, // Fail fast to trigger fallback
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: `unified-ai-generate-${provider.type}`,
              metadata: {
                provider: provider.name,
                model: model,
                correlationId: asyncLocalStorage.getStore()
              }
            }
          })

          logger.info(`Generated content using AI provider: ${provider.name} (model: ${model})`)

          const {
            promptTokens,
            completionTokens,
            totalTokens,
          } = this.normalizeUsage(response.usage)

          if (langfuseGeneration) {
            try {
              langfuseGeneration.end({
                output: response.text,
                usage: {
                  promptTokens,
                  completionTokens,
                  totalTokens
                }
              })
              langfuse.flushAsync().catch((err: any) => {
                logger.warn('[UNIFIED-AI] Langfuse telemetry flush failed (non-blocking)', { error: err.message || err })
              })
            } catch (telemetryError) {
              logger.warn('[UNIFIED-AI] Langfuse telemetry failed (non-blocking)', { error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) })
            }
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
              langfuseTraceId: langfuseTrace?.id,
              langfuseObservationId: langfuseGeneration?.id
            }
          }
        } catch (err: any) {
          logger.warn(`[UNIFIED-AI] Provider '${provider.name}' failed: ${err?.message || err}`)
          lastError = err

          if (langfuseGeneration) {
            try {
              langfuseGeneration.end({
                level: 'ERROR',
                statusMessage: err instanceof Error ? err.message : String(err)
              })
              await langfuse.flushAsync()
            } catch (telemetryError) {
              logger.warn('[UNIFIED-AI] Langfuse telemetry failure in error handler (non-blocking)', { error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) })
            }
          }

          // Continue to next provider in fallback chain
        }
      }

      logger.error(`[UNIFIED-AI] All providers in the chain failed. Last error:`, lastError)
      throw lastError || new Error(`All providers in the fallback chain failed to generate content`)
    } catch (error) {
      throw error
    }
  }

  /**
   * Generate structured object using AI SDK v5
   */
  async generateStructuredObject(request: AIStructuredGenerateRequest): Promise<{ object: any; usage?: any }> {
    let langfuseTrace: any = null

    try {
      await this.ensureInitialized()

      // 1. Resolve starting provider
      let startingProvider = this.providers.get(request.provider)
      if (!startingProvider) {
        const lower = request.provider.toLowerCase()
        startingProvider = Array.from(this.providers.values()).find(
          p => p.name.toLowerCase() === lower || p.type.toLowerCase() === lower
        )
      }

      // 2. Build provider fallback chain
      const activeProviders = Array.from(this.providers.values()).filter(p => p.isActive)
      const chain: AIProvider[] = []
      if (startingProvider && startingProvider.isActive) {
        chain.push(startingProvider)
      }
      for (const p of activeProviders) {
        if (!chain.some(item => item.id === p.id)) {
          chain.push(p)
        }
      }

      if (chain.length === 0) {
        throw new Error(`Provider ${request.provider} not found and no active fallback provider available`)
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

      // Create Langfuse trace (overall trace, once)
      langfuseTrace = isNativeLangfuseEnabled() ? langfuse.trace({
        name: request.traceName || `unified-ai-generate-object-chain`,
        sessionId: request.projectId || request.documentId || undefined,
        userId: request.userId,
        metadata: {
          requestedProvider: request.provider,
          projectId: request.projectId,
          documentId: request.documentId,
          templateId: request.template_id,
          correlationId: asyncLocalStorage.getStore(),
        },
        tags: [request.provider]
      }) : null

      let lastError: any = null

      for (let i = 0; i < chain.length; i++) {
        const provider = chain[i]
        const isFallbackChainStep = i > 0
        
        let model = request.model
        if (isFallbackChainStep || !model) {
          model = provider.configuration?.defaultModel || provider.configuration?.default_model || provider.default_model || this.getDefaultModel(provider.type)
        }

        const client = this.clients.get(provider.name)
        if (!client) {
          logger.warn(`[UNIFIED-AI] Client for provider '${provider.name}' not found, skipping fallback`)
          continue
        }

        if (isFallbackChainStep) {
          logger.warn(`[UNIFIED-AI] Previous provider failed. Falling back to '${provider.name}' using model '${model}'`)
        }

        // Langfuse generation inside the loop
        let langfuseGeneration: any = null
        if (langfuseTrace) {
          langfuseGeneration = langfuseTrace.generation({
            name: `${provider.type}-object-generation`,
            model: model,
            modelParameters: {
              temperature: request.temperature,
            },
            input: messages
          })
        }

        try {
          // Generate object using AI SDK with maxRetries set to 1 to fail fast and fallback
          const response = await generateObject({
            model: client(model),
            schema: request.schema,
            messages: messages.map(msg => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
            })),
            maxTokens: request.max_tokens || 8000,
            temperature: request.temperature || 0.7,
            maxRetries: 1, // Fail fast to trigger fallback
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: `unified-ai-generate-object-${provider.type}`,
              metadata: {
                provider: provider.name,
                model: model,
                correlationId: asyncLocalStorage.getStore(),
              }
            }
          })

          logger.info(`Generated structured object using AI provider: ${provider.name} (model: ${model})`)

          const {
            promptTokens,
            completionTokens,
            totalTokens,
          } = this.normalizeUsage(response.usage)

          if (langfuseGeneration) {
            try {
              langfuseGeneration.end({
                output: JSON.stringify(response.object),
                usage: {
                  promptTokens,
                  completionTokens,
                  totalTokens
                }
              })
              await langfuse.flushAsync()
            } catch (telemetryError) {
              logger.warn('[UNIFIED-AI] Langfuse structured telemetry failed (non-blocking)', { error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) })
            }
          }

          return {
            object: response.object,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            },
            metadata: {
              langfuseTraceId: langfuseTrace?.id,
              langfuseObservationId: langfuseGeneration?.id
            }
          }
        } catch (err: any) {
          logger.warn(`[UNIFIED-AI] Provider '${provider.name}' structured generation failed: ${err?.message || err}`)
          lastError = err

          if (langfuseGeneration) {
            try {
              langfuseGeneration.end({
                level: 'ERROR',
                statusMessage: err instanceof Error ? err.message : String(err)
              })
              await langfuse.flushAsync()
            } catch (telemetryError) {
              logger.warn('[UNIFIED-AI] Langfuse structured failure telemetry failed (non-blocking)', { error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) })
            }
          }

          // Continue to next provider in fallback chain
        }
      }

      logger.error(`[UNIFIED-AI] All providers in the structured generation chain failed. Last error:`, lastError)
      throw lastError || new Error(`All providers in the fallback chain failed to generate structured object`)
    } catch (error) {
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
        'mistral-large-2411', 'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
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
          'mistral-large-2411', 'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
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
      case 'foundry-local':
        return 'gpt-3.5-turbo'
      case 'google':
        return 'gemini-2.5-flash'
      case 'mistral':
        return 'mistral-large-2411'
      case 'ollama':
        return 'qwen3:8b'
      default:
        return 'gpt-3.5-turbo'
    }
  }

  /**
   * Validate API key format (no live API call during initialization).
   * Actual connectivity errors will surface at generation time with meaningful errors.
   */
  private async validateApiKey(provider: AIProvider): Promise<void> {
    // Local providers don't need API keys
    if (provider.type === 'ollama' || provider.type === 'foundry-local') {
      logger.debug(`Skipping API key check for local provider: ${provider.name}`)
      return
    }

    // Cloud providers: just verify the key is non-empty and appears to be base64/plain text
    if (!provider.apiKey || provider.apiKey.trim().length === 0) {
      throw new Error(`API key for provider '${provider.name}' is empty or missing`)
    }

    logger.debug(`API key format validated for provider: ${provider.name} (live connectivity check deferred to generation time)`)
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

  private resolveApiKey(providerType: AIProvider['type'], encryptedKey: string | null | undefined): string {
    if (!encryptedKey) {
      if (providerType === 'ollama' || providerType === 'foundry-local') {
        return ''
      }
      throw new Error(`API key for provider type '${providerType}' is empty or missing`)
    }

    return this.decryptApiKey(encryptedKey)
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
      await this.ensureInitialized()
      let provider = this.providers.get(request.provider)
      let model = request.model
      let isFallback = false
      if (!provider) {
        const lower = request.provider.toLowerCase()
        provider = Array.from(this.providers.values()).find(
          p => p.name.toLowerCase() === lower || p.type.toLowerCase() === lower
        )
      }
      if (!provider || !provider.isActive) {
        const firstActive = Array.from(this.providers.values()).find(p => p.isActive)
        if (firstActive) {
          logger.warn(`Requested provider '${request.provider}' not found or inactive. Falling back to '${firstActive.name}'`)
          provider = firstActive
          isFallback = true
        }
      }
      if (!provider) {
        throw new Error(`Provider ${request.provider} not found and no active fallback provider available`)
      }

      const client = this.clients.get(provider.name)
      if (!client) {
        throw new Error(`Client for provider ${provider.name} not found`)
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

      // Get default model if not specified or if we used a fallback provider
      if (isFallback || !model) {
        model = provider.configuration?.defaultModel || provider.configuration?.default_model || provider.default_model || this.getDefaultModel(provider.type)
      }

      // Create Langfuse trace and generation
      langfuseTrace = isNativeLangfuseEnabled() ? langfuse.trace({
        name: `unified-ai-stream-${provider.type}`,
        sessionId: request.projectId || request.documentId || undefined,
        userId: request.userId,
        metadata: {
          provider: provider.name,
          projectId: request.projectId,
          documentId: request.documentId,
          templateId: request.template_id,
          correlationId: asyncLocalStorage.getStore(),
        },
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
            model: model,
            correlationId: asyncLocalStorage.getStore(),
          }
        }
      })

      logger.info(`Streaming content using AI provider: ${provider.name}`)

      if (langfuseGeneration) {
        try {
          langfuseGeneration.end({
            output: result.text,
            usage: {
              promptTokens: (result as any)?.usage?.promptTokens ?? 0,
              completionTokens: (result as any)?.usage?.completionTokens ?? 0,
              totalTokens: (result as any)?.usage?.totalTokens ?? 0
            }
          })
          await langfuse.flushAsync()
        } catch (telemetryError) {
          logger.warn('[UNIFIED-AI] Langfuse stream telemetry failed (non-blocking)', { error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) })
        }
      }

      return result

    } catch (error) {
      logger.error(`Failed to stream content with AI provider ${request.provider}:`, error)
      if (langfuseGeneration) {
        try {
          langfuseGeneration.end({
            level: 'ERROR',
            statusMessage: error instanceof Error ? error.message : String(error)
          })
          await langfuse.flushAsync()
        } catch (telemetryError) {
          logger.warn('[UNIFIED-AI] Langfuse stream failure telemetry failed (non-blocking)', { error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError) })
        }
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
