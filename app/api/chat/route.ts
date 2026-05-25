import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getGenuiOpenAIClientConfig,
  resolveGenuiLlmProvider,
  type GenuiLlmProvider,
} from '@/lib/llm/genuiLlmProvider'

/** Default completion budget for full governance reports (10+ chapter BRDs). */
function resolveGenuiMaxOutputTokens(provider: GenuiLlmProvider): number {
  const raw = process.env.GENUI_MAX_OUTPUT_TOKENS?.trim()
  if (raw) {
    const n = Number.parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 4096) return Math.min(n, 65_536)
  }
  return provider === 'google' ? 32_768 : 16_384
}
import { estimateGenuiChatPayloadChars } from '@/lib/llm/genuiPromptBudget'

function backendUrl(): string {
  return process.env.BACKEND_URL || 'http://localhost:5000'
}

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

function providerDisplayName(provider: GenuiLlmProvider): string {
  return provider === 'google' ? 'Google Gemini' : 'Mistral'
}

function httpStatusFromLlmError(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return status
    }
  }
  return undefined
}

function genuiProviderErrorResponse(
  error: unknown,
  provider: GenuiLlmProvider
): NextResponse {
  const status = httpStatusFromLlmError(error) ?? 502
  const label = providerDisplayName(provider)
  const detail = error instanceof Error ? error.message : 'Unknown provider error'

  if (status === 429) {
    const hint =
      provider === 'google'
        ? `${label} quota or rate limit (RPM/TPM). Wait 60–90s and retry. GenUI sends large prompts (full document + layout plan). Enable billing in Google AI Studio, use gemini-2.5-flash-lite, or shorten the source document.`
        : `${label} rate limit reached. Wait a minute and retry, or set GENUI_LLM_PROVIDER=google in .env.local.`
    return NextResponse.json(
      {
        error: hint,
        code: 'rate_limit_exceeded',
        provider,
        details: detail,
      },
      { status: 429 }
    )
  }

  if (status === 401 || status === 403) {
    return NextResponse.json(
      {
        error: `${label} rejected the API key. Check your provider API key in .env.local.`,
        code: 'provider_auth_error',
        provider,
        details: detail,
      },
      { status }
    )
  }

  return NextResponse.json(
    {
      error: `${label} request failed.`,
      code: 'provider_error',
      provider,
      details: detail,
    },
    { status }
  )
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

  if (process.env.NODE_ENV === 'development') {
    const approxChars = estimateGenuiChatPayloadChars(systemPrompt, messages)
    console.info('[GenUI /api/chat] payload size', {
      provider,
      model: config.model,
      approxChars,
      systemChars: systemPrompt.length,
      messageCount: messages.length,
    })
  }

  const maxOutputTokens = resolveGenuiMaxOutputTokens(provider)

  try {
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: maxOutputTokens,
    })

    return new NextResponse(response.toReadableStream(), {
      headers: sseHeaders(provider, config.model),
    })
  } catch (error) {
    console.error(`[GenUI /api/chat] ${providerDisplayName(provider)} error:`, error)
    return genuiProviderErrorResponse(error, provider)
  }
}

async function proxyOpenUIChat(body: Record<string, unknown>) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  const response = await fetch(`${backendUrl()}/api/v1/openui-chat/chat`, {
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
      return await streamGenuiChat(provider, systemPrompt, apiMessages)
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
