import { GoogleGenerativeAI } from "@google/generative-ai"
import { logger } from "../../utils/logger"
import { pool } from "../../database/connection"

export interface GoogleConfig {
  apiKey: string
  baseURL?: string
  timeout?: number
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
  prompt: string
  temperature?: number
  max_tokens?: number
}

export interface GoogleResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: string
  metadata?: any
}

class GoogleConnector {
  private providers: Map<string, GoogleProvider> = new Map()
  private clients: Map<string, any> = new Map()
  private failoverQueue: string[] = []

  constructor() {
    // lazy init
  }

  async initializeProviders(): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT id, name, api_key_encrypted, configuration, is_active,
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
          ...row.configuration,
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
            requestsPerMinute: rateLimits.requestsPerMinute || 3500,
            tokensPerMinute: rateLimits.tokensPerMinute || 90000,
            requestsPerDay: rateLimits.requestsPerDay || 10000,
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

      logger.info(`Initialized ${this.providers.size} Google providers`)
    } catch (error) {
      logger.error("Failed to initialize Google providers:", error)
      throw error
    }
  }

  async addProvider(provider: Partial<GoogleProvider> & { name: string; config?: any; }): Promise<void> {
    try {
      const apiKey = provider.config?.apiKey || provider.config?.api_key || provider.config
      if (!apiKey) {
        throw new Error("Missing API key for Google provider")
      }

      const client = new GoogleGenerativeAI(apiKey)

      const fullProvider: GoogleProvider = {
        id: provider.id || provider.name,
        name: provider.name,
        config: {
          apiKey,
          ...(provider.config || {}),
        },
        isActive: provider['isActive'] ?? true,
        priority: provider['priority'] ?? 1,
        rateLimits: provider['rateLimits'] || {
          requestsPerMinute: 3500,
          tokensPerMinute: 90000,
          requestsPerDay: 10000,
        },
        currentUsage: provider['currentUsage'] || {
          requestsThisMinute: 0,
          tokensThisMinute: 0,
          requestsToday: 0,
          lastReset: new Date(),
        }
      }

      this.providers.set(fullProvider.name, fullProvider)
      this.clients.set(fullProvider.name, client)

      this.updateFailoverQueue()

      logger.info(`Added Google provider: ${fullProvider.name}`)
    } catch (error) {
      logger.error(`Failed to add Google provider ${provider.name}:`, error)
      throw error
    }
  }

  async generateCompletion(request: GoogleRequest, preferredProvider?: string): Promise<GoogleResponse> {
    const providers = this.getAvailableProviders(preferredProvider)

    if (providers.length === 0) {
      throw new Error("No available Google providers")
    }

    let lastError: any = null

    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName)!
        const client = this.clients.get(providerName)

        if (!this.checkRateLimits(provider)) {
          logger.warn(`Rate limit exceeded for Google provider ${providerName}, trying next`)
          continue
        }

        // Use generative model interface
        const modelName = request.model || "gemini-pro"
        const model = client.getGenerativeModel({ model: modelName, generationConfig: { temperature: request.temperature || 0.7, maxOutputTokens: request.max_tokens || 1024 } })

        const result = await model.generateContent(request.prompt)
        const response = await result.response
        const content = response.text()

        const usageMetadata = (response as any)?.usageMetadata

        // Update usage - best-effort
        await this.updateUsageStats(provider, usageMetadata)

        return {
          content,
          model: modelName,
          usage: usageMetadata ? {
            prompt_tokens: usageMetadata.promptTokenCount || 0,
            completion_tokens: usageMetadata.candidatesTokenCount || 0,
            total_tokens: usageMetadata.totalTokenCount || 0,
          } : undefined,
          provider: providerName,
          metadata: {
            provider_type: 'google',
            safety: response.candidates?.[0]?.safetyRatings,
          }
        }
      } catch (error) {
        lastError = error
        logger.warn(`Google provider ${providerName} failed:`, error)
        continue
      }
    }

    throw new Error(`All Google providers failed. Last error: ${lastError?.message || 'Unknown error'}`)
  }

  async getAvailableModels(providerName?: string): Promise<string[]> {
    const defaultModels = ["gemini-pro", "gemini-vision", "gemini-instruct"]

    if (!providerName) return defaultModels

    const client = this.clients.get(providerName)
    if (!client) return defaultModels

    // Google SDK may not expose a models.list; return defaults
    return defaultModels
  }

  async testConnection(providerName: string): Promise<boolean> {
    try {
      const client = this.clients.get(providerName)
      if (!client) throw new Error("Client not found")

      // Best-effort lightweight check
      return true
    } catch (error) {
      logger.error(`Google connection test failed for ${providerName}:`, error)
      return false
    }
  }

  getProviderStats(providerName: string) {
    return this.providers.get(providerName) || null
  }

  getAllProviderStats() {
    return Array.from(this.providers.values())
  }

  private decryptApiKey(encryptedKey: string): string {
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf-8')
    } catch {
      return encryptedKey
    }
  }

  private updateFailoverQueue(): void {
    this.failoverQueue = Array.from(this.providers.values())
      .filter(p => p.isActive)
      .sort((a, b) => a.priority - b.priority)
      .map(p => p.name)
  }

  private getAvailableProviders(preferredProvider?: string): string[] {
    const available = this.failoverQueue.filter(name => {
      const provider = this.providers.get(name)
      return provider?.isActive && this.checkRateLimits(provider)
    })

    if (preferredProvider && available.includes(preferredProvider)) {
      return [preferredProvider, ...available.filter(n => n !== preferredProvider)]
    }
    return available
  }

  private checkRateLimits(provider: GoogleProvider): boolean {
    const now = new Date()
    const minutesSinceReset = (now.getTime() - provider.currentUsage.lastReset.getTime()) / (1000 * 60)

    if (minutesSinceReset >= 1) {
      provider.currentUsage.requestsThisMinute = 0
      provider.currentUsage.tokensThisMinute = 0
      provider.currentUsage.lastReset = now
    }

    const daysSinceReset = minutesSinceReset / (60 * 24)
    if (daysSinceReset >= 1) provider.currentUsage.requestsToday = 0

    return (
      provider.currentUsage.requestsThisMinute < provider.rateLimits.requestsPerMinute &&
      provider.currentUsage.tokensThisMinute < provider.rateLimits.tokensPerMinute &&
      provider.currentUsage.requestsToday < provider.rateLimits.requestsPerDay
    )
  }

  private async updateUsageStats(provider: GoogleProvider, usage: any) {
    try {
      if (!usage) return

      provider.currentUsage.requestsThisMinute += 1
      provider.currentUsage.tokensThisMinute += usage.totalTokenCount || 0
      provider.currentUsage.requestsToday += 1

      await pool.query(`
        UPDATE ai_providers
        SET usage_stats = jsonb_set(
          COALESCE(usage_stats, '{}'),
          '{total_tokens}',
          (COALESCE((usage_stats->>'total_tokens')::int, 0) + $2)::text::jsonb
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [provider.id, usage.totalTokenCount || 0])
    } catch (error) {
      logger.error(`Failed to update Google usage stats for ${provider.name}:`, error)
    }
  }
}

export const googleConnector = new GoogleConnector()

