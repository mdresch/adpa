import { NextRequest, NextResponse } from 'next/server';

/**
 * SMART AUTH PROXY
 * Handles the communication between Vercel (Frontend) and Azure (Backend).
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  
  if (path === 'debug') {
    try {
      const start = Date.now();
      const testRes = await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
      const duration = Date.now() - start;
      return NextResponse.json({
        status: 'debug',
        backendUrl: BACKEND_URL,
        reachable: testRes.ok,
        backendStatus: testRes.status,
        durationMs: duration
      });
    } catch (e: any) {
      return NextResponse.json({
        status: 'error',
        backendUrl: BACKEND_URL,
        error: e.message
      }, { status: 500 });
    }
  }

  return proxyAuthRequest(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyAuthRequest(request, params.path);
}

async function proxyAuthRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = new URL(`${BACKEND_URL}/api/v1/auth/${path}`);
  
  const headers = new Headers(request.headers);
  const backendHost = new URL(BACKEND_URL).host;
  headers.set('Host', backendHost);

  try {
    console.log(`[SmartProxy] Forwarding ${request.method} /api/auth/${path} to Azure: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: request.method,
      headers: headers,
      cache: 'no-store',
      // DO NOT read body for GET
      body: request.method !== 'GET' ? await request.blob() : undefined
    });

    console.log(`[SmartProxy] Azure response: ${response.status}`);

    const data = response.status === 204 ? null : await response.blob();
    
    return new NextResponse(data, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error: any) {
    console.error('[SmartProxy] Connectivity Failure:', error.message);
    return NextResponse.json({ 
      error: 'Backend Connectivity Failure', 
      details: error.message,
      target: url.toString()
    }, { status: 502 });
  }
}
