/**
 * Project Data Context Retriever
 * Retrieves context data from project information
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import { BaseContextRetriever } from './base'
import type {
  ContextSource,
  ContextInjectionRequest
} from '../types'

export class ProjectDataRetriever extends BaseContextRetriever {
  protected sourceType = 'project_data'

  protected validateSourceSpecific(source: ContextSource): void {
    if (!source.parameters?.project_id && !source.query) {
      throw new Error('Project data source requires project_id parameter or custom query')
    }
  }

  protected async fetchData(source: ContextSource, request: ContextInjectionRequest): Promise<any> {
    const projectId = source.parameters?.project_id || request.project_id

    if (!projectId) {
      throw new Error('Project ID is required for project data retrieval')
    }

    // Use custom query if provided, otherwise use default project data query
    const query = source.query || this.getDefaultProjectQuery()
    const parameters = source.parameters || { project_id: projectId }

    try {
      logger.debug('Fetching project data', { project_id: projectId, query })

      // Replace parameters in query
      const processedQuery = this.processQuery(query, parameters)
      
      const result = await pool.query(processedQuery.query, processedQuery.params)

      return {
        project_id: projectId,
        data: result.rows,
        metadata: {
          row_count: result.rows.length,
          query_used: processedQuery.query
        }
      }

    } catch (error) {
      logger.error('Failed to fetch project data', {
        project_id: projectId,
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

    // Process project data into structured format
    const processedData = {
      project_info: this.extractProjectInfo(data.data),
      stakeholders: this.extractStakeholders(data.data),
      documents: this.extractDocuments(data.data),
      requirements: this.extractRequirements(data.data),
      timeline: this.extractTimeline(data.data),
      budget: this.extractBudget(data.data),
      risks: this.extractRisks(data.data),
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
    
    // Calculate project-specific relevance
    const relevanceScore = this.calculateProjectRelevance(data, source, request)
    
    // Calculate freshness based on project update dates
    const freshnessScore = this.calculateProjectFreshness(data, source, request)
    
    // Calculate confidence based on data completeness
    const confidenceScore = this.calculateProjectConfidence(data, source, request)

    return {
      ...baseMetadata,
      relevance_score: relevanceScore,
      freshness_score: freshnessScore,
      confidence_score: confidenceScore
    }
  }

  private getDefaultProjectQuery(): string {
    return `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.start_date,
        p.end_date,
        p.budget,
        p.created_at,
        p.updated_at,
        p.metadata
      FROM projects p
      WHERE p.id = $1 AND p.deleted_at IS NULL
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

  private extractProjectInfo(rows: any[]): any {
    const projectRow = rows.find(row => row.id && row.name)
    if (!projectRow) return null

    return {
      id: projectRow.id,
      name: projectRow.name,
      description: projectRow.description,
      status: projectRow.status,
      start_date: projectRow.start_date,
      end_date: projectRow.end_date,
      budget: projectRow.budget,
      metadata: projectRow.metadata
    }
  }

  private extractStakeholders(rows: any[]): any[] {
    // This would typically come from a separate stakeholders query
    // For now, return empty array - will be implemented when stakeholder data is available
    return []
  }

  private extractDocuments(rows: any[]): any[] {
    // This would typically come from a separate documents query
    // For now, return empty array - will be implemented when document data is available
    return []
  }

  private extractRequirements(rows: any[]): any[] {
    // This would typically come from a separate requirements query
    // For now, return empty array - will be implemented when requirements data is available
    return []
  }

  private extractTimeline(rows: any[]): any {
    const projectRow = rows.find(row => row.id && row.name)
    if (!projectRow) return null

    return {
      start_date: projectRow.start_date,
      end_date: projectRow.end_date,
      duration_days: projectRow.start_date && projectRow.end_date 
        ? Math.ceil((new Date(projectRow.end_date).getTime() - new Date(projectRow.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : null
    }
  }

  private extractBudget(rows: any[]): any {
    const projectRow = rows.find(row => row.id && row.name)
    if (!projectRow) return null

    return {
      budget: projectRow.budget,
      currency: 'USD' // Default - could be extracted from metadata
    }
  }

  private extractRisks(rows: any[]): any[] {
    // This would typically come from a separate risks query
    // For now, return empty array - will be implemented when risk data is available
    return []
  }

  private calculateProjectRelevance(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    // Base relevance from source weight
    let relevance = source.weight || 0.5

    // Increase relevance if project data is comprehensive
    if (data.project_info && data.project_info.name) {
      relevance += 0.2
    }

    if (data.timeline && data.timeline.start_date) {
      relevance += 0.1
    }

    if (data.budget && data.budget.budget) {
      relevance += 0.1
    }

    return Math.min(relevance, 1.0)
  }

  private calculateProjectFreshness(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    if (!data.project_info || !data.project_info.updated_at) {
      return 0.5 // Default freshness if no update date
    }

    const updateDate = new Date(data.project_info.updated_at)
    const now = new Date()
    const daysSinceUpdate = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24)

    // Freshness decreases over time
    if (daysSinceUpdate < 1) return 1.0
    if (daysSinceUpdate < 7) return 0.9
    if (daysSinceUpdate < 30) return 0.7
    if (daysSinceUpdate < 90) return 0.5
    return 0.3
  }

  private calculateProjectConfidence(data: any, source: ContextSource, request: ContextInjectionRequest): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on data completeness
    if (data.project_info) {
      confidence += 0.2
      
      if (data.project_info.description) confidence += 0.1
      if (data.project_info.status) confidence += 0.1
      if (data.timeline && data.timeline.start_date) confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }
}
