import { createClient } from 'redis'
import * as dotenv from 'dotenv'

dotenv.config()

async function cleanupStuckJobs() {
  const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  })

  await redis.connect()

  try {
    console.log('\n🔍 Finding stuck jobs...\n')

    // Get all queues
    const queues = [
      'document-regeneration',
      'project-data-extraction',
      'ai-processing',
      'process-flow-processing',
      'export-processing'
    ]

    for (const queueName of queues) {
      console.log(`📋 Checking queue: ${queueName}`)

      // Get active jobs
      const activeJobs = await redis.lRange(`bull:${queueName}:active`, 0, -1)
      
      if (activeJobs.length === 0) {
        console.log(`   ✅ No active jobs\n`)
        continue
      }

      console.log(`   Found ${activeJobs.length} active job(s):\n`)

      for (const jobId of activeJobs) {
        const jobKey = `bull:${queueName}:${jobId}`
        const jobData = await redis.get(jobKey)
        
        if (jobData) {
          const job = JSON.parse(jobData)
          const startedAt = job.processedOn || job.timestamp
          const now = Date.now()
          const ageMinutes = Math.floor((now - startedAt) / 1000 / 60)

          console.log(`   Job ID: ${jobId}`)
          console.log(`   Age: ${ageMinutes} minutes`)
          console.log(`   Progress: ${job.progress || 0}%`)
          console.log(`   Data: ${JSON.stringify(job.data).substring(0, 100)}...`)

          if (ageMinutes > 60) {
            console.log(`   ⚠️  STUCK (> 60 minutes old)`)
            console.log(`   🗑️  Moving to failed...`)
            
            // Move from active to failed
            await redis.lRem(`bull:${queueName}:active`, 0, jobId)
            await redis.lPush(`bull:${queueName}:failed`, jobId)
            
            // Update job status
            job.failedReason = 'Job stuck for over 60 minutes - automatically failed'
            job.finishedOn = Date.now()
            await redis.set(jobKey, JSON.stringify(job))
            
            console.log(`   ✅ Moved to failed queue\n`)
          } else {
            console.log(`   ✅ Still processing (< 60 min)\n`)
          }
        }
      }
    }

    console.log('\n✨ Cleanup complete!\n')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await redis.quit()
  }
}

cleanupStuckJobs()

