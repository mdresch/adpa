import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuth } from '@/lib/auth-middleware';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Build the query - only show documents from projects user has access to
    let query = `
      SELECT d.*
      FROM documents d
      INNER JOIN projects p ON d.project_id = p.id
      WHERE (p.owner_id = $1 OR p.created_by = $1 OR $1 = ANY(
        SELECT jsonb_array_elements_text(p.team_members)
      ))
    `;
    
    const params: any[] = [user.id];
    let paramCount = 1;

    if (projectId) {
      paramCount++;
      query += ` AND d.project_id = $${paramCount}`;
      params.push(projectId);
    }

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND d.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    // Execute the query
    const result = await sql.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM documents d 
      INNER JOIN projects p ON d.project_id = p.id
      WHERE (p.owner_id = $1 OR p.created_by = $1 OR $1 = ANY(
        SELECT jsonb_array_elements_text(p.team_members)
      ))`;
    const countParams: any[] = [user.id];
    let countParamCount = 1;

    if (projectId) {
      countParamCount++;
      countQuery += ` AND d.project_id = $${countParamCount}`;
      countParams.push(projectId);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND d.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND d.name ILIKE $${countParamCount}`;
      countParams.push(`%${search}%`);
    }

    const countResult = await sql.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      documents: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const {
      project_id,
      name,
      content,
      template_id,
      status = 'draft',
    } = body;

    // Check if user has access to the project
    const projectCheck = await sql`
      SELECT id FROM projects 
      WHERE id = ${project_id} 
      AND (owner_id = ${user.id} OR created_by = ${user.id} OR ${user.id} = ANY(
        SELECT jsonb_array_elements_text(team_members)
      ))
    `;

    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }

    const result = await sql`
      INSERT INTO documents (
        id, project_id, name, content, template_id, version, status, 
        created_by, updated_by, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${project_id}, ${name}, ${JSON.stringify(content)}, 
        ${template_id}, 1, ${status}, ${user.id}, ${user.id}, NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      message: 'Document created successfully',
      document: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});