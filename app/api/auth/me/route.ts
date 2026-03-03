import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { pool, connectDatabase } from '@/server/src/database/connection';
import { logger } from '@/server/src/utils/logger';

export async function GET(req: Request) {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return unauthorizedResponse();

    // Initialize database connection (safe to call multiple times)
    await connectDatabase();

    try {
        const result = await pool.query(
            `SELECT 
        u.id, u.email, u.name, u.role, u.permissions, u.avatar_url, u.created_at, 
        u.metadata, u.company_id,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = $1`,
            [authUser.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = result.rows[0];

        // Normalize metadata
        if (user.metadata) {
            user.metadata = typeof user.metadata === 'string' ? JSON.parse(user.metadata) : user.metadata;
        } else {
            user.metadata = {};
        }

        if (user.company_name && !user.metadata.company_name) {
            user.metadata.company_name = user.company_name;
        }

        return NextResponse.json({ user });
    } catch (error) {
        logger.error("Get user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
