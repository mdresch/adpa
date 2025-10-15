/**
 * Document History Context Retriever
 * Retrieves context data from historical documents
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import { BaseContextRetriever } from './base'
import type {
  ContextSource,
  ContextInjectionRequest
} from '../types'

export class DocumentHistoryRetriever extends BaseContextRetriever {
  protected sourceType = 'document_history'

  protected validateSourceSpecific(source: ContextSource): void {
    // Document history can work with various parameters
    // No specific validation required
  }

  protected async fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any> {
    // Use custom query if provided, otherwise use default document history query
    const query = source.query || this.getDefaultDocumentQuery()
    const parameters = source.parameters || {
      template_id: request.template_id,
      project_id: request.project_id,
      user_id: request.user_id
    }

    try {
      logger.debug('Fetching document history', { parameters, query })

      // Replace parameters in query
      const processedQuery = this.processQuery(query, parameters)
      
      const result = await pool.query(processedQuery.query, processedQuery.params)

      return {
        parameters,
        data: result.rows,
        metadata: {
          row_count: result.rows.length,
          query_used: processedQuery.query
        }
      }

    } catch (error) {
      logger.error('Failed to fetch document history', {
        parameters,
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

    // Process document history into structured format
    const processedData = {
      similar_documents: this.extractSimilarDocuments(data.data),
      patterns: this.extractPatterns(data.data),
      best_practices: this.extractBestPractices(data.data),
      common_issues: this.extractCommonIssues(data.data),
      quality_metrics: this.extractQualityMetrics(data.data),
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
    
    // Calculate document history relevance
    const relevanceScore = this.calculateHistoryRelevance(data, source, request)
    
    // Calculate freshness based on document creation dates
    const freshnessScore = this.calculateHistoryFreshness(data, source, request)
    
    // Calculate confidence based on data quality
    const confidenceScore = this.calculateHistoryConfidence(data, source, request)

    return {
      ...baseMetadata,
      relevance_score: relevanceScore,
      freshness_score: freshnessScore,
      confidence_score: confidenceScore
    }
  }

  private getDefaultDocumentQuery(): string {
    return `
      SELECT 
        d.id,
        d.name,
        d.content,
        d.template_id,
        d.project_id,
        d.created_by,
        d.created_at,
        d.updated_at,
        d.metadata,
        t.name as template_name,
        t.framework,
        t.category
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.deleted_at IS NULL
      AND (d.template_id = $1 OR d.project_id = $2 OR d.created_by = $3)
      ORDER BY d.updated_at DESC
      LIMIT 50
    `
  }

  private processQuery(query: string, parameters: Record<string, any>): { query: string; params: any[] } {
    let processedQuery = query
    const params: any[] = []
    let paramIndex = 1

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

  private extractSimilarDocuments(rows: any[]): any[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      template_id: row.template_id,
      template_name: row.template_name,
      framework: row.framework,
      category: row.category,
      created_at: row.created_at,
      updated_at: row.updated_at,
      content_length: row.content ? row.content.length : 0,
      metadata: row.metadata
    }))
  }

  private extractPatterns(rows: any[]): any {
    const patterns = {
      common_sections: this.findCommonSections(rows),
      frequent_variables: this.findFrequentVariables(rows),
      content_structure: this.analyzeContentStructure(rows),
      quality_trends: this.analyzeQualityTrends(rows)
    }

    return patterns
  }

  private extractBestPractices(rows: any[]): any[] {
    // Analyze documents to identify best practices
    const bestPractices = []

    // Example: Documents with high quality scores
    const highQualityDocs = rows.filter(row => 
      row.metadata && 
      row.metadata.quality_score && 
      row.metadata.quality_score > 0.8
    )

    if (highQualityDocs.length > 0) {
      bestPractices.push({
        type: 'high_quality_structure',
        description: 'Documents with high quality scores',
        examples: highQualityDocs.slice(0, 3).map(doc => ({
          id: doc.id,
          name: doc.name,
          quality_score: doc.metadata.quality_score
        }))
      })
    }

    return bestPractices
  }

  private extractCommonIssues(rows: any[]): any[] {
    const issues = []

    // Example: Documents with low quality scores
    const lowQualityDocs = rows.filter(row => 
      row.metadata && 
      row.metadata.quality_score && 
      row.metadata.quality_score < 0.5
    )

    if (lowQualityDocs.length > 0) {
      issues.push({
        type: 'low_quality_content',
        description: 'Documents with low quality scores',
        count: lowQualityDocs.length,
        examples: lowQualityDocs.slice(0, 3).map(doc => ({
          id: doc.id,
          name: doc.name,
          quality_score: doc.metadata.quality_score
        }))
      })
    }

    return issues
  }

  private extractQualityMetrics(rows: any[]): any {
    if (rows.length === 0) return null

    const qualityScores = rows
      .filter(row => row.metadata && row.metadata.quality_score)
      .map(row => row.metadata.quality_score)

    if (qualityScores.length === 0) return null

    const average = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    const min = Math.min(...qualityScores)
    const max = Math.max(...qualityScores)

    return {
      average_quality_score: average,
      min_quality_score: min,
      max_quality_score: max,
      total_documents: rows.length,
      documents_with_quality_scores: qualityScores.length
    }
  }

  private findCommonSections(rows: any[]): string[] {
    // This would analyze document content to find common sections
    // For now, return common section names based on template categories
    const sections = new Set<string>()
    
    rows.forEach(row => {
      if (row.category) {
        sections.add(row.category)
      }
    })

    return Array.from(sections)
  }

  private findFrequentVariables(rows: any[]): string[] {
    // This would analyze document content to find frequent variables
    // For now, return common variable names
    return ['project_name', 'author', 'date', 'version', 'description']
  }

  private analyzeContentStructure(rows: any[]): any {
    return {
      average_length: rows.reduce((sum, row) => sum + (row.content?.length || 0), 0) / rows.length,
      common_frameworks: [...new Set(rows.map(row => row.framework).filter(Boolean))],
      common_categories: [...new Set(rows.map(row => row.category).filter(Boolean))]
    }
  }

  private analyzeQualityTrends(rows: any[]): any {
    const qualityScores = rows
      .filter(row => row.metadata && row.metadata.quality_score)
      .map(row => ({
        date: row.updated_at,
        score: row.metadata.quality_score
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (qualityScores.length === 0) return null

    const recentScores = qualityScores.slice(-10)
    const averageRecent = recentScores.reduce((sum, item) => sum + item.score, 0) / recentScores.length

    return {
      trend: averageRecent > 0.7 ? 'improving' : averageRecent < 0.5 ? 'declining' : 'stable',
      recent_average: averageRecent,
      total_data_points: qualityScores.length
    }
  }

  private calculateHistoryRelevance(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let relevance = source.weight || 0.5

    if (data.similar_documents && data.similar_documents.length > 0) {
      relevance += 0.2
    }

    if (data.patterns && data.patterns.common_sections && data.patterns.common_sections.length > 0) {
      relevance += 0.1
    }

    if (data.best_practices && data.best_practices.length > 0) {
      relevance += 0.1
    }

    return Math.min(relevance, 1.0)
  }

  private calculateHistoryFreshness(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    if (!data.similar_documents || data.similar_documents.length === 0) {
      return 0.5
    }

    const now = new Date()
    const recentDocs = data.similar_documents.filter((doc: any) => {
      const docDate = new Date(doc.updated_at)
      const daysDiff = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 30
    })

    return recentDocs.length / data.similar_documents.length
  }

  private calculateHistoryConfidence(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let confidence = 0.5

    if (data.similar_documents && data.similar_documents.length >= 5) {
      confidence += 0.2
    }

    if (data.quality_metrics && data.quality_metrics.average_quality_score > 0.7) {
      confidence += 0.2
    }

    if (data.patterns && data.patterns.common_sections && data.patterns.common_sections.length > 0) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }
}
