import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function checkRecentJobs() {
  try {
    await connectDatabase();
    const result = await pool.query(
      `SELECT id, type, status, data, result 
       FROM jobs 
       WHERE type = 'ai-generate' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    console.log(`Found ${result.rows.length} recent ai-generate jobs:`);
    for (const row of result.rows) {
      console.log(`==================================================`);
      console.log(`Job ID: ${row.id}`);
      console.log(`Status: ${row.status}`);
      console.log(`Data keys:`, Object.keys(row.data || {}));
      console.log(`Data.jobId:`, row.data?.jobId);
      console.log(`Data.job_id:`, row.data?.job_id);
      console.log(`Data.template_id:`, row.data?.template_id);
      console.log(`Data.llm_insights:`, JSON.stringify(row.data?.llm_insights, null, 2));
      console.log(`Result:`, JSON.stringify(row.result, null, 2));
    }
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
  }
}

checkRecentJobs();
