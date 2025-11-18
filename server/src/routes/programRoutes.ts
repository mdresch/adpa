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
import * as resourceService from '../services/resourceService'
import { pool } from '../database/connection'

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

// NOTE: The /:id/projects route is defined later (line 620) using programService.getProgramProjects
// which includes comprehensive metrics (quality, compliance, content metrics)
// This duplicate route has been removed to avoid conflicts

// Get program risks (aggregated from all projects in program)
router.get('/:id/risks', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    
    // Check which document ID column exists (could be extracted_from_document_id or source_document_id)
    let documentIdColumn = null
    try {
      const columnCheck = await pool.query(
        `SELECT column_name
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'risks' 
         AND column_name IN ('extracted_from_document_id', 'source_document_id')
         LIMIT 1`
      )
      if (columnCheck.rows.length > 0) {
        documentIdColumn = columnCheck.rows[0].column_name
      }
    } catch (err) {
      log.warn('Could not check for document ID column', err)
    }
    
    // Get all risks from projects in this program
    // Build query with dynamic column name for document ID
    const documentIdSelect = documentIdColumn 
      ? `r.${documentIdColumn}` 
      : 'NULL'
    
    const query = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.category,
        r.probability,
        r.impact,
        r.risk_level,
        r.mitigation_strategy,
        r.owner,
        COALESCE(r.status, 'open') as status,
        r.created_at,
        r.updated_at,
        ${documentIdSelect} as extracted_from_document_id,
        p.id as project_id,
        p.name as project_name
      FROM risks r
      JOIN projects p ON r.project_id = p.id
      WHERE p.program_id = $1
      ORDER BY 
        CASE r.risk_level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        r.probability DESC,
        r.impact DESC
    `
    
    const result = await pool.query(query, [programId])

    // Transform to match frontend Risk interface
    const risks = result.rows.map((row: any) => {
      // Map risk_level to severity
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
      const riskLevel = row.risk_level?.toLowerCase() || 'low'
      if (riskLevel === 'critical') {
        severity = 'critical'
      } else if (riskLevel === 'high') {
        severity = 'high'
      } else if (riskLevel === 'medium') {
        severity = 'medium'
      } else if (riskLevel === 'low') {
        severity = 'low'
      }

      // Convert probability to number (0-100)
      let probability = 50
      if (typeof row.probability === 'number') {
        probability = row.probability
      } else if (typeof row.probability === 'string') {
        const probMap: Record<string, number> = { 'high': 75, 'medium': 50, 'low': 25 }
        probability = probMap[row.probability.toLowerCase()] || 50
      }

      // Convert impact to number (1-5 scale)
      let impact = 3
      if (typeof row.impact === 'number') {
        impact = Math.min(5, Math.max(1, row.impact))
      } else if (typeof row.impact === 'string') {
        const impactMap: Record<string, number> = { 'high': 5, 'medium': 3, 'low': 1 }
        impact = impactMap[row.impact.toLowerCase()] || 3
      }

      return {
        id: row.id,
        title: row.title || 'Untitled Risk',
        description: row.description || '',
        probability,
        impact,
        severity,
        status: (() => {
          const dbStatus = (row.status || 'open')?.toLowerCase();
          // Map database status values to expected frontend statuses
          const statusMap: Record<string, 'open' | 'mitigating' | 'mitigated' | 'accepted' | 'closed'> = {
            'open': 'open',
            'mitigating': 'mitigating',
            'mitigated': 'mitigated',
            'accepted': 'accepted',
            'closed': 'closed',
            'active': 'open',
            'in-progress': 'mitigating',
            'resolved': 'mitigated',
            'completed': 'closed'
          };
          return statusMap[dbStatus] || 'open';
        })(),
        category: row.category || 'technical',
        owner: row.owner || null,
        mitigation: row.mitigation_strategy || null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
        projectId: row.project_id,
        projectName: row.project_name,
        extractedFromDocumentId: row.extracted_from_document_id || null
      }
    })

    res.json({ success: true, data: risks })
  } catch (error: any) {
    log.error('Failed to fetch program risks', error)
    log.error('Error details:', { 
      message: error.message, 
      stack: error.stack,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Failed to fetch program risks',
      message: error.message,
      detail: error.detail
    })
  }
})

// Get program reports
router.get('/:id/reports', authenticateToken, requirePermission('programs.view'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const programId = req.params.id
    
    // Query documents that are reports for projects in this program
    // For now, return empty array as reports are typically generated on-demand
    // In the future, this could query a reports table or documents with type='report'
    const result = await pool.query(
      `
      SELECT 
        d.id,
        d.name as title,
        d.status,
        d.created_at as "createdAt",
        u.name as "generatedBy",
        d.metadata->>'format' as format,
        d.metadata->>'type' as type
      FROM documents d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE p.program_id = $1
        AND (d.metadata->>'type' = 'report' OR d.name ILIKE '%report%')
      ORDER BY d.created_at DESC
      LIMIT 50
      `,
      [programId]
    )

    // Transform to match frontend Report interface
    const reports = result.rows.map((row: any) => {
      // Determine report type from metadata or name
      let type: 'executive' | 'financial' | 'status' | 'risk' | 'milestone' | 'custom' = 'custom'
      const reportType = row.type?.toLowerCase() || ''
      const title = (row.title || '').toLowerCase()
      
      if (reportType.includes('executive') || title.includes('executive')) {
        type = 'executive'
      } else if (reportType.includes('financial') || title.includes('financial') || title.includes('budget')) {
        type = 'financial'
      } else if (reportType.includes('status') || title.includes('status')) {
        type = 'status'
      } else if (reportType.includes('risk') || title.includes('risk')) {
        type = 'risk'
      } else if (reportType.includes('milestone') || title.includes('milestone')) {
        type = 'milestone'
      }

      // Determine format
      let format: 'pdf' | 'docx' | 'excel' | 'html' = 'pdf'
      const reportFormat = row.format?.toLowerCase() || ''
      if (reportFormat.includes('docx') || reportFormat.includes('word')) {
        format = 'docx'
      } else if (reportFormat.includes('excel') || reportFormat.includes('xlsx')) {
        format = 'excel'
      } else if (reportFormat.includes('html')) {
        format = 'html'
      }

      // Determine status
      let status: 'pending' | 'generating' | 'completed' | 'failed' = 'completed'
      const docStatus = row.status?.toLowerCase() || ''
      if (docStatus === 'draft') {
        status = 'pending'
      } else if (docStatus === 'review') {
        status = 'generating'
      } else if (docStatus === 'published' || docStatus === 'approved') {
        status = 'completed'
      }

      return {
        id: row.id,
        title: row.title || 'Untitled Report',
        type,
        format,
        status,
        createdAt: row.createdAt || new Date().toISOString(),
        generatedBy: row.generatedBy || 'System',
        fileUrl: null, // Reports are stored as documents, URL would need to be generated
        fileSize: null
      }
    })

    res.json({ success: true, data: reports })
  } catch (error) {
    log.error('Failed to fetch program reports', error)
    res.status(500).json({ error: 'Failed to fetch program reports' })
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

// ================================================================
// RESOURCE MANAGEMENT ROUTES
// TASK-1141 / Issue #415: Resource management system in use
// ================================================================

// Validation schemas for resource management
const resourcePlanSchema = Joi.object({
  resourceType: Joi.string().valid('human', 'financial', 'technological', 'physical', 'other').required(),
  resourceName: Joi.string().max(255).required(),
  resourceRole: Joi.string().max(100).optional(),
  requiredQuantity: Joi.number().positive().required(),
  unitOfMeasure: Joi.string().max(50).optional().default('FTE'),
  neededFrom: Joi.date().required(),
  neededUntil: Joi.date().optional(),
  hoursPerWeek: Joi.number().min(0).max(168).optional(),
  requiredSkills: Joi.array().items(Joi.string()).optional(),
  seniorityLevel: Joi.string().valid('junior', 'mid', 'senior', 'expert', 'lead', 'principal').optional(),
  planningStatus: Joi.string().valid('identified', 'requested', 'approved', 'allocated', 'cancelled').optional().default('identified'),
  description: Joi.string().optional(),
  priority: Joi.number().integer().optional().default(0)
})

const resourceAllocationSchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  resourceId: Joi.string().uuid().required(),
  resourceName: Joi.string().max(255).required(),
  resourceType: Joi.string().valid('human', 'financial', 'technological', 'physical', 'other').required(),
  allocatedAmount: Joi.number().positive().required(),
  allocationPercentage: Joi.number().min(0).max(100).optional(),
  allocationStart: Joi.date().required(),
  allocationEnd: Joi.date().optional(),
  priorityScore: Joi.number().min(0).max(100).optional(),
  isCriticalResource: Joi.boolean().optional().default(false),
  allocationStatus: Joi.string().valid('planned', 'active', 'completed', 'released', 'cancelled').optional().default('planned'),
  notes: Joi.string().optional()
})

const capacityForecastSchema = Joi.object({
  forecastPeriod: Joi.date().required()
})

const skillsInventorySchema = Joi.object({
  userId: Joi.string().uuid().required(),
  skillName: Joi.string().max(255).required(),
  skillCategory: Joi.string().valid('technical', 'leadership', 'domain', 'tool', 'soft', 'certification', 'other').required(),
  proficiencyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').required(),
  proficiencyScore: Joi.number().min(1).max(100).optional(),
  isCertified: Joi.boolean().optional().default(false),
  certificationName: Joi.string().max(255).optional(),
  certificationExpiry: Joi.date().optional(),
  certificationIssuer: Joi.string().max(255).optional(),
  yearsExperience: Joi.number().min(0).optional().default(0),
  projectsUsedIn: Joi.array().items(Joi.string().uuid()).optional(),
  lastUsedDate: Joi.date().optional(),
  availableForAllocation: Joi.boolean().optional().default(true),
  preferredAllocationType: Joi.string().valid('full-time', 'part-time', 'consulting').optional(),
  verifiedBy: Joi.string().uuid().optional(),
  verifiedAt: Joi.date().optional(),
  verificationNotes: Joi.string().optional()
})

const resourcePerformanceSchema = Joi.object({
  resourceId: Joi.string().uuid().required(),
  reportingPeriod: Joi.date().required(),
  availableHours: Joi.number().min(0).optional(),
  billableHours: Joi.number().min(0).optional(),
  tasksAssigned: Joi.number().integer().min(0).optional().default(0),
  tasksCompleted: Joi.number().integer().min(0).optional().default(0),
  qualityScore: Joi.number().min(0).max(100).optional(),
  reworkPercentage: Joi.number().min(0).max(100).optional().default(0),
  overallPerformance: Joi.string().valid('exceeds', 'meets', 'below-expectations', 'needs-improvement').optional(),
  performanceScore: Joi.number().min(1).max(100).optional(),
  managerFeedback: Joi.string().optional(),
  peerFeedback: Joi.object().optional(),
  selfAssessment: Joi.string().optional(),
  reviewedBy: Joi.string().uuid().optional(),
  reviewedAt: Joi.date().optional()
})

const resourceRiskSchema = Joi.object({
  resourceId: Joi.string().uuid().optional(),
  riskTitle: Joi.string().max(255).required(),
  riskDescription: Joi.string().optional(),
  riskCategory: Joi.string().valid('availability', 'capability', 'capacity', 'cost', 'conflict', 'retention', 'other').optional(),
  probability: Joi.string().valid('low', 'medium', 'high', 'very-high').optional().default('low'),
  impact: Joi.string().valid('low', 'medium', 'high', 'critical').optional().default('low'),
  mitigationPlan: Joi.string().optional(),
  mitigationStatus: Joi.string().valid('planned', 'in-progress', 'completed', 'cancelled').optional().default('planned'),
  mitigationOwnerId: Joi.string().uuid().optional(),
  riskStatus: Joi.string().valid('open', 'mitigated', 'accepted', 'closed').optional().default('open'),
  identifiedDate: Joi.date().optional(),
  mitigationDueDate: Joi.date().optional()
})

/**
 * POST /api/programs/:id/resources/plans
 * Create a resource plan entry
 */
router.post('/:id/resources/plans',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(resourcePlanSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const programId = req.params.id
      
      const plan = await resourceService.createResourcePlan(
        { ...req.body, programId },
        userId
      )
      
      log.info('[RESOURCE] Created resource plan', { planId: plan.id, programId })
      
      res.status(201).json({
        success: true,
        data: plan
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to create resource plan:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create resource plan',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/plans
 * Get resource plans for a program
 */
router.get('/:id/resources/plans',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const filters = {
        resourceType: req.query.resource_type as string,
        planningStatus: req.query.status as string,
        dateRange: {
          from: req.query.from ? new Date(req.query.from as string) : undefined,
          until: req.query.until ? new Date(req.query.until as string) : undefined
        }
      }
      
      const plans = await resourceService.getResourcePlans(programId, filters)
      
      log.info('[RESOURCE] Retrieved resource plans', { programId, count: plans.length })
      
      res.json({
        success: true,
        data: plans,
        count: plans.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get resource plans:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource plans',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/programs/:id/resources/plans/:planId/status
 * Update resource plan status
 */
router.put('/:id/resources/plans/:planId/status',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(Joi.object({
    status: Joi.string().valid('identified', 'requested', 'approved', 'allocated', 'cancelled').required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const planId = req.params.planId
      
      const plan = await resourceService.updateResourcePlanStatus(
        planId,
        req.body.status,
        userId
      )
      
      log.info('[RESOURCE] Updated resource plan status', { planId, status: req.body.status })
      
      res.json({
        success: true,
        data: plan
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to update resource plan status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update resource plan status',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/programs/:id/resources/allocations
 * Allocate resource to a project
 */
router.post('/:id/resources/allocations',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(resourceAllocationSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const programId = req.params.id
      
      const allocation = await resourceService.allocateResource(
        { ...req.body, programId },
        userId
      )
      
      log.info('[RESOURCE] Allocated resource', {
        allocationId: allocation.id,
        programId,
        resourceId: allocation.resourceId,
        hasConflicts: allocation.hasConflicts
      })
      
      res.status(201).json({
        success: true,
        data: allocation
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to allocate resource:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to allocate resource',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/allocations
 * Get resource allocations for a program
 */
router.get('/:id/resources/allocations',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const filters = {
        projectId: req.query.project_id as string,
        resourceId: req.query.resource_id as string,
        allocationStatus: req.query.status as string,
        showConflictsOnly: req.query.conflicts_only === 'true'
      }
      
      const allocations = await resourceService.getResourceAllocations(programId, filters)
      
      log.info('[RESOURCE] Retrieved resource allocations', { programId, count: allocations.length })
      
      res.json({
        success: true,
        data: allocations,
        count: allocations.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get resource allocations:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource allocations',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/conflicts
 * Get resource conflicts for a program
 */
router.get('/:id/resources/conflicts',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const conflicts = await resourceService.getResourceConflicts(programId)
      
      log.info('[RESOURCE] Retrieved resource conflicts', { programId, count: conflicts.length })
      
      res.json({
        success: true,
        data: conflicts,
        count: conflicts.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get resource conflicts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource conflicts',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/programs/:id/resources/conflicts/detect
 * Manually trigger conflict detection
 */
router.post('/:id/resources/conflicts/detect',
  authenticateToken,
  requirePermission('programs.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const conflictCount = await resourceService.detectConflicts(programId)
      
      log.info('[RESOURCE] Detected conflicts', { programId, conflictCount })
      
      res.json({
        success: true,
        data: {
          conflictCount,
          message: `Detected ${conflictCount} resource conflict(s)`
        }
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to detect conflicts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to detect conflicts',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/programs/:id/resources/allocations/:allocationId/status
 * Update allocation status
 */
router.put('/:id/resources/allocations/:allocationId/status',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(Joi.object({
    status: Joi.string().valid('planned', 'active', 'completed', 'released', 'cancelled').required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const allocationId = req.params.allocationId
      
      const allocation = await resourceService.updateAllocationStatus(
        allocationId,
        req.body.status,
        userId
      )
      
      log.info('[RESOURCE] Updated allocation status', { allocationId, status: req.body.status })
      
      res.json({
        success: true,
        data: allocation
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to update allocation status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update allocation status',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/programs/:id/resources/capacity/forecast
 * Calculate capacity forecast for a program
 */
router.post('/:id/resources/capacity/forecast',
  authenticateToken,
  requirePermission('programs.view'),
  validate(capacityForecastSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const programId = req.params.id
      
      const forecast = await resourceService.calculateCapacityForecast(
        programId,
        req.body.forecastPeriod,
        userId
      )
      
      log.info('[RESOURCE] Calculated capacity forecast', { programId, forecastPeriod: req.body.forecastPeriod })
      
      res.json({
        success: true,
        data: forecast
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to calculate capacity forecast:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate capacity forecast',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/capacity/forecasts
 * Get capacity forecasts for a program
 */
router.get('/:id/resources/capacity/forecasts',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const forecasts = await resourceService.getCapacityForecasts(
        programId,
        req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        req.query.end_date ? new Date(req.query.end_date as string) : undefined
      )
      
      log.info('[RESOURCE] Retrieved capacity forecasts', { programId, count: forecasts.length })
      
      res.json({
        success: true,
        data: forecasts,
        count: forecasts.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get capacity forecasts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capacity forecasts',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/demand
 * Get resource demand summary
 */
router.get('/:id/resources/demand',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const demand = await resourceService.getResourceDemand(programId)
      
      log.info('[RESOURCE] Retrieved resource demand', { programId, count: demand.length })
      
      res.json({
        success: true,
        data: demand,
        count: demand.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get resource demand:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource demand',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/programs/:id/resources/skills
 * Add or update skill in inventory
 */
router.post('/:id/resources/skills',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(skillsInventorySchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const programId = req.params.id
      
      const skill = await resourceService.upsertSkill(
        { ...req.body, programId },
        userId
      )
      
      log.info('[RESOURCE] Upserted skill', {
        skillId: skill.id,
        programId,
        userId: skill.userId,
        skillName: skill.skillName
      })
      
      res.status(201).json({
        success: true,
        data: skill
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to upsert skill:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to add/update skill',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/skills
 * Get skills inventory for a program
 */
router.get('/:id/resources/skills',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const filters = {
        userId: req.query.user_id as string,
        skillCategory: req.query.category as string,
        proficiencyLevel: req.query.proficiency as string,
        skillName: req.query.skill_name as string
      }
      
      const skills = await resourceService.getSkillsInventory(programId, filters)
      
      log.info('[RESOURCE] Retrieved skills inventory', { programId, count: skills.length })
      
      res.json({
        success: true,
        data: skills,
        count: skills.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get skills inventory:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve skills inventory',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/skills/gap
 * Get skills gap analysis
 */
router.get('/:id/resources/skills/gap',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const gaps = await resourceService.getSkillsGap(programId)
      
      log.info('[RESOURCE] Retrieved skills gap analysis', { programId, count: gaps.length })
      
      res.json({
        success: true,
        data: gaps,
        count: gaps.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get skills gap:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve skills gap analysis',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/programs/:id/resources/performance
 * Create or update resource performance record
 */
router.post('/:id/resources/performance',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(resourcePerformanceSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const programId = req.params.id
      
      const performance = await resourceService.upsertResourcePerformance(
        { ...req.body, programId },
        userId
      )
      
      log.info('[RESOURCE] Upserted resource performance', {
        performanceId: performance.id,
        programId,
        resourceId: performance.resourceId
      })
      
      res.status(201).json({
        success: true,
        data: performance
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to upsert resource performance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to add/update resource performance',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/utilization
 * Get resource utilization summary
 */
router.get('/:id/resources/utilization',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const utilization = await resourceService.getResourceUtilizationSummary(programId)
      
      if (!utilization) {
        return res.json({
          success: true,
          data: null,
          message: 'No utilization data available for this program'
        })
      }
      
      log.info('[RESOURCE] Retrieved resource utilization summary', { programId })
      
      res.json({
        success: true,
        data: utilization
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get resource utilization:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource utilization',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/programs/:id/resources/risks
 * Create resource risk
 */
router.post('/:id/resources/risks',
  authenticateToken,
  requirePermission('programs.manage'),
  validate(resourceRiskSchema),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const programId = req.params.id
      
      const risk = await resourceService.createResourceRisk(
        { ...req.body, programId },
        userId
      )
      
      log.info('[RESOURCE] Created resource risk', {
        riskId: risk.id,
        programId,
        riskTitle: risk.riskTitle
      })
      
      res.status(201).json({
        success: true,
        data: risk
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to create resource risk:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create resource risk',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/programs/:id/resources/risks
 * Get resource risks for a program
 */
router.get('/:id/resources/risks',
  authenticateToken,
  requirePermission('programs.view'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const programId = req.params.id
      
      const filters = {
        riskStatus: req.query.status as string,
        riskCategory: req.query.category as string,
        resourceId: req.query.resource_id as string
      }
      
      const risks = await resourceService.getResourceRisks(programId, filters)
      
      log.info('[RESOURCE] Retrieved resource risks', { programId, count: risks.length })
      
      res.json({
        success: true,
        data: risks,
        count: risks.length
      })
    } catch (error: any) {
      log.error('[RESOURCE] Failed to get resource risks:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource risks',
        message: error.message
      })
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
