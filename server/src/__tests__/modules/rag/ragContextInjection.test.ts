/**
 * Feature 1 contract tests — see docs/superpowers/specs/2026-06-08-rag-context-scoping-design.md
 */
import {
  annotateChunks,
  buildContextEnvelope,
  validateContextInjectionContract,
} from '../../../modules/rag/ragContextInjection'

describe('Feature 1: adpa-rag-context-injection', () => {
  const projectId = '11111111-1111-1111-1111-111111111111'
  const documentIds = ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']

  /** REQ-001: Build context envelope with projectId, documentIds, strategy, confidence, retrievedAt */
  it('builds a context envelope scoped to project and source documents', () => {
    const envelope = buildContextEnvelope({
      projectId,
      documentIds,
      query: 'stakeholder risks',
      strategy: 'fts',
      confidence: 0.92,
    })

    expect(envelope.projectId).toBe(projectId)
    expect(envelope.documentIds).toEqual(documentIds)
    expect(envelope.source).toContain('stakeholder risks')
    expect(envelope.strategy).toBe('fts')
    expect(envelope.confidence).toBeGreaterThan(0)
    expect(envelope.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  /** REQ-002: Reject envelope construction when projectId is missing or blank */
  it('rejects missing project id', () => {
    expect(() =>
      buildContextEnvelope({
        projectId: '',
        documentIds,
        query: 'test',
        strategy: 'fts',
        confidence: 1,
      })
    ).toThrow(/projectId/i)
  })

  /** REQ-003: Annotate each chunk hit with envelope as context metadata */
  it('annotates chunks with injected context metadata', () => {
    const envelope = buildContextEnvelope({
      projectId,
      documentIds,
      query: 'IT Lead',
      strategy: 'sequential',
      confidence: 0.5,
    })

    const annotated = annotateChunks(
      [{ id: 'c1', document_id: documentIds[0], title: 'Charter', content: 'IT Lead details', score: 0.5 }],
      envelope
    )

    expect(annotated).toHaveLength(1)
    expect(annotated[0].context.projectId).toBe(projectId)
    expect(annotated[0].context.documentIds).toEqual(documentIds)
    expect(annotated[0].context.strategy).toBe('sequential')
    expect(annotated[0].content).toContain('IT Lead')
  })

  /** REQ-004: validateContextInjectionContract() is the foundational contract probe */
  it('passes the foundational contract used by Feature 2', () => {
    const result = validateContextInjectionContract()
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
