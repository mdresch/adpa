import { GOOGLE_PRIMARY_MODEL, normalizeGoogleModelId } from '../../utils/googleModelConfig'

describe('google model config', () => {
  it('uses gemini-2.5-flash as the primary default', () => {
    expect(GOOGLE_PRIMARY_MODEL).toBe('gemini-2.5-flash')
  })

  it('maps stale Gemini aliases to the primary default', () => {
    expect(normalizeGoogleModelId('gemini-pro')).toBe('gemini-2.5-flash')
    expect(normalizeGoogleModelId('gemini-1.5-flash-latest')).toBe('gemini-2.5-flash')
  })

  it('preserves supported current models', () => {
    expect(normalizeGoogleModelId('gemini-2.5-flash')).toBe('gemini-2.5-flash')
    expect(normalizeGoogleModelId('gemini-3.1-flash-lite')).toBe('gemini-3.1-flash-lite')
  })
})