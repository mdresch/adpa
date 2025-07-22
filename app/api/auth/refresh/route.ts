import { NextRequest, NextResponse } from 'next/server';
import { validateSession, refreshSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate current session
    const validationResult = await validateSession(token);

    if (!validationResult.isValid || !validationResult.sessionId) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Refresh session
    const result = await refreshSession(validationResult.sessionId);

    // Set HTTP-only cookie with the new token
    const response = NextResponse.json({
      user: result.user,
      refreshed: true
    }, { status: 200 });

    // Set secure HTTP-only cookie with the token
    response.cookies.set({
      name: 'auth_token',
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Session refresh error:', error);
    
    if (error.message === 'Session not found') {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Session refresh failed' },
      { status: 500 }
    );
  }
}