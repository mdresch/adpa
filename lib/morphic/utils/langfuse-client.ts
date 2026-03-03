import Langfuse from 'langfuse'

let langfuseInstance: Langfuse | null = null
let lastErrorLog = 0
const ERROR_LOG_THROTTLE = 60000 // Only log errors once per minute

/**
 * Get or create a singleton Langfuse client for the Morphic frontend.
 * Returns null if tracing is disabled or credentials are missing.
 */
export function getLangfuseClient(): Langfuse | null {
    if (process.env.ENABLE_LANGFUSE_NATIVE_SDK === 'false') return null
    if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return null

    if (!langfuseInstance) {
        // Suppress Langfuse SDK console errors by overriding console.error temporarily
        const originalConsoleError = console.error
        const suppressedErrors: string[] = []
        
        console.error = (...args: any[]) => {
            const message = args.join(' ')
            // Suppress JSON parse errors from Langfuse SDK
            if (message.includes('[Langfuse SDK]') && message.includes('not valid JSON')) {
                suppressedErrors.push(message)
                // Throttled logging - only show once per minute
                const now = Date.now()
                if (now - lastErrorLog > ERROR_LOG_THROTTLE) {
                    originalConsoleError('[Langfuse] Endpoint unavailable (errors suppressed for 60s)')
                    lastErrorLog = now
                }
                return
            }
            originalConsoleError(...args)
        }

        try {
            langfuseInstance = new Langfuse({
                publicKey: process.env.LANGFUSE_PUBLIC_KEY,
                secretKey: process.env.LANGFUSE_SECRET_KEY,
                baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
                // SDK will continue trying to send, but errors are suppressed
                flushAt: 1, // Flush immediately to get faster feedback when endpoint recovers
                requestTimeout: 5000 // Reduce timeout to fail faster
            })
            console.log('[Langfuse] Native SDK client initialized (error suppression active)')
        } finally {
            // Keep console.error overridden to catch runtime errors too
            // console.error = originalConsoleError
        }
    }

    return langfuseInstance
}

/**
 * Check if Langfuse tracing is enabled (convenience re-export).
 */
export function isLangfuseEnabled(): boolean {
    return process.env.ENABLE_LANGFUSE_NATIVE_SDK !== 'false'
        && !!process.env.LANGFUSE_PUBLIC_KEY
        && !!process.env.LANGFUSE_SECRET_KEY
}
