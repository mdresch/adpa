require('dotenv').config();
const { Pool } = require('pg');

async function checkRecentJobs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  try {
    const result = await pool.query(
      `SELECT id, type, status, data, result, created_at 
       FROM jobs 
       WHERE (data->>'template_id' = '46e71974-5f12-43ca-b3c4-6419a0fe1e5e' OR template_name ILIKE '%User Stories%')
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    console.log(`Found ${result.rows.length} recent ai-generate jobs:`);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`==================================================`);
      console.log(`Job ID: ${row.id}`);
      console.log(`Status: ${row.status}`);
      console.log(`Data:`, JSON.stringify(row.data, null, 2));
      if (row.result && row.result.ai) {
        console.log(`Result.ai keys:`, Object.keys(row.result.ai));
        console.log(`Result.ai content snippet:`, typeof row.result.ai.content === 'string' ? row.result.ai.content.substring(0, 300) : 'not string');
      }
    }
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await pool.end();
  }
}

checkRecentJobs();
