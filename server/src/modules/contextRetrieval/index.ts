/**
 * Context Retrieval Module
 * Exports all context retrieval components and types
 */

export { ContextRetrievalService } from './contextRetrievalService'
export { SemanticSearchEngine } from './engines/semanticSearchEngine'
export { KeywordSearchEngine } from './engines/keywordSearchEngine'
export { RelevanceScoringEngine } from './engines/relevanceScoringEngine'
export { MultiProviderEmbeddingsService } from './services/multiProviderEmbeddingsService'

export type {
  // Core service types
  ContextRetrievalService as IContextRetrievalService,
  ContextRetrievalRequest,
  ContextRetrievalResponse,
  ContextRetrievalResult,
  ContextRetrievalMetrics,

  // Context types
  ContextType,
  ContextFilters,
  SearchStrategy,

  // Configuration types
  SemanticSearchConfig,
  RelevanceScoringConfig,

  // Engine types
  SemanticSearchEngine as ISemanticSearchEngine,
  KeywordSearchEngine as IKeywordSearchEngine,
  RelevanceScoringEngine as IRelevanceScoringEngine,
  HybridSearchEngine,
  SemanticSimilarityEngine,
  QueryOptimizationEngine,

  // Cache and index types
  EmbeddingCache,
  SearchIndex,
  ContextRetrievalCache,
  ContextRetrievalIndex,

  // Engine system types
  ContextRetrievalEngine
} from './types'
