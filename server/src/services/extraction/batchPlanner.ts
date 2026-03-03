import type {
  ExtractionBatchingConfig,
  ExtractionBatchProgressMeta,
} from '@/services/jobs/types'

export interface BatchPlannerDocument {
  id: string
  content?: string | null
}

export interface PlannedDocumentBatch {
  batchNumber: number
  documentIds: string[]
  estimatedTokens: number
  oversizedDocumentIds: string[]
}

export interface PlannedDocumentBatches {
  batchingEnabled: boolean
  totalDocuments: number
  totalBatches: number
  totalEstimatedTokens: number
  oversizedDocumentIds: string[]
  batches: PlannedDocumentBatch[]
}

interface BatchPlannerDefaults {
  batchingEnabled: boolean
  maxBatchTokens: number
  maxDocsPerBatch: number
  charsPerToken: number
}

const DEFAULT_MAX_BATCH_TOKENS = 12000
const DEFAULT_MAX_DOCS_PER_BATCH = 20
const DEFAULT_CHARS_PER_TOKEN = 4
const MIN_BATCH_TOKENS = 1000
const MAX_BATCH_TOKENS = 200000
const MIN_DOCS_PER_BATCH = 1
const MAX_DOCS_PER_BATCH = 500
const MIN_CHARS_PER_TOKEN = 1
const MAX_CHARS_PER_TOKEN = 10

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  const rounded = Math.floor(value)
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}

function parseIntWithBounds(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return clampInt(parsed, min, max)
}

export const BATCH_PLANNER_DEFAULTS: BatchPlannerDefaults = {
  batchingEnabled: process.env.EXTRACTION_BATCHING_ENABLED !== 'false',
  maxBatchTokens: parseIntWithBounds(
    process.env.EXTRACTION_MAX_BATCH_TOKENS,
    DEFAULT_MAX_BATCH_TOKENS,
    MIN_BATCH_TOKENS,
    MAX_BATCH_TOKENS
  ),
  maxDocsPerBatch: parseIntWithBounds(
    process.env.EXTRACTION_MAX_DOCS_PER_BATCH,
    DEFAULT_MAX_DOCS_PER_BATCH,
    MIN_DOCS_PER_BATCH,
    MAX_DOCS_PER_BATCH
  ),
  charsPerToken: parseIntWithBounds(
    process.env.EXTRACTION_CHARS_PER_TOKEN,
    DEFAULT_CHARS_PER_TOKEN,
    MIN_CHARS_PER_TOKEN,
    MAX_CHARS_PER_TOKEN
  ),
}

export function normalizeBatchingConfig(
  config?: ExtractionBatchingConfig
): Required<ExtractionBatchingConfig> {
  const maxBatchTokens =
    typeof config?.maxBatchTokens === 'number'
      ? clampInt(config.maxBatchTokens, MIN_BATCH_TOKENS, MAX_BATCH_TOKENS)
      : BATCH_PLANNER_DEFAULTS.maxBatchTokens

  const maxDocsPerBatch =
    typeof config?.maxDocsPerBatch === 'number'
      ? clampInt(config.maxDocsPerBatch, MIN_DOCS_PER_BATCH, MAX_DOCS_PER_BATCH)
      : BATCH_PLANNER_DEFAULTS.maxDocsPerBatch

  return {
    batchingEnabled:
      typeof config?.batchingEnabled === 'boolean'
        ? config.batchingEnabled
        : BATCH_PLANNER_DEFAULTS.batchingEnabled,
    maxBatchTokens,
    maxDocsPerBatch,
  }
}

export function estimateTokensFromText(text: string | null | undefined): number {
  if (!text) return 0
  return Math.ceil(text.length / BATCH_PLANNER_DEFAULTS.charsPerToken)
}

export function planDocumentBatches(
  documents: BatchPlannerDocument[],
  config?: ExtractionBatchingConfig
): PlannedDocumentBatches {
  const normalizedConfig = normalizeBatchingConfig(config)
  const totalDocuments = documents.length
  const oversizedDocumentIds: string[] = []

  if (totalDocuments === 0) {
    return {
      batchingEnabled: normalizedConfig.batchingEnabled,
      totalDocuments: 0,
      totalBatches: 0,
      totalEstimatedTokens: 0,
      oversizedDocumentIds: [],
      batches: [],
    }
  }

  if (!normalizedConfig.batchingEnabled) {
    const estimatedTokens = documents.reduce((sum, doc) => {
      const docTokens = estimateTokensFromText(doc.content)
      return sum + docTokens
    }, 0)

    return {
      batchingEnabled: false,
      totalDocuments,
      totalBatches: 1,
      totalEstimatedTokens: estimatedTokens,
      oversizedDocumentIds: [],
      batches: [
        {
          batchNumber: 1,
          documentIds: documents.map((doc) => doc.id),
          estimatedTokens,
          oversizedDocumentIds: [],
        },
      ],
    }
  }

  const batches: PlannedDocumentBatch[] = []
  let currentBatch: PlannedDocumentBatch | null = null
  let totalEstimatedTokens = 0

  for (const document of documents) {
    const rawEstimatedTokens = estimateTokensFromText(document.content)
    const isOversized = rawEstimatedTokens > normalizedConfig.maxBatchTokens
    const budgetedTokens = isOversized
      ? normalizedConfig.maxBatchTokens
      : rawEstimatedTokens

    totalEstimatedTokens += budgetedTokens
    if (isOversized) {
      oversizedDocumentIds.push(document.id)
    }

    const needsNewBatch =
      !currentBatch ||
      currentBatch.documentIds.length >= normalizedConfig.maxDocsPerBatch ||
      currentBatch.estimatedTokens + budgetedTokens > normalizedConfig.maxBatchTokens

    if (needsNewBatch) {
      currentBatch = {
        batchNumber: batches.length + 1,
        documentIds: [],
        estimatedTokens: 0,
        oversizedDocumentIds: [],
      }
      batches.push(currentBatch)
    }

    currentBatch.documentIds.push(document.id)
    currentBatch.estimatedTokens += budgetedTokens
    if (isOversized) {
      currentBatch.oversizedDocumentIds.push(document.id)
    }
  }

  return {
    batchingEnabled: true,
    totalDocuments,
    totalBatches: batches.length,
    totalEstimatedTokens,
    oversizedDocumentIds,
    batches,
  }
}

export function createInitialBatchProgressMeta(params: {
  totalDocuments: number
  totalBatches?: number
  config?: ExtractionBatchingConfig
  activeEntityType?: string | null
}): ExtractionBatchProgressMeta {
  const normalizedConfig = normalizeBatchingConfig(params.config)
  return {
    activeEntityType: params.activeEntityType || null,
    totalDocuments: Math.max(0, Math.floor(params.totalDocuments || 0)),
    processedDocuments: 0,
    totalBatches: Math.max(0, Math.floor(params.totalBatches || 0)),
    currentBatch: 0,
    estimatedRemainingSeconds: null,
    batching: {
      enabled: normalizedConfig.batchingEnabled,
      maxBatchTokens: normalizedConfig.maxBatchTokens,
      maxDocsPerBatch: normalizedConfig.maxDocsPerBatch,
    },
    updatedAt: new Date().toISOString(),
  }
}
