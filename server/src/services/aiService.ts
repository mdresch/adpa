import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface AIProvider {
  name: string
  type: "openai" | "google" | "azure" | "mistral" | "groq"
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
      // Initialize providers with error handling
      const result = await pool.query(
        "SELECT name, provider_type, api_key_encrypted, configuration FROM ai_providers WHERE is_active = true"
      )

      for (const provider of result.rows) {
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

      logger.info(`Initialized ${this.providers.size} AI providers`)
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

        case "groq":
          // Groq uses OpenAI-compatible API
          this.providers.set(provider.name, new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.configuration?.baseURL || "https://api.groq.com/openai/v1",
            ...provider.configuration,
          }))
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
          return await this.generateOpenAI(processedPrompt, request, providerType)
        case "google":
          return await this.generateGoogle(processedPrompt, request)
        case "mistral":
          return await this.generateMistral(processedPrompt, request)
        default:
          throw new Error(`Unsupported provider type: ${providerType}`)
      }
    } catch (error) {
      logger.error(`AI generation failed for provider ${request.provider}:`, error)
      throw error
    }
  }

  private async generateOpenAI(
    prompt: string,
    request: AIGenerateRequest,
    providerType: string
  ): Promise<AIGenerateResponse> {
    const provider = this.providers.get(request.provider)
    if (!provider) {
      throw new Error(`Provider ${request.provider} not found`)
    }

    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.configuration?.baseURL,
    })

    const response = await client.chat.completions.create({
      model: request.model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: request.temperature || 0.7,
      max_tokens: request.max_tokens || 1000,
    })

    const choice = response.choices[0]
    return {
      content: choice?.message?.content || "",
      provider: request.provider,
      model: request.model || "gpt-3.5-turbo",
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      } : undefined,
      metadata: {
        finishReason: choice?.finish_reason,
        model: response.model,
      }
    }
  }

  private async generateGoogle(
    prompt: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    const provider = this.providers.get(request.provider)
    if (!provider) {
      throw new Error(`Provider ${request.provider} not found`)
    }

    const genAI = new GoogleGenerativeAI(provider.apiKey)
    const model = genAI.getGenerativeModel({ 
      model: request.model || "gemini-pro" 
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return {
      content: text,
      provider: request.provider,
      model: request.model || "gemini-pro",
      usage: {
        prompt_tokens: 0, // Google AI doesn't provide token usage in the same way
        completion_tokens: 0,
        total_tokens: 0,
      },
      metadata: {
        finishReason: "stop",
        model: request.model || "gemini-pro",
      }
    }
  }

  private async generateMistral(
    prompt: string,
    request: AIGenerateRequest
  ): Promise<AIGenerateResponse> {
    // For now, return a placeholder response since Mistral AI SDK has issues
    return {
      content: "Mistral AI integration temporarily disabled due to dependency conflicts",
      provider: request.provider,
      model: request.model || "mistral-large-latest",
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      metadata: {
        finishReason: "error",
        model: request.model || "mistral-large-latest",
      }
    }
  }

  private async generateOpenAIOld(
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
      logger.info("Getting available providers from database")
      const result = await pool.query(
        "SELECT id, name, provider_type, configuration, is_active FROM ai_providers ORDER BY name"
      )

      logger.info(`Found ${result.rows.length} providers in database`)
      const providers = []

      for (const provider of result.rows) {
        try {
          logger.info(`Processing provider: ${provider.name} (${provider.provider_type})`)
          
          if (provider.provider_type === 'openai') {
            // Get models from OpenAI connector
            try {
              const models = await openaiConnector.getAvailableModels(provider.name)
              providers.push({
                id: provider.id,
                name: provider.name,
                type: provider.provider_type,
                models: models,
                is_active: provider.is_active,
                configuration: provider.configuration,
              })
              logger.info(`Added OpenAI provider: ${provider.name} with ${models.length} models`)
            } catch (error) {
              logger.warn(`Failed to get models for OpenAI provider ${provider.name}:`, error)
              // Add provider without models
              providers.push({
                id: provider.id,
                name: provider.name,
                type: provider.provider_type,
                models: [],
                is_active: provider.is_active,
                configuration: provider.configuration,
              })
            }
          } else if (provider.provider_type === 'google') {
            // Get models from Google AI connector
            try {
              const models = await googleConnector.getAvailableModels(provider.name)
              providers.push({
                id: provider.id,
                name: provider.name,
                type: provider.provider_type,
                models: models,
                is_active: provider.is_active,
                configuration: provider.configuration,
              })
              logger.info(`Added Google provider: ${provider.name} with ${models.length} models`)
            } catch (error) {
              logger.warn(`Failed to get models for Google provider ${provider.name}:`, error)
              // Add provider without models
              providers.push({
                id: provider.id,
                name: provider.name,
                type: provider.provider_type,
                models: [],
                is_active: provider.is_active,
                configuration: provider.configuration,
              })
            }
          } else {
            // Use legacy method for other providers
            const models = this.getModelsForProvider(provider.provider_type)
            providers.push({
              id: provider.id,
              name: provider.name,
              type: provider.provider_type,
              models: models,
              is_active: provider.is_active,
              configuration: provider.configuration,
            })
            logger.info(`Added ${provider.provider_type} provider: ${provider.name} with ${models.length} models`)
          }
        } catch (error) {
          logger.error(`Error processing provider ${provider.name}:`, error)
          // Continue with other providers
        }
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

export { AIService }
export const aiService = new AIService()
