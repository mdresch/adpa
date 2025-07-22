
/**
 * Health Check API Endpoint
 * 
 * This endpoint checks the health of various services including Vercel KV.
 * It can be used to verify that the KV connection is working properly.
 */

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Test KV connection
    const testKey = 'health:check';
    const testValue = Date.now();

    // Try to set a value
    await kv.set(testKey, testValue, { ex: 60 }); // 60 second TTL

    // Try to get the value back
    const retrievedValue = await kv.get(testKey);

    // Check if the value matches
    const kvStatus = retrievedValue === testValue ? 'connected' : 'error';

    // Test database connection
    const dbResult = await sql`SELECT 1 as db_status`;

    return NextResponse.json({
      status: kvStatus === 'connected' && dbResult.rows[0].db_status === 1 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        kv: kvStatus,
        database: dbResult.rows[0].db_status === 1 ? 'connected' : 'error',
      }
    });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          kv: 'error',
          database: 'error'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}