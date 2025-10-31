/**
 * Worker Assignment Integration Tests
 * Tests the full flow of worker registration and job processing
 */

import { pool, connectDatabase } from '../src/database/connection'
import { addJob, updateJobStatus } from '../src/services/queueService'
import { v4 as uuidv4 } from 'uuid'

describe('Worker Assignment Integration', () => {
  beforeAll(async () => {
    // Connect to database
    try {
      await connectDatabase()
    } catch (error) {
      console.warn('⚠️  Could not connect to database, tests will be skipped')
    }
  })

  afterAll(async () => {
    // Clean up test data
    if (pool) {
      await pool.end()
    }
  })

  describe('Worker Registration', () => {
    it('should assign worker ID when job starts processing', async () => {
      if (!pool) {
        console.log('⏭️  Skipping test - no database connection')
        return
      }

      const jobId = uuidv4()
      const testWorkerId = `worker-test-${process.pid}-${Date.now()}`
      const queueName = 'test-queue'

      try {
        // Create a test job
        await pool.query(
          `INSERT INTO jobs (id, type, status, data, queue_name, queued_at)
           VALUES ($1, 'test-job', 'pending', '{}', $2, CURRENT_TIMESTAMP)`,
          [jobId, queueName]
        )

        // Simulate worker picking up the job
        await updateJobStatus(jobId, 'processing', 10, testWorkerId, queueName)

        // Verify worker info was saved
        const result = await pool.query(
          `SELECT worker_id, worker_process_id, queue_name, processing_started_at
           FROM jobs WHERE id = $1`,
          [jobId]
        )

        expect(result.rows.length).toBe(1)
        const job = result.rows[0]
        
        expect(job.worker_id).toBe(testWorkerId)
        expect(job.worker_process_id).toBe(process.pid)
        expect(job.queue_name).toBe(queueName)
        expect(job.processing_started_at).not.toBeNull()

        // Cleanup
        await pool.query('DELETE FROM jobs WHERE id = $1', [jobId])
      } catch (error) {
        console.error('Test failed:', error)
        throw error
      }
    })

    it('should track multiple jobs for same worker', async () => {
      if (!pool) {
        console.log('⏭️  Skipping test - no database connection')
        return
      }

      const jobId1 = uuidv4()
      const jobId2 = uuidv4()
      const testWorkerId = `worker-test-multi-${process.pid}-${Date.now()}`
      const queueName = 'test-queue'

      try {
        // Create two test jobs
        await pool.query(
          `INSERT INTO jobs (id, type, status, data, queue_name, queued_at)
           VALUES ($1, 'test-job', 'pending', '{}', $2, CURRENT_TIMESTAMP),
                  ($3, 'test-job', 'pending', '{}', $2, CURRENT_TIMESTAMP)`,
          [jobId1, queueName, jobId2]
        )

        // Assign both to same worker
        await updateJobStatus(jobId1, 'processing', 10, testWorkerId, queueName)
        await updateJobStatus(jobId2, 'processing', 10, testWorkerId, queueName)

        // Verify both jobs have same worker
        const result = await pool.query(
          `SELECT id, worker_id FROM jobs WHERE id IN ($1, $2)`,
          [jobId1, jobId2]
        )

        expect(result.rows.length).toBe(2)
        expect(result.rows[0].worker_id).toBe(testWorkerId)
        expect(result.rows[1].worker_id).toBe(testWorkerId)

        // Cleanup
        await pool.query('DELETE FROM jobs WHERE id IN ($1, $2)', [jobId1, jobId2])
      } catch (error) {
        console.error('Test failed:', error)
        throw error
      }
    })
  })

  describe('Queue Statistics', () => {
    it('should correctly count active workers per queue', async () => {
      if (!pool) {
        console.log('⏭️  Skipping test - no database connection')
        return
      }

      const queueName = 'test-queue-count'
      const worker1Id = `worker-test-1-${Date.now()}`
      const worker2Id = `worker-test-2-${Date.now()}`
      const jobId1 = uuidv4()
      const jobId2 = uuidv4()

      try {
        // Create two jobs with different workers
        await pool.query(
          `INSERT INTO jobs (id, type, status, data, queue_name, worker_id, queued_at)
           VALUES ($1, 'test-job', 'processing', '{}', $2, $3, CURRENT_TIMESTAMP),
                  ($4, 'test-job', 'processing', '{}', $2, $5, CURRENT_TIMESTAMP)`,
          [jobId1, queueName, worker1Id, jobId2, worker2Id]
        )

        // Query worker count for this queue
        const result = await pool.query(
          `SELECT COUNT(DISTINCT worker_id) as worker_count
           FROM jobs
           WHERE queue_name = $1 AND status = 'processing' AND worker_id IS NOT NULL`,
          [queueName]
        )

        expect(result.rows[0].worker_count).toBe('2')

        // Cleanup
        await pool.query('DELETE FROM jobs WHERE id IN ($1, $2)', [jobId1, jobId2])
      } catch (error) {
        console.error('Test failed:', error)
        throw error
      }
    })

    it('should calculate average processing time correctly', async () => {
      if (!pool) {
        console.log('⏭️  Skipping test - no database connection')
        return
      }

      const queueName = 'test-queue-timing'
      const jobId = uuidv4()
      const workerId = `worker-test-timing-${Date.now()}`

      try {
        // Create a completed job with known processing time
        const startTime = new Date(Date.now() - 60000) // 1 minute ago
        const endTime = new Date() // now

        await pool.query(
          `INSERT INTO jobs (id, type, status, data, queue_name, worker_id, processing_started_at, completed_at, queued_at)
           VALUES ($1, 'test-job', 'completed', '{}', $2, $3, $4, $5, $4)`,
          [jobId, queueName, workerId, startTime, endTime]
        )

        // Query average processing time
        const result = await pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) as avg_seconds
           FROM jobs
           WHERE queue_name = $1 AND status = 'completed' AND processing_started_at IS NOT NULL`,
          [queueName]
        )

        const avgSeconds = Number(result.rows[0].avg_seconds)
        expect(avgSeconds).toBeGreaterThan(55) // Should be around 60 seconds
        expect(avgSeconds).toBeLessThan(65)

        // Cleanup
        await pool.query('DELETE FROM jobs WHERE id = $1', [jobId])
      } catch (error) {
        console.error('Test failed:', error)
        throw error
      }
    })
  })

  describe('Project Context Enrichment', () => {
    it('should include project name in job response', async () => {
      if (!pool) {
        console.log('⏭️  Skipping test - no database connection')
        return
      }

      // This test assumes there's at least one job with project context
      const result = await pool.query(
        `SELECT 
          j.id,
          j.project_name,
          p.name as project_name_from_join
         FROM jobs j
         LEFT JOIN projects p ON j.project_id = p.id
         WHERE j.project_id IS NOT NULL
         LIMIT 1`
      )

      if (result.rows.length > 0) {
        const job = result.rows[0]
        
        // Either project_name column or joined project name should exist
        expect(
          job.project_name !== null || job.project_name_from_join !== null
        ).toBe(true)
      } else {
        console.log('⏭️  No jobs with projects found, skipping validation')
      }
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data integrity when worker is assigned', async () => {
      if (!pool) {
        console.log('⏭️  Skipping test - no database connection')
        return
      }

      const jobId = uuidv4()
      const workerId = `worker-integrity-test-${Date.now()}`
      const queueName = 'integrity-test-queue'

      try {
        // Create job
        await pool.query(
          `INSERT INTO jobs (id, type, status, data, queue_name, queued_at)
           VALUES ($1, 'test-job', 'pending', $2, $3, CURRENT_TIMESTAMP)`,
          [jobId, JSON.stringify({ test: 'data' }), queueName]
        )

        // Assign worker
        await updateJobStatus(jobId, 'processing', 10, workerId, queueName)

        // Verify all related fields are updated atomically
        const result = await pool.query(
          `SELECT status, progress, worker_id, processing_started_at
           FROM jobs WHERE id = $1`,
          [jobId]
        )

        expect(result.rows.length).toBe(1)
        const job = result.rows[0]
        
        expect(job.status).toBe('processing')
        expect(job.progress).toBe(10)
        expect(job.worker_id).toBe(workerId)
        expect(job.processing_started_at).not.toBeNull()

        // Cleanup
        await pool.query('DELETE FROM jobs WHERE id = $1', [jobId])
      } catch (error) {
        console.error('Test failed:', error)
        throw error
      }
    })
  })
})

// Helper: Format duration for display
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}

