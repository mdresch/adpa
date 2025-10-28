/**
 * Clear Failed Jobs from Bull Queue
 * Removes stuck/failed jobs that can't be cancelled from UI
 */

import Queue from 'bull'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Queue names from queueService.ts
const QUEUE_NAMES = [
  'ai-generate',
  'document-export',
  'integration-sync',
  'analytics-processing'
]

async function clearFailedJobs(): Promise<void> {
  console.log('🧹 Clearing Failed Jobs from Bull Queues...\n')

  try {
    for (const queueName of QUEUE_NAMES) {
      console.log(`\n📋 Processing queue: ${queueName}`)
      
      const queue = new Queue(queueName, REDIS_URL, {
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false
        }
      })

      // Get failed jobs
      const failedJobs = await queue.getFailed()
      console.log(`   Found ${failedJobs.length} failed jobs`)

      // Get active jobs (might be stuck)
      const activeJobs = await queue.getActive()
      console.log(`   Found ${activeJobs.length} active jobs`)

      // Get completed jobs
      const completedJobs = await queue.getCompleted()
      console.log(`   Found ${completedJobs.length} completed jobs`)

      // Remove failed jobs
      if (failedJobs.length > 0) {
        console.log(`   🗑️  Removing ${failedJobs.length} failed jobs...`)
        for (const job of failedJobs) {
          try {
            await job.remove()
            console.log(`      ✅ Removed job ${job.id}`)
          } catch (error: any) {
            console.log(`      ❌ Failed to remove job ${job.id}: ${error.message}`)
          }
        }
      }

      // Remove old active jobs (might be stuck)
      if (activeJobs.length > 0) {
        console.log(`   🗑️  Checking ${activeJobs.length} active jobs for stuck ones...`)
        for (const job of activeJobs) {
          try {
            // Check if job has been active for more than 10 minutes
            const now = Date.now()
            const processedOn = job.processedOn || now
            const ageMinutes = (now - processedOn) / 1000 / 60
            
            if (ageMinutes > 10) {
              console.log(`      ⚠️  Job ${job.id} stuck for ${ageMinutes.toFixed(1)} minutes - removing...`)
              await job.remove()
              console.log(`      ✅ Removed stuck job ${job.id}`)
            }
          } catch (error: any) {
            console.log(`      ❌ Failed to remove job ${job.id}: ${error.message}`)
          }
        }
      }

      // Clean up old completed jobs
      if (completedJobs.length > 100) {
        console.log(`   🗑️  Cleaning up old completed jobs (keeping last 100)...`)
        const jobsToRemove = completedJobs.slice(100)
        for (const job of jobsToRemove) {
          try {
            await job.remove()
          } catch (error) {
            // Ignore errors on cleanup
          }
        }
        console.log(`      ✅ Removed ${jobsToRemove.length} old completed jobs`)
      }

      // Clean the queue
      await queue.clean(5000, 'failed')
      await queue.clean(5000, 'completed')
      console.log(`   ✅ Queue cleaned`)

      await queue.close()
    }

    console.log('\n✅ All queues processed successfully!')
    console.log('\n📊 Summary:')
    console.log('   - Failed jobs removed')
    console.log('   - Stuck jobs cleared')
    console.log('   - Old completed jobs cleaned up')
    console.log('\n💡 You can now retry document generation')

  } catch (error: any) {
    console.error('❌ Error clearing jobs:', error.message)
    throw error
  }
}

// Run cleanup
clearFailedJobs()
  .then(() => {
    console.log('\n✅ Job cleanup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Job cleanup failed:', error)
    process.exit(1)
  })

