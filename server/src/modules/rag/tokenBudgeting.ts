import { getEncoding } from 'js-tiktoken'
import { ScoredChunk } from './ragDynamicFallback'
import { logger } from '../../utils/logger'

export function countTokens(text: string): number {
  try {
    const enc = getEncoding('cl100k_base')
    return enc.encode(text).length
  } catch (error) {
    // Fallback heuristic if tokenizer fails
    return Math.ceil(text.length / 4)
  }
}

/**
 * Enforces hard boundaries on context injection payloads.
 * If the retrieved context exceeds 85% of the model’s maximum context window,
 * it trims the payload safely before API dispatch.
 */
export function enforceTokenBudget(chunks: ScoredChunk[], maxModelTokens: number): ScoredChunk[] {
  const safetyThreshold = 0.85
  const budgetTokens = Math.floor(maxModelTokens * safetyThreshold)

  // Sort chunks by score descending (highest priority first)
  const sortedChunks = [...chunks].sort((a, b) => b.score - a.score)

  let currentTokens = 0
  const approvedChunks: ScoredChunk[] = []

  for (const chunk of sortedChunks) {
    const chunkTokens = countTokens(chunk.content)

    if (currentTokens + chunkTokens <= budgetTokens) {
      approvedChunks.push(chunk)
      currentTokens += chunkTokens
    } else {
      // If a single chunk is larger than the entire budget (very rare), we could truncate the text.
      // For now, we drop it to ensure we don't exceed the context window with fragmented sentences.
      logger.debug(`[RAG-BUDGET] Dropping chunk ${chunk.id} due to token budget limits.`)
    }
  }

  if (approvedChunks.length < chunks.length) {
    logger.info(`[RAG-BUDGET] Context compressed: Kept ${approvedChunks.length}/${chunks.length} chunks to fit ${budgetTokens} tokens limit.`)
  }

  return approvedChunks
}
