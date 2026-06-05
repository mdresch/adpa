const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('Querying api_request_logs...');
    const apiLogs = await pool.query(`
      SELECT * FROM api_request_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log('Recent API Logs:', apiLogs.rows);

    console.log('Querying audit_logs...');
    const auditLogs = await pool.query(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log('Recent Audit Logs:', auditLogs.rows);
  } catch (err) {
    console.error('Error querying logs:', err.message);
  } finally {
    await pool.end();
  }
}

main();
