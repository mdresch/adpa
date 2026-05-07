import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        const response = await fetch(`${BACKEND_URL}/api/v1/morphic/admin/providers`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        const data = await response.json().catch(() => ({ error: 'Backend error' }))
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        console.error('[FRONTEND-PROXY] Admin providers error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        const response = await fetch(`${BACKEND_URL}/api/v1/morphic/admin/providers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        const data = await response.json().catch(() => ({ error: 'Backend error' }))
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        console.error('[FRONTEND-PROXY] Admin providers error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}

