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
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import AnalyticsTrackingService from "./analyticsTrackingService"

export interface AIProvider {
  name: string
  type: "openai" | "google" | "azure" | "mistral" | "groq" | "anthropic" | "deepseek" | "moonshot" | "ollama"
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

  async initializeProviders() {
    try {
      // With AI Gateway, we don't need to initialize individual provider clients
      // Just verify we have active providers in the database
      const result = await pool.query(
        "SELECT COUNT(*) as count FROM ai_providers WHERE is_active = true"
      )
      
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
        logger.warn(`⚠️ [AI-FALLBACK] Provider ${provider} failed: ${error.message}`)
        
        // Check if error is due to insufficient funds/credits or capacity exceeded
        const errorMessage = error.message?.toLowerCase() || ''
        const isInsufficientFunds = 
          errorMessage.includes('insufficient funds') ||
          errorMessage.includes('insufficient_funds') ||
          errorMessage.includes('no credits') ||
          errorMessage.includes('out of credits') ||
          errorMessage.includes('credit limit') ||
          errorMessage.includes('service tier capacity exceeded') ||
          errorMessage.includes('capacity exceeded') ||
          errorMessage.includes('rate limit exceeded') ||
          errorMessage.includes('too many requests') ||
          error.statusCode === 402 || // Payment Required
          error.statusCode === 429 || // Too Many Requests
          error.type === 'insufficient_funds' ||
          error.code === 'rate_limit_exceeded'
        
        if (isInsufficientFunds) {
          logger.error(`💳 [AI-CREDITS] Provider ${provider} has insufficient funds/credits or capacity exceeded`)
          await autoDisableProvider(provider, `Insufficient capacity: ${error.message}`)
        } else {
          // Record failure and apply backoff for other errors
          this.recordProviderFailure(provider)
        }
        
        lastError = error
        
        // Add delay between provider attempts (progressive backoff)
        if (attemptsWithBackoff < providers.length) {
          const delayMs = Math.min(1000 * attemptsWithBackoff, 5000) // Max 5s between attempts
          logger.info(`⏳ [AI-FALLBACK] Waiting ${delayMs}ms before trying next provider...`)
          await new Promise(resolve => setTimeout(resolve, delayMs))
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
      promptLength: request.prompt.length
    })
    
    // Fetch AI Gateway API key from database
    const { getAIGatewayKey } = await import("../routes/settings")
    const gatewayApiKey = await getAIGatewayKey()
    
    if (!gatewayApiKey) {
      logger.error('[AI-SERVICE] No AI Gateway API key configured')
      throw new Error("AI Gateway API key not configured. Please configure it in Settings.")
    }
    logger.debug('[AI-SERVICE] Gateway API key retrieved')

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

    try {
      // Get provider type from database to build the model ID
      logger.debug('[AI-SERVICE] Looking up provider type')
      // Try to find provider by provider_type first (e.g., "mistral", "openai"), then by name
      const providerResult = await pool.query(
        "SELECT provider_type, configuration FROM ai_providers WHERE (provider_type = $1 OR LOWER(name) = LOWER($1)) AND is_active = true LIMIT 1",
        [request.provider]
      )

      if (providerResult.rows.length === 0) {
        logger.error('❌ [AI-SERVICE] Provider not found:', request.provider)
        throw new Error(`Provider not found or inactive: ${request.provider}`)
      }

      const providerType = providerResult.rows[0].provider_type
      logger.debug('[AI-SERVICE] Provider type:', providerType)
      
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
            maxTokens: request.max_tokens || 2000,
          } as any)
        } else {
          logger.info('📨 [AI-SERVICE-6/8] Using simple prompt (no template)')
          result = await generateText({
            model: gatewayModelId,
            prompt: userMessage,
            temperature: request.temperature || 0.7,
            maxTokens: request.max_tokens || 2000,
          } as any)
        }
        gatewaySuccess = true
      } catch (gatewayError: any) {
        logger.warn('⚠️ [AI-SERVICE] AI Gateway failed, attempting direct provider fallback...')
        logger.warn('⚠️ [AI-SERVICE] Gateway error:', gatewayError?.message || gatewayError)
        
        // Restore key before fallback
        if (previousKey) {
          process.env.AI_GATEWAY_API_KEY = previousKey
        } else {
          delete process.env.AI_GATEWAY_API_KEY
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
          const model = genAI.getGenerativeModel({ model: request.model || 'gemini-2.5-flash' })
          // KISS: Combine system and user message for Google AI (it doesn't have separate system role)
          const combinedPrompt = systemMessage 
            ? `${systemMessage}\n\n---\n\n${userMessage}`
            : userMessage
          const googleResult = await model.generateContent(combinedPrompt)
          const response = await googleResult.response
          const text = response.text()
          
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
            this.trackAIUsageAsync(request.provider, request.model || 'gemini-2.5-flash', {
              prompt_tokens: Math.ceil(promptLength / 4),
              completion_tokens: Math.ceil(text.length / 4),
              total_tokens: estimatedTokens,
            }, responseTimeMs, true, (request as any).userId, (request as any).projectId, (request as any).documentId)
          })
          
          logger.info(`[AI] ✓ Google AI/${request.model || 'gemini-2.5-flash'} - ${estimatedTokens} tokens - ${Date.now() - startTime}ms`)
          
          return {
            content: text,
            provider: request.provider,
            model: request.model || 'gemini-2.5-flash',
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
            maxTokens: request.max_tokens
          })
          
          logger.debug('[AI-SERVICE] Mistral AI successful:', { contentLength: mistralResult.text.length })
          
          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: mistralResult.usage?.totalTokens || 0,
          })
          
          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: mistralResult.usage?.promptTokens || 0,
              completion_tokens: mistralResult.usage?.completionTokens || 0,
              total_tokens: mistralResult.usage?.totalTokens || 0,
            }, responseTimeMs, true, (request as any).userId, (request as any).projectId, (request as any).documentId)
          })
          
          logger.info(`[AI] ✓ Mistral AI/${modelName} - ${mistralResult.usage?.totalTokens || 0} tokens - ${Date.now() - startTime}ms`)
          
          return {
            content: mistralResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: mistralResult.usage?.promptTokens || 0,
              completion_tokens: mistralResult.usage?.completionTokens || 0,
              total_tokens: mistralResult.usage?.totalTokens || 0,
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
            maxTokens: request.max_tokens
          })
          
          logger.debug('[AI-SERVICE] DeepSeek successful:', { contentLength: deepseekResult.text.length })
          
          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: deepseekResult.usage?.totalTokens || 0,
          })
          
          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: deepseekResult.usage?.promptTokens || 0,
              completion_tokens: deepseekResult.usage?.completionTokens || 0,
              total_tokens: deepseekResult.usage?.totalTokens || 0,
            }, responseTimeMs, true, (request as any).userId, (request as any).projectId, (request as any).documentId)
          })
          
          logger.info(`[AI] ✓ DeepSeek/${modelName} - ${deepseekResult.usage?.totalTokens || 0} tokens - ${Date.now() - startTime}ms`)
          
          return {
            content: deepseekResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: deepseekResult.usage?.promptTokens || 0,
              completion_tokens: deepseekResult.usage?.completionTokens || 0,
              total_tokens: deepseekResult.usage?.totalTokens || 0,
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
            maxTokens: request.max_tokens
          })
          
          logger.debug('[AI-SERVICE] Moonshot AI successful:', { contentLength: moonshotResult.text.length })
          
          // Update usage stats
          await this.updateUsageStats(request.provider, {
            total_tokens: moonshotResult.usage?.totalTokens || 0,
          })
          
          // Track detailed AI usage for analytics (background, non-blocking)
          const responseTimeMs = Date.now() - startTime
          setImmediate(() => {
            this.trackAIUsageAsync(request.provider, modelName, {
              prompt_tokens: moonshotResult.usage?.promptTokens || 0,
              completion_tokens: moonshotResult.usage?.completionTokens || 0,
              total_tokens: moonshotResult.usage?.totalTokens || 0,
            }, responseTimeMs, true, (request as any).userId, (request as any).projectId, (request as any).documentId)
          })
          
          logger.info(`[AI] ✓ Moonshot AI/${modelName} - ${moonshotResult.usage?.totalTokens || 0} tokens - ${Date.now() - startTime}ms`)
          
          return {
            content: moonshotResult.text,
            provider: request.provider,
            model: modelName,
            usage: {
              prompt_tokens: moonshotResult.usage?.promptTokens || 0,
              completion_tokens: moonshotResult.usage?.completionTokens || 0,
              total_tokens: moonshotResult.usage?.totalTokens || 0,
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
            
            const ollamaData = await ollamaResponse.json()
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
                (request as any).userId,
                (request as any).projectId,
                (request as any).documentId
              )
            })
            
            logger.info(`[AI] ✓ Ollama/${modelName} - ${totalTokens} tokens - ${responseTimeMs}ms`)
            
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
            logger.error('[AI-SERVICE] Ollama native API failed:', ollamaError)
            throw new Error(`Ollama generation failed: ${ollamaError.message}`)
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

      // AI Gateway success path
      logger.info(`[AI] ✓ ${request.provider}/${request.model || gatewayModelId} - ${result.usage.totalTokens} tokens - ${Date.now() - startTime}ms`)

      // Update usage stats
      await this.updateUsageStats(request.provider, {
        total_tokens: result.usage.totalTokens,
      })

      // Track detailed AI usage for analytics (background, non-blocking)
      const responseTimeMs = Date.now() - startTime
      setImmediate(() => {
        this.trackAIUsageAsync(request.provider, request.model || gatewayModelId, {
          prompt_tokens: (result.usage as any).promptTokens || 0,
          completion_tokens: (result.usage as any).completionTokens || 0,
          total_tokens: result.usage.totalTokens,
        }, responseTimeMs, true, (request as any).userId, (request as any).projectId, (request as any).documentId)
      })

      logger.info('✅ [AI-SERVICE-8/8] Usage stats updated. Returning response.')

      return {
        content: result.text,
        provider: request.provider,
        model: request.model || gatewayModelId,
        usage: {
          prompt_tokens: (result.usage as any).promptTokens || 0,
          completion_tokens: (result.usage as any).completionTokens || 0,
          total_tokens: result.usage.totalTokens,
        },
      }
    } catch (error) {
      logger.error(`❌ [AI-SERVICE-ERROR] AI generation failed for provider ${request.provider}:`, error)
      logger.error(`❌ [AI-SERVICE-ERROR] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  // Map provider type and model to AI Gateway format
  private async buildGatewayModelId(providerType: string, model?: string): Promise<string> {
    const defaultModels: Record<string, string> = {
      'openai': 'gpt-4o',
      'google': 'gemini-2.5-flash',
      'groq': 'llama-3.3-70b-versatile',
      'mistral': 'mistral-large-latest',
      'anthropic': 'claude-sonnet-4',
      'azure': 'gpt-4',
    }

    // Define provider-specific model families
    const providerModelFamilies: Record<string, string[]> = {
      'openai': ['gpt-', 'o1-', 'text-'],
      'google': ['gemini-', 'palm-'],
      'groq': ['llama', 'mixtral', 'gemma'],
      'mistral': ['mistral-', 'codestral-', 'pixtral-', 'magistral-'],
      'anthropic': ['claude-'],
      'azure': ['gpt-', 'text-']
    }

    let modelId = model || defaultModels[providerType] || 'gpt-4o'
    
    // Check if the requested model is compatible with the provider
    const compatibleFamilies = providerModelFamilies[providerType] || []
    const isCompatible = compatibleFamilies.some(family => 
      modelId.toLowerCase().includes(family.toLowerCase())
    )
    
    // If model is incompatible, use provider's default model
    if (!isCompatible && model) {
      logger.warn(`⚠️ [AI-SERVICE] Model ${model} not compatible with ${providerType}, using default: ${defaultModels[providerType]}`)
      modelId = defaultModels[providerType]
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
    
    // Format: 'provider/model'
    return `${providerType}/${modelId}`
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
        // Use available_models from database if exists, otherwise fall back to hardcoded list
        const availableModels = provider.available_models || this.getModelsForProvider(provider.provider_type)
        
        providers.push({
          id: provider.id,
          name: provider.name,
          type: provider.provider_type,
          models: availableModels,
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

  private getModelsForProvider(providerType: string): string[] {
    switch (providerType) {
      case "openai":
        return ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "gpt-5"]
      case "google":
        return ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-pro", "gemini-pro-vision"]
      case "azure":
        return ["gpt-4", "gpt-35-turbo", "gpt-4-32k"]
      case "groq":
        // AI Gateway supported Groq models
        return ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"]
      case "mistral":
        return ["mistral-large-latest", "mistral-small-latest", "mistral-medium-latest"]
      case "anthropic":
        return ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-sonnet-4"]
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
      // Get provider details
      const providerResult = await pool.query(
        'SELECT id, provider_type FROM ai_providers WHERE name = $1 LIMIT 1',
        [providerName]
      )
      
      if (providerResult.rows.length === 0) {
        logger.warn(`📊 [ANALYTICS] Provider ${providerName} not found, skipping tracking`)
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
   */
  private calculateCost(providerType: string, tokens: number): number {
    // Approximate cost per 1M tokens (in USD) - Updated pricing as of 2024
    const costPer1M: Record<string, number> = {
      'openai': 30.00,      // GPT-4o average
      'google': 0.50,       // Gemini 2.5 Flash
      'anthropic': 24.00,   // Claude Sonnet
      'mistral': 0.70,      // Mistral Small
      'groq': 0.00,         // Groq free tier
      'azure': 30.00,       // Similar to OpenAI
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
}

export { AIService }
export const aiService = new AIService()
