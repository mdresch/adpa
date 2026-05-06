import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'

const buildProxyHeaders = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

const forward = async (
  req: NextRequest,
  path: string[],
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
) => {
  try {
    const url = new URL(`${BACKEND_URL}/api/v1/morphic/admin/${path.join('/')}`)
    req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value))

    const headers = await buildProxyHeaders()
    const init: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    }

    if (!['GET', 'HEAD'].includes(method)) {
      const body = await req.text()
      if (body) {
        headers['Content-Type'] = req.headers.get('content-type') || 'application/json'
        init.body = body
      }
    }

    const response = await fetch(url.toString(), init)
    const responseBody = response.status === 204 ? null : await response.text()

    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')
    responseHeaders.delete('transfer-encoding')
    responseHeaders.delete('connection')

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Morphic admin proxy failure', details: error?.message || 'Unknown error' },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, (await params).path || [], 'GET')
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, (await params).path || [], 'POST')
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, (await params).path || [], 'PUT')
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, (await params).path || [], 'PATCH')
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, (await params).path || [], 'DELETE')
}

