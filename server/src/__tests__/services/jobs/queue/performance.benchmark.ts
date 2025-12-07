/**
 * Performance Benchmarks for Queue Service
 * Phase 5.5: Testing and Performance Monitoring
 * 
 * Benchmarks the performance of QueueService operations:
 * - Job addition throughput
 * - Cache hit/miss performance
 * - Database query performance
 * - Name resolution performance
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { QueueService } from '../../../../services/jobs/queue/QueueService'
import { createMockQueueService } from '../../../../services/jobs/queue/QueueServiceFactory'
import type { QueueServiceDependencies } from '../../../../services/jobs/queue/QueueDependencies'
import type { IQueue } from '../../../../services/jobs/queue/IQueue'
import type { JobData } from '../../../../services/jobs/types'
import { v4 as uuidv4 } from 'uuid'

// Performance measurement helper
function measureTime(fn: () => Promise<any>): Promise<{ result: any; time: number }> {
  const start = process.hrtime.bigint()
  return fn().then((result) => {
    const end = process.hrtime.bigint()
    const time = Number(end - start) / 1_000_000 // Convert to milliseconds
    return { result, time }
  })
}

describe('QueueService Performance Benchmarks', () => {
  let mockDependencies: Partial<QueueServiceDependencies>
  let mockQueue: IQueue
  let queueService: QueueService

  beforeEach(() => {
    // Create fast mock dependencies
    mockDependencies = {
      database: {
        query: jest.fn().mockImplementation(async (query: string) => {
          // Simulate database latency (1-5ms)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 4 + 1))
          if (query.includes('SELECT COUNT(*)')) {
            return { rows: [{ count: '0' }], rowCount: 1 }
          }
          if (query.includes('INSERT INTO jobs')) {
            return { rows: [], rowCount: 1 }
          }
          return { rows: [], rowCount: 0 }
        }),
        connect: jest.fn().mockResolvedValue({}),
        end: jest.fn().mockResolvedValue(undefined),
      },
      cache: {
        get: jest.fn().mockImplementation(async () => {
          // Simulate cache latency (0.1-0.5ms)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 0.4 + 0.1))
          return null
        }),
        set: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 0.1))
        }),
        del: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
      websocket: {
        emit: jest.fn().mockReturnValue(true),
        to: jest.fn().mockReturnValue({ emit: jest.fn().mockReturnValue(true) }),
        on: jest.fn(),
        off: jest.fn(),
      },
      aiService: {},
    }

    const mockJob = {
      id: 'test-job-id',
      data: {} as JobData,
      remove: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn().mockResolvedValue('waiting'),
    } as any

    mockQueue = {
      add: jest.fn().mockResolvedValue(mockJob),
      getJob: jest.fn().mockResolvedValue(mockJob),
      remove: jest.fn().mockResolvedValue(undefined),
      process: jest.fn(),
      getJobs: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([]),
    } as any

    queueService = createMockQueueService(mockDependencies)
    queueService.registerQueue('ai-processing', mockQueue)
  })

  describe('Job Addition Performance', () => {
    it('should add jobs efficiently (target: <100ms per job)', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      const { time } = await measureTime(() =>
        queueService.addJob('ai-generate', jobData)
      )

      expect(time).toBeLessThan(100) // Should complete in under 100ms
      console.log(`Job addition time: ${time.toFixed(2)}ms`)
    })

    it('should handle batch job additions efficiently', async () => {
      const jobCount = 10
      const jobs: JobData[] = Array.from({ length: jobCount }, () => ({
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData))

      const { time } = await measureTime(async () => {
        await Promise.all(
          jobs.map(job => queueService.addJob('ai-generate', job))
        )
      })

      const avgTime = time / jobCount
      expect(avgTime).toBeLessThan(100) // Average should be under 100ms
      console.log(`Batch job addition (${jobCount} jobs): ${time.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms average`)
    })
  })

  describe('Cache Performance', () => {
    it('should benefit from cache hits (cache should be faster than DB)', async () => {
      const projectId = uuidv4()
      const cachedName = 'Cached Project'

      // First call - cache miss
      ;(mockDependencies.cache!.get as jest.Mock).mockResolvedValueOnce(null)
      const { time: missTime } = await measureTime(async () => {
        const jobData: JobData = {
          jobId: uuidv4(),
          userId: uuidv4(),
          projectId,
          templateId: uuidv4(),
        } as JobData
        await queueService.addJob('ai-generate', jobData)
      })

      // Second call - cache hit
      ;(mockDependencies.cache!.get as jest.Mock).mockResolvedValueOnce(cachedName)
      const { time: hitTime } = await measureTime(async () => {
        const jobData: JobData = {
          jobId: uuidv4(),
          userId: uuidv4(),
          projectId,
          templateId: uuidv4(),
        } as JobData
        await queueService.addJob('ai-generate', jobData)
      })

      // Cache hit should be faster (or at least not significantly slower)
      console.log(`Cache miss time: ${missTime.toFixed(2)}ms`)
      console.log(`Cache hit time: ${hitTime.toFixed(2)}ms`)
      expect(hitTime).toBeLessThan(missTime * 1.5) // Allow some variance
    })
  })

  describe('Database Query Performance', () => {
    it('should optimize name resolution queries', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
        documentId: uuidv4(),
      } as JobData

      const { time } = await measureTime(() =>
        queueService.addJob('ai-generate', jobData)
      )

      // Should use single query for name resolution
      const nameQueries = (mockDependencies.database!.query as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0]?.includes('SELECT') && call[0]?.includes('name')
      )

      // Should use optimized single query instead of multiple queries
      expect(nameQueries.length).toBeLessThanOrEqual(2) // Stuck check + name resolution
      console.log(`Name resolution query time: ${time.toFixed(2)}ms`)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent job additions', async () => {
      const concurrentJobs = 20
      const jobs: JobData[] = Array.from({ length: concurrentJobs }, () => ({
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData))

      const { time } = await measureTime(async () => {
        await Promise.all(
          jobs.map(job => queueService.addJob('ai-generate', job))
        )
      })

      const avgTime = time / concurrentJobs
      expect(avgTime).toBeLessThan(150) // Should handle concurrency well
      console.log(`Concurrent job addition (${concurrentJobs} jobs): ${time.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms average`)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory with repeated operations', async () => {
      const iterations = 100
      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < iterations; i++) {
        const jobData: JobData = {
          jobId: uuidv4(),
          userId: uuidv4(),
          projectId: uuidv4(),
          templateId: uuidv4(),
        } as JobData
        await queueService.addJob('ai-generate', jobData)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB

      // Memory increase should be reasonable (< 50MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(50)
      console.log(`Memory increase after ${iterations} operations: ${memoryIncrease.toFixed(2)}MB`)
    })
  })
})
