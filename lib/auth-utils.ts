import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { pool } from '@/server/src/database/connection';
import { logger } from '@/server/src/utils/logger';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
    permissions: any;
}

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]?.trim();
    }

    // Fallback to query param
    if (!token) {
        const { searchParams } = new URL(req.url);
        token = searchParams.get('token');
    }

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

        const result = await pool.query(
            "SELECT id, email, role, permissions, is_active FROM users WHERE id = $1",
            [decoded.userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return null;
        }

        const user = result.rows[0];

        // Update last login (best-effort)
        pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])
            .catch(err => logger.warn('Failed to update last_login', { userId: user.id, error: err }));

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        };
    } catch (error) {
        logger.error('Token verification failed:', error);
        return null;
    }
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(message = 'Insufficient permissions') {
    return NextResponse.json({ error: message }, { status: 403 });
}

export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
    const role = user.role?.toLowerCase();
    if (role === 'super_admin' || role === 'admin') return true;

    const permissions = user.permissions || {};
    return !!permissions[permission];
}
