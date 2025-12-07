#!/usr/bin/env tsx
/**
 * Remove stuck jobs from ALL Bull queue states (active, waiting, delayed, failed)
 * This ensures they can't be picked up by workers
 */

import dotenv from 'dotenv'
import path from 'path'
import Bull from 'bull'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

const STUCK_JOB_IDS = [
  'f2a56180-9dd2-4be6-b501-1d33facb6431',
  '31adb646-faf4-4189-8387-ec32cf3e0c25',
  '196216d4-aaaf-4f5f-9168-d91d57080cb3',
  '712ea236-c526-4c8c-aaf2-cbf902427a0c',
  '0a15bed1-da5d-4eda-bf00-baab37b67d68',
  'd6b09e4b-e3b4-4850-b36f-4faa68904f4a',
  '97a0ee17-ece4-43a3-b8e8-f985799be810',
  '7ff5b5e6-f0fe-441d-a4a2-976d1d70b255',
  '1f37570f-a164-4965-8a60-b8c16de8586a',
  '4dd94ae3-9bcf-4347-9ce0-92f8cb42175d',
  'b1da2bcd-b2ed-4e44-b86b-c9e88e6ebfe4',
  '73934bd7-3de6-4e15-a572-e424887e7990',
  '6bc3f15e-5f6c-49b9-8317-89ba0ccb6aae',
  '01536d37-c977-4b69-8b98-74909772ce19',
  '44977e28-85e7-40e2-9637-b32085b1d0a9',
  '2b19d183-3221-4b15-9146-c3b4369bc6d0',
  'dabb6c65-9d5e-47f7-bf76-350fc7c5b5ff',
  'a30c07d3-3294-4d39-a851-8b58f3726f5f',
  '35061e1b-aecf-4b81-b29e-82a052ac7f3c',
  'e0419aff-2339-46eb-a1b4-8d27e601dd55',
  'b371dc69-4177-464d-a46b-d58fe3e47e58',
  'f9416362-83e9-494c-aebf-a1e01c294822',
  '47554d4a-d742-4879-9991-338aef28ef89',
  '9ccc4d9d-901c-489e-8af0-1a8201abcf3d'
]

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
  console.log('🔧 Remove Jobs from All Bull Queues')
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

  const queueMap = new Map<string, Bull.Queue>()
  let totalRemoved = 0
  const removedJobs: string[] = []

  // Open all queues
  for (const queueName of QUEUE_NAMES) {
    const queue = new Bull(queueName, { redis: redisConfig })
    queueMap.set(queueName, queue)
  }

  console.log('🔍 Searching for jobs in all queue states...\n')

  // Search all queues and all states
  for (const queueName of QUEUE_NAMES) {
    const queue = queueMap.get(queueName)!
    
    try {
      console.log(`📋 Processing queue: ${queueName}`)
      
      // Get all jobs from all states
      const [active, waiting, delayed, failed, completed] = await Promise.all([
        queue.getActive(),
        queue.getWaiting(),
        queue.getDelayed(),
        queue.getFailed(),
        queue.getCompleted()
      ])

      const allJobs = [...active, ...waiting, ...delayed, failed, completed]
      console.log(`   Found ${allJobs.length} total jobs (active: ${active.length}, waiting: ${waiting.length}, delayed: ${delayed.length}, failed: ${failed.length}, completed: ${completed.length})`)
      
      for (const stuckJobId of STUCK_JOB_IDS) {
        // Try direct match by Bull job ID
        let bullJob = allJobs.find((j: any) => j.id === stuckJobId)
        
        // For extraction jobs, also check data.jobId (database job ID)
        if (!bullJob && queueName === 'project-data-extraction') {
          bullJob = allJobs.find((j: any) => j.data?.jobId === stuckJobId)
        }

        if (bullJob) {
          try {
            const state = await bullJob.getState()
            console.log(`   🎯 Found job ${stuckJobId.substring(0, 8)}... in state: ${state}`)
            
            // Remove from queue regardless of state
            await bullJob.remove()
            console.log(`   ✅ Removed job ${stuckJobId.substring(0, 8)}... from ${queueName}`)
            
            totalRemoved++
            removedJobs.push(`${stuckJobId} (${queueName}, was ${state})`)
          } catch (error: any) {
            console.log(`   ⚠️  Error removing job ${stuckJobId.substring(0, 8)}...: ${error.message}`)
          }
        }
      }
      console.log()
    } catch (error: any) {
      console.log(`   ❌ Error processing queue ${queueName}: ${error.message}\n`)
    }
  }

  // Also update database to ensure they're marked as failed
  console.log('📝 Updating database to mark jobs as failed...')
  const updateResult = await pool.query(
    `UPDATE jobs 
     SET status = 'failed',
         completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
         error_message = COALESCE(
           error_message, 
           'Job removed from queue - force cleaned up'
         )
     WHERE id = ANY($1::uuid[])
     RETURNING id`,
    [STUCK_JOB_IDS]
  )
  console.log(`   ✅ Updated ${updateResult.rowCount} jobs in database\n`)

  // Close all queues
  for (const queue of queueMap.values()) {
    await queue.close()
  }

  console.log('═'.repeat(60))
  console.log('📊 Summary:')
  console.log(`   Jobs removed from queues: ${totalRemoved}`)
  console.log(`   Jobs updated in database: ${updateResult.rowCount}`)
  if (removedJobs.length > 0) {
    console.log('\n   Removed jobs:')
    removedJobs.forEach(job => console.log(`     - ${job}`))
  }
  console.log('═'.repeat(60))
  console.log('\n✅ Queue cleanup complete!')
  console.log('\n⚠️  IMPORTANT: Restart the backend server now.')
  console.log('   After restart, these jobs will stay as "failed" and won\'t be reprocessed.\n')

  await pool.end()
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

