// Gemini SDK Client

import { GoogleGenAI } from '@google/genai'

/**
 * Singleton Gemini SDK client for File Search operations.
 * Uses the same GOOGLE_AI_API_KEY used by the AI SDK provider.
 */
const getApiKey = () => process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

export const genai = new Proxy({} as GoogleGenAI, {
    get(target: any, prop: string | symbol) {
        const apiKey = getApiKey()
        if (!apiKey) {
            console.error('[gemini-client] CRITICAL: GOOGLE_AI_API_KEY is missing. File Search operations will fail.')
            throw new Error('Gemini API key is not set. Please set GOOGLE_AI_API_KEY in your environment.')
        }
        
        // Cache the instance for performance
        if (!target._instance) {
            target._instance = new GoogleGenAI({ apiKey })
        }
        
        return (target._instance as any)[prop]
    }
})
