/**
 * AI Service - AI Gateway Integration
 * Uses Vercel AI SDK and AI Gateway for unified multi-provider access
 * Version: 3.0 - AI Gateway Only
 */

import { generateText } from "ai"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface AIProvider {
  name: string
  type: "openai" | "google" | "azure" | "mistral" | "groq" | "anthropic"
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

class AIService {
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

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    logger.info('🚀 [AI-SERVICE-1/8] Generate method called')
    logger.info('📊 [AI-SERVICE] Request:', {
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      promptLength: request.prompt.length
    })
    
    // Fetch AI Gateway API key from database
    const { getAIGatewayKey } = await import("../routes/settings")
    const gatewayApiKey = await getAIGatewayKey()
    
    if (!gatewayApiKey) {
      logger.error('❌ [AI-SERVICE] No AI Gateway API key configured')
      throw new Error("AI Gateway API key not configured. Please configure it in Settings.")
    }
    logger.info('✅ [AI-SERVICE-2/8] AI Gateway API key retrieved from database')

    // Process template if provided
    let processedPrompt = request.prompt
    if (request.template_id && request.variables) {
      logger.info('🔄 [AI-SERVICE-3/8] Processing template variables...')
      processedPrompt = await this.processTemplate(request.template_id, request.variables, request.prompt)
    } else {
      logger.info('✅ [AI-SERVICE-3/8] No template processing needed')
    }

    try {
      // Get provider type from database to build the model ID
      logger.info('🔍 [AI-SERVICE-4/8] Looking up provider type...')
      const providerResult = await pool.query(
        "SELECT provider_type, configuration FROM ai_providers WHERE name = $1 AND is_active = true",
        [request.provider]
      )

      if (providerResult.rows.length === 0) {
        logger.error('❌ [AI-SERVICE] Provider not found:', request.provider)
        throw new Error(`Provider not found or inactive: ${request.provider}`)
      }

      const providerType = providerResult.rows[0].provider_type
      logger.info('✅ [AI-SERVICE-5/8] Provider type:', providerType)
      
      // Build AI Gateway model ID (e.g., 'groq/llama-3.1-8b-instant')
      const gatewayModelId = await this.buildGatewayModelId(providerType, request.model)
      
      logger.info('🌐 [AI-SERVICE-6/8] AI Gateway generation starting:', gatewayModelId)
      logger.info('⏱️ [AI-SERVICE] Temperature:', request.temperature || 0.7)
      logger.info('📝 [AI-SERVICE] Prompt length:', processedPrompt.length, 'chars')
      
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
      try {
        result = await generateText({
          model: gatewayModelId,
          prompt: processedPrompt,
          temperature: request.temperature || 0.7,
          maxTokens: request.max_tokens || 2000,
        } as any)
      } finally {
        // Restore previous key immediately
        if (previousKey) {
          process.env.AI_GATEWAY_API_KEY = previousKey
        } else {
          delete process.env.AI_GATEWAY_API_KEY
        }
      }

      logger.info('✅ [AI-SERVICE-7/8] Generation successful!')
      logger.info('📊 [AI-SERVICE] Tokens used:', result.usage.totalTokens)
      logger.info('📝 [AI-SERVICE] Content length:', result.text.length, 'chars')

      // Update usage stats
      await this.updateUsageStats(request.provider, {
        total_tokens: result.usage.totalTokens,
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
      'google': 'gemini-2.5-flash',  // Updated to available model in Vercel AI Gateway
      'groq': 'llama-3.3-70b-versatile',
      'mistral': 'mistral-large-latest',
      'anthropic': 'claude-sonnet-4',
      'azure': 'gpt-4',
    }

    let modelId = model || defaultModels[providerType] || 'gpt-4o'
    
    // Handle deprecated Groq models
    const groqModelMapping: Record<string, string> = {
      'gemma2-9b-it': 'llama3-8b-8192',  // Decommissioned, use llama3 instead
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
      logger.info("Getting available providers from database")
      const result = await pool.query(
        `SELECT 
          id, name, provider_type, configuration, is_active, 
          usage_stats, available_models, default_model,
          created_at, updated_at
        FROM ai_providers 
        ORDER BY name`
      )

      logger.info(`Found ${result.rows.length} providers in database`)
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

      logger.info(`Returning ${providers.length} providers`)
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

  private async processTemplate(
    templateId: string,
    variables: Record<string, any>,
    basePrompt: string
  ): Promise<string> {
    try {
      const result = await pool.query(
        "SELECT content, variables FROM templates WHERE id = $1",
        [templateId]
      )

      if (result.rows.length === 0) {
        logger.warn(`Template not found: ${templateId}, using base prompt`)
        return basePrompt
      }

      const template = result.rows[0]
      let processedContent = JSON.stringify(template.content)

      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
        processedContent = processedContent.replace(regex, String(value))
      }

      // Combine with base prompt
      return `${basePrompt}\n\nTemplate Context:\n${processedContent}`
    } catch (error) {
      logger.error(`Template processing failed for ${templateId}:`, error)
      return basePrompt
    }
  }
}

export { AIService }
export const aiService = new AIService()
