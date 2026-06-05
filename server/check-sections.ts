import { pool, connectDatabase } from './src/database/connection';

async function checkJob(jobId: string, name: string) {
  console.log(`\n=================== ANALYZING JOB: ${name} (${jobId}) ===================`);
  const r = await pool.query(
    `SELECT data, status, progress, result FROM jobs WHERE id = $1`,
    [jobId]
  );
  
  if (r.rows.length === 0) {
    console.log("Job not found");
    return;
  }

  const job = r.rows[0];
  const jobData = job.data || {};
  console.log(`Job Status: ${job.status} | Progress: ${job.progress}`);
  
  // Let's inspect the original result before we updated it, if we can find it in jobData,
  // or see what is in result now.
  if (job.result) {
    const res = job.result;
    console.log(`Result Document ID: ${res.documentId}`);
    if (res.ai) {
      console.log(`Result Content Length: ${res.ai.content?.length || 0}`);
    }
  }

  const requests = jobData.llm_insights?.requests || [];
  const drafting = requests
    .filter((x: any) => x.phase === 'drafting')
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  console.log('\nTotal drafting requests found:', drafting.length);
  drafting.forEach((req: any, i: number) => {
    console.log(`Section ${i + 1}: ${req.heading || req.label} | len: ${req.response?.length || 0}`);
  });

  const auditing = requests.filter((x: any) => x.phase === 'auditing');
  console.log('\nTotal auditing requests found:', auditing.length);
  auditing.forEach((req: any, i: number) => {
    console.log(`Audit ${i + 1}: ${req.label} | prompt len: ${req.prompt?.length || 0} | resp len: ${req.response?.length || 0}`);
  });

  const patching = requests.filter((x: any) => x.phase === 'patching');
  console.log('\nTotal patching requests found:', patching.length);
  patching.forEach((req: any, i: number) => {
    console.log(`Patch ${i + 1}: ${req.label} | prompt len: ${req.prompt?.length || 0} | resp len: ${req.response?.length || 0}`);
  });

  const compacting = requests.filter((x: any) => x.phase === 'compacting');
  console.log('\nTotal compacting requests found:', compacting.length);
  compacting.forEach((req: any, i: number) => {
    console.log(`Compaction ${i + 1}: ${req.label} | prompt len: ${req.prompt?.length || 0} | resp len: ${req.response?.length || 0}`);
  });
}

async function run() {
  await connectDatabase();
  await checkJob('48bdda61-c73d-4282-9360-d57798544cf3', 'Ideation Document');
  await checkJob('8dcbe6a4-39d2-4f31-a613-0c50b77531d8', 'Business Case');
  await pool.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
