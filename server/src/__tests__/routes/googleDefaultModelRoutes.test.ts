import { GOOGLE_ROUTE_DEFAULT_MODEL } from '../../routes/googleDefaultModel'

describe('Google route default models', () => {
  it('uses the stable Gemini default for route fallbacks', () => {
    expect(GOOGLE_ROUTE_DEFAULT_MODEL).toBe('gemini-2.5-flash')
  })
})