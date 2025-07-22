import { sql } from '@vercel/postgres';
import { kv } from '@vercel/kv';
import os from 'os';

// Define thresholds for alerts
export const THRESHOLDS = {
  responseTime: 2000, // 2 seconds
  errorRate: 5, // 5%
  memoryUsage: 80, // 80%
  cpuLoad: 80 // 80%
};

// Simple in-memory metrics store
// In a production environment, this would be replaced with a proper metrics storage solution
export const metrics = {
  requests: {
    total: 0,
    success: 0,
    error: 0,
    avgResponseTime: 0
  },
  database: {
    queries: 0,
    errors: 0,
    avgResponseTime: 0
  },
  cache: {
    operations: 0,
    hits: 0,
    misses: 0,
    errors: 0
  }
};

// Simple in-memory status history
// In a production environment, this would be stored in a database
export const statusHistory: Array<{
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, string>;
}> = [];

// Keep history limited to last 100 entries
export function addStatusEntry(entry: any) {
  statusHistory.unshift(entry);
  if (statusHistory.length > 100) {
    statusHistory.pop();
  }
}

// Update metrics with a new request
export function updateRequestMetrics(success: boolean, responseTime: number) {
  metrics.requests.total++;
  if (success) {
    metrics.requests.success++;
  } else {
    metrics.requests.error++;
  }
  
  // Update average response time
  const totalRequests = metrics.requests.total;
  metrics.requests.avgResponseTime = 
    ((metrics.requests.avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
}

// Update database metrics
export function updateDatabaseMetrics(success: boolean, responseTime: number) {
  metrics.database.queries++;
  if (!success) {
    metrics.database.errors++;
  }
  
  // Update average response time
  const totalQueries = metrics.database.queries;
  metrics.database.avgResponseTime = 
    ((metrics.database.avgResponseTime * (totalQueries - 1)) + responseTime) / totalQueries;
}

// Update cache metrics
export function updateCacheMetrics(operation: 'hit' | 'miss' | 'error') {
  metrics.cache.operations++;
  
  if (operation === 'hit') {
    metrics.cache.hits++;
  } else if (operation === 'miss') {
    metrics.cache.misses++;
  } else if (operation === 'error') {
    metrics.cache.errors++;
  }
}

// Check database health
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const result = await sql`SELECT 1 as db_status`;
    const responseTime = Date.now() - startTime;
    
    updateDatabaseMetrics(true, responseTime);
    
    let status: 'healthy' | 'degraded' = 'healthy';
    if (responseTime > THRESHOLDS.responseTime) {
      status = 'degraded';
    }
    
    return {
      status: result.rows[0].db_status === 1 ? status : 'degraded',
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateDatabaseMetrics(false, responseTime);
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

// Check KV health
export async function checkKVHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  const testKey = 'health:check';
  
  try {
    await kv.set(testKey, Date.now(), { ex: 60 });
    const result = await kv.get(testKey);
    const responseTime = Date.now() - startTime;
    
    updateCacheMetrics(result ? 'hit' : 'miss');
    
    let status: 'healthy' | 'degraded' = 'healthy';
    if (responseTime > THRESHOLDS.responseTime) {
      status = 'degraded';
    }
    
    return {
      status: result ? status : 'degraded',
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateCacheMetrics('error');
    
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown KV error'
    };
  }
}

// Check system health
export function checkSystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  memory: {
    total: number;
    free: number;
    usage: number;
  };
  cpu: {
    load: number;
    cores: number;
  };
} {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
  
  const cpuCores = os.cpus().length;
  const cpuLoad = os.loadavg()[0] / cpuCores * 100;
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (memoryUsage > THRESHOLDS.memoryUsage || cpuLoad > THRESHOLDS.cpuLoad) {
    status = 'degraded';
  }
  
  return {
    status,
    memory: {
      total: totalMemory,
      free: freeMemory,
      usage: memoryUsage
    },
    cpu: {
      load: cpuLoad,
      cores: cpuCores
    }
  };
}

// Performance measurement utility
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Error in ${operation} after ${duration}ms:`, error);
    throw error;
  }
}

// Alert check utility
export function checkAlerts() {
  const alerts = [];
  
  // Check error rate
  const errorRate = metrics.requests.total > 0 
    ? (metrics.requests.error / metrics.requests.total) * 100 
    : 0;
  
  if (errorRate > THRESHOLDS.errorRate) {
    alerts.push({
      type: 'ERROR_RATE',
      message: `Error rate of ${errorRate.toFixed(2)}% exceeds threshold of ${THRESHOLDS.errorRate}%`,
      level: 'critical'
    });
  }
  
  // Check response time
  if (metrics.requests.avgResponseTime > THRESHOLDS.responseTime) {
    alerts.push({
      type: 'RESPONSE_TIME',
      message: `Average response time of ${metrics.requests.avgResponseTime.toFixed(2)}ms exceeds threshold of ${THRESHOLDS.responseTime}ms`,
      level: 'warning'
    });
  }
  
  // Check system metrics
  const systemHealth = checkSystemHealth();
  
  if (systemHealth.memory.usage > THRESHOLDS.memoryUsage) {
    alerts.push({
      type: 'MEMORY_USAGE',
      message: `Memory usage of ${systemHealth.memory.usage.toFixed(2)}% exceeds threshold of ${THRESHOLDS.memoryUsage}%`,
      level: 'warning'
    });
  }
  
  if (systemHealth.cpu.load > THRESHOLDS.cpuLoad) {
    alerts.push({
      type: 'CPU_LOAD',
      message: `CPU load of ${systemHealth.cpu.load.toFixed(2)}% exceeds threshold of ${THRESHOLDS.cpuLoad}%`,
      level: 'warning'
    });
  }
  
  return alerts;
}