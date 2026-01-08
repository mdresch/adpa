/**
 * Semantic Search Integration Service
 * Integrates OpenAI embeddings with the context repository for semantic search
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import { OpenAIEmbeddingsService } from './openaiEmbeddingsService'
import { ContextRepository } from '../../contextRepository/contextRepository'
import type {
  ContextRetrievalResult,
  ContextType,
  ContextFilters
} from '../types'

export interface SemanticSearchIntegrationConfig {
  openaiApiKey: string
  model: string
  maxTokens: number
  similarityThreshold: number
  maxResults: number
  enableCaching: boolean
  cacheExpiryHours: number
}

export class SemanticSearchIntegrationService {
  private embeddingsService: OpenAIEmbeddingsService
  private contextRepository: ContextRepository
  private config: SemanticSearchIntegrationConfig

  constructor(config: SemanticSearchIntegrationConfig) {
    this.config = config
    this.embeddingsService = new OpenAIEmbeddingsService({
      apiKey: config.openaiApiKey,
      model: config.model,
      maxTokens: config.maxTokens,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: config.maxResults,
      rateLimitPerMinute: 3000
    })
    this.contextRepository = new ContextRepository()
  }

  async indexContextData(): Promise<void> {
    try {
      logger.info('Starting context data indexing for semantic search')

      // Index project data
      await this.indexProjectData()

      // Index user profiles
      await this.indexUserProfiles()

      // Index document history
      await this.indexDocumentHistory()

      logger.info('Context data indexing completed successfully')

    } catch (error) {
      logger.error('Failed to index context data', {
        error: error.message
      })
      throw error
    }
  }

  async searchContextSemantically(
    query: string,
    contextTypes: ContextType[],
    filters?: ContextFilters
  ): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Performing semantic context search', {
        query: query.substring(0, 100),
        contextTypes,
        filters
      })

      // Generate embeddings for the query
      const queryEmbeddings = await this.embeddingsService.generateEmbeddings(query)

      // Search for similar content
      const similarResults = await this.embeddingsService.findSimilarEmbeddings(
        queryEmbeddings,
        this.config.maxResults,
        this.config.similarityThreshold
      )

      // Convert to ContextRetrievalResult format
      const results: ContextRetrievalResult[] = await Promise.all(
        similarResults.map(async result => ({
          id: result.id,
          type: this.determineContextType(result.content),
          content: result.content,
          title: this.extractTitle(result.content),
          relevanceScore: result.similarity,
          source: 'semantic_search',
          sourceId: result.id,
          metadata: await this.getContextMetadata(result.id),
          keywords: await this.extractKeywords(result.content),
          timestamp: new Date(),
          freshness: 1,
          authority: 0.8,
          popularity: 0.5
        }))
      )

      // Filter by context types if specified
      const filteredResults = contextTypes.length > 0
        ? results.filter(result => contextTypes.includes(result.type))
        : results

      logger.info('Semantic context search completed', {
        query: query.substring(0, 100),
        totalResults: similarResults.length,
        filteredResults: filteredResults.length
      })

      return filteredResults

    } catch (error) {
      logger.error('Failed to perform semantic context search', {
        query: query.substring(0, 100),
        contextTypes,
        error: error.message
      })
      return []
    }
  }

  async updateContextEmbeddings(contextId: string, contextType: ContextType): Promise<void> {
    try {
      logger.debug('Updating context embeddings', { contextId, contextType })

      // Get context data based on type
      const contextData = await this.getContextData(contextId, contextType)
      if (!contextData) {
        logger.warn('Context data not found', { contextId, contextType })
        return
      }

      // Generate embeddings for the context
      const embeddings = await this.embeddingsService.generateEmbeddings(contextData.content)

      // Update search index
      await pool.query(
        `
        SELECT update_search_index_embeddings_jsonb($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          contextData.content,
          contextType,
          contextData.source,
          contextId,
          JSON.stringify(embeddings),
          contextData.keywords || [],
          JSON.stringify(contextData.metadata || {})
        ]
      )

      logger.info('Context embeddings updated successfully', {
        contextId,
        contextType,
        embeddingDimensions: embeddings.length
      })

    } catch (error) {
      logger.error('Failed to update context embeddings', {
        contextId,
        contextType,
        error: error.message
      })
      throw error
    }
  }

  async getSemanticRecommendations(
    userId: string,
    projectId?: string,
    templateId?: string
  ): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Getting semantic recommendations', { userId, projectId, templateId })

      // Get user context
      const userContext = await this.contextRepository.getDocumentGenerationContext({
        userId,
        projectId: projectId || '',
        templateId: templateId || '',
        framework: undefined,
        category: undefined
      })

      // Create recommendation query based on user context
      const recommendationQuery = this.buildRecommendationQuery(userContext)

      // Perform semantic search
      const recommendations = await this.searchContextSemantically(
        recommendationQuery,
        ['project_data', 'document_history', 'best_practices']
      )

      logger.info('Semantic recommendations generated', {
        userId,
        projectId,
        templateId,
        recommendationsCount: recommendations.length
      })

      return recommendations

    } catch (error) {
      logger.error('Failed to get semantic recommendations', {
        userId,
        projectId,
        templateId,
        error: error.message
      })
      return []
    }
  }

  async getSimilarDocuments(documentId: string, limit: number = 5): Promise<ContextRetrievalResult[]> {
    try {
      logger.debug('Finding similar documents', { documentId, limit })

      // Get document content
      const document = await this.contextRepository.documentHistory.getDocumentHistory(documentId)
      if (!document) {
        logger.warn('Document not found', { documentId })
        return []
      }

      // Generate embeddings for the document
      const documentEmbeddings = await this.embeddingsService.generateEmbeddings(document.content)

      // Find similar documents
      const similarResults = await this.embeddingsService.findSimilarEmbeddings(
        documentEmbeddings,
        limit + 1, // +1 to exclude the original document
        0.7
      )

      // Filter out the original document
      const filteredResults = similarResults.filter(result => result.id !== documentId)

      // Convert to ContextRetrievalResult format
      const results: ContextRetrievalResult[] = await Promise.all(
        filteredResults.map(async result => ({
          id: result.id,
          type: 'document_history' as ContextType,
          content: result.content,
          title: this.extractTitle(result.content),
          relevanceScore: result.similarity,
          source: 'semantic_search',
          sourceId: result.id,
          metadata: await this.getContextMetadata(result.id),
          keywords: await this.extractKeywords(result.content),
          timestamp: new Date(),
          freshness: 1,
          authority: 0.8,
          popularity: 0.5
        }))
      )

      logger.info('Similar documents found', {
        documentId,
        similarCount: results.length
      })

      return results

    } catch (error) {
      logger.error('Failed to find similar documents', {
        documentId,
        error: error.message
      })
      return []
    }
  }

  private async indexProjectData(): Promise<void> {
    try {
      // Get all projects
      const projects = await this.contextRepository.projectContext.searchProjects('')

      for (const project of projects) {
        // Create content string from project data
        const content = this.createProjectContent(project)

        // Generate embeddings
        const embeddings = await this.embeddingsService.generateEmbeddings(content)

        // Index in search
        await pool.query(
          `
          SELECT update_search_index_embeddings_jsonb($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            content,
            'project_data',
            'project_context',
            project.project_id,
            JSON.stringify(embeddings),
            this.extractProjectKeywords(project),
            JSON.stringify({
              project_id: project.project_id,
              name: project.name,
              framework: project.metadata?.framework,
              status: project.status,
              priority: project.priority
            })
          ]
        )
      }

      logger.info('Project data indexed', { projectCount: projects.length })

    } catch (error) {
      logger.error('Failed to index project data', {
        error: error.message
      })
    }
  }

  private async indexUserProfiles(): Promise<void> {
    try {
      // Get all users (this would need to be implemented in the user profile store)
      // For now, we'll skip this as it requires additional user management endpoints

      logger.info('User profiles indexing skipped - requires additional implementation')

    } catch (error) {
      logger.error('Failed to index user profiles', {
        error: error.message
      })
    }
  }

  private async indexDocumentHistory(): Promise<void> {
    try {
      // Get recent documents
      const documents = await this.contextRepository.documentHistory.searchDocuments('', {
        created_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      })

      for (const document of documents) {
        // Generate embeddings
        const embeddings = await this.embeddingsService.generateEmbeddings(document.content)

        // Index in search
        await pool.query(
          `
          SELECT update_search_index_embeddings_jsonb($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            document.content,
            'document_history',
            'document_context',
            document.document_id,
            JSON.stringify(embeddings),
            document.tags,
            JSON.stringify({
              document_id: document.document_id,
              template_id: document.template_id,
              framework: document.framework,
              category: document.category,
              project_id: document.project_id,
              created_by: document.created_by
            })
          ]
        )
      }

      logger.info('Document history indexed', { documentCount: documents.length })

    } catch (error) {
      logger.error('Failed to index document history', {
        error: error.message
      })
    }
  }

  private createProjectContent(project: any): string {
    const parts = [
      `Project: ${project.name}`,
      `Description: ${project.description || ''}`,
      `Status: ${project.status}`,
      `Priority: ${project.priority}`,
      `Framework: ${project.metadata?.framework || ''}`,
      `Stakeholders: ${project.stakeholders?.map((s: any) => s.name).join(', ') || ''}`,
      `Requirements: ${project.requirements?.map((r: any) => r.name).join(', ') || ''}`,
      `Risks: ${project.risks?.map((r: any) => r.name).join(', ') || ''}`
    ]

    return parts.filter(part => part.split(':')[1]?.trim()).join('\n')
  }

  private extractProjectKeywords(project: any): string[] {
    const keywords = [
      project.name,
      project.status,
      project.priority,
      project.metadata?.framework,
      ...(project.stakeholders?.map((s: any) => s.name) || []),
      ...(project.requirements?.map((r: any) => r.name) || []),
      ...(project.risks?.map((r: any) => r.name) || [])
    ]

    return keywords.filter(keyword => keyword && keyword.trim()).map(keyword => keyword.toLowerCase())
  }

  private determineContextType(content: string): ContextType {
    // Simple heuristics to determine context type
    if (content.includes('Project:') || content.includes('Stakeholders:')) {
      return 'project_data'
    }
    if (content.includes('Template:') || content.includes('Framework:')) {
      return 'document_history'
    }
    if (content.includes('Best Practice') || content.includes('Guideline')) {
      return 'best_practices'
    }
    return 'document_history'
  }

  private extractTitle(content: string): string {
    // Extract title from content
    const lines = content.split('\n')
    const firstLine = lines[0] || ''
    
    // Remove prefixes like "Project:", "Document:", etc.
    const title = firstLine.replace(/^(Project|Document|Template|Requirement):\s*/, '')
    
    return title.substring(0, 100)
  }

  private async getContextMetadata(contextId: string): Promise<Record<string, any>> {
    try {
      const result = await pool.query(
        'SELECT metadata FROM search_index WHERE id = $1',
        [contextId]
      )

      return result.rows[0]?.metadata || {}

    } catch (error) {
      logger.error('Failed to get context metadata', {
        contextId,
        error: error.message
      })
      return {}
    }
  }

  private async extractKeywords(content: string): Promise<string[]> {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)

    // Remove duplicates and return
    return [...new Set(words)].slice(0, 20)
  }

  private async getContextData(contextId: string, contextType: ContextType): Promise<any> {
    try {
      switch (contextType) {
        case 'project_data':
          return await this.contextRepository.projectContext.getProject(contextId)
        case 'document_history':
          return await this.contextRepository.documentHistory.getDocumentHistory(contextId)
        default:
          return null
      }
    } catch (error) {
      logger.error('Failed to get context data', {
        contextId,
        contextType,
        error: error.message
      })
      return null
    }
  }

  private buildRecommendationQuery(userContext: any): string {
    const parts = []

    if (userContext.project) {
      parts.push(`Project: ${userContext.project.name}`)
      parts.push(`Framework: ${userContext.project.metadata?.framework || ''}`)
    }

    if (userContext.user) {
      parts.push(`User expertise: ${userContext.user.expertise?.domains?.join(', ') || ''}`)
    }

    if (userContext.similarDocuments.length > 0) {
      parts.push('Similar documents and best practices')
    }

    return parts.filter(part => part.split(':')[1]?.trim()).join('\n')
  }
}
