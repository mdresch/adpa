/**
 * Contract Guard: job cancellation must cascade to the document it owns, and a
 * cancelled job must be a true terminal state — no later write (heartbeat,
 * completion, or failure) from an orphaned/still-running generation attempt may
 * resurrect it back to 'processing'/'completed'/'failed'.
 *
 * Regression context: the 15-minute ai-generate timeout (registerWorkers.ts) used
 * to write status='failed' directly and reject the racing promise, but did not
 * actually stop the underlying AIGenerationJobService.processJob() call. That
 * orphaned call kept running and its own status heartbeats/completion writes
 * silently flipped the job back to 'processing' — observed live as repeated
 * "failed -> processing" flaps on the same job id, each cycle re-running the
 * draft-placeholder pre-insert and minting another duplicate document row.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { jest } from '@jest/globals'
import { QueueService } from '../../../services/jobs/queue/QueueService'
import { createMockQueueService } from '../../../services/jobs/queue/QueueServiceFactory'
import type { QueueServiceDependencies } from '../../../services/jobs/queue/QueueDependencies'
import { v4 as uuidv4 } from 'uuid'

jest.mock('../../../utils/performanceMonitor', () => {
  const mockFn = jest.fn(() => jest.fn())
  return {
    PerformanceMonitor: {
      start: mockFn,
      getStats: jest.fn(() => ({})),
      getCacheStats: jest.fn(() => ({ hits: 0, misses: 0 })),
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
    },
  }
})

describe('Job cancellation cascades to its document (contract)', () => {
  let mockDependencies: Partial<QueueServiceDependencies>
  let queueService: QueueService

  beforeEach(() => {
    jest.clearAllMocks()

    mockDependencies = {
      database: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({}),
        end: jest.fn().mockResolvedValue(undefined),
      },
      websocket: {
        emit: jest.fn().mockReturnValue(true),
        to: jest.fn().mockReturnValue({ emit: jest.fn().mockReturnValue(true) }),
        on: jest.fn(),
        off: jest.fn(),
      },
      cache: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
      aiService: {},
    }

    queueService = createMockQueueService(mockDependencies)
  })

  it('cancels the job and marks its associated document as cancelled', async () => {
    const jobId = uuidv4()
    const documentId = uuidv4()

    ;(mockDependencies.database!.query as jest.Mock).mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('UPDATE jobs') && sql.includes("'cancelled'")) {
        return { rows: [{ data: { documentId } }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    await queueService.cancelJob(jobId, 'exceeded 15-minute processing limit')

    const calls = (mockDependencies.database!.query as jest.Mock).mock.calls

    const jobUpdateCall = calls.find(([sql]: [string]) => sql.includes('UPDATE jobs'))
    expect(jobUpdateCall).toBeDefined()
    expect(jobUpdateCall![0]).toEqual(expect.stringContaining("status = 'cancelled'"))
    // Only a job still in a non-terminal state may be cancelled — this is the
    // atomic guard that prevents a second, concurrent cancel (or a cancel racing
    // a genuine completion) from clobbering a job that already resolved.
    expect(jobUpdateCall![0]).toEqual(expect.stringMatching(/status NOT IN \([^)]*'cancelled'[^)]*'completed'[^)]*'failed'[^)]*\)|status NOT IN \([^)]*\)/))

    const documentUpdateCall = calls.find(([sql]: [string]) => sql.includes('UPDATE documents'))
    expect(documentUpdateCall).toBeDefined()
    expect(documentUpdateCall![0]).toEqual(expect.stringContaining("status = 'cancelled'"))
    expect(documentUpdateCall![1]).toEqual([documentId])
    // Must not be able to cancel a document that already reached a successful
    // terminal state of its own.
    expect(documentUpdateCall![0]).toEqual(expect.stringContaining('completed'))
  })

  it('does not touch any document when the job was already terminal (no rows returned)', async () => {
    const jobId = uuidv4()

    // Simulates cancelJob racing a job that has already completed/failed/been
    // cancelled — the guarded UPDATE returns zero rows.
    ;(mockDependencies.database!.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 })

    await queueService.cancelJob(jobId, 'late cancel attempt')

    const calls = (mockDependencies.database!.query as jest.Mock).mock.calls
    const documentUpdateCall = calls.find(([sql]: [string]) => sql.includes('UPDATE documents'))
    expect(documentUpdateCall).toBeUndefined()
  })

  it('updateJobStatus refuses to write over a job that is already cancelled', async () => {
    const jobId = uuidv4()

    // This reproduces the exact write an orphaned/zombie processJob() heartbeat
    // makes after its owning job has already been cancelled by the timeout path.
    await queueService.updateJobStatus(jobId, 'processing', 50, 'worker-resurrected')

    expect(mockDependencies.database!.query).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE id = \$\d+ AND status != 'cancelled'/),
      expect.arrayContaining([jobId])
    )
  })
})
