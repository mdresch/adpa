/**
 * Feature 1: Scoped RAG context injection (project + source document ids).
 */

export type RagRetrievalStrategy = 'fts' | 'sequential' | 'vector' | 'none'

export interface RagContextEnvelope {
  projectId: string
  documentIds: string[]
  source: string
  retrievedAt: string
  strategy: RagRetrievalStrategy
  confidence: number
}

export interface RagChunkHit {
  id: string
  document_id: string
  title: string | null
  content: string
  score: number
  context: RagContextEnvelope
}

export function buildContextEnvelope(params: {
  projectId: string
  documentIds: string[]
  query: string
  strategy: RagRetrievalStrategy
  confidence: number
}): RagContextEnvelope {
  const projectId = params.projectId?.trim()
  if (!projectId) {
    throw new Error('projectId is required for RAG context injection')
  }

  const documentIds = [...new Set((params.documentIds ?? []).filter(Boolean))]

  return {
    projectId,
    documentIds,
    source: `RAG Query: ${params.query.trim()}`,
    retrievedAt: new Date().toISOString(),
    strategy: params.strategy,
    confidence: Math.max(0, Math.min(1, params.confidence)),
  }
}

export function annotateChunks(
  chunks: Array<{ id: string; document_id: string; title: string | null; content: string; score: number }>,
  envelope: RagContextEnvelope
): RagChunkHit[] {
  return chunks.map((chunk) => ({
    ...chunk,
    context: { ...envelope },
  }))
}

/** Foundational contract — Feature 2 must not ship if this fails. */
export function validateContextInjectionContract(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    buildContextEnvelope({
      projectId: 'test-project',
      documentIds: ['doc-a'],
      query: 'contract probe',
      strategy: 'fts',
      confidence: 0.9,
    })
  } catch (e) {
    errors.push(`buildContextEnvelope failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    buildContextEnvelope({
      projectId: '',
      documentIds: [],
      query: 'x',
      strategy: 'fts',
      confidence: 1,
    })
    errors.push('expected projectId validation to throw')
  } catch {
    // expected
  }

  const annotated = annotateChunks(
    [{ id: '1', document_id: 'doc-a', title: 'T', content: 'body', score: 0.5 }],
    buildContextEnvelope({
      projectId: 'p1',
      documentIds: ['doc-a'],
      query: 'q',
      strategy: 'sequential',
      confidence: 0.5,
    })
  )

  if (!annotated[0]?.context?.projectId) {
    errors.push('annotateChunks must attach context.projectId')
  }

  return { ok: errors.length === 0, errors }
}
