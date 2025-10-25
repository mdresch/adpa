import express from 'express'
import request from 'supertest'
import { createProgramRouter } from '../../../src/routes/programRoutes'
import * as programService from '../../../src/services/programService'

// Stub auth middleware to bypass token checks in tests
const noopAuth = (req: any, res: any, next: any) => { req.user = { id: 'test-user' }; next() }
const allowAll = (_perm: string) => (req: any, res: any, next: any) => next()

describe('Program routes', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/programs', createProgramRouter({ authenticate: noopAuth, requirePermission: allowAll }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('POST /api/programs creates a program', async () => {
    const payload = {
      name: 'Test Program',
      description: 'A sample program',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      owner_id: '11111111-1111-1111-1111-111111111111'
    }

    const created = { id: '22222222-2222-2222-2222-222222222222', ...payload, currency: 'USD', status: 'green' }

    jest.spyOn(programService, 'createProgram').mockResolvedValue(created as any)

    const res = await request(app).post('/api/programs').send(payload)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({ id: created.id, name: 'Test Program' })
  })

  test('GET /api/programs/:id returns a program', async () => {
    const program = { id: '22222222-2222-2222-2222-222222222222', name: 'Test Program' }
    jest.spyOn(programService, 'getProgramById').mockResolvedValue(program as any)

    const res = await request(app).get(`/api/programs/${program.id}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({ id: program.id, name: program.name })
  })
})
