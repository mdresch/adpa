/**
 * AI Service - AI Gateway Integration with Direct Provider Fallback
 * Primary: Vercel AI SDK and AI Gateway for unified multi-provider access
 * Fallback: Direct provider SDKs when AI Gateway unavailable
 * Version: 3.1 - AI Gateway + Direct Fallback
 */

import { generateText } from "ai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createXai } from "@ai-sdk/xai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import OpenAI from "openai"  // Native OpenAI SDK for Moonshot
import Anthropic from "@anthropic-ai/sdk"  // Native Anthropic SDK
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import AnalyticsTrackingService from "./analyticsTrackingService"
import { isTracingEnabled } from "../tracing"
import { Langfuse } from "langfuse"

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"
});

export interface AIProvider {
  name: string
  type: "openai" | "google" | "azure" | "mistral" | "groq" | "anthropic" | "deepseek" | "moonshot" | "xai" | "ollama"
  apiKey: string
  configuration?: any
}

export interface AIGenerateRequest {
  prompt: string
  provider: string
  model?: string
  temperature?: number
  max_tokens?: number
  template_id?: string
  variables?: Record<string, any>
  system_prompt?: string
  // Analytics tracking (optional)
  userId?: string
  projectId?: string
  documentId?: string
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

interface ProviderBackoffState {
  provider: string
  failureCount: number
  lastFailureTime: number
  nextRetryTime: number
}

class AIService {
  private providerBackoff: Map<string, ProviderBackoffState> = new Map()
  private readonly INITIAL_BACKOFF_MS = 1000 // 1 second
  private readonly MAX_BACKOFF_MS = 60000 // 60 seconds
  private readonly BACKOFF_MULTIPLIER = 2
  private readonly BACKOFF_JITTER = 0.1 // 10% jitter

  constructor() {
    logger.info("AI Service initialized - will fetch AI Gateway key from database")
  }

  /**
   * Decrypt API key (simple base64 as used in aiProviderService)
   */
  private decryptApiKey(encryptedApiKey?: string): string | undefined {
    if (!encryptedApiKey) return undefined
    try {
      return Buffer.from(encryptedApiKey, 'base64').toString('utf-8')
    } catch (error) {
      logger.error('Failed to decrypt API key:', error)
      return undefined
    }
  }

  private normalizeUsage(usage: any) {
    const inputTokens =
      usage?.inputTokens ??
      usage?.prompt_tokens ??
      usage?.promptTokens ??
      0
    const outputTokens =
      usage?.outputTokens ??
      usage?.completion_tokens ??
      usage?.completionTokens ??
      0
    const explicitTotal =
      usage?.totalTokens ??
      usage?.total_tokens ??
      usage?.totalTokens ??
      0
    const totalTokens = explicitTotal || inputTokens + outputTokens

    return {
      inputTokens,
      outputTokens,
      totalTokens,
    }
  }

  async initializeProviders() {
    try {
      // With AI Gateway, we don't need to initialize individual provider clients
      // Just verify we have active providers in the database
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM ai_providers WHERE is_active = true"
      )

      if (!result || !result.rows) {
        logger.warn('AI Service: initializeProviders query returned no result')
        return
      }

      const count = parseInt(result.rows[0]?.count || '0')
      logger.info(`AI Gateway ready. ${count} provider(s) configured in database`)
    } catch (error) {
      logger.error("Failed to check AI providers:", error)
    }
  }

  // AI Gateway doesn't require provider-specific initialization
  // This method is kept for compatibility but does nothing
  async addProvider(provider: AIProvider) {
    logger.info(`Provider ${provider.name} (${provider.type}) registered in database`)
  }

  /**
   * Calculate backoff delay for a provider based on failure count
   */
  private calculateBackoffDelay(failureCount: number): number {
    // Exponential backoff: delay = initial * (multiplier ^ failureCount)
    let delay = this.INITIAL_BACKOFF_MS * Math.pow(this.BACKOFF_MULTIPLIER, failureCount - 1)

    // Cap at max backoff
    delay = Math.min(delay, this.MAX_BACKOFF_MS)

    // Add jitter to prevent thundering herd (±10%)
    const jitter = delay * this.BACKOFF_JITTER * (Math.random() * 2 - 1)
    delay = delay + jitter

    return Math.floor(delay)
  }

  /**
   * Check if provider is available (not in backoff period)
   */
  private isProviderAvailable(provider: string): boolean {
    const backoffState = this.providerBackoff.get(provider)

    if (!backoffState) {
      return true // No backoff state, provider is available
    }

    const now = Date.now()
    if (now < backoffState.nextRetryTime) {
      const waitTime = Math.ceil((backoffState.nextRetryTime - now) / 1000)
      logger.info(`⏸️ [AI-BACKOFF] Provider ${provider} in backoff, retry in ${waitTime}s`)
      return false
    }

    return true
  }

  /**
   * Record provider failure and update backoff state
   */
  private recordProviderFailure(provider: string): void {
    const now = Date.now()
    const existingState = this.providerBackoff.get(provider)

    const failureCount = existingState ? existingState.failureCount + 1 : 1
    const backoffDelay = this.calculateBackoffDelay(failureCount)
    const nextRetryTime = now + backoffDelay

    this.providerBackoff.set(provider, {
      provider,
      failureCount,
      lastFailureTime: now,
      nextRetryTime
    })

    logger.warn(`⏸️ [AI-BACKOFF] Provider ${provider} failed (attempt ${failureCount}), backing off for ${Math.ceil(backoffDelay / 1000)}s`)
  }

  /**
   * Reset backoff state for provider after successful request
   */
  private resetProviderBackoff(provider: string): void {
    const existingState = this.providerBackoff.get(provider)

    if (existingState && existingState.failureCount > 0) {
      logger.info(`✅ [AI-BACKOFF] Provider ${provider} recovered, resetting backoff (was ${existingState.failureCount} failures)`)
      this.providerBackoff.delete(provider)
    }
  }

  /**
   * Get list of active providers from database, ordered by priority
   */
  private async getActiveProviders(): Promise<string[]> {
    try {
      const result = await pool.query(
        `SELECT provider_type 
         FROM ai_providers 
         WHERE is_active = true 
         ORDER BY priority ASC, name ASC`
      )

      if (!result || !result.rows) {
        logger.warn('AI Service: getActiveProviders query returned no result, returning default list')
        return ['google', 'mistral', 'groq']
      }

      const providers = result.rows.map(row => row.provider_type)
      logger.info(`📋 [AI-FALLBACK] Active providers available: ${providers.join(', ')}`)
      return providers
    } catch (error) {
      logger.error('Failed to get active providers:', error)
      // Return default fallback list if DB query fails
      return ['google', 'mistral', 'groq']
    }
  }

  /**
   * Generate with automatic fallback to alternative providers
   * Dynamically checks database for active providers with exponential backoff
   */
  async generateWithFallback(
    request: AIGenerateRequest,
    fallbackProviders?: string[]
  ): Promise<AIGenerateResponse & { providerUsed: string }> {
    // Always get active providers from database for filtering
    const activeProvidersFromDb = await this.getActiveProviders()

    // Build provider list
    let availableProviders: string[]
    if (fallbackProviders && fallbackProviders.length > 0) {
      // Filter fallback list to only include active providers
      availableProviders = fallbackProviders.filter(p => activeProvidersFromDb.includes(p))
    } else {
      availableProviders = activeProvidersFromDb
    }

    // Check if requested provider is active
    const isRequestedProviderActive = activeProvidersFromDb.includes(request.provider)

    // Build provider chain: only include requested provider if it's active
    let providers: string[]
    if (isRequestedProviderActive) {
      providers = [request.provider, ...availableProviders.filter(p => p !== request.provider)]
    } else {
      logger.info(`⚠️ [AI-FALLBACK] Requested provider ${request.provider} is not active, using active providers only`)
      providers = availableProviders
    }

    // Filter out providers in backoff period
    const providersBeforeBackoff = providers.length
    providers = providers.filter(p => this.isProviderAvailable(p))

    if (providers.length < providersBeforeBackoff) {
      const skipped = providersBeforeBackoff - providers.length
      logger.info(`⏸️ [AI-BACKOFF] Skipped ${skipped} provider(s) in backoff period`)
    }

    // Auto-disable providers with insufficient funds
    const autoDisableProvider = async (providerType: string, reason: string) => {
      try {
        await pool.query(
          `UPDATE ai_providers 
           SET is_active = false, 
               updated_at = CURRENT_TIMESTAMP
           WHERE provider_type = $1 AND is_active = true`,
          [providerType]
        )
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        logger.warn(`🚫 [AI-AUTO-DISABLE] Provider ${providerType} has been automatically deactivated`)
        logger.warn(`💳 [AI-AUTO-DISABLE] Reason: ${reason}`)
        logger.info(`💡 [AI-AUTO-DISABLE] Reactivate at ${frontendUrl}/ai-providers once credits are topped up`)
      } catch (error) {
        logger.error(`Failed to auto-disable provider ${providerType}:`, error)
      }
    }

    if (providers.length === 0) {
      throw new Error('All active providers are currently in backoff period. Please try again later.')
    }

    logger.info(`🔄 [AI-FALLBACK] Provider chain (active only): ${providers.join(' → ')}`)

    let lastError: Error | null = null
    let attemptsWithBackoff = 0

    for (const provider of providers) {
      try {
        attemptsWithBackoff++
        logger.info(`🔄 [AI-FALLBACK] Trying provider: ${provider} (attempt ${attemptsWithBackoff}/${providers.length})`)

        const result = await this.generate({ ...request, provider })

        // Success! Reset backoff for this provider
        this.resetProviderBackoff(provider)

        logger.info(`✅ [AI-FALLBACK] Success with provider: ${provider}`)
        return { ...result, providerUsed: provider }
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error'
        logger.warn(`⚠️ [AI-FALLBACK] Provider ${provider} failed: ${errorMessage}`)

        // Check if error is due to insufficient funds/credits or capacity exceeded
        const errorMessageLower = errorMessage.toLowerCase()
        const isInsufficientFunds =
          errorMessageLower.includes('insufficient funds') ||
          errorMessageLower.includes('insufficient_funds') ||
          errorMessageLower.includes('no credits') ||
          errorMessageLower.includes('out of credits') ||
          errorMessageLower.includes('credit limit') ||
          errorMessageLower.includes('credit balance is too low') ||
          errorMessageLower.includes('balance is too low') ||
          errorMessageLower.includes('plans & billing') ||
          errorMessageLower.includes('service tier capacity exceeded') ||
          errorMessageLower.includes('capacity exceeded') ||
          errorMessageLower.includes('rate limit exceeded') ||
          errorMessageLower.includes('too many requests') ||
          error.statusCode === 402 || // Payment Required
          error.statusCode === 429 || // Too Many Requests
          error.type === 'insufficient_funds' ||
          error.code === 'rate_limit_exceeded'

        // Check if it's a model not found error (should trigger fallback, not disable provider)
        const isModelNotFound =
          error.type === 'model_not_found' ||
          errorMessageLower.includes('model not found') ||
          errorMessageLower.includes('model:') && errorMessageLower.includes('not found')

        if (isInsufficientFunds) {
          logger.error(`💳 [AI-CREDITS] Provider ${provider} has insufficient funds/credits or capacity exceeded`)
          await autoDisableProvider(provider, `Insufficient capacity: ${errorMessage}`)
        } else if (isModelNotFound) {
          logger.warn(`🔍 [AI-FALLBACK] Provider ${provider} model not found - will try next provider`)
          // Don't disable provider for model errors - just try next one
          this.recordProviderFailure(provider)
        } else {
          // Record failure and apply backoff for other errors
          this.recordProviderFailure(provider)
        }

        lastError = error

        // Add delay between provider attempts (progressive backoff)
        if (attemptsWithBackoff < providers.length) {
          const delayMs = Math.min(1000 * attemptsWithBackoff, 5000) // Max 5s between attempts
          logger.info(`⏳ [AI-FALLBACK] Waiting ${delayMs}ms before trying next provider (${attemptsWithBackoff + 1}/${providers.length})...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
        } else {
          logger.warn(`⚠️ [AI-FALLBACK] No more providers to try - all ${providers.length} providers failed`)
        }
      }
    }

    // All providers failed
    logger.error('❌ [AI-FALLBACK] All active providers failed')
    throw lastError || new Error('All AI providers failed')
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const startTime = Date.now()  // Capture start time for analytics

    logger.debug('[AI-SERVICE] Generate called', {
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      promptLength: request.prompt?.length || 0,
      hasPrompt: !!request.prompt
    })

    // Fetch AI Gateway API key from database (optional - will fallback to direct provider calls if not configured)
    const { getAIGatewayKey } = await import("../routes/settings")
    const gatewayApiKey = await getAIGatewayKey()

    if (!gatewayApiKey) {
      logger.info('[AI-SERVICE] No AI Gateway API key configured - will use direct provider APIs')
    } else {
      logger.debug('[AI-SERVICE] Gateway API key retrieved')
    }

    // KISS: Build system and user messages separately
    let systemMessage: string | undefined = undefined
    let userMessage: string = request.prompt

    if (request.template_id) {
      const templateSystemPrompt = await this.getTemplateSystemPrompt(request.template_id)
      if (templateSystemPrompt) {
        systemMessage = templateSystemPrompt
        userMessage = this.buildUserMessage(request.prompt, request.variables)
        logger.debug('[AI-SERVICE] Template loaded - using KISS architecture')
      } else {
        logger.warn('[AI-SERVICE] Template not found, using direct prompt')
      }
    } else {
      logger.debug('[AI-SERVICE] No template, using direct prompt')
    }

    // If system_prompt provided directly in request, use that
    if (request.system_prompt) {
      systemMessage = request.system_prompt
      logger.debug('[AI-SERVICE] Using provided system_prompt')
    }

    let langfuseTrace: any = null;
    let langfuseGeneration: any = null;

    try {
      // Get provider type from database to build the model ID
      logger.debug('[AI-SERVICE] Looking up provider type')
      // Try to find provider by provider_type first (e.g., "mistral", "openai"), then by name
      const providerResult = await pool.query(
        "SELECT provider_type, api_key_encrypted, configuration FROM ai_providers WHERE (provider_type = $1 OR LOWER(name) = LOWER($1)) AND is_active = true LIMIT 1",
        [request.provider]
      )

      if (!providerResult || !providerResult.rows) {
        logger.error('❌ [AI-SERVICE] Provider lookup returned null result for', request.provider)
        throw new Error(`Provider lookup failed for: ${request.provider}`)
      }

      langfuseTrace = isTracingEnabled() ? langfuse.trace({
        name: `ai-generate-${request.provider}`,
        sessionId: request.projectId || request.documentId || undefined,
        userId: request.userId,
        metadata: {
          projectId: request.projectId,
          documentId: request.documentId
        },
        tags: [request.provider, request.model || "default"]
      }) : null;

      if (langfuseTrace) {
        langfuseGeneration = langfuseTrace.generation({
          name: `${request.provider}-generation`,
          model: request.model || "unknown",
          modelParameters: {
            temperature: request.temperature,
            maxTokens: request.max_tokens
          },
          input: systemMessage ? [{ role: "system", content: systemMessage }, { role: "user", content: userMessage }] : userMessage
        });
      }

      if (providerResult.rows.length === 0) {
        logger.error('❌ [AI-SERVICE] Provider not found:', request.provider)
        throw new Error(`Provider not found or inactive: ${request.provider}`)
      }

      const providerType = providerResult.rows[0].provider_type
      logger.debug('[AI-SERVICE] Provider type:', providerType)

      // OPTIMIZATION: Skip AI Gateway for providers not natively supported
      // DeepSeek, Moonshot, xAI are OpenAI-compatible but not in AI Gateway's provider list
      // Anthropic bypassed to use user's direct credits (avoid Vercel AI Gateway billing)
      // Go straight to direct API to avoid unnecessary 404 errors or Vercel billing
      const directProviders = ['deepseek', 'moonshot', 'xai', 'anthropic']
      const useDirect = directProviders.includes(providerType)

      if (useDirect) {
        logger.info(`🔄 [AI-SERVICE] Provider ${providerType} not in AI Gateway - using direct API`)

        // Get direct API key from provider configuration OR encrypted field
        const directApiKey = providerResult.rows[0].configuration?.apiKey || this.decryptApiKey(providerResult.rows[0].api_key_encrypted)

        if (!directApiKey) {
          throw new Error(`Direct ${providerType} API key not found in provider configuration or database`)
        }

        // Handle each provider's direct API
        if (providerType === 'deepseek') {
          logger.info('🔄 [AI-SERVICE] Using official @ai-sdk/deepseek package...')

          const deepseek = createDeepSeek({
            apiKey: directApiKey
          })

          const deepseekModels = ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder']
          const modelName = deepseekModels.includes(request.model || '')
            ? request.model
            : 'deepseek-chat'

          const deepseekResult = await generateText({
            model: deepseek(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-generate-deepseek',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'deepseek',
                model: modelName
              }
            }
          })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(deepseekResult.usage)

          logger.info(`[AI] ✓ DeepSeek/${modelName} - ${totalTokens} tokens - ${Date.now() - startTime}ms`)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: deepseekResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: deepseekResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        if (providerType === 'moonshot') {
          logger.info('🔄 [AI-SERVICE] Using NATIVE OpenAI SDK for Moonshot...')

          // OFFICIAL: Use native OpenAI SDK as per Moonshot documentation
          const moonshotClient = new OpenAI({
            apiKey: directApiKey,
            baseURL: 'https://api.moonshot.ai/v1'
          })

          // Official models from Moonshot docs
          const moonshotModels = ['kimi-k2-turbo-preview', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
          const modelName = moonshotModels.includes(request.model || '')
            ? request.model
            : 'kimi-k2-turbo-preview'  // Use official working model

          logger.info(`[AI-SERVICE] Moonshot model: ${modelName}`)
          logger.info(`[AI-SERVICE] Calling native chat.completions.create() - as per official docs`)

          // Use native OpenAI SDK - exactly as Moonshot documentation shows
          const completion = await moonshotClient.chat.completions.create({
            model: modelName,
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature || 0.7,
            max_tokens: request.max_tokens
          })

          const totalTokens = completion.usage?.total_tokens || 0
          const promptTokens = completion.usage?.prompt_tokens || 0
          const completionTokens = completion.usage?.completion_tokens || 0
          const content = completion.choices[0]?.message?.content || ''

          logger.info(`[AI] ✓ Moonshot/${modelName} - ${totalTokens} tokens - ${Date.now() - startTime}ms`)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: content,
              usage: {
                promptTokens: promptTokens,
                completionTokens: completionTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            },
          }
        }

        if (providerType === 'xai') {
          logger.info('🔄 [AI-SERVICE] Using official @ai-sdk/xai package...')

          const xai = createXai({
            apiKey: directApiKey
          })

          const xaiModels = ['grok-beta', 'grok-vision-beta']
          const modelName = xaiModels.includes(request.model || '')
            ? request.model
            : 'grok-beta'

          const xaiResult = await generateText({
            model: xai(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-generate-xai',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'xai',
                model: modelName
              }
            }
          })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(xaiResult.usage)

          logger.info(`[AI] ✓ xAI/${modelName} - ${totalTokens} tokens - ${Date.now() - startTime}ms`)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            }, Date.now() - startTime, true, request.userId, request.projectId, request.documentId)
          })

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: xaiResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: xaiResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        if (providerType === 'anthropic') {
          logger.info('🔄 [AI-SERVICE] Using NATIVE Anthropic SDK to bypass Vercel AI Gateway...')

          // Use native Anthropic SDK to use user's direct credits
          const anthropicClient = new Anthropic({
            apiKey: directApiKey
          })

          // Anthropic model name mapping - use full model names with date suffixes or -latest
          // Valid model names: claude-3-5-sonnet-20241022, claude-3-5-sonnet-latest, claude-3-opus-20240229, etc.
          const normalizeAnthropicModel = (model: string): string => {
            if (!model) return 'claude-sonnet-4-20250514'

            // Map short names to full valid Anthropic model names
            const modelMappings: Record<string, string> = {
              'claude-3-5-sonnet': 'claude-sonnet-4-20250514',
              'claude-3.5-sonnet': 'claude-sonnet-4-20250514',
              'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
              'claude-3.5-haiku': 'claude-3-5-haiku-20241022',
              'claude-3-opus': 'claude-3-opus-20240229',
              'claude-3.0-opus': 'claude-3-opus-20240229',
              'claude-sonnet-4.0': 'claude-sonnet-4-20250514',
              'claude-4-sonnet': 'claude-sonnet-4-20250514',
              'claude-haiku-4.0': 'claude-3-5-haiku-20241022',
              'claude-4-haiku': 'claude-3-5-haiku-20241022',
              'claude-opus-4.0': 'claude-3-opus-20240229',
              'claude-4-opus': 'claude-3-opus-20240229'
            }

            // If model already has a date suffix (YYYYMMDD), it's already valid
            const dateSuffixPattern = /-\d{8}$/
            if (dateSuffixPattern.test(model)) {
              return model
            }

            // If model ends with -latest, it's already valid
            if (model.endsWith('-latest')) {
              return model
            }

            // Map short name to full name
            const mapped = modelMappings[model.toLowerCase()] || modelMappings[model]
            if (mapped) {
              logger.debug(`[AI-SERVICE] Mapped Anthropic model: ${model} -> ${mapped}`)
              return mapped
            }

            // If no mapping found, return as-is and let Anthropic API validate
            return model
          }

          // Use the model name provided by the user, normalized
          const rawModelName = request.model || 'claude-sonnet-4-20250514'
          const modelName = normalizeAnthropicModel(rawModelName)

          logger.info(`[AI-SERVICE] Anthropic model: ${modelName}${rawModelName !== modelName ? ` (normalized from ${rawModelName})` : ''}`)
          logger.info(`[AI-SERVICE] Calling native Anthropic messages.create()`)

          // Build messages for Anthropic (separate system from messages)
          const anthropicMessages: Array<{ role: 'user' | 'assistant', content: string }> = []

          // Add user message
          anthropicMessages.push({
            role: 'user',
            content: userMessage
          })

          // Call native Anthropic API with proper error handling for fallback
          let completion
          try {
            completion = await anthropicClient.messages.create({
              model: modelName,
              max_tokens: request.max_tokens || 4096,
              system: systemMessage || undefined,  // System is separate in Anthropic
              messages: anthropicMessages,
              temperature: request.temperature || 0.7
            })
          } catch (anthropicError: any) {
            // Format Anthropic errors for proper fallback handling
            const errorMessage = anthropicError?.error?.message || anthropicError?.message || 'Anthropic API error'
            const errorType = anthropicError?.error?.type || anthropicError?.type || 'unknown_error'

            // Check if it's a model not found error - this should trigger fallback
            if (errorType === 'not_found_error' || errorMessage.includes('model:') || errorMessage.includes('not found')) {
              logger.warn(`⚠️ [AI-SERVICE] Anthropic model not found: ${modelName} - will trigger fallback`)
              // Create error that will be caught by generateWithFallback
              const fallbackError: any = new Error(`Anthropic model not found: ${errorMessage}`)
              fallbackError.statusCode = 404
              fallbackError.type = 'model_not_found'
              fallbackError.provider = 'anthropic' // Mark which provider failed
              // Preserve original error for debugging
              fallbackError.originalError = anthropicError
              throw fallbackError
            }

            // Re-throw other errors as-is for fallback mechanism
            // Ensure error has provider info for fallback handling
            if (!anthropicError.provider) {
              anthropicError.provider = 'anthropic'
            }
            throw anthropicError
          }

          const content = completion.content[0]?.type === 'text' ? completion.content[0].text : ''
          const totalTokens = completion.usage.input_tokens + completion.usage.output_tokens
          const promptTokens = completion.usage.input_tokens
          const completionTokens = completion.usage.output_tokens

          logger.info(`[AI] ✓ Anthropic/${modelName} - ${totalTokens} tokens - ${Date.now() - startTime}ms`)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: content,
              usage: {
                promptTokens: promptTokens,
                completionTokens: completionTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
            },
          }
        }
      }

      // Continue with AI Gateway for supported providers (OpenAI, Google, Groq, Mistral)
      // Build AI Gateway model ID (e.g., 'groq/llama-3.1-8b-instant')
      const gatewayModelId = await this.buildGatewayModelId(providerType, request.model)

      logger.info('🌐 [AI-SERVICE-6/8] AI Gateway generation starting:', gatewayModelId)
      logger.info('⏱️ [AI-SERVICE] Temperature:', request.temperature || 0.7)
      logger.info('📝 [AI-SERVICE] User message length:', userMessage.length, 'chars')
      if (systemMessage) {
        logger.info('📝 [AI-SERVICE] System message length:', systemMessage.length, 'chars')
      }

      // FIXED: Use environment variable for AI Gateway (Vercel AI SDK requirement)
      // The SDK reads from process.env.OPENAI_API_KEY automatically
      // We temporarily set it in a try-finally block to minimize race condition window
      logger.info('🔑 [AI-SERVICE] Using AI Gateway API key (thread-safe as possible)')

      // Use AI Gateway unified API (Vercel AI SDK)
      logger.info('🔗 [AI-SERVICE] Calling generateText() with AI Gateway...')
      logger.info('🔗 [AI-SERVICE] Model ID:', gatewayModelId)
      logger.info('🔑 [AI-SERVICE] API Key configured:', !!gatewayApiKey) // Don't log length (security)

      // FIXED: Vercel AI SDK looks for AI_GATEWAY_API_KEY environment variable!
      // Documentation: https://vercel.com/docs/ai-gateway
      // Temporarily set process.env for this request
      const previousKey = process.env.AI_GATEWAY_API_KEY
      process.env.AI_GATEWAY_API_KEY = gatewayApiKey

      let result
      let gatewaySuccess = false

      try {
        // If AI Gateway is not configured, skip directly to fallback
        if (!gatewayApiKey) {
          logger.info(`🔄 [AI-SERVICE] AI Gateway not configured - using direct provider API for ${providerType}`)
          // Throw a special error to trigger fallback logic
          throw new Error('AI_GATEWAY_NOT_CONFIGURED')
        }
        // KISS: Use messages array if we have system message, otherwise use prompt
        if (systemMessage) {
          logger.info('📨 [AI-SERVICE-6/8] Using KISS architecture with system + user messages')
          result = await generateText({
            model: gatewayModelId,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            temperature: request.temperature || 0.7,
            maxOutputTokens: request.max_tokens || 2000,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-gateway-messages',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'gateway',
                modelId: gatewayModelId
              }
            }
          } as any)
        } else {
          logger.info('📨 [AI-SERVICE-6/8] Using simple prompt (no template)')
          result = await generateText({
            model: gatewayModelId,
            prompt: userMessage,
            temperature: request.temperature || 0.7,
            maxOutputTokens: request.max_tokens || 2000,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-gateway-prompt',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'gateway',
                modelId: gatewayModelId
              }
            }
          } as any)
        }

        // Validate that result has content before marking as successful
        if (!result || !result.text || result.text.trim().length === 0) {
          logger.warn('[AI-SERVICE] AI Gateway returned empty content, triggering fallback')
          throw new Error('AI_GATEWAY_EMPTY_RESPONSE')
        }

        gatewaySuccess = true
      } catch (gatewayError: any) {
        // Check if this is a "not configured" error (should fallback immediately)
        const isNotConfigured = gatewayError?.message === 'AI_GATEWAY_NOT_CONFIGURED'
        const isEmptyResponse = gatewayError?.message === 'AI_GATEWAY_EMPTY_RESPONSE'

        if (isNotConfigured) {
          logger.info('🔄 [AI-SERVICE] AI Gateway not configured - using direct provider API')
        } else if (isEmptyResponse) {
          logger.warn('⚠️ [AI-SERVICE] AI Gateway returned empty content - falling back to direct provider')
        } else {
          logger.warn('⚠️ [AI-SERVICE] AI Gateway failed, attempting direct provider fallback...')
          logger.warn('⚠️ [AI-SERVICE] Gateway error:', gatewayError?.message || gatewayError)
        }

        // Check if result exists but is empty (edge case where gateway "succeeds" but returns empty)
        if (result && (!result.text || result.text.trim().length === 0)) {
          logger.warn('[AI-SERVICE] AI Gateway returned empty content, triggering fallback')
          gatewaySuccess = false // Mark as failed so fallback triggers
        }

        // Restore key before fallback (only if we had one)
        if (gatewayApiKey) {
          if (previousKey) {
            process.env.AI_GATEWAY_API_KEY = previousKey
          } else {
            delete process.env.AI_GATEWAY_API_KEY
          }
        }

        // FALLBACK: Try direct Google AI
        if (providerType === 'google') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct Google AI...')

          // Get direct API key from provider configuration
          const directApiKey = providerResult.rows[0].configuration?.apiKey
          if (!directApiKey) {
            throw new Error('Direct Google AI API key not found in provider configuration')
          }

          logger.debug('[AI-SERVICE] Using direct Google AI')
          const genAI = new GoogleGenerativeAI(directApiKey)

          // Map deprecated/unavailable models to current working ones
          // Note: gemini-1.5-flash and gemini-1.5-pro are stable and confirmed working
          const modelMap: Record<string, string> = {
            'gemini-pro': 'gemini-1.5-flash',
            'gemini-pro-vision': 'gemini-1.5-flash',
            'gemini-1.0-pro': 'gemini-1.5-flash',
            'gemini-1.0-pro-vision': 'gemini-1.5-flash',
            'gemini-2.0-flash-exp': 'gemini-2.0-flash',
            'gemini-2.5-flash': 'gemini-2.0-flash',
            'gemini-2.5-pro': 'gemini-2.0-flash',
          }

          // Use mapped model or fallback to current default (gemini-2.0-flash)
          const requestedModel = request.model || 'gemini-2.0-flash'
          const modelName = modelMap[requestedModel] || requestedModel

          // Validate model name (ensure it's a current model that works in v1beta API)
          const validModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-exp']
          const finalModel = validModels.includes(modelName) ? modelName : 'gemini-2.0-flash'

          // Log model mapping for debugging
          if (requestedModel !== finalModel) {
            logger.info(`[AI-SERVICE] Model mapping (Direct): ${requestedModel} → ${finalModel}`)
          } else {
            logger.debug(`[AI-SERVICE] Using model: ${finalModel}`)
          }

          const model = genAI.getGenerativeModel({ model: finalModel })
          // KISS: Combine system and user message for Google AI (it doesn't have separate system role)
          const combinedPrompt = systemMessage
            ? `${systemMessage}\n\n---\n\n${userMessage}`
            : userMessage
          const googleResult = await model.generateContent(combinedPrompt)
          const response = await googleResult.response

          // Check for safety filter blocks
          const blocked = response.promptFeedback?.blockReason
          if (blocked) {
            logger.error('[AI-SERVICE] Google AI blocked content due to safety filter', {
              blockReason: blocked,
              safetyRatings: response.promptFeedback?.safetyRatings
            })
            throw new Error(`Google AI safety filter blocked content: ${blocked}`)
          }

          const text = response.text()

          // Validate that Google AI returned content
          if (!text || text.trim().length === 0) {
            logger.error('[AI-SERVICE] Google AI returned empty content', {
              hasResponse: !!response,
              candidates: googleResult.response.candidates?.length || 0,
              finishReason: googleResult.response.candidates?.[0]?.finishReason
            })
            throw new Error('Google AI returned empty response - possible safety filter or content policy violation')
          }

          logger.debug('[AI-SERVICE] Google AI successful:', { contentLength: text.length })

          // Estimate token usage (Google AI doesn't always provide it)
          const promptLength = systemMessage ? systemMessage.length + userMessage.length : userMessage.length
          const estimatedTokens = Math.ceil((promptLength + text.length) / 4)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: estimatedTokens,
          })

          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, finalModel, {
              prompt_tokens: Math.ceil(promptLength / 4),
              completion_tokens: Math.ceil(text.length / 4),
              total_tokens: estimatedTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          logger.info(`[AI] ✓ Google AI/${finalModel} - ${estimatedTokens} tokens - ${Date.now() - startTime}ms`)

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: text,
              usage: {
                promptTokens: Math.ceil(promptLength / 4),
                completionTokens: Math.ceil(text.length / 4),
                totalTokens: estimatedTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: text,
            provider: request.provider,
            model: finalModel,
            usage: {
              prompt_tokens: Math.ceil(promptLength / 4),
              completion_tokens: Math.ceil(text.length / 4),
              total_tokens: estimatedTokens,
            },
          }
        }

        // FALLBACK: Try direct Mistral AI
        if (providerType === 'mistral') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct Mistral AI...')

          // Get direct API key from provider configuration
          const directApiKey = providerResult.rows[0].configuration?.apiKey
          if (!directApiKey) {
            throw new Error('Direct Mistral AI API key not found in provider configuration')
          }

          logger.debug('[AI-SERVICE] Using direct Mistral AI')

          const mistral = createMistral({ apiKey: directApiKey })

          // Use appropriate Mistral model (not Google model!)
          const mistralModels = ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-7b', 'open-mixtral-8x7b']
          const modelName = mistralModels.includes(request.model || '')
            ? request.model
            : 'mistral-small-latest' // Default to small (free tier)

          const mistralResult = await generateText({
            model: mistral(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-mistral-direct',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'mistral',
                model: modelName
              }
            }
          })

          logger.debug('[AI-SERVICE] Mistral AI successful:', { contentLength: mistralResult.text.length })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(mistralResult.usage)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          logger.info(`[AI] ✓ Mistral AI/${modelName} - ${totalTokens} tokens - ${Date.now() - startTime}ms`)

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: mistralResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: mistralResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        // FALLBACK: Try direct DeepSeek
        if (providerType === 'deepseek') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct DeepSeek...')

          // Get direct API key from provider configuration
          const directApiKey = providerResult.rows[0].configuration?.apiKey
          if (!directApiKey) {
            throw new Error('Direct DeepSeek API key not found in provider configuration')
          }

          logger.debug('[AI-SERVICE] Using direct DeepSeek (OpenAI-compatible)')

          const deepseek = createOpenAI({
            apiKey: directApiKey,
            baseURL: 'https://api.deepseek.com'
          })

          // Use appropriate DeepSeek model
          const deepseekModels = ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder']
          const modelName = deepseekModels.includes(request.model || '')
            ? request.model
            : 'deepseek-chat' // Default to chat mode

          const deepseekResult = await generateText({
            model: deepseek(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-deepseek-fallback',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'deepseek',
                model: modelName
              }
            }
          })

          logger.debug('[AI-SERVICE] DeepSeek successful:', { contentLength: deepseekResult.text.length })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(deepseekResult.usage)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          logger.info(`[AI] ✓ DeepSeek/${modelName} - ${totalTokens} tokens - ${Date.now() - startTime}ms`)

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: deepseekResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: deepseekResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        // FALLBACK: Try direct Moonshot AI
        if (providerType === 'moonshot') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct Moonshot AI...')

          // Get direct API key from provider configuration
          const directApiKey = providerResult.rows[0].configuration?.apiKey
          if (!directApiKey) {
            throw new Error('Direct Moonshot AI API key not found in provider configuration')
          }

          logger.debug('[AI-SERVICE] Using direct Moonshot AI (OpenAI-compatible)')

          const moonshot = createOpenAI({
            apiKey: directApiKey,
            baseURL: 'https://api.moonshot.ai/v1'
          })

          // Use appropriate Moonshot model
          const moonshotModels = ['kimi-k2-0905-preview', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
          const modelName = moonshotModels.includes(request.model || '')
            ? request.model
            : 'kimi-k2-0905-preview' // Default to latest Kimi K2

          const moonshotResult = await generateText({
            model: moonshot(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-moonshot-fallback',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'moonshot',
                model: modelName
              }
            }
          })

          logger.debug('[AI-SERVICE] Moonshot AI successful:', { contentLength: moonshotResult.text.length })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(moonshotResult.usage)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            }, responseTimeMs, true, request.userId, request.projectId, request.documentId)
          })

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: moonshotResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: moonshotResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        // FALLBACK: Try direct Ollama (uses native API, not OpenAI-compatible)
        if (providerType === 'ollama') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct Ollama...')

          // Ollama doesn't require API key for local connections
          const ollamaEndpoint = providerResult.rows[0].configuration?.endpoint ||
            providerResult.rows[0].configuration?.baseURL ||
            'http://localhost:11434'

          // Use the model specified in request, or default to llama3.1
          const modelName = request.model || 'llama3.1:latest'

          logger.debug('[AI-SERVICE] Using Ollama native API', { endpoint: ollamaEndpoint, model: modelName })

          try {
            // Build messages for Ollama chat API
            const messages = [
              ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
              { role: 'user', content: userMessage }
            ]

            // Call Ollama's native /api/chat endpoint
            const ollamaResponse = await fetch(`${ollamaEndpoint}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: modelName,
                messages,
                stream: false,
                options: {
                  temperature: request.temperature || 0.7,
                  num_predict: request.max_tokens || 4096
                }
              })
            })

            if (!ollamaResponse.ok) {
              const errorText = await ollamaResponse.text()
              throw new Error(`Ollama API error (${ollamaResponse.status}): ${errorText}`)
            }

            const ollamaData = await ollamaResponse.json() as any
            const generatedText = ollamaData.message?.content || ollamaData.response || ''

            logger.debug('[AI-SERVICE] Ollama successful:', {
              contentLength: generatedText.length,
              totalDuration: ollamaData.total_duration,
              loadDuration: ollamaData.load_duration,
              promptEvalCount: ollamaData.prompt_eval_count,
              evalCount: ollamaData.eval_count
            })

            // Calculate tokens (Ollama returns token counts in response)
            const promptTokens = ollamaData.prompt_eval_count || 0
            const completionTokens = ollamaData.eval_count || 0
            const totalTokens = promptTokens + completionTokens

            // Update usage stats
            await this.updateUsageStats(request.provider, { total_tokens: totalTokens })

            // Track detailed AI usage for analytics (background, non-blocking)
            const responseTimeMs = Date.now() - startTime
            setImmediate(() => {
              this.trackAIUsageAsync(
                request.provider,
                modelName,
                {
                  prompt_tokens: promptTokens,
                  completion_tokens: completionTokens,
                  total_tokens: totalTokens,
                },
                responseTimeMs,
                true,
                request.userId,
                request.projectId,
                request.documentId
              )
            })

            logger.info(`[AI] ✓ Ollama/${modelName} - ${totalTokens} tokens - ${responseTimeMs}ms`)

            if (langfuseGeneration) {
              langfuseGeneration.end({
                output: generatedText,
                usage: {
                  promptTokens: promptTokens,
                  completionTokens: completionTokens,
                  totalTokens: totalTokens
                }
              });
              await langfuse.flushAsync();
            }

            return {
              content: generatedText,
              provider: request.provider,
              model: modelName,
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
              },
            }
          } catch (ollamaError: any) {
            if (ollamaError.cause?.code === 'ECONNREFUSED') {
              logger.warn('⚠️ [AI-SERVICE] Ollama connection refused - ensure Ollama is running locally')
              throw new Error('Ollama service unavailable (ECONNREFUSED)')
            }
            logger.error('[AI-SERVICE] Ollama native API failed:', ollamaError)
            throw new Error(`Ollama generation failed: ${ollamaError.message}`)
          }
        }

        // FALLBACK: Try direct OpenAI
        if (providerType === 'openai') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct OpenAI...')

          // Get direct API key - be robust about lookup
          const config = providerResult.rows[0].configuration || {}
          const directApiKey = config.apiKey || config.api_key || this.decryptApiKey(providerResult.rows[0].api_key_encrypted)

          if (!directApiKey) {
            throw new Error('Direct OpenAI API key not found in provider configuration or database')
          }

          logger.debug('[AI-SERVICE] Using direct OpenAI')
          const openai = createOpenAI({ apiKey: directApiKey })

          // Use the model specified in request, or default to gpt-4o
          const modelName = request.model || 'gpt-4o'

          const openaiResult = await generateText({
            model: openai(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature || 0.7,
            maxOutputTokens: request.max_tokens || 2000,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-openai-fallback',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'openai',
                model: modelName
              }
            }
          })

          logger.debug('[AI-SERVICE] OpenAI successful:', { contentLength: openaiResult.text.length })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(openaiResult.usage)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(
              request.provider,
              modelName,
              {
                prompt_tokens: inputTokens,
                completion_tokens: outputTokens,
                total_tokens: totalTokens,
              },
              responseTimeMs,
              true,
              request.userId,
              request.projectId,
              request.documentId
            )
          })

          logger.info(`[AI] ✓ OpenAI/${modelName} - ${totalTokens} tokens - ${responseTimeMs}ms`)

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: openaiResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: openaiResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        // FALLBACK: Try direct Groq (OpenAI-compatible API)
        if (providerType === 'groq') {
          logger.info('🔄 [AI-SERVICE] Falling back to direct Groq...')

          // Get direct API key from provider configuration
          const directApiKey = providerResult.rows[0].configuration?.apiKey
            || this.decryptApiKey(providerResult.rows[0].api_key_encrypted)
          if (!directApiKey) {
            throw new Error('Direct Groq API key not found in provider configuration or database')
          }

          logger.debug('[AI-SERVICE] Using direct Groq (OpenAI-compatible)')

          const groq = createOpenAI({
            apiKey: directApiKey,
            baseURL: 'https://api.groq.com/openai/v1'
          })

          // Use appropriate Groq model
          const groqModels = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'llama3-70b-8192',
            'mixtral-8x7b-32768', 'gemma2-9b-it']
          const modelName = groqModels.includes(request.model || '')
            ? request.model
            : 'llama-3.3-70b-versatile'

          const groqResult = await generateText({
            model: groq(modelName),
            messages: [
              ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
              { role: 'user' as const, content: userMessage }
            ],
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            experimental_telemetry: {
              isEnabled: isTracingEnabled(),
              functionId: 'ai-groq-fallback',
              metadata: {
                userId: request.userId,
                projectId: request.projectId,
                documentId: request.documentId,
                provider: 'groq',
                model: modelName
              }
            }
          })

          logger.debug('[AI-SERVICE] Groq successful:', { contentLength: groqResult.text.length })

          const { inputTokens, outputTokens, totalTokens } = this.normalizeUsage(groqResult.usage)

          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: totalTokens,
          })

          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(
              request.provider,
              modelName,
              {
                prompt_tokens: inputTokens,
                completion_tokens: outputTokens,
                total_tokens: totalTokens,
              },
              responseTimeMs,
              true,
              request.userId,
              request.projectId,
              request.documentId
            )
          })

          logger.info(`[AI] ✓ Groq/${modelName} - ${totalTokens} tokens - ${responseTimeMs}ms`)

          if (langfuseGeneration) {
            langfuseGeneration.end({
              output: groqResult.text,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: totalTokens
              }
            });
            await langfuse.flushAsync();
          }

          return {
            content: groqResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: inputTokens,
              completion_tokens: outputTokens,
              total_tokens: totalTokens,
            },
          }
        }

        // No fallback available for this provider
        throw gatewayError
      } finally {
        // Restore previous key if AI Gateway was used
        if (gatewaySuccess) {
          if (previousKey) {
            process.env.AI_GATEWAY_API_KEY = previousKey
          } else {
            delete process.env.AI_GATEWAY_API_KEY
          }
        }
      }

      // AI Gateway success path - only execute if gateway actually succeeded and has content
      if (gatewaySuccess && result && result.text && result.text.trim().length > 0) {

        const {
          inputTokens: gatewayInputTokens,
          outputTokens: gatewayOutputTokens,
          totalTokens: gatewayTotalTokens,
        } = this.normalizeUsage(result.usage)

        logger.info(`[AI] ✓ ${request.provider}/${request.model || gatewayModelId} - ${gatewayTotalTokens} tokens - ${Date.now() - startTime}ms`)

        // Update usage stats
        await this.updateUsageStats(request.provider, {
          total_tokens: gatewayTotalTokens,
        })

        // Track detailed AI usage for analytics (background, non-blocking)
        const responseTimeMs = Date.now() - startTime
        setImmediate(() => {
          this.trackAIUsageAsync(
            request.provider,
            request.model || gatewayModelId,
            {
              prompt_tokens: gatewayInputTokens,
              completion_tokens: gatewayOutputTokens,
              total_tokens: gatewayTotalTokens,
            },
            responseTimeMs,
            true,
            request.userId,
            request.projectId,
            request.documentId
          )
        })

        logger.info('✅ [AI-SERVICE-8/8] Usage stats updated. Returning response.')

        if (langfuseGeneration) {
          langfuseGeneration.end({
            output: result.text,
            usage: {
              promptTokens: gatewayInputTokens,
              completionTokens: gatewayOutputTokens,
              totalTokens: gatewayTotalTokens
            }
          });
          await langfuse.flushAsync();
        }

        return {
          content: result.text,
          provider: request.provider,
          model: request.model || gatewayModelId,
          usage: {
            prompt_tokens: gatewayInputTokens,
            completion_tokens: gatewayOutputTokens,
            total_tokens: gatewayTotalTokens,
          },
        }
      }

      // If we reach here, gateway failed or returned empty - should have been handled by fallback
      // This should not happen, but log it for debugging
      logger.error('[AI-SERVICE] Unexpected state: gatewaySuccess=false but no fallback return', {
        gatewaySuccess,
        hasResult: !!result,
        resultTextLength: result?.text?.length || 0
      })
      throw new Error('AI generation failed: No valid response from gateway or fallback')
    } catch (error) {
      logger.error(`❌ [AI-SERVICE-ERROR] AI generation failed for provider ${request.provider}:`, error)
      logger.error(`❌ [AI-SERVICE-ERROR] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      if (typeof langfuseGeneration !== 'undefined' && langfuseGeneration) {
        langfuseGeneration.end({
          level: "ERROR",
          statusMessage: error instanceof Error ? error.message : String(error)
        });
        await langfuse.flushAsync();
      }
      throw error
    }
  }

  // Map provider type and model to AI Gateway format
  private async buildGatewayModelId(providerType: string, model?: string): Promise<string> {
    const defaultModels: Record<string, string> = {
      'openai': 'gpt-4o',
      'google': 'gemini-2.5-flash', // Use stable flash model
      'groq': 'llama-3.3-70b-versatile',
      'mistral': 'mistral-large-latest',
      'anthropic': 'claude-3-5-sonnet-latest',
      'azure': 'gpt-4',
      'deepseek': 'deepseek-chat',
      'moonshot': 'kimi-k2-0905-preview',
      'xai': 'grok-beta',
      'copilot': 'copilot-chat',
    }

    // Define provider-specific model families
    const providerModelFamilies: Record<string, string[]> = {
      'openai': ['gpt-', 'o1-', 'text-'],
      'google': ['gemini-', 'palm-'],
      'groq': ['llama', 'mixtral', 'gemma'],
      'mistral': ['mistral-', 'codestral-', 'pixtral-', 'magistral-'],
      'anthropic': ['claude-'],
      'azure': ['gpt-', 'text-'],
      'deepseek': ['deepseek-'],
      'moonshot': ['kimi-', 'moonshot-'],
      'xai': ['grok-'],
      'copilot': ['copilot-'],
    }

    // Model mapping for deprecated/unavailable models (centralized validation)
    const modelMaps: Record<string, Record<string, string>> = {
      'google': {
        'gemini-pro': 'gemini-1.5-flash',
        'gemini-pro-vision': 'gemini-1.5-flash',
        'gemini-1.0-pro': 'gemini-1.5-flash',
        'gemini-1.0-pro-vision': 'gemini-1.5-flash',
        'gemini-1.5-flash': 'gemini-1.5-flash',
        'gemini-1.5-pro': 'gemini-1.5-pro',
        'gemini-2.0-flash-exp': 'gemini-1.5-flash',
        'gemini-2.5-flash': 'gemini-1.5-flash',
      }
    }

    // Validate and map model if needed
    let modelId = model || defaultModels[providerType] || 'gpt-4o'

    // Apply model mapping for deprecated models
    if (modelMaps[providerType] && modelMaps[providerType][modelId]) {
      const mappedModel = modelMaps[providerType][modelId]
      logger.info(`[AI-SERVICE] Model mapping (Gateway): ${modelId} → ${mappedModel}`, {
        providerType,
        originalModel: modelId,
        mappedModel
      })
      modelId = mappedModel
    }

    // Validate model against valid models list for Google (v1beta API compatibility)
    if (providerType === 'google') {
      const validModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp']
      if (!validModels.includes(modelId)) {
        logger.warn(`[AI-SERVICE] Invalid Google model ${modelId}, using default: gemini-1.5-flash`)
        modelId = 'gemini-1.5-flash'
      }
    }

    // Check if the requested model is compatible with the provider
    const compatibleFamilies = providerModelFamilies[providerType] || []
    const isCompatible = compatibleFamilies.some(family =>
      modelId.toLowerCase().includes(family.toLowerCase())
    )

    // If model is incompatible, use provider's default model
    if (!isCompatible && model) {
      const fallback = defaultModels[providerType] || 'gpt-4o'
      logger.warn(`⚠️ [AI-SERVICE] Model ${model} not compatible with ${providerType}, using default: ${fallback}`)
      modelId = fallback
    }

    // Ensure modelId is never undefined (avoid e.g. copilot/undefined)
    if (modelId == null || modelId === '') {
      modelId = defaultModels[providerType] || 'gpt-4o'
    }

    // Handle deprecated Groq models
    const groqModelMapping: Record<string, string> = {
      'gemma2-9b-it': 'llama3-8b-8192',
      'gemma-7b-it': 'llama3-8b-8192',
      'llama-3.2-90b-text-preview': 'llama-3.3-70b-versatile',
      'llama2-70b-4096': 'llama3-70b-8192',
    }

    if (providerType === 'groq' && groqModelMapping[modelId]) {
      logger.info(`Mapping deprecated Groq model ${modelId} -> ${groqModelMapping[modelId]}`)
      modelId = groqModelMapping[modelId]
    }

    const safeModelId = modelId == null || modelId === '' ? (defaultModels[providerType] || 'gpt-4o') : modelId
    return `${providerType}/${safeModelId}`
  }

  async getAvailableProviders(): Promise<Array<{ name: string; type: string; models: string[]; is_active: boolean; id: string; configuration: any; usage_stats?: any; default_model?: string; created_at?: string; updated_at?: string }>> {
    try {
      logger.debug("[AI] Getting available providers")
      const result = await pool.query(
        `SELECT 
          id, name, provider_type, configuration, is_active, 
          usage_stats, available_models, default_model,
          created_at, updated_at
        FROM ai_providers 
        ORDER BY name`
      )

      logger.debug(`[AI] Found ${result.rows.length} providers`)
      const providers = []

      for (const provider of result.rows) {
        // Parse available_models from JSONB (PostgreSQL returns JSONB as parsed object/array)
        // Handle both array and null/undefined cases
        let availableModels: string[] = []
        if (provider.available_models) {
          // PostgreSQL JSONB is already parsed, but ensure it's an array
          if (Array.isArray(provider.available_models)) {
            availableModels = provider.available_models
          } else if (typeof provider.available_models === 'string') {
            // If it's a string, parse it
            try {
              availableModels = JSON.parse(provider.available_models)
            } catch {
              availableModels = []
            }
          }
        }

        // Only use fallback if available_models is empty or null
        if (!availableModels || availableModels.length === 0) {
          availableModels = this.getModelsForProvider(provider.provider_type)
        }

        providers.push({
          id: provider.id,
          name: provider.name,
          type: provider.provider_type,
          models: availableModels, // This should now contain the synced models
          is_active: provider.is_active,
          configuration: provider.configuration,
          usage_stats: provider.usage_stats || {
            total_requests: 0,
            total_tokens: 0,
            last_used: null
          },
          default_model: provider.default_model || (availableModels.length > 0 ? availableModels[0] : null),
          created_at: provider.created_at,
          updated_at: provider.updated_at
        })
      }

      logger.debug(`[AI] Returning ${providers.length} providers`)
      return providers
    } catch (error) {
      logger.error("Failed to get available providers:", error)
      return []
    }
  }

  /**
   * Get default models for a provider type (fallback when none configured)
   * This is the centralized fallback system used throughout the application
   */
  getModelsForProvider(providerType: string): string[] {
    switch (providerType) {
      case "openai":
        return ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "gpt-5"]
      case "google":
        // Only include models confirmed to work in v1beta API
        return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
      case "azure":
        return ["gpt-4", "gpt-35-turbo", "gpt-4-32k"]
      case "groq":
        // AI Gateway supported Groq models
        return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"]
      case "mistral":
        return ["mistral-large-latest", "mistral-small-latest", "mistral-medium-latest"]
      case "anthropic":
        return ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"]
      case "deepseek":
        return ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"]
      case "moonshot":
        return ["kimi-k2-turbo-preview", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"]
      case "xai":
        return ["grok-beta", "grok-vision-beta"]
      case "copilot":
        return ["copilot-chat"]
      default:
        return []
    }
  }

  async updateUsageStats(provider: string, usage: any) {
    try {
      await pool.query(
        `
        UPDATE ai_providers 
        SET usage_stats = jsonb_set(
          COALESCE(usage_stats, '{}'),
          '{total_tokens}',
          (COALESCE((usage_stats->>'total_tokens')::int, 0) + $2)::text::jsonb
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE name = $1
      `,
        [provider, usage.total_tokens || 0]
      )
    } catch (error) {
      logger.error(`Failed to update usage stats for ${provider}:`, error)
    }
  }

  /**
   * Track detailed AI usage for analytics (async, non-blocking)
   * Integrates AI generation with analytics tracking system
   */
  private async trackAIUsageAsync(
    providerName: string,
    modelName: string,
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    responseTimeMs: number,
    success: boolean,
    userId?: string,
    projectId?: string,
    documentId?: string
  ) {
    try {
      // Get provider details (try by name or provider_type in one query)
      const providerResult = await pool.query(
        'SELECT id, provider_type, name FROM ai_providers WHERE (name = $1 OR provider_type = $1) AND is_active = true LIMIT 1',
        [providerName]
      )

      if (providerResult.rows.length === 0) {
        logger.warn(`📊 [ANALYTICS] Provider ${providerName} not found (by name or type), skipping tracking`)
        return
      }

      const provider = providerResult.rows[0]

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(provider.provider_type, usage.total_tokens)

      // Track usage
      await AnalyticsTrackingService.trackAIUsage({
        providerId: provider.id,
        modelId: null,  // Can be enhanced later with model table
        providerType: provider.provider_type,
        modelName,
        requestType: 'text_generation',
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        responseTimeMs,
        success,
        errorMessage: null,
        statusCode: null,
        userId: userId || null,
        projectId: projectId || null,
        documentId: documentId || null,
        estimatedCost,
        requestPayload: null,  // Can be enhanced later
        responseMetadata: null,
      })

      logger.info(`📊 [ANALYTICS] Tracked: ${providerName}/${modelName} - ${usage.total_tokens} tokens, $${estimatedCost.toFixed(4)}`)
    } catch (error) {
      logger.error('📊 [ANALYTICS] Failed to track AI usage:', error)
      // Don't throw - tracking failures shouldn't break main flow
    }
  }

  /**
   * Calculate estimated cost based on provider pricing
   * TODO: Move pricing to database configuration table for easier updates
   * @see https://github.com/mdresch/adpa/issues/XXX
   */
  private calculateCost(providerType: string, tokens: number): number {
    // Approximate cost per 1M tokens (in USD) - Updated October 2025
    // NOTE: These rates should be moved to a database table for dynamic updates
    const costPer1M: Record<string, number> = {
      'openai': 30.00,      // GPT-4o average
      'google': 0.50,       // Gemini 2.5 Flash
      'anthropic': 24.00,   // Claude Sonnet
      'mistral': 0.70,      // Mistral Small
      'deepseek': 0.60,     // DeepSeek Chat (competitive pricing)
      'moonshot': 12.00,    // Kimi K2 128K context
      'xai': 5.00,          // xAI Grok (estimated pricing)
      'groq': 0.00,         // Groq free tier
      'azure': 30.00,       // Similar to OpenAI
      'ollama': 0.00,       // Local deployment - FREE
    }

    const rate = costPer1M[providerType.toLowerCase()] || 10.00
    return (tokens / 1000000) * rate
  }

  /**
   * Get template system prompt (KISS: Keep It Simple)
   * System prompt = Pure methodology, no variables replaced
   */
  private async getTemplateSystemPrompt(templateId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        "SELECT system_prompt, content FROM templates WHERE id = $1",
        [templateId]
      )

      if (result.rows.length === 0) {
        logger.warn(`Template not found: ${templateId}`)
        return null
      }

      const template = result.rows[0]
      let systemMessage = template.system_prompt || ''

      // Add template content structure if defined
      if (template.content && Object.keys(template.content).length > 0) {
        systemMessage += '\n\nTEMPLATE STRUCTURE:\n'
        systemMessage += JSON.stringify(template.content, null, 2)
      }

      return systemMessage
    } catch (error) {
      logger.error(`Failed to get template system prompt for ${templateId}:`, error)
      return null
    }
  }

  /**
   * Build user message with ALL context (KISS: Keep It Simple)
   * User message = Variables + User prompt + All context
   */
  private buildUserMessage(
    userPrompt: string,
    variables?: Record<string, any>,
    additionalContext?: string
  ): string {
    let userMessage = ''

    // 1. Add variables (project-specific data)
    if (variables && Object.keys(variables).length > 0) {
      userMessage += 'PROJECT CONTEXT:\n'
      userMessage += JSON.stringify(variables, null, 2)
      userMessage += '\n\n'
    }

    // 2. Add user's request
    if (userPrompt) {
      userMessage += 'USER REQUEST:\n'
      userMessage += userPrompt
      userMessage += '\n\n'
    }

    // 3. Add additional context (from project/documents/integrations)
    if (additionalContext) {
      userMessage += 'ADDITIONAL CONTEXT:\n'
      userMessage += additionalContext
      userMessage += '\n\n'
    }

    // 4. Add explicit instruction
    userMessage += 'Please extract the information above and populate the template using the provided data.'

    return userMessage
  }

  // --- Lightweight provider diagnostics for admin routes ---
  async getOpenAIProviderStats(name?: string): Promise<any> {
    logger.info('[AI] getOpenAIProviderStats (stub)', { name })
    return { name: name || 'default', status: 'ok', reachable: true }
  }

  async testOpenAIConnection(name?: string): Promise<boolean> {
    logger.info('[AI] testOpenAIConnection (stub)', { name })
    return true
  }

  async getGoogleAIProviderStats(name?: string): Promise<any> {
    logger.info('[AI] getGoogleAIProviderStats (stub)', { name })
    return { name: name || 'default', status: 'ok', reachable: true }
  }

  async testGoogleAIConnection(name?: string): Promise<boolean> {
    logger.info('[AI] testGoogleAIConnection (stub)', { name })
    return true
  }
}

export { AIService }
export const aiService = new AIService()
