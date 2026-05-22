import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getGenuiOpenAIClientConfig,
  resolveGenuiLlmProvider,
  type GenuiLlmProvider,
} from '@/lib/llm/genuiLlmProvider'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export const maxDuration = 300

type ChatMessage = { role: string; content: string }

function sseHeaders(provider: GenuiLlmProvider, model: string): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-GenUI-Provider': provider,
    'X-GenUI-Model': model,
  }
}

async function streamGenuiChat(
  provider: GenuiLlmProvider,
  systemPrompt: string,
  messages: ChatMessage[]
) {
  const config = getGenuiOpenAIClientConfig(provider)
  if ('error' in config) {
    return NextResponse.json({ error: config.error }, { status: 503 })
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  })

  return new NextResponse(response.toReadableStream(), {
    headers: sseHeaders(provider, config.model),
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

    // GenUI document workspace: OpenAI-compatible stream (Mistral or Google Gemini)
    if (typeof systemPrompt === 'string' && systemPrompt.length > 0) {
      const cookieStore = await cookies()
      const token = cookieStore.get('auth_token')?.value
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const apiMessages = Array.isArray(messages)
        ? messages.filter((m) => m.role !== 'system')
        : []

      const provider = resolveGenuiLlmProvider()
      return streamGenuiChat(provider, systemPrompt, apiMessages)
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
