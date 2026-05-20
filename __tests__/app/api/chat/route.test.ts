import { cookies } from 'next/headers'

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

const mockCreate = jest.fn()

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }))
})

describe('app/api/chat route', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.BACKEND_URL = 'http://backend.test'
    global.fetch = jest.fn()
    jest.mocked(cookies).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'token-123' }),
    } as any)
  })

  afterEach(() => {
    delete process.env.BACKEND_URL
    delete process.env.MISTRAL_API_KEY
    delete process.env.MISTRAL_MODEL
  })

  test('forwards auth, projectId, threadId, and messages to the backend', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: ok\n\n'))
        controller.close()
      },
    })

    jest.mocked(global.fetch).mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    )

    const { POST } = await import('@/app/api/chat/route')
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'project-1',
        threadId: 'thread-1',
        messages: [{ role: 'user', content: 'Summarize the charter' }],
      }),
    })

    const response = await POST(request as any)

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/api/v1/openui-chat/chat',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
        body: JSON.stringify({
          projectId: 'project-1',
          threadId: 'thread-1',
          messages: [{ role: 'user', content: 'Summarize the charter' }],
        }),
      })
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('streams Mistral when systemPrompt is provided', async () => {
    process.env.MISTRAL_API_KEY = 'mistral-test-key'
    process.env.MISTRAL_MODEL = 'mistral-large-latest'

    const stream = new ReadableStream({
      start(controller) {
        controller.close()
      },
    })

    mockCreate.mockResolvedValue({
      toReadableStream: () => stream,
    })

    const { POST } = await import('@/app/api/chat/route')
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'You are a document advisor.',
        messages: [{ role: 'user', content: 'Chart profit vs expenses' }],
      }),
    })

    const response = await POST(request as any)

    expect(response.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: 'You are a document advisor.' },
        { role: 'user', content: 'Chart profit vs expenses' },
      ],
      stream: true,
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('returns 503 when Mistral is requested without an API key', async () => {
    const { POST } = await import('@/app/api/chat/route')
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: 'You are a document advisor.',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    })

    const response = await POST(request as any)
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toMatch(/MISTRAL_API_KEY/i)
  })
})
