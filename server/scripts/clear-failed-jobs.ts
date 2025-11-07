#!/usr/bin/env tsx
/**
 * Clear failed jobs from Bull queue
 */

import dotenv from 'dotenv';
dotenv.config();

import Queue from 'bull';

async function clearFailedJobs() {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const queue = new Queue('document-upload', REDIS_URL);

  try {
    console.log('🧹 Clearing failed jobs from queue...\n');

    // Get failed jobs
    const failed = await queue.getFailed();
    console.log(`Found ${failed.length} failed jobs`);

    // Remove all failed jobs
    await queue.clean(0, 'failed');
    
    // Get updated counts
    const counts = await queue.getJobCounts();
    console.log('\n📊 Queue Status After Cleanup:');
    console.log('═'.repeat(60));
    console.log(`  Active: ${counts.active}`);
    console.log(`  Waiting: ${counts.waiting}`);
    console.log(`  Completed: ${counts.completed}`);
    console.log(`  Failed: ${counts.failed}`);
    console.log(`  Delayed: ${counts.delayed}`);

    console.log('\n✅ Failed jobs cleared! Queue is ready for fresh uploads.\n');

    await queue.close();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

clearFailedJobs();

