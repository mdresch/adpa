import { NextRequest, NextResponse } from 'next/server';
import { verifyMfaCode } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, code } = body;

    // Validate input
    if (!sessionId || !code) {
      return NextResponse.json(
        { error: 'Session ID and verification code are required' },
        { status: 400 }
      );
    }

    // Verify MFA code
    const result = await verifyMfaCode(sessionId, code);

    // Set HTTP-only cookie with the token for better security
    const response = NextResponse.json({
      user: result.user,
      verified: true
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
    console.error('MFA verification error:', error);
    
    if (error.message === 'Invalid MFA code') {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }
    
    if (error.message === 'Session not found') {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'MFA verification failed' },
      { status: 500 }
    );
  }
}