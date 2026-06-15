/**
 * Feature 2 fallback chain tests — see docs/superpowers/specs/2026-06-08-rag-context-scoping-design.md
 */
import {
  retrieveChunksWithFallback,
  type RagFallbackDeps,
  type RawChunkCandidate,
  type ScoredChunk,
  RagRetrievalError,
} from '../../../modules/rag/ragDynamicFallback'
import { validateContextInjectionContract } from '../../../modules/rag/ragContextInjection'

const projectId = '11111111-1111-1111-1111-111111111111'
const documentIds = ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']

function makeDeps(overrides: Partial<RagFallbackDeps> = {}): RagFallbackDeps {
  const baseChunk = {
    id: 'chunk-1',
    document_id: documentIds[0],
    title: 'Source',
    content: 'ADPA governance context',
    kw_rank: 0.8,
  }

  return {
    searchFts: jest.fn().mockResolvedValue([baseChunk]),
    searchSequential: jest.fn().mockResolvedValue([{ ...baseChunk, kw_rank: 0.1 }]),
    searchVector: jest.fn().mockResolvedValue([
      {
        id: 'vec-1',
        document_id: documentIds[0],
        title: 'Source',
        content: 'Vector fallback chunk',
        similarity: 0.77,
      },
    ]),
    scoreChunks: jest.fn().mockImplementation(
      async (_query: string, candidates: RawChunkCandidate[]): Promise<ScoredChunk[]> =>
        candidates.map((c, i: number) => ({
        id: c.id,
        document_id: c.document_id,
        title: c.title,
        content: c.content,
          score: 0.9 - i * 0.1,
        }))
    ),
    ...overrides,
  }
}

/** REQ-010: Feature 2 runs validateContextInjectionContract() in beforeEach */
describe('Feature 2: adpa-rag-dynamic-fallback', () => {
  beforeEach(() => {
    const contract = validateContextInjectionContract()
    if (!contract.ok) {
      throw new Error(`Feature 1 contract broken: ${contract.errors.join('; ')}`)
    }
  })

  /** REQ-005: Vector is the primary retrieval strategy when it returns candidates */
  it('uses primary Vector when it returns candidates', async () => {
    const deps = makeDeps()
    const result = await retrieveChunksWithFallback(
      { projectId, documentIds, query: 'What is ADPA?', topK: 5 },
      deps
    )

    expect(result.strategy).toBe('vector')
    expect(result.chunks).toHaveLength(1)
    expect(deps.searchVector).toHaveBeenCalled()
    expect(deps.searchFts).not.toHaveBeenCalled()
  })

  /** REQ-006: Fall back to FTS when Vector returns no candidates */
  it('falls back to FTS chunks when Vector returns nothing', async () => {
    const deps = makeDeps({
      searchVector: jest.fn().mockResolvedValue([]),
    })

    const result = await retrieveChunksWithFallback(
      { projectId, documentIds, query: 'obscure term', topK: 3 },
      deps
    )

    expect(result.strategy).toBe('fts')
    expect(result.attempted).toContain('vector')
    expect(result.attempted).toContain('fts')
    expect(deps.searchFts).toHaveBeenCalled()
  })

  /** REQ-007: Fall back to sequential when Vector and FTS are empty */
  it('falls back to sequential search when Vector and FTS are empty', async () => {
    const deps = makeDeps({
      searchVector: jest.fn().mockResolvedValue([]),
      searchFts: jest.fn().mockResolvedValue([]),
    })

    const result = await retrieveChunksWithFallback(
      { projectId, documentIds, query: 'What is ADPA?', topK: 5 },
      deps
    )

    expect(result.strategy).toBe('sequential')
    expect(deps.searchSequential).toHaveBeenCalled()
  })

  /** REQ-008: Throw RagRetrievalError when all providers fail */
  it('throws when all providers fail', async () => {
    const deps = makeDeps({
      searchFts: jest.fn().mockRejectedValue(new Error('fts down')),
      searchSequential: jest.fn().mockRejectedValue(new Error('sequential down')),
      searchVector: jest.fn().mockRejectedValue(new Error('vector down')),
    })

    await expect(
      retrieveChunksWithFallback({ projectId, documentIds, query: 'fail', topK: 5 }, deps)
    ).rejects.toBeInstanceOf(RagRetrievalError)
  })

  /** REQ-009: Re-inject context metadata on every fallback response */
  it('re-injects context metadata on fallback responses', async () => {
    const deps = makeDeps({
      searchVector: jest.fn().mockResolvedValue([]),
    })

    const result = await retrieveChunksWithFallback(
      { projectId, documentIds, query: 'IT Lead', topK: 2 },
      deps
    )

    expect(result.chunks[0].context.projectId).toBe(projectId)
    expect(result.chunks[0].context.documentIds).toEqual(documentIds)
    expect(result.chunks[0].context.strategy).toBe('fts')
  })
})
