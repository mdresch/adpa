#!/usr/bin/env tsx
/**
 * One-time cleanup script to remove old/stale jobs from all Bull queues
 * 
 * This script:
 * 1. Removes jobs stuck in "processing" state for too long
 * 2. Removes old failed jobs
 * 3. Removes orphaned jobs (in queues but not in database)
 * 4. Cleans up old completed jobs (optional)
 * 
 * Usage: tsx server/scripts/cleanup-all-queues.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import Bull from 'bull'
import { connectDatabase, getDatabasePool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

// All queue names from queueService.ts
const QUEUE_CONFIGS = [
  { name: 'ai-processing', displayName: 'AI Processing' },
  { name: 'document-processing', displayName: 'Document Processing' },
  { name: 'pipeline-processing', displayName: 'Pipeline Processing' },
  { name: 'baseline-processing', displayName: 'Baseline Processing' },
  { name: 'process-flow-processing', displayName: 'Process Flow Processing' },
  { name: 'document-regeneration', displayName: 'Document Regeneration' },
  { name: 'quality-audit', displayName: 'Quality Audit' },
  { name: 'project-data-extraction', displayName: 'Project Data Extraction' },
]

// Configuration
const STUCK_JOB_THRESHOLD_MINUTES = 60 // Jobs stuck in processing for more than 1 hour
const OLD_FAILED_JOB_THRESHOLD_DAYS = 7 // Remove failed jobs older than 7 days
const OLD_COMPLETED_JOB_THRESHOLD_DAYS = 30 // Remove completed jobs older than 30 days (optional)

interface CleanupStats {
  queueName: string
  stuckProcessing: number
  oldFailed: number
  oldCompleted: number
  orphaned: number
  totalRemoved: number
}

async function getBullRedisConfig() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  
  if (!redisUrl || redisUrl === 'redis://localhost:6379') {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
  
  try {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username !== 'default' ? url.username : undefined,
      tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  } catch (error) {
    logger.error('Failed to parse REDIS_URL, using localhost', error)
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}

async function cleanupQueue(queueName: string, displayName: string): Promise<CleanupStats> {
  const stats: CleanupStats = {
    queueName: displayName,
    stuckProcessing: 0,
    oldFailed: 0,
    oldCompleted: 0,
    orphaned: 0,
    totalRemoved: 0,
  }

  const redisConfig = await getBullRedisConfig()
  const queue = new Bull(queueName, { redis: redisConfig })

  try {
    console.log(`\n📋 Processing queue: ${displayName} (${queueName})`)
    console.log('─'.repeat(60))

    // Get all job states
    const [active, waiting, completed, failed, delayed] = await Promise.all([
      queue.getActive(),
      queue.getWaiting(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ])

    console.log(`   Active: ${active.length}, Waiting: ${waiting.length}, Completed: ${completed.length}, Failed: ${failed.length}, Delayed: ${delayed.length}`)

    // 1. Clean up stuck processing jobs (in active state for too long)
    const now = Date.now()
    const stuckThreshold = now - (STUCK_JOB_THRESHOLD_MINUTES * 60 * 1000)

    for (const job of active) {
      try {
        const processedOn = job.processedOn || job.timestamp || now
        const ageMinutes = (now - processedOn) / 1000 / 60

        if (processedOn < stuckThreshold) {
          console.log(`   ⚠️  Removing stuck job ${job.id} (stuck for ${ageMinutes.toFixed(1)} minutes)`)
          
          // Get job ID from data if available
          const jobId = (job.data as any)?.jobId || job.id
          
              // Update database if job exists
          try {
            const pool = getDatabasePool()
            await pool.query(
              `UPDATE jobs 
               SET status = 'failed', 
                   error_message = 'Job stuck in processing - cleaned up by queue cleanup script',
                   completed_at = CURRENT_TIMESTAMP
               WHERE id = $1 AND status = 'processing'`,
              [jobId]
            )
          } catch (dbError) {
            // Job might not exist in database, that's okay
            console.log(`      (Job ${jobId} not found in database, removing from queue only)`)
          }

          await job.remove()
          stats.stuckProcessing++
          stats.totalRemoved++
        }
      } catch (error: any) {
        console.log(`      ❌ Error removing stuck job ${job.id}: ${error.message}`)
      }
    }

    // 2. Clean up old failed jobs
    const oldFailedThreshold = new Date()
    oldFailedThreshold.setDate(oldFailedThreshold.getDate() - OLD_FAILED_JOB_THRESHOLD_DAYS)

    for (const job of failed) {
      try {
        const failedOn = job.finishedOn || job.timestamp || now
        const failedDate = new Date(failedOn)

        if (failedDate < oldFailedThreshold) {
          console.log(`   🗑️  Removing old failed job ${job.id} (failed ${Math.floor((now - failedOn) / 1000 / 60 / 60 / 24)} days ago)`)
          
          const jobId = (job.data as any)?.jobId || job.id
          
          // Update database
          try {
            const pool = getDatabasePool()
            await pool.query(
              `UPDATE jobs 
               SET error_message = COALESCE(error_message, '') || ' (cleaned from queue)'
               WHERE id = $1`,
              [jobId]
            )
          } catch (dbError) {
            // Ignore database errors for old failed jobs
          }

          await job.remove()
          stats.oldFailed++
          stats.totalRemoved++
        }
      } catch (error: any) {
        console.log(`      ❌ Error removing old failed job ${job.id}: ${error.message}`)
      }
    }

    // 3. Clean up old completed jobs (optional - keeps queue size manageable)
    const oldCompletedThreshold = new Date()
    oldCompletedThreshold.setDate(oldCompletedThreshold.getDate() - OLD_COMPLETED_JOB_THRESHOLD_DAYS)

    // Only clean if there are many completed jobs
    if (completed.length > 100) {
      let removedCount = 0
      for (const job of completed) {
        try {
          const finishedOn = job.finishedOn || job.timestamp || now
          const finishedDate = new Date(finishedOn)

          if (finishedDate < oldCompletedThreshold) {
            await job.remove()
            removedCount++
            stats.oldCompleted++
            stats.totalRemoved++
          }
        } catch (error: any) {
          // Ignore errors for completed jobs
        }
      }
      if (removedCount > 0) {
        console.log(`   🧹 Removed ${removedCount} old completed jobs (>${OLD_COMPLETED_JOB_THRESHOLD_DAYS} days)`)
      }
    }

    // 4. Find and remove orphaned jobs (in queue but not in database)
    // Also remove jobs that are marked as failed in database but still active in queue
    const allQueueJobs = [...active, ...waiting, ...delayed]
    
    if (allQueueJobs.length > 0) {
      // Get all job IDs from database for this queue type
      const queueTypeMap: Record<string, string> = {
        'ai-processing': 'ai-generate',
        'document-processing': 'document-convert',
        'pipeline-processing': 'pipeline-processing',
        'baseline-processing': 'baseline-extract',
        'process-flow-processing': 'process-flow',
        'document-regeneration': 'document-regeneration',
        'quality-audit': 'quality-audit',
        'project-data-extraction': 'extract-project-data',
      }

      const queueType = queueTypeMap[queueName]
      if (queueType) {
        let dbJobIds = new Set<string>()
        let failedJobIds = new Set<string>()
        let processingJobsWithErrors = new Set<string>()
        
        try {
          const pool = getDatabasePool()
          
          // Get valid pending/processing jobs
          const dbJobsResult = await pool.query(
            `SELECT id FROM jobs WHERE type = $1 AND status IN ('pending', 'processing') AND error_message IS NULL`,
            [queueType]
          )
          dbJobIds = new Set(dbJobsResult.rows.map((r: any) => r.id))
          
          // Get jobs marked as failed in database
          const failedJobsResult = await pool.query(
            `SELECT id FROM jobs WHERE type = $1 AND status = 'failed'`,
            [queueType]
          )
          failedJobIds = new Set(failedJobsResult.rows.map((r: any) => r.id))
          
          // Get jobs that are "processing" but have error messages (inconsistent state)
          const errorJobsResult = await pool.query(
            `SELECT id FROM jobs WHERE type = $1 AND status = 'processing' AND error_message IS NOT NULL`,
            [queueType]
          )
          processingJobsWithErrors = new Set(errorJobsResult.rows.map((r: any) => r.id))
          
        } catch (dbError: any) {
          // If database is not available, skip orphaned job detection
          console.log(`      ⚠️  Database not available, skipping orphaned job detection`)
        }

        for (const job of allQueueJobs) {
          const jobId = (job.data as any)?.jobId || job.id
          
          // Remove if:
          // 1. Job is not in database (orphaned)
          // 2. Job is marked as failed in database but still in queue
          // 3. Job is "processing" in database but has error message (inconsistent state)
          if (!dbJobIds.has(jobId) || failedJobIds.has(jobId) || processingJobsWithErrors.has(jobId)) {
            try {
              const reason = !dbJobIds.has(jobId) ? 'orphaned' 
                           : failedJobIds.has(jobId) ? 'marked as failed in database'
                           : 'processing with error message'
              console.log(`   🔍 Removing ${reason} job ${job.id} (jobId: ${jobId})`)
              
              // If it's in active state, move to failed first
              const state = await job.getState()
              if (state === 'active') {
                try {
                  await job.moveToFailed({ message: 'Removed by cleanup script - job was in inconsistent state' }, true)
                } catch (moveError) {
                  // If move fails, try to remove directly
                  await job.remove()
                }
              } else {
                await job.remove()
              }
              
              stats.orphaned++
              stats.totalRemoved++
            } catch (error: any) {
              console.log(`      ❌ Error removing job ${job.id}: ${error.message}`)
            }
          }
        }
      }
    }

    // Use Bull's built-in clean method for additional cleanup
    await queue.clean(5000, 'failed')
    await queue.clean(5000, 'completed')

    // Get final counts
    const finalCounts = await queue.getJobCounts()
    console.log(`\n   ✅ Cleanup complete for ${displayName}`)
    console.log(`   Final counts: Active: ${finalCounts.active}, Waiting: ${finalCounts.waiting}, Failed: ${finalCounts.failed}, Completed: ${finalCounts.completed}`)

    await queue.close()
  } catch (error: any) {
    console.error(`   ❌ Error processing queue ${displayName}: ${error.message}`)
    try {
      await queue.close()
    } catch (closeError) {
      // Ignore close errors
    }
  }

  return stats
}

async function cleanupDatabaseJobs() {
  console.log(`\n📊 Cleaning up database job records...`)
  console.log('─'.repeat(60))

  try {
    const pool = getDatabasePool()
    
    // Fix inconsistent states: jobs marked as "processing" but have error messages
    const inconsistentResult = await pool.query(
      `UPDATE jobs 
       SET status = 'failed',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE status = 'processing'
       AND error_message IS NOT NULL
       RETURNING id`,
      []
    )

    if (inconsistentResult.rowCount > 0) {
      console.log(`   ✅ Fixed ${inconsistentResult.rowCount} inconsistent job states (processing with error messages)`)
    }
    
    // Mark stuck processing jobs as failed
    const stuckThreshold = new Date()
    stuckThreshold.setMinutes(stuckThreshold.getMinutes() - STUCK_JOB_THRESHOLD_MINUTES)

    const stuckResult = await pool.query(
      `UPDATE jobs 
       SET status = 'failed',
           error_message = COALESCE(error_message, 'Job stuck in processing - cleaned up by queue cleanup script'),
           completed_at = CURRENT_TIMESTAMP
       WHERE status = 'processing'
       AND error_message IS NULL
       AND COALESCE(started_at, processing_started_at, created_at) < $1
       RETURNING id`,
      [stuckThreshold]
    )

    if (stuckResult.rowCount > 0) {
      console.log(`   ✅ Marked ${stuckResult.rowCount} stuck jobs as failed in database`)
    }

    // Optionally delete very old failed/cancelled jobs (older than 90 days)
    const oldJobThreshold = new Date()
    oldJobThreshold.setDate(oldJobThreshold.getDate() - 90)

    const deleteResult = await pool.query(
      `DELETE FROM jobs 
       WHERE status IN ('failed', 'cancelled')
       AND completed_at < $1`,
      [oldJobThreshold]
    )

    if (deleteResult.rowCount > 0) {
      console.log(`   ✅ Deleted ${deleteResult.rowCount} very old failed/cancelled jobs from database`)
    }

    if (inconsistentResult.rowCount === 0 && stuckResult.rowCount === 0 && deleteResult.rowCount === 0) {
      console.log(`   ✅ No database cleanup needed`)
    }

  } catch (error: any) {
    console.error(`   ❌ Error cleaning database: ${error.message}`)
  }
}

async function main() {
  console.log('🧹 Starting Queue Cleanup Script')
  console.log('═'.repeat(60))
  console.log(`Configuration:`)
  console.log(`  - Stuck job threshold: ${STUCK_JOB_THRESHOLD_MINUTES} minutes`)
  console.log(`  - Old failed job threshold: ${OLD_FAILED_JOB_THRESHOLD_DAYS} days`)
  console.log(`  - Old completed job threshold: ${OLD_COMPLETED_JOB_THRESHOLD_DAYS} days`)
  console.log('═'.repeat(60))

  // Initialize database connection
  try {
    console.log('\n🔌 Connecting to database...')
    await connectDatabase()
    console.log('✅ Database connected\n')
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message)
    console.log('⚠️  Continuing with queue cleanup only (database operations will be skipped)')
  }

  const allStats: CleanupStats[] = []

  // Clean up each queue
  for (const queueConfig of QUEUE_CONFIGS) {
    const stats = await cleanupQueue(queueConfig.name, queueConfig.displayName)
    allStats.push(stats)
  }

  // Clean up database
  await cleanupDatabaseJobs()

  // Print summary
  console.log('\n\n📊 Cleanup Summary')
  console.log('═'.repeat(60))
  
  let totalStuck = 0
  let totalOldFailed = 0
  let totalOldCompleted = 0
  let totalOrphaned = 0
  let totalRemoved = 0

  for (const stats of allStats) {
    console.log(`\n${stats.queueName}:`)
    console.log(`  Stuck processing: ${stats.stuckProcessing}`)
    console.log(`  Old failed: ${stats.oldFailed}`)
    console.log(`  Old completed: ${stats.oldCompleted}`)
    console.log(`  Orphaned: ${stats.orphaned}`)
    console.log(`  Total removed: ${stats.totalRemoved}`)

    totalStuck += stats.stuckProcessing
    totalOldFailed += stats.oldFailed
    totalOldCompleted += stats.oldCompleted
    totalOrphaned += stats.orphaned
    totalRemoved += stats.totalRemoved
  }

  console.log('\n' + '═'.repeat(60))
  console.log('Grand Total:')
  console.log(`  Stuck processing jobs: ${totalStuck}`)
  console.log(`  Old failed jobs: ${totalOldFailed}`)
  console.log(`  Old completed jobs: ${totalOldCompleted}`)
  console.log(`  Orphaned jobs: ${totalOrphaned}`)
  console.log(`  Total jobs removed: ${totalRemoved}`)
  console.log('═'.repeat(60))
  console.log('\n✅ Queue cleanup complete!')
  console.log('💡 All stale jobs have been removed from queues.\n')

  // Close database connection if it was initialized
  try {
    const pool = getDatabasePool()
    await pool.end()
  } catch (error) {
    // Pool might not have been initialized, that's okay
  }
  
  process.exit(0)
}

// Run the cleanup
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

