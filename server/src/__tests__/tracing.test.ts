describe('tracing configuration helpers', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('uses an explicit OTLP endpoint when provided', async () => {
    const { buildLangfuseOtlpEndpoint } = await import('../tracing')

    expect(buildLangfuseOtlpEndpoint({
      langfuseOtlpEndpoint: 'https://otel.example.com/v1/traces',
      langfuseBaseUrl: 'https://ignored.example.com'
    })).toBe('https://otel.example.com/v1/traces')
  })

  it('derives the OTLP endpoint from LANGFUSE_BASE_URL', async () => {
    const { buildLangfuseOtlpEndpoint } = await import('../tracing')

    expect(buildLangfuseOtlpEndpoint({
      langfuseBaseUrl: 'https://langfuse.example.com/'
    })).toBe('https://langfuse.example.com/api/public/otel/v1/traces')
  })

  it('uses an explicit auth header override when provided', async () => {
    const { buildLangfuseOtlpAuthHeader } = await import('../tracing')

    expect(buildLangfuseOtlpAuthHeader({
      otlpAuthHeader: 'Bearer custom-token',
      publicKey: 'pk-test',
      secretKey: 'sk-test'
    })).toBe('Bearer custom-token')
  })

  it('builds a basic auth header from Langfuse public and secret keys', async () => {
    const { buildLangfuseOtlpAuthHeader } = await import('../tracing')

    expect(buildLangfuseOtlpAuthHeader({
      publicKey: 'pk-test',
      secretKey: 'sk-test'
    })).toBe(`Basic ${Buffer.from('pk-test:sk-test').toString('base64')}`)
  })
})