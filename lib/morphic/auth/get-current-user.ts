import { headers, cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { perfLog } from '@/lib/morphic/utils/perf-logging'
import { incrementAuthCallCount } from '@/lib/morphic/utils/perf-tracking'

function normalizeBackendBaseUrl(url: string): string {
    return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '').replace(/\/api$/, '')
}

async function resolveUserIdViaBackend(token: string): Promise<string | undefined> {
    const configuredUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
    if (!configuredUrl) {
        return undefined
    }

    const baseUrl = normalizeBackendBaseUrl(configuredUrl)

    try {
        const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: 'no-store'
        })

        if (!response.ok) {
            return undefined
        }

        const payload = await response.json().catch(() => null)
        const userId = payload?.user?.id
        return typeof userId === 'string' && userId.length > 0 ? userId : undefined
    } catch {
        return undefined
    }
}

export async function getCurrentUserId(): Promise<string | undefined> {
    const count = incrementAuthCallCount()
    perfLog(`getCurrentUserId called - count: ${count}`)

    // Skip authentication mode (for personal Docker deployments)
    if (process.env.ENABLE_AUTH === 'false') {
        return process.env.ANONYMOUS_USER_ID || 'anonymous-user'
    }

    try {
        const head = await headers()
        const authHeader = head.get('authorization')
        let token = authHeader?.split(' ')[1]?.trim()

        if (!token) {
            // Fallback for cookie-based auth if needed
            const cookieStore = await cookies()
            token = cookieStore.get('auth_token')?.value
        }

        if (!token) {
            return undefined
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
            if (typeof decoded === 'object' && decoded) {
                if (typeof decoded.userId === 'string' && decoded.userId.length > 0) {
                    return decoded.userId
                }
                if (typeof decoded.sub === 'string' && decoded.sub.length > 0) {
                    return decoded.sub
                }
            }
        } catch (verifyError) {
            // Supports Firebase or non-legacy JWT algorithms by delegating validation to backend auth.
            const userIdFromBackend = await resolveUserIdViaBackend(token)
            if (userIdFromBackend) {
                return userIdFromBackend
            }

            console.error('Failed to verify token while resolving current user ID:', verifyError)
        }

        return undefined
    } catch (error) {
        console.error('Failed to get current user ID:', error)
        return undefined
    }
}
