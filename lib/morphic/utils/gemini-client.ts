// Gemini SDK Client

import { GoogleGenAI } from '@google/genai'

/**
 * Singleton Gemini SDK client for File Search operations.
 * Uses the same GOOGLE_AI_API_KEY used by the AI SDK provider.
 */
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

if (!apiKey) {
    console.warn('[gemini-client] No GOOGLE_AI_API_KEY found. File Search features will be unavailable.')
}

export const genai = new GoogleGenAI({ apiKey: apiKey || '' })
