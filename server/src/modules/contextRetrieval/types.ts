/**
 * Context Retrieval Service Types
 * Defines TypeScript interfaces and types for semantic search and relevance scoring
 */

export interface ContextRetrievalRequest {
  query: string
  contextTypes: ContextType[]
  filters?: ContextFilters
  limit?: number
  minRelevanceScore?: number
  includeMetadata?: boolean
  userId?: string
  projectId?: string
  templateId?: string
  framework?: string
  category?: string
}

export interface ContextRetrievalResult {
  id: string
  type: ContextType
  content: string
  title: string
  relevanceScore: number
  source: string
  sourceId: string
  metadata: Record<string, any>
  embeddings?: number[]
  keywords: string[]
  summary?: string
  timestamp: Date
  freshness: number // 0-1 score based on recency
  authority: number // 0-1 score based on source authority
  popularity: number // 0-1 score based on usage/views
}

export interface ContextRetrievalResponse {
  results: ContextRetrievalResult[]
  totalResults: number
  query: string
  processingTime: number
  searchStrategy: SearchStrategy
  relevanceThreshold: number
  metadata: {
    contextTypes: ContextType[]
    filters: ContextFilters
    userId?: string
    projectId?: string
    templateId?: string
  }
}

export type ContextType = 
  | 'project_data'
  | 'user_preferences' 
  | 'document_history'
  | 'external_api'
  | 'database_query'
  | 'file_content'
  | 'stakeholder_info'
  | 'requirements'
  | 'constraints'
  | 'risks'
  | 'best_practices'
  | 'patterns'
  | 'quality_metrics'
  | 'expertise'
  | 'collaboration_preferences'

export interface ContextFilters {
  dateRange?: {
    from: Date
    to: Date
  }
  frameworks?: string[]
  categories?: string[]
  authors?: string[]
  projects?: string[]
  tags?: string[]
  qualityScore?: {
    min: number
    max: number
  }
  relevanceScore?: {
    min: number
    max: number
  }
  sourceTypes?: string[]
  languages?: string[]
  status?: string[]
  priority?: string[]
}

export type SearchStrategy = 
  | 'semantic'
  | 'keyword'
  | 'hybrid'
  | 'vector_similarity'
  | 'full_text'
  | 'fuzzy'
  | 'exact_match'

export interface SemanticSearchConfig {
  model: string
  embeddingDimensions: number
  similarityThreshold: number
  maxTokens: number
  temperature: number
  topK: number
  includeContext: boolean
  useCache: boolean
  cacheExpiry: number
}

export interface RelevanceScoringConfig {
  weights: {
    semanticSimilarity: number
    keywordMatch: number
    freshness: number
    authority: number
    popularity: number
    userPreference: number
    contextRelevance: number
  }
  normalization: {
    minScore: number
    maxScore: number
    boostFactors: Record<string, number>
  }
  thresholds: {
    highRelevance: number
    mediumRelevance: number
    lowRelevance: number
  }
}

export interface EmbeddingCache {
  id: string
  content: string
  embeddings: number[]
  model: string
  createdAt: Date
  expiresAt: Date
  accessCount: number
  lastAccessed: Date
}

export interface SearchIndex {
  id: string
  content: string
  type: ContextType
  source: string
  sourceId: string
  embeddings: number[]
  keywords: string[]
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  accessCount: number
  relevanceScore: number
}

export interface ContextRetrievalMetrics {
  totalQueries: number
  averageResponseTime: number
  cacheHitRate: number
  relevanceScoreDistribution: {
    high: number
    medium: number
    low: number
  }
  contextTypeDistribution: Record<ContextType, number>
  searchStrategyDistribution: Record<SearchStrategy, number>
  errorRate: number
  topQueries: Array<{
    query: string
    count: number
    averageRelevance: number
  }>
  performanceMetrics: {
    embeddingGenerationTime: number
    similarityCalculationTime: number
    databaseQueryTime: number
    cacheLookupTime: number
  }
}

export interface ContextRetrievalService {
  // Core retrieval methods
  retrieveContext(request: ContextRetrievalRequest): Promise<ContextRetrievalResponse>
  retrieveSemanticContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  retrieveKeywordContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  retrieveHybridContext(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  
  // Relevance scoring
  calculateRelevanceScore(result: ContextRetrievalResult, query: string, userContext?: any): Promise<number>
  calculateSemanticSimilarity(query: string, content: string): Promise<number>
  calculateKeywordRelevance(query: string, content: string): Promise<number>
  calculateContextRelevance(result: ContextRetrievalResult, userContext: any): Promise<number>
  
  // Embedding management
  generateEmbeddings(content: string): Promise<number[]>
  getCachedEmbeddings(content: string): Promise<number[] | null>
  cacheEmbeddings(content: string, embeddings: number[]): Promise<void>
  updateSearchIndex(content: string, type: ContextType, source: string, sourceId: string): Promise<void>
  
  // Search optimization
  optimizeQuery(query: string): Promise<string>
  expandQuery(query: string, contextTypes: ContextType[]): Promise<string>
  suggestRelatedQueries(query: string): Promise<string[]>
  
  // Metrics and analytics
  getMetrics(): Promise<ContextRetrievalMetrics>
  logQuery(request: ContextRetrievalRequest, response: ContextRetrievalResponse): Promise<void>
  updateRelevanceFeedback(resultId: string, relevanceScore: number, userId: string): Promise<void>
  
  // Configuration
  updateSemanticSearchConfig(config: SemanticSearchConfig): Promise<void>
  updateRelevanceScoringConfig(config: RelevanceScoringConfig): Promise<void>
  getConfiguration(): Promise<{
    semanticSearch: SemanticSearchConfig
    relevanceScoring: RelevanceScoringConfig
  }>
}

export interface ContextRetrievalEngine {
  // Search engines
  semanticSearchEngine: SemanticSearchEngine
  keywordSearchEngine: KeywordSearchEngine
  hybridSearchEngine: HybridSearchEngine
  
  // Scoring engines
  relevanceScoringEngine: RelevanceScoringEngine
  semanticSimilarityEngine: SemanticSimilarityEngine
  
  // Caching and indexing
  embeddingCache: EmbeddingCache
  searchIndex: SearchIndex
  
  // Configuration
  semanticSearchConfig: SemanticSearchConfig
  relevanceScoringConfig: RelevanceScoringConfig
}

export interface SemanticSearchEngine {
  search(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  generateEmbeddings(content: string): Promise<number[]>
  calculateSimilarity(embeddings1: number[], embeddings2: number[]): Promise<number>
  findSimilarContent(queryEmbeddings: number[], contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
}

export interface KeywordSearchEngine {
  search(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  extractKeywords(content: string): Promise<string[]>
  calculateKeywordRelevance(query: string, content: string): Promise<number>
  findExactMatches(query: string, contextTypes: ContextType[]): Promise<ContextRetrievalResult[]>
  findFuzzyMatches(query: string, contextTypes: ContextType[], threshold: number): Promise<ContextRetrievalResult[]>
}

export interface HybridSearchEngine {
  search(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  combineResults(semanticResults: ContextRetrievalResult[], keywordResults: ContextRetrievalResult[]): Promise<ContextRetrievalResult[]>
  optimizeSearchStrategy(query: string, contextTypes: ContextType[]): Promise<SearchStrategy>
}

export interface RelevanceScoringEngine {
  calculateRelevanceScore(result: ContextRetrievalResult, query: string, userContext?: any): Promise<number>
  calculateSemanticRelevance(query: string, content: string): Promise<number>
  calculateKeywordRelevance(query: string, content: string): Promise<number>
  calculateFreshnessScore(timestamp: Date): Promise<number>
  calculateAuthorityScore(source: string, sourceId: string): Promise<number>
  calculatePopularityScore(result: ContextRetrievalResult): Promise<number>
  calculateUserPreferenceScore(result: ContextRetrievalResult, userContext: any): Promise<number>
  calculateContextRelevanceScore(result: ContextRetrievalResult, userContext: any): Promise<number>
}

export interface SemanticSimilarityEngine {
  calculateSimilarity(embeddings1: number[], embeddings2: number[]): Promise<number>
  calculateCosineSimilarity(embeddings1: number[], embeddings2: number[]): Promise<number>
  calculateEuclideanDistance(embeddings1: number[], embeddings2: number[]): Promise<number>
  calculateDotProduct(embeddings1: number[], embeddings2: number[]): Promise<number>
  normalizeEmbeddings(embeddings: number[]): Promise<number[]>
}

export interface QueryOptimizationEngine {
  optimizeQuery(query: string): Promise<string>
  expandQuery(query: string, contextTypes: ContextType[]): Promise<string>
  suggestRelatedQueries(query: string): Promise<string[]>
  extractKeyTerms(query: string): Promise<string[]>
  removeStopWords(query: string): Promise<string>
  stemWords(query: string): Promise<string>
  synonymExpansion(query: string): Promise<string>
}

export interface ContextRetrievalCache {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  getStats(): Promise<{
    hitRate: number
    missRate: number
    totalKeys: number
    memoryUsage: number
  }>
}

export interface ContextRetrievalIndex {
  index(content: string, type: ContextType, source: string, sourceId: string): Promise<void>
  search(query: string, contextTypes: ContextType[], filters?: ContextFilters): Promise<ContextRetrievalResult[]>
  update(id: string, content: string, metadata?: Record<string, any>): Promise<void>
  delete(id: string): Promise<void>
  getStats(): Promise<{
    totalDocuments: number
    contextTypeDistribution: Record<ContextType, number>
    averageDocumentSize: number
    indexSize: number
  }>
}
