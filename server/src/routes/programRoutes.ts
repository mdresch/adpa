import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import programService from '../services/programService'
import projectService from '../services/projectService'
import * as programMetricsService from '../services/programMetricsService'

const router = express.Router()

const programCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow('', null),
  budget: Joi.number().precision(2).min(0).optional().allow(null),
  currency: Joi.string().length(3).optional().default('USD'),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  status: Joi.string().valid('green', 'amber', 'red').default('green'),
  // owner_id is set from authenticated user, not required in request
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
    const userId = (req as any).user?.id
    
    // Set owner_id and created_by from authenticated user
    const program = await programService.createProgram({ 
      ...payload, 
      owner_id: userId,
      created_by: userId 
    })
    res.status(201).json({ success: true, data: program })
  } catch (error) {
    log.error('Failed to create program', error)
    res.status(500).json({ error: 'Failed to create program' })
  }
})

// IMPORTANT: Specific routes (/:id/projects, /:id/metrics) must come BEFORE generic /:id route
// Express matches routes in order, so /:id would catch /:id/projects if placed first

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

// Get program metrics (Beacon 1.4)
router.get("/:id/metrics", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  
  try {
    const { id } = req.params

    log.info(`Fetching metrics for program: ${id}`)

    const metrics = await programMetricsService.calculateMetrics(id)

    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    log.error("Error fetching program metrics:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch program metrics"
    })
  }
})

// Get program (must come AFTER specific routes like /:id/projects and /:id/metrics)
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

/**
 * GET /api/programs/:id/projects
 * Get all projects assigned to a program
 */
router.get('/:id/projects',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const projects = await programService.getProgramProjects(programId)
      
      res.json({ success: true, data: projects })
    } catch (error) {
      log.error('Failed to fetch program projects', error)
      res.status(500).json({ error: 'Failed to fetch program projects' })
    }
  }
)

/**
 * POST /api/programs/:id/add-project
 * Assign a project to a program
 */
router.post('/:id/add-project',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      const { projectId } = req.body
      
      // Verify program exists
      const program = await programService.getProgramById(programId)
      if (!program) {
        return res.status(404).json({ error: 'Program not found' })
      }
      
      // Assign project to program
      const project = await programService.assignProject(programId, projectId)
      if (!project) {
        return res.status(404).json({ error: 'Project not found' })
      }
      
      log.info(`Assigned project ${projectId} to program ${programId}`)
      
      res.json({ success: true, data: project })
    } catch (error) {
      log.error('Failed to assign project to program', error)
      res.status(500).json({ error: 'Failed to assign project to program' })
    }
  }
)

/**
 * DELETE /api/programs/:id/remove-project/:projectId
 * Remove a project from a program
 */
router.delete('/:id/remove-project/:projectId',
  authenticateToken,
  requirePermission('programs.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId, projectId } = req.params
      
      await programService.removeProject(projectId)
      
      log.info(`Removed project ${projectId} from program ${programId}`)
      
      res.json({ success: true })
    } catch (error) {
      log.error('Failed to remove project from program', error)
      res.status(500).json({ error: 'Failed to remove project from program' })
    }
  }
)

/**
 * GET /api/programs/:id/can-archive
 * Check if program can be archived (all projects must be archived)
 */
router.get('/:id/can-archive',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const result = await programService.canArchiveProgram(programId)
      
      res.json({ success: true, data: result })
    } catch (error) {
      log.error('Failed to check archive status', error)
      res.status(500).json({ error: 'Failed to check archive status' })
    }
  }
)

/**
 * POST /api/programs/:id/archive
 * Archive a program (only if all projects are archived)
 */
router.post('/:id/archive',
  authenticateToken,
  requirePermission('programs.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      const userId = (req as any).user.id
      
      const program = await programService.archiveProgram(programId, userId)
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' })
      }
      
      log.info(`Program ${programId} archived by user ${userId}`)
      
      res.json({ success: true, data: program })
    } catch (error) {
      log.error('Failed to archive program', error)
      
      // If error message contains "Cannot archive", send 400 instead of 500
      if (error instanceof Error && error.message.includes('Cannot archive')) {
        return res.status(400).json({ error: error.message })
      }
      
      res.status(500).json({ error: 'Failed to archive program' })
    }
  }
)

/**
 * POST /api/programs/:id/unarchive
 * Unarchive a program
 */
router.post('/:id/unarchive',
  authenticateToken,
  requirePermission('programs.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const program = await programService.unarchiveProgram(programId)
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' })
      }
      
      log.info(`Program ${programId} unarchived`)
      
      res.json({ success: true, data: program })
    } catch (error) {
      log.error('Failed to unarchive program', error)
      res.status(500).json({ error: 'Failed to unarchive program' })
    }
  }
)

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
