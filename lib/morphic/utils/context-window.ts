import { ModelMessage } from 'ai'
import { getEncoding, type TiktokenEncoding } from 'js-tiktoken'

import { AIModel as Model } from '../types/models'

interface ModelContextInfo {
    contextWindow: number
    outputTokens: number
}

const MODEL_CONTEXT_WINDOWS: Record<string, ModelContextInfo> = {
    'gpt-4.1': { contextWindow: 128000, outputTokens: 16384 },
    'gpt-4.1-mini': { contextWindow: 128000, outputTokens: 16384 },
    'gpt-4.1-nano': { contextWindow: 128000, outputTokens: 16384 },
    'gpt-4o-mini': { contextWindow: 128000, outputTokens: 16384 },
    'claude-opus-4': { contextWindow: 680000, outputTokens: 8192 },
    'claude-sonnet-4': { contextWindow: 680000, outputTokens: 8192 },
    'claude-3-7-sonnet': { contextWindow: 200000, outputTokens: 8192 },
    'claude-3-7-sonnet-20250219': { contextWindow: 200000, outputTokens: 8192 },
    'claude-3-5-haiku-20241022': { contextWindow: 200000, outputTokens: 8192 },
    'gemini-2.5-flash': { contextWindow: 1048576, outputTokens: 65536 },
    'gemini-2.5-pro': { contextWindow: 1048576, outputTokens: 65536 },
    'grok-4-0709': { contextWindow: 256000, outputTokens: 8192 },
    'grok-3': { contextWindow: 131072, outputTokens: 8192 },
    'grok-3-mini': { contextWindow: 131072, outputTokens: 8192 }
}

const DEFAULT_CONTEXT_WINDOW = 16384
const DEFAULT_OUTPUT_TOKENS = 4096
const SAFETY_BUFFER_RATIO = 0.1

const encoderCache = new Map<string, any>()

const MODEL_TO_ENCODING: Record<string, TiktokenEncoding> = {
    'gpt-4.1': 'cl100k_base',
    'gpt-4.1-mini': 'cl100k_base',
    'gpt-4.1-nano': 'cl100k_base',
    'gpt-4o-mini': 'cl100k_base',
    'claude-opus-4': 'cl100k_base',
    'claude-sonnet-4': 'cl100k_base',
    'claude-3-7-sonnet': 'cl100k_base',
    'claude-3-7-sonnet-20250219': 'cl100k_base',
    'claude-3-5-haiku-20241022': 'cl100k_base',
    'gemini-2.5-flash': 'cl100k_base',
    'gemini-2.5-pro': 'cl100k_base',
    'grok-4-0709': 'cl100k_base',
    'grok-3': 'cl100k_base',
    'grok-3-mini': 'cl100k_base'
}

function getModelContextInfo(modelId: string): ModelContextInfo {
    const id = modelId.toLowerCase()
    if (MODEL_CONTEXT_WINDOWS[modelId]) {
        return MODEL_CONTEXT_WINDOWS[modelId]
    }
    if (id.includes('gemini')) {
        if (id.includes('pro')) {
            return { contextWindow: 2097152, outputTokens: 8192 }
        }
        return { contextWindow: 1048576, outputTokens: 8192 }
    }
    if (id.includes('claude')) {
        return { contextWindow: 200000, outputTokens: 8192 }
    }
    if (id.includes('gpt-4') || id.includes('o1')) {
        return { contextWindow: 128000, outputTokens: 16384 }
    }
    if (id.includes('deepseek') || id.includes('mistral')) {
        return { contextWindow: 64000, outputTokens: 4096 }
    }
    return {
        contextWindow: DEFAULT_CONTEXT_WINDOW,
        outputTokens: DEFAULT_OUTPUT_TOKENS
    }
}

export function getMaxAllowedTokens(model: Model): number {
    const { contextWindow, outputTokens } = getModelContextInfo(model.id)
    let availableTokens = contextWindow - outputTokens
    const safetyBuffer = Math.floor(contextWindow * SAFETY_BUFFER_RATIO)
    availableTokens -= safetyBuffer
    return Math.max(availableTokens, 1000)
}

function extractTextContent(content: ModelMessage['content']): string {
    if (!content) return ''
    if (typeof content === 'string') {
        return content
    }
    if (Array.isArray(content)) {
        return content
            .map(part => {
                if ('text' in part) {
                    return part.text
                }
                return ''
            })
            .join(' ')
    }
    return ''
}

function getEncoder(modelId: string) {
    try {
        const id = modelId.toLowerCase()
        let encodingName: TiktokenEncoding = 'cl100k_base'

        if (MODEL_TO_ENCODING[modelId]) {
            encodingName = MODEL_TO_ENCODING[modelId]
        } else if (id.includes('gpt') || id.includes('claude') || id.includes('gemini')) {
            encodingName = 'cl100k_base'
        }

        if (!encoderCache.has(encodingName)) {
            const encoder = getEncoding(encodingName)
            encoderCache.set(encodingName, encoder)
        }

        return encoderCache.get(encodingName)
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(
                `Failed to load tokenizer for model ${modelId}, falling back to estimation`,
                error
            )
        }
        return null
    }
}

export function estimateTokenCount(
    content: ModelMessage['content'],
    modelId?: string
): number {
    const text = extractTextContent(content)
    if (!text) return 0
    if (modelId) {
        const encoder = getEncoder(modelId)
        if (encoder) {
            try {
                const tokens = encoder.encode(text)
                const tokenCount = tokens.length
                const overhead = 4
                return tokenCount + overhead
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(
                        'Failed to encode text with tiktoken, falling back to estimation',
                        error
                    )
                }
            }
        }
    }
    const baseCount = Math.ceil(text.length / 4)
    const overhead = 4
    return baseCount + overhead
}

export function truncateMessages(
    messages: ModelMessage[],
    maxTokens: number,
    modelId?: string
): ModelMessage[] {
    if (!messages || messages.length === 0) return []
    if (maxTokens <= 0) {
        console.error('Invalid maxTokens value:', maxTokens)
        return []
    }

    const firstUserIndex = messages.findIndex(m => m.role === 'user')
    const firstUserMessage = firstUserIndex >= 0 ? messages[firstUserIndex] : null

    const messageTokenCounts = messages.map(msg => ({
        message: msg,
        tokens: estimateTokenCount(msg.content, modelId)
    }))

    const totalTokens = messageTokenCounts.reduce(
        (sum, item) => sum + item.tokens,
        0
    )

    if (totalTokens <= maxTokens) {
        return messages
    }

    const result: ModelMessage[] = []
    let usedTokens = 0

    if (firstUserMessage) {
        const firstUserTokens = estimateTokenCount(
            firstUserMessage.content,
            modelId
        )
        if (firstUserTokens < maxTokens * 0.3) {
            result.push(firstUserMessage)
            usedTokens += firstUserTokens
        }
    }

    const recentMessages: ModelMessage[] = []

    for (let i = messages.length - 1; i >= 0; i--) {
        const { message, tokens } = messageTokenCounts[i]
        if (firstUserMessage && i === firstUserIndex) continue
        if (usedTokens + tokens <= maxTokens) {
            recentMessages.unshift(message)
            usedTokens += tokens
        } else {
            if (message.role === 'user' && recentMessages.length > 0) {
                while (recentMessages.length > 0 && usedTokens + tokens > maxTokens) {
                    const removed = recentMessages.shift()
                    if (removed) {
                        usedTokens -= estimateTokenCount(removed.content, modelId)
                    }
                }
                if (usedTokens + tokens <= maxTokens) {
                    recentMessages.unshift(message)
                    usedTokens += tokens
                }
            }
            break
        }
    }

    if (firstUserMessage && result.length > 0) {
        result.push(...recentMessages)
    } else {
        result.push(...recentMessages)
    }

    while (result.length > 0 && result[0].role !== 'user') {
        result.shift()
    }

    return result
}

export function shouldTruncateMessages(
    messages: ModelMessage[],
    model: Model
): boolean {
    if (!messages || messages.length === 0) return false
    const maxTokens = getMaxAllowedTokens(model)
    const totalTokens = messages.reduce(
        (sum, msg) => sum + estimateTokenCount(msg.content, model.id),
        0
    )
    return totalTokens > maxTokens
}
