#!/usr/bin/env tsx
/**
 * Comprehensive cleanup: Remove ALL stuck jobs from database and queues
 * This script will:
 * 1. Find all jobs stuck in "processing" state
 * 2. Mark them as "failed" in database
 * 3. Remove them from all Bull queues
 * 4. Report summary
 */

import dotenv from 'dotenv'
import path from 'path'
import Bull from 'bull'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

const QUEUE_NAMES = [
  'project-data-extraction',
  'ai-processing',
  'document-processing',
  'pipeline-processing',
  'baseline-processing',
  'process-flow-processing',
  'document-regeneration',
  'quality-audit'
]

async function main() {
  console.log('🧹 Comprehensive Stuck Jobs Cleanup')
  console.log('═'.repeat(60))
  console.log()

  await connectDatabase()
  const pool = getDatabasePool()

  // Redis config
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const url = new URL(redisUrl)
  const redisConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    username: url.username !== 'default' ? url.username : undefined,
    tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  }

  // Step 1: Find all stuck jobs in database
  console.log('📊 Step 1: Finding stuck jobs in database...\n')
  
  const stuckJobsQuery = await pool.query(
    `SELECT id, type, status, error_message, started_at, queue_name
     FROM jobs
     WHERE status = 'processing'
     AND (
       error_message IS NOT NULL
       OR started_at < NOW() - INTERVAL '1 hour'
       OR processing_started_at < NOW() - INTERVAL '1 hour'
     )
     ORDER BY started_at DESC`
  )

  const stuckJobs = stuckJobsQuery.rows
  console.log(`   Found ${stuckJobs.length} stuck jobs in database\n`)

  if (stuckJobs.length === 0) {
    console.log('✅ No stuck jobs found. Database is clean!\n')
    await pool.end()
    process.exit(0)
  }

  // Display stuck jobs
  console.log('   Stuck jobs:')
  stuckJobs.forEach((job, idx) => {
    const age = job.started_at 
      ? Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000 / 60)
      : 'unknown'
    console.log(`   ${idx + 1}. ${job.id.substring(0, 8)}... | ${job.type.padEnd(25)} | ${age} min ago | ${job.error_message?.substring(0, 50) || 'No error'}`)
  })
  console.log()

  // Step 2: Mark all stuck jobs as failed in database
  console.log('📝 Step 2: Marking stuck jobs as "failed" in database...\n')
  
  const stuckJobIds = stuckJobs.map(j => j.id)
  
  // Force update ALL stuck jobs to failed, regardless of current status
  // This ensures we catch any jobs that might have been partially updated
  const updateResult = await pool.query(
    `UPDATE jobs
     SET status = 'failed',
         completed_at = CURRENT_TIMESTAMP,
         error_message = CASE
           WHEN error_message IS NULL OR error_message = '' THEN
             'Job stuck in processing - cleaned up by comprehensive cleanup script'
           ELSE error_message
         END
     WHERE id = ANY($1::uuid[])
     RETURNING id, type, queue_name, status`,
    [stuckJobIds]
  )

  console.log(`   ✅ Updated ${updateResult.rowCount} jobs to "failed" status`)
  
  // Double-check: Query the actual status of these jobs
  const verifyUpdateResult = await pool.query(
    `SELECT id, status, error_message
     FROM jobs
     WHERE id = ANY($1::uuid[])
     ORDER BY status`,
    [stuckJobIds]
  )
  
  const stillProcessing = verifyUpdateResult.rows.filter(r => r.status === 'processing')
  if (stillProcessing.length > 0) {
    console.log(`   ⚠️  Warning: ${stillProcessing.length} jobs still have status='processing'`)
    console.log(`   Attempting force update...`)
    
    // Force update with explicit status check
    const forceUpdateResult = await pool.query(
      `UPDATE jobs
       SET status = 'failed',
           completed_at = CURRENT_TIMESTAMP,
           error_message = 'Job stuck in processing - FORCE cleaned by comprehensive cleanup script'
       WHERE id = ANY($1::uuid[])
       AND status = 'processing'
       RETURNING id`,
      [stuckJobIds]
    )
    console.log(`   ✅ Force updated ${forceUpdateResult.rowCount} additional jobs\n`)
  } else {
    console.log(`   ✅ Verified: All ${updateResult.rowCount} jobs are now marked as 'failed'\n`)
  }

  // Step 3: Remove from all Bull queues
  console.log('🗑️  Step 3: Removing jobs from Bull queues...\n')

  const queueMap = new Map<string, Bull.Queue>()
  let totalRemovedFromQueues = 0

  // Open all queues
  for (const queueName of QUEUE_NAMES) {
    const queue = new Bull(queueName, { redis: redisConfig })
    queueMap.set(queueName, queue)
  }

  for (const job of stuckJobs) {
    const queueName = job.queue_name || 'project-data-extraction'
    const queue = queueMap.get(queueName)
    
    if (!queue) {
      console.log(`   ⚠️  Queue ${queueName} not found, skipping job ${job.id.substring(0, 8)}...`)
      continue
    }

    try {
      // Try direct match by Bull job ID
      let bullJob = await queue.getJob(job.id)
      
      // For extraction jobs, also check data.jobId
      if (!bullJob && queueName === 'project-data-extraction') {
        const [active, waiting, delayed] = await Promise.all([
          queue.getActive(),
          queue.getWaiting(),
          queue.getDelayed()
        ])
        const allJobs = [...active, ...waiting, ...delayed]
        bullJob = allJobs.find((j: any) => j.data?.jobId === job.id) || null
      }

      if (bullJob) {
        const state = await bullJob.getState()
        
        if (state === 'active') {
          await bullJob.moveToFailed({ message: 'Removed by comprehensive cleanup - job was stuck' }, true)
          console.log(`   ✅ Moved job ${job.id.substring(0, 8)}... from ${queueName} (was active)`)
        } else {
          await bullJob.remove()
          console.log(`   ✅ Removed job ${job.id.substring(0, 8)}... from ${queueName} (was ${state})`)
        }
        
        totalRemovedFromQueues++
      } else {
        console.log(`   ℹ️  Job ${job.id.substring(0, 8)}... not found in queue ${queueName} (may have been already removed)`)
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error processing job ${job.id.substring(0, 8)}...: ${error.message}`)
    }
  }

  // Step 4: Clear any monitoring intervals
  console.log('\n🧹 Step 4: Clearing monitoring intervals...\n')
  
  if ((global as any).extractionIntervals) {
    let intervalsCleared = 0
    for (const jobId of stuckJobIds) {
      const interval = (global as any).extractionIntervals.get(jobId)
      if (interval) {
        clearInterval(interval)
        ;(global as any).extractionIntervals.delete(jobId)
        intervalsCleared++
      }
    }
    console.log(`   ✅ Cleared ${intervalsCleared} monitoring intervals\n`)
  } else {
    console.log('   ℹ️  No monitoring intervals found\n')
  }

  // Close all queues
  for (const queue of queueMap.values()) {
    await queue.close()
  }

  // Step 5: Verify cleanup
  console.log('🔍 Step 5: Verifying cleanup...\n')
  
  // Check for any remaining processing jobs with errors or that are old
  const verifyResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM jobs
     WHERE status = 'processing'
     AND (
       error_message IS NOT NULL
       OR started_at < NOW() - INTERVAL '1 hour'
       OR processing_started_at < NOW() - INTERVAL '1 hour'
     )`
  )

  const remainingStuck = parseInt(verifyResult.rows[0].count)
  
  // Also check total processing jobs
  const totalProcessingResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM jobs
     WHERE status = 'processing'`
  )
  const totalProcessing = parseInt(totalProcessingResult.rows[0].count)
  
  console.log(`   Total jobs with status='processing': ${totalProcessing}`)
  console.log(`   Stuck jobs (with errors or >1 hour old): ${remainingStuck}\n`)

  // Summary
  console.log('═'.repeat(60))
  console.log('📊 Cleanup Summary:')
  console.log('═'.repeat(60))
  console.log(`   Stuck jobs found: ${stuckJobs.length}`)
  console.log(`   Database jobs updated: ${updateResult.rowCount}`)
  console.log(`   Queue jobs removed: ${totalRemovedFromQueues}`)
  console.log(`   Remaining stuck jobs: ${remainingStuck}`)
  console.log('═'.repeat(60))

  if (remainingStuck === 0) {
    console.log('\n✅ All stuck jobs have been cleaned up!')
    console.log('   You can now add new jobs to the queue.\n')
  } else {
    console.log(`\n⚠️  Warning: ${remainingStuck} stuck jobs still remain.`)
    console.log('   You may need to run this script again or investigate further.\n')
  }

  await pool.end()
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

