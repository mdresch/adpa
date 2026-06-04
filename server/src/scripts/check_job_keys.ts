import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  const jobId = 'dd580ba4-af62-4571-b0c2-8c652afd2d2c';
  
  const jobResult = await pool.query(`SELECT data FROM jobs WHERE id = $1`, [jobId]);
  if (jobResult.rows.length === 0) {
    console.log('Job not found!');
  } else {
    const job = jobResult.rows[0];
    const data = job.data;
    
    console.log('data keys:', Object.keys(data || {}));
    if (data?.llm_insights) {
      console.log('llm_insights keys:', Object.keys(data.llm_insights));
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
