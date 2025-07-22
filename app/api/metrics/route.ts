import { NextResponse } from 'next/server';
import { 
  checkDatabaseHealth, 
  checkKVHealth, 
  checkSystemHealth,
  updateRequestMetrics,
  metrics,
  updateDatabaseMetrics,
  updateCacheMetrics
} from '@/lib/monitoring';
import os from 'os';

export async function GET() {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Test database connection
    const dbHealth = await checkDatabaseHealth();
    
    // Test KV connection
    const kvHealth = await checkKVHealth();
    
    // System metrics
    const systemHealth = checkSystemHealth();
    
    success = true;
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(success, responseTime);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      application: {
        requests: metrics.requests,
        database: metrics.database,
        cache: metrics.cache
      },
      system: {
        memory: {
          total: systemHealth.memory.total,
          free: systemHealth.memory.free,
          usage: systemHealth.memory.usage
        },
        cpu: {
          load: systemHealth.cpu.load,
          cores: systemHealth.cpu.cores
        },
        uptime: os.uptime()
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(false, responseTime);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}