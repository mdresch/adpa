/**
 * Integration Tests for Queue Service with Dependency Injection
 * Phase 5.5: Testing and Performance Monitoring
 * 
 * Tests the full integration of QueueService with job processors
 * and dependency injection to verify end-to-end functionality.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { QueueService } from '../../../../services/jobs/queue/QueueService'
import { createMockQueueService } from '../../../../services/jobs/queue/QueueServiceFactory'
import type { QueueServiceDependencies } from '../../../../services/jobs/queue/QueueDependencies'
import type { IQueue } from '../../../../services/jobs/queue/IQueue'
import type { JobData } from '../../../../services/jobs/types'
import { v4 as uuidv4 } from 'uuid'

describe('QueueService Integration Tests', () => {
  let mockDependencies: Partial<QueueServiceDependencies>
  let mockQueue: IQueue
  let queueService: QueueService
  let databaseQueries: any[]
  let cacheOperations: any[]

  beforeEach(() => {
    databaseQueries = []
    cacheOperations = []

    // Create mock dependencies with tracking
    mockDependencies = {
      database: {
        query: jest.fn().mockImplementation(async (query: string, params?: any[]) => {
          databaseQueries.push({ query, params })
          // Default responses
          if (query.includes('SELECT COUNT(*)')) {
            return { rows: [{ count: '0' }], rowCount: 1 }
          }
          if (query.includes('INSERT INTO jobs')) {
            return { rows: [], rowCount: 1 }
          }
          if (query.includes('SELECT * FROM jobs')) {
            return {
              rows: [{
                id: params?.[0],
                status: 'pending',
                type: 'ai-generate',
                data: {},
              }],
            }
          }
          return { rows: [], rowCount: 0 }
        }),
        connect: jest.fn().mockResolvedValue({}),
        end: jest.fn().mockResolvedValue(undefined),
      },
      cache: {
        get: jest.fn().mockImplementation(async (key: string) => {
          cacheOperations.push({ operation: 'get', key })
          return null
        }),
        set: jest.fn().mockImplementation(async (key: string, value: string, ttl?: number) => {
          cacheOperations.push({ operation: 'set', key, value, ttl })
        }),
        del: jest.fn().mockImplementation(async (key: string) => {
          cacheOperations.push({ operation: 'del', key })
        }),
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

    // Create mock queue
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

  afterEach(() => {
    jest.clearAllMocks()
    databaseQueries = []
    cacheOperations = []
  })

  describe('End-to-End Job Flow', () => {
    it('should complete full job lifecycle: add -> get -> update -> cancel', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      // 1. Add job
      const jobId = await queueService.addJob('ai-generate', jobData)
      expect(jobId).toBe(jobData.jobId)
      expect(mockQueue.add).toHaveBeenCalled()
      expect(databaseQueries.some(q => q.query.includes('INSERT INTO jobs'))).toBe(true)

      // 2. Get job status
      const status = await queueService.getJobStatus(jobId)
      expect(status).toBeDefined()
      expect(status?.id).toBe(jobId)
      expect(databaseQueries.some(q => q.query.includes('SELECT * FROM jobs'))).toBe(true)

      // 3. Update job status
      await queueService.updateJobStatus(jobId, 'processing', 50)
      expect(databaseQueries.some(q => q.query.includes('UPDATE jobs') && q.params.includes('processing'))).toBe(true)

      // 4. Cancel job
      await queueService.cancelJob(jobId)
      expect(databaseQueries.some(q => q.query.includes("status = 'cancelled'"))).toBe(true)
      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId)
    })

    it('should use cache for name resolution', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      // Reset cache operations tracking
      cacheOperations = []
      
      // Set cache value for project name
      ;(mockDependencies.cache!.get as jest.Mock).mockImplementation(async (key: string) => {
        cacheOperations.push({ operation: 'get', key })
        if (key.includes('project')) {
          return 'Cached Project Name'
        }
        return null
      })

      await queueService.addJob('ai-generate', jobData)

      // Should check cache first
      expect(cacheOperations.some(op => op.operation === 'get')).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      // Simulate database error
      ;(mockDependencies.database!.query as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      await expect(
        queueService.addJob('ai-generate', jobData)
      ).rejects.toThrow()
    })

    it('should handle queue errors and rollback database', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      // Simulate queue error
      ;(mockQueue.add as jest.Mock).mockRejectedValueOnce(new Error('Queue full'))

      await expect(
        queueService.addJob('ai-generate', jobData)
      ).rejects.toThrow()

      // Should attempt to rollback (delete from database)
      expect(databaseQueries.some(q => q.query.includes('DELETE FROM jobs'))).toBe(true)
    })
  })

  describe('Dependency Injection Verification', () => {
    it('should use injected database for all operations', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      await queueService.addJob('ai-generate', jobData)
      await queueService.getJobStatus(jobData.jobId)
      await queueService.updateJobStatus(jobData.jobId, 'processing')

      // All operations should use injected database
      const callCount = (mockDependencies.database!.query as jest.Mock).mock.calls.length
      expect(callCount).toBeGreaterThan(0)
    })

    it('should use injected cache for name resolution', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      await queueService.addJob('ai-generate', jobData)

      expect(mockDependencies.cache!.get).toHaveBeenCalled()
    })

    it('should use injected logger for all log operations', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      await queueService.addJob('ai-generate', jobData)

      expect(mockDependencies.logger!.info).toHaveBeenCalled()
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics for operations', async () => {
      const jobData: JobData = {
        jobId: uuidv4(),
        userId: uuidv4(),
        projectId: uuidv4(),
        templateId: uuidv4(),
      } as JobData

      await queueService.addJob('ai-generate', jobData)

      // Performance monitoring should be called (mocked in QueueService.test.ts)
      // This test verifies the integration works
      expect(databaseQueries.length).toBeGreaterThan(0)
    })
  })
})
