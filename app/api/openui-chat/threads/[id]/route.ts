import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value
        const query = searchParams.toString()
        const fetchUrl = `${BACKEND_URL}/api/v1/openui-chat/threads/${id}${query ? `?${query}` : ''}`

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
        console.error('[FRONTEND-PROXY] OpenUI thread error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}