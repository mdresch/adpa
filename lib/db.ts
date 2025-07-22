import { sql } from '@vercel/postgres';
import { Pool } from 'pg';

// For serverless functions (recommended)
export { sql };

// For traditional connection pooling (if needed)
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection() {
  try {
    // Test Vercel Postgres connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Vercel Postgres connection successful!');
    console.log(`Current time from database: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('❌ Vercel Postgres connection failed:', error);
    return false;
  }
}