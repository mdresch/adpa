/**
 * OpenAI Embeddings Service
 * Handles OpenAI API integration for semantic search and embeddings
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'

export interface OpenAIEmbeddingsConfig {
  apiKey: string
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
  model: string
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
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface EmbeddingCacheEntry {
  id: string
  content_hash: string
  content: string
  embeddings: number[]
  model: string
  created_at: Date
  expires_at: Date
  access_count: number
  last_accessed: Date
}

export class OpenAIEmbeddingsService {
  private config: OpenAIEmbeddingsConfig
  private rateLimitQueue: Array<{ resolve: Function; reject: Function; request: EmbeddingRequest }> = []
  private isProcessingQueue = false
  private lastRequestTime = 0
  private requestCount = 0
  private rateLimitResetTime = 0

  constructor(config: OpenAIEmbeddingsConfig) {
    this.config = config
    this.rateLimitResetTime = Date.now() + 60000 // Reset every minute
  }

  async generateEmbeddings(content: string): Promise<number[]> {
    try {
      logger.debug('Generating embeddings', { contentLength: content.length })

      // Check cache first
      const cachedEmbeddings = await this.getCachedEmbeddings(content)
      if (cachedEmbeddings) {
        logger.debug('Using cached embeddings', { contentLength: content.length })
        return cachedEmbeddings
      }

      // Generate new embeddings
      const embeddings = await this.callOpenAIAPI(content)

      // Cache the embeddings
      await this.cacheEmbeddings(content, embeddings)

      logger.info('Embeddings generated successfully', {
        contentLength: content.length,
        embeddingDimensions: embeddings.length
      })

      return embeddings

    } catch (error) {
      logger.error('Failed to generate embeddings', {
        contentLength: content.length,
        error: error.message
      })
      throw error
    }
  }

  async generateBatchEmbeddings(contents: string[]): Promise<number[][]> {
    try {
      logger.debug('Generating batch embeddings', { batchSize: contents.length })

      // Check cache for each content
      const results: number[][] = []
      const uncachedContents: string[] = []
      const uncachedIndices: number[] = []

      for (let i = 0; i < contents.length; i++) {
        const cachedEmbeddings = await this.getCachedEmbeddings(contents[i])
        if (cachedEmbeddings) {
          results[i] = cachedEmbeddings
        } else {
          uncachedContents.push(contents[i])
          uncachedIndices.push(i)
        }
      }

      // Generate embeddings for uncached contents
      if (uncachedContents.length > 0) {
        const batchEmbeddings = await this.callOpenAIBatchAPI(uncachedContents)
        
        // Cache and assign results
        for (let i = 0; i < uncachedContents.length; i++) {
          const content = uncachedContents[i]
          const embeddings = batchEmbeddings[i]
          const originalIndex = uncachedIndices[i]
          
          await this.cacheEmbeddings(content, embeddings)
          results[originalIndex] = embeddings
        }
      }

      logger.info('Batch embeddings generated successfully', {
        totalContents: contents.length,
        cachedCount: contents.length - uncachedContents.length,
        generatedCount: uncachedContents.length
      })

      return results

    } catch (error) {
      logger.error('Failed to generate batch embeddings', {
        batchSize: contents.length,
        error: error.message
      })
      throw error
    }
  }

  async calculateSimilarity(embeddings1: number[], embeddings2: number[]): Promise<number> {
    try {
      if (embeddings1.length !== embeddings2.length) {
        throw new Error('Embedding dimensions must match')
      }

      // Calculate cosine similarity
      let dotProduct = 0
      let magnitude1 = 0
      let magnitude2 = 0

      for (let i = 0; i < embeddings1.length; i++) {
        dotProduct += embeddings1[i] * embeddings2[i]
        magnitude1 += embeddings1[i] * embeddings1[i]
        magnitude2 += embeddings2[i] * embeddings2[i]
      }

      magnitude1 = Math.sqrt(magnitude1)
      magnitude2 = Math.sqrt(magnitude2)

      if (magnitude1 === 0 || magnitude2 === 0) {
        return 0
      }

      const similarity = dotProduct / (magnitude1 * magnitude2)
      
      logger.debug('Similarity calculated', { similarity })
      
      return similarity

    } catch (error) {
      logger.error('Failed to calculate similarity', {
        error: error.message
      })
      return 0
    }
  }

  async findSimilarEmbeddings(queryEmbeddings: number[], limit: number = 10, threshold: number = 0.7): Promise<Array<{ id: string; similarity: number; content: string }>> {
    try {
      logger.debug('Finding similar embeddings', { limit, threshold })

      // Query the database for similar embeddings using vector similarity
      const result = await pool.query(
        `
        SELECT 
          si.id,
          si.content,
          si.embeddings,
          (si.embeddings <=> $1::vector) as similarity_distance
        FROM search_index si
        WHERE si.embeddings IS NOT NULL
        ORDER BY similarity_distance ASC
        LIMIT $2
        `,
        [JSON.stringify(queryEmbeddings), limit * 2] // Get more results to filter by threshold
      )

      const similarResults = result.rows
        .map(row => ({
          id: row.id,
          content: row.content,
          similarity: 1 - row.similarity_distance // Convert distance to similarity
        }))
        .filter(result => result.similarity >= threshold)
        .slice(0, limit)

      logger.info('Similar embeddings found', {
        totalResults: result.rows.length,
        filteredResults: similarResults.length,
        threshold
      })

      return similarResults

    } catch (error) {
      logger.error('Failed to find similar embeddings', {
        error: error.message
      })
      return []
    }
  }

  async getCachedEmbeddings(content: string): Promise<number[] | null> {
    try {
      const contentHash = this.hashContent(content)
      
      const result = await pool.query(
        `
        SELECT embeddings, access_count
        FROM embedding_cache
        WHERE content_hash = $1 AND expires_at > NOW()
        `,
        [contentHash]
      )

      if (result.rows.length > 0) {
        // Update access count and last accessed time
        await pool.query(
          `
          UPDATE embedding_cache
          SET access_count = access_count + 1, last_accessed = NOW()
          WHERE content_hash = $1
          `,
          [contentHash]
        )

        return result.rows[0].embeddings
      }

      return null

    } catch (error) {
      logger.error('Failed to get cached embeddings', {
        contentHash: this.hashContent(content),
        error: error.message
      })
      return null
    }
  }

  async cacheEmbeddings(content: string, embeddings: number[]): Promise<void> {
    try {
      const contentHash = this.hashContent(content)
      const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours

      await pool.query(
        `
        INSERT INTO embedding_cache (
          content_hash, content, embeddings, model, expires_at, access_count, last_accessed
        ) VALUES ($1, $2, $3, $4, $5, 1, NOW())
        ON CONFLICT (content_hash) DO UPDATE SET
          embeddings = EXCLUDED.embeddings,
          expires_at = EXCLUDED.expires_at,
          access_count = embedding_cache.access_count + 1,
          last_accessed = NOW()
        `,
        [
          contentHash,
          content.substring(0, 1000), // Limit content length for caching
          JSON.stringify(embeddings),
          this.config.model,
          expiresAt
        ]
      )

      logger.debug('Embeddings cached successfully', {
        contentHash,
        embeddingDimensions: embeddings.length
      })

    } catch (error) {
      logger.error('Failed to cache embeddings', {
        contentHash: this.hashContent(content),
        error: error.message
      })
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM embedding_cache WHERE expires_at < NOW()'
      )

      logger.info('Expired cache entries cleared', {
        deletedCount: result.rowCount
      })

    } catch (error) {
      logger.error('Failed to clear expired cache', {
        error: error.message
      })
    }
  }

  async getCacheStats(): Promise<{
    totalEntries: number
    hitRate: number
    memoryUsage: number
    averageAccessCount: number
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_entries,
          AVG(access_count) as avg_access_count,
          SUM(LENGTH(content) + LENGTH(embeddings::text)) as memory_usage
        FROM embedding_cache
        WHERE expires_at > NOW()
      `)

      const stats = result.rows[0]

      return {
        totalEntries: parseInt(stats.total_entries) || 0,
        hitRate: 0, // Would need to track hits/misses separately
        memoryUsage: parseInt(stats.memory_usage) || 0,
        averageAccessCount: parseFloat(stats.avg_access_count) || 0
      }

    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error.message
      })
      
      return {
        totalEntries: 0,
        hitRate: 0,
        memoryUsage: 0,
        averageAccessCount: 0
      }
    }
  }

  private async callOpenAIAPI(content: string): Promise<number[]> {
    const request: EmbeddingRequest = {
      input: content,
      model: this.config.model,
      encoding_format: 'float'
    }

    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push({ resolve, reject, request })
      this.processQueue()
    })
  }

  private async callOpenAIBatchAPI(contents: string[]): Promise<number[][]> {
    const request: EmbeddingRequest = {
      input: contents,
      model: this.config.model,
      encoding_format: 'float'
    }

    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push({ 
        resolve: (response: EmbeddingResponse) => {
          const embeddings = response.data.map(item => item.embedding)
          resolve(embeddings)
        }, 
        reject, 
        request 
      })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.rateLimitQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      while (this.rateLimitQueue.length > 0) {
        // Check rate limit
        await this.checkRateLimit()

        const { resolve, reject, request } = this.rateLimitQueue.shift()!

        try {
          const response = await this.makeOpenAIRequest(request)
          resolve(response)
        } catch (error) {
          reject(error)
        }

        this.requestCount++
        this.lastRequestTime = Date.now()
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()

    // Reset rate limit counter every minute
    if (now > this.rateLimitResetTime) {
      this.requestCount = 0
      this.rateLimitResetTime = now + 60000
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const waitTime = this.rateLimitResetTime - now
      logger.debug('Rate limit exceeded, waiting', { waitTime })
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.rateLimitResetTime = Date.now() + 60000
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime
    const minDelay = 60000 / this.config.rateLimitPerMinute // Distribute requests evenly

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  private async makeOpenAIRequest(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
      }

      const data: EmbeddingResponse = await response.json()

      logger.debug('OpenAI API request successful', {
        model: data.model,
        usage: data.usage,
        dataLength: data.data.length
      })

      return data

    } catch (error) {
      logger.error('OpenAI API request failed', {
        model: request.model,
        inputLength: Array.isArray(request.input) ? request.input.length : request.input.length,
        error: error.message
      })
      throw error
    }
  }

  private hashContent(content: string): string {
    // Simple hash for content identification
    return Buffer.from(content).toString('base64').substring(0, 32)
  }

  // Fallback embedding generation for development/testing
  generateFallbackEmbeddings(content: string): number[] {
    const words = content.toLowerCase().split(/\s+/)
    const embeddings = new Array(1536).fill(0) // OpenAI ada-002 dimensions
    
    words.forEach(word => {
      const hash = this.simpleHash(word)
      const index = hash % 1536
      embeddings[index] += 1
    })

    // Normalize the embeddings
    const magnitude = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0))
    return embeddings.map(val => val / magnitude)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
