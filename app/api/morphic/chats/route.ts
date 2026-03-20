import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        const response = await fetch(`${BACKEND_URL}/api/v1/morphic/history?${searchParams.toString()}`, {
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
        return NextResponse.json(
            { chats: [], nextOffset: null, error: error.message },
            { status: 500 }
        )
    }
}
