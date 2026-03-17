
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'server/.env') });

async function testConnection() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  console.log(`Testing connection to: ${connectionString?.split('@')[1]}`);
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW()');
    console.log(`✅ Connection successful! Latency: ${Date.now() - start}ms`);
    console.log(`Result: ${JSON.stringify(res.rows[0])}`);
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    if (err.stack) console.error(err.stack);
  } finally {
    await pool.end();
  }
}

testConnection();
