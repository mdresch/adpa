/**
 * Context Injection System
 * 
 * This module provides utilities for injecting project context into AI prompts
 * across different providers while respecting token limits.
 */

export {
  ContextInjector,
  ContextConfig,
  ContextData,
  ContextRequest,
  ContextResponse,
  ContextError
} from './injector'

export {
  ProjectContextExtractor,
  DocumentContextExtractor,
  TemplateContextExtractor,
  UserContextExtractor,
  IntegrationContextExtractor
} from './extractors'

export {
  TokenManager,
  ProviderTokenLimits,
  TokenUsage
} from './token-manager'

export {
  ContextPrioritizer,
  ContextPriority
} from './prioritizer'

export {
  ContextAwareAIService,
  generateWithContext,
  getContextPreview,
  getContextStatistics,
  batchGenerateWithContext
} from './integration'

export {
  DOMAIN_EXTRACTION_CONFIGS,
  getDomainExtractionConfig,
  listDomainExtractionConfigs,
  type DomainExtractionConfig
} from './domainExtractionConfig'

// Re-export all types
export * from './types'

// Re-export types for convenience
export type {
  ContextConfig as Config,
  ContextData as Data,
  ContextRequest as Request,
  ContextResponse as Response,
  ContextError as Error
} from './injector'