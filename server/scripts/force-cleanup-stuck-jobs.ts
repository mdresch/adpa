#!/usr/bin/env tsx
/**
 * Force cleanup script to remove stuck jobs that are in inconsistent states
 * 
 * This script aggressively:
 * 1. Finds all jobs in database that are "processing" but have error messages
 * 2. Updates them to "failed" status
 * 3. Removes them from Bull queues
 * 
 * Usage: tsx server/scripts/force-cleanup-stuck-jobs.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import Bull from 'bull'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

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
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}

const QUEUE_TYPE_MAP: Record<string, string> = {
  'ai-generate': 'ai-processing',
  'document-convert': 'document-processing',
  'pipeline-processing': 'pipeline-processing',
  'baseline-extract': 'baseline-processing',
  'process-flow': 'process-flow-processing',
  'document-regeneration': 'document-regeneration',
  'quality-audit': 'quality-audit',
  'extract-project-data': 'project-data-extraction',
}

async function main() {
  console.log('🔧 Force Cleanup of Stuck Jobs')
  console.log('═'.repeat(60))

  // Initialize database connection
  try {
    console.log('\n🔌 Connecting to database...')
    await connectDatabase()
    console.log('✅ Database connected\n')
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message)
    process.exit(1)
  }

  const pool = getDatabasePool()
  const redisConfig = await getBullRedisConfig()

  try {
    // Step 1: Find all jobs that are "processing" but have error messages
    console.log('📊 Finding inconsistent jobs in database...')
    const inconsistentJobs = await pool.query(
      `SELECT id, type, error_message, queue_name, worker_id
       FROM jobs 
       WHERE status = 'processing' 
       AND error_message IS NOT NULL
       ORDER BY created_at DESC`
    )

    console.log(`   Found ${inconsistentJobs.rows.length} inconsistent jobs\n`)

    if (inconsistentJobs.rows.length === 0) {
      console.log('✅ No inconsistent jobs found!')
      await pool.end()
      process.exit(0)
    }

    // Step 2: Update database to mark them as failed
    console.log('📝 Updating database status to "failed"...')
    
    // First, let's see what we're updating
    const checkResult = await pool.query(
      `SELECT id, status, error_message 
       FROM jobs 
       WHERE status = 'processing' 
       AND error_message IS NOT NULL
       LIMIT 5`
    )
    console.log(`   Sample jobs to update:`)
    checkResult.rows.forEach(job => {
      console.log(`     - ${job.id}: status="${job.status}", error="${job.error_message?.substring(0, 50)}..."`)
    })
    
    const updateResult = await pool.query(
      `UPDATE jobs 
       SET status = 'failed',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE status = 'processing' 
       AND error_message IS NOT NULL
       RETURNING id, type, queue_name, status`
    )
    
    // Verify the update worked
    if (updateResult.rows.length > 0) {
      console.log(`   ✅ Updated ${updateResult.rowCount} jobs`)
      console.log(`   Sample updated job: ${updateResult.rows[0].id} now has status="${updateResult.rows[0].status}"`)
    }

    console.log(`   ✅ Updated ${updateResult.rowCount} jobs in database\n`)

    // Step 3: Remove from Bull queues
    console.log('🗑️  Removing jobs from Bull queues...')
    
    const queueMap = new Map<string, Bull.Queue>()
    let totalRemoved = 0

    for (const job of updateResult.rows) {
      try {
        // Determine which queue this job belongs to
        const queueName = job.queue_name || QUEUE_TYPE_MAP[job.type] || 'ai-processing'
        
        // Get or create queue
        if (!queueMap.has(queueName)) {
          const queue = new Bull(queueName, { redis: redisConfig })
          queueMap.set(queueName, queue)
        }
        
        const queue = queueMap.get(queueName)!
        
        // Try to find the job in the queue
        // For extraction jobs, the Bull job ID might not match the database job ID
        let bullJob = await queue.getJob(job.id)
        
        if (!bullJob && queueName === 'project-data-extraction') {
          // Special handling for extraction jobs - search by data.jobId
          const activeJobs = await queue.getActive()
          const waitingJobs = await queue.getWaiting()
          const delayedJobs = await queue.getDelayed()
          
          const allJobs = [...activeJobs, ...waitingJobs, ...delayedJobs]
          bullJob = allJobs.find((j: any) => j.data?.jobId === job.id) || null
        }
        
        if (bullJob) {
          const state = await bullJob.getState()
          
          if (state === 'active') {
            // Move active jobs to failed
            try {
              await bullJob.moveToFailed({ message: 'Removed by force cleanup - job was in inconsistent state' }, true)
              console.log(`   ✅ Moved job ${job.id} from ${queueName} (was active)`)
            } catch (moveError: any) {
              // If move fails, try to remove
              await bullJob.remove()
              console.log(`   ✅ Removed job ${job.id} from ${queueName} (move failed, removed directly)`)
            }
          } else {
            // Remove waiting/delayed jobs
            await bullJob.remove()
            console.log(`   ✅ Removed job ${job.id} from ${queueName} (was ${state})`)
          }
          
          totalRemoved++
        } else {
          console.log(`   ⚠️  Job ${job.id} not found in queue ${queueName} (may have been already removed)`)
        }
      } catch (error: any) {
        console.log(`   ❌ Error processing job ${job.id}: ${error.message}`)
      }
    }

    // Close all queues
    for (const queue of queueMap.values()) {
      await queue.close()
    }

    console.log('\n' + '═'.repeat(60))
    console.log('📊 Summary:')
    console.log(`   Database jobs updated: ${updateResult.rowCount}`)
    console.log(`   Queue jobs removed: ${totalRemoved}`)
    console.log('═'.repeat(60))
    console.log('\n✅ Force cleanup complete!\n')

    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    await pool.end()
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

