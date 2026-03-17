import { NextResponse } from 'next/server'

export async function GET() {
    const keys = Object.keys(process.env).sort()
    const debug: Record<string, any> = {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_RUNTIME: process.env.NEXT_RUNTIME,
        ENABLE_AUTH: process.env.ENABLE_AUTH,
        DATABASE_URL: process.env.DATABASE_URL ? 'set (masked)' : 'not set',
        MORPHIC_DATABASE_URL: process.env.MORPHIC_DATABASE_URL ? 'set' : 'not set'
    }

    return NextResponse.json({
        message: 'Debug Environment',
        runtime: process.env.NEXT_RUNTIME || 'unknown',
        debug,
        allKeys: keys,
        timestamp: new Date().toISOString()
    })
}
