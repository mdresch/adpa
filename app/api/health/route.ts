import { NextResponse } from 'next/server';
import { 
  checkDatabaseHealth, 
  checkKVHealth, 
  updateRequestMetrics 
} from '@/lib/monitoring';

export async function GET() {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Check KV health
    const kvHealth = await checkKVHealth();
    
    // Determine overall status
    const overallStatus = 
      dbHealth.status === 'unhealthy' || kvHealth.status === 'unhealthy'
        ? 'unhealthy'
        : dbHealth.status === 'degraded' || kvHealth.status === 'degraded'
          ? 'degraded'
          : 'healthy';
    
    success = overallStatus !== 'unhealthy';
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(success, responseTime);
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.status === 'unhealthy' ? 'error' : 'connected',
        cache: kvHealth.status === 'unhealthy' ? 'error' : 'connected'
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(false, responseTime);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}