/**
 * Diagnose Pending Jobs
 * Identifies why jobs remain in pending status
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'
import {
  aiQueue,
  documentQueue,
  pipelineQueue,
  baselineQueue,
  processFlowQueue,
  regenerationQueue,
  qualityAuditQueue,
  extractionQueue,
} from '../src/services/queueService'

dotenv.config({ path: path.join(__dirname, '../.env') })

const queueMap: Record<string, any> = {
  'ai-processing': aiQueue,
  'document-processing': documentQueue,
  'pipeline-processing': pipelineQueue,
  'baseline-processing': baselineQueue,
  'process-flow-processing': processFlowQueue,
  'document-regeneration': regenerationQueue,
  'quality-audit': qualityAuditQueue,
  'project-data-extraction': extractionQueue,
}

async function diagnosePendingJobs() {
  console.log('🔍 Diagnosing Pending Jobs...\n')

  try {
    // Ensure database connection is established
    await connectDatabase()
    
    // Wait a moment for pool to be ready
    if (!pool) {
      throw new Error('Database connection pool not available')
    }
    // Get all pending jobs
    const pendingJobs = await pool.query(`
      SELECT 
        id,
        type,
        status,
        queue_name,
        created_at,
        queued_at,
        error_message,
        worker_id,
        processing_started_at
      FROM jobs
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 50
    `)

    console.log(`Found ${pendingJobs.rows.length} pending jobs\n`)

    if (pendingJobs.rows.length === 0) {
      console.log('✅ No pending jobs found - system is healthy!')
      return
    }

    const summary = {
      total: pendingJobs.rows.length,
      inQueue: 0,
      notInQueue: 0,
      oldPending: 0,
      withErrors: 0,
      byQueue: {} as Record<string, number>,
    }

    console.log('='.repeat(80))
    console.log('PENDING JOB ANALYSIS')
    console.log('='.repeat(80))

    for (const job of pendingJobs.rows) {
      const jobId = job.id
      const queueName = job.queue_name || ''
      const queue = queueMap[queueName]
      const createdAt = new Date(job.created_at || job.queued_at)
      const ageMinutes = Math.floor((Date.now() - createdAt.getTime()) / 1000 / 60)

      // Count by queue
      summary.byQueue[queueName] = (summary.byQueue[queueName] || 0) + 1

      let inQueue = false
      let queueStatus = 'unknown'
      let queuePosition: number | null = null

      // Check if in Bull queue
      if (queue) {
        try {
          const bullJob = await queue.getJob(jobId)
          if (bullJob) {
            inQueue = true
            queueStatus = await bullJob.getState()
            
            if (queueStatus === 'waiting') {
              const waiting = await queue.getWaiting()
              const index = waiting.findIndex(j => j.id === jobId)
              queuePosition = index >= 0 ? index + 1 : null
            }
          }
        } catch (error) {
          // Queue check failed
        }
      }

      // Update summary
      if (inQueue) summary.inQueue++
      else summary.notInQueue++
      
      if (ageMinutes > 5) summary.oldPending++
      if (job.error_message) summary.withErrors++

      // Display job info
      console.log(`\n📋 Job: ${jobId.substring(0, 8)}...`)
      console.log(`   Type: ${job.type}`)
      console.log(`   Queue: ${queueName || 'unknown'}`)
      console.log(`   Age: ${ageMinutes} minutes`)
      console.log(`   In Bull Queue: ${inQueue ? '✅ Yes' : '❌ No'}`)
      if (inQueue) {
        console.log(`   Queue Status: ${queueStatus}`)
        if (queuePosition !== null) {
          console.log(`   Position in Queue: #${queuePosition}`)
        }
      }
      if (job.error_message) {
        console.log(`   ⚠️  Error: ${job.error_message.substring(0, 100)}`)
      }
      if (ageMinutes > 30) {
        console.log(`   ⚠️  Very old (${ageMinutes} minutes) - likely stuck`)
      }
      if (!queue) {
        console.log(`   ⚠️  Unknown queue: ${queueName}`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total Pending: ${summary.total}`)
    console.log(`In Bull Queue: ${summary.inQueue}`)
    console.log(`Not in Bull Queue: ${summary.notInQueue} ⚠️`)
    console.log(`Old (>5 min): ${summary.oldPending} ⚠️`)
    console.log(`With Errors: ${summary.withErrors} ⚠️`)
    console.log('\nBy Queue:')
    Object.entries(summary.byQueue).forEach(([queue, count]) => {
      console.log(`  ${queue}: ${count}`)
    })

    // Recommendations
    console.log('\n' + '='.repeat(80))
    console.log('RECOMMENDATIONS')
    console.log('='.repeat(80))
    
    if (summary.notInQueue > 0) {
      console.log(`\n⚠️  ${summary.notInQueue} jobs are orphaned (in DB but not in queue)`)
      console.log('   → These jobs were created but failed to add to Bull queue')
      console.log('   → Action: Re-add them to queues or mark as failed')
      console.log('   → Use: POST /api/jobs/diagnostics/fix-pending?action=re-add')
    }
    
    if (summary.oldPending > 0) {
      console.log(`\n⚠️  ${summary.oldPending} jobs have been pending for >5 minutes`)
      console.log('   → Check if queue processors are running')
      console.log('   → Verify workers are connected to Redis')
      console.log('   → Check server logs for errors')
    }
    
    if (summary.withErrors > 0) {
      console.log(`\n⚠️  ${summary.withErrors} pending jobs have error messages`)
      console.log('   → These should be marked as failed, not pending')
      console.log('   → Action: Mark them as failed')
      console.log('   → Use: POST /api/jobs/diagnostics/fix-pending?action=mark-failed')
    }

    // Check queue health
    console.log('\n' + '='.repeat(80))
    console.log('QUEUE HEALTH CHECK')
    console.log('='.repeat(80))
    
    for (const [name, queue] of Object.entries(queueMap)) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ])
        
        console.log(`\n${name}:`)
        console.log(`  Waiting: ${waiting}`)
        console.log(`  Active: ${active}`)
        console.log(`  Completed: ${completed}`)
        console.log(`  Failed: ${failed}`)
        
        if (waiting > 0 && active === 0) {
          console.log(`  ⚠️  Jobs waiting but none active - processors may not be running`)
        }
      } catch (error: any) {
        console.log(`\n${name}: ❌ Error - ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

diagnosePendingJobs()

