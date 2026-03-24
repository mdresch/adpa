/**
 * Foundry Local Connector
 * 
 * Provides integration with Microsoft Foundry Local for on-device inference.
 * Supports OpenAI-compatible REST API.
 */

import { logger } from "../../utils/logger"
import { isTracingEnabled } from '../../tracing'
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

export interface FoundryLocalConfig {
  baseURL: string  // e.g., "http://localhost:8080"
  apiKey?: string  // Often not required for local, but supported
  defaultModel?: string
}

export interface FoundryLocalRequest {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * Generate text using Foundry Local API (OpenAI compatible)
 */
export async function generateTextWithFoundryLocal(
  request: FoundryLocalRequest,
  config: FoundryLocalConfig
): Promise<any> {
  const startTime = Date.now()
  const traceId = isTracingEnabled() ? `foundry-${Date.now()}` : undefined

  try {
    const response = await fetch(`${config.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 2048,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Foundry Local API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Log to Langfuse if tracing is enabled
    if (isTracingEnabled() && traceId) {
      langfuse.generation({
        id: traceId,
        name: 'foundry-local-generation',
        model: request.model,
        input: request.messages,
        output: data.choices?.[0]?.message?.content || '',
        metadata: {
          provider: 'foundry-local',
          usage: data.usage
        },
      })
    }

    logger.info(`Foundry Local generation completed`, {
      model: request.model,
      duration: Date.now() - startTime,
    })

    return data
  } catch (error) {
    logger.error('Foundry Local generation failed', { error, model: request.model })
    throw error
  }
}

/**
 * Check if Foundry Local is available and list models
 */
export async function checkFoundryLocalStatus(
  config: FoundryLocalConfig
): Promise<{ available: boolean; models: string[] }> {
  try {
    // Try both Foundry specific and OpenAI generic list endpoints
    const response = await fetch(`${config.baseURL}/foundry/list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.ok) {
      const data = await response.json()
      // Foundry /foundry/list returns an array of model objects with a 'name' property
      const models = Array.isArray(data) ? data.map((m: any) => m.name || m.id) : []
      return { available: true, models }
    }

    // Fallback to OpenAI /v1/models
    const openAiResponse = await fetch(`${config.baseURL}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (openAiResponse.ok) {
      const data = await openAiResponse.json()
      const models = Array.isArray(data.data) ? data.data.map((m: any) => m.id) : []
      return { available: true, models }
    }

    return { available: false, models: [] }
  } catch (error) {
    logger.warn('Foundry Local not available', { error })
    return { available: false, models: [] }
  }
}

export const foundryLocalConnector = {
  generateText: generateTextWithFoundryLocal,
  checkStatus: checkFoundryLocalStatus,
}
