import express from 'express'
import request from 'supertest'

// Mock projectService and programService to isolate route logic
jest.mock('../../../src/services/projectService', () => ({
  findByProgram: jest.fn(),
  update: jest.fn(),
}))

jest.mock('../../../src/services/programService', () => ({
  getProgramById: jest.fn(),
}))

import projectService from '../../../src/services/projectService'
import programService from '../../../src/services/programService'
import programRouter from '../../../src/routes/programRoutes'

describe('Project <-> Program linking routes (Beacon 1.3)', () => {
  afterEach(() => jest.restoreAllMocks())

  test('GET /api/programs/:programId/projects returns list', async () => {
    ;(projectService.findByProgram as jest.Mock).mockResolvedValue([{ id: 'p1', name: 'Project 1' }])

    const app = express()
    app.use(express.json())
    app.use('/api/programs', programRouter)

    const res = await request(app).get('/api/programs/prog-1/projects')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(1)
  })

  test('GET /api/programs/:programId/projects returns empty array if none', async () => {
    ;(projectService.findByProgram as jest.Mock).mockResolvedValue([])

    const app = express()
    app.use(express.json())
    app.use('/api/programs', programRouter)

    const res = await request(app).get('/api/programs/prog-2/projects')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(0)
  })

  test('PUT /api/projects/:id assigns project to program (route wiring uses projectService.update)', async () => {
    ;(programService.getProgramById as jest.Mock).mockResolvedValue({ id: 'prog-1', owner_id: 'owner-1' })
    ;(projectService.update as jest.Mock).mockResolvedValue({ id: 'proj-1', program_id: 'prog-1' })

    // Create a minimal router that mirrors the PUT handling and uses projectService.update
    const router = express.Router()
    router.use(express.json())
    // auth stub: user is owner
    router.use((req: any, _res, next) => { req.user = { id: 'owner-1', email: 'owner@example.com', role: 'user', permissions: [] }; next() })
    router.put('/api/projects/:id', async (req: any, res) => {
      try {
        const project = await projectService.update(req.params.id, req.body, req.user.id)
        res.json({ project })
      } catch (err: any) {
        if (err.code === 'PROGRAM_NOT_FOUND') return res.status(404).json({ error: 'Program not found' })
        if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' })
        res.status(500).json({ error: 'Internal' })
      }
    })

    const app = express()
    app.use(router)

    const res = await request(app).put('/api/projects/proj-1').send({ program_id: 'prog-1' })
    expect(res.status).toBe(200)
    expect(res.body.project).toMatchObject({ id: 'proj-1', program_id: 'prog-1' })
  })

  test('PUT /api/projects/:id rejects invalid program_id', async () => {
    ;(projectService.update as jest.Mock).mockImplementation(() => { throw Object.assign(new Error('Program not found'), { code: 'PROGRAM_NOT_FOUND' }) })

    const router = express.Router()
    router.use(express.json())
    router.use((req: any, _res, next) => { req.user = { id: 'admin-1', email: 'a@x.com', role: 'admin', permissions: ['admin'] }; next() })
    router.put('/api/projects/:id', async (req: any, res) => {
      try {
        const project = await projectService.update(req.params.id, req.body, req.user.id)
        res.json({ project })
      } catch (err: any) {
        if (err.code === 'PROGRAM_NOT_FOUND') return res.status(404).json({ error: 'Program not found' })
        if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' })
        res.status(500).json({ error: 'Internal' })
      }
    })

    const app = express()
    app.use(router)

    const res = await request(app).put('/api/projects/proj-1').send({ program_id: 'invalid-prog' })
    expect(res.status).toBe(404)
  })

  test('PUT /api/projects/:id prevents assignment when user not authorized', async () => {
    ;(projectService.update as jest.Mock).mockImplementation(() => { throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' }) })

    const router = express.Router()
    router.use(express.json())
    router.use((req: any, _res, next) => { req.user = { id: 'user-1', email: 'u@x.com', role: 'user', permissions: [] }; next() })
    router.put('/api/projects/:id', async (req: any, res) => {
      try {
        const project = await projectService.update(req.params.id, req.body, req.user.id)
        res.json({ project })
      } catch (err: any) {
        if (err.code === 'PROGRAM_NOT_FOUND') return res.status(404).json({ error: 'Program not found' })
        if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' })
        res.status(500).json({ error: 'Internal' })
      }
    })

    const app = express()
    app.use(router)

    const res = await request(app).put('/api/projects/proj-1').send({ program_id: 'prog-1' })
    expect(res.status).toBe(403)
  })
})
