
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, 'server', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
});

const connectionString = env.DATABASE_URL || env.POSTGRES_URL;
console.log(`Testing connection to: ${connectionString?.split('@')[1]}`);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW()');
    console.log(`✅ Connection successful! Latency: ${Date.now() - start}ms`);
    console.log(`Result: ${JSON.stringify(res.rows[0])}`);
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
  } finally {
    await pool.end();
  }
}

test();
