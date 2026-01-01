/**
 * Queue Job Validation Schemas
 * Phase 3: Type Safety and Validation
 * 
 * Joi validation schemas for all job types
 */

import Joi from 'joi'
import { JobType, JobData } from './types'
import { JobValidationError } from './errors'
import { PMBOK_DOMAINS } from '../../types/pmbok'

/**
 * Base job data schema (common fields)
 */
const baseJobDataSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
  userId: Joi.string().uuid().allow(null).optional(),
})

/**
 * AI Generation Job Data Schema
 */
export const aiGenerationJobDataSchema = baseJobDataSchema.keys({
  projectId: Joi.string().uuid().allow(null).optional(),
  prompt: Joi.string().optional(),
  provider: Joi.string().optional(),
  model: Joi.string().allow(null).optional(),
  fallback_provider: Joi.string().optional(),
  fallback_model: Joi.string().optional(),
  template_id: Joi.string().uuid().allow(null).optional(),
  max_tokens: Joi.number().integer().min(1).max(100000).optional(),
  variables: Joi.object().unknown(true).optional(),
  documentId: Joi.string().uuid().allow(null).optional(),
})

/**
 * Document Conversion Job Data Schema
 */
export const documentConversionJobDataSchema = baseJobDataSchema.keys({
  documentId: Joi.string().uuid().required(),
  fromFormat: Joi.string().required(),
  toFormat: Joi.string().valid('pdf', 'docx', 'markdown').required(),
  projectId: Joi.string().uuid().optional(),
})

/**
 * Baseline Extraction Job Data Schema
 */
export const baselineExtractionJobDataSchema = baseJobDataSchema.keys({
  project_id: Joi.string().uuid().required(),
  document_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  ai_provider: Joi.string().optional(),
  ai_model: Joi.string().optional(),
  fallback_provider: Joi.string().optional(),
  fallback_model: Joi.string().optional(),
})

/**
 * Project Data Extraction Job Data Schema
 */
export const projectDataExtractionJobDataSchema = baseJobDataSchema.keys({
  projectId: Joi.string().uuid().required(),
  aiProvider: Joi.string().optional(),
  aiModel: Joi.string().optional(),
  fallbackProvider: Joi.string().optional(),
  fallbackModel: Joi.string().optional(),
  documentIds: Joi.array().items(Joi.string().uuid()).optional(),
  domains: Joi.array()
    .items(Joi.string().valid(...PMBOK_DOMAINS))
    .max(PMBOK_DOMAINS.length)
    .optional(),
})

/**
 * Process Flow Job Data Schema
 */
export const processFlowJobDataSchema = baseJobDataSchema.keys({
  config: Joi.object({
    projectId: Joi.string().uuid().required(),
    templateId: Joi.string().uuid().optional(),
    templateName: Joi.string().optional(),
    documentName: Joi.string().optional(),
    templateType: Joi.string().optional(),
    includeStakeholders: Joi.boolean().optional(),
  }).unknown(true).required(),
})

/**
 * Document Regeneration Job Data Schema
 */
export const documentRegenerationJobDataSchema = baseJobDataSchema.keys({
  documentId: Joi.string().uuid().required(),
  templateId: Joi.string().uuid().required(),
  provider: Joi.string().required(),
  model: Joi.string().required(),
  fallback_provider: Joi.string().optional(),
  fallback_model: Joi.string().optional(),
  versionType: Joi.string().valid('major', 'minor', 'patch').required(),
  temperature: Joi.number().min(0).max(2).optional(),
})

/**
 * Quality Audit Job Data Schema
 */
export const qualityAuditJobDataSchema = baseJobDataSchema.keys({
  documentId: Joi.string().uuid().required(),
  documentContent: Joi.string().required(),
  documentType: Joi.string().required(),
  projectContext: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().optional(),
  }).unknown(true).required(),
})

/**
 * Pipeline Processing Job Data Schema
 */
export const pipelineProcessingJobDataSchema = baseJobDataSchema.keys({
  requestId: Joi.string().required(),
  templateId: Joi.string().uuid().required(),
  projectId: Joi.string().uuid().required(),
})

/**
 * Publish to Confluence Job Data Schema
 */
export const publishToConfluenceJobDataSchema = baseJobDataSchema.keys({
  documentId: Joi.string().uuid().optional(),
  projectId: Joi.string().uuid().required(),
  title: Joi.string().required(),
  markdown: Joi.string().required(),
})

/**
 * Map of job types to their validation schemas
 */
const jobTypeSchemaMap: Record<JobType, Joi.ObjectSchema> = {
  'ai-generate': aiGenerationJobDataSchema,
  'document-convert': documentConversionJobDataSchema,
  'baseline-extract': baselineExtractionJobDataSchema,
  'extract-project-data': projectDataExtractionJobDataSchema,
  'process-flow': processFlowJobDataSchema,
  'document-regeneration': documentRegenerationJobDataSchema,
  'quality-audit': qualityAuditJobDataSchema,
  'pipeline-processing': pipelineProcessingJobDataSchema,
  'publish-to-confluence': publishToConfluenceJobDataSchema,
}

/**
 * Get validation schema for a job type
 */
export function getSchemaForJobType(type: JobType): Joi.ObjectSchema {
  const schema = jobTypeSchemaMap[type]
  if (!schema) {
    throw new Error(`No validation schema found for job type: ${type}`)
  }
  return schema
}

/**
 * Normalize provider name to match validation schema
 * Converts display names like "Mistral AI" to "mistral"
 */
function normalizeProviderName(provider: string | undefined | null): string | undefined {
  if (!provider) return undefined

  const normalized = provider.toLowerCase().trim()

  // Map common display names to schema values
  const providerMap: Record<string, string> = {
    'mistral ai': 'mistral',
    'mistral': 'mistral',
    'openai': 'openai',
    'google': 'google',
    'google ai': 'google',
    'google gemini': 'google',
    'gemini': 'google',
    'azure': 'azure',
    'azure openai': 'azure',
    'anthropic': 'anthropic',
    'claude': 'anthropic',
    'deepseek': 'deepseek',
    'moonshot': 'moonshot',
    'xai': 'xai',
    'grok': 'xai',
    'groq': 'groq',
    'groq ai': 'groq',
    'ollama': 'ollama',
  }

  return providerMap[normalized] || normalized
}

/**
 * Normalize job data before validation
 */
function normalizeJobData(type: JobType, data: any): any {
  const normalized = { ...data }

  // Normalize provider fields based on job type
  if (type === 'ai-generate' && normalized.provider) {
    normalized.provider = normalizeProviderName(normalized.provider)
  }

  if (type === 'baseline-extract' && normalized.ai_provider) {
    normalized.ai_provider = normalizeProviderName(normalized.ai_provider)
  }

  if (type === 'extract-project-data' && normalized.aiProvider) {
    normalized.aiProvider = normalizeProviderName(normalized.aiProvider)
  }

  if (type === 'document-regeneration' && normalized.provider) {
    normalized.provider = normalizeProviderName(normalized.provider)
  }

  return normalized
}

/**
 * Validate job data against its type's schema
 * @throws {JobValidationError} if validation fails
 */
export function validateJobData(type: JobType, data: unknown): JobData {
  const schema = getSchemaForJobType(type)

  // Normalize provider names before validation
  const normalizedData = normalizeJobData(type, data)

  const { error, value } = schema.validate(normalizedData, {
    abortEarly: false, // Return all validation errors, not just the first
    stripUnknown: true, // Remove unknown fields
  })

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(', ')
    const firstError = error.details[0]
    throw new JobValidationError(
      `Job data validation failed: ${errorMessages}`,
      firstError?.path.join('.'),
      firstError?.context?.value,
      (data as any)?.jobId,
      type
    )
  }

  return value as JobData
}

/**
 * Normalize job type name (handles legacy/alternative names)
 * Maps old or alternative job type names to their canonical forms
 */
function normalizeJobTypeName(type: string): string {
  // Map legacy/alternative job type names to canonical forms
  const typeMap: Record<string, JobType> = {
    'project-data-extraction': 'extract-project-data', // Legacy name
  }

  return typeMap[type.toLowerCase()] || type
}

/**
 * Validate job type
 * @throws {JobTypeError} if type is invalid
 */
export function validateJobType(type: string): JobType {
  // Normalize the type name first (handles legacy names)
  const normalizedType = normalizeJobTypeName(type)

  const validTypes: JobType[] = [
    'ai-generate',
    'document-convert',
    'baseline-extract',
    'extract-project-data',
    'process-flow',
    'document-regeneration',
    'quality-audit',
    'pipeline-processing',
  ]

  if (normalizedType.startsWith('extract-entity-')) {
    return normalizedType as JobType
  }

  if (!validTypes.includes(normalizedType as JobType)) {
    throw new Error(`Invalid job type: ${type}. Valid types are: ${validTypes.join(', ')}`)
  }

  return normalizedType as JobType
}

