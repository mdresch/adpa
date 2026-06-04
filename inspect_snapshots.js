const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function inspectSnapshots(jobId) {
  try {
    const result = await pool.query('SELECT data FROM jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) {
      console.log(`Job ${jobId} not found`);
      return;
    }
    const jobData = result.rows[0].data;
    const requests = jobData?.llm_insights?.requests || [];
    
    console.log(`Found ${requests.length} snapshots`);
    
    requests.forEach((req, idx) => {
      console.log(`\n--- Snapshot ${idx} ---`);
      console.log(`Label: ${req.label}`);
      console.log(`Phase: ${req.phase}`);
      
      const response = req.response || '';
      console.log(`Response length: ${response.length}`);
      
      if (response.length > 0) {
        console.log(`Response end: ${response.substring(response.length - 200).replace(/\n/g, '\\n')}`);
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
