import {
  getGenuiOpenAIClientConfig,
  resolveGenuiGoogleModel,
  resolveGenuiLlmProvider,
} from '@/lib/llm/genuiLlmProvider'

describe('genuiLlmProvider', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.GENUI_LLM_PROVIDER
    delete process.env.GENUI_GOOGLE_MODEL
    delete process.env.GEMINI_MODEL_OVERRIDE
    delete process.env.MISTRAL_API_KEY
    delete process.env.GOOGLE_AI_API_KEY
  })

  afterAll(() => {
    process.env = env
  })

  it('defaults to mistral when GENUI_LLM_PROVIDER is unset', () => {
    expect(resolveGenuiLlmProvider()).toBe('mistral')
  })

  it('selects google when GENUI_LLM_PROVIDER=google', () => {
    process.env.GENUI_LLM_PROVIDER = 'google'
    expect(resolveGenuiLlmProvider()).toBe('google')
  })

  it('keeps gemini-3.5-flash when explicitly set', () => {
    process.env.GENUI_GOOGLE_MODEL = 'gemini-3.5-flash'
    expect(resolveGenuiGoogleModel()).toBe('gemini-3.5-flash')
  })

  it('uses Gemini OpenAI-compatible base URL for google', () => {
    process.env.GOOGLE_AI_API_KEY = 'test-key'
    process.env.GENUI_LLM_PROVIDER = 'google'
    const config = getGenuiOpenAIClientConfig('google')
    expect('error' in config).toBe(false)
    if ('error' in config) return
    expect(config.baseURL).toContain('generativelanguage.googleapis.com')
    expect(config.model).toBe(resolveGenuiGoogleModel())
  })
})
