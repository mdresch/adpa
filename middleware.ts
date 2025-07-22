import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from './lib/auth';

// List of paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/auth/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/verify-mfa'
];

// Function to check if the path is public
function isPublicPath(path: string) {
  return publicPaths.some(publicPath => 
    path === publicPath || 
    path.startsWith(publicPath + '/')
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for public paths
  if (isPublicPath(path)) {
    return NextResponse.next();
  }
  
  // Skip middleware for static files
  if (
    path.startsWith('/_next') || 
    path.startsWith('/static') || 
    path.includes('.') // Simple check for file extensions
  ) {
    return NextResponse.next();
  }

  // Get token from cookie or Authorization header
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');

  // If no token is present, redirect to login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', encodeURIComponent(request.nextUrl.pathname));
    return NextResponse.redirect(url);
  }

  try {
    // Validate session
    const result = await validateSession(token);

    if (!result.isValid) {
      // If MFA is required, redirect to MFA verification page
      if (result.requiresMfa) {
        const url = new URL('/auth/mfa', request.url);
        url.searchParams.set('sessionId', result.sessionId || '');
        url.searchParams.set('from', encodeURIComponent(request.nextUrl.pathname));
        return NextResponse.redirect(url);
      }

      // If session is invalid, redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('from', encodeURIComponent(request.nextUrl.pathname));
      return NextResponse.redirect(url);
    }

    // Session is valid, proceed
    return NextResponse.next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    // On error, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set('from', encodeURIComponent(request.nextUrl.pathname));
    return NextResponse.redirect(url);
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};