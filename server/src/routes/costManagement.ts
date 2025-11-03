/**
 * Cost Management Routes
 * 
 * API endpoints for:
 * - Cost categories management
 * - Roles and rates management
 * - Time entry submission and approval
 * - Resource assignments
 * - Labor cost calculations
 * 
 * Migration: 206_cost_management_system.sql
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import * as costCategoryService from '../services/costCategoryService'
import * as roleManagementService from '../services/roleManagementService'
import * as timeTrackingService from '../services/timeTrackingService'

const router = express.Router()

// ================================================================
// COST CATEGORIES MANAGEMENT
// ================================================================

/**
 * GET /api/cost-management/categories
 * Get all cost categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const includeArchived = req.query.includeArchived === 'true'
    const categories = await costCategoryService.getAllCostCategories(includeArchived)
    
    res.json({ success: true, data: categories })
  } catch (error) {
    log.error('Failed to get cost categories', error)
    res.status(500).json({ error: 'Failed to get cost categories' })
  }
})

/**
 * GET /api/cost-management/categories/:id
 * Get cost category by ID
 */
router.get('/categories/:id', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const category = await costCategoryService.getCostCategoryById(req.params.id)
    
    if (!category) {
      return res.status(404).json({ error: 'Cost category not found' })
    }
    
    res.json({ success: true, data: category })
  } catch (error) {
    log.error('Failed to get cost category', error)
    res.status(500).json({ error: 'Failed to get cost category' })
  }
})

/**
 * POST /api/cost-management/categories
 * Create new cost category
 */
router.post('/categories',
  authenticateToken,
  requirePermission('settings.manage'),
  validate(Joi.object({
    name: Joi.string().max(100).required(),
    description: Joi.string().optional(),
    categoryCode: Joi.string().max(20).required(),
    categoryType: Joi.string().valid('labor', 'material', 'service', 'equipment', 'overhead', 'other').required(),
    isLaborCategory: Joi.boolean().optional(),
    requiresTimeTracking: Joi.boolean().optional(),
    defaultPercentage: Joi.number().min(0).max(100).optional(),
    isMandatory: Joi.boolean().optional(),
    icon: Joi.string().optional(),
    color: Joi.string().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const category = await costCategoryService.createCostCategory(req.body, userId)
      
      res.status(201).json({ success: true, data: category })
    } catch (error) {
      log.error('Failed to create cost category', error)
      res.status(500).json({ error: 'Failed to create cost category' })
    }
  }
)

/**
 * PUT /api/cost-management/categories/:id
 * Update cost category
 */
router.put('/categories/:id',
  authenticateToken,
  requirePermission('settings.manage'),
  validate(Joi.object({
    name: Joi.string().max(100).optional(),
    description: Joi.string().optional(),
    categoryType: Joi.string().valid('labor', 'material', 'service', 'equipment', 'overhead', 'other').optional(),
    defaultPercentage: Joi.number().min(0).max(100).optional(),
    icon: Joi.string().optional(),
    color: Joi.string().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const category = await costCategoryService.updateCostCategory(req.params.id, req.body)
      
      if (!category) {
        return res.status(404).json({ error: 'Cost category not found' })
      }
      
      res.json({ success: true, data: category })
    } catch (error) {
      log.error('Failed to update cost category', error)
      res.status(500).json({ error: 'Failed to update cost category' })
    }
  }
)

/**
 * DELETE /api/cost-management/categories/:id
 * Archive cost category
 */
router.delete('/categories/:id',
  authenticateToken,
  requirePermission('settings.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await costCategoryService.archiveCostCategory(req.params.id)
      
      res.json({ success: true, message: 'Cost category archived' })
    } catch (error: any) {
      log.error('Failed to archive cost category', error)
      res.status(error.message?.includes('system category') ? 400 : 500)
         .json({ error: error.message || 'Failed to archive cost category' })
    }
  }
)

/**
 * POST /api/cost-management/categories/reorder
 * Reorder cost categories
 */
router.post('/categories/reorder',
  authenticateToken,
  requirePermission('settings.manage'),
  validate(Joi.object({
    categoryOrders: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        order: Joi.number().integer().min(0).required()
      })
    ).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await costCategoryService.reorderCostCategories(req.body.categoryOrders)
      
      res.json({ success: true, message: 'Categories reordered' })
    } catch (error) {
      log.error('Failed to reorder categories', error)
      res.status(500).json({ error: 'Failed to reorder categories' })
    }
  }
)

// ================================================================
// ROLES AND RATES MANAGEMENT
// ================================================================

/**
 * GET /api/cost-management/roles
 * Get all project roles
 */
router.get('/roles', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const roles = await roleManagementService.getAllRoles(includeInactive)
    
    res.json({ success: true, data: roles })
  } catch (error) {
    log.error('Failed to get roles', error)
    res.status(500).json({ error: 'Failed to get roles' })
  }
})

/**
 * GET /api/cost-management/roles/by-type/:type
 * Get roles by type (internal, external, contractor)
 */
router.get('/roles/by-type/:type', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const roles = await roleManagementService.getRolesByType(req.params.type)
    
    res.json({ success: true, data: roles })
  } catch (error) {
    log.error('Failed to get roles by type', error)
    res.status(500).json({ error: 'Failed to get roles by type' })
  }
})

/**
 * POST /api/cost-management/roles
 * Create new role
 */
router.post('/roles',
  authenticateToken,
  requirePermission('settings.manage'),
  validate(Joi.object({
    roleName: Joi.string().max(100).required(),
    roleCode: Joi.string().max(20).required(),
    description: Joi.string().optional(),
    roleType: Joi.string().valid('internal', 'external', 'contractor', 'vendor').required(),
    roleCategory: Joi.string().optional(),
    seniorityLevel: Joi.string().optional(),
    defaultHourlyRate: Joi.number().min(0).required(),
    currency: Joi.string().length(3).optional(),
    requiredSkills: Joi.array().items(Joi.string()).optional(),
    certifications: Joi.array().items(Joi.string()).optional(),
    isBillable: Joi.boolean().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const role = await roleManagementService.createRole(req.body, userId)
      
      res.status(201).json({ success: true, data: role })
    } catch (error) {
      log.error('Failed to create role', error)
      res.status(500).json({ error: 'Failed to create role' })
    }
  }
)

/**
 * PUT /api/cost-management/roles/:id
 * Update role
 */
router.put('/roles/:id',
  authenticateToken,
  requirePermission('settings.manage'),
  validate(Joi.object({
    roleName: Joi.string().max(100).optional(),
    description: Joi.string().optional(),
    defaultHourlyRate: Joi.number().min(0).optional(),
    roleCategory: Joi.string().optional(),
    seniorityLevel: Joi.string().optional(),
    requiredSkills: Joi.array().items(Joi.string()).optional(),
    certifications: Joi.array().items(Joi.string()).optional(),
    isBillable: Joi.boolean().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const role = await roleManagementService.updateRole(req.params.id, req.body)
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' })
      }
      
      res.json({ success: true, data: role })
    } catch (error) {
      log.error('Failed to update role', error)
      res.status(500).json({ error: 'Failed to update role' })
    }
  }
)

/**
 * DELETE /api/cost-management/roles/:id
 * Archive role
 */
router.delete('/roles/:id',
  authenticateToken,
  requirePermission('settings.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await roleManagementService.archiveRole(req.params.id)
      
      res.json({ success: true, message: 'Role archived' })
    } catch (error) {
      log.error('Failed to archive role', error)
      res.status(500).json({ error: 'Failed to archive role' })
    }
  }
)

// ================================================================
// RESOURCE ASSIGNMENTS
// ================================================================

/**
 * POST /api/cost-management/assignments
 * Create resource assignment (assign person to project with role and rate)
 */
router.post('/assignments',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    projectId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().required(),
    roleId: Joi.string().uuid().required(),
    assignmentType: Joi.string().valid('full-time', 'part-time', 'contractor', 'consultant').required(),
    allocationPercentage: Joi.number().min(0).max(100).default(100),
    hourlyRate: Joi.number().min(0).required(),
    dailyRate: Joi.number().min(0).optional(),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional(),
    estimatedHours: Joi.number().min(0).optional(),
    requiresApproval: Joi.boolean().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const assignment = await timeTrackingService.createResourceAssignment(req.body, userId)
      
      res.status(201).json({ success: true, data: assignment })
    } catch (error) {
      log.error('Failed to create resource assignment', error)
      res.status(500).json({ error: 'Failed to create resource assignment' })
    }
  }
)

/**
 * GET /api/cost-management/projects/:projectId/assignments
 * Get resource assignments for a project
 */
router.get('/projects/:projectId/assignments',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const assignments = await timeTrackingService.getProjectResourceAssignments(req.params.projectId)
      
      res.json({ success: true, data: assignments })
    } catch (error) {
      log.error('Failed to get project assignments', error)
      res.status(500).json({ error: 'Failed to get project assignments' })
    }
  }
)

// ================================================================
// TIME TRACKING
// ================================================================

/**
 * POST /api/cost-management/time-entries
 * Submit time entry (hours worked × rate)
 */
router.post('/time-entries',
  authenticateToken,
  validate(Joi.object({
    projectId: Joi.string().uuid().required(),
    assignmentId: Joi.string().uuid().required(),
    entryDate: Joi.date().required(),
    hoursWorked: Joi.number().min(0.1).max(24).required(),
    overtimeHours: Joi.number().min(0).max(24).optional(),
    hourlyRate: Joi.number().min(0).optional(),
    overtimeRate: Joi.number().min(0).optional(),
    taskId: Joi.string().uuid().optional(),
    taskName: Joi.string().optional(),
    workDescription: Joi.string().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const timeEntry = await timeTrackingService.submitTimeEntry(req.body, userId)
      
      res.status(201).json({ 
        success: true, 
        data: timeEntry,
        message: timeEntry.status === 'approved' 
          ? 'Time entry submitted and auto-approved'
          : 'Time entry submitted for approval'
      })
    } catch (error) {
      log.error('Failed to submit time entry', error)
      res.status(500).json({ error: 'Failed to submit time entry' })
    }
  }
)

/**
 * GET /api/cost-management/projects/:projectId/time-entries
 * Get time entries for a project
 */
router.get('/projects/:projectId/time-entries',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const filters = {
        userId: req.query.userId as string | undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      }
      
      const timeEntries = await timeTrackingService.getProjectTimeEntries(req.params.projectId, filters)
      
      res.json({ success: true, data: timeEntries })
    } catch (error) {
      log.error('Failed to get time entries', error)
      res.status(500).json({ error: 'Failed to get time entries' })
    }
  }
)

/**
 * GET /api/cost-management/time-entries/pending
 * Get time entries pending approval
 */
router.get('/time-entries/pending',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const projectId = req.query.projectId as string | undefined
      const pendingEntries = await timeTrackingService.getPendingApprovals(projectId)
      
      res.json({ success: true, data: pendingEntries })
    } catch (error) {
      log.error('Failed to get pending approvals', error)
      res.status(500).json({ error: 'Failed to get pending approvals' })
    }
  }
)

/**
 * POST /api/cost-management/time-entries/:id/approve
 * Approve time entry
 */
router.post('/time-entries/:id/approve',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const approverId = (req as any).user?.id
      const timeEntry = await timeTrackingService.approveTimeEntry(req.params.id, approverId)
      
      res.json({ 
        success: true, 
        data: timeEntry,
        message: 'Time entry approved - costs updated'
      })
    } catch (error) {
      log.error('Failed to approve time entry', error)
      res.status(500).json({ error: 'Failed to approve time entry' })
    }
  }
)

/**
 * POST /api/cost-management/time-entries/:id/reject
 * Reject time entry
 */
router.post('/time-entries/:id/reject',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    reason: Joi.string().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const approverId = (req as any).user?.id
      const timeEntry = await timeTrackingService.rejectTimeEntry(
        req.params.id, 
        approverId, 
        req.body.reason
      )
      
      res.json({ success: true, data: timeEntry })
    } catch (error) {
      log.error('Failed to reject time entry', error)
      res.status(500).json({ error: 'Failed to reject time entry' })
    }
  }
)

/**
 * POST /api/cost-management/time-entries/bulk-approve
 * Bulk approve multiple time entries
 */
router.post('/time-entries/bulk-approve',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    timeEntryIds: Joi.array().items(Joi.string().uuid()).min(1).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const approverId = (req as any).user?.id
      const approvedCount = await timeTrackingService.bulkApproveTimeEntries(
        req.body.timeEntryIds,
        approverId
      )
      
      res.json({ 
        success: true, 
        count: approvedCount,
        message: `${approvedCount} time entries approved`
      })
    } catch (error) {
      log.error('Failed to bulk approve time entries', error)
      res.status(500).json({ error: 'Failed to bulk approve time entries' })
    }
  }
)

// ================================================================
// PROJECT COST BREAKDOWN
// ================================================================

/**
 * GET /api/cost-management/projects/:projectId/cost-breakdown
 * Get detailed cost breakdown for a project
 */
router.get('/projects/:projectId/cost-breakdown',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const breakdown = await timeTrackingService.getProjectCostBreakdown(req.params.projectId)
      
      res.json({ success: true, data: breakdown })
    } catch (error) {
      log.error('Failed to get cost breakdown', error)
      res.status(500).json({ error: 'Failed to get cost breakdown' })
    }
  }
)

/**
 * GET /api/cost-management/projects/:projectId/time-by-role
 * Get time tracking summary by role
 */
router.get('/projects/:projectId/time-by-role',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const summary = await timeTrackingService.getTimeTrackingByRole(req.params.projectId)
      
      res.json({ success: true, data: summary })
    } catch (error) {
      log.error('Failed to get time by role', error)
      res.status(500).json({ error: 'Failed to get time by role' })
    }
  }
)

/**
 * POST /api/cost-management/projects/:projectId/recalculate-costs
 * Manually trigger cost breakdown recalculation
 */
router.post('/projects/:projectId/recalculate-costs',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await timeTrackingService.updateProjectCostBreakdown(req.params.projectId)
      
      res.json({ success: true, message: 'Project costs recalculated' })
    } catch (error) {
      log.error('Failed to recalculate costs', error)
      res.status(500).json({ error: 'Failed to recalculate costs' })
    }
  }
)

export default router

