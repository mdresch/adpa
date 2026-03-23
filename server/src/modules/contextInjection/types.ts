/**
 * Context Injection Framework Types
 * Defines TypeScript interfaces and types for the context injection system
 */

export interface ContextSource {
  type: 'project_data' | 'user_preferences' | 'document_history' | 'external_api' | 'database_query' | 'file_content'
  source_id: string
  source_name: string
  query?: string
  parameters?: Record<string, any>
  weight?: number
  enabled: boolean
  metadata?: Record<string, any>
}

export interface ContextInjectionConfig {
  enabled: boolean
  sources: ContextSource[]
  injection_strategy: 'prepend' | 'append' | 'interleave' | 'structured'
  max_context_length?: number
  context_priority?: 'high' | 'medium' | 'low'
  metadata?: Record<string, any>
}

export interface ContextResult {
  source_id: string
  source_name: string
  data: any
  metadata: {
    retrieved_at: Date
    relevance_score: number
    freshness_score: number
    confidence_score: number
    size_bytes: number
    processing_time_ms?: number
    transformed_format?: string
    transformed_at?: Date
  }
  errors?: string[]
  warnings?: string[]
}

export interface ContextBundle {
  bundle_id: string
  template_id: string
  project_id?: string
  user_id: string
  results: ContextResult[]
  metadata: {
    created_at: Date
    total_sources: number
    successful_sources: number
    failed_sources: number
    total_size_bytes: number
    processing_time_ms: number
  }
  injection_strategy: string
  max_context_length: number
}

export interface ContextInjectionRequest {
  template_id: string
  project_id?: string
  user_id: string
  variables?: Record<string, any>
  config_override?: Partial<ContextInjectionConfig>
}

export interface ContextInjectionResponse {
  success: boolean
  bundle: ContextBundle
  errors?: string[]
  warnings?: string[]
}

export interface ContextProcessor {
  process(contextBundle: ContextBundle, templateContent: string): Promise<string>
}

export interface ContextRetriever {
  retrieve(source: ContextSource, request: ContextInjectionRequest): Promise<ContextResult>
}

export interface ContextValidator {
  validate(contextResult: ContextResult): Promise<boolean>
}

export interface ContextTransformer {
  transform(contextResult: ContextResult, targetFormat: string): Promise<ContextResult>
}

export interface ContextCache {
  get(key: string): Promise<ContextResult | null>
  set(key: string, value: ContextResult, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

export interface ContextMetrics {
  source_id: string
  retrieval_count: number
  success_count: number
  failure_count: number
  average_response_time_ms: number
  last_accessed: Date
  error_rate: number
}

export interface ContextInjectionError extends Error {
  source_id: string
  error_type: 'RETRIEVAL_ERROR' | 'VALIDATION_ERROR' | 'TRANSFORMATION_ERROR' | 'PROCESSING_ERROR'
  context?: Record<string, any>
}

export interface ContextInjectionOptions {
  enable_caching?: boolean
  cache_ttl_seconds?: number
  enable_metrics?: boolean
  enable_validation?: boolean
  enable_transformation?: boolean
  max_retries?: number
  timeout_ms?: number
  parallel_processing?: boolean
}
