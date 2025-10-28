/**
 * Check Job Queue Status
 * Displays detailed status of all Bull queues
 */

import Queue from 'bull'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const QUEUE_NAMES = [
  'ai-generate',
  'document-export',
  'integration-sync',
  'analytics-processing'
]

async function checkQueues(): Promise<void> {
  console.log('🔍 Checking Job Queue Status...\n')

  try {
    for (const queueName of QUEUE_NAMES) {
      console.log(`\n📋 Queue: ${queueName}`)
      console.log('─'.repeat(60))
      
      const queue = new Queue(queueName, REDIS_URL)

      // Get job counts
      const counts = await queue.getJobCounts()
      console.log(`   Waiting:    ${counts.waiting} jobs`)
      console.log(`   Active:     ${counts.active} jobs`)
      console.log(`   Completed:  ${counts.completed} jobs`)
      console.log(`   Failed:     ${counts.failed} jobs`)
      console.log(`   Delayed:    ${counts.delayed} jobs`)
      console.log(`   Paused:     ${counts.paused} jobs`)

      // Get active jobs
      if (counts.active > 0) {
        const activeJobs = await queue.getActive()
        console.log(`\n   🔄 Active Jobs:`)
        for (const job of activeJobs.slice(0, 5)) {
          console.log(`      ID: ${job.id}`)
          console.log(`      Data: ${JSON.stringify(job.data).substring(0, 100)}...`)
          console.log(`      Progress: ${await job.progress()}%`)
        }
      }

      // Get failed jobs
      if (counts.failed > 0) {
        const failedJobs = await queue.getFailed(0, 5)
        console.log(`\n   ❌ Recent Failed Jobs:`)
        for (const job of failedJobs) {
          console.log(`      ID: ${job.id}`)
          console.log(`      Error: ${job.failedReason?.substring(0, 100)}...`)
          console.log(`      Attempts: ${job.attemptsMade}/${job.opts.attempts || 3}`)
        }
      }

      // Check for potentially stuck active jobs
      if (counts.active > 0) {
        const activeJobs = await queue.getActive()
        let stuckCount = 0
        const now = Date.now()
        
        for (const job of activeJobs) {
          const processedOn = job.processedOn || now
          const ageMinutes = (now - processedOn) / 1000 / 60
          if (ageMinutes > 10) {
            stuckCount++
          }
        }
        
        if (stuckCount > 0) {
          console.log(`\n   ⚠️  Potentially Stuck Jobs: ${stuckCount} (active > 10 min)`)
        }
      }

      // Check queue health
      const isPaused = await queue.isPaused()
      if (isPaused) {
        console.log(`\n   ⏸️  WARNING: Queue is paused!`)
      }

      await queue.close()
    }

    console.log('\n\n📊 Overall Status:')
    console.log('─'.repeat(60))
    console.log('✅ Queue system is operational')
    console.log('\n💡 Recommendations:')
    console.log('   - If you see many failed jobs, run: npx tsx scripts/clear-failed-jobs.ts')
    console.log('   - If jobs are stuck, restart the backend server')
    console.log('   - Check Redis connection if no jobs are processing')

  } catch (error: any) {
    console.error('❌ Error checking queues:', error.message)
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  Redis connection failed!')
      console.log('   Make sure Redis is running:')
      console.log('   - Check if Redis is installed')
      console.log('   - Try: redis-cli ping')
      console.log('   - Or restart Redis service')
    }
    
    throw error
  }
}

// Run check
checkQueues()
  .then(() => {
    console.log('\n✅ Queue check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Queue check failed:', error)
    process.exit(1)
  })

