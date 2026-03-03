/**
 * Queue Job Type Definitions
 * Phase 3: Type Safety and Validation
 * 
 * This file contains all TypeScript interfaces and types for queue jobs,
 * ensuring type safety throughout the queue system.
 */

/**
 * Job Type Union
 * All valid job types in the system
 */
export type JobType =
  | 'ai-generate'
  | 'document-convert'
  | 'baseline-extract'
  | 'extract-project-data'
  | 'process-flow'
  | 'document-regeneration'
  | 'quality-audit'
  | 'pipeline-processing'
  | 'publish-to-confluence'
  | 'gkg-bootstrap'
  | 'gkg-sync-project'
  | 'gkg-sync-document'
  | 'gkg-reconcile'
  | `extract-entity-${string}`

/**
 * Base Job Data
 * Common fields present in all job types
 */
export interface BaseJobData {
  jobId: string
  userId?: string | null
}

/**
 * AI Generation Job Data
 */
export interface AIGenerationJobData extends BaseJobData {
  projectId?: string | null
  prompt?: string
  provider?: string
  model?: string | null
  temperature?: number
  fallback_provider?: string
  fallback_model?: string
  template_id?: string | null
  max_tokens?: number
  variables?: Record<string, unknown>
  documentId?: string

  // Additional fields used in AIGenerationJobService
  name?: string
  description?: string
  framework?: string
  template_name?: string
  projectName?: string
  started_at?: string
  timestamp?: number
  documentIds?: string[]
  use_context?: boolean
  include_integrations?: boolean
  custom_context?: Record<string, unknown>
}

/**
 * Document Conversion Job Data
 */
export interface DocumentConversionJobData extends BaseJobData {
  documentId: string
  fromFormat: string
  toFormat: 'pdf' | 'docx' | 'markdown'
  projectId?: string
}

/**
 * Baseline Extraction Job Data
 */
export interface BaselineExtractionJobData extends BaseJobData {
  project_id: string
  document_ids: string[]
  ai_provider?: string
  ai_model?: string
  fallback_provider?: string
  fallback_model?: string
}

/**
 * Extraction batching controls
 */
export interface ExtractionBatchingConfig {
  batchingEnabled?: boolean
  maxBatchTokens?: number
  maxDocsPerBatch?: number
}

/**
 * Batch-aware extraction progress metadata
 */
export interface ExtractionBatchProgressMeta {
  activeEntityType?: string | null
  totalDocuments: number
  processedDocuments: number
  totalBatches: number
  currentBatch: number
  estimatedRemainingSeconds?: number | null
  batching: {
    enabled: boolean
    maxBatchTokens: number
    maxDocsPerBatch: number
  }
  updatedAt: string
}

/**
 * Project Data Extraction Job Data
 */
export interface ProjectDataExtractionJobData extends BaseJobData, ExtractionBatchingConfig {
  projectId: string
  parentJobId?: string
  entityType?: string
  entityIndex?: number
  totalEntities?: number
  sourceJobId?: string
  aiProvider?: string
  aiModel?: string
  fallbackProvider?: string
  fallbackModel?: string
  documentIds?: string[]
  domains?: string[]
  progressMeta?: ExtractionBatchProgressMeta | null
}

/**
 * Process Flow Job Data
 */
export interface ProcessFlowJobData extends BaseJobData {
  config: {
    projectId: string
    templateId?: string
    templateName?: string
    documentName?: string
    templateType?: string
    includeStakeholders?: boolean
    [key: string]: unknown
  }
}

/**
 * Document Regeneration Job Data
 */
export interface DocumentRegenerationJobData extends BaseJobData {
  documentId: string
  templateId: string
  provider: string
  model: string
  fallback_provider?: string
  fallback_model?: string
  versionType: 'major' | 'minor' | 'patch'
  temperature?: number
}

/**
 * Quality Audit Job Data
 */
export interface QualityAuditJobData extends BaseJobData {
  documentId: string
  documentContent: string
  documentType: string
  projectContext: {
    id: string
    name?: string
    [key: string]: unknown
  }
}

/**
 * Pipeline Processing Job Data
 */
export interface PipelineProcessingJobData extends BaseJobData {
  requestId: string
  templateId: string
  projectId: string
}

/**
 * Publish to Confluence Job Data
 */
export interface PublishToConfluenceJobData extends BaseJobData {
  documentId?: string
  projectId: string
  title: string
  markdown: string
}

export interface GkgReconcileJobData extends BaseJobData {
  cleanup?: boolean
  batchSize?: number
}

/**
 * Union type for all job data types
 */
export type JobData =
  | AIGenerationJobData
  | DocumentConversionJobData
  | BaselineExtractionJobData
  | ProjectDataExtractionJobData
  | ProcessFlowJobData
  | DocumentRegenerationJobData
  | QualityAuditJobData
  | PipelineProcessingJobData
  | PublishToConfluenceJobData
  | GkgReconcileJobData

/**
 * Bull Queue Job Options
 */
export interface JobOptions {
  priority?: number
  delay?: number
  attempts?: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
  timeout?: number
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
  jobId?: string
}

/**
 * Job Status
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Queue Name
 */
export type QueueName =
  | 'ai-processing'
  | 'document-processing'
  | 'pipeline-processing'
  | 'baseline-processing'
  | 'process-flow-processing'
  | 'document-regeneration'
  | 'quality-audit'
  | 'project-data-extraction'
  | 'confluence-publishing'
  | 'gkg-sync'

/**
 * Type guard to check if data matches a specific job type
 */
export function isAIGenerationJobData(data: JobData): data is AIGenerationJobData {
  return 'projectId' in data && 'prompt' in data
}

export function isDocumentConversionJobData(data: JobData): data is DocumentConversionJobData {
  return 'documentId' in data && 'fromFormat' in data && 'toFormat' in data
}

export function isBaselineExtractionJobData(data: JobData): data is BaselineExtractionJobData {
  return 'project_id' in data && 'document_ids' in data
}

export function isProjectDataExtractionJobData(data: JobData): data is ProjectDataExtractionJobData {
  return 'projectId' in data && 'aiProvider' in data
}

export function isProcessFlowJobData(data: JobData): data is ProcessFlowJobData {
  return 'config' in data && typeof data.config === 'object' && 'projectId' in data.config
}

export function isDocumentRegenerationJobData(data: JobData): data is DocumentRegenerationJobData {
  return 'documentId' in data && 'templateId' in data && 'versionType' in data
}

export function isQualityAuditJobData(data: JobData): data is QualityAuditJobData {
  return 'documentId' in data && 'documentContent' in data && 'projectContext' in data
}

export function isPipelineProcessingJobData(data: JobData): data is PipelineProcessingJobData {
  return 'requestId' in data && 'templateId' in data && 'projectId' in data
}

export function isPublishToConfluenceJobData(data: JobData): data is PublishToConfluenceJobData {
  return 'projectId' in data && 'title' in data && 'markdown' in data
}


