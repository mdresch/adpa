import { NextRequest, NextResponse } from 'next/server';

/**
 * SMART AUTH PROXY
 * Handles the communication between Vercel (Frontend) and Azure (Backend).
 * 
 * CRITICAL: In Next.js 15+, 'params' is a Promise and must be awaited.
 */

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const resolvedParams = await params;
  return await proxyRequest(request, resolvedParams.path || []);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const resolvedParams = await params;
  return await proxyRequest(request, resolvedParams.path || []);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  const resolvedParams = await params;
  return await proxyRequest(request, resolvedParams.path || []);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  const resolvedParams = await params;
  return await proxyRequest(request, resolvedParams.path || []);
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = new URL(`${BACKEND_URL}/api/v1/auth/${path}`);
  
  // Append original search params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Forward all headers except 'host', which we must override for Azure
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });
  
  const backendHost = new URL(BACKEND_URL).host;
  headers.set('Host', backendHost);

  try {
    const options: RequestInit = {
      method: request.method,
      headers: headers,
      cache: 'no-store',
    };

    // Forward body for non-GET requests
    if (!['GET', 'HEAD'].includes(request.method)) {
      try {
        options.body = await request.blob();
      } catch (e) {
        // Fallback for empty bodies
      }
    }

    const response = await fetch(url.toString(), options);

    // Read the response body
    let data: any = null;
    if (response.status !== 204) {
      try {
        data = await response.blob();
      } catch (e) {
        // Fallback if blob reading fails
      }
    }
    
    const responseHeaders = new Headers(response.headers);
    // Prevent content-decoding errors when proxying: fetch() may already decode
    // the backend payload, so forwarding original encoding/length can corrupt
    // the browser decode pipeline.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
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
