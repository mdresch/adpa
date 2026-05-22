import {
  GOOGLE_PRIMARY_MODEL,
  normalizeGoogleModelId,
} from '@/lib/llm/googleModelConfig'

export type GenuiLlmProvider = 'mistral' | 'google'

const GOOGLE_OPENAI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/'

export function resolveGenuiLlmProvider(): GenuiLlmProvider {
  const raw = process.env.GENUI_LLM_PROVIDER?.trim().toLowerCase()
  if (raw === 'google' || raw === 'gemini') {
    return 'google'
  }
  if (raw === 'mistral') {
    return 'mistral'
  }
  return 'mistral'
}

export function getGoogleAiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    undefined
  )
}

export function resolveGenuiGoogleModel(): string {
  const explicit =
    process.env.GENUI_GOOGLE_MODEL?.trim() ||
    process.env.GEMINI_MODEL_OVERRIDE?.trim()
  return normalizeGoogleModelId(explicit || GOOGLE_PRIMARY_MODEL)
}

export function resolveGenuiMistralModel(): string {
  return process.env.MISTRAL_MODEL?.trim() || 'mistral-large-latest'
}

export function getGenuiOpenAIClientConfig(provider: GenuiLlmProvider): {
  apiKey: string
  baseURL: string
  model: string
} | { error: string } {
  if (provider === 'google') {
    const apiKey = getGoogleAiApiKey()
    if (!apiKey) {
      return {
        error:
          'GOOGLE_AI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) is not configured for GenUI',
      }
    }
    return {
      apiKey,
      baseURL: GOOGLE_OPENAI_BASE_URL,
      model: resolveGenuiGoogleModel(),
    }
  }

  const apiKey = process.env.MISTRAL_API_KEY?.trim()
  if (!apiKey) {
    return { error: 'MISTRAL_API_KEY is not configured' }
  }
  return {
    apiKey,
    baseURL: 'https://api.mistral.ai/v1',
    model: resolveGenuiMistralModel(),
  }
}

/** Label for UI when using NEXT_PUBLIC_GENUI_LLM_PROVIDER (optional). */
export function publicGenuiProviderLabel(): string | null {
  const raw = process.env.NEXT_PUBLIC_GENUI_LLM_PROVIDER?.trim().toLowerCase()
  if (raw === 'google' || raw === 'gemini') return 'Google Gemini'
  if (raw === 'mistral') return 'Mistral'
  return null
}
