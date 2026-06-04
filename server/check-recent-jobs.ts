import { pool, connectDatabase } from './src/database/connection';

async function check() {
  await connectDatabase();
  const res = await pool.query(
    `SELECT id, status, progress, error, data->>'projectId' as project_id, data->>'template_id' as template_id, created_at, updated_at 
     FROM jobs 
     WHERE created_at > NOW() - INTERVAL '15 minutes' 
     ORDER BY created_at DESC`
  );
  
  console.log(`=== RECENT JOBS (Last 15 minutes) ===`);
  console.log(`Found ${res.rows.length} jobs.`);
  res.rows.forEach((job, i) => {
    console.log(`\nJob ${i+1}:`);
    console.log(`ID: ${job.id}`);
    console.log(`Status: ${job.status}`);
    console.log(`Progress: ${job.progress}%`);
    console.log(`Project ID: ${job.project_id}`);
    console.log(`Template ID: ${job.template_id}`);
    console.log(`Created: ${job.created_at}`);
    console.log(`Updated: ${job.updated_at}`);
    if (job.error) {
      console.log(`Error: ${JSON.stringify(job.error)}`);
    }
  });

  await pool.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
