import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    // Get user from database
    const result = await sql`
      SELECT id, email, name, role, permissions, is_active 
      FROM users 
      WHERE id = ${decoded.userId}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return null;
    }

    // Update last login (don't await to avoid blocking)
    sql`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `.catch(err => console.error('Failed to update last login:', err));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || {},
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthenticatedUser, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]): Promise<Response> => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, user, ...args);
  };
}

export function requireRole(roles: string[]) {
  return function(handler: (request: NextRequest, user: AuthenticatedUser, ...args: any[]) => Promise<Response>) {
    return async (request: NextRequest, ...args: any[]): Promise<Response> => {
      const user = await authenticateRequest(request);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (!roles.includes(user.role)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return handler(request, user, ...args);
    };
  };
}

export function requirePermission(permission: string) {
  return function(handler: (request: NextRequest, user: AuthenticatedUser, ...args: any[]) => Promise<Response>) {
    return async (request: NextRequest, ...args: any[]): Promise<Response> => {
      const user = await authenticateRequest(request);
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (!user.permissions[permission]) {
        return new Response(
          JSON.stringify({ error: `Permission '${permission}' required` }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return handler(request, user, ...args);
    };
  };
}