#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const Bull = require('bull');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const jobId = process.argv[2] || '3930585d-2b76-4ddb-94cd-466f86bfffeb';
  
  try {
    // Get job details
    const jobResult = await pool.query(`
      SELECT id, type, status, progress, data, error_message, created_at, started_at, completed_at
      FROM jobs 
      WHERE id = $1
    `, [jobId]);
    
    if (jobResult.rows.length === 0) {
      console.log('Job not found:', jobId);
      return;
    }
    
    const job = jobResult.rows[0];
    console.log('\n=== Job Details ===');
    console.log('ID:', job.id);
    console.log('Type:', job.type);
    console.log('Status:', job.status);
    console.log('Progress:', job.progress);
    console.log('Created:', job.created_at);
    console.log('Started:', job.started_at);
    console.log('Completed:', job.completed_at);
    console.log('Error:', job.error_message);
    
    // Parse job data
    const data = job.data || {};
    console.log('\n=== Job Data ===');
    console.log('Project ID:', data.projectId);
    console.log('Domains:', data.domains);
    console.log('Child Job IDs:', data.childJobIds);
    
    // Check Bull queue for child jobs
    console.log('\n=== Checking Bull Queue ===');
    const extractionQueue = new Bull('project-data-extraction', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined
      }
    });
    
    if (data.childJobIds && data.childJobIds.length > 0) {
      console.log(`\nChecking ${data.childJobIds.length} child jobs...`);
      
      for (const childId of data.childJobIds) {
        try {
          const childJob = await extractionQueue.getJob(childId);
          if (childJob) {
            const state = await childJob.getState();
            console.log(`  Child ${childId}: state=${state}, data=${JSON.stringify(childJob.data?.entityType || 'unknown')}`);
          } else {
            console.log(`  Child ${childId}: NOT FOUND in queue`);
          }
        } catch (err) {
          console.log(`  Child ${childId}: ERROR - ${err.message}`);
        }
      }
    } else {
      console.log('No child job IDs found in job data');
    }
    
    // Check all active/waiting jobs in queue
    console.log('\n=== Queue Status ===');
    const waiting = await extractionQueue.getWaiting();
    const active = await extractionQueue.getActive();
    const completed = await extractionQueue.getCompleted(0, 10);
    const failed = await extractionQueue.getFailed(0, 10);
    
    console.log(`Waiting: ${waiting.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Completed (last 10): ${completed.length}`);
    console.log(`Failed (last 10): ${failed.length}`);
    
    if (completed.length > 0) {
      console.log('\nRecent completed jobs:');
      completed.slice(0, 5).forEach(j => {
        console.log(`  - Bull ID: ${j.id}, Type: ${j.name}, EntityType: ${j.data?.entityType || j.data?.jobId || 'N/A'}`);
      });
    }
    
    await extractionQueue.close();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
