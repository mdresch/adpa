/**
 * Qdrant Search Engine
 * Handles vector search using Qdrant Cloud
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import { logger } from '../../../utils/logger'
import { MultiProviderEmbeddingsService } from '../services/multiProviderEmbeddingsService'
import type {
  ContextRetrievalResult,
  ContextType,
  ContextFilters,
  SemanticSearchConfig
} from '../types'

export interface QdrantConfig {
  url: string
  apiKey?: string
  collectionName: string
  vectorSize: number
  distance: 'Cosine' | 'Euclidean' | 'Dot'
}

export class QdrantSearchEngine {
  private client: QdrantClient
  private config: QdrantConfig
  private embeddingsService: MultiProviderEmbeddingsService
  private collectionName: string
  private semanticSearchConfig: SemanticSearchConfig

  constructor(qdrantConfig: QdrantConfig, semanticConfig: SemanticSearchConfig) {
    this.config = qdrantConfig
    this.collectionName = qdrantConfig.collectionName
    this.semanticSearchConfig = semanticConfig

    // Initialize Qdrant client
    this.client = new QdrantClient({
      url: qdrantConfig.url,
      apiKey: qdrantConfig.apiKey
    })

    // Initialize embeddings service
    this.embeddingsService = new MultiProviderEmbeddingsService({
      providers: ['openai', 'google', 'azure'],
      model: semanticConfig.model,
      maxTokens: semanticConfig.maxTokens,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: semanticConfig.topK || 50,
      rateLimitPerMinute: 3000
    })

    // Ensure collection exists
    this.ensureCollection().catch(err => {
      logger.error('Failed to ensure Qdrant collection exists', { error: err.message })
    })
  }

  /**
   * Ensure the Qdrant collection exists, create if it doesn't
   */
  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections()
      const collectionExists = collections.collections.some(
        c => c.name === this.collectionName
      )

      if (!collectionExists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.config.vectorSize,
            distance: this.config.distance
          }
        })
        logger.info('Qdrant collection created', { collectionName: this.collectionName })
      } else {
        logger.debug('Qdrant collection already exists', { collectionName: this.collectionName })
      }
    } catch (error: any) {
      logger.error('Failed to ensure Qdrant collection', {
        collectionName: this.collectionName,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Search for similar content in Qdrant
   */
  async search(
    query: string,
    contextTypes: ContextType[],
    filters?: ContextFilters,
    limit: number = 20
  ): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Performing Qdrant search', { query: query.substring(0, 50), contextTypes, limit })

      // Generate embeddings for the query
      const queryEmbeddings = await this.embeddingsService.generateEmbeddings(query)

      // Build filter conditions
      const qdrantFilter = this.buildQdrantFilter(contextTypes, filters)

      // Search in Qdrant
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbeddings,
        limit,
        filter: qdrantFilter ? { must: qdrantFilter } : undefined,
        with_payload: true,
        with_vectors: false
      })

      // Convert Qdrant results to ContextRetrievalResult format
      const results: ContextRetrievalResult[] = searchResult.map((point, index) => {
        const payload = point.payload || {}
        return {
          id: point.id?.toString() || `qdrant-${index}`,
          type: (payload.type as ContextType) || 'document_history',
          content: payload.content as string || '',
          title: (payload.title as string) || payload.content?.substring(0, 100) || '',
          relevanceScore: 1 - (point.score || 0), // Convert distance to similarity score
          source: (payload.source as string) || 'qdrant',
          sourceId: (payload.sourceId as string) || point.id?.toString() || '',
          metadata: (payload.metadata as Record<string, any>) || {},
          keywords: (payload.keywords as string[]) || [],
          summary: payload.summary as string,
          timestamp: payload.timestamp ? new Date(payload.timestamp as string) : new Date(),
          freshness: (payload.freshness as number) || 1,
          authority: (payload.authority as number) || 0.8,
          popularity: (payload.popularity as number) || 0.5
        }
      })

      logger.info('Qdrant search completed', {
        query: query.substring(0, 50),
        resultsCount: results.length
      })

      return results

    } catch (error: any) {
      logger.error('Qdrant search failed', {
        query: query.substring(0, 50),
        contextTypes,
        error: error.message
      })
      // Return empty array on error to allow other search engines to continue
      return []
    }
  }

  /**
   * Generate embeddings for content
   */
  async generateEmbeddings(content: string): Promise<number[]> {
    try {
      const response = await this.embeddingsService.generateEmbeddings({
        input: content,
        model: this.semanticSearchConfig.model
      })
      // Extract embedding array from response
      // Response format: { data: [{ embedding: number[] }] }
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        const embedding = response.data[0].embedding
        if (Array.isArray(embedding) && embedding.length > 0) {
          return embedding
        }
      }
      throw new Error('Invalid embedding response format: expected data[0].embedding array')
    } catch (error: any) {
      logger.error('Failed to generate embeddings for Qdrant', {
        content: content.substring(0, 100),
        error: error.message
      })
      throw error
    }
  }

  /**
   * Upsert a point (document) into Qdrant
   */
  async upsertPoint(
    id: string,
    content: string,
    type: ContextType,
    source: string,
    sourceId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Generate embeddings
      const embeddings = await this.generateEmbeddings(content)

      // Prepare payload
      const payload = {
        content,
        type,
        source,
        sourceId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      }

      // Upsert point
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: this.hashId(id),
            vector: embeddings,
            payload
          }
        ]
      })

      logger.debug('Point upserted to Qdrant', { id, type, source })

    } catch (error: any) {
      logger.error('Failed to upsert point to Qdrant', {
        id,
        type,
        source,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Batch upsert points
   */
  async batchUpsertPoints(
    points: Array<{
      id: string
      content: string
      type: ContextType
      source: string
      sourceId: string
      metadata?: Record<string, any>
    }>
  ): Promise<void> {
    try {
      if (points.length === 0) return

      // Generate embeddings for all points in parallel
      const embeddings: number[][] = []
      for (const point of points) {
        const embedding = await this.generateEmbeddings(point.content)
        embeddings.push(embedding)
      }

      // Prepare Qdrant points
      const qdrantPoints = points.map((point, index) => ({
        id: this.hashId(point.id),
        vector: embeddings[index],
        payload: {
          content: point.content,
          type: point.type,
          source: point.source,
          sourceId: point.sourceId,
          metadata: point.metadata || {},
          timestamp: new Date().toISOString()
        }
      }))

      // Batch upsert
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: qdrantPoints
      })

      logger.info('Batch upserted points to Qdrant', { count: points.length })

    } catch (error: any) {
      logger.error('Failed to batch upsert points to Qdrant', {
        count: points.length,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete a point from Qdrant
   */
  async deletePoint(id: string): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [this.hashId(id)]
      })

      logger.debug('Point deleted from Qdrant', { id })

    } catch (error: any) {
      logger.error('Failed to delete point from Qdrant', {
        id,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    try {
      return await this.client.getCollection(this.collectionName)
    } catch (error: any) {
      logger.error('Failed to get Qdrant collection info', {
        collectionName: this.collectionName,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Build Qdrant filter from context types and filters
   */
  private buildQdrantFilter(
    contextTypes: ContextType[],
    filters?: ContextFilters
  ): any[] | null {
    const conditions: any[] = []

    // Filter by context types
    if (contextTypes.length > 0) {
      conditions.push({
        key: 'type',
        match: {
          any: contextTypes
        }
      })
    }

    // Add additional filters if provided
    if (filters) {
      if (filters.projects && filters.projects.length > 0) {
        conditions.push({
          key: 'metadata.project_id',
          match: {
            any: filters.projects
          }
        })
      }

      if (filters.authors && filters.authors.length > 0) {
        conditions.push({
          key: 'metadata.author_id',
          match: {
            any: filters.authors
          }
        })
      }

      if (filters.frameworks && filters.frameworks.length > 0) {
        conditions.push({
          key: 'metadata.framework',
          match: {
            any: filters.frameworks
          }
        })
      }
    }

    return conditions.length > 0 ? conditions : null
  }

  /**
   * Hash string ID to numeric ID for Qdrant
   */
  private hashId(id: string): number {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
