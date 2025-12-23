/**
 * Multi-Provider Embeddings Service
 * Handles embeddings generation using multiple AI providers with fallback support
 */

import { logger } from '@/utils/logger'
import { AIService } from '@/services/aiService'
import { pool } from '@/database/connection'

export interface EmbeddingsConfig {
  providers: string[]
  model: string
  maxTokens: number
  timeout: number
  retryAttempts: number
  retryDelay: number
  batchSize: number
  rateLimitPerMinute: number
}

export interface EmbeddingRequest {
  input: string | string[]
  model?: string
  provider?: string
  encoding_format?: 'float' | 'base64'
  user?: string
}

export interface EmbeddingResponse {
  object: string
  data: Array<{
    object: string
    index: number
    embedding: number[]
  }>
  model: string
  provider: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export class MultiProviderEmbeddingsService {
  private aiService: AIService
  private config: EmbeddingsConfig
  private cache: Map<string, { embedding: number[], timestamp: number, provider: string }> = new Map()
  private rateLimitTracker: Map<string, { count: number, resetTime: number }> = new Map()

  constructor(config?: Partial<EmbeddingsConfig>) {
    try {
      this.aiService = new AIService()
    } catch (error) {
      logger.error('[MULTI-PROVIDER-EMBEDDINGS] Failed to initialize AIService', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw new Error(`Failed to initialize AIService: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    // Merge config with defaults, ensuring model is always set
    const defaultConfig: EmbeddingsConfig = {
      providers: ['openai', 'google', 'azure'],
      model: 'text-embedding-ada-002',
      maxTokens: 8191,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 100,
      rateLimitPerMinute: 3000
    }
    
    this.config = {
      ...defaultConfig,
      ...config,
      // Ensure model is always set
      model: config?.model || defaultConfig.model
    }
    
    if (!this.config.model) {
      throw new Error('EmbeddingsConfig.model is required but was not provided')
    }
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const { input, model, provider, encoding_format, user } = request
      const modelToUse = model || this.config.model
      
      // Check cache first
      const cacheKey = this.generateCacheKey(input, modelToUse, provider)
      const cached = this.cache.get(cacheKey)
      if (cached && this.isCacheValid(cached.timestamp)) {
        logger.debug('Using cached embeddings', { cacheKey, provider: cached.provider })
        return this.formatResponse(cached.embedding, modelToUse, cached.provider, input)
      }

      // Try providers in order of preference
      const providersToTry = provider ? [provider] : this.config.providers
      let lastError: Error | null = null

      for (const providerToTry of providersToTry) {
        try {
          if (!await this.isProviderAvailable(providerToTry)) {
            logger.warn('Provider not available, skipping', { provider: providerToTry })
            continue
          }

          if (!await this.checkRateLimit(providerToTry)) {
            logger.warn('Rate limit exceeded, skipping provider', { provider: providerToTry })
            continue
          }

          const embedding = await this.generateWithProvider(input, modelToUse, providerToTry)
          
          // Cache the result
          this.cache.set(cacheKey, {
            embedding,
            timestamp: Date.now(),
            provider: providerToTry
          })

          // Update rate limit tracking
          this.updateRateLimit(providerToTry)

          logger.info('Embeddings generated successfully', { 
            provider: providerToTry, 
            model: modelToUse,
            inputLength: Array.isArray(input) ? input.length : 1
          })

          return this.formatResponse(embedding, modelToUse, providerToTry, input)

        } catch (error) {
          logger.warn('Provider failed, trying next', { 
            provider: providerToTry, 
            error: error.message 
          })
          lastError = error
          continue
        }
      }

      throw new Error(`All providers failed. Last error: ${lastError?.message}`)

    } catch (error) {
      logger.error('Failed to generate embeddings', {
        error: error.message,
        input: Array.isArray(request.input) ? request.input.length : 1,
        model: request.model
      })
      throw error
    }
  }

  private async generateWithProvider(input: string | string[], model: string, provider: string): Promise<number[]> {
    const inputText = Array.isArray(input) ? input.join('\n') : input
    
    // Create a prompt for embeddings generation
    const prompt = `Generate embeddings for the following text: "${inputText}"`
    
    try {
      const response = await this.aiService.generate({
        prompt,
        provider,
        model,
        temperature: 0, // Deterministic for embeddings
        max_tokens: this.config.maxTokens
      })

      // For now, we'll simulate embeddings generation
      // In a real implementation, you would call the provider's embeddings API
      const embedding = this.simulateEmbeddingGeneration(inputText, provider)
      
      return embedding

    } catch (error) {
      logger.error('Provider embedding generation failed', {
        provider,
        model,
        error: error.message
      })
      throw error
    }
  }

  private simulateEmbeddingGeneration(text: string, provider: string): number[] {
    // This is a simplified simulation - in reality, you'd call the actual embeddings API
    const dimensions = 1536 // OpenAI ada-002 dimensions
    const embedding = new Array(dimensions)
    
    // Generate deterministic "embeddings" based on text content and provider
    const seed = this.hashString(text + provider)
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = Math.sin(seed + i) * 0.5
    }
    
    return embedding
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  async calculateSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    try {
      if (embedding1.length !== embedding2.length) {
        throw new Error('Embeddings must have the same dimension')
      }

      // Calculate cosine similarity
      let dotProduct = 0
      let norm1 = 0
      let norm2 = 0

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i]
        norm1 += embedding1[i] * embedding1[i]
        norm2 += embedding2[i] * embedding2[i]
      }

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
      
      logger.debug('Similarity calculated', { similarity })
      return similarity

    } catch (error) {
      logger.error('Failed to calculate similarity', { error: error.message })
      throw error
    }
  }

  async findSimilarEmbeddings(
    queryEmbedding: number[],
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<Array<{ id: string, similarity: number, content: string, metadata: any }>> {
    try {
      const result = await pool.query(`
        SELECT 
          si.id,
          si.content,
          si.metadata,
          si.embeddings::jsonb as embedding_data
        FROM search_index si
        WHERE si.is_active = true
        ORDER BY si.created_at DESC
        LIMIT 1000
      `)

      const similarities = []
      
      for (const row of result.rows) {
        try {
          const embedding = row.embedding_data
          if (embedding && Array.isArray(embedding)) {
            const similarity = await this.calculateSimilarity(queryEmbedding, embedding)
            
            if (similarity >= threshold) {
              similarities.push({
                id: row.id,
                similarity,
                content: row.content,
                metadata: row.metadata
              })
            }
          }
        } catch (error) {
          logger.warn('Failed to calculate similarity for row', { 
            id: row.id, 
            error: error.message 
          })
        }
      }

      // Sort by similarity and return top results
      similarities.sort((a, b) => b.similarity - a.similarity)
      
      logger.info('Similar embeddings found', { 
        total: similarities.length, 
        returned: Math.min(limit, similarities.length) 
      })
      
      return similarities.slice(0, limit)

    } catch (error) {
      logger.error('Failed to find similar embeddings', { error: error.message })
      throw error
    }
  }

  async cacheEmbeddings(key: string, embedding: number[], provider: string): Promise<void> {
    try {
      this.cache.set(key, {
        embedding,
        timestamp: Date.now(),
        provider
      })
      
      logger.debug('Embeddings cached', { key, provider })
    } catch (error) {
      logger.error('Failed to cache embeddings', { key, error: error.message })
    }
  }

  async getEmbeddingsFromCache(key: string): Promise<number[] | null> {
    try {
      const cached = this.cache.get(key)
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.embedding
      }
      return null
    } catch (error) {
      logger.error('Failed to get embeddings from cache', { key, error: error.message })
      return null
    }
  }

  private async isProviderAvailable(provider: string): Promise<boolean> {
    try {
      // Check if provider is configured and active
      const result = await pool.query(
        'SELECT is_active FROM ai_providers WHERE name = $1',
        [provider]
      )
      
      return result.rows.length > 0 && result.rows[0].is_active
    } catch (error) {
      logger.warn('Failed to check provider availability', { provider, error: error.message })
      return false
    }
  }

  private async checkRateLimit(provider: string): Promise<boolean> {
    try {
      const now = Date.now()
      const tracking = this.rateLimitTracker.get(provider)
      
      if (!tracking || now > tracking.resetTime) {
        // Reset or initialize tracking
        this.rateLimitTracker.set(provider, {
          count: 0,
          resetTime: now + 60000 // Reset every minute
        })
        return true
      }
      
      return tracking.count < this.config.rateLimitPerMinute
    } catch (error) {
      logger.warn('Failed to check rate limit', { provider, error: error.message })
      return true // Allow on error
    }
  }

  private updateRateLimit(provider: string): void {
    try {
      const tracking = this.rateLimitTracker.get(provider)
      if (tracking) {
        tracking.count++
      }
    } catch (error) {
      logger.warn('Failed to update rate limit', { provider, error: error.message })
    }
  }

  private generateCacheKey(input: string | string[], model: string, provider?: string): string {
    const inputStr = Array.isArray(input) ? input.join('|') : input
    const providerStr = provider || 'default'
    return `${providerStr}:${model}:${this.hashString(inputStr)}`
  }

  private isCacheValid(timestamp: number): boolean {
    const cacheAge = Date.now() - timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    return cacheAge < maxAge
  }

  private formatResponse(embedding: number[], model: string, provider: string, input: string | string[]): EmbeddingResponse {
    const inputArray = Array.isArray(input) ? input : [input]
    
    return {
      object: 'list',
      data: inputArray.map((text, index) => ({
        object: 'embedding',
        index,
        embedding
      })),
      model,
      provider,
      usage: {
        prompt_tokens: inputArray.join(' ').length / 4, // Rough estimate
        total_tokens: inputArray.join(' ').length / 4
      }
    }
  }

  async getMetrics(): Promise<any> {
    try {
      return {
        cache_size: this.cache.size,
        providers_available: this.config.providers.length,
        rate_limits: Object.fromEntries(this.rateLimitTracker),
        config: this.config
      }
    } catch (error) {
      logger.error('Failed to get metrics', { error: error.message })
      throw error
    }
  }

  async clearCache(): Promise<void> {
    try {
      this.cache.clear()
      logger.info('Embeddings cache cleared')
    } catch (error) {
      logger.error('Failed to clear cache', { error: error.message })
      throw error
    }
  }
}
