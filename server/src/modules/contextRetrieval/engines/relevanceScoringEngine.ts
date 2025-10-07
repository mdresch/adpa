/**
 * Relevance Scoring Engine
 * Calculates comprehensive relevance scores for search results
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  RelevanceScoringEngine as IRelevanceScoringEngine,
  ContextRetrievalResult,
  RelevanceScoringConfig
} from '../types'

export class RelevanceScoringEngine implements IRelevanceScoringEngine {
  private config: RelevanceScoringConfig

  constructor(config: RelevanceScoringConfig) {
    this.config = config
  }

  async calculateRelevanceScore(result: ContextRetrievalResult, query: string, userContext?: any): Promise<number> {
    try {
      logger.debug('Calculating relevance score', {
        resultId: result.id,
        query: query.substring(0, 50),
        hasUserContext: !!userContext
      })

      // Calculate individual component scores
      const [
        semanticScore,
        keywordScore,
        freshnessScore,
        authorityScore,
        popularityScore,
        userPreferenceScore,
        contextRelevanceScore
      ] = await Promise.all([
        this.calculateSemanticRelevance(query, result.content),
        this.calculateKeywordRelevance(query, result.content),
        this.calculateFreshnessScore(result.timestamp),
        this.calculateAuthorityScore(result.source, result.sourceId),
        this.calculatePopularityScore(result),
        userContext ? this.calculateUserPreferenceScore(result, userContext) : Promise.resolve(0),
        userContext ? this.calculateContextRelevanceScore(result, userContext) : Promise.resolve(0)
      ])

      // Calculate weighted composite score
      const compositeScore = this.calculateWeightedScore({
        semanticSimilarity: semanticScore,
        keywordMatch: keywordScore,
        freshness: freshnessScore,
        authority: authorityScore,
        popularity: popularityScore,
        userPreference: userPreferenceScore,
        contextRelevance: contextRelevanceScore
      })

      // Apply normalization and boost factors
      const normalizedScore = this.normalizeScore(compositeScore, result)

      logger.debug('Relevance score calculated', {
        resultId: result.id,
        compositeScore,
        normalizedScore,
        componentScores: {
          semantic: semanticScore,
          keyword: keywordScore,
          freshness: freshnessScore,
          authority: authorityScore,
          popularity: popularityScore,
          userPreference: userPreferenceScore,
          contextRelevance: contextRelevanceScore
        }
      })

      return normalizedScore

    } catch (error) {
      logger.error('Failed to calculate relevance score', {
        resultId: result.id,
        query: query.substring(0, 50),
        error: error.message
      })
      return 0
    }
  }

  async calculateSemanticRelevance(query: string, content: string): Promise<number> {
    try {
      // This would typically use embeddings and cosine similarity
      // For now, we'll use a simplified semantic similarity calculation
      
      const queryWords = this.extractWords(query.toLowerCase())
      const contentWords = this.extractWords(content.toLowerCase())
      
      if (queryWords.length === 0 || contentWords.length === 0) {
        return 0
      }

      // Calculate word overlap with semantic weighting
      let totalScore = 0
      let maxPossibleScore = 0

      queryWords.forEach(queryWord => {
        const wordWeight = this.getWordWeight(queryWord)
        maxPossibleScore += wordWeight

        // Find best match in content
        let bestMatch = 0
        contentWords.forEach(contentWord => {
          const similarity = this.calculateWordSimilarity(queryWord, contentWord)
          bestMatch = Math.max(bestMatch, similarity)
        })

        totalScore += wordWeight * bestMatch
      })

      return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0

    } catch (error) {
      logger.error('Failed to calculate semantic relevance', {
        query: query.substring(0, 50),
        error: error.message
      })
      return 0
    }
  }

  async calculateKeywordRelevance(query: string, content: string): Promise<number> {
    try {
      const queryKeywords = this.extractKeywords(query.toLowerCase())
      const contentKeywords = this.extractKeywords(content.toLowerCase())
      
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
        query: query.substring(0, 50),
        error: error.message
      })
      return 0
    }
  }

  async calculateFreshnessScore(timestamp: Date): Promise<number> {
    try {
      const now = new Date()
      const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
      
      // Exponential decay: newer content gets higher scores
      // Half-life of 30 days
      return Math.exp(-ageInDays / 30)

    } catch (error) {
      logger.error('Failed to calculate freshness score', {
        timestamp,
        error: error.message
      })
      return 0.5 // Default to medium freshness
    }
  }

  async calculateAuthorityScore(source: string, sourceId: string): Promise<number> {
    try {
      // Get authority score from database or use default mapping
      const result = await pool.query(
        'SELECT authority_score FROM source_authority WHERE source = $1 AND source_id = $2',
        [source, sourceId]
      )

      if (result.rows.length > 0) {
        return result.rows[0].authority_score
      }

      // Use default authority mapping
      const authorityMap: Record<string, number> = {
        'official_documentation': 1.0,
        'best_practices': 0.9,
        'expert_opinion': 0.8,
        'user_generated': 0.7,
        'external_api': 0.8,
        'database_query': 0.6,
        'community_content': 0.5
      }

      return authorityMap[source] || 0.5

    } catch (error) {
      logger.error('Failed to calculate authority score', {
        source,
        sourceId,
        error: error.message
      })
      return 0.5 // Default to medium authority
    }
  }

  async calculatePopularityScore(result: ContextRetrievalResult): Promise<number> {
    try {
      // Calculate popularity based on access count and other metrics
      const accessCount = result.metadata?.access_count || 0
      const viewCount = result.metadata?.view_count || 0
      const shareCount = result.metadata?.share_count || 0
      const likeCount = result.metadata?.like_count || 0

      // Weight different popularity metrics
      const popularityScore = (
        accessCount * 0.4 +
        viewCount * 0.3 +
        shareCount * 0.2 +
        likeCount * 0.1
      )

      // Logarithmic scaling to prevent very popular items from dominating
      return Math.min(1, Math.log(popularityScore + 1) / Math.log(1000))

    } catch (error) {
      logger.error('Failed to calculate popularity score', {
        resultId: result.id,
        error: error.message
      })
      return 0
    }
  }

  async calculateUserPreferenceScore(result: ContextRetrievalResult, userContext: any): Promise<number> {
    try {
      if (!userContext || !userContext.userId) {
        return 0
      }

      // Get user's historical preferences
      const userPreferences = await this.getUserPreferences(userContext.userId)
      
      if (!userPreferences) {
        return 0
      }

      let score = 0
      let factors = 0

      // Check framework preference
      if (userPreferences.preferred_frameworks && result.metadata?.framework) {
        if (userPreferences.preferred_frameworks.includes(result.metadata.framework)) {
          score += 0.3
        }
        factors += 0.3
      }

      // Check category preference
      if (userPreferences.preferred_categories && result.metadata?.category) {
        if (userPreferences.preferred_categories.includes(result.metadata.category)) {
          score += 0.2
        }
        factors += 0.2
      }

      // Check author preference
      if (userPreferences.preferred_authors && result.metadata?.author) {
        if (userPreferences.preferred_authors.includes(result.metadata.author)) {
          score += 0.2
        }
        factors += 0.2
      }

      // Check content type preference
      if (userPreferences.preferred_content_types && result.type) {
        if (userPreferences.preferred_content_types.includes(result.type)) {
          score += 0.3
        }
        factors += 0.3
      }

      return factors > 0 ? score / factors : 0

    } catch (error) {
      logger.error('Failed to calculate user preference score', {
        resultId: result.id,
        userId: userContext?.userId,
        error: error.message
      })
      return 0
    }
  }

  async calculateContextRelevanceScore(result: ContextRetrievalResult, userContext: any): Promise<number> {
    try {
      if (!userContext) {
        return 0
      }

      let score = 0
      let factors = 0

      // Check project context relevance
      if (userContext.projectId && result.metadata?.project_id) {
        if (userContext.projectId === result.metadata.project_id) {
          score += 0.4
        }
        factors += 0.4
      }

      // Check template context relevance
      if (userContext.templateId && result.metadata?.template_id) {
        if (userContext.templateId === result.metadata.template_id) {
          score += 0.3
        }
        factors += 0.3
      }

      // Check user role relevance
      if (userContext.userRole && result.metadata?.target_audience) {
        if (result.metadata.target_audience.includes(userContext.userRole)) {
          score += 0.3
        }
        factors += 0.3
      }

      return factors > 0 ? score / factors : 0

    } catch (error) {
      logger.error('Failed to calculate context relevance score', {
        resultId: result.id,
        userContext,
        error: error.message
      })
      return 0
    }
  }

  private calculateWeightedScore(scores: {
    semanticSimilarity: number
    keywordMatch: number
    freshness: number
    authority: number
    popularity: number
    userPreference: number
    contextRelevance: number
  }): number {
    const weights = this.config.weights

    return (
      scores.semanticSimilarity * weights.semanticSimilarity +
      scores.keywordMatch * weights.keywordMatch +
      scores.freshness * weights.freshness +
      scores.authority * weights.authority +
      scores.popularity * weights.popularity +
      scores.userPreference * weights.userPreference +
      scores.contextRelevance * weights.contextRelevance
    )
  }

  private normalizeScore(score: number, result: ContextRetrievalResult): number {
    // Apply normalization based on configuration
    const { minScore, maxScore, boostFactors } = this.config.normalization

    // Apply boost factors
    let boostedScore = score
    Object.entries(boostFactors).forEach(([factor, boost]) => {
      if (result.metadata?.[factor]) {
        boostedScore *= boost
      }
    })

    // Normalize to configured range
    const normalizedScore = Math.max(minScore, Math.min(maxScore, boostedScore))

    return normalizedScore
  }

  private extractWords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ])

    return this.extractWords(text)
      .filter(word => !stopWords.has(word))
  }

  private getWordWeight(word: string): number {
    // Simple word weighting based on length and commonness
    const commonWords = new Set(['project', 'document', 'template', 'system', 'user', 'data'])
    
    if (commonWords.has(word)) {
      return 0.5
    }
    
    // Longer words are generally more specific and important
    return Math.min(1, word.length / 10)
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    // Simple word similarity calculation
    if (word1 === word2) {
      return 1.0
    }

    // Check if one word contains the other
    if (word1.includes(word2) || word2.includes(word1)) {
      return 0.8
    }

    // Calculate Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(word1, word2)
    const maxLength = Math.max(word1.length, word2.length)
    
    if (maxLength === 0) {
      return 1.0
    }

    return 1 - (distance / maxLength)
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        `
        SELECT 
          preferred_frameworks,
          preferred_categories,
          preferred_authors,
          preferred_content_types
        FROM user_search_preferences
        WHERE user_id = $1
        `,
        [userId]
      )

      return result.rows[0] || null

    } catch (error) {
      logger.error('Failed to get user preferences', {
        userId,
        error: error.message
      })
      return null
    }
  }
}
