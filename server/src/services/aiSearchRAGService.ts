import { logger } from '../utils/logger'
import {
  searchPortfolios,
  searchPrograms,
  searchProjects,
  searchDocuments,
  searchProjectTasks,
  searchChecklistItems,
  searchTodos,
  searchTemplates,
  searchUsers,
  searchKnowledgeBase,
  SearchResult,
  UniversalSearchRequest
} from './searchService'
import GKGEnrichedSearchService, {
  GKGEnrichedResult,
  GKGEnrichedSearchRequest
} from './gkgEnrichedSearch'
import { aiService } from './aiService'

export interface AssistedSearchRequest extends GKGEnrichedSearchRequest {
  includeAnswer?: boolean
  maxContextItems?: number
  provider?: string
  model?: string
  systemPrompt?: string
}

export interface AssistedSearchSource {
  id: string
  type: string
  title: string
  relevanceScore: number
  relationshipCount: number
  knowledgeRecommendationCount: number
}

export interface ContextAssemblyResponse {
  query: string
  totalResults: number
  results: GKGEnrichedResult[]
  sources: AssistedSearchSource[]
  followUpSuggestions: string[]
  contextPrompt: string
}

export interface AssistedSearchResponse extends ContextAssemblyResponse {
  answer?: string
  providerUsed?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class AISearchRAGService {
  private resolveTypes(types?: string[]): string[] {
    if (types && types.length > 0) {
      return types
    }

    return [
      'portfolio',
      'program',
      'project',
      'document',
      'task',
      'checklist_item',
      'todo',
      'template',
      'user'
    ]
  }

  private async runBaseSearch(
    request: UniversalSearchRequest,
    userId: string
  ): Promise<SearchResult[]> {
    const typesToSearch = this.resolveTypes(request.types)
    const searchPromises: Promise<SearchResult[]>[] = []

    if (typesToSearch.includes('portfolio')) {
      searchPromises.push(searchPortfolios(request, userId))
    }
    if (typesToSearch.includes('program')) {
      searchPromises.push(searchPrograms(request, userId))
    }
    if (typesToSearch.includes('project')) {
      searchPromises.push(searchProjects(request, userId))
    }
    if (typesToSearch.includes('document')) {
      searchPromises.push(searchDocuments(request, userId))
    }
    if (typesToSearch.includes('task')) {
      searchPromises.push(searchProjectTasks(request, userId))
    }
    if (typesToSearch.includes('checklist_item')) {
      searchPromises.push(searchChecklistItems(request, userId))
    }
    if (typesToSearch.includes('todo')) {
      searchPromises.push(searchTodos(request, userId))
    }
    if (typesToSearch.includes('template')) {
      searchPromises.push(searchTemplates(request, userId))
    }
    if (typesToSearch.includes('user')) {
      searchPromises.push(searchUsers(request, userId))
    }

    // Add knowledge base search to assisted search queries
    // This enables semantic search with 10 AI transformation KB entries
    if (typesToSearch.includes('knowledge_base') || (!request.types || request.types.length === 0)) {
      searchPromises.push(searchKnowledgeBase(request))
    }

    const groupedResults = await Promise.all(searchPromises)
    return groupedResults.flat()
  }

  private sortResults(
    results: GKGEnrichedResult[],
    sortBy: 'relevance' | 'date' | 'title' = 'relevance'
  ): GKGEnrichedResult[] {
    if (sortBy === 'date') {
      return [...results].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    }

    if (sortBy === 'title') {
      return [...results].sort((a, b) => a.title.localeCompare(b.title))
    }

    return [...results].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
  }

  private buildSources(results: GKGEnrichedResult[], maxSources: number): AssistedSearchSource[] {
    return results.slice(0, maxSources).map(result => ({
      id: result.id,
      type: result.type,
      title: result.title,
      relevanceScore: result.relevance_score || 0,
      relationshipCount: result.gkgMetadata?.relationships?.length || 0,
      knowledgeRecommendationCount: result.gkgMetadata?.knowledgeRecommendations?.length || 0
    }))
  }

  private buildContextPrompt(results: GKGEnrichedResult[], query: string, maxItems: number): string {
    const selected = results.slice(0, maxItems)

    if (selected.length === 0) {
      return `No internal ADPA search context was found for query: ${query}`
    }

    const lines: string[] = [
      `ADPA Assisted Search Context for query: "${query}"`,
      'Use this context as primary internal evidence before external assumptions.',
      ''
    ]

    selected.forEach((result, index) => {
      const relationships = result.gkgMetadata?.relationships || []
      const knowledge = result.gkgMetadata?.knowledgeRecommendations || []
      lines.push(
        `[Source ${index + 1}]`,
        `ID: ${result.id}`,
        `Type: ${result.type}`,
        `Title: ${result.title}`,
        `Description: ${result.description || 'N/A'}`,
        `Preview: ${result.content_preview || 'N/A'}`,
        `Relevance Score: ${Number(result.relevance_score || 0).toFixed(3)}`
      )

      if (relationships.length > 0) {
        lines.push(
          `Top Relationships: ${relationships
            .slice(0, 3)
            .map(r => `${r.type} -> ${r.targetTitle} (${r.targetType})`)
            .join('; ')}`
        )
      }

      if (knowledge.length > 0) {
        lines.push(
          `Knowledge Recommendations: ${knowledge
            .slice(0, 2)
            .map(k => `${k.title} [${k.category}]`)
            .join('; ')}`
        )
      }

      lines.push('')
    })

    return lines.join('\n')
  }

  private async buildFollowUpSuggestions(
    results: GKGEnrichedResult[],
    fallbackQuery: string
  ): Promise<string[]> {
    const topResult = results[0]

    if (!topResult) {
      return [
        `${fallbackQuery} project dependencies`,
        `${fallbackQuery} lessons learned`,
        `${fallbackQuery} risk impacts`
      ]
    }

    const graphSuggestions = await GKGEnrichedSearchService.getSuggestedFollowUps(
      topResult.id,
      topResult.type
    )

    if (graphSuggestions.length > 0) {
      return graphSuggestions
    }

    return [
      `${topResult.title} related projects`,
      `${topResult.title} implementation risks`,
      `${topResult.title} historical outcomes`
    ]
  }

  async assembleContext(
    request: AssistedSearchRequest,
    userId: string
  ): Promise<ContextAssemblyResponse> {
    const baseRequest: UniversalSearchRequest = {
      query: request.query,
      types: request.types,
      frameworks: request.frameworks,
      authors: request.authors,
      tags: request.tags,
      dateRange: request.dateRange,
      limit: Math.min(request.limit || 20, 50),
      offset: request.offset || 0,
      sortBy: request.sortBy || 'relevance',
      useSemanticSearch: true,
      searchMode: 'hybrid'
    }

    const rawResults = await this.runBaseSearch(baseRequest, userId)

    const enriched = await GKGEnrichedSearchService.enrichResults(
      rawResults,
      {
        ...request,
        includeRelationships: request.includeRelationships !== false,
        includeKnowledgeBase: request.includeKnowledgeBase !== false,
        relationshipDepth: request.relationshipDepth || 2
      },
      userId
    )

    const sorted = this.sortResults(enriched, request.sortBy || 'relevance')
    const limit = request.limit || 20
    const offset = request.offset || 0
    const paginated = sorted.slice(offset, offset + limit)
    const maxContextItems = Math.min(request.maxContextItems || 8, 15)

    const contextPrompt = this.buildContextPrompt(paginated, request.query, maxContextItems)
    const sources = this.buildSources(paginated, maxContextItems)
    const followUpSuggestions = await this.buildFollowUpSuggestions(paginated, request.query)

    return {
      query: request.query,
      totalResults: sorted.length,
      results: paginated,
      sources,
      followUpSuggestions,
      contextPrompt
    }
  }

  async assistedSearch(
    request: AssistedSearchRequest,
    userId: string
  ): Promise<AssistedSearchResponse> {
    const context = await this.assembleContext(request, userId)

    if (request.includeAnswer === false) {
      return context
    }

    const assistantPrompt = [
      request.systemPrompt ||
        'You are ADPA AI Search Assistant. Answer using the provided ADPA context with clear, actionable guidance.',
      '',
      'Rules:',
      '- Prioritize provided internal context over assumptions.',
      '- Explicitly mention uncertainty if context is insufficient.',
      '- Include short source references by title in your answer.',
      '',
      `User Query: ${request.query}`,
      '',
      context.contextPrompt,
      '',
      'Return a concise response with recommendations and cited source titles.'
    ].join('\n')

    try {
      const aiResponse = await aiService.generateWithFallback({
        userId,
        provider: request.provider || 'openai',
        model: request.model,
        prompt: assistantPrompt,
        temperature: 0.2,
        max_tokens: 1200,
        aiCallType: 'assisted_search',
        requestedGeneration: 'ai_search_rag_answer',
        metadata: {
          query: request.query,
          sourceCount: context.sources.length,
          totalResults: context.totalResults
        }
      })

      return {
        ...context,
        answer: aiResponse.content,
        usage: aiResponse.usage,
        providerUsed: aiResponse.providerUsed
      }
    } catch (error: any) {
      logger.error('[AI-SEARCH-RAG] Assisted answer generation failed', {
        query: request.query,
        error: error.message
      })

      return {
        ...context,
        answer: undefined
      }
    }
  }
}

export const aiSearchRAGService = new AISearchRAGService()
export default aiSearchRAGService
