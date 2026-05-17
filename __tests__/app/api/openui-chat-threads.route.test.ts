import { cookies } from 'next/headers'

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('openui thread proxy routes', () => {
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

  test('forwards project filtering to the backend when listing threads', async () => {
    jest.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ threads: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { GET } = await import('@/app/api/openui-chat/threads/route')
    const response = await GET(
      new Request('http://localhost/api/openui-chat/threads?projectId=project-1') as any
    )

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/api/v1/openui-chat/threads?projectId=project-1',
      {
        headers: {
          Authorization: 'Bearer token-123',
        },
      }
    )
  })

  test('forwards project-scoped thread lookup to the backend', async () => {
    jest.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ thread: { id: 'thread-1', messages: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { GET } = await import('@/app/api/openui-chat/threads/[id]/route')
    const response = await GET(
      new Request('http://localhost/api/openui-chat/threads/thread-1?projectId=project-1') as any,
      { params: Promise.resolve({ id: 'thread-1' }) }
    )

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/api/v1/openui-chat/threads/thread-1?projectId=project-1',
      {
        headers: {
          Authorization: 'Bearer token-123',
        },
      }
    )
  })
})