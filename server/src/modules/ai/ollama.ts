/**
 * Ollama Connector
 * 
 * Provides integration with local Ollama instance for running open-source models.
 * Supports models: llama3.2, qwen3, qwen3-coder, mistral-large, kimi-k2.5
 */

import { logger } from "../../utils/logger"
import { isTracingEnabled, isNativeLangfuseEnabled } from '../../tracing'
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
})

// Types for Ollama integration
export interface OllamaConfig {
  baseURL: string  // e.g., "http://host.docker.internal:11434"
  defaultModel?: string
}

export interface OllamaProvider {
  id: string
  name: string
  config: OllamaConfig
  isActive: boolean
  priority: number
  availableModels: string[]
}

export interface OllamaRequest {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
}

export interface OllamaResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
  eval_duration?: number
}

export interface OllamaStreamChunk {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

// Available models with their characteristics
export const OLLAMA_MODELS = {
  'llama3.2': {
    name: 'Llama 3.2',
    description: 'Fast, efficient general-purpose model',
    size: '2GB',
    bestFor: ['chat', 'summarization', 'general tasks'],
    contextLength: 128000
  },
  'qwen3:8b': {
    name: 'Qwen 3 8B',
    description: 'Strong reasoning and coding capabilities',
    size: '5.2GB',
    bestFor: ['reasoning', 'coding', 'multilingual'],
    contextLength: 32000
  },
  'qwen3-coder-next': {
    name: 'Qwen 3 Coder',
    description: 'Specialized for code generation',
    size: '5.2GB+',
    bestFor: ['code generation', 'technical documentation'],
    contextLength: 32000
  },
  'mistral-large-3': {
    name: 'Mistral Large 3',
    description: 'High-capability model for complex tasks',
    size: 'Large',
    bestFor: ['complex reasoning', 'analysis', 'creative tasks'],
    contextLength: 128000
  },
  'kimi-k2.5': {
    name: 'Kimi K2.5',
    description: 'Long context document analysis',
    size: 'Large',
    bestFor: ['document processing', 'long context', 'analysis'],
    contextLength: 256000
  }
} as const

export type OllamaModelId = keyof typeof OLLAMA_MODELS

/**
 * Generate text using Ollama API
 */
export async function generateTextWithOllama(
  request: OllamaRequest,
  config: OllamaConfig
): Promise<OllamaResponse> {
  const startTime = Date.now()
  const traceId = isTracingEnabled() ? `ollama-${Date.now()}` : undefined

  try {
    const response = await fetch(`${config.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.max_tokens ?? 2048,
          top_p: request.top_p ?? 0.9,
        },
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    // Runtime check for OllamaResponse shape
    if (
      !data ||
      typeof data !== 'object' ||
      !(data as any).model ||
      !(data as any).created_at ||
      !(data as any).message ||
      typeof (data as any).done !== 'boolean'
    ) {
      throw new Error('Invalid Ollama API response: missing required fields')
    }
    const ollamaResponse: OllamaResponse = data as OllamaResponse

    // Log to Langfuse if tracing is enabled
    if (isTracingEnabled() && traceId) {
      langfuse.generation({
        id: traceId,
        name: 'ollama-generation',
        model: request.model,
        input: request.messages,
        output: ollamaResponse.message.content,
        metadata: {
          provider: 'ollama',
          totalDuration: ollamaResponse.total_duration,
          promptEvalCount: ollamaResponse.prompt_eval_count,
          evalCount: ollamaResponse.eval_count,
        },
      })
    }

    logger.info(`Ollama generation completed`, {
      model: request.model,
      duration: Date.now() - startTime,
      tokens: ollamaResponse.eval_count,
    })

    return ollamaResponse
  } catch (error) {
    logger.error('Ollama generation failed', { error, model: request.model })
    throw error
  }
}

/**
 * Stream text generation from Ollama
 */
export async function* streamTextWithOllama(
  request: OllamaRequest,
  config: OllamaConfig
): AsyncGenerator<string, void, unknown> {
  try {
    const response = await fetch(`${config.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.max_tokens ?? 2048,
          top_p: request.top_p ?? 0.9,
        },
        stream: true,
      }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body from Ollama')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk: OllamaStreamChunk = JSON.parse(line)
            if (chunk.message?.content) {
              yield chunk.message.content
            }
          } catch (e) {
            logger.warn('Failed to parse Ollama stream chunk', { line })
          }
        }
      }
    }
  } catch (error) {
    logger.error('Ollama streaming failed', { error, model: request.model })
    throw error
  }
}

/**
 * Check if Ollama is available and list running models
 */
export async function checkOllamaStatus(
  config: OllamaConfig
): Promise<{ available: boolean; models: string[] }> {
  try {
    const response = await fetch(`${config.baseURL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return { available: false, models: [] }
    }

      const data = await response.json() as { models?: Array<{ name: string }> }
      const models = Array.isArray(data.models) ? data.models.map((m) => m.name) : []

    return { available: true, models }
  } catch (error) {
    logger.warn('Ollama not available', { error })
    return { available: false, models: [] }
  }
}

/**
 * Get model recommendations based on task type
 */
export function getRecommendedOllamaModel(task: string): OllamaModelId {
  const taskLower = task.toLowerCase()
  
  if (taskLower.includes('code') || taskLower.includes('program')) {
    return 'qwen3-coder-next'
  }
  if (taskLower.includes('document') || taskLower.includes('long')) {
    return 'kimi-k2.5'
  }
  if (taskLower.includes('complex') || taskLower.includes('analysis')) {
    return 'mistral-large-3'
  }
  if (taskLower.includes('reasoning') || taskLower.includes('math')) {
    return 'qwen3:8b'
  }
  
  // Default to llama3.2 for general tasks
  return 'llama3.2'
}

// Export connector for use in AI module
export const ollamaConnector = {
  generateText: generateTextWithOllama,
  streamText: streamTextWithOllama,
  checkStatus: checkOllamaStatus,
  getRecommendedModel: getRecommendedOllamaModel,
  models: OLLAMA_MODELS,
}
