/**
 * Keyword Search Engine
 * Handles keyword-based search with exact and fuzzy matching
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  KeywordSearchEngine as IKeywordSearchEngine,
  ContextRetrievalResult,
  ContextType,
  ContextFilters
} from '../types'

export class KeywordSearchEngine implements IKeywordSearchEngine {
  private stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'said', 'each', 'which', 'their', 'time', 'if',
    'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her',
    'would', 'make', 'like', 'into', 'him', 'two', 'more', 'go', 'no',
    'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who',
    'oil', 'sit', 'now', 'find', 'long', 'down', 'day', 'did', 'get',
    'come', 'made', 'may', 'part'
  ])

  async search(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Performing keyword search', { query, contextTypes, filters })

      // Extract keywords from query
      const keywords = await this.extractKeywords(query)

      // Perform keyword-based search
      const results = await this.performKeywordSearch(keywords, contextTypes, filters)

      logger.info('Keyword search completed', {
        query,
        keywords,
        contextTypes,
        resultsCount: results.length
      })

      return results

    } catch (error) {
      logger.error('Keyword search failed', {
        query,
        contextTypes,
        error: error.message
      })
      throw error
    }
  }

  async extractKeywords(content: string): Promise<string[]> {
    try {
      // Clean and normalize the content
      const cleaned = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Split into words and filter out stop words
      const words = cleaned.split(' ')
        .filter(word => word.length > 2 && !this.stopWords.has(word))

      // Remove duplicates and return
      return [...new Set(words)]

    } catch (error) {
      logger.error('Failed to extract keywords', {
        content: content.substring(0, 100),
        error: error.message
      })
      return []
    }
  }

  async calculateKeywordRelevance(query: string, content: string): Promise<number> {
    try {
      const queryKeywords = await this.extractKeywords(query)
      const contentKeywords = await this.extractKeywords(content)

      if (queryKeywords.length === 0) {
        return 0
      }

      // Calculate keyword overlap
      const matches = queryKeywords.filter(keyword => 
        contentKeywords.some(contentKeyword => 
          contentKeyword.includes(keyword) || keyword.includes(contentKeyword)
        )
      )

      // Calculate relevance score
      const exactMatches = queryKeywords.filter(keyword => 
        contentKeywords.includes(keyword)
      )

      const partialMatches = matches.length - exactMatches.length

      // Weight exact matches higher than partial matches
      const score = (exactMatches.length * 1.0 + partialMatches * 0.5) / queryKeywords.length

      return Math.min(1, score)

    } catch (error) {
      logger.error('Failed to calculate keyword relevance', {
        query,
        content: content.substring(0, 100),
        error: error.message
      })
      return 0
    }
  }

  async findExactMatches(query: string, contextTypes: ContextType[]): Promise<ContextRetrievalResult[]> {
    try {
      const keywords = await this.extractKeywords(query)
      
      if (keywords.length === 0) {
        return []
      }

      // Build SQL query for exact keyword matching
      let sql = `
        SELECT 
          si.id,
          si.content,
          si.type,
          si.source,
          si.source_id,
          si.keywords,
          si.metadata,
          si.created_at,
          si.updated_at,
          si.access_count,
          si.relevance_score,
          (
            SELECT COUNT(*)
            FROM unnest(si.keywords) AS keyword
            WHERE keyword = ANY($1)
          ) as match_count
        FROM search_index si
        WHERE si.keywords && $1
      `
      const params: any[] = [keywords]
      let paramIndex = 2

      // Add context type filter
      if (contextTypes.length > 0) {
        sql += ` AND si.type = ANY($${paramIndex})`
        params.push(contextTypes)
        paramIndex++
      }

      // Order by match count and limit results
      sql += ` ORDER BY match_count DESC, si.relevance_score DESC LIMIT 50`

      const result = await pool.query(sql, params)

      // Convert to ContextRetrievalResult objects
      const results: ContextRetrievalResult[] = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        content: row.content,
        title: row.metadata?.title || row.content.substring(0, 100),
        relevanceScore: this.calculateExactMatchScore(row.match_count, keywords.length),
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata || {},
        keywords: row.keywords || [],
        summary: row.metadata?.summary,
        timestamp: row.created_at,
        freshness: this.calculateFreshnessScore(row.created_at),
        authority: this.calculateAuthorityScore(row.source, row.source_id),
        popularity: this.calculatePopularityScore(row.access_count)
      }))

      return results

    } catch (error) {
      logger.error('Failed to find exact matches', {
        query,
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  async findFuzzyMatches(query: string, contextTypes: ContextType[], threshold: number = 0.7): Promise<ContextRetrievalResult[]> {
    try {
      const keywords = await this.extractKeywords(query)
      
      if (keywords.length === 0) {
        return []
      }

      // Build SQL query for fuzzy keyword matching using similarity
      let sql = `
        SELECT 
          si.id,
          si.content,
          si.type,
          si.source,
          si.source_id,
          si.keywords,
          si.metadata,
          si.created_at,
          si.updated_at,
          si.access_count,
          si.relevance_score,
          (
            SELECT AVG(
              CASE 
                WHEN keyword = ANY($1) THEN 1.0
                ELSE (
                  SELECT MAX(similarity(keyword, query_keyword))
                  FROM unnest($1) AS query_keyword
                )
              END
            )
            FROM unnest(si.keywords) AS keyword
          ) as similarity_score
        FROM search_index si
        WHERE si.keywords && $1 OR si.keywords && (
          SELECT array_agg(DISTINCT keyword)
          FROM unnest(si.keywords) AS keyword
          CROSS JOIN unnest($1) AS query_keyword
          WHERE similarity(keyword, query_keyword) > $2
        )
      `
      const params: any[] = [keywords, threshold]
      let paramIndex = 3

      // Add context type filter
      if (contextTypes.length > 0) {
        sql += ` AND si.type = ANY($${paramIndex})`
        params.push(contextTypes)
        paramIndex++
      }

      // Order by similarity score and limit results
      sql += ` ORDER BY similarity_score DESC, si.relevance_score DESC LIMIT 50`

      const result = await pool.query(sql, params)

      // Convert to ContextRetrievalResult objects
      const results: ContextRetrievalResult[] = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        content: row.content,
        title: row.metadata?.title || row.content.substring(0, 100),
        relevanceScore: row.similarity_score || 0,
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata || {},
        keywords: row.keywords || [],
        summary: row.metadata?.summary,
        timestamp: row.created_at,
        freshness: this.calculateFreshnessScore(row.created_at),
        authority: this.calculateAuthorityScore(row.source, row.source_id),
        popularity: this.calculatePopularityScore(row.access_count)
      }))

      return results

    } catch (error) {
      logger.error('Failed to find fuzzy matches', {
        query,
        contextTypes,
        threshold,
        error: error.message
      })
      return []
    }
  }

  private async performKeywordSearch(keywords: string[], contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]> {
    try {
      if (keywords.length === 0) {
        return []
      }

      // Build the SQL query for keyword search
      let sql = `
        SELECT 
          si.id,
          si.content,
          si.type,
          si.source,
          si.source_id,
          si.keywords,
          si.metadata,
          si.created_at,
          si.updated_at,
          si.access_count,
          si.relevance_score,
          (
            SELECT COUNT(*)
            FROM unnest(si.keywords) AS keyword
            WHERE keyword = ANY($1)
          ) as exact_matches,
          (
            SELECT COUNT(*)
            FROM unnest(si.keywords) AS keyword
            CROSS JOIN unnest($1) AS query_keyword
            WHERE keyword ILIKE '%' || query_keyword || '%'
          ) as partial_matches
        FROM search_index si
        WHERE si.keywords && $1 OR si.keywords && (
          SELECT array_agg(DISTINCT keyword)
          FROM unnest(si.keywords) AS keyword
          CROSS JOIN unnest($1) AS query_keyword
          WHERE keyword ILIKE '%' || query_keyword || '%'
        )
      `
      const params: any[] = [keywords]
      let paramIndex = 2

      // Add context type filter
      if (contextTypes.length > 0) {
        sql += ` AND si.type = ANY($${paramIndex})`
        params.push(contextTypes)
        paramIndex++
      }

      // Add additional filters
      if (filters) {
        if (filters.dateRange) {
          sql += ` AND si.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`
          params.push(filters.dateRange.from, filters.dateRange.to)
          paramIndex += 2
        }

        if (filters.frameworks && filters.frameworks.length > 0) {
          sql += ` AND si.metadata->>'framework' = ANY($${paramIndex})`
          params.push(filters.frameworks)
          paramIndex++
        }

        if (filters.categories && filters.categories.length > 0) {
          sql += ` AND si.metadata->>'category' = ANY($${paramIndex})`
          params.push(filters.categories)
          paramIndex++
        }

        if (filters.authors && filters.authors.length > 0) {
          sql += ` AND si.metadata->>'author' = ANY($${paramIndex})`
          params.push(filters.authors)
          paramIndex++
        }

        if (filters.projects && filters.projects.length > 0) {
          sql += ` AND si.metadata->>'project_id' = ANY($${paramIndex})`
          params.push(filters.projects)
          paramIndex++
        }

        if (filters.tags && filters.tags.length > 0) {
          sql += ` AND si.keywords && $${paramIndex}`
          params.push(filters.tags)
          paramIndex++
        }

        if (filters.qualityScore) {
          sql += ` AND si.metadata->>'quality_score' BETWEEN $${paramIndex} AND $${paramIndex + 1}`
          params.push(filters.qualityScore.min, filters.qualityScore.max)
          paramIndex += 2
        }
      }

      // Order by relevance and limit results
      sql += ` ORDER BY exact_matches DESC, partial_matches DESC, si.relevance_score DESC LIMIT 50`

      const result = await pool.query(sql, params)

      // Convert to ContextRetrievalResult objects
      const results: ContextRetrievalResult[] = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        content: row.content,
        title: row.metadata?.title || row.content.substring(0, 100),
        relevanceScore: this.calculateKeywordRelevanceScore(row.exact_matches, row.partial_matches, keywords.length),
        source: row.source,
        sourceId: row.source_id,
        metadata: row.metadata || {},
        keywords: row.keywords || [],
        summary: row.metadata?.summary,
        timestamp: row.created_at,
        freshness: this.calculateFreshnessScore(row.created_at),
        authority: this.calculateAuthorityScore(row.source, row.source_id),
        popularity: this.calculatePopularityScore(row.access_count)
      }))

      // Update access count
      await this.updateAccessCount(results.map(r => r.id))

      return results

    } catch (error) {
      logger.error('Failed to perform keyword search', {
        keywords,
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  private calculateExactMatchScore(matchCount: number, totalKeywords: number): number {
    if (totalKeywords === 0) {
      return 0
    }
    return Math.min(1, matchCount / totalKeywords)
  }

  private calculateKeywordRelevanceScore(exactMatches: number, partialMatches: number, totalKeywords: number): number {
    if (totalKeywords === 0) {
      return 0
    }

    // Weight exact matches higher than partial matches
    const score = (exactMatches * 1.0 + partialMatches * 0.5) / totalKeywords
    return Math.min(1, score)
  }

  private calculateFreshnessScore(timestamp: Date): number {
    const now = new Date()
    const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
    
    // Exponential decay: newer content gets higher scores
    return Math.exp(-ageInDays / 30) // 30-day half-life
  }

  private calculateAuthorityScore(source: string, sourceId: string): number {
    // Simple authority scoring based on source type
    const authorityMap: Record<string, number> = {
      'official_documentation': 1.0,
      'best_practices': 0.9,
      'user_generated': 0.7,
      'external_api': 0.8,
      'database_query': 0.6
    }

    return authorityMap[source] || 0.5
  }

  private calculatePopularityScore(accessCount: number): number {
    // Logarithmic scaling of popularity
    return Math.min(1, Math.log(accessCount + 1) / Math.log(100))
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
}
