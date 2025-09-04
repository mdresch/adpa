import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await sql`
      SELECT p.*
      FROM projects p
      WHERE p.id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await sql`
      UPDATE projects 
      SET name = ${name}, description = ${description}, framework = ${framework}, 
          status = ${status}, priority = ${priority}, start_date = ${start_date}, 
          end_date = ${end_date}, budget = ${budget}, 
          team_members = ${JSON.stringify(team_members)}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await sql`
      DELETE FROM projects 
      WHERE id = ${id} 
      RETURNING name
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
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
}