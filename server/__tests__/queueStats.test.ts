/**
 * Queue Statistics API Tests
 * Tests for the Job Monitor Enhancement feature
 */

import request from 'supertest'
import { pool } from '../src/database/connection'

// Mock app - would need to import actual app in real implementation
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000'

describe('Queue Statistics API', () => {
  let authToken: string
  let testUserId: string

  beforeAll(async () => {
    // Login to get auth token
    try {
      const loginRes = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({ 
          email: process.env.TEST_USER_EMAIL || 'admin@adpa.com', 
          password: process.env.TEST_USER_PASSWORD || 'admin123' 
        })

      if (loginRes.status === 200 && loginRes.body.token) {
        authToken = loginRes.body.token
        testUserId = loginRes.body.user.id
      } else {
        console.warn('⚠️  Login failed, some tests may be skipped')
      }
    } catch (error) {
      console.warn('⚠️  Could not connect to test server:', error)
    }
  })

  describe('GET /api/queue-stats/overview', () => {
    it('should return queue statistics for authenticated users', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/overview')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('queues')
      expect(Array.isArray(res.body.queues)).toBe(true)
      
      // Check structure of first queue if any exist
      if (res.body.queues.length > 0) {
        const queue = res.body.queues[0]
        expect(queue).toHaveProperty('name')
        expect(queue).toHaveProperty('active')
        expect(queue).toHaveProperty('waiting')
        expect(queue).toHaveProperty('completed')
        expect(queue).toHaveProperty('failed')
        expect(queue).toHaveProperty('workers')
        expect(queue).toHaveProperty('avgProcessingTime')
        expect(queue).toHaveProperty('health')
        
        // Validate data types
        expect(typeof queue.name).toBe('string')
        expect(typeof queue.active).toBe('number')
        expect(typeof queue.waiting).toBe('number')
        expect(typeof queue.workers).toBe('number')
        expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(queue.health)
      }
    })

    it('should require authentication', async () => {
      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/overview')

      expect(res.status).toBe(401)
    })

    it('should return all expected queues', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/overview')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      
      const queueNames = res.body.queues.map((q: any) => q.name)
      
      // Should include core queues
      expect(queueNames).toContain('ai-processing')
      expect(queueNames).toContain('document-processing')
      expect(queueNames).toContain('process-flow-processing')
    })
  })

  describe('GET /api/queue-stats/workers', () => {
    it('should return worker information for authenticated users', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/workers')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('workers')
      expect(Array.isArray(res.body.workers)).toBe(true)
      
      // If workers exist, validate structure
      if (res.body.workers.length > 0) {
        const worker = res.body.workers[0]
        expect(worker).toHaveProperty('id')
        expect(worker).toHaveProperty('status')
        expect(worker).toHaveProperty('queue')
        expect(worker).toHaveProperty('jobsCompleted')
        expect(worker).toHaveProperty('successRate')
        expect(worker).toHaveProperty('health')
        
        // Validate data types
        expect(typeof worker.id).toBe('string')
        expect(['active', 'idle']).toContain(worker.status)
        expect(typeof worker.jobsCompleted).toBe('number')
        expect(typeof worker.successRate).toBe('number')
        expect(worker.successRate).toBeGreaterThanOrEqual(0)
        expect(worker.successRate).toBeLessThanOrEqual(100)
      }
    })

    it('should require authentication', async () => {
      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/workers')

      expect(res.status).toBe(401)
    })

    it('should include worker process IDs', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/workers')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      
      // If active workers exist, they should have process IDs
      const activeWorkers = res.body.workers.filter((w: any) => w.status === 'active')
      activeWorkers.forEach((worker: any) => {
        if (worker.processId) {
          expect(typeof worker.processId).toBe('number')
          expect(worker.processId).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('GET /api/queue-stats/metrics', () => {
    it('should return aggregate metrics for authenticated users', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/metrics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('totalJobs')
      expect(res.body).toHaveProperty('totalActive')
      expect(res.body).toHaveProperty('totalCompleted')
      expect(res.body).toHaveProperty('totalFailed')
      expect(res.body).toHaveProperty('activeWorkers')
      expect(res.body).toHaveProperty('successRate')
      expect(res.body).toHaveProperty('queueHealth')
      
      // Validate data types
      expect(typeof res.body.totalJobs).toBe('number')
      expect(typeof res.body.activeWorkers).toBe('number')
      expect(typeof res.body.successRate).toBe('number')
      expect(typeof res.body.queueHealth).toBe('string')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.queueHealth)
    })

    it('should require authentication', async () => {
      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/metrics')

      expect(res.status).toBe(401)
    })

    it('should have valid success rate calculation', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/metrics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body.successRate).toBeGreaterThanOrEqual(0)
      expect(res.body.successRate).toBeLessThanOrEqual(100)
    })
  })

  describe('GET /api/queue-stats/health', () => {
    it('should return health status for authenticated users', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/health')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('status')
      expect(res.body).toHaveProperty('failedJobs')
      expect(res.body).toHaveProperty('stalledJobs')
      expect(res.body).toHaveProperty('timestamp')
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status)
      expect(typeof res.body.failedJobs).toBe('number')
      expect(typeof res.body.stalledJobs).toBe('number')
    })
  })

  describe('Performance Tests', () => {
    it('should respond to /overview within 500ms', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const startTime = Date.now()
      
      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/overview')
        .set('Authorization', `Bearer ${authToken}`)

      const duration = Date.now() - startTime
      
      expect(res.status).toBe(200)
      expect(duration).toBeLessThan(500)
    })

    it('should respond to /workers within 300ms', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const startTime = Date.now()
      
      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/workers')
        .set('Authorization', `Bearer ${authToken}`)

      const duration = Date.now() - startTime
      
      expect(res.status).toBe(200)
      expect(duration).toBeLessThan(300)
    })

    it('should respond to /metrics within 200ms', async () => {
      if (!authToken) {
        console.log('⏭️  Skipping test - no auth token')
        return
      }

      const startTime = Date.now()
      
      const res = await request(API_BASE_URL)
        .get('/api/queue-stats/metrics')
        .set('Authorization', `Bearer ${authToken}`)

      const duration = Date.now() - startTime
      
      expect(res.status).toBe(200)
      expect(duration).toBeLessThan(200)
    })
  })
})

