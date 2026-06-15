import { enforceTokenBudget } from '../../../modules/rag/tokenBudgeting'
import { ScoredChunk } from '../../../modules/rag/ragDynamicFallback'

describe('Pillar 2: RAG Token Budgeting Invariants', () => {
  it('should trim payload if it exceeds 85% of max context window', () => {
    // Generate mock chunks
    const chunks: ScoredChunk[] = [
      { id: '1', document_id: 'doc1', title: null, content: 'A'.repeat(500), score: 0.9 }, // High score
      { id: '2', document_id: 'doc1', title: null, content: 'B'.repeat(500), score: 0.8 },
      { id: '3', document_id: 'doc1', title: null, content: 'C'.repeat(500), score: 0.7 }, // Lowest score
    ]

    // Assume max tokens is 300 (85% is 255 tokens)
    // 500 characters of 'A' is roughly 500 tokens in tiktoken since they are single chars.
    // So 1 chunk is 500 tokens, which already exceeds 255 tokens!
    // But wait, if the *first* chunk exceeds the budget, what should happen? It should probably be truncated or at least only the top 1 is returned.
    
    // Let's make it simpler.
    // Chunk 1: 100 tokens. Chunk 2: 100 tokens. Chunk 3: 100 tokens.
    // Total = 300 tokens.
    // Max Context Window = 300 tokens.
    // 85% limit = 255 tokens.
    // Therefore, only Chunk 1 and Chunk 2 (200 tokens) should be kept. Chunk 3 is dropped.

    const mockChunks: ScoredChunk[] = [
      { id: '1', document_id: 'doc1', title: null, content: 'word '.repeat(100), score: 0.9 }, // ~100 tokens
      { id: '2', document_id: 'doc1', title: null, content: 'word '.repeat(100), score: 0.8 }, // ~100 tokens
      { id: '3', document_id: 'doc1', title: null, content: 'word '.repeat(100), score: 0.7 }, // ~100 tokens
    ]

    const result = enforceTokenBudget(mockChunks, 300)

    // Should only have 2 chunks
    expect(result.length).toBe(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('should not trim if payload is within 85% budget', () => {
    const mockChunks: ScoredChunk[] = [
      { id: '1', document_id: 'doc1', title: null, content: 'word '.repeat(100), score: 0.9 }, // ~100 tokens
      { id: '2', document_id: 'doc1', title: null, content: 'word '.repeat(100), score: 0.8 }, // ~100 tokens
    ]

    const result = enforceTokenBudget(mockChunks, 300) // 85% is 255, we have ~200.

    expect(result.length).toBe(2)
  })
})
