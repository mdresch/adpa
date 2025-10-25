import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import programService from '../services/programService'
import projectService from '../services/projectService'

const router = express.Router()

const programCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow('', null),
  budget: Joi.number().precision(2).min(0).optional(),
  currency: Joi.string().length(3).optional().default('USD'),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  status: Joi.string().valid('green', 'amber', 'red').default('green'),
  owner_id: Joi.string().uuid().required(),
})

const programUpdateSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  budget: Joi.number().precision(2).min(0).optional(),
  currency: Joi.string().length(3).optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  status: Joi.string().valid('green', 'amber', 'red').optional(),
  owner_id: Joi.string().uuid().optional(),
})

// List programs
router.get('/', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { limit, offset, owner_id, status, search } = req.query
    const programs = await programService.listPrograms({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      ownerId: owner_id as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
    })

    res.json({ success: true, data: programs })
  } catch (error) {
    log.error('Failed to list programs', error)
    res.status(500).json({ error: 'Failed to list programs' })
  }
})

// Create program
router.post('/', authenticateToken, requirePermission('programs.manage'), validate(programCreateSchema), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const payload = req.body
    // created_by will be set from authenticated user if available
    const createdBy = (req as any).user?.id
    const program = await programService.createProgram({ ...payload, created_by: createdBy })
    res.status(201).json({ success: true, data: program })
  } catch (error) {
    log.error('Failed to create program', error)
    res.status(500).json({ error: 'Failed to create program' })
  }
})

// Get program
router.get('/:id', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const id = req.params.id
    const program = await programService.getProgramById(id)
    if (!program) return res.status(404).json({ error: 'Program not found' })
    res.json({ success: true, data: program })
  } catch (error) {
    log.error('Failed to fetch program', error)
    res.status(500).json({ error: 'Failed to fetch program' })
  }
})

// List projects belonging to a program
router.get('/:id/projects', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    const projects = await projectService.findByProgram(programId)
    res.json({ success: true, data: projects })
  } catch (error) {
    log.error('Failed to list projects by program', error)
    res.status(500).json({ error: 'Failed to list projects by program' })
  }
})

// Update program
router.put('/:id', authenticateToken, requirePermission('programs.manage'), validate(programUpdateSchema), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const id = req.params.id
    const updates = req.body
    const program = await programService.updateProgram(id, updates)
    if (!program) return res.status(404).json({ error: 'Program not found' })
    res.json({ success: true, data: program })
  } catch (error) {
    log.error('Failed to update program', error)
    res.status(500).json({ error: 'Failed to update program' })
  }
})

// Delete program
router.delete('/:id', authenticateToken, requirePermission('programs.manage'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const id = req.params.id
    await programService.deleteProgram(id)
    res.json({ success: true })
  } catch (error) {
    log.error('Failed to delete program', error)
    res.status(500).json({ error: 'Failed to delete program' })
  }
})

export default router

// Export factory for testing (allows injecting auth stubs)
export function createProgramRouter(opts?: { authenticate?: any; requirePermission?: any }) {
  const r = express.Router()
  const auth = opts?.authenticate || authenticateToken
  const perm = opts?.requirePermission || requirePermission

  r.get('/', auth, perm('programs.view'), async (req, res) => {
    const { limit, offset, owner_id, status, search } = req.query
    const programs = await programService.listPrograms({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      ownerId: owner_id as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
    })
    res.json({ success: true, data: programs })
  })

  r.post('/', auth, perm('programs.manage'), validate(programCreateSchema), async (req, res) => {
    const createdBy = (req as any).user?.id
    const program = await programService.createProgram({ ...req.body, created_by: createdBy })
    res.status(201).json({ success: true, data: program })
  })

  r.get('/:id', auth, perm('programs.view'), async (req, res) => {
    const program = await programService.getProgramById(req.params.id)
    if (!program) return res.status(404).json({ error: 'Program not found' })
    res.json({ success: true, data: program })
  })

  r.put('/:id', auth, perm('programs.manage'), validate(programUpdateSchema), async (req, res) => {
    const program = await programService.updateProgram(req.params.id, req.body)
    if (!program) return res.status(404).json({ error: 'Program not found' })
    res.json({ success: true, data: program })
  })

  r.delete('/:id', auth, perm('programs.manage'), async (req, res) => {
    await programService.deleteProgram(req.params.id)
    res.json({ success: true })
  })

  return r
}
