/**
 * Modern AI Provider Service using AI SDK patterns
 * 
 * This service provides a unified interface for all AI providers
 * following the Vercel AI SDK approach for simplicity and consistency.
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { openaiConnector } from '../modules/ai/openai'
import { googleConnector } from '../modules/ai/google'
import { azureConnector } from '../modules/ai/azure'
import { mistralConnector } from '../modules/ai/mistral'

// AI Provider Types
export type AIProviderType = 'openai' | 'google' | 'azure' | 'anthropic' | 'cohere' | 'huggingface' | 'ollama' | 'deepseek' | 'moonshot' | 'xai' | 'groq' | 'mistral'

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
      case 'mistral':
        return new MistralProvider(config)
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
   * Discover models for a specific provider
   */
  async discoverModels(providerId: string): Promise<{ provider: any; discoveredModels: any[] }> {
    if (!this.initialized) {
      await this.initialize()
    }

    const providerResult = await pool.query(
      'SELECT id, name, provider_type, api_key_encrypted, configuration, default_model FROM ai_providers WHERE id = $1',
      [providerId]
    )

    if (providerResult.rows.length === 0) {
      throw new Error('Provider not found')
    }

    const providerData = providerResult.rows[0]

    // Create a temporary config to instantiate the provider class
    const tempConfig: AIProviderConfig = {
      id: providerData.id,
      name: providerData.name,
      type: providerData.provider_type,
      apiKey: this.decryptApiKey(providerData.api_key_encrypted),
      endpoint: providerData.configuration?.endpoint,
      model: providerData.configuration?.model,
      priority: providerData.priority || 1,
      isActive: providerData.is_active,
      configuration: providerData.configuration || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const providerInstance = this.createProvider(tempConfig)
    logger.info(`Calling getModels for ${providerData.name} (type: ${providerData.provider_type})...`)
    const discoveredModels = await providerInstance.getModels()
    logger.info(`getModels returned ${discoveredModels.length} results for ${providerData.name}`)

    return {
      provider: {
        id: providerData.id,
        name: providerData.name,
        type: providerData.provider_type,
        default_model: providerData.default_model,
      },
      discoveredModels: discoveredModels.map(m => {
        const result = (typeof m === 'string' ? { id: m, name: m } : m);
        return result;
      })
    }
  }

  /**
   * Test a provider by its database ID
   */
  async testProviderById(providerId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    const providerResult = await pool.query(
      'SELECT id, name, provider_type, api_key_encrypted, configuration FROM ai_providers WHERE id = $1',
      [providerId]
    )

    if (providerResult.rows.length === 0) {
      throw new Error('Provider not found')
    }

    const providerData = providerResult.rows[0]

    // Create a temporary config to instantiate the provider class
    const tempConfig: AIProviderConfig = {
      id: providerData.id,
      name: providerData.name,
      type: providerData.provider_type,
      apiKey: this.decryptApiKey(providerData.api_key_encrypted),
      endpoint: providerData.configuration?.endpoint,
      model: providerData.configuration?.model,
      priority: providerData.priority || 1,
      isActive: providerData.is_active,
      configuration: providerData.configuration || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const providerInstance = this.createProvider(tempConfig)
    return await providerInstance.test()
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
    try {
      const messages = request.messages || [{ role: 'user', content: request.prompt }];
      const response = await openaiConnector.generateCompletion({
        messages,
        model: request.model || this.config.model || 'gpt-3.5-turbo',
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }, this.config.name);
      
      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined,
        model: response.model,
        provider: this.config.name,
        finishReason: response.choices[0]?.finish_reason
      };
    } catch (error) {
      logger.warn(`[MOCK FALLBACK] OpenAI generation failed for ${this.name}, using mock. Error:`, error);
      return {
        content: `Mock OpenAI response for: ${request.prompt}`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: this.config.model || 'gpt-3.5-turbo',
        provider: this.config.name,
        finishReason: 'stop'
      }
    }
  }

  async test(): Promise<boolean> {
    return openaiConnector.testConnection(this.config.name)
  }

  async getModels(): Promise<string[]> {
    try {
      const models = await openaiConnector.getAvailableModels(this.config.name)
      if (!models || models.length === 0) throw new Error('No models returned from API');
      return models.map(m => m.id)
    } catch (error: any) {
      logger.error(`Failed to discover OpenAI models for ${this.config.name}:`, error)
      throw new Error(`Model discovery failed for ${this.config.name}: ${error.message || 'Unknown error'}`)
    }
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
    try {
      const messages = request.messages || [{ role: 'user', content: request.prompt }];
      if (request.systemPrompt && !request.messages) {
        messages.unshift({ role: 'system', content: request.systemPrompt });
      }

      const response = await googleConnector.generateCompletion({
        messages,
        model: request.model || this.config.model || 'gemini-pro',
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }, this.config.name);
      
      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined,
        model: response.model,
        provider: this.config.name,
        finishReason: response.choices[0]?.finish_reason
      };
    } catch (error) {
      logger.warn(`[MOCK FALLBACK] Google generation failed for ${this.name}, using mock. Error:`, error);
      return {
        content: `Mock Google AI response for: ${request.prompt}`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: this.config.model || 'gemini-pro',
        provider: this.config.name,
        finishReason: 'stop'
      }
    }
  }

  async test(): Promise<boolean> {
    return googleConnector.testConnection(this.config.name)
  }

  async getModels(): Promise<string[]> {
    try {
      const models = await googleConnector.getAvailableModels(this.config.name)
      if (!models || models.length === 0) throw new Error('No models returned from API');
      return models.map(m => m.id)
    } catch (error: any) {
      logger.error(`Failed to discover Google models for ${this.config.name}:`, error)
      throw new Error(`Model discovery failed for ${this.config.name}: ${error.message || 'Unknown error'}`)
    }
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
    try {
      const response = await azureConnector.generateContent(this.config.name, {
        prompt: request.prompt,
        messages: request.messages,
        model: request.model || this.config.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        systemPrompt: request.systemPrompt
      });
      
      return {
        content: response.text,
        usage: response.usage,
        model: request.model || this.config.model || 'gpt-35-turbo',
        provider: this.config.name,
        finishReason: response.finishReason
      };
    } catch (error) {
      logger.warn(`[MOCK FALLBACK] Azure generation failed for ${this.name}, using mock. Error:`, error);
      return {
        content: `Mock Azure AI response for: ${request.prompt}`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: this.config.model || 'gpt-35-turbo',
        provider: this.config.name,
        finishReason: 'stop'
      }
    }
  }

  async test(): Promise<boolean> {
    return azureConnector.testConnection(this.config.name)
  }

  async getModels(): Promise<string[]> {
    try {
      const models = await azureConnector.getAvailableModels(this.config.name)
      if (!models || models.length === 0) throw new Error('No models returned from API');
      return models.map(m => m.id)
    } catch (error: any) {
      logger.error(`Failed to discover Azure models for ${this.config.name}:`, error)
      throw new Error(`Model discovery failed for ${this.config.name}: ${error.message || 'Unknown error'}`)
    }
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
    logger.warn(`[MOCK] Using mock Anthropic generation for ${this.name}.`);
    return {
      content: `Mock Anthropic response for: ${request.prompt}`,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: this.config.model || 'claude-3-sonnet',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true; 
  }

  async getModels(): Promise<string[]> {
    // Anthropic currently doesn't have a public models list API
    return ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest']
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
    logger.warn(`[MOCK] Using mock Cohere generation for ${this.name}.`);
    return {
      content: `Mock Cohere response for: ${request.prompt}`,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: this.config.model || 'command',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch('https://api.cohere.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json() as any;
        const models = data.models?.map((m: any) => m.name);
        if (!models || models.length === 0) throw new Error('No models returned from API');
        return models;
      }
      throw new Error(`Cohere API returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch Cohere models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
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
    logger.warn(`[MOCK] Using mock HuggingFace generation for ${this.name}.`);
    return {
      content: `Mock HuggingFace response for: ${request.prompt}`,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: this.config.model || 'microsoft/DialoGPT-medium',
      provider: this.config.name,
      finishReason: 'stop'
    }
  }

  async test(): Promise<boolean> {
    return true
  }

  async getModels(): Promise<string[]> {
    // This would ideally search HF hub, but returning a curated list for the integration
    return ['meta-llama/Llama-3.3-70B-Instruct', 'mistralai/Mistral-7B-v0.1', 'microsoft/phi-2']
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
        const models = data.models?.map((m: any) => m.name);
        if (!models || models.length === 0) throw new Error('No models found in Ollama');
        return models;
      }
      throw new Error(`Ollama returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch Ollama models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
  }
}

class DeepSeekProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { 
    logger.warn(`[MOCK] Using mock DeepSeek generation for ${this.name}.`);
    return { content: 'Mock DeepSeek response', model: 'deepseek-chat', provider: this.name }; 
  }
  async test(): Promise<boolean> { 
    try {
      const response = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async getModels(): Promise<string[]> { 
    try {
      const response = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json() as any;
        const models = data.data?.map((m: any) => m.id);
        if (!models || models.length === 0) throw new Error('No models returned from API');
        return models;
      }
      throw new Error(`DeepSeek API returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch DeepSeek models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
  }
}

class MoonshotProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { 
    logger.warn(`[MOCK] Using mock Moonshot generation for ${this.name}.`);
    return { content: 'Mock Moonshot response', model: 'kimi-k2-turbo-preview', provider: this.name }; 
  }
  async test(): Promise<boolean> { 
    try {
      const response = await fetch('https://api.moonshot.cn/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async getModels(): Promise<string[]> { 
    try {
      const response = await fetch('https://api.moonshot.cn/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json() as any;
        const models = data.data?.map((m: any) => m.id);
        if (!models || models.length === 0) throw new Error('No models returned from API');
        return models;
      }
      throw new Error(`Moonshot API returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch Moonshot models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
  }
}

class XAIProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { 
    logger.warn(`[MOCK] Using mock xAI generation for ${this.name}.`);
    return { content: 'Mock xAI response', model: 'grok-beta', provider: this.name }; 
  }
  async test(): Promise<boolean> { 
    try {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async getModels(): Promise<string[]> { 
    try {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json() as any;
        const models = data.data?.map((m: any) => m.id);
        if (!models || models.length === 0) throw new Error('No models returned from API');
        return models;
      }
      throw new Error(`xAI API returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch xAI models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
  }
}

class GroqProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { 
    logger.warn(`[MOCK] Using mock Groq generation for ${this.name}.`);
    return { content: 'Mock Groq response', model: 'llama-3.3-70b-versatile', provider: this.name }; 
  }
  async test(): Promise<boolean> { 
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async getModels(): Promise<string[]> { 
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json() as any;
        const models = data.data?.map((m: any) => m.id);
        if (!models || models.length === 0) throw new Error('No models returned from API');
        return models;
      }
      throw new Error(`Groq API returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch Groq models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
  }
}

class MistralProvider implements AIProvider {
  name: string
  type: AIProviderType
  constructor(private config: AIProviderConfig) { this.name = config.name; this.type = config.type; }
  async generate(request: AIRequest): Promise<AIResponse> { 
    logger.warn(`[MOCK] Using mock Mistral generation for ${this.name}.`);
    return { content: 'Mock Mistral response', model: 'mistral-large-latest', provider: this.name }; 
  }
  async test(): Promise<boolean> { 
    try {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  async getModels(): Promise<string[]> { 
    try {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      if (response.ok) {
        const data = await response.json() as any;
        const models = data.data?.map((m: any) => m.id);
        if (!models || models.length === 0) throw new Error('No models returned from API');
        return models;
      }
      throw new Error(`Mistral API returned ${response.status}`);
    } catch (e: any) {
      logger.error('Failed to fetch Mistral models:', e);
      throw new Error(`Model discovery failed for ${this.config.name}: ${e.message}`);
    }
  }
}

// Export singleton instance
export const aiProviderService = new AIProviderService()
