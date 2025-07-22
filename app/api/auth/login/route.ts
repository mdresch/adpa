import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength (only for registration, not login)
    // const passwordValidation = validatePassword(password);
    // if (!passwordValidation.isValid) {
    //   return NextResponse.json(
    //     { error: passwordValidation.message },
    //     { status: 400 }
    //   );
    // }

    // Authenticate user
    const result = await authenticateUser(email, password);

    // Set HTTP-only cookie with the token for better security
    const response = NextResponse.json({
      user: result.user,
      requiresMfa: result.requiresMfa
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
    console.error('Login error:', error);
    
    // Handle specific error cases
    if (error.message === 'Invalid credentials') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    if (error.message === 'Too many login attempts. Please try again later.') {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}