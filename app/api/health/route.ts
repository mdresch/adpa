/**
 * Health Check API Endpoint
 * 
 * This endpoint checks the health of various services including Vercel KV.
 * It can be used to verify that the KV connection is working properly.
 */

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        kv: kvStatus
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          kv: 'error'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}