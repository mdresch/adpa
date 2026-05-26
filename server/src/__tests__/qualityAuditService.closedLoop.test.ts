import { shouldSkipClosedLoopTemplateAudit } from '../services/qualityAuditService'

describe('quality audit closed-loop template audit guard', () => {
  it('skips closed-loop template audits when a recent document-failure audit exists', () => {
    expect(shouldSkipClosedLoopTemplateAudit([{ id: 'audit-1' }])).toBe(true)
  })

  it('allows closed-loop template audits when no recent document-failure audit exists', () => {
    expect(shouldSkipClosedLoopTemplateAudit([])).toBe(false)
  })
})
