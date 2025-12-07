/**
 * Unit Tests for BullQueueAdapter
 * Phase 5.5: Testing and Performance Monitoring
 * 
 * Tests the Bull queue adapter to verify it correctly wraps Bull queue operations.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { BullQueueAdapter } from '../../../../services/jobs/queue/BullQueueAdapter'
import type Bull from 'bull'
import type { JobData } from '../../../../services/jobs/types'

describe('BullQueueAdapter', () => {
  let mockBullQueue: Bull.Queue
  let mockBullJob: Bull.Job
  let adapter: BullQueueAdapter

  beforeEach(() => {
    // Create mock Bull job
    mockBullJob = {
      id: 'test-job-id',
      data: { jobId: 'test-job-id' } as JobData,
      progress: jest.fn().mockResolvedValue(undefined),
      log: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      retry: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn().mockResolvedValue('waiting'),
      finished: jest.fn().mockResolvedValue({}),
      failed: jest.fn().mockResolvedValue(null),
      toJSON: jest.fn().mockReturnValue({ id: 'test-job-id', data: {} }),
      moveToFailed: jest.fn().mockResolvedValue(undefined),
    } as any

    // Create mock Bull queue
    mockBullQueue = {
      add: jest.fn().mockResolvedValue(mockBullJob),
      process: jest.fn(),
      getJob: jest.fn().mockResolvedValue(mockBullJob),
      remove: jest.fn().mockResolvedValue(undefined),
      getJobs: jest.fn().mockResolvedValue([mockBullJob]),
      clean: jest.fn().mockResolvedValue([]),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      }),
      empty: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any

    adapter = new BullQueueAdapter(mockBullQueue)
  })

  describe('add', () => {
    it('should add a job to the queue', async () => {
      const jobData: JobData = {
        jobId: 'test-job-id',
        userId: 'user-123',
      } as JobData

      // Mock the job to return the data we pass in
      const mockJobWithData = {
        ...mockBullJob,
        data: jobData,
      }
      ;(mockBullQueue.add as jest.Mock).mockResolvedValueOnce(mockJobWithData)

      const result = await adapter.add('test-type', jobData)

      expect(mockBullQueue.add).toHaveBeenCalledWith('test-type', jobData, {})
      expect(result.id).toBe('test-job-id')
      expect(result.data).toEqual(jobData)
    })

    it('should convert IQueueOptions to Bull.JobOptions', async () => {
      const jobData: JobData = {
        jobId: 'test-job',
      } as JobData

      const options = {
        jobId: 'custom-job-id',
        priority: 10,
        delay: 5000,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        timeout: 30000,
      }

      await adapter.add('test-type', jobData, options)

      expect(mockBullQueue.add).toHaveBeenCalledWith(
        'test-type',
        jobData,
        expect.objectContaining({
          jobId: 'custom-job-id',
          priority: 10,
          delay: 5000,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          timeout: 30000,
        })
      )
    })
  })

  describe('process', () => {
    it('should register a processor', () => {
      const processor = jest.fn()
      adapter.process('test-type', 2, processor)

      expect(mockBullQueue.process).toHaveBeenCalledWith('test-type', 2, expect.any(Function))
    })
  })

  describe('getJob', () => {
    it('should get a job by ID', async () => {
      const job = await adapter.getJob('test-job-id')

      expect(mockBullQueue.getJob).toHaveBeenCalledWith('test-job-id')
      expect(job).toBeDefined()
      expect(job?.id).toBe('test-job-id')
    })

    it('should return null when job not found', async () => {
      ;(mockBullQueue.getJob as jest.Mock).mockResolvedValueOnce(null)

      const job = await adapter.getJob('non-existent')

      expect(job).toBeNull()
    })
  })

  describe('remove', () => {
    it('should remove a job from the queue', async () => {
      await adapter.remove('test-job-id')

      expect(mockBullQueue.getJob).toHaveBeenCalledWith('test-job-id')
      expect(mockBullJob.remove).toHaveBeenCalled()
    })
  })

  describe('getJobs', () => {
    it('should get jobs by state', async () => {
      const jobs = await adapter.getJobs(['waiting', 'active'])

      expect(mockBullQueue.getJobs).toHaveBeenCalledWith(['waiting', 'active'], 0, -1)
      expect(jobs).toHaveLength(1)
    })

    it('should get jobs with start and end range', async () => {
      await adapter.getJobs(['waiting'], 0, 10)

      expect(mockBullQueue.getJobs).toHaveBeenCalledWith(['waiting'], 0, 10)
    })
  })

  describe('clean', () => {
    it('should clean jobs', async () => {
      await adapter.clean(1000, 100, 'completed')

      expect(mockBullQueue.clean).toHaveBeenCalledWith(1000, 100, 'completed')
    })
  })

  describe('getBullQueue', () => {
    it('should return the underlying Bull queue', () => {
      const bullQueue = adapter.getBullQueue()
      expect(bullQueue).toBe(mockBullQueue)
    })
  })
})
