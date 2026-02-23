import Langfuse from 'langfuse'

let langfuseInstance: Langfuse | null = null

/**
 * Get or create a singleton Langfuse client for the Morphic frontend.
 * Returns null if tracing is disabled or credentials are missing.
 */
export function getLangfuseClient(): Langfuse | null {
    if (process.env.ENABLE_LANGFUSE_TRACING !== 'true') return null
    if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return null

    if (!langfuseInstance) {
        langfuseInstance = new Langfuse({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
        })
        console.log('[Langfuse] Native SDK client initialized for Morphic frontend')
    }

    return langfuseInstance
}

/**
 * Check if Langfuse tracing is enabled (convenience re-export).
 */
export function isLangfuseEnabled(): boolean {
    return process.env.ENABLE_LANGFUSE_TRACING === 'true'
        && !!process.env.LANGFUSE_PUBLIC_KEY
        && !!process.env.LANGFUSE_SECRET_KEY
}
