import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  const jobId = 'dd580ba4-af62-4571-b0c2-8c652afd2d2c';
  
  console.log(`=== CHECKING GENERATION PLAN FOR ${jobId} ===`);
  const jobResult = await pool.query(`SELECT data FROM jobs WHERE id = $1`, [jobId]);
  if (jobResult.rows.length === 0) {
    console.log('Job not found!');
    process.exit(1);
  }

  const job = jobResult.rows[0];
  const jobData = job.data;
  
  if (jobData?.llm_insights?.requests) {
    const requests = jobData.llm_insights.requests;
    console.log(`Found ${requests.length} requests in llm_insights:`);
    requests.forEach((req: any, index: number) => {
      console.log(`\nRequest #${index + 1}:`);
      console.log(` - Phase: ${req.phase}`);
      console.log(` - Label: ${req.label}`);
      console.log(` - Provider: ${req.provider}`);
      console.log(` - Model: ${req.model}`);
      if (req.phase === 'planning') {
        try {
          const parsedRes = JSON.parse(req.response);
          console.log(' Planned Sections:');
          parsedRes.sections?.forEach((s: any, i: number) => {
            console.log(`   ${i + 1}. Heading: "${s.heading}"`);
            console.log(`      Goal: "${s.goal}"`);
          });
        } catch (e: any) {
          console.log(' Could not parse planning response as JSON:', e.message);
          console.log(' Raw Response Preview:', req.response?.substring(0, 300));
        }
      } else if (req.phase === 'drafting') {
        console.log(`   Heading: "${req.heading}"`);
        console.log(`   Goal: "${req.goal}"`);
        console.log(`   Draft Length: ${req.response?.length} characters`);
      }
    });
  } else {
    console.log('No llm_insights or requests found in job.data.');
  }

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
