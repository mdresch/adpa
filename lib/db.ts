import { sql } from '@vercel/postgres';
import { Pool, PoolClient } from 'pg';

// For serverless functions (recommended)
export { sql };

// Maximum number of retry attempts for database operations
const MAX_RETRIES = 3;
// Base delay in milliseconds for exponential backoff
const BASE_RETRY_DELAY = 300;

// For traditional connection pooling (if needed)
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Additional pool configuration
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection to become available
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Helper function for executing database operations with retry logic
 * @param operation Function that performs the database operation
 * @param retries Number of retry attempts remaining
 * @returns Result of the database operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check if error is retryable (connection errors, deadlocks, etc.)
    const isRetryable = 
      error.code === 'ECONNREFUSED' || 
      error.code === '40001' || // Serialization failure
      error.code === '40P01' || // Deadlock detected
      error.code === '57P01' || // Connection lost
      error.code === 'ETIMEDOUT';
    
    if (retries <= 0 || !isRetryable) {
      console.error('Database operation failed:', error);
      throw error;
    }
    
    // Calculate delay with exponential backoff
    const delay = BASE_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
    console.warn(`Retrying database operation in ${delay}ms. Attempts remaining: ${retries}`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1);
  }
}

/**
 * Helper function for executing database operations within a transaction
 * @param callback Function that performs operations within the transaction
 * @returns Result of the transaction
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query with automatic retries
 * @param queryText SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function executeQuery<T>(queryText: string, params: any[] = []): Promise<T> {
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(queryText, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  });
}

/**
 * Check database connection health
 * @returns Object containing connection status and latency
 */
export async function checkDatabaseHealth() {
  const startTime = Date.now();
  try {
    await sql`SELECT 1`;
    const latency = Date.now() - startTime;
    return {
      status: 'connected',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Close all database connections in the pool
 * Should be called when shutting down the application
 */
export async function closePool() {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database connection pool:', error);
  }
}