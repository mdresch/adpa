import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import programService from '../services/programService'
import projectService from '../services/projectService'
import * as programMetricsService from '../services/programMetricsService'
import * as programFinancialService from '../services/programFinancialService'
import * as evmCalculator from '../services/evmCalculator'

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

// ================================================================
// FINANCIAL MANAGEMENT ROUTES (Phase 3A)
// ================================================================

/**
 * GET /api/programs/:id/financials
 * Get comprehensive financial summary for a program
 */
router.get('/:id/financials', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    log.info('Fetching financial summary', { programId })
    
    const summary = await programFinancialService.getProgramFinancialSummary(programId)
    
    res.json({ success: true, data: summary })
  } catch (error) {
    log.error('Failed to fetch financial summary', error)
    res.status(500).json({ error: 'Failed to fetch financial summary' })
  }
})

/**
 * GET /api/programs/:id/evm
 * Get EVM (Earned Value Management) metrics for a program
 */
router.get('/:id/evm', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    const reportingDate = req.query.reportingDate 
      ? new Date(req.query.reportingDate as string) 
      : new Date()
    
    log.info('Calculating EVM metrics', { programId, reportingDate })
    
    const evmMetrics = await evmCalculator.calculateEVMMetrics(programId, reportingDate)
    
    // Save to database for historical tracking
    await evmCalculator.saveEVMMetrics(evmMetrics)
    
    res.json({ success: true, data: evmMetrics })
  } catch (error) {
    log.error('Failed to calculate EVM metrics', error)
    res.status(500).json({ error: 'Failed to calculate EVM metrics' })
  }
})

/**
 * GET /api/programs/:id/evm/history
 * Get historical EVM metrics for trend analysis
 */
router.get('/:id/evm/history', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12
    
    log.info('Fetching EVM history', { programId, startDate, endDate, limit })
    
    const history = await evmCalculator.getHistoricalEVMMetrics(programId, startDate, endDate, limit)
    
    res.json({ success: true, data: history })
  } catch (error) {
    log.error('Failed to fetch EVM history', error)
    res.status(500).json({ error: 'Failed to fetch EVM history' })
  }
})

/**
 * GET /api/programs/:id/roi-analysis
 * Get complete financial analysis (ROI, NPV, payback period)
 */
router.get('/:id/roi-analysis', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    log.info('Performing financial analysis', { programId })
    
    const analysis = await programFinancialService.getFinancialAnalysis(programId)
    
    // Save to database
    await programFinancialService.saveFinancialAnalysis(analysis)
    
    res.json({ success: true, data: analysis })
  } catch (error) {
    log.error('Failed to perform financial analysis', error)
    res.status(500).json({ error: 'Failed to perform financial analysis' })
  }
})

/**
 * GET /api/programs/:id/financial-dashboard
 * Get complete financial dashboard data (summary + EVM + analysis)
 */
router.get('/:id/financial-dashboard', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    log.info('Fetching financial dashboard', { programId })
    
    const dashboard = await programFinancialService.getFinancialDashboard(programId)
    
    res.json({ success: true, data: dashboard })
  } catch (error) {
    log.error('Failed to fetch financial dashboard', error)
    res.status(500).json({ error: 'Failed to fetch financial dashboard' })
  }
})

/**
 * POST /api/programs/:id/budget
 * Create or update program budget
 */
router.post('/:id/budget', 
  authenticateToken, 
  requirePermission('programs.manage'),
  validate(Joi.object({
    fiscalYear: Joi.number().integer().min(2020).max(2100).required(),
    fiscalQuarter: Joi.number().integer().min(1).max(4).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      const { fiscalYear, fiscalQuarter } = req.body
      const userId = (req as any).user?.id
      
      log.info('Creating program budget', { programId, fiscalYear, fiscalQuarter })
      
      const budgetId = await programFinancialService.createProgramBudget(
        programId,
        fiscalYear,
        fiscalQuarter,
        userId
      )
      
      res.status(201).json({ success: true, data: { budgetId } })
    } catch (error) {
      log.error('Failed to create program budget', error)
      res.status(500).json({ error: 'Failed to create program budget' })
    }
  }
)

/**
 * POST /api/programs/:id/forecast
 * Create financial forecast
 */
router.post('/:id/forecast',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(Joi.object({
    forecastDate: Joi.date().required(),
    forecastType: Joi.string().valid('monthly', 'quarterly', 'reforecast', 'baseline').required(),
    forecastTotalCost: Joi.number().min(0).required(),
    forecastCompletionDate: Joi.date().optional(),
    forecastBenefitRealization: Joi.number().default(0),
    bestCaseCost: Joi.number().optional(),
    mostLikelyCost: Joi.number().optional(),
    worstCaseCost: Joi.number().optional(),
    assumptions: Joi.string().optional(),
    confidenceLevel: Joi.number().integer().min(0).max(100).optional(),
    status: Joi.string().valid('draft', 'submitted', 'approved').default('draft')
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      const forecastData = { ...req.body, programId }
      
      log.info('Creating forecast', { programId })
      
      const forecastId = await programFinancialService.createForecast(forecastData)
      
      res.status(201).json({ success: true, data: { forecastId } })
    } catch (error) {
      log.error('Failed to create forecast', error)
      res.status(500).json({ error: 'Failed to create forecast' })
    }
  }
)

/**
 * PUT /api/programs/projects/:projectId/earned-value
 * Update project earned value based on completion percentage
 */
router.put('/projects/:projectId/earned-value',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(Joi.object({
    percentComplete: Joi.number().min(0).max(100).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const { percentComplete } = req.body
      
      log.info('Updating project earned value', { projectId, percentComplete })
      
      await evmCalculator.updateProjectEarnedValue(projectId, percentComplete)
      
      res.json({ success: true, message: 'Earned value updated successfully' })
    } catch (error) {
      log.error('Failed to update earned value', error)
      res.status(500).json({ error: 'Failed to update earned value' })
    }
  }
)

// ================================================================
// END FINANCIAL MANAGEMENT ROUTES
// ================================================================

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
      const programId = req.params.id
      const { projectId } = req.params
      
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
