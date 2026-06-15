/**
 * Feature 2: Dynamic RAG fallback chain (FTS → sequential → vector).
 * Depends on Feature 1 for context re-injection on every strategy.
 */

import {
  annotateChunks,
  buildContextEnvelope,
  type RagRetrievalStrategy,
} from './ragContextInjection'

export class RagRetrievalError extends Error {
  readonly attempted: RagRetrievalStrategy[]

  constructor(message: string, attempted: RagRetrievalStrategy[]) {
    super(message)
    this.name = 'RagRetrievalError'
    this.attempted = attempted
  }
}

export interface RawChunkCandidate {
  id: string
  document_id: string
  title: string | null
  content: string
  kw_rank?: number
  similarity?: number
}

export interface ScoredChunk {
  id: string
  document_id: string
  title: string | null
  content: string
  score: number
}

export interface RagFallbackParams {
  projectId: string
  documentIds?: string[]
  templateId?: string
  query: string
  topK?: number
  maxTokens?: number
}

export interface RagFallbackDeps {
  searchFts: (params: RagFallbackParams & { limit: number }) => Promise<RawChunkCandidate[]>
  searchSequential: (params: RagFallbackParams & { limit: number }) => Promise<RawChunkCandidate[]>
  searchVector?: (params: RagFallbackParams & { limit: number }) => Promise<RawChunkCandidate[]>
  scoreChunks: (query: string, candidates: RawChunkCandidate[]) => Promise<ScoredChunk[]>
}

export interface RagFallbackResult {
  chunks: ReturnType<typeof annotateChunks>
  strategy: RagRetrievalStrategy
  attempted: RagRetrievalStrategy[]
}

function averageScore(chunks: ScoredChunk[]): number {
  if (!chunks.length) return 0
  return chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length
}

export async function retrieveChunksWithFallback(
  params: RagFallbackParams,
  deps: RagFallbackDeps
): Promise<RagFallbackResult> {
  const topK = params.topK ?? 20
  const limit = Math.max(topK * 3, 50)
  const attempted: RagRetrievalStrategy[] = []
  const scopedIds = params.documentIds?.filter(Boolean) ?? []

  const tryStrategy = async (
    strategy: RagRetrievalStrategy,
    loader: () => Promise<RawChunkCandidate[]>
  ): Promise<ScoredChunk[] | null> => {
    attempted.push(strategy)
    try {
      const candidates = await loader()
      if (!candidates.length) return null
      return deps.scoreChunks(params.query, candidates)
    } catch {
      return null
    }
  }

  let scored: ScoredChunk[] | null = null
  let strategy: RagRetrievalStrategy = 'none'

  if (!scored?.length && deps.searchVector) {
    scored = await tryStrategy('vector', () => deps.searchVector!({ ...params, limit }))
    if (scored?.length) strategy = 'vector'
  }

  if (!scored?.length) {
    scored = await tryStrategy('fts', () => deps.searchFts({ ...params, limit }))
    if (scored?.length) strategy = 'fts'
  }

  if (!scored?.length && scopedIds.length > 0) {
    scored = await tryStrategy('sequential', () => deps.searchSequential({ ...params, limit }))
    if (scored?.length) strategy = 'sequential'
  }

  if (!scored?.length) {
    const allFailed =
      attempted.includes('fts') &&
      (!scopedIds.length || attempted.includes('sequential')) &&
      (!deps.searchVector || attempted.includes('vector'))
    if (allFailed && attempted.length > 0) {
      throw new RagRetrievalError('All RAG retrieval strategies failed', attempted)
    }
    return {
      chunks: [],
      strategy: 'none',
      attempted,
    }
  }

  // Enforce Token Budgeting (Pillar 2)
  const maxTokens = params.maxTokens ?? 4096;
  const { enforceTokenBudget } = require('./tokenBudgeting');
  const budgeted = enforceTokenBudget(scored, maxTokens);

  const top = budgeted.slice(0, topK)
  const envelope = buildContextEnvelope({
    projectId: params.projectId,
    documentIds: scopedIds,
    query: params.query,
    strategy,
    confidence: averageScore(top),
  })

  return {
    chunks: annotateChunks(top, envelope),
    strategy,
    attempted,
  }
}
