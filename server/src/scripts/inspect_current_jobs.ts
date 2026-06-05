import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  const jobId = 'dd580ba4-af62-4571-b0c2-8c652afd2d2c';
  
  console.log(`=== COMPLIANCE & AUDIT CHECK FOR ${jobId} ===`);
  const jobResult = await pool.query(`SELECT result FROM jobs WHERE id = $1`, [jobId]);
  if (jobResult.rows.length === 0) {
    console.log('Job not found!');
  } else {
    const job = jobResult.rows[0];
    const res = job.result;
    if (res && res.ai) {
      console.log(`Compliance Status: ${res.ai.compliance_status}`);
      console.log(`Compliance Score: ${res.ai.compliance_score}`);
      console.log('Audit Log:', JSON.stringify(res.ai.audit_log, null, 2));
    } else {
      console.log('Result or AI part is missing.');
    }
  }

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
