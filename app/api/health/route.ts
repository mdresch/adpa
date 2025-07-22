import { sql } from '@vercel/postgres';
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test database connection
    const dbResult = await sql`SELECT 1 as db_status`;

    // Test KV connection
    await kv.set('health:check', Date.now(), { ex: 60 });
    const kvResult = await kv.get('health:check');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult.rows[0].db_status === 1 ? 'connected' : 'error',
        cache: kvResult ? 'connected' : 'error'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}