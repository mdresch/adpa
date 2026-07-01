const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findDocId(jobId) {
  try {
    const result = await pool.query('SELECT result FROM jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) {
      console.log(`Job ${jobId} not found`);
      return;
    }
    const jobResult = result.rows[0].result;
    console.log(`Job result:`, jobResult);
  } catch (error) {
    console.error('Error finding docId:', error);
  } finally {
    await pool.end();
  }
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Please provide a jobId');
  process.exit(1);
}

findDocId(jobId);
