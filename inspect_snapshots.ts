import { pool } from './server/src/database/connection.ts';

async function inspectSnapshots(jobId: string) {
  try {
    const result = await pool.query('SELECT data FROM jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) {
      console.log(`Job ${jobId} not found`);
      return;
    }
    const jobData = result.rows[0].data;
    const requests = jobData?.llm_insights?.requests || [];
    
    console.log(`Found ${requests.length} snapshots`);
    
    requests.forEach((req: any, idx: number) => {
      console.log(`\n--- Snapshot ${idx} ---`);
      console.log(`Label: ${req.label}`);
      console.log(`Phase: ${req.phase}`);
      console.log(`Char count: ${req.prompt?.length || 0}`);
      
      const response = req.response || '';
      console.log(`Response length: ${response.length}`);
      
      if (response.length > 0) {
        console.log(`Response end: ${response.substring(response.length - 200)}`);
      }
    });
  } catch (error) {
    console.error('Error inspecting snapshots:', error);
  } finally {
    await pool.end();
  }
}

const jobId = process.argv[2];
if (!jobId) {
  console.error('Please provide a jobId');
  process.exit(1);
}

inspectSnapshots(jobId);
