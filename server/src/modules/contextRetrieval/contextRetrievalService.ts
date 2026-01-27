/**
 * Context Retrieval Service
 * Main service for semantic search and relevance scoring
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import { SemanticSearchEngine } from './engines/semanticSearchEngine'
import { KeywordSearchEngine } from './engines/keywordSearchEngine'
import { RelevanceScoringEngine } from './engines/relevanceScoringEngine'
import { QdrantSearchEngine, type QdrantConfig } from './engines/qdrantSearchEngine'
import type {
  ContextRetrievalService as IContextRetrievalService,
  ContextRetrievalRequest,
  ContextRetrievalResponse,
  ContextRetrievalResult,
  ContextType,
  ContextFilters,
  SearchStrategy,
  SemanticSearchConfig,
  RelevanceScoringConfig,
  ContextRetrievalMetrics
} from './types'

export class ContextRetrievalService implements IContextRetrievalService {
  private semanticSearchEngine: SemanticSearchEngine
  private keywordSearchEngine: KeywordSearchEngine
  private qdrantSearchEngine: QdrantSearchEngine | null
  private relevanceScoringEngine: RelevanceScoringEngine
  private semanticSearchConfig: SemanticSearchConfig
  private relevanceScoringConfig: RelevanceScoringConfig

  constructor(
    semanticSearchConfig: SemanticSearchConfig,
    relevanceScoringConfig: RelevanceScoringConfig,
    qdrantConfig?: QdrantConfig
  ) {
    this.semanticSearchConfig = semanticSearchConfig
    this.relevanceScoringConfig = relevanceScoringConfig
    
    this.semanticSearchEngine = new SemanticSearchEngine(semanticSearchConfig)
    this.keywordSearchEngine = new KeywordSearchEngine()
    this.relevanceScoringEngine = new RelevanceScoringEngine(relevanceScoringConfig)
    
    // Initialize Qdrant engine if config provided
    if (qdrantConfig) {
      try {
        this.qdrantSearchEngine = new QdrantSearchEngine(qdrantConfig, semanticSearchConfig)
        logger.info('Qdrant search engine initialized', { collectionName: qdrantConfig.collectionName })
      } catch (error: any) {
        logger.warn('Failed to initialize Qdrant search engine, continuing without it', {
          error: error.message
        })
        this.qdrantSearchEngine = null
      }
    } else {
      this.qdrantSearchEngine = null
    }
  }

  private getEmptyContextTypeDistribution(): Record<ContextType, number> {
    return {
      project_data: 0,
      user_preferences: 0,
      document_history: 0,
      external_api: 0,
      database_query: 0,
      file_content: 0,
      stakeholder_info: 0,
      requirements: 0,
      constraints: 0,
      risks: 0,
      best_practices: 0,
      patterns: 0,
      quality_metrics: 0,
      expertise: 0,
      collaboration_preferences: 0
    }
  }

  private getEmptySearchStrategyDistribution(): Record<SearchStrategy, number> {
    return {
      semantic: 0,
      keyword: 0,
      hybrid: 0,
      vector_similarity: 0,
      full_text: 0,
      fuzzy: 0,
      exact_match: 0
    }
  }

  /**
   * Search precomputed document chunks (RAG) using hybrid strategy
   */
  async searchChunks(params: {
    projectId: string
    query: string
    topK?: number
    templateId?: string
  }): Promise<Array<{ id: string; document_id: string; title: string | null; content: string; score: number }>> {
    const { projectId, query, topK = 20, templateId } = params
    try {
      // Keyword pre-filter using full text search
      const keywordRes = await pool.query(
        `
        SELECT id, document_id, title, content,
               ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')), plainto_tsquery('english', $1)) AS kw_rank
        FROM document_chunks
        WHERE project_id = $2
          AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')) @@ plainto_tsquery('english', $1)
          ${templateId ? 'AND template_id = $3' : ''}
        ORDER BY kw_rank DESC
        LIMIT $${templateId ? 4 : 3}
        `,
        templateId ? [query, projectId, templateId, Math.max(topK * 3, 50)] : [query, projectId, Math.max(topK * 3, 50)]
      )

      const preCandidates = keywordRes.rows as Array<{ id: string; document_id: string; title: string | null; content: string; kw_rank: number }>

      // If no candidates, return empty
      if (preCandidates.length === 0) return []

      // Semantic rerank: compute similarity between query and candidate content
      const semanticScored: Array<{ id: string; document_id: string; title: string | null; content: string; score: number }> = []
      for (const c of preCandidates) {
        const similarity = await this.relevanceScoringEngine.calculateSemanticRelevance(query, c.content)
        // Simple hybrid score: 0.6 semantic + 0.4 normalized kw
        const kw = Number(c.kw_rank) || 0
        const kwNorm = isFinite(kw) ? Math.min(1, kw / (preCandidates[0]?.kw_rank || 1)) : 0
        const score = 0.6 * similarity + 0.4 * kwNorm
        semanticScored.push({ id: c.id, document_id: c.document_id, title: c.title, content: c.content, score })
      }

      // Sort and topK
      return semanticScored.sort((a, b) => b.score - a.score).slice(0, topK)
    } catch (error: any) {
      logger.error('searchChunks failed', { error: error.message })
      return []
    }
  }

  async retrieveContext(request: ContextRetrievalRequest): Promise<ContextRetrievalResponse> {
    const startTime = Date.now()
    
    try {
      logger.info('Starting context retrieval', {
        query: request.query.substring(0, 100),
        contextTypes: request.contextTypes,
        userId: request.userId,
        projectId: request.projectId
      })

      // Determine optimal search strategy
      const searchStrategy = await this.determineSearchStrategy(request)
      
      // Perform search based on strategy
      let results: ContextRetrievalResult[] = []
      
      switch (searchStrategy) {
        case 'semantic':
          results = await this.retrieveSemanticContext(request.query, request.contextTypes, request.filters)
          break
        case 'keyword':
          results = await this.retrieveKeywordContext(request.query, request.contextTypes, request.filters)
          break
        case 'hybrid':
          results = await this.retrieveHybridContext(request.query, request.contextTypes, request.filters)
          break
        default:
          results = await this.retrieveHybridContext(request.query, request.contextTypes, request.filters)
      }

      // Calculate relevance scores for all results
      const userContext = await this.getUserContext(request.userId, request.projectId, request.templateId)
      const scoredResults: ContextRetrievalResult[] = await Promise.all(
        results.map(async (result) => {
          const relevanceScore = await this.calculateRelevanceScore(result, request.query, userContext)
          return { ...result, relevanceScore }
        })
      )

      // Filter by minimum relevance score
      const filteredResults = scoredResults.filter(result => 
        result.relevanceScore >= (request.minRelevanceScore || 0.1)
      )

      // Sort by relevance score and limit results
      const sortedResults = filteredResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, request.limit || 20)

      const processingTime = Date.now() - startTime

      // Log the query for analytics
      await this.logQuery(request, {
        results: sortedResults,
        totalResults: filteredResults.length,
        query: request.query,
        processingTime,
        searchStrategy,
        relevanceThreshold: request.minRelevanceScore || 0.1,
        metadata: {
          contextTypes: request.contextTypes,
          filters: request.filters,
          userId: request.userId,
          projectId: request.projectId,
          templateId: request.templateId
        }
      })

      logger.info('Context retrieval completed', {
        query: request.query.substring(0, 100),
        resultsCount: sortedResults.length,
        processingTime,
        searchStrategy
      })

      return {
        results: sortedResults,
        totalResults: filteredResults.length,
        query: request.query,
        processingTime,
        searchStrategy,
        relevanceThreshold: request.minRelevanceScore || 0.1,
        metadata: {
          contextTypes: request.contextTypes,
          filters: request.filters,
          userId: request.userId,
          projectId: request.projectId,
          templateId: request.templateId
        }
      }

    } catch (error) {
      logger.error('Context retrieval failed', {
        query: request.query.substring(0, 100),
        error: error.message
      })
      throw error
    }
  }

  async retrieveSemanticContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Retrieving semantic context', { query: query.substring(0, 50), contextTypes })
      
      const results = await this.semanticSearchEngine.search(query, contextTypes, filters)
      
      logger.debug('Semantic context retrieved', {
        query: query.substring(0, 50),
        resultsCount: results.length
      })
      
      return results

    } catch (error) {
      logger.error('Failed to retrieve semantic context', {
        query: query.substring(0, 50),
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  async retrieveKeywordContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Retrieving keyword context', { query: query.substring(0, 50), contextTypes })
      
      const results = await this.keywordSearchEngine.search(query, contextTypes, filters)
      
      logger.debug('Keyword context retrieved', {
        query: query.substring(0, 50),
        resultsCount: results.length
      })
      
      return results

    } catch (error: any) {
      logger.error('Failed to retrieve keyword context', {
        query: query.substring(0, 50),
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  async retrieveQdrantContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      if (!this.qdrantSearchEngine) {
        logger.debug('Qdrant search engine not available')
        return []
      }

      logger.debug('Retrieving Qdrant context', { query: query.substring(0, 50), contextTypes })
      
      const results = await this.qdrantSearchEngine.search(
        query,
        contextTypes,
        filters,
        this.semanticSearchConfig.topK || 20
      )
      
      logger.debug('Qdrant context retrieved', {
        query: query.substring(0, 50),
        resultsCount: results.length
      })
      
      return results

    } catch (error: any) {
      logger.error('Failed to retrieve Qdrant context', {
        query: query.substring(0, 50),
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  async retrieveHybridContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Retrieving hybrid context', { query: query.substring(0, 50), contextTypes })
      
      // Perform semantic, keyword, and Qdrant searches in parallel
      const searchPromises: Promise<ContextRetrievalResult[]>[] = [
        this.retrieveSemanticContext(query, contextTypes, filters),
        this.retrieveKeywordContext(query, contextTypes, filters)
      ]

      // Add Qdrant search if available
      if (this.qdrantSearchEngine) {
        searchPromises.push(
          this.retrieveQdrantContext(query, contextTypes, filters).catch(err => {
            logger.warn('Qdrant search failed in hybrid context', { error: err.message })
            return [] // Return empty array on error to allow other searches to continue
          })
        )
      }

      const searchResults = await Promise.all(searchPromises)
      const [semanticResults, keywordResults, qdrantResults = []] = searchResults
      
      // Combine and deduplicate results from all search engines
      const combinedResults = this.combineSearchResults(
        semanticResults,
        keywordResults,
        qdrantResults
      )
      
      logger.debug('Hybrid context retrieved', {
        query: query.substring(0, 50),
        semanticResultsCount: semanticResults.length,
        keywordResultsCount: keywordResults.length,
        qdrantResultsCount: qdrantResults.length,
        combinedResultsCount: combinedResults.length
      })
      
      return combinedResults

    } catch (error: any) {
      logger.error('Failed to retrieve hybrid context', {
        query: query.substring(0, 50),
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  async calculateRelevanceScore(result: ContextRetrievalResult, query: string, userContext?: any): Promise<number> {
    try {
      const relevanceScore = await this.relevanceScoringEngine.calculateRelevanceScore(result, query, userContext)
      return relevanceScore

    } catch (error) {
      logger.error('Failed to calculate relevance score', {
        resultId: result.id,
        query: query.substring(0, 50),
        error: error.message
      })
      return 0
    }
  }

  async calculateSemanticSimilarity(query: string, content: string): Promise<number> {
    try {
      const queryEmbeddings = await this.semanticSearchEngine.generateEmbeddings(query)
      const contentEmbeddings = await this.semanticSearchEngine.generateEmbeddings(content)
      
      return await this.semanticSearchEngine.calculateSimilarity(queryEmbeddings, contentEmbeddings)

    } catch (error) {
      logger.error('Failed to calculate semantic similarity', {
        query: query.substring(0, 50),
        error: error.message
      })
      return 0
    }
  }

  async calculateKeywordRelevance(query: string, content: string): Promise<number> {
    try {
      return await this.keywordSearchEngine.calculateKeywordRelevance(query, content)

    } catch (error) {
      logger.error('Failed to calculate keyword relevance', {
        query: query.substring(0, 50),
        error: error.message
      })
      return 0
    }
  }

  async calculateContextRelevance(result: ContextRetrievalResult, userContext: any): Promise<number> {
    try {
      return await this.relevanceScoringEngine.calculateContextRelevanceScore(result, userContext)

    } catch (error) {
      logger.error('Failed to calculate context relevance', {
        resultId: result.id,
        error: error.message
      })
      return 0
    }
  }

  async generateEmbeddings(content: string): Promise<number[]> {
    try {
      return await this.semanticSearchEngine.generateEmbeddings(content)

    } catch (error) {
      logger.error('Failed to generate embeddings', {
        content: content.substring(0, 100),
        error: error.message
      })
      throw error
    }
  }

  async getCachedEmbeddings(content: string): Promise<number[] | null> {
    try {
      // This would be implemented in the semantic search engine
      return null

    } catch (error) {
      logger.error('Failed to get cached embeddings', {
        content: content.substring(0, 100),
        error: error.message
      })
      return null
    }
  }

  async cacheEmbeddings(content: string, embeddings: number[]): Promise<void> {
    try {
      // This would be implemented in the semantic search engine
      logger.debug('Caching embeddings', { contentLength: content.length })

    } catch (error) {
      logger.error('Failed to cache embeddings', {
        content: content.substring(0, 100),
        error: error.message
      })
    }
  }

  async updateSearchIndex(content: string, type: ContextType, source: string, sourceId: string): Promise<void> {
    try {
      logger.debug('Updating search index', { type, source, sourceId })

      // Generate embeddings for the content
      const embeddings = await this.generateEmbeddings(content)
      
      // Extract keywords
      const keywords = await this.keywordSearchEngine.extractKeywords(content)
      
      const metadata = {
        content_length: content.length,
        keyword_count: keywords.length,
        indexed_at: new Date().toISOString()
      }

      // Update or insert into PostgreSQL search index
      await pool.query(
        `
        INSERT INTO search_index (content, type, source, source_id, embeddings, keywords, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (source, source_id) DO UPDATE SET
          content = EXCLUDED.content,
          type = EXCLUDED.type,
          embeddings = EXCLUDED.embeddings,
          keywords = EXCLUDED.keywords,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          content,
          type,
          source,
          sourceId,
          JSON.stringify(embeddings),
          keywords,
          JSON.stringify(metadata)
        ]
      )

      // Also sync to Qdrant if available (non-blocking)
      if (this.qdrantSearchEngine) {
        this.qdrantSearchEngine.upsertPoint(
          `${source}:${sourceId}`, // Use source:sourceId as unique ID
          content,
          type,
          source,
          sourceId,
          {
            ...metadata,
            keywords,
            indexed_at: new Date().toISOString()
          }
        ).catch(err => {
          // Log but don't fail - Qdrant sync is optional
          logger.warn('Failed to sync to Qdrant (non-blocking)', {
            type,
            source,
            sourceId,
            error: err.message
          })
        })
      }

      logger.info('Search index updated', { type, source, sourceId })

    } catch (error: any) {
      logger.error('Failed to update search index', {
        type,
        source,
        sourceId,
        error: error.message
      })
      throw error
    }
  }

  async optimizeQuery(query: string): Promise<string> {
    try {
      // Basic query optimization
      let optimizedQuery = query.trim()
      
      // Remove extra whitespace
      optimizedQuery = optimizedQuery.replace(/\s+/g, ' ')
      
      // Remove common stop words for better matching
      const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
      const words = optimizedQuery.split(' ')
      const filteredWords = words.filter(word => !stopWords.includes(word.toLowerCase()))
      
      return filteredWords.join(' ')

    } catch (error) {
      logger.error('Failed to optimize query', {
        query,
        error: error.message
      })
      return query
    }
  }

  async expandQuery(query: string, contextTypes: ContextType[]): Promise<string> {
    try {
      // Basic query expansion based on context types
      let expandedQuery = query
      
      // Add context-specific terms
      contextTypes.forEach(type => {
        switch (type) {
          case 'project_data':
            expandedQuery += ' project management requirements stakeholders'
            break
          case 'document_history':
            expandedQuery += ' document template framework methodology'
            break
          case 'best_practices':
            expandedQuery += ' best practices guidelines standards'
            break
          case 'requirements':
            expandedQuery += ' functional non-functional acceptance criteria'
            break
        }
      })
      
      return expandedQuery

    } catch (error) {
      logger.error('Failed to expand query', {
        query,
        contextTypes,
        error: error.message
      })
      return query
    }
  }

  async suggestRelatedQueries(query: string): Promise<string[]> {
    try {
      // Get related queries from search history
      const result = await pool.query(
        `
        SELECT query, COUNT(*) as frequency
        FROM search_history
        WHERE query != $1
        AND (
          query ILIKE '%' || $1 || '%' OR
          $1 ILIKE '%' || query || '%'
        )
        GROUP BY query
        ORDER BY frequency DESC
        LIMIT 5
        `,
        [query]
      )

      return result.rows.map(row => row.query)

    } catch (error) {
      logger.error('Failed to suggest related queries', {
        query,
        error: error.message
      })
      return []
    }
  }

  async getMetrics(): Promise<ContextRetrievalMetrics> {
    try {
      // Get metrics from database
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_queries,
          AVG(processing_time) as avg_response_time,
          COUNT(CASE WHEN cache_hit = true THEN 1 END) * 100.0 / COUNT(*) as cache_hit_rate,
          COUNT(CASE WHEN relevance_score >= 0.8 THEN 1 END) as high_relevance,
          COUNT(CASE WHEN relevance_score >= 0.5 AND relevance_score < 0.8 THEN 1 END) as medium_relevance,
          COUNT(CASE WHEN relevance_score < 0.5 THEN 1 END) as low_relevance,
          COUNT(CASE WHEN error IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as error_rate
        FROM search_history
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `)

      const metrics = result.rows[0]

      return {
        totalQueries: parseInt(metrics.total_queries) || 0,
        averageResponseTime: parseFloat(metrics.avg_response_time) || 0,
        cacheHitRate: parseFloat(metrics.cache_hit_rate) || 0,
        relevanceScoreDistribution: {
          high: parseInt(metrics.high_relevance) || 0,
          medium: parseInt(metrics.medium_relevance) || 0,
          low: parseInt(metrics.low_relevance) || 0
        },
        contextTypeDistribution: this.getEmptyContextTypeDistribution(),
        searchStrategyDistribution: this.getEmptySearchStrategyDistribution(),
        errorRate: parseFloat(metrics.error_rate) || 0,
        topQueries: [],
        performanceMetrics: {
          embeddingGenerationTime: 0,
          similarityCalculationTime: 0,
          databaseQueryTime: 0,
          cacheLookupTime: 0
        }
      }

    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error.message
      })
      
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        relevanceScoreDistribution: { high: 0, medium: 0, low: 0 },
        contextTypeDistribution: this.getEmptyContextTypeDistribution(),
        searchStrategyDistribution: this.getEmptySearchStrategyDistribution(),
        errorRate: 0,
        topQueries: [],
        performanceMetrics: {
          embeddingGenerationTime: 0,
          similarityCalculationTime: 0,
          databaseQueryTime: 0,
          cacheLookupTime: 0
        }
      }
    }
  }

  async logQuery(request: ContextRetrievalRequest, response: ContextRetrievalResponse): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO search_history (
          query, context_types, filters, user_id, project_id, template_id,
          results_count, processing_time, search_strategy, relevance_threshold,
          cache_hit, error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          request.query,
          JSON.stringify(request.contextTypes),
          JSON.stringify(request.filters),
          request.userId,
          request.projectId,
          request.templateId,
          response.results.length,
          response.processingTime,
          response.searchStrategy,
          response.relevanceThreshold,
          false, // cache_hit - would be determined by actual cache usage
          null // error - would be set if there was an error
        ]
      )

    } catch (error) {
      logger.error('Failed to log query', {
        query: request.query.substring(0, 50),
        error: error.message
      })
    }
  }

  async updateRelevanceFeedback(resultId: string, relevanceScore: number, userId: string): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO relevance_feedback (result_id, user_id, relevance_score, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (result_id, user_id) DO UPDATE SET
          relevance_score = EXCLUDED.relevance_score,
          updated_at = CURRENT_TIMESTAMP
        `,
        [resultId, userId, relevanceScore]
      )

      logger.info('Relevance feedback updated', { resultId, userId, relevanceScore })

    } catch (error) {
      logger.error('Failed to update relevance feedback', {
        resultId,
        userId,
        relevanceScore,
        error: error.message
      })
    }
  }

  async updateSemanticSearchConfig(config: SemanticSearchConfig): Promise<void> {
    try {
      this.semanticSearchConfig = config
      this.semanticSearchEngine = new SemanticSearchEngine(config)
      
      logger.info('Semantic search config updated', config)

    } catch (error) {
      logger.error('Failed to update semantic search config', {
        config,
        error: error.message
      })
      throw error
    }
  }

  async updateRelevanceScoringConfig(config: RelevanceScoringConfig): Promise<void> {
    try {
      this.relevanceScoringConfig = config
      this.relevanceScoringEngine = new RelevanceScoringEngine(config)
      
      logger.info('Relevance scoring config updated', config)

    } catch (error) {
      logger.error('Failed to update relevance scoring config', {
        config,
        error: error.message
      })
      throw error
    }
  }

  async getConfiguration(): Promise<{
    semanticSearch: SemanticSearchConfig
    relevanceScoring: RelevanceScoringConfig
  }> {
    return {
      semanticSearch: this.semanticSearchConfig,
      relevanceScoring: this.relevanceScoringConfig
    }
  }

  private async determineSearchStrategy(request: ContextRetrievalRequest): Promise<SearchStrategy> {
    try {
      // Simple strategy determination based on query characteristics
      const query = request.query.toLowerCase()
      
      // If query is very short, use keyword search
      if (query.length < 10) {
        return 'keyword'
      }
      
      // If query contains specific technical terms, use hybrid
      const technicalTerms = ['requirement', 'stakeholder', 'framework', 'methodology', 'template']
      const hasTechnicalTerms = technicalTerms.some(term => query.includes(term))
      
      if (hasTechnicalTerms) {
        return 'hybrid'
      }
      
      // Default to semantic search for longer, more conceptual queries
      return 'semantic'

    } catch (error) {
      logger.error('Failed to determine search strategy', {
        query: request.query.substring(0, 50),
        error: error.message
      })
      return 'hybrid'
    }
  }

  private combineSearchResults(
    semanticResults: ContextRetrievalResult[],
    keywordResults: ContextRetrievalResult[],
    qdrantResults: ContextRetrievalResult[] = []
  ): ContextRetrievalResult[] {
    const resultMap = new Map<string, ContextRetrievalResult>()
    
    // Add semantic results first (they get priority)
    semanticResults.forEach(result => {
      resultMap.set(result.id, { ...result, relevanceScore: result.relevanceScore * 1.2 }) // Boost semantic results
    })
    
    // Add keyword results, combining scores if duplicate
    keywordResults.forEach(result => {
      const existing = resultMap.get(result.id)
      if (existing) {
        // Combine scores for duplicate results
        existing.relevanceScore = (existing.relevanceScore + result.relevanceScore) / 2
      } else {
        resultMap.set(result.id, result)
      }
    })
    
    // Add Qdrant results, combining scores if duplicate
    qdrantResults.forEach(result => {
      const existing = resultMap.get(result.id)
      if (existing) {
        // Combine scores for duplicate results (weighted average)
        existing.relevanceScore = (existing.relevanceScore * 0.6 + result.relevanceScore * 0.4)
      } else {
        // Boost Qdrant results slightly
        resultMap.set(result.id, { ...result, relevanceScore: result.relevanceScore * 1.1 })
      }
    })
    
    return Array.from(resultMap.values())
  }

  private async getUserContext(userId?: string, projectId?: string, templateId?: string): Promise<any> {
    try {
      if (!userId) {
        return null
      }

      // Get user context from database
      const result = await pool.query(
        `
        SELECT 
          u.id as user_id,
          u.role as user_role,
          u.name as user_name,
          up.preferred_frameworks,
          up.preferred_categories,
          ue.domains,
          ue.level as expertise_level
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        LEFT JOIN user_expertise ue ON u.id = ue.user_id
        WHERE u.id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const userRow = result.rows[0]

      return {
        userId: userRow.user_id,
        userRole: userRow.user_role,
        userName: userRow.user_name,
        projectId,
        templateId,
        preferredFrameworks: userRow.preferred_frameworks || [],
        preferredCategories: userRow.preferred_categories || [],
        domains: userRow.domains || [],
        expertiseLevel: userRow.expertise_level
      }

    } catch (error) {
      logger.error('Failed to get user context', {
        userId,
        projectId,
        templateId,
        error: error.message
      })
      return null
    }
  }
}
