import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';

// Removed: This route imported backend-only code and cannot run in the Next.js API context.
// Please POST directly to the backend Express API for projects.

export async function GET(req: Request) {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    // Initialize database connection (safe to call multiple times)
    await connectDatabase();

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const status = searchParams.get('status');
        const framework = searchParams.get('framework');
        const search = searchParams.get('search');

        const offset = (page - 1) * limit;
        const isSuperAdmin = user.role === 'super_admin';

        // Get user's company_id
        let userCompanyId: string | null = null;
        if (!isSuperAdmin) {
            const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [user.id]);
            if (userResult.rows.length > 0) {
                userCompanyId = userResult.rows[0].company_id;
            }
        }

        let query = `
      SELECT p.*, u.name as owner_name, u.email as owner_email,
             COUNT(d.id) as document_count,
             MAX(d.updated_at) as last_document_activity,
             GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramCount = 0;

        if (!isSuperAdmin && userCompanyId) {
            paramCount++;
            query += ` AND p.company_id = $${paramCount}`;
            params.push(userCompanyId);
        } else if (!isSuperAdmin) {
            paramCount++;
            query += ` AND (p.owner_id = $${paramCount} OR p.team_members ? $${paramCount}::text)`;
            params.push(user.id);
        }

        if (status) {
            paramCount++;
            query += ` AND p.status = $${paramCount}`;
            params.push(status);
        }

        if (framework) {
            paramCount++;
            query += ` AND p.framework = $${paramCount}`;
            params.push(framework);
        }

        if (search) {
            paramCount++;
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ` GROUP BY p.id, u.name, u.email ORDER BY last_activity DESC NULLS LAST, p.name ASC, p.id ASC`;

        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await pool.query(query, params);

        // Count query
        let countQuery = "SELECT COUNT(*) FROM projects p WHERE 1=1";
        const countParams: any[] = [];
        let countParamCount = 0;

        if (!isSuperAdmin && userCompanyId) {
            countParamCount++;
            countQuery += ` AND p.company_id = $${countParamCount}`;
            countParams.push(userCompanyId);
        } else if (!isSuperAdmin) {
            countParamCount++;
            countQuery += ` AND (p.owner_id = $${countParamCount} OR p.team_members ? $${countParamCount}::text)`;
            countParams.push(user.id);
        }

        if (status) {
            countParamCount++;
            countQuery += ` AND p.status = $${countParamCount}`;
            countParams.push(status);
        }

        if (framework) {
            countParamCount++;
            countQuery += ` AND p.framework = $${countParamCount}`;
            countParams.push(framework);
        }

        if (search) {
            countParamCount++;
            countQuery += ` AND (p.name ILIKE $${countParamCount} OR p.description ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count, 10);

        return NextResponse.json({
            projects: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error("Get projects error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
