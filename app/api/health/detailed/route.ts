import { NextResponse } from 'next/server';
import { 
  checkDatabaseHealth, 
  checkKVHealth, 
  checkSystemHealth,
  updateRequestMetrics,
  measurePerformance
} from '@/lib/monitoring';
import os from 'os';

export async function GET() {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Check database health with performance measurement
    const { result: dbHealth, duration: dbDuration } = await measurePerformance(
      'database health check',
      () => checkDatabaseHealth()
    );
    
    // Check KV health with performance measurement
    const { result: kvHealth, duration: kvDuration } = await measurePerformance(
      'KV health check',
      () => checkKVHealth()
    );
    
    // Get system health
    const systemHealth = checkSystemHealth();
    
    // Get process memory usage
    const memoryUsage = process.memoryUsage();
    
    // Determine overall status
    const overallStatus = 
      dbHealth.status === 'unhealthy' || kvHealth.status === 'unhealthy'
        ? 'unhealthy'
        : dbHealth.status === 'degraded' || kvHealth.status === 'degraded' || systemHealth.status === 'degraded'
          ? 'degraded'
          : 'healthy';
    
    success = overallStatus !== 'unhealthy';
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(success, responseTime);
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbHealth.status,
          responseTime: `${dbDuration}ms`,
          error: dbHealth.error
        },
        cache: {
          status: kvHealth.status,
          responseTime: `${kvDuration}ms`,
          error: kvHealth.error
        }
      },
      system: {
        status: systemHealth.status,
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: {
          total: `${Math.round(systemHealth.memory.total / (1024 * 1024))} MB`,
          free: `${Math.round(systemHealth.memory.free / (1024 * 1024))} MB`,
          usage: `${systemHealth.memory.usage.toFixed(2)}%`,
          processUsage: {
            rss: `${Math.round(memoryUsage.rss / (1024 * 1024))} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / (1024 * 1024))} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / (1024 * 1024))} MB`
          }
        },
        cpu: {
          cores: systemHealth.cpu.cores,
          load: `${systemHealth.cpu.load.toFixed(2)}%`
        }
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(false, responseTime);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}