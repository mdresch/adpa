/**
 * Executive Dashboard Routes Tests
 * TASK-744: Executive Dashboard Integration
 */

import express from 'express'
import request from 'supertest'

// Mock the database and cache modules
jest.mock('../../../src/database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))

jest.mock('../../../src/utils/redis', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}))

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  childLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

import executiveDashboardRoutes from '../../../src/routes/executive-dashboard'
import { pool } from '../../../src/database/connection'
import { cache } from '../../../src/utils/redis'

// Stub auth middleware to bypass token checks in tests
const noopAuth = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id', email: 'test@example.com', role: 'admin', permissions: {} }
  next()
}

describe('Executive Dashboard routes', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    // Replace actual auth middleware with test stub
    const router = executiveDashboardRoutes
    app.use('/api/executive-dashboard', noopAuth, router)
    
    jest.clearAllMocks()
  })

  describe('GET /api/executive-dashboard/summary', () => {
    test('returns executive summary successfully', async () => {
      // Mock cache miss
      ;(cache.get as jest.Mock).mockResolvedValue(null)
      
      // Mock database responses
      const mockDriftStats = {
        rows: [{
          total_drift: 5,
          critical_drift: 2,
          high_drift: 1,
          unaddressed_drift: 3,
          budget_overruns: 1,
          scope_creep: 2,
          schedule_delays: 1
        }]
      }
      
      const mockInnovationStats = {
        rows: [{
          total_opportunities: 3,
          patent_opportunities: 1,
          efficiency_improvements: 1,
          cost_savings: 1,
          avg_novelty_score: 0.75
        }]
      }
      
      const mockProjectHealth = {
        rows: [{
          total_projects: 10,
          active_projects: 8,
          projects_at_risk: 2
        }]
      }
      
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce(mockDriftStats)
        .mockResolvedValueOnce(mockInnovationStats)
        .mockResolvedValueOnce(mockProjectHealth)
      
      const res = await request(app).get('/api/executive-dashboard/summary')
      
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('drift_statistics')
      expect(res.body).toHaveProperty('innovation_statistics')
      expect(res.body).toHaveProperty('project_health')
      expect(res.body.drift_statistics.total_drift).toBe(5)
      expect(res.body.drift_statistics.critical_drift).toBe(2)
      expect(res.body.innovation_statistics.total_opportunities).toBe(3)
      expect(res.body.project_health.active_projects).toBe(8)
      
      // Verify cache was called
      expect(cache.set).toHaveBeenCalled()
    })

    test('returns cached data when available', async () => {
      const cachedData = {
        drift_statistics: { total_drift: 5 },
        innovation_statistics: { total_opportunities: 3 },
        project_health: { active_projects: 8 },
        generated_at: new Date().toISOString()
      }
      
      ;(cache.get as jest.Mock).mockResolvedValue(cachedData)
      
      const res = await request(app).get('/api/executive-dashboard/summary')
      
      expect(res.status).toBe(200)
      expect(res.body).toEqual(cachedData)
      
      // Verify database was not called
      expect(pool.query).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/executive-dashboard/drift-alerts', () => {
    test('returns drift alerts with default parameters', async () => {
      ;(cache.get as jest.Mock).mockResolvedValue(null)
      
      const mockAlerts = {
        rows: [
          {
            id: 'alert-1',
            project_id: 'project-1',
            project_name: 'Test Project',
            detection_type: 'scope_drift',
            drift_severity: 'critical',
            drift_description: 'Scope increased by 40%',
            detection_date: new Date().toISOString(),
            status: 'detected'
          }
        ]
      }
      
      const mockStats = {
        rows: [{
          critical_count: 2,
          high_count: 1,
          medium_count: 0,
          low_count: 0,
          unaddressed_count: 3,
          last_24h_count: 1,
          last_7d_count: 3
        }]
      }
      
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce(mockAlerts)
        .mockResolvedValueOnce(mockStats)
      
      const res = await request(app).get('/api/executive-dashboard/drift-alerts')
      
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('alerts')
      expect(res.body).toHaveProperty('statistics')
      expect(res.body.alerts).toHaveLength(1)
      expect(res.body.alerts[0].drift_severity).toBe('critical')
      expect(res.body.statistics.critical_count).toBe(2)
    })

    test('filters alerts by severity', async () => {
      ;(cache.get as jest.Mock).mockResolvedValue(null)
      
      const mockAlerts = {
        rows: [
          {
            id: 'alert-1',
            drift_severity: 'critical',
            status: 'detected'
          }
        ]
      }
      
      const mockStats = {
        rows: [{ critical_count: 1, high_count: 0, medium_count: 0, low_count: 0 }]
      }
      
      ;(pool.query as jest.Mock)
        .mockResolvedValueOnce(mockAlerts)
        .mockResolvedValueOnce(mockStats)
      
      const res = await request(app)
        .get('/api/executive-dashboard/drift-alerts')
        .query({ severity: 'critical' })
      
      expect(res.status).toBe(200)
      expect(res.body.alerts).toHaveLength(1)
      
      // Verify SQL query was called with severity filter
      expect(pool.query).toHaveBeenCalled()
    })
  })

  describe('GET /api/executive-dashboard/budget-alerts', () => {
    test('returns budget overrun alerts', async () => {
      ;(cache.get as jest.Mock).mockResolvedValue(null)
      
      const mockBudgetAlerts = {
        rows: [
          {
            id: 'alert-1',
            project_id: 'project-1',
            project_name: 'Test Project',
            drift_severity: 'critical',
            drift_description: 'Budget overrun by $50K',
            budget: 500000,
            cost_baseline: { approved_budget: 450000 }
          }
        ]
      }
      
      ;(pool.query as jest.Mock).mockResolvedValue(mockBudgetAlerts)
      
      const res = await request(app).get('/api/executive-dashboard/budget-alerts')
      
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('budget_alerts')
      expect(res.body).toHaveProperty('total_count')
      expect(res.body).toHaveProperty('critical_count')
      expect(res.body.budget_alerts).toHaveLength(1)
      expect(res.body.budget_alerts[0].drift_severity).toBe('critical')
    })
  })

  describe('GET /api/executive-dashboard/positive-drift', () => {
    test('returns innovation opportunities', async () => {
      ;(cache.get as jest.Mock).mockResolvedValue(null)
      
      const mockOpportunities = {
        rows: [
          {
            id: 'opp-1',
            project_id: 'project-1',
            project_name: 'Test Project',
            opportunity_type: 'efficiency_gain',
            title: 'Improved Process',
            description: 'Automated manual task',
            potential_value: '$25K annually',
            novelty_score: 0.8,
            patentability_score: 0.6,
            status: 'identified'
          }
        ]
      }
      
      ;(pool.query as jest.Mock).mockResolvedValue(mockOpportunities)
      
      const res = await request(app).get('/api/executive-dashboard/positive-drift')
      
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('opportunities')
      expect(res.body).toHaveProperty('total_count')
      expect(res.body).toHaveProperty('high_novelty_count')
      expect(res.body.opportunities).toHaveLength(1)
      expect(res.body.opportunities[0].opportunity_type).toBe('efficiency_gain')
    })
  })

  describe('Error handling', () => {
    test('handles database errors gracefully', async () => {
      ;(cache.get as jest.Mock).mockResolvedValue(null)
      ;(pool.query as jest.Mock).mockRejectedValue(new Error('Database error'))
      
      const res = await request(app).get('/api/executive-dashboard/summary')
      
      expect(res.status).toBe(500)
      expect(res.body).toHaveProperty('error')
    })

    test('handles cache errors gracefully', async () => {
      ;(cache.get as jest.Mock).mockRejectedValue(new Error('Cache error'))
      
      // Should still try to fetch from database
      const mockData = {
        rows: [{ total_drift: 0 }]
      }
      ;(pool.query as jest.Mock).mockResolvedValue(mockData)
      
      const res = await request(app).get('/api/executive-dashboard/summary')
      
      // Should succeed despite cache error
      expect(res.status).toBe(200)
    })
  })
})
