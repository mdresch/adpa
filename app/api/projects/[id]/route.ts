import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requireAuth } from '@/lib/auth-middleware';

export const GET = requireAuth(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;

    // Check if user has access to this project
    const result = await sql`
      SELECT p.*
      FROM projects p
      WHERE p.id = ${id} 
      AND (p.owner_id = ${user.id} OR p.created_by = ${user.id} OR ${user.id} = ANY(
        SELECT jsonb_array_elements_text(p.team_members)
      ))
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get project documents
    const documentsResult = await sql`
      SELECT d.*
      FROM documents d
      WHERE d.project_id = ${id}
      ORDER BY d.created_at DESC
    `;

    const project = {
      ...result.rows[0],
      documents: documentsResult.rows,
    };

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      name, 
      description, 
      framework, 
      status, 
      priority, 
      start_date, 
      end_date, 
      budget, 
      team_members 
    } = body;

    // Check if user has permission to update this project (owner or admin)
    const checkResult = await sql`
      SELECT id FROM projects 
      WHERE id = ${id} AND (owner_id = ${user.id} OR created_by = ${user.id})
    `;

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or insufficient permissions' },
        { status: 403 }
      );
    }

    const result = await sql`
      UPDATE projects 
      SET name = ${name}, description = ${description}, framework = ${framework}, 
          status = ${status}, priority = ${priority}, start_date = ${start_date}, 
          end_date = ${end_date}, budget = ${budget}, 
          team_members = ${JSON.stringify(team_members)}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({
      message: 'Project updated successfully',
      project: result.rows[0],
    });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;

    // Check if user has permission to delete this project (owner only)
    const result = await sql`
      DELETE FROM projects 
      WHERE id = ${id} AND (owner_id = ${user.id} OR created_by = ${user.id})
      RETURNING name
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      message: 'Project deleted successfully' 
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});