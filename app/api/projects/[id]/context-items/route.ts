import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth-utils';
import { pool, connectDatabase } from '@/server/src/database/connection';
import { logger } from '@/server/src/utils/logger';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    // Initialize database connection (safe to call multiple times)
    await connectDatabase();


    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const is_active = searchParams.get('is_active');
        const integration_type = searchParams.get('integration_type');

        // Verify project exists
        const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        let query = `
      SELECT 
        id, project_id, type, title, content, source_url, original_filename, file_type,
        integration_type, integration_page_id, metadata, is_active, priority,
        created_by, created_at, updated_at
      FROM project_context_items
      WHERE project_id = $1
    `;
        const queryParams: any[] = [projectId];
        let paramCount = 1;

        if (type) {
            paramCount++;
            query += ` AND type = $${paramCount}`;
            queryParams.push(type);
        }

        if (is_active !== null) {
            paramCount++;
            query += ` AND is_active = $${paramCount}`;
            queryParams.push(is_active === 'true');
        }

        if (integration_type) {
            paramCount++;
            query += ` AND integration_type = $${paramCount}`;
            queryParams.push(integration_type);
        }

        query += ` ORDER BY priority DESC, created_at DESC`;

        const result = await pool.query(query, queryParams);

        return NextResponse.json({
            success: true,
            items: result.rows.map((row) => ({
                ...row,
                metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
            })),
        });
    } catch (error) {
        logger.error("Get context items error:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to retrieve context items",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
