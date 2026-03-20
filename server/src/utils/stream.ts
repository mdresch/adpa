import { Response as ExpressResponse } from 'express'

/**
 * Pipes a Web API Response (e.g. from Vercel AI SDK) to an Express Response.
 * This handles status, headers, and body streaming.
 */
export async function pipeWebResponseToExpress(
    webResponse: Response,
    expressRes: ExpressResponse
): Promise<void> {
    // Copy status
    expressRes.status(webResponse.status)

    // Copy headers
    webResponse.headers.forEach((value, key) => {
        // Skip content-encoding if we're not sure about the chunking
        if (key.toLowerCase() === 'content-encoding') return
        expressRes.setHeader(key, value)
    })

    if (!webResponse.body) {
        expressRes.end()
        return
    }

    const reader = webResponse.body.getReader()
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            expressRes.write(value)
        }
    } catch (error) {
        console.error('[STREAM-PIPE] Error piping web response to express:', error)
        if (!expressRes.headersSent) {
            expressRes.status(500).end()
        }
    } finally {
        expressRes.end()
    }
}
