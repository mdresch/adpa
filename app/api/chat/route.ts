import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export const maxDuration = 300

const mistralClient = () =>
  new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
  })

type ChatMessage = { role: string; content: string }

async function streamMistralChat(systemPrompt: string, messages: ChatMessage[]) {
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      { error: 'MISTRAL_API_KEY is not configured' },
      { status: 503 }
    )
  }

  const client = mistralClient()
  const response = await client.chat.completions.create({
    model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  })

  return new NextResponse(response.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

async function proxyOpenUIChat(body: Record<string, unknown>) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  const response = await fetch(`${BACKEND_URL}/api/v1/openui-chat/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Backend error' }))
    return NextResponse.json(error, { status: response.status })
  }

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, systemPrompt, projectId, threadId } = body as {
      messages?: ChatMessage[]
      systemPrompt?: string
      projectId?: string
      threadId?: string
    }

    // GenUI document workspace: Mistral via OpenAI-compatible API (server-side key only)
    if (typeof systemPrompt === 'string' && systemPrompt.length > 0) {
      const cookieStore = await cookies()
      const token = cookieStore.get('auth_token')?.value
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const apiMessages = Array.isArray(messages)
        ? messages.filter((m) => m.role !== 'system')
        : []

      return streamMistralChat(systemPrompt, apiMessages)
    }

    return proxyOpenUIChat({ projectId, threadId, messages })
  } catch (error: unknown) {
    console.error('[FRONTEND-PROXY] OpenUI chat error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal Server Error', details: message },
      { status: 500 }
    )
  }
}
