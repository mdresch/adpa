import { sql } from '@vercel/postgres';
import { Pool, PoolClient, QueryResult } from 'pg';

// For serverless functions (recommended)
export { sql };

// Types for better TypeScript support
export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface TransactionCallback<T> {
  (client: PoolClient): Promise<T>;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  latency: number;
  timestamp: Date;
  error?: string;
}

// Enhanced database configuration
const defaultConfig: DatabaseConfig = {
  connectionString: process.env.POSTGRES_URL,
  maxConnections: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// For traditional connection pooling (if needed)
export const pool = new Pool({
  connectionString: defaultConfig.connectionString,
  max: defaultConfig.maxConnections,
  idleTimeoutMillis: defaultConfig.idleTimeoutMillis,
  connectionTimeoutMillis: defaultConfig.connectionTimeoutMillis,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Connection pool event handlers for monitoring
pool.on('connect', (client) => {
  console.log('🔗 New database client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err);
});

pool.on('remove', (client) => {
  console.log('🔌 Database client removed from pool');
});

// Enhanced transaction helper with retry logic
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  retryAttempts: number = defaultConfig.retryAttempts || 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      lastError = error as Error;

      console.error(`❌ Transaction attempt ${attempt} failed:`, error);

      if (attempt === retryAttempts) {
        throw lastError;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, defaultConfig.retryDelay || 1000));
    } finally {
      client.release();
    }
  }

  throw lastError!;
}

// Enhanced connection testing with health checks
export async function testConnection(): Promise<ConnectionHealth> {
  const startTime = Date.now();

  try {
    // Test Vercel Postgres connection
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    const latency = Date.now() - startTime;

    console.log('✅ Vercel Postgres connection successful!');
    console.log(`Current time from database: ${result.rows[0].current_time}`);
    console.log(`Database version: ${result.rows[0].db_version}`);
    console.log(`Connection latency: ${latency}ms`);

    return {
      isHealthy: true,
      latency,
      timestamp: new Date(),
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('❌ Vercel Postgres connection failed:', error);

    return {
      isHealthy: false,
      latency,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Pool health check
export async function checkPoolHealth(): Promise<ConnectionHealth> {
  const startTime = Date.now();

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as health_check');
      const latency = Date.now() - startTime;

      console.log('✅ Connection pool health check passed');
      console.log(`Pool latency: ${latency}ms`);
      console.log(`Pool stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);

      return {
        isHealthy: true,
        latency,
        timestamp: new Date(),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('❌ Connection pool health check failed:', error);

    return {
      isHealthy: false,
      latency,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Query with retry logic
export async function queryWithRetry<T = any>(
  queryText: string,
  values?: any[],
  retryAttempts: number = defaultConfig.retryAttempts || 3
): Promise<QueryResult<T>> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      if (values) {
        return await sql.query(queryText, values);
      } else {
        return await sql.query(queryText);
      }
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Query attempt ${attempt} failed:`, error);

      if (attempt === retryAttempts) {
        throw lastError;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, defaultConfig.retryDelay || 1000));
    }
  }

  throw lastError!;
}

// Graceful pool shutdown
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database pool closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
}

// Get pool statistics
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    config: {
      max: pool.options.max,
      idleTimeoutMillis: pool.options.idleTimeoutMillis,
      connectionTimeoutMillis: pool.options.connectionTimeoutMillis,
    },
  };
}

// Database utility functions
export const db = {
  // Direct access to sql for serverless functions
  sql,

  // Pool-based operations
  pool,

  // Transaction management
  withTransaction,

  // Health checks
  testConnection,
  checkPoolHealth,

  // Query operations
  queryWithRetry,

  // Pool management
  closePool,
  getPoolStats,

  // Configuration
  config: defaultConfig,
};
