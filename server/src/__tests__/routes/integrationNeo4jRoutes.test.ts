import express from 'express'
import request from 'supertest'

jest.mock('../../../src/database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))

jest.mock('../../../src/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', permissions: {} }
    next()
  },
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}))

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const sessionRun = jest.fn()
const sessionClose = jest.fn()

jest.mock('../../../src/utils/neo4j', () => ({
  getNeo4jDatabase: jest.fn(() => 'neo4j'),
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: sessionRun,
      close: sessionClose,
    })),
  })),
  isNeo4jConfigured: jest.fn(() => true),
}))

import integrationNeo4jRoutes from '../../../src/routes/integrationNeo4jRoutes'
import { pool } from '../../../src/database/connection'

describe('Neo4j integration routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionRun.mockReset()
    sessionClose.mockReset()
    ;(pool.query as jest.Mock).mockResolvedValue({
      rows: [{ id: 'integration-1', type: 'neo4j' }],
    })
  })

  it('returns graph matches for a dashboard search query', async () => {
    sessionRun.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'id') return { toNumber: () => 101 }
            if (key === 'labels') return ['Project']
            if (key === 'properties') {
              return {
                adpa_id: 'project-1',
                name: 'ADPA Project Charter',
              }
            }
            return undefined
          },
        },
      ],
    })

    const app = express()
    app.use(express.json())
    app.use('/api/integrations', integrationNeo4jRoutes)

    const response = await request(app)
      .post('/api/integrations/integration-1/neo4j/search')
      .send({ query: 'Project ADPA and the project charter?' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      matches: [
        {
          id: 101,
          labels: ['Project'],
          properties: {
            adpa_id: 'project-1',
            name: 'ADPA Project Charter',
          },
        },
      ],
    })
    expect(sessionRun).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (n)'),
      expect.objectContaining({
        query: 'project adpa and the project charter?',
        terms: ['project', 'adpa', 'charter'],
      })
    )
    expect(sessionClose).toHaveBeenCalled()
  })
})
