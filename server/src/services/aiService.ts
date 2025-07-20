import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"

export interface AIProvider {
  name: string
  type: "openai" | "google" | "azure"
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
      const result = await pool.query(
        "SELECT name, provider_type, api_key_encrypted, configuration FROM ai_providers WHERE is_active = true"
      )

      for (const provider of result.rows) {
        await this.addProvider({
          name: provider.name,
          type: provider.provider_type,
          apiKey: this.decryptApiKey(provider.api_key_encrypted),
          configuration: provider.configuration,
        })
      }

      logger.info(`Initialized ${this.providers.size} AI providers`)
    } catch (error) {
      logger.error("Failed to initialize AI providers:", error)
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
    const provider = this.providers.get(request.provider)
    if (!provider) {
      throw new Error(`Provider ${request.provider} not found or not configured`)
    }

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
          return await this.generateOpenAI(provider, processedPrompt, request, providerType)

        case "google":
          return await this.generateGoogle(provider, processedPrompt, request)

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

    return {
      content,
      provider: request.provider,
      model: request.model || "gemini-pro",
      usage: response.usageMetadata ? {
        prompt_tokens: response.usageMetadata.promptTokenCount || 0,
        completion_tokens: response.usageMetadata.candidatesTokenCount || 0,
        total_tokens: response.usageMetadata.totalTokenCount || 0,
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

  async getAvailableProviders(): Promise<Array<{ name: string; type: string; models: string[] }>> {
    try {
      const result = await pool.query(
        "SELECT name, provider_type, configuration FROM ai_providers WHERE is_active = true"
      )

      return result.rows.map(provider => ({
        name: provider.name,
        type: provider.provider_type,
        models: this.getModelsForProvider(provider.provider_type),
      }))
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
}

export const aiService = new AIService()
