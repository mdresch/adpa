/**
 * Modern AI Provider Service using AI SDK patterns
 * 
 * This service provides a unified interface for all AI providers
 * following the Vercel AI SDK approach for simplicity and consistency.
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

// AI Provider Types
export type AIProviderType = 'openai' | 'google' | 'azure' | 'anthropic' | 'cohere' | 'huggingface' | 'ollama' | 'deepseek' | 'moonshot' | 'xai' | 'groq'

// AI Provider Configuration
export interface AIProviderConfig {
  id: string
  name: string
  type: AIProviderType
  apiKey: string
  endpoint?: string
  model?: string
  priority: number
  isActive: boolean
  configuration: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

// AI Request Interface
export interface AIRequest {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  systemPrompt?: string
  messages?: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
}

// AI Response Interface
export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  provider: string
  finishReason?: string
  metadata?: Record<string, any>
}

// AI Provider Interface
export interface AIProvider {
  name: string
  type: AIProviderType
  generate(request: AIRequest): Promise<AIResponse>
  test(): Promise<boolean>
  getModels(): Promise<string[]>
}

class AIProviderService {
  private providers: Map<string, AIProvider> = new Map()
  private initialized = false

  /**
   * Initialize the AI provider service
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.providers.size > 0) return

    try {
      logger.info('Initializing AI Provider Service...')

      // Load providers from database
      await this.loadProvidersFromDatabase()

      this.initialized = true
      logger.info(`AI Provider Service initialized with ${this.providers.size} providers`)
    } catch (error) {
      logger.error('Failed to initialize AI Provider Service:', error)
      throw error
    }
  }

  /**
   * Load providers from database
   */
  private async loadProvidersFromDatabase(): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT id, name, provider_type, api_key_encrypted, configuration, is_active, priority
        FROM ai_providers 
        WHERE is_active = true
        ORDER BY priority ASC, name ASC
      `)

      for (const row of result.rows) {
        try {
          const config: AIProviderConfig = {
            id: row.id,
            name: row.name,
            type: row.provider_type,
            apiKey: this.decryptApiKey(row.api_key_encrypted),
            endpoint: row.configuration?.endpoint,
            model: row.configuration?.model,
            priority: row.priority || 1,
            isActive: row.is_active,
            configuration: row.configuration || {},
            createdAt: new Date(),
            updatedAt: new Date()
          }

          const provider = this.createProvider(config)
          this.providers.set(config.name, provider)

          logger.info(`Loaded AI provider: ${config.name} (${config.type})`)
        } catch (error) {
          logger.error(`Failed to load provider ${row.name}:`, error)
        }
      }
    } catch (error) {
      logger.error('Failed to load providers from database:', error)
      throw error
    }
  }

  /**
   * Create a provider instance based on type
   */
  private createProvider(config: AIProviderConfig): AIProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'google':
        return new GoogleAIProvider(config)
      case 'azure':
        return new AzureAIProvider(config)
      case 'anthropic':
        return new AnthropicProvider(config)
      case 'cohere':
        return new CohereProvider(config)
      case 'huggingface':
        return new HuggingFaceProvider(config)
      case 'ollama':
        return new OllamaProvider(config)
      case 'deepseek':
        return new DeepSeekProvider(config)
      case 'moonshot':
        return new MoonshotProvider(config)
      case 'xai':
        return new XAIProvider(config)
      case 'groq':
        return new GroqProvider(config)
      default:
        throw new Error(`Unsupported provider type: ${config.type}`)
    }
  }

  /**
   * Generate content using the best available provider
   */
  async generate(request: AIRequest, preferredProvider?: string): Promise<AIResponse> {
    if (!this.initialized) {
      await this.initialize()
    }

    const providers = this.getActiveProviders()
    if (providers.length === 0) {
      throw new Error('No active AI providers available')
    }

    // Try preferred provider first, then fallback to others
    const providerOrder = preferredProvider
      ? [preferredProvider, ...providers.filter(p => p !== preferredProvider)]
      : providers

    let lastError: Error | null = null

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName)
      if (!provider) continue

      try {
        logger.info(`Attempting generation with provider: ${providerName}`)
        const response = await provider.generate(request)

        // Log usage
        await this.logUsage(providerName, response.usage)

        return response
      } catch (error) {
        logger.error(`Provider ${providerName} failed:`, error)
        lastError = error as Error
        continue
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`)
  }

  /**
   * Get all active provider names
   */
  getActiveProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Test a provider
   */
  async testProvider(name: string): Promise<boolean> {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Provider ${name} not found`)
    }

    try {
      return await provider.test()
    } catch (error) {
      logger.error(`Provider test failed for ${name}:`, error)
      return false
    }
  }

  /**
   * Add a new provider
   */
  async addProvider(config: Omit<AIProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = uuidv4()

    try {
      // Encrypt API key
      const encryptedApiKey = this.encryptApiKey(config.apiKey)

      // Insert into database
      await pool.query(`
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        config.name,
        config.type,
        encryptedApiKey,
        JSON.stringify(config.configuration),
        config.isActive,
        config.priority
      ])

      // Create provider instance
      const fullConfig: AIProviderConfig = {
        ...config,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const provider = this.createProvider(fullConfig)
      this.providers.set(config.name, provider)

      logger.info(`Added new AI provider: ${config.name} (${config.type})`)
      return id
    } catch (error) {
      logger.error(`Failed to add provider ${config.name}:`, error)
      throw error
    }
  }

  /**
   * Update a provider
   */
  async updateProvider(name: string, updates: Partial<AIProviderConfig>): Promise<void> {
    try {
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1

      if (updates.apiKey) {
        updateFields.push(`api_key_encrypted = $${paramIndex}`)
        updateValues.push(this.encryptApiKey(updates.apiKey))
        paramIndex++
      }

      if (updates.configuration) {
        updateFields.push(`configuration = $${paramIndex}`)
        updateValues.push(JSON.stringify(updates.configuration))
        paramIndex++
      }

      if (typeof updates.isActive === 'boolean') {
        updateFields.push(`is_active = $${paramIndex}`)
        updateValues.push(updates.isActive)
        paramIndex++
      }

      if (typeof updates.priority === 'number') {
        updateFields.push(`priority = $${paramIndex}`)
        updateValues.push(updates.priority)
        paramIndex++
      }

      if (updateFields.length === 0) {
        return // No updates to make
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      updateValues.push(name)

      await pool.query(`
        UPDATE ai_providers 
        SET ${updateFields.join(', ')}
        WHERE name = $${paramIndex}
      `, updateValues)

      // Reload the provider
      await this.loadProvidersFromDatabase()

      logger.info(`Updated AI provider: ${name}`)
    } catch (error) {
      logger.error(`Failed to update provider ${name}:`, error)
      throw error
    }
  }

  /**
   * Remove a provider
   */
  async removeProvider(name: string): Promise<void> {
    try {
      await pool.query('DELETE FROM ai_providers WHERE name = $1', [name])
      this.providers.delete(name)

      logger.info(`Removed AI provider: ${name}`)
    } catch (error) {
      logger.error(`Failed to remove provider ${name}:`, error)
      throw error
    }
  }

  /**
   * Log usage statistics
   */
  private async logUsage(providerName: string, usage?: AIResponse['usage']): Promise<void> {
    if (!usage) return

    try {
      await pool.query(`
        UPDATE ai_providers 
        SET usage_stats = COALESCE(usage_stats, '{}'::jsonb) || $1::jsonb
        WHERE name = $2
      `, [
        JSON.stringify({
          last_used: new Date().toISOString(),
          total_requests: (usage.promptTokens + usage.completionTokens) || 0,
          total_tokens: usage.totalTokens || 0
        }),
        providerName
      ])
    } catch (error) {
      logger.error(`Failed to log usage for ${providerName}:`, error)
    }
  }

  /**
   * Encrypt API key (simple base64 for now)
   */
  private encryptApiKey(apiKey: string): string {
    return Buffer.from(apiKey).toString('base64')
  }

  /**
   * Decrypt API key
   */
  private decryptApiKey(encryptedApiKey: string): string {
    return Buffer.from(encryptedApiKey, 'base64').toString('utf-8')
  }

  /**
   * TEST UTILITY: Set a provider instance directly (bypass DB)
   */
  setProvider(name: string, provider: AIProvider): void {
    this.providers.set(name, provider)
    this.initialized = true // Mark as initialized if we're injecting mocks
  }

  /**
   * TEST UTILITY: Clear all providers
   */
  clearProviders(): void {
    this.providers.clear()
    this.initialized = false
  }
}

// Provider Implementations

class OpenAIProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    // Implementation would use OpenAI SDK
    // For now, return a mock response
    return {
      content: `Mock OpenAI response for: ${request.prompt}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: this.config.model || 'gpt-3.5-turbo',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    // Test OpenAI connection
    return true
  }

  async getModels(): Promise<string[]> {
    return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
  }
}

class GoogleAIProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    // Implementation would use Google AI SDK
    return {
      content: `Mock Google AI response for: ${request.prompt}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: this.config.model || 'gemini-pro',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true
  }

  async getModels(): Promise<string[]> {
    return ['gemini-pro', 'gemini-pro-vision']
  }
}

class AzureAIProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    return {
      content: `Mock Azure AI response for: ${request.prompt}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: this.config.model || 'gpt-35-turbo',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true
  }

  async getModels(): Promise<string[]> {
    return ['gpt-35-turbo', 'gpt-4']
  }
}

class AnthropicProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    return {
      content: `Mock Anthropic response for: ${request.prompt}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: this.config.model || 'claude-3-sonnet',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true
  }

  async getModels(): Promise<string[]> {
    return ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus']
  }
}

class CohereProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    return {
      content: `Mock Cohere response for: ${request.prompt}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: this.config.model || 'command',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true
  }

  async getModels(): Promise<string[]> {
    return ['command', 'command-light']
  }
}

class HuggingFaceProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    return {
      content: `Mock HuggingFace response for: ${request.prompt}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: this.config.model || 'microsoft/DialoGPT-medium',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true
  }

  async getModels(): Promise<string[]> {
    return ['microsoft/DialoGPT-medium', 'facebook/blenderbot-400M-distill']
  }
}

class OllamaProvider implements AIProvider {
  name: string
  type: AIProviderType

  constructor(private config: AIProviderConfig) {
    this.name = config.name
    this.type = config.type
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const endpoint = this.config.endpoint || this.config.configuration?.endpoint || 'http://localhost:11434';
    const model = request.model || this.config.model || 'llama3';

    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: request.prompt,
          system: request.systemPrompt,
          stream: false,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.maxTokens || 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        content: data.response || '',
        model,
        provider: this.name,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (error) {
      logger.error(`Ollama generation failed:`, error);
      throw error;
    }
  }

  async test(): Promise<boolean> {
    const endpoint = this.config.endpoint || this.config.configuration?.endpoint || 'http://localhost:11434';
    try {
      const response = await fetch(`${endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    const endpoint = this.config.endpoint || this.config.configuration?.endpoint || 'http://localhost:11434';
    try {
      const response = await fetch(`${endpoint}/api/tags`);
      if (response.ok) {
        const data = await response.json() as any;
        return data.models?.map((m: any) => m.name) || ['llama3', 'mistral'];
      }
    } catch (e) {
      logger.error('Failed to fetch Ollama models:', e);
    }
    return ['llama3', 'mistral'];
  }
}

class DeepSeekProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { return { content: 'Mock DeepSeek response', model: 'deepseek-chat', provider: this.name }; }
  async test(): Promise<boolean> { return true; }
  async getModels(): Promise<string[]> { return ['deepseek-chat', 'deepseek-coder']; }
}

class MoonshotProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { return { content: 'Mock Moonshot response', model: 'kimi-k2-turbo-preview', provider: this.name }; }
  async test(): Promise<boolean> { return true; }
  async getModels(): Promise<string[]> { return ['kimi-k2-turbo-preview', 'moonshot-v1-8k']; }
}

class XAIProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { return { content: 'Mock xAI response', model: 'grok-beta', provider: this.name }; }
  async test(): Promise<boolean> { return true; }
  async getModels(): Promise<string[]> { return ['grok-beta']; }
}

class GroqProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { return { content: 'Mock Groq response', model: 'llama-3.3-70b-versatile', provider: this.name }; }
  async test(): Promise<boolean> { return true; }
  async getModels(): Promise<string[]> { return ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768']; }
}

// Export singleton instance
export const aiProviderService = new AIProviderService()
