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
        // Verify project exists
        const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check which columns exist in the risks table (porting logic from projects.ts)
        let availableColumns: Set<string> = new Set();
        const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'risks'
    `);

        if (columnCheck.rows && columnCheck.rows.length > 0) {
            availableColumns = new Set(columnCheck.rows.map((row: any) => row.column_name));
        } else {
            availableColumns = new Set(['id', 'title', 'project_id']);
        }

        // Build SELECT fields dynamically
        const selectFields = ['r.id', 'r.title'];
        if (availableColumns.has('description')) selectFields.push('r.description');
        if (availableColumns.has('category')) selectFields.push('r.category');
        if (availableColumns.has('probability')) selectFields.push('r.probability');
        if (availableColumns.has('impact')) selectFields.push('r.impact');

        if (availableColumns.has('severity')) {
            selectFields.push('r.severity');
        } else if (availableColumns.has('probability') && availableColumns.has('impact')) {
            selectFields.push(`(
        CASE 
          WHEN r.probability IN ('very_high', 'high') AND r.impact IN ('very_high', 'high') THEN 'critical'
          WHEN r.probability IN ('very_high', 'high') OR r.impact IN ('very_high', 'high') THEN 'high'
          WHEN r.probability = 'medium' AND r.impact = 'medium' THEN 'medium'
          ELSE 'low'
        END
      ) as severity`);
        } else {
            selectFields.push("'low' as severity");
        }

        if (availableColumns.has('status')) {
            selectFields.push("COALESCE(r.status, 'identified') as status");
        } else {
            selectFields.push("'identified' as status");
        }

        if (availableColumns.has('mitigation_strategy')) selectFields.push('r.mitigation_strategy');
        if (availableColumns.has('contingency_plan')) selectFields.push('r.contingency_plan');
        if (availableColumns.has('owner')) selectFields.push('r.owner');

        const hasRiskOrigin = availableColumns.has('risk_origin');
        const hasRiskLevel = availableColumns.has('risk_level');
        const hasIsCurated = availableColumns.has('is_curated');
        const hasExtractedFromDoc = availableColumns.has('extracted_from_document_id');
        const hasSourceDoc = availableColumns.has('source_document_id');

        if (hasRiskOrigin) selectFields.push("COALESCE(r.risk_origin, 'project-extraction') as risk_origin");
        else selectFields.push("'project-extraction' as risk_origin");

        if (hasRiskLevel) selectFields.push("COALESCE(r.risk_level, 'project') as risk_level");
        else selectFields.push("'project' as risk_level");

        if (hasIsCurated) selectFields.push('COALESCE(r.is_curated, false) as is_curated');
        else selectFields.push('false as is_curated');

        if (hasExtractedFromDoc) selectFields.push('r.extracted_from_document_id');
        if (hasSourceDoc) selectFields.push('r.source_document_id');

        if (availableColumns.has('created_at')) selectFields.push('r.created_at');
        if (availableColumns.has('updated_at')) selectFields.push('r.updated_at');

        // Join documents if possible
        let joinClause = '';
        if (hasExtractedFromDoc || hasSourceDoc) {
            selectFields.push('d.title as source_document_title');
            if (hasExtractedFromDoc && hasSourceDoc) {
                joinClause = 'LEFT JOIN documents d ON (r.extracted_from_document_id = d.id OR (r.source_document_id IS NOT NULL AND r.source_document_id = d.id))';
            } else if (hasExtractedFromDoc) {
                joinClause = 'LEFT JOIN documents d ON r.extracted_from_document_id = d.id';
            } else {
                joinClause = 'LEFT JOIN documents d ON r.source_document_id = d.id';
            }
        }

        // Join issues (lateral join from original code)
        selectFields.push('ri.issue_id as related_issue_id');
        joinClause += `
      LEFT JOIN LATERAL (
        SELECT i.id as issue_id
        FROM issues i
        WHERE i.related_risk_id = r.id
        ORDER BY i.created_at DESC
        LIMIT 1
      ) ri ON TRUE
    `;

        const orderByClause = availableColumns.has('severity')
            ? `ORDER BY CASE COALESCE(r.severity, 'low') WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`
            : 'ORDER BY r.id DESC';

        const query = `
      SELECT ${selectFields.join(', ')}
      FROM risks r
      ${joinClause}
      WHERE r.project_id = $1
      ${orderByClause}
    `;

        const result = await pool.query(query, [projectId]);

        return NextResponse.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error("Get project risks error:", error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
