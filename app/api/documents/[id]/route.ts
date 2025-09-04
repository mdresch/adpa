import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await sql`
      SELECT d.*
      FROM documents d
      WHERE d.id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, content, status } = body;

    // In a real implementation, you'd get the user ID from authentication
    const updated_by = 'placeholder-user-id';

    const result = await sql`
      UPDATE documents 
      SET name = ${name}, content = ${JSON.stringify(content)}, status = ${status}, 
          updated_by = ${updated_by}, updated_at = NOW(), version = version + 1
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await sql`
      DELETE FROM documents 
      WHERE id = ${id} 
      RETURNING name
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
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
}