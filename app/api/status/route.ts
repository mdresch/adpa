import { NextResponse } from 'next/server';
import { 
  checkDatabaseHealth, 
  checkKVHealth, 
  checkSystemHealth,
  updateRequestMetrics,
  statusHistory,
  addStatusEntry,
  THRESHOLDS,
  checkAlerts
} from '@/lib/monitoring';

export async function GET() {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Check database status
    const dbHealth = await checkDatabaseHealth();
    
    // Check KV status
    const kvHealth = await checkKVHealth();
    
    // Check system status
    const systemHealth = checkSystemHealth();
    
    // Overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbHealth.status === 'unhealthy' || kvHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (dbHealth.status === 'degraded' || kvHealth.status === 'degraded' || systemHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    // Check for alerts
    const alerts = checkAlerts();
    
    const responseTime = Date.now() - startTime;
    success = overallStatus !== 'unhealthy';
    updateRequestMetrics(success, responseTime);
    
    // Create status entry
    const statusEntry = {
      timestamp: new Date().toISOString(),
      status: overallStatus,
      services: {
        database: dbHealth.status,
        cache: kvHealth.status,
        system: systemHealth.status
      }
    };
    
    // Add to history
    addStatusEntry(statusEntry);
    
    return NextResponse.json({
      current: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        services: {
          database: {
            status: dbHealth.status,
            responseTime: `${dbHealth.responseTime}ms`,
            error: dbHealth.error
          },
          cache: {
            status: kvHealth.status,
            responseTime: `${kvHealth.responseTime}ms`,
            error: kvHealth.error
          },
          system: {
            status: systemHealth.status,
            memory: {
              usage: `${systemHealth.memory.usage.toFixed(2)}%`,
              threshold: `${THRESHOLDS.memoryUsage}%`
            },
            cpu: {
              load: `${systemHealth.cpu.load.toFixed(2)}%`,
              threshold: `${THRESHOLDS.cpuLoad}%`
            }
          }
        },
        alerts: alerts.length > 0 ? alerts : null
      },
      history: statusHistory,
      thresholds: THRESHOLDS
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateRequestMetrics(false, responseTime);
    
    const statusEntry = {
      timestamp: new Date().toISOString(),
      status: 'unhealthy' as const,
      services: {
        database: 'unknown',
        cache: 'unknown',
        system: 'unknown'
      }
    };
    
    addStatusEntry(statusEntry);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        history: statusHistory
      },
      { status: 500 }
    );
  }
}