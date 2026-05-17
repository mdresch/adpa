import { cookies } from 'next/headers'

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('app/api/chat route', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.BACKEND_URL = 'http://backend.test'
    global.fetch = jest.fn()
    jest.mocked(cookies).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'token-123' }),
    } as any)
  })

  afterEach(() => {
    delete process.env.BACKEND_URL
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
  })
})