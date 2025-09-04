import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const framework = searchParams.get('framework');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Build the query
    let query = `
      SELECT p.*, COUNT(d.id) as document_count
      FROM projects p
      LEFT JOIN documents d ON p.id = d.project_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;

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

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    // Execute the query
    const result = await sql.query(query, params);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) FROM projects WHERE 1=1";
    const countParams: any[] = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    if (framework) {
      countParamCount++;
      countQuery += ` AND framework = $${countParamCount}`;
      countParams.push(framework);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await sql.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

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
    console.error('Get projects error:', error);
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
      name,
      description,
      framework,
      priority = 'medium',
      start_date,
      end_date,
      budget,
      team_members = [],
    } = body;

    // In a real implementation, you'd get the user ID from authentication
    // For now, we'll use a placeholder
    const owner_id = 'placeholder-user-id';

    const result = await sql`
      INSERT INTO projects (
        id, name, description, framework, priority, start_date, end_date, 
        budget, owner_id, team_members, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${name}, ${description}, ${framework}, ${priority}, 
        ${start_date}, ${end_date}, ${budget}, ${owner_id}, ${JSON.stringify(team_members)},
        NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      message: 'Project created successfully',
      project: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}