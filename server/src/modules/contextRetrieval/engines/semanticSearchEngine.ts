/**
 * Semantic Search Engine
 * Handles semantic search using embeddings and vector similarity
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import { MultiProviderEmbeddingsService } from '../services/multiProviderEmbeddingsService'
import type {
  SemanticSearchEngine as ISemanticSearchEngine,
  ContextRetrievalResult,
  ContextType,
  ContextFilters,
  SemanticSearchConfig
} from '../types'

export class SemanticSearchEngine implements ISemanticSearchEngine {
  private config: SemanticSearchConfig
  private embeddingsService: MultiProviderEmbeddingsService

  constructor(config: SemanticSearchConfig) {
    if (!config) {
      throw new Error('SemanticSearchConfig is required')
    }
    if (!config.model) {
      throw new Error('SemanticSearchConfig.model is required')
    }
    
    this.config = config
    this.embeddingsService = new MultiProviderEmbeddingsService({
      providers: ['openai', 'google', 'azure'],
      model: config.model,
      maxTokens: config.maxTokens,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: config.topK || 50,
      rateLimitPerMinute: 3000
    })
  }

  async search(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Performing semantic search', { query, contextTypes, filters })

      // Generate embeddings for the query
      const queryEmbeddings = await this.generateEmbeddings(query)

      // Search for similar content in the database
      const results = await this.findSimilarContent(queryEmbeddings, contextTypes, filters)

      logger.info('Semantic search completed', {
        query,
        contextTypes,
        resultsCount: results.length,
        processingTime: Date.now()
      })

      return results

    } catch (error) {
      logger.error('Semantic search failed', {
        query,
        contextTypes,
        error: error.message
      })
      throw error
    }
  }

  async generateEmbeddings(content: string): Promise<number[]> {
    try {
      const response = await this.embeddingsService.generateEmbeddings({ input: content })
      return response.data[0].embedding

    } catch (error) {
      logger.error('Failed to generate embeddings', {
        content: content.substring(0, 100),
        error: error.message
      })
      throw error
    }
  }

  async calculateSimilarity(embeddings1: number[], embeddings2: number[]): Promise<number> {
    try {
      return await this.embeddingsService.calculateSimilarity(embeddings1, embeddings2)

    } catch (error) {
      logger.error('Failed to calculate similarity', {
        error: error.message
      })
      return 0
    }
  }

  async findSimilarContentByText(query: string, limit: number = 10): Promise<ContextRetrievalResult[]> {
    try {
      const queryEmbeddings = await this.generateEmbeddings(query)
      const similarResults = await this.embeddingsService.findSimilarEmbeddings(queryEmbeddings, limit, 0.7)
      
      // Convert to ContextRetrievalResult format
      const results: ContextRetrievalResult[] = similarResults.map(result => ({
        id: result.id,
        type: 'document_history' as ContextType,
        content: result.content,
        title: result.content.substring(0, 100),
        relevanceScore: result.similarity,
        source: 'semantic_search',
        sourceId: result.id,
        metadata: {},
        keywords: [],
        timestamp: new Date(),
        freshness: 1,
        authority: 0.8,
        popularity: 0.5
      }))
      
      return results

    } catch (error) {
      logger.error('Failed to find similar content', {
        query,
        error: error.message
      })
      return []
    }
  }

  public async findSimilarContent(queryEmbeddings: number[], contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      // Use the new JSONB vector similarity function
      const result = await pool.query(
        `
        SELECT * FROM find_similar_vectors_jsonb($1::jsonb, $2, $3)
        `,
        [JSON.stringify(queryEmbeddings), 0.7, this.config.topK || 50]
      )

      // Convert to ContextRetrievalResult objects
      const results: ContextRetrievalResult[] = result.rows.map(row => ({
        id: row.id,
        type: 'document_history' as ContextType,
        content: row.content,
        title: row.metadata?.title || row.content.substring(0, 100),
        relevanceScore: row.similarity,
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata || {},
        keywords: [],
        summary: row.metadata?.summary,
        timestamp: new Date(),
        freshness: 1,
        authority: 0.8,
        popularity: 0.5
      }))

      // Update access count
      await this.updateAccessCount(results.map(r => r.id))

      return results

    } catch (error) {
      logger.error('Failed to find similar content by embeddings', {
        error: error.message
      })
      return []
    }
  }

  private async findSimilarContentByEmbeddings(queryEmbeddings: number[], contextTypes: ContextType[], limit: number): Promise<ContextRetrievalResult[]> {
    return this.findSimilarContent(queryEmbeddings, contextTypes, undefined)
  }


  private async updateAccessCount(resultIds: string[]): Promise<void> {
    try {
      await pool.query(
        'UPDATE search_index SET access_count = access_count + 1, last_accessed = NOW() WHERE id = ANY($1)',
        [resultIds]
      )

    } catch (error) {
      logger.error('Failed to update access count', {
        error: error.message
      })
    }
  }

  private hashContent(content: string): string {
    // Simple hash for content identification
    return Buffer.from(content).toString('base64').substring(0, 32)
  }
}
