import { headers, cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { perfLog } from '@/lib/morphic/utils/perf-logging'
import { incrementAuthCallCount } from '@/lib/morphic/utils/perf-tracking'

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
        return decoded.userId
    } catch (error) {
        console.error('Failed to get current user ID:', error)
        return undefined
    }
}
