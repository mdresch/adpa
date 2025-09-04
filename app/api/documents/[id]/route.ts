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

    // Check if user has access to this document through project access
    const result = await sql`
      SELECT d.*
      FROM documents d
      INNER JOIN projects p ON d.project_id = p.id
      WHERE d.id = ${id}
      AND (p.owner_id = ${user.id} OR p.created_by = ${user.id} OR ${user.id} = ANY(
        SELECT jsonb_array_elements_text(p.team_members)
      ))
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document: result.rows[0] });
  } catch (error) {
    console.error('Get document error:', error);
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
    const { name, content, status } = body;

    // Check if user has access to update this document
    const checkResult = await sql`
      SELECT d.id
      FROM documents d
      INNER JOIN projects p ON d.project_id = p.id
      WHERE d.id = ${id}
      AND (p.owner_id = ${user.id} OR p.created_by = ${user.id} OR ${user.id} = ANY(
        SELECT jsonb_array_elements_text(p.team_members)
      ))
    `;

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 403 }
      );
    }

    const result = await sql`
      UPDATE documents 
      SET name = ${name}, content = ${JSON.stringify(content)}, status = ${status}, 
          updated_by = ${user.id}, updated_at = NOW(), version = version + 1
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({
      message: 'Document updated successfully',
      document: result.rows[0],
    });
  } catch (error) {
    console.error('Update document error:', error);
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

    // Check if user has access to delete this document
    const result = await sql`
      DELETE FROM documents 
      WHERE id = ${id} 
      AND EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = documents.project_id 
        AND (p.owner_id = ${user.id} OR p.created_by = ${user.id} OR ${user.id} = ANY(
          SELECT jsonb_array_elements_text(p.team_members)
        ))
      )
      RETURNING name
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      message: 'Document deleted successfully' 
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});