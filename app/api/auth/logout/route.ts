import { NextRequest, NextResponse } from 'next/server';
import { validateSession, revokeSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (token) {
      // Validate and get session ID
      const result = await validateSession(token);
      
      if (result.sessionId) {
        // Revoke session
        await revokeSession(result.sessionId);
      }
    }

    // Clear auth cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we still want to clear the cookie
    const response = NextResponse.json(
      { error: 'Logout failed, but cookie cleared' },
      { status: 500 }
    );
    response.cookies.delete('auth_token');
    
    return response;
  }
}