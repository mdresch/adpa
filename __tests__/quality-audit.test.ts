import {
  formatQualityScore,
  isQualityAuditPerformed,
  QUALITY_AUDIT_NOT_GRADE,
} from '@/lib/quality-audit'

describe('quality audit helpers', () => {
  it('treats unavailable AI audits as not performed', () => {
    expect(
      isQualityAuditPerformed({
        audit_performed: false,
        overall_score: 73,
        overall_grade: 'C',
        ai_provider: 'google',
      })
    ).toBe(false)

    expect(
      isQualityAuditPerformed({
        ai_provider: 'none',
        overall_score: 73,
      })
    ).toBe(false)

    expect(
      isQualityAuditPerformed({
        overall_score: null,
        findings: { completeness: 'AI analysis unavailable - no audit performed' },
      })
    ).toBe(false)
  })

  it('formats missing scores as N/A', () => {
    expect(formatQualityScore(null)).toBe(QUALITY_AUDIT_NOT_GRADE)
    expect(formatQualityScore(82)).toBe('82%')
  })
})
