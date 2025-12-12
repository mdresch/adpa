#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const Bull = require('bull');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check processing jobs
    const result = await pool.query(`
      SELECT id, type, status, progress, created_at, started_at, error_message 
      FROM jobs 
      WHERE status = 'processing' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('Processing jobs:');
    console.table(result.rows);
    
    // Check recent extraction jobs specifically
    const extractionJobs = await pool.query(`
      SELECT id, type, status, progress, created_at, started_at, error_message 
      FROM jobs 
      WHERE type LIKE '%extraction%' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\nRecent extraction jobs:');
    console.table(extractionJobs.rows);
    
    // Check Bull queue status
    console.log('\nChecking Bull extraction queue...');
    const extractionQueue = new Bull('project-data-extraction', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined
      }
    });
    
    const waiting = await extractionQueue.getWaiting();
    const active = await extractionQueue.getActive();
    const delayed = await extractionQueue.getDelayed();
    const completed = await extractionQueue.getCompleted();
    const failed = await extractionQueue.getFailed();
    
    console.log(`  Waiting: ${waiting.length}`);
    console.log(`  Active: ${active.length}`);
    console.log(`  Delayed: ${delayed.length}`);
    console.log(`  Completed: ${completed.length}`);
    console.log(`  Failed: ${failed.length}`);
    
    if (active.length > 0) {
      console.log('\nActive jobs in queue:');
      active.forEach(j => {
        console.log(`  - Bull ID: ${j.id}, Type: ${j.name}, Data JobId: ${j.data?.jobId}`);
      });
    }
    
    if (waiting.length > 0) {
      console.log('\nWaiting jobs in queue:');
      waiting.slice(0, 5).forEach(j => {
        console.log(`  - Bull ID: ${j.id}, Type: ${j.name}, Data JobId: ${j.data?.jobId}`);
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
