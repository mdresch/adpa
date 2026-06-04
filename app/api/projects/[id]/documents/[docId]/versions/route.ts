import { NextResponse } from 'next/server';
import { db } from '@/lib/morphic/db';
import { sql } from 'drizzle-orm';

/**
 * GET /api/projects/[id]/documents/[docId]/versions
 * 
 * Retrieves multi-scale context snapshots (p80, p60, p40, p20) for the Document Version Timeline.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: projectId, docId } = await params;

  if (!projectId || !docId) {
    return NextResponse.json({ error: 'Missing projectId or documentId' }, { status: 400 });
  }

  try {
    // Execute high-integrity raw query to bypass schema mapping constraints
    const result = await db.execute(sql`
      SELECT id, context_snapshots 
      FROM documents 
      WHERE id = ${docId} AND project_id = ${projectId}
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found in specified project scope' }, { status: 404 });
    }

    const document = result.rows[0] as any;
    const snapshots = document.context_snapshots || {};

    // Standardized payload format for the Review Layer Interface
    return NextResponse.json({
      documentId: docId,
      milestones: {
        p20: snapshots.p20 || { summary: "No 20% snapshot available", timestamp: null },
        p40: snapshots.p40 || { summary: "No 40% snapshot available", timestamp: null },
        p60: snapshots.p60 || { summary: "No 60% snapshot available", timestamp: null },
        p80: snapshots.p80 || { summary: "No 80% snapshot available", timestamp: null },
      }
    });
  } catch (error: any) {
    console.error(`[VERSION-TIMELINE] Critical fetch failure for doc ${docId}:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve document versions', details: error.message },
      { status: 500 }
    );
  }
}
