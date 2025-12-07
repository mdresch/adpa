/**
 * Load Testing for Queue Service
 * Phase 5.5: Testing and Performance Monitoring - Load Testing
 * 
 * Tests the queue service with 1000+ concurrent jobs to identify bottlenecks
 * and validate performance under high load.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { getQueueServiceInstance } from '../../../../services/queueService'
import type { JobData } from '../../../../services/jobs/types'
import { v4 as uuidv4 } from 'uuid'

describe('Queue Service Load Testing', () => {
  let queueService: Awaited<ReturnType<typeof getQueueServiceInstance>>
  const TARGET_JOBS = 1000
  const CONCURRENT_BATCHES = 10
  const JOBS_PER_BATCH = TARGET_JOBS / CONCURRENT_BATCHES

  beforeAll(async () => {
    // Create real queue service (not mocked) for load testing
    queueService = await getQueueServiceInstance()
  })

  afterAll(async () => {
    // Cleanup if needed
  })

  it('should handle 1000+ concurrent job additions', async () => {
    const startTime = Date.now()
    const jobPromises: Promise<string>[] = []
    const errors: Error[] = []

    // Create job data for all jobs
    const jobDataArray: JobData[] = Array.from({ length: TARGET_JOBS }, () => ({
      jobId: uuidv4(),
      userId: uuidv4(),
      projectId: uuidv4(),
      templateId: uuidv4(),
    } as JobData))

    // Add jobs in concurrent batches
    for (let batch = 0; batch < CONCURRENT_BATCHES; batch++) {
      const batchStart = batch * JOBS_PER_BATCH
      const batchEnd = batchStart + JOBS_PER_BATCH

      const batchPromises = jobDataArray
        .slice(batchStart, batchEnd)
        .map(async (jobData) => {
          try {
            return await queueService.addJob('ai-generate', jobData)
          } catch (error) {
            errors.push(error as Error)
            throw error
          }
        })

      jobPromises.push(...batchPromises)
    }

    // Wait for all jobs to be added
    const results = await Promise.allSettled(jobPromises)
    const endTime = Date.now()
    const duration = endTime - startTime

    // Calculate success rate
    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    const successRate = (successful / TARGET_JOBS) * 100

    // Performance metrics
    const jobsPerSecond = (TARGET_JOBS / duration) * 1000
    const avgTimePerJob = duration / TARGET_JOBS

    console.log('\n=== Load Test Results ===')
    console.log(`Total Jobs: ${TARGET_JOBS}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    console.log(`Success Rate: ${successRate.toFixed(2)}%`)
    console.log(`Total Duration: ${duration}ms`)
    console.log(`Jobs/Second: ${jobsPerSecond.toFixed(2)}`)
    console.log(`Avg Time/Job: ${avgTimePerJob.toFixed(2)}ms`)

    // Assertions
    expect(successful).toBeGreaterThanOrEqual(TARGET_JOBS * 0.95) // 95% success rate minimum
    expect(duration).toBeLessThan(60000) // Should complete in under 60 seconds
    expect(jobsPerSecond).toBeGreaterThan(10) // At least 10 jobs/second

    if (errors.length > 0) {
      console.warn(`\nErrors encountered: ${errors.length}`)
      errors.slice(0, 5).forEach((err, idx) => {
        console.warn(`Error ${idx + 1}:`, err.message)
      })
    }
  }, 120000) // 2 minute timeout

  it('should handle concurrent job status queries', async () => {
    // First, add some jobs
    const jobIds: string[] = []
    for (let i = 0; i < 100; i++) {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData
      const jobId = await queueService.addJob('ai-generate', jobData)
      jobIds.push(jobId)
    }

    // Now query all of them concurrently
    const startTime = Date.now()
    const statusPromises = jobIds.map((jobId) => queueService.getJobStatus(jobId))
    const statuses = await Promise.all(statusPromises)
    const endTime = Date.now()
    const duration = endTime - startTime

    const avgTimePerQuery = duration / jobIds.length

    console.log('\n=== Concurrent Status Query Results ===')
    console.log(`Total Queries: ${jobIds.length}`)
    console.log(`Total Duration: ${duration}ms`)
    console.log(`Avg Time/Query: ${avgTimePerQuery.toFixed(2)}ms`)

    expect(statuses.length).toBe(jobIds.length)
    expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    expect(avgTimePerQuery).toBeLessThan(100) // Each query should be under 100ms
  }, 30000)

  it('should handle mixed operations under load', async () => {
    const operations: Promise<unknown>[] = []
    const startTime = Date.now()

    // Mix of add, status, and update operations
    for (let i = 0; i < 500; i++) {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      // Add job
      operations.push(
        queueService.addJob('ai-generate', jobData).then(async (jobId) => {
          // Then get status
          await queueService.getJobStatus(jobId)
          // Then update status
          await queueService.updateJobStatus(jobId, 'processing')
          return jobId
        })
      )
    }

    const results = await Promise.allSettled(operations)
    const endTime = Date.now()
    const duration = endTime - startTime

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const successRate = (successful / operations.length) * 100

    console.log('\n=== Mixed Operations Load Test ===')
    console.log(`Total Operations: ${operations.length * 3}`) // Each operation does 3 things
    console.log(`Successful: ${successful}`)
    console.log(`Success Rate: ${successRate.toFixed(2)}%`)
    console.log(`Total Duration: ${duration}ms`)

    expect(successRate).toBeGreaterThanOrEqual(95) // 95% success rate
    expect(duration).toBeLessThan(120000) // Under 2 minutes
  }, 180000)
})
