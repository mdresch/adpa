import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function checkJobs() {
  try {
    console.log('🔍 CHECKING RUNNING JOBS\n');
    console.log('='.repeat(80));
    
    await db.initDb()
    // Check recent jobs (last hour)
    const jobsResult = await db.query(`
      SELECT 
        id,
        type,
        status,
        progress,
        created_at,
        completed_at,
        error_message
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 JOBS FROM LAST HOUR: ${jobsResult.rows.length}\n`);
    
    if (jobsResult.rows.length === 0) {
      console.log('No jobs found in the last hour');
    } else {
      jobsResult.rows.forEach((job, i) => {
        console.log(`${i + 1}. ${job.type} - ${job.status.toUpperCase()}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   Progress: ${job.progress || 0}%`);
        console.log(`   Created: ${job.created_at}`);
        if (job.completed_at) {
          console.log(`   Completed: ${job.completed_at}`);
        }
        if (job.error_message) {
          console.log(`   Error: ${job.error_message}`);
        }
        console.log('');
      });
    }
    
    // Check for stuck jobs (processing but not updated in last 5 minutes)
    const stuckJobsResult = await db.query(`
      SELECT id, type, status, progress, created_at
      FROM jobs
      WHERE status = 'processing'
        AND created_at < NOW() - INTERVAL '5 minutes'
      LIMIT 5
    `);
    
    if (stuckJobsResult.rows.length > 0) {
      console.log('\n⚠️ POTENTIALLY STUCK JOBS:\n');
      stuckJobsResult.rows.forEach((job) => {
        console.log(`- ${job.type} (${job.id})`);
        console.log(`  Status: ${job.status}`);
        console.log(`  Progress: ${job.progress}%`);
        console.log(`  Created: ${job.created_at}`);
        console.log('');
      });
      console.log('These jobs may have been interrupted by the server restart.');
      console.log('They will NOT resume automatically.');
    }
    
    // Check pipeline executions
    const pipelineResult = await db.query(`
      SELECT 
        id,
        template_id,
        project_id,
        status,
        progress,
        created_at,
        completed_at
      FROM pipeline_executions
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (pipelineResult.rows.length > 0) {
      console.log('\n🔄 PIPELINE EXECUTIONS FROM LAST HOUR:\n');
      pipelineResult.rows.forEach((pipe, i) => {
        console.log(`${i + 1}. ${pipe.status.toUpperCase()}`);
        console.log(`   ID: ${pipe.id}`);
        console.log(`   Progress: ${pipe.progress || 0}%`);
        console.log(`   Created: ${pipe.created_at}`);
        if (pipe.completed_at) {
          console.log(`   Completed: ${pipe.completed_at}`);
        }
        console.log('');
      });
    }
    
    console.log('='.repeat(80));
    console.log('\n💡 RECOMMENDATION:\n');
    console.log('If you had a job in "processing" status:');
    console.log('- It was likely interrupted by the server restart');
    console.log('- Bull queues may retry it, but not guaranteed');
    console.log('- Safest option: Start a new workflow run');
    console.log('\nProcess Flow is designed to be re-runnable without issues.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkJobs();

