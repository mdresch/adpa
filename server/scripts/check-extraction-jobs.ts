#!/usr/bin/env ts-node
/**
 * Diagnostic script to check extraction job status and identify incomplete jobs
 * 
 * This script:
 * 1. Verifies the queue service is working correctly
 * 2. Checks for incomplete extraction jobs (failed, stuck, pending)
 * 3. Identifies parent extraction jobs with missing child jobs
 * 4. Provides detailed status of all extraction jobs
 */

import { pool } from '../database/connection';
import { addJob, getJobStatus } from '../services/queueService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Test the queue service functionality
async function testQueueService() {
  console.log('\n=== Testing Queue Service ===');

  try {
    // Test addJob function
    const testJobId = uuidv4();
    await addJob('ai-generate', {
      jobId: testJobId,
      userId: 'diagnostic-script',
      projectId: 'diagnostic-project',
      prompt: 'Test job for queue service verification',
      provider: 'openai',
      model: 'gpt-3.5-turbo'
    });

    console.log('✅ addJob function is working correctly');

    // Test getJobStatus function
    const status = await getJobStatus(testJobId);
    if (status) {
      console.log(`✅ getJobStatus function is working: Job status = ${status.status}`);
    } else {
      console.log('⚠️  getJobStatus returned null, job may not be in database yet');
    }

  } catch (error) {
    console.error('❌ Queue service test failed:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }

  return true;
}

// Check for incomplete extraction jobs
async function checkIncompleteExtractionJobs() {
  console.log('\n=== Checking for Incomplete Extraction Jobs ===');

  try {
    // Get all extraction jobs that are not completed
    const incompleteJobs = await pool.query(
      `SELECT 
                id, type, status, created_by, created_at, 
                started_at, completed_at, error_message, 
                data->>'projectId' as project_id,
                data->>'retryOf' as retry_of
            FROM jobs
            WHERE type LIKE '%extract%'
            AND status NOT IN ('completed', 'cancelled')
            ORDER BY created_at DESC`
    );

    if (incompleteJobs.rows.length === 0) {
      console.log('✅ No incomplete extraction jobs found');
      return;
    }

    console.log(`📊 Found ${incompleteJobs.rows.length} incomplete extraction job(s):`);

    for (const job of incompleteJobs.rows) {
      const duration = job.started_at ?
        `${Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000 / 60)} minutes` :
        'not started';

      console.log(`\n🔍 Job ID: ${job.id}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Project ID: ${job.project_id || 'N/A'}`);
      console.log(`   Created: ${job.created_at}`);
      console.log(`   Duration: ${duration}`);
      console.log(`   Error: ${job.error_message || 'None'}`);
      console.log(`   Retry of: ${job.retry_of || 'Original job'}`);
    }

    // Check for stuck jobs (processing for too long)
    const stuckJobs = await pool.query(
      `SELECT 
                id, type, status, created_at, started_at,
                data->>'projectId' as project_id
            FROM jobs
            WHERE type LIKE '%extract%'
            AND status = 'processing'
            AND started_at < NOW() - INTERVAL '30 minutes'
            ORDER BY started_at ASC`
    );

    if (stuckJobs.rows.length > 0) {
      console.log(`\n⚠️  Found ${stuckJobs.rows.length} stuck extraction job(s):`);
      for (const job of stuckJobs.rows) {
        const duration = `${Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000 / 60)} minutes`;
        console.log(`\n⏳ Stuck Job: ${job.id}`);
        console.log(`   Type: ${job.type}`);
        console.log(`   Project ID: ${job.project_id || 'N/A'}`);
        console.log(`   Started: ${job.started_at}`);
        console.log(`   Duration: ${duration}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking incomplete extraction jobs:', error);
  }
}

// Check for parent extraction jobs with missing child jobs
async function checkParentChildExtractionJobs() {
  console.log('\n=== Checking Parent-Child Extraction Job Relationships ===');

  try {
    // Find parent extraction jobs
    const parentJobs = await pool.query(
      `SELECT 
                id, status, created_at, completed_at,
                data->>'projectId' as project_id
            FROM jobs
            WHERE type = 'extract-project-data'
            ORDER BY created_at DESC
            LIMIT 20`
    );

    if (parentJobs.rows.length === 0) {
      console.log('✅ No parent extraction jobs found');
      return;
    }

    console.log(`📊 Checking ${parentJobs.rows.length} parent extraction job(s)...`);

    for (const parentJob of parentJobs.rows) {
      // Count child jobs for this parent
      const childJobs = await pool.query(
        `SELECT 
                    id, type, status, created_at, completed_at
                FROM jobs
                WHERE data->>'parentJobId' = $1
                ORDER BY created_at ASC`,
        [parentJob.id]
      );

      const expectedChildCount = 40; // Approximate number of entity types
      const missingChildJobs = expectedChildCount - childJobs.rows.length;

      console.log(`\n🔍 Parent Job: ${parentJob.id}`);
      console.log(`   Status: ${parentJob.status}`);
      console.log(`   Project ID: ${parentJob.project_id || 'N/A'}`);
      console.log(`   Child Jobs: ${childJobs.rows.length}/${expectedChildCount}`);

      if (missingChildJobs > 0) {
        console.log(`   ⚠️  Missing child jobs: ~${missingChildJobs}`);
      }

      if (childJobs.rows.length > 0) {
        const completedChildJobs = childJobs.rows.filter(row => row.status === 'completed').length;
        const failedChildJobs = childJobs.rows.filter(row => row.status === 'failed').length;

        console.log(`   Child Job Status: ${completedChildJobs} completed, ${failedChildJobs} failed, ${childJobs.rows.length - completedChildJobs - failedChildJobs} pending`);

        if (failedChildJobs > 0) {
          const failedTypes = childJobs.rows
            .filter(row => row.status === 'failed')
            .map(row => row.type.replace('extract-entity-', ''));
          console.log(`   Failed Entity Types: ${failedTypes.join(', ')}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking parent-child extraction jobs:', error);
  }
}

// Main function
async function main() {
  console.log('🔍 Extraction Job Diagnostic Script');
  console.log('====================================');

  // Test queue service
  const queueServiceWorking = await testQueueService();

  // Check incomplete jobs
  await checkIncompleteExtractionJobs();

  // Check parent-child relationships
  await checkParentChildExtractionJobs();

  console.log('\n=== Summary ===');
  if (queueServiceWorking) {
    console.log('✅ Queue service is operational');
  } else {
    console.log('❌ Queue service has issues');
  }

  console.log('\n📋 Diagnostic complete. Check the output above for any issues.');
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}).finally(() => {
  pool.end();
});
