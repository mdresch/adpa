require('dotenv').config();
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function checkActiveJobs() {
  try {
    console.log('🔍 Checking for active jobs...\n');
    
    await db.initDb()
    const result = await db.query(`
      SELECT 
        id,
        type,
        status,
        progress,
        created_at,
        started_at,
        completed_at,
        error,
        data,
        EXTRACT(EPOCH FROM (NOW() - started_at)) as running_seconds
      FROM jobs
      WHERE status IN ('active', 'processing', 'waiting', 'delayed')
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`📊 Found ${result.rows.length} active/pending job(s):\n`);
    
    if (result.rows.length === 0) {
      console.log('✅ No active jobs - all clear!');
      return;
    }
    
    result.rows.forEach((job, i) => {
      console.log(`${i + 1}. Job ID: ${job.id}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Progress: ${job.progress}%`);
      console.log(`   Running for: ${job.running_seconds ? Math.round(job.running_seconds) + 's' : 'Not started'}`);
      console.log(`   Created: ${job.created_at}`);
      console.log(`   Started: ${job.started_at || 'Not started'}`);
      
      if (job.data) {
        try {
          const data = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
          console.log(`   Project: ${data.projectId || data.project_id || 'N/A'}`);
          console.log(`   Document: ${data.documentId || data.document_id || data.name || 'N/A'}`);
        } catch (e) {
          console.log(`   Data: ${JSON.stringify(job.data).substring(0, 100)}...`);
        }
      }
      
      if (job.error) {
        console.log(`   ❌ Error: ${job.error.substring(0, 200)}`);
      }
      
      console.log('');
    });
    
    console.log('\n💡 To cancel a stuck job, run:');
    console.log('   UPDATE jobs SET status = \'failed\', error = \'Manually cancelled\' WHERE id = \'<job-id>\';');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
  }
}

checkActiveJobs();

