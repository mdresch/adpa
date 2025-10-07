/**
 * User Preferences Context Retriever
 * Retrieves context data from user preferences and profile
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import { BaseContextRetriever } from './base'
import type {
  ContextSource,
  ContextInjectionRequest
} from '../types'

export class UserPreferencesRetriever extends BaseContextRetriever {
  protected sourceType = 'user_preferences'

  protected validateSourceSpecific(source: ContextSource): void {
    if (!source.parameters?.user_id && !source.query) {
      throw new Error('User preferences source requires user_id parameter or custom query')
    }
  }

  protected async fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any> {
    const userId = source.parameters?.user_id || request.user_id

    if (!userId) {
      throw new Error('User ID is required for user preferences retrieval')
    }

    // Use custom query if provided, otherwise use default user preferences query
    const query = source.query || this.getDefaultUserQuery()
    const parameters = source.parameters || { user_id: userId }

    try {
      logger.debug('Fetching user preferences', { user_id: userId, query })

      // Replace parameters in query
      const processedQuery = this.processQuery(query, parameters)
      
      const result = await pool.query(processedQuery.query, processedQuery.params)

      return {
        user_id: userId,
        data: result.rows,
        metadata: {
          row_count: result.rows.length,
          query_used: processedQuery.query
        }
      }

    } catch (error) {
      logger.error('Failed to fetch user preferences', {
        user_id: userId,
        error: error.message
      })
      throw error
    }
  }

  protected async processData(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<any> {
    if (!data.data || !Array.isArray(data.data)) {
      return data
    }

    // Process user data into structured format
    const processedData = {
      user_profile: this.extractUserProfile(data.data),
      preferences: this.extractPreferences(data.data),
      expertise: this.extractExpertise(data.data),
      writing_style: this.extractWritingStyle(data.data),
      domain_knowledge: this.extractDomainKnowledge(data.data),
      collaboration_preferences: this.extractCollaborationPreferences(data.data),
      metadata: data.metadata
    }

    return processedData
  }

  protected async calculateMetadata(
    data: any,
    source: ContextSource,
    request: ContextInjectionRequest
  ): Promise<{
    relevance_score: number
    freshness_score: number
    confidence_score: number
    size_bytes: number
  }> {
    const baseMetadata = await super.calculateMetadata(data, source, request)
    
    // Calculate user-specific relevance
    const relevanceScore = this.calculateUserRelevance(data, source, request)
    
    // Calculate freshness based on user profile update dates
    const freshnessScore = this.calculateUserFreshness(data, source, request)
    
    // Calculate confidence based on profile completeness
    const confidenceScore = this.calculateUserConfidence(data, source, request)

    return {
      ...baseMetadata,
      relevance_score: relevanceScore,
      freshness_score: freshnessScore,
      confidence_score: confidenceScore
    }
  }

  private getDefaultUserQuery(): string {
    return `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        u.updated_at,
        u.metadata
      FROM users u
      WHERE u.id = $1
    `
  }

  private processQuery(query: string, parameters: Record<string, any>): { query: string; params: any[] } {
    // Simple parameter replacement - in production, use a proper query builder
    let processedQuery = query
    const params: any[] = []
    let paramIndex = 1

    // Replace named parameters with positional parameters
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`
      if (processedQuery.includes(placeholder)) {
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), `$${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    }

    return { query: processedQuery, params }
  }

  private extractUserProfile(rows: any[]): any {
    const userRow = rows.find(row => row.id && row.email)
    if (!userRow) return null

    return {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      created_at: userRow.created_at,
      updated_at: userRow.updated_at,
      metadata: userRow.metadata
    }
  }

  private extractPreferences(rows: any[]): any {
    const userRow = rows.find(row => row.id && row.email)
    if (!userRow || !userRow.metadata) return {}

    const metadata = typeof userRow.metadata === 'string' 
      ? JSON.parse(userRow.metadata) 
      : userRow.metadata

    return {
      language: metadata.language || 'en',
      timezone: metadata.timezone || 'UTC',
      date_format: metadata.date_format || 'YYYY-MM-DD',
      number_format: metadata.number_format || 'en-US',
      theme: metadata.theme || 'light',
      notifications: metadata.notifications || {}
    }
  }

  private extractExpertise(rows: any[]): any {
    const userRow = rows.find(row => row.id && row.email)
    if (!userRow || !userRow.metadata) return {}

    const metadata = typeof userRow.metadata === 'string' 
      ? JSON.parse(userRow.metadata) 
      : userRow.metadata

    return {
      level: metadata.expertise_level || 'intermediate',
      domains: metadata.expertise_domains || [],
      certifications: metadata.certifications || [],
      experience_years: metadata.experience_years || 0,
      methodologies: metadata.methodologies || []
    }
  }

  private extractWritingStyle(rows: any[]): any {
    const userRow = rows.find(row => row.id && row.email)
    if (!userRow || !userRow.metadata) return {}

    const metadata = typeof userRow.metadata === 'string' 
      ? JSON.parse(userRow.metadata) 
      : userRow.metadata

    return {
      tone: metadata.writing_tone || 'professional',
      formality: metadata.writing_formality || 'formal',
      length_preference: metadata.writing_length || 'detailed',
      structure_preference: metadata.writing_structure || 'structured',
      terminology_preference: metadata.terminology_preference || 'standard'
    }
  }

  private extractDomainKnowledge(rows: any[]): any {
    const userRow = rows.find(row => row.id && row.email)
    if (!userRow || !userRow.metadata) return {}

    const metadata = typeof userRow.metadata === 'string' 
      ? JSON.parse(userRow.metadata) 
      : userRow.metadata

    return {
      industries: metadata.industries || [],
      technologies: metadata.technologies || [],
      frameworks: metadata.frameworks || [],
      tools: metadata.tools || [],
      standards: metadata.standards || []
    }
  }

  private extractCollaborationPreferences(rows: any[]): any {
    const userRow = rows.find(row => row.id && row.email)
    if (!userRow || !userRow.metadata) return {}

    const metadata = typeof userRow.metadata === 'string' 
      ? JSON.parse(userRow.metadata) 
      : userRow.metadata

    return {
      communication_style: metadata.communication_style || 'direct',
      feedback_preference: metadata.feedback_preference || 'constructive',
      meeting_preference: metadata.meeting_preference || 'structured',
      collaboration_tools: metadata.collaboration_tools || [],
      availability: metadata.availability || {}
    }
  }

  private calculateUserRelevance(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    // Base relevance from source weight
    let relevance = source.weight || 0.5

    // Increase relevance if user profile is comprehensive
    if (data.user_profile && data.user_profile.name) {
      relevance += 0.2
    }

    if (data.expertise && data.expertise.domains && data.expertise.domains.length > 0) {
      relevance += 0.1
    }

    if (data.writing_style && data.writing_style.tone) {
      relevance += 0.1
    }

    if (data.domain_knowledge && data.domain_knowledge.industries && data.domain_knowledge.industries.length > 0) {
      relevance += 0.1
    }

    return Math.min(relevance, 1.0)
  }

  private calculateUserFreshness(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    if (!data.user_profile || !data.user_profile.updated_at) {
      return 0.5 // Default freshness if no update date
    }

    const updateDate = new Date(data.user_profile.updated_at)
    const now = new Date()
    const daysSinceUpdate = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24)

    // Freshness decreases over time
    if (daysSinceUpdate < 1) return 1.0
    if (daysSinceUpdate < 7) return 0.9
    if (daysSinceUpdate < 30) return 0.7
    if (daysSinceUpdate < 90) return 0.5
    return 0.3
  }

  private calculateUserConfidence(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on profile completeness
    if (data.user_profile) {
      confidence += 0.2
      
      if (data.user_profile.name) confidence += 0.1
      if (data.user_profile.role) confidence += 0.1
    }

    if (data.expertise && data.expertise.level) {
      confidence += 0.1
    }

    if (data.writing_style && data.writing_style.tone) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }
}
