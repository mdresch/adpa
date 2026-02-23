import { db } from '@/lib/morphic/db'
import { aiProviders } from '@/lib/morphic/db/schema'
import { anthropic, createAnthropic } from '@ai-sdk/anthropic'
import { createGateway } from '@ai-sdk/gateway'
import { createGoogleGenerativeAI, google } from '@ai-sdk/google'
import { createMistral, mistral } from '@ai-sdk/mistral'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { createProviderRegistry, LanguageModel } from 'ai'
import { eq } from 'drizzle-orm'
import { createOllama } from 'ollama-ai-provider-v2'

// Static providers mapping based on env vars
const staticProviders: Record<string, any> = {
    openai,
    anthropic,
    google: createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    }),
    mistral,
    'openai-compatible': createOpenAI({
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        baseURL: process.env.OPENAI_COMPATIBLE_API_BASE_URL
    }),
    gateway: createGateway({
        apiKey: process.env.AI_GATEWAY_API_KEY
    })
}

const ollamaBaseUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL

if (ollamaBaseUrl) {
    console.log(`[Registry] Ollama provider initialized: ${ollamaBaseUrl}/api`)
    staticProviders.ollama = createOllama({
        baseURL: `${ollamaBaseUrl}/api`
    })
} else {
    console.warn('[Registry] OLLAMA_BASE_URL not set — Ollama provider disabled')
}

let dynamicRegistry = createProviderRegistry(staticProviders)

/**
 * Loads dynamic providers from database and updates the registry.
 */
export async function refreshRegistry() {
    try {
        const providersFromDb = await db.query.aiProviders.findMany({
            where: eq(aiProviders.isEnabled, 1)
        })

        const providers: Record<string, any> = { ...staticProviders }

        for (const p of providersFromDb) {
            const providerType = p.type || p.id // Fallback for legacy

            if (providerType === 'openai') {
                providers[p.id] = createOpenAI({
                    apiKey: p.apiKey || process.env.OPENAI_API_KEY,
                    baseURL: p.baseUrl || undefined
                })
            } else if (providerType === 'google') {
                providers[p.id] = createGoogleGenerativeAI({
                    apiKey: p.apiKey || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
                    baseURL: p.baseUrl || undefined
                })
            } else if (providerType === 'anthropic') {
                providers[p.id] = createAnthropic({
                    apiKey: p.apiKey || process.env.ANTHROPIC_API_KEY,
                    baseURL: p.baseUrl || undefined
                })
            } else if (providerType === 'ollama') {
                providers[p.id] = createOllama({
                    baseURL: p.baseUrl || `${ollamaBaseUrl}/api`
                })
            } else if (providerType === 'mistral') {
                providers[p.id] = createMistral({
                    apiKey: p.apiKey || process.env.MISTRAL_API_KEY,
                    baseURL: p.baseUrl || undefined
                })
            } else {
                // Default to OpenAI-compatible for custom IDs
                providers[p.id] = createOpenAI({
                    apiKey: p.apiKey || '',
                    baseURL: p.baseUrl || undefined
                })
            }
        }

        dynamicRegistry = createProviderRegistry(providers)
    } catch (error) {
        console.error('Failed to refresh AI registry:', error)
    }
}

export const registry = dynamicRegistry

export function getModel(model: string): LanguageModel {
    return dynamicRegistry.languageModel(
        model as Parameters<typeof registry.languageModel>[0]
    )
}

export function isProviderEnabled(providerId: string): boolean {
    // Check static first
    const staticEnabled = !!staticProviders[providerId]
    if (staticEnabled) {
        switch (providerId) {
            case 'openai': return !!process.env.OPENAI_API_KEY
            case 'anthropic': return !!process.env.ANTHROPIC_API_KEY
            case 'google': return !!process.env.GOOGLE_AI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
            case 'ollama': return !!ollamaBaseUrl
            default: return true
        }
    }
    return false
}
