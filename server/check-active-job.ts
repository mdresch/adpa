import 'dotenv/config';
import { pool, connectDatabase } from './src/database/connection';

async function check() {
  await connectDatabase();
  const jobId = '5ba8bc1a-55ac-4f91-bd3f-9601893369d4';
  
  const r = await pool.query(`
    SELECT status, progress, 
           data->'llm_insights'->'requests' as requests 
    FROM jobs 
    WHERE id = $1
  `, [jobId]);
  
  if (r.rows.length === 0) {
    console.log("Job not found");
    await pool.end();
    return;
  }
  
  const job = r.rows[0];
  console.log(`Job status: ${job.status}, progress: ${job.progress}%`);
  
  const requests = job.requests || [];
  const draftingRequests = requests.filter((req: any) => req.phase === 'drafting').sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  
  console.log(`\nFound ${draftingRequests.length} drafting sections total:`);
  draftingRequests.forEach((req: any, idx: number) => {
    console.log(`Section ${idx + 1}: label = "${req.label || req.heading}", status = ${req.response ? 'DRAFTED (len: ' + req.response.length + ')' : 'PENDING'}`);
  });
  
  await pool.end();
}

check().catch(e => {
  console.error("Error checking job:", e);
  process.exit(1);
});
