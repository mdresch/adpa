import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '@/server/src/database/connection';
import { logger } from '@/server/src/utils/logger';

// Default permissions for new users
const DEFAULT_USER_PERMISSIONS = {
    'projects.create': true,
    'projects.read': true,
    'projects.update': true,
    'projects.delete': true,
    'documents.create': true,
    'documents.read': true,
    'documents.update': true,
    'documents.delete': true,
    'templates.create': true,
    'templates.read': true,
    'templates.update': true,
    'templates.delete': true,
    'stakeholders.create': true,
    'stakeholders.read': true,
    'stakeholders.update': true,
    'stakeholders.delete': true,
};

const ADMIN_PERMISSIONS = {
    'admin': true,
    ...DEFAULT_USER_PERMISSIONS,
    'users.create': true,
    'users.read': true,
    'users.update': true,
    'users.delete': true,
    'settings.read': true,
    'settings.update': true,
    'integrations.create': true,
    'integrations.read': true,
    'integrations.update': true,
    'integrations.delete': true,
};

export async function POST(req: Request) {
    const client = await pool.connect();

    try {
        const { email, password, name, companyName } = await req.json();

        await client.query('BEGIN');

        // Check if user exists
        const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        let actualRole: 'admin' | 'user' = 'user';
        let permissions = DEFAULT_USER_PERMISSIONS;
        let companyId: string | null = null;

        if (companyName && companyName.trim()) {
            const existingCompany = await client.query(
                "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_active = true",
                [companyName.trim()]
            );

            if (existingCompany.rows.length > 0) {
                companyId = existingCompany.rows[0].id;
            } else {
                companyId = uuidv4();
                const emailDomain = email.split('@')[1] || null;
                await client.query(
                    `INSERT INTO companies (id, name, domain, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [companyId, companyName.trim(), emailDomain, true]
                );
            }
        }

        if (companyId) {
            const companyUserCountResult = await client.query(
                "SELECT COUNT(*) AS count FROM users WHERE company_id = $1 AND is_active = true",
                [companyId]
            );
            const existingCount = parseInt(companyUserCountResult.rows[0]?.count || '0', 10);

            if (existingCount === 0) {
                actualRole = 'admin';
                permissions = ADMIN_PERMISSIONS;
            }
        }

        const metadata = companyName ? { company_name: companyName.trim() } : null;

        const result = await client.query(
            `INSERT INTO users (email, password_hash, name, role, permissions, metadata, company_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, name, role, permissions, created_at, company_id, metadata`,
            [
                email,
                passwordHash,
                name,
                actualRole,
                JSON.stringify(permissions),
                metadata ? JSON.stringify(metadata) : null,
                companyId
            ]
        );

        await client.query('COMMIT');

        const user = result.rows[0];
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "24h" }
        );

        return NextResponse.json({
            message: "User created successfully",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions,
                company_id: user.company_id || null,
                metadata: typeof user.metadata === 'string' ? JSON.parse(user.metadata) : user.metadata,
            },
            token
        }, { status: 201 });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error("Registration error:", error);
        return NextResponse.json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Failed to create user account"
        }, { status: 500 });
    } finally {
        client.release();
    }
}
