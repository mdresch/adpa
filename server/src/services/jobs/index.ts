/**
 * Queue Job Services - Public API
 * Phase 3: Type Safety and Validation
 * 
 * Central export point for all job-related types, validation, and errors
 */

// Types
export type {
  JobType,
  JobData,
  JobOptions,
  JobStatus,
  QueueName,
  BaseJobData,
  ExtractionBatchingConfig,
  ExtractionBatchProgressMeta,
  AIGenerationJobData,
  DocumentConversionJobData,
  BaselineExtractionJobData,
  ProjectDataExtractionJobData,
  ProcessFlowJobData,
  DocumentRegenerationJobData,
  QualityAuditJobData,
  PipelineProcessingJobData,
} from './types'

export {
  isAIGenerationJobData,
  isDocumentConversionJobData,
  isBaselineExtractionJobData,
  isProjectDataExtractionJobData,
  isProcessFlowJobData,
  isDocumentRegenerationJobData,
  isQualityAuditJobData,
  isPipelineProcessingJobData,
} from './types'

// Validation
export {
  validateJobData,
  validateJobType,
  getSchemaForJobType,
  aiGenerationJobDataSchema,
  documentConversionJobDataSchema,
  baselineExtractionJobDataSchema,
  projectDataExtractionJobDataSchema,
  processFlowJobDataSchema,
  documentRegenerationJobDataSchema,
  qualityAuditJobDataSchema,
  pipelineProcessingJobDataSchema,
} from './validation'

// Errors
export {
  JobError,
  JobValidationError,
  JobNotFoundError,
  JobTypeError,
  JobQueueError,
  JobDatabaseError,
  JobProcessingError,
  StuckJobsError,
  isJobError,
  getErrorCode,
} from './errors'

// Services (re-exported for convenience)
export { AIGenerationJobService } from './AIGenerationJobService'
export { DocumentConversionJobService } from './DocumentConversionJobService'
export { BaselineExtractionJobService } from './BaselineExtractionJobService'
export { ExtractionOrchestrationService } from './ExtractionOrchestrationService'

