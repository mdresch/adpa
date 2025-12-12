/**
 * Extraction Result Types
 * 
 * Defines types for extraction results, including entities, rejected counts, and statistics.
 * Used across all extraction modules for consistent result handling.
 */

/**
 * Result of extracting a single entity type
 */
export interface ExtractionResult<T = any> {
  /** Successfully extracted entities */
  entities: T[]
  /** Number of entities rejected (e.g., missing source_document_id) */
  rejectedCount: number
  /** Number of entities skipped (e.g., duplicates) */
  skippedCount: number
  /** Statistics about the extraction */
  stats: ExtractionStats
}

/**
 * Statistics about an extraction operation
 */
export interface ExtractionStats {
  /** Total entities extracted (before deduplication/rejection) */
  totalExtracted: number
  /** Number of entities after deduplication */
  afterDeduplication: number
  /** Number of entities after source document resolution */
  afterSourceResolution: number
  /** Final count of valid entities */
  finalCount: number
  /** Whether cache was used */
  cacheHit: boolean
  /** Duration in milliseconds */
  durationMs: number
  /** AI provider used */
  provider?: string
  /** AI model used */
  model?: string
}

/**
 * Document information for extraction context
 */
export interface ExtractionDocument {
  id: string
  title: string
  content: string
  template_name?: string
}

/**
 * Options for extraction operations
 */
export interface ExtractionOptions {
  /** AI provider to use (e.g., 'openai', 'google') */
  aiProvider?: string
  /** AI model to use (e.g., 'gpt-4', 'gemini-2.0-flash-exp') */
  aiModel?: string
  /** Specific document IDs to extract from (optional) */
  documentIds?: string[]
  /** Temperature for AI generation (0.0-1.0) */
  temperature?: number
  /** Maximum tokens for AI response */
  maxTokens?: number
}

/**
 * Source document resolution result
 */
export interface SourceResolutionResult {
  /** Whether resolution was successful */
  resolved: boolean
  /** Resolved document ID */
  documentId?: string
  /** Resolved document title */
  documentTitle?: string
  /** Resolution method used */
  method?: 'exact' | 'fuzzy' | 'fallback' | 'rejected'
}

