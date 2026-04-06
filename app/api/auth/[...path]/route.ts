import { NextRequest, NextResponse } from 'next/server';

/**
 * SMART AUTH PROXY
 * Handles the communication between Vercel (Frontend) and Azure (Backend).
 * 
 * CRITICAL: This Route Handler manually sets the 'Host' header to match the 
 * Azure Container App hostname, preventing 502 Bad Gateway errors caused by 
 * Vercel's default header preservation.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyAuthRequest(request, params.path);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyAuthRequest(request, params.path);
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyAuthRequest(request, params.path);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyAuthRequest(request, params.path);
}

async function proxyAuthRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const url = new URL(`${BACKEND_URL}/api/v1/auth/${path}`);
  
  // Append original search params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = new Headers(request.headers);
  const backendHost = new URL(BACKEND_URL).host;
  
  // SECRECY: Overwrite Host header to align with Azure Ingress expectations
  headers.set('Host', backendHost);
  
  // Ensure the backend-origin is respected in CORS contexts if needed
  headers.set('Origin', new URL(request.url).origin);

  // Handle potential body for POST/PUT
  let body: any = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 0) {
        body = await request.blob();
      }
    } catch (e: any) {
      console.warn(`[SmartProxy] Failed to read request body: ${e.message}`);
    }
  }

  console.log(`[SmartProxy] Forwarding ${request.method} /api/auth/${path} to Azure: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: request.method,
    headers: headers,
    body: body,
    cache: 'no-store',
  });

  console.log(`[SmartProxy] Azure response: ${response.status} ${response.statusText}`);

  // Read the response carefully
  let data: any;
  const contentType = response.headers.get('content-type');

  try {
    if (response.status === 204 || !contentType) {
      data = null;
    } else {
      data = await response.blob();
    }
  } catch (e: any) {
    console.error(`[SmartProxy] Failed to read response body: ${e.message}`);
    data = null;
  }

  // Create the proxied response
  const proxiedResponse = new NextResponse(data, {
    status: response.status,
    headers: response.headers,
  });
    return proxiedResponse;
  } catch (error: any) {
    console.error('[SmartProxy] Connectivity Failure:', error.message);
    return NextResponse.json({ 
      error: 'Backend Connectivity Failure', 
      details: error.message,
      target: url.toString()
    }, { status: 502 });
  }
}
