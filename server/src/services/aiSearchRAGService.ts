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
  includeStale?: boolean
  maxPromptTokens?: number
  projectIds?: string[]
}

export interface AssistedSearchSource {
  id: string
  type: string
  title: string
  relevanceScore: number
  accuracyScore: number
  freshnessScore: number
  compositeScore: number
  relationshipCount: number
  knowledgeRecommendationCount: number
  estimatedTokens: number
  updatedAt: string
  isFresh: boolean
}

export interface ContextAssemblyMetrics {
  retrievalLatencyMs: number
  enrichmentLatencyMs: number
  totalLatencyMs: number
  tokenBudget: number
  tokenCount: number
  selectedSourceCount: number
  filteredOutCount: number
  staleItemCount: number
  truncationApplied: boolean
}

export interface ContextAssemblyResponse {
  query: string
  totalResults: number
  results: ScoredContextResult[]
  sources: AssistedSearchSource[]
  followUpSuggestions: string[]
  contextPrompt: string
  metrics: ContextAssemblyMetrics
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

export interface ScoredContextResult extends GKGEnrichedResult {
  accuracyScore: number
  freshnessScore: number
  compositeScore: number
  estimatedTokens: number
  isFresh: boolean
  accessValidated: boolean
  validationWarnings: string[]
}

const DEFAULT_MAX_CONTEXT_ITEMS = 8
const MAX_CONTEXT_ITEMS = 15
const DEFAULT_MAX_PROMPT_TOKENS = 1800
const MAX_PROMPT_TOKENS = 6000
const STALE_CONTENT_DAYS = 180

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

  private filterResultsToProjects(results: SearchResult[], projectIds?: string[]): SearchResult[] {
    if (!projectIds || projectIds.length === 0) {
      return results
    }

    const allowedProjectIds = new Set(projectIds)

    return results.filter((result) => {
      if (result.project_id) {
        return allowedProjectIds.has(result.project_id)
      }

      if (result.type === 'project') {
        return allowedProjectIds.has(result.id)
      }

      return false
    })
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

    if (typesToSearch.includes('knowledge_base') || (!request.types || request.types.length === 0)) {
      searchPromises.push(searchKnowledgeBase(request))
    }

    const groupedResults = await Promise.all(searchPromises)
    return groupedResults.flat()
  }

  private normalizeScore(score: number | undefined | null): number {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return 0
    }

    return Math.max(0, Math.min(1, score))
  }

  private estimateTokens(...parts: Array<string | undefined>): number {
    const text = parts.filter(Boolean).join(' ').trim()
    if (!text) {
      return 0
    }

    return Math.max(1, Math.ceil(text.length / 4))
  }

  private calculateFreshnessScore(updatedAt?: string): number {
    if (!updatedAt) {
      return 0.2
    }

    const parsed = new Date(updatedAt).getTime()
    if (Number.isNaN(parsed)) {
      return 0.2
    }

    const ageDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24)

    if (ageDays <= 7) return 1
    if (ageDays <= 30) return 0.9
    if (ageDays <= 90) return 0.7
    if (ageDays <= 180) return 0.45
    if (ageDays <= 365) return 0.2
    return 0.05
  }

  private calculateAccuracyScore(result: GKGEnrichedResult): number {
    let score = 0.2

    if (result.title?.trim()) score += 0.2
    if (result.description?.trim()) score += 0.15
    if (result.content_preview?.trim()) score += 0.2
    if (result.project_id || result.project_name) score += 0.05
    if (result.author?.trim()) score += 0.05
    if (Array.isArray(result.tags) && result.tags.length > 0) score += 0.05
    if (result.gkgMetadata?.relationships?.length) score += 0.05
    if (result.gkgMetadata?.knowledgeRecommendations?.length) score += 0.05
    if (typeof result.gkgMetadata?.confidenceScore === 'number') {
      score += this.normalizeScore(result.gkgMetadata.confidenceScore) * 0.05
    }

    const relevanceSignal = this.normalizeScore(result.relevance_score)
    score += relevanceSignal * 0.2

    return this.normalizeScore(score)
  }

  private validateAndScoreResults(
    results: GKGEnrichedResult[],
    includeStale: boolean
  ): { scoredResults: ScoredContextResult[]; filteredOutCount: number; staleItemCount: number } {
    let filteredOutCount = 0
    let staleItemCount = 0

    const scoredResults = results.reduce<ScoredContextResult[]>((acc, result) => {
      const warnings: string[] = []
      const hasUsableContent = Boolean(
        result.title?.trim() || result.description?.trim() || result.content_preview?.trim()
      )

      if (!hasUsableContent) {
        filteredOutCount += 1
        return acc
      }

      const freshnessScore = this.calculateFreshnessScore(result.updated_at)
      const isFresh = freshnessScore >= 0.45
      if (!isFresh) {
        staleItemCount += 1
        warnings.push('stale_context')
      }

      if (!includeStale && !isFresh) {
        filteredOutCount += 1
        return acc
      }

      const accuracyScore = this.calculateAccuracyScore(result)
      if (!result.description?.trim() && !result.content_preview?.trim()) {
        warnings.push('limited_content')
      }

      const relevanceScore = this.normalizeScore(result.relevance_score)
      const compositeScore = this.normalizeScore(
        relevanceScore * 0.5 +
        freshnessScore * 0.25 +
        accuracyScore * 0.2 +
        (result.gkgMetadata?.relationships?.length ? 0.05 : 0)
      )

      acc.push({
        ...result,
        accuracyScore,
        freshnessScore,
        compositeScore,
        estimatedTokens: this.estimateTokens(result.title, result.description, result.content_preview),
        isFresh,
        accessValidated: true,
        validationWarnings: warnings,
        relevance_score: relevanceScore
      })

      return acc
    }, [])

    return { scoredResults, filteredOutCount, staleItemCount }
  }

  private sortResults(
    results: ScoredContextResult[],
    sortBy: 'relevance' | 'date' | 'title' = 'relevance'
  ): ScoredContextResult[] {
    if (sortBy === 'date') {
      return [...results].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    }

    if (sortBy === 'title') {
      return [...results].sort((a, b) => a.title.localeCompare(b.title))
    }

    return [...results].sort((a, b) => b.compositeScore - a.compositeScore)
  }

  private toSource(result: ScoredContextResult): AssistedSearchSource {
    return {
      id: result.id,
      type: result.type,
      title: result.title,
      relevanceScore: result.relevance_score || 0,
      accuracyScore: result.accuracyScore,
      freshnessScore: result.freshnessScore,
      compositeScore: result.compositeScore,
      relationshipCount: result.gkgMetadata?.relationships?.length || 0,
      knowledgeRecommendationCount: result.gkgMetadata?.knowledgeRecommendations?.length || 0,
      estimatedTokens: result.estimatedTokens,
      updatedAt: result.updated_at,
      isFresh: result.isFresh
    }
  }

  private buildContextBlock(result: ScoredContextResult, index: number, compact = false): string {
    if (compact) {
      return [
        `[Source ${index + 1}]`,
        `Type: ${result.type} | Title: ${result.title}`,
        `Scores: relevance=${result.relevance_score.toFixed(3)}, freshness=${result.freshnessScore.toFixed(3)}, composite=${result.compositeScore.toFixed(3)}`,
        ''
      ].join('\n')
    }

    const relationships = result.gkgMetadata?.relationships || []
    const knowledge = result.gkgMetadata?.knowledgeRecommendations || []

    const lines: string[] = [
      `[Source ${index + 1}]`,
      `ID: ${result.id}`,
      `Type: ${result.type}`,
      `Title: ${result.title}`,
      `Description: ${result.description || 'N/A'}`,
      `Preview: ${result.content_preview || 'N/A'}`,
      `Scores: relevance=${result.relevance_score.toFixed(3)}, accuracy=${result.accuracyScore.toFixed(3)}, freshness=${result.freshnessScore.toFixed(3)}, composite=${result.compositeScore.toFixed(3)}`,
      `Freshness: ${result.isFresh ? 'fresh' : 'stale'} | Updated: ${result.updated_at || 'unknown'}`
    ]

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

    if (result.validationWarnings.length > 0) {
      lines.push(`Validation Warnings: ${result.validationWarnings.join(', ')}`)
    }

    lines.push('')
    return lines.join('\n')
  }

  private buildContextPrompt(
    results: ScoredContextResult[],
    query: string,
    maxItems: number,
    maxPromptTokens: number
  ): { contextPrompt: string; selectedResults: ScoredContextResult[]; tokenCount: number; truncationApplied: boolean } {
    const selected = results.slice(0, maxItems)

    if (selected.length === 0) {
      return {
        contextPrompt: `No internal ADPA search context was found for query: ${query}`,
        selectedResults: [],
        tokenCount: this.estimateTokens(query),
        truncationApplied: false
      }
    }

    const header = [
      `ADPA Assisted Search Context for query: "${query}"`,
      'Use this context as primary internal evidence before external assumptions.',
      'Items are validated for usability, freshness, and scoring before inclusion.',
      ''
    ].join('\n')

    const headerTokens = this.estimateTokens(header)
    let usedTokens = headerTokens
    const chosen: ScoredContextResult[] = []
    const blocks: string[] = [header]
    let truncationApplied = false

    selected.forEach((result, index) => {
      const fullBlock = this.buildContextBlock(result, index)
      const fullBlockTokens = this.estimateTokens(fullBlock)

      if (usedTokens + fullBlockTokens <= maxPromptTokens) {
        chosen.push(result)
        blocks.push(fullBlock)
        usedTokens += fullBlockTokens
        return
      }

      const compactBlock = this.buildContextBlock(result, index, true)
      const compactBlockTokens = this.estimateTokens(compactBlock)

      if (usedTokens + compactBlockTokens <= maxPromptTokens) {
        truncationApplied = true
        chosen.push(result)
        blocks.push(compactBlock)
        usedTokens += compactBlockTokens
        return
      }

      truncationApplied = true
    })

    return {
      contextPrompt: blocks.join('\n'),
      selectedResults: chosen,
      tokenCount: usedTokens,
      truncationApplied
    }
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
    const startedAt = Date.now()
    const limit = Math.min(request.limit || 20, 50)
    const offset = request.offset || 0
    const baseRequest: UniversalSearchRequest = {
      query: request.query,
      types: request.types,
      frameworks: request.frameworks,
      authors: request.authors,
      tags: request.tags,
      dateRange: request.dateRange,
      limit: Math.min(limit + offset, 50),
      offset: 0,
      sortBy: request.sortBy || 'relevance',
      useSemanticSearch: true,
      searchMode: 'hybrid'
    }

    const retrievalStartedAt = Date.now()
    const rawResults = this.filterResultsToProjects(
      await this.runBaseSearch(baseRequest, userId),
      request.projectIds
    )
    const retrievalLatencyMs = Date.now() - retrievalStartedAt

    const enrichmentStartedAt = Date.now()
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
    const enrichmentLatencyMs = Date.now() - enrichmentStartedAt

    const includeStale = request.includeStale !== false
    const { scoredResults, filteredOutCount, staleItemCount } = this.validateAndScoreResults(
      enriched,
      includeStale
    )

    const sorted = this.sortResults(scoredResults, request.sortBy || 'relevance')
    const paginated = sorted.slice(offset, offset + limit)
    const maxContextItems = Math.min(request.maxContextItems || DEFAULT_MAX_CONTEXT_ITEMS, MAX_CONTEXT_ITEMS)
    const maxPromptTokens = Math.min(request.maxPromptTokens || DEFAULT_MAX_PROMPT_TOKENS, MAX_PROMPT_TOKENS)

    const promptData = this.buildContextPrompt(paginated, request.query, maxContextItems, maxPromptTokens)
    const sources = promptData.selectedResults.map(result => this.toSource(result))
    let followUpSuggestions: string[] = []
    try {
      followUpSuggestions = await this.buildFollowUpSuggestions(paginated, request.query)
    } catch (error: any) {
      logger.warn('[AI-SEARCH-RAG] Follow-up suggestion generation failed', {
        query: request.query,
        userId,
        error: error?.message || String(error)
      })
    }
    const totalLatencyMs = Date.now() - startedAt

    const metrics: ContextAssemblyMetrics = {
      retrievalLatencyMs,
      enrichmentLatencyMs,
      totalLatencyMs,
      tokenBudget: maxPromptTokens,
      tokenCount: promptData.tokenCount,
      selectedSourceCount: sources.length,
      filteredOutCount,
      staleItemCount,
      truncationApplied: promptData.truncationApplied
    }

    logger.info('[AI-SEARCH-RAG] Context assembly completed', {
      query: request.query,
      userId,
      totalRawResults: rawResults.length,
      totalValidatedResults: sorted.length,
      selectedSourceCount: sources.length,
      ...metrics
    })

    return {
      query: request.query,
      totalResults: sorted.length,
      results: paginated,
      sources,
      followUpSuggestions,
      contextPrompt: promptData.contextPrompt,
      metrics
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
      '- Prefer fresher, higher-confidence context when sources conflict.',
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
          totalResults: context.totalResults,
          contextTokenCount: context.metrics.tokenCount,
          truncated: context.metrics.truncationApplied
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
