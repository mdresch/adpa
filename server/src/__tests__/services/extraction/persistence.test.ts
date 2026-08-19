import { normalizeInteger, normalizeNumeric } from '../../../services/extraction/base/Persistence'

// Regression coverage for a production failure: business_case_details extraction
// jobs failed with "invalid input syntax for type integer" because the LLM
// returned a fractional payback_period_months (e.g. "41.4") and the write path
// passed it straight through to an `integer` column with no rounding.
describe('normalizeInteger', () => {
  it('rounds a fractional number to the nearest integer', () => {
    expect(normalizeInteger(41.4)).toBe(41)
    expect(normalizeInteger(22.8)).toBe(23)
  })

  it('rounds a fractional numeric string to the nearest integer', () => {
    expect(normalizeInteger('41.4')).toBe(41)
    expect(normalizeInteger('22.8')).toBe(23)
  })

  it('passes whole numbers through unchanged', () => {
    expect(normalizeInteger(18)).toBe(18)
    expect(normalizeInteger('24')).toBe(24)
  })

  it('returns null for missing or non-numeric values, matching normalizeNumeric', () => {
    expect(normalizeInteger(null)).toBeNull()
    expect(normalizeInteger(undefined)).toBeNull()
    expect(normalizeInteger('TBD')).toBeNull()
    expect(normalizeNumeric('TBD')).toBeNull()
  })
})
