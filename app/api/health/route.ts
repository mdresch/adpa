import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime for maximum performance

export async function GET() {
    return NextResponse.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        runtime: 'Vercel Edge Function'
    });
}
