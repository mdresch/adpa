import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        const fetchUrl = `${BACKEND_URL}/api/v1/morphic/history?${searchParams.toString()}`
        console.log(`[FRONTEND-PROXY] Fetching: ${fetchUrl}`)
        
        const response = await fetch(fetchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Backend error' }))
            return NextResponse.json(error, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[FRONTEND-PROXY] History error:', error)
        // Return an empty-but-valid response so the sidebar degrades gracefully
        // instead of triggering SWR error retries. The backend (Render) may be
        // cold-starting; history will rehydrate on the next focus/revalidation.
        return NextResponse.json(
            { chats: [], nextOffset: null },
            { status: 200 }
        )
    }
}
