import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Build the query
    let query = `
      SELECT d.*
      FROM documents d
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;

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
    let countQuery = "SELECT COUNT(*) FROM documents WHERE 1=1";
    const countParams: any[] = [];
    let countParamCount = 0;

    if (projectId) {
      countParamCount++;
      countQuery += ` AND project_id = $${countParamCount}`;
      countParams.push(projectId);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND name ILIKE $${countParamCount}`;
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      name,
      content,
      template_id,
      status = 'draft',
    } = body;

    // In a real implementation, you'd get the user ID from authentication
    const created_by = 'placeholder-user-id';

    const result = await sql`
      INSERT INTO documents (
        id, project_id, name, content, template_id, version, status, 
        created_by, updated_by, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${project_id}, ${name}, ${JSON.stringify(content)}, 
        ${template_id}, 1, ${status}, ${created_by}, ${created_by}, NOW(), NOW()
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
}