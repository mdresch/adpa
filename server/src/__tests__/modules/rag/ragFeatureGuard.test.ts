/**
 * RAG overlap guard tests — see docs/superpowers/specs/2026-06-08-rag-context-scoping-design.md
 */
import {
  assertFeature1Healthy,
  runRagFeatureGuard,
} from '../../../modules/rag/ragFeatureGuard'
import { validateContextInjectionContract } from '../../../modules/rag/ragContextInjection'

describe('RAG feature guard (self-healing overlap)', () => {
  /** REQ-011: assertFeature1Healthy() throws when Feature 1 contract is unhealthy */
  it('blocks Feature 2 work when Feature 1 contract fails', () => {
    const spy = jest
      .spyOn(require('../../../modules/rag/ragContextInjection'), 'validateContextInjectionContract')
      .mockReturnValueOnce({ ok: false, errors: ['missing projectId validation'] })

    expect(() => assertFeature1Healthy()).toThrow(/Feature 1/i)
    spy.mockRestore()
  })

  it('allows Feature 2 when Feature 1 contract passes', () => {
    expect(() => assertFeature1Healthy()).not.toThrow()
  })

  /** REQ-012: runRagFeatureGuard() reports feature1, feature2Ready, errors, remediation */
  it('runRagFeatureGuard reports healthy stack when contracts pass', async () => {
    const report = await runRagFeatureGuard()
    expect(report.feature1).toBe(true)
    expect(report.feature2Ready).toBe(true)
    expect(report.errors).toHaveLength(0)
  })

  it('documents remediation hints when Feature 1 is unhealthy', async () => {
    const broken = { ok: false, errors: ['envelope missing retrievedAt'] }
    const spy = jest
      .spyOn(require('../../../modules/rag/ragContextInjection'), 'validateContextInjectionContract')
      .mockReturnValueOnce(broken)

    const report = await runRagFeatureGuard()
    expect(report.feature1).toBe(false)
    expect(report.feature2Ready).toBe(false)
    expect(report.remediation.length).toBeGreaterThan(0)

    spy.mockRestore()
    expect(validateContextInjectionContract().ok).toBe(true)
  })
})
