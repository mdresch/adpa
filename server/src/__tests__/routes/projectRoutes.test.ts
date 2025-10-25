import express from 'express'
import request from 'supertest'

// Mock projectService and programService
jest.mock('../../../src/services/projectService', () => ({
  findByProgram: jest.fn(),
  update: jest.fn(),
}))

jest.mock('../../../src/services/programService', () => ({
  getProgramById: jest.fn(),
}))

import projectService from '../../../src/services/projectService'
import programService from '../../../src/services/programService'
import projectsRouter from '../../../src/routes/projects'

const noopAuth = (req: any, res: any, next: any) => { req.user = { id: 'user-1', role: 'user' }; next() }
const adminAuth = (req: any, res: any, next: any) => { req.user = { id: 'admin-1', role: 'admin' }; next() }
const allowPerm = (_: any) => (_req: any, _res: any, next: any) => next()

describe('Project routes - program linking', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    // mount router with noop auth and allow perms
    app.use('/api/projects', projectsRouter)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('GET /api/programs/:programId/projects lists projects (via programRoutes)', async () => {
    // We'll call programRoutes via projectService directly (projectService mocked)
    (projectService.findByProgram as jest.Mock).mockResolvedValue([{ id: 'p1', name: 'P1' }])

    // Mount a minimal program router to forward call to projectService
    const app2 = express()
    app2.use(express.json())
    // lazy-require to avoid circular issues
    const programRoutes = require('../../../src/routes/programRoutes').default
    app2.use('/api/programs', programRoutes)

    const res = await request(app2).get('/api/programs/abc-123/projects').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  test('PUT /api/projects/:id assigns project to program (authorized)', async () => {
    // program exists and owner check passed via admin/user mocking in service
    (programService.getProgramById as jest.Mock).mockResolvedValue({ id: 'prog-1', owner_id: 'user-1' })
    (projectService.update as jest.Mock).mockResolvedValue({ id: 'proj-1', program_id: 'prog-1' })

    const app2 = express()
    app2.use(express.json())
    // mount projects router but inject noop auth middleware globally
    app2.use((req, res, next) => { req.user = { id: 'user-1', role: 'user' }; next() })
    app2.use('/api/projects', projectsRouter)

    const res = await request(app2).put('/api/projects/proj-1').send({ program_id: 'prog-1' })
    expect(res.status).toBe(200)
    expect(res.body.project).toMatchObject({ id: 'proj-1', program_id: 'prog-1' })
  })

  test('PUT /api/projects/:id rejects invalid program_id', async () => {
    (programService.getProgramById as jest.Mock).mockResolvedValue(null)
    (projectService.update as jest.Mock).mockImplementation(() => { throw Object.assign(new Error('Program not found'), { code: 'PROGRAM_NOT_FOUND' }) })

    const app2 = express()
    app2.use(express.json())
    app2.use((req, res, next) => { req.user = { id: 'user-1', role: 'admin' }; next() })
    app2.use('/api/projects', projectsRouter)

    const res = await request(app2).put('/api/projects/proj-1').send({ program_id: 'invalid-prog' })
    expect(res.status).toBe(404)
  })

  test('PUT /api/projects/:id unassigns program when program_id is null', async () => {
    (programService.getProgramById as jest.Mock).mockResolvedValue(null)
    (projectService.update as jest.Mock).mockResolvedValue({ id: 'proj-1', program_id: null })

    const app2 = express()
    app2.use(express.json())
    app2.use((req, res, next) => { req.user = { id: 'admin-1', role: 'admin' }; next() })
    app2.use('/api/projects', projectsRouter)

    const res = await request(app2).put('/api/projects/proj-1').send({ program_id: null })
    expect(res.status).toBe(200)
    expect(res.body.project.program_id).toBeNull()
  })

  test('PUT /api/projects/:id prevents assignment when user not authorized', async () => {
    (programService.getProgramById as jest.Mock).mockResolvedValue({ id: 'prog-1', owner_id: 'other-user' })
    (projectService.update as jest.Mock).mockImplementation(() => { throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' }) })

    const app2 = express()
    app2.use(express.json())
    app2.use((req, res, next) => { req.user = { id: 'user-1', role: 'user' }; next() })
    app2.use('/api/projects', projectsRouter)

    const res = await request(app2).put('/api/projects/proj-1').send({ program_id: 'prog-1' })
    expect(res.status).toBe(403)
  })
})
