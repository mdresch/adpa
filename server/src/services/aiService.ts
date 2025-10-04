import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { openaiConnector, OpenAIRequest } from "../modules/ai/openai"
import { googleConnector, GoogleRequest } from "../modules/ai/google"
import { mistralConnector, MistralRequest } from "../modules/ai/mistral"

export interface AIProvider {
  name: string
  type: "openai" | "google" | "azure" | "mistral"
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
  private providers: Map<string, any> = new Map()

  async initializeProviders() {
    try {
      // Initialize OpenAI connector first with error handling
      try {
        await openaiConnector.initializeProviders()
        logger.info("OpenAI connector initialized successfully")
      } catch (error) {
        logger.warn("Failed to initialize OpenAI connector, continuing without it:", error)
      }

      // Initialize Google AI connector with error handling
      try {
        await googleConnector.initializeProviders()
        logger.info("Google AI connector initialized successfully")
      } catch (error) {
        logger.warn("Failed to initialize Google AI connector, continuing without it:", error)
      }

      // Initialize Mistral AI connector with error handling
      try {
        await mistralConnector.initializeProviders()
        logger.info("Mistral AI connector initialized successfully")
      } catch (error) {
        logger.warn("Failed to initialize Mistral AI connector, continuing without it:", error)
      }

      // Initialize other providers with error handling
      try {
        const result = await pool.query(
          "SELECT name, provider_type, api_key_encrypted, configuration FROM ai_providers WHERE is_active = true"
        )

        for (const provider of result.rows) {
        // Skip OpenAI, Google, and Mistral providers as they're handled by their respective connectors
        if (provider.provider_type === 'openai' || provider.provider_type === 'google' || provider.provider_type === 'mistral') {
          continue
        }

          try {
            await this.addProvider({
              name: provider.name,
              type: provider.provider_type,
              apiKey: this.decryptApiKey(provider.api_key_encrypted),
              configuration: provider.configuration,
            })
          } catch (providerError) {
            logger.warn(`Failed to initialize provider ${provider.name}, skipping:`, providerError)
          }
        }

        logger.info(`Initialized ${this.providers.size} legacy AI providers`)
      } catch (error) {
        logger.warn("Failed to initialize legacy AI providers, continuing without them:", error)
      }
    } catch (error) {
      logger.error("Failed to initialize AI providers:", error)
      // Don't throw error to prevent server crash
    }
  }

  async addProvider(provider: AIProvider) {
    try {
      switch (provider.type) {
        case "openai":
          this.providers.set(provider.name, new OpenAI({
            apiKey: provider.apiKey,
            ...provider.configuration,
          }))
          break

        case "google":
          // Legacy google provider stored in providers map for direct usage
          this.providers.set(provider.name, new GoogleGenerativeAI(provider.apiKey))
          break

        case "azure":
          this.providers.set(provider.name, new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.configuration?.endpoint,
            defaultQuery: { "api-version": provider.configuration?.apiVersion || "2023-12-01-preview" },
            defaultHeaders: {
              "api-key": provider.apiKey,
            },
          }))
          break

        case "mistral":
          // Mistral providers are handled by the mistralConnector
          // This is just for legacy compatibility
          break

        default:
          throw new Error(`Unsupported provider type: ${provider.type}`)
      }

      logger.info(`Added AI provider: ${provider.name} (${provider.type})`)
    } catch (error) {
      logger.error(`Failed to add AI provider ${provider.name}:`, error)
      throw error
    }
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    // Process template if provided
    let processedPrompt = request.prompt
    if (request.template_id && request.variables) {
      processedPrompt = await this.processTemplate(request.template_id, request.variables, request.prompt)
    }

    try {
      // Get provider type from database
      const providerResult = await pool.query(
        "SELECT provider_type, configuration FROM ai_providers WHERE name = $1",
        [request.provider]
      )

      if (providerResult.rows.length === 0) {
        throw new Error(`Provider configuration not found: ${request.provider}`)
      }

      const providerType = providerResult.rows[0].provider_type
      const providerConfig = providerResult.rows[0].configuration

      switch (providerType) {
        case "openai":
        case "azure":
          // Use the new OpenAI connector with failover and rate limiting
          const openaiRequest: OpenAIRequest = {
            model: request.model || "gpt-3.5-turbo",
            messages: [{ role: "user", content: processedPrompt }],
            temperature: request.temperature,
            max_tokens: request.max_tokens,
          }
          
          const openaiResponse = await openaiConnector.generateCompletion(openaiRequest, request.provider)
          
          return {
            content: openaiResponse.choices[0]?.message?.content || "",
            provider: openaiResponse.provider,
            model: openaiResponse.model,
            usage: openaiResponse.usage,
            metadata: openaiResponse.metadata,
          }

        case "google":
          // Use the new Google AI connector with failover and rate limiting
          const googleRequest: GoogleRequest = {
            model: request.model || "gemini-pro",
            messages: [{ role: "user", content: processedPrompt }],
            temperature: request.temperature,
            max_tokens: request.max_tokens,
          }
          
          const googleResponse = await googleConnector.generateCompletion(googleRequest, request.provider)
          
          return {
            content: googleResponse.choices[0]?.message?.content || "",
            provider: googleResponse.provider,
            model: googleResponse.model,
            usage: googleResponse.usage,
            metadata: googleResponse.metadata,
          }

        default:
          throw new Error(`Unsupported provider type: ${providerType}`)
      }
    } catch (error) {
      logger.error(`AI generation failed for provider ${request.provider}:`, error)
      throw error
    }
  }

  private async generateOpenAI(
    client: OpenAI,
    prompt: string,
    request: AIGenerateRequest,
    providerType: string
  ): Promise<AIGenerateResponse> {
    const response = await client.chat.completions.create({
      model: request.model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 1000,
    })

    const choice = response.choices[0]
    if (!choice?.message?.content) {
      throw new Error("No content generated")
    }

    return {
      content: choice.message.content,
      provider: request.provider,
      model: response.model,
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      } : undefined,
      metadata: {
        finish_reason: choice.finish_reason,
        provider_type: providerType,
      },
    }
  }

  private async generateGoogle(
    client: GoogleGenerativeAI,
    prompt: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    const model = client.getGenerativeModel({ 
      model: request.model || "gemini-pro",
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.max_tokens || 1000,
      },
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()

    if (!content) {
      throw new Error("No content generated")
    }

    // Extract usage metadata from the correct location
    const usageMetadata = (response as any)?.usageMetadata

    return {
      content,
      provider: request.provider,
      model: request.model || "gemini-pro",
      usage: usageMetadata ? {
        prompt_tokens: usageMetadata.promptTokenCount || 0,
        completion_tokens: usageMetadata.candidatesTokenCount || 0,
        total_tokens: usageMetadata.totalTokenCount || 0,
      } : undefined,
      metadata: {
        provider_type: "google",
        safety_ratings: response.candidates?.[0]?.safetyRatings,
      },
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

  private decryptApiKey(encryptedKey: string): string {
    // TODO: Implement proper encryption/decryption
    // For now, assume keys are base64 encoded
    try {
      return Buffer.from(encryptedKey, "base64").toString("utf-8")
    } catch {
      return encryptedKey // Fallback to plain text
    }
  }

  async getAvailableProviders(): Promise<Array<{ name: string; type: string; models: string[]; is_active: boolean; id: string; configuration: any }>> {
    try {
      const result = await pool.query(
        "SELECT id, name, provider_type, configuration, is_active FROM ai_providers ORDER BY name"
      )

      const providers = []

      for (const provider of result.rows) {
        if (provider.provider_type === 'openai') {
          // Get models from OpenAI connector
          const models = await openaiConnector.getAvailableModels(provider.name)
          providers.push({
            id: provider.id,
            name: provider.name,
            type: provider.provider_type,
            models: models,
            is_active: provider.is_active,
            configuration: provider.configuration,
          })
        } else if (provider.provider_type === 'google') {
          // Get models from Google AI connector
          const models = await googleConnector.getAvailableModels(provider.name)
          providers.push({
            id: provider.id,
            name: provider.name,
            type: provider.provider_type,
            models: models,
            is_active: provider.is_active,
            configuration: provider.configuration,
          })
        } else {
          // Use legacy method for other providers
          providers.push({
            id: provider.id,
            name: provider.name,
            type: provider.provider_type,
            models: this.getModelsForProvider(provider.provider_type),
            is_active: provider.is_active,
            configuration: provider.configuration,
          })
        }
      }

      return providers
    } catch (error) {
      logger.error("Failed to get available providers:", error)
      return []
    }
  }

  private getModelsForProvider(providerType: string): string[] {
    switch (providerType) {
      case "openai":
        return ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"]
      case "google":
        return ["gemini-pro", "gemini-pro-vision"]
      case "azure":
        return ["gpt-4", "gpt-35-turbo", "gpt-4-32k"]
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
   * Get OpenAI provider statistics including rate limits and usage
   */
  async getOpenAIProviderStats(providerName?: string) {
    try {
      if (providerName) {
        return openaiConnector.getProviderStats(providerName)
      } else {
        return openaiConnector.getAllProviderStats()
      }
    } catch (error) {
      logger.error("Failed to get OpenAI provider stats:", error)
      return null
    }
  }

  /**
   * Test connection to a specific OpenAI provider
   */
  async testOpenAIConnection(providerName: string): Promise<boolean> {
    try {
      return await openaiConnector.testConnection(providerName)
    } catch (error) {
      logger.error(`Failed to test OpenAI connection for ${providerName}:`, error)
      return false
    }
  }

  /**
   * Get Google AI provider statistics including rate limits and usage
   */
  async getGoogleAIProviderStats(providerName?: string) {
    try {
      if (providerName) {
        return googleConnector.getProviderStats(providerName)
      } else {
        return googleConnector.getAllProviderStats()
      }
    } catch (error) {
      logger.error("Failed to get Google AI provider stats:", error)
      return null
    }
  }

  /**
   * Test connection to a specific Google AI provider
   */
  async testGoogleAIConnection(providerName: string): Promise<boolean> {
    try {
      return await googleConnector.testConnection(providerName)
    } catch (error) {
      logger.error(`Failed to test Google AI connection for ${providerName}:`, error)
      return false
    }
  }
}

export const aiService = new AIService()
