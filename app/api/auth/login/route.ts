import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, connectDatabase } from '@/server/src/database/connection';
import { logger } from '@/server/src/utils/logger';

export async function POST(req: Request) {
    // Initialize database connection (safe to call multiple times)
    await connectDatabase();

    try {
        const { email, password } = await req.json();

        const result = await pool.query(
            `SELECT 
        u.id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active, 
        u.metadata, u.company_id,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return NextResponse.json({ error: "Account deactivated" }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );

        // Update last login
        await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);

        let normalizedMetadata = {};
        if (user.metadata) {
            normalizedMetadata = typeof user.metadata === 'string' ? JSON.parse(user.metadata) : user.metadata;
        }

        if (user.company_name && !normalizedMetadata.company_name) {
            normalizedMetadata.company_name = user.company_name;
        }

        return NextResponse.json({
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions,
                metadata: normalizedMetadata,
                company_id: user.company_id || null,
            },
            token,
        });
    } catch (error) {
        logger.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
