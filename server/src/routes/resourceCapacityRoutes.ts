/**
 * Resource Capacity Management Routes
 * 
 * API endpoints for:
 * - Capacity settings CRUD
 * - Checklist items with resource assignment
 * - Unavailability management
 * - Utilization queries at all levels
 * 
 * Base path: /api/resource-capacity
 */

import express, { Request, Response } from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger, childLogger } from '../utils/logger'
import * as resourceCapacityService from '../services/resourceCapacityService'

const router = express.Router()

// ================================================================
// VALIDATION SCHEMAS
// ================================================================

const capacitySettingsSchema = Joi.object({
  id: Joi.string().uuid().optional(), // Optional: if provided, update existing settings
  userId: Joi.string().uuid().required(),
  contractedHoursPerWeek: Joi.number().min(0).max(168).default(40),
  contractedHoursPerDay: Joi.number().min(0).max(24).default(8),
  contractedDaysPerWeek: Joi.number().integer().min(0).max(7).default(5),
  workStartTime: Joi.string().pattern(/^\d{2}:\d{2}$/).default('09:00'),
  workEndTime: Joi.string().pattern(/^\d{2}:\d{2}$/).default('17:00'),
  timezone: Joi.string().max(50).default('UTC'),
  targetUtilizationPercent: Joi.number().min(0).max(100).default(80),
  maxAllocationPercent: Joi.number().min(0).max(200).default(100),
  minAllocationPercent: Joi.number().min(0).max(100).default(0),
  annualLeaveDays: Joi.number().integer().min(0).default(25),
  publicHolidaysCalendar: Joi.string().max(50).default('US'),
  resourceType: Joi.string().valid('full-time', 'part-time', 'contractor', 'consultant', 'intern', 'temporary').default('full-time'),
  costCenter: Joi.string().max(100).optional().allow('', null),
  department: Joi.string().max(100).optional().allow('', null),
  effectiveFrom: Joi.string().isoDate().default(() => new Date().toISOString().split('T')[0]),
  effectiveUntil: Joi.string().isoDate().optional().allow(null),
  isActive: Joi.boolean().default(true)
})

const checklistItemSchema = Joi.object({
  taskId: Joi.string().uuid().required(),
  itemName: Joi.string().max(500).required(),
  description: Joi.string().optional().allow('', null),
  sequenceOrder: Joi.number().integer().min(0).default(0),
  assignedUserId: Joi.string().uuid().optional().allow(null),
  assignedRoleId: Joi.string().uuid().optional().allow(null),
  estimatedHours: Joi.number().min(0).optional().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  category: Joi.string().max(100).optional().allow('', null),
  dueDate: Joi.string().isoDate().optional().allow(null)
})

const checklistItemUpdateSchema = Joi.object({
  itemName: Joi.string().max(500).optional(),
  description: Joi.string().optional().allow('', null),
  sequenceOrder: Joi.number().integer().min(0).optional(),
  assignedUserId: Joi.string().uuid().optional().allow(null),
  assignedUserName: Joi.string().optional().allow('', null),
  assignedRoleId: Joi.string().uuid().optional().allow(null),
  assignedRoleName: Joi.string().optional().allow('', null),
  estimatedHours: Joi.number().min(0).optional().allow(null),
  actualHours: Joi.number().min(0).optional().allow(null),
  isCompleted: Joi.boolean().optional(),
  isBlocked: Joi.boolean().optional(),
  blockedReason: Joi.string().optional().allow('', null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  category: Joi.string().max(100).optional().allow('', null),
  dueDate: Joi.string().isoDate().optional().allow(null)
})

const unavailabilitySchema = Joi.object({
  userId: Joi.string().uuid().required(),
  unavailabilityType: Joi.string().valid(
    'annual-leave', 'sick-leave', 'public-holiday', 'training',
    'conference', 'jury-duty', 'parental-leave', 'personal', 'other'
  ).required(),
  description: Joi.string().optional().allow('', null),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  isFullDay: Joi.boolean().default(true),
  startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional().allow(null),
  endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional().allow(null),
  hoursUnavailable: Joi.number().min(0).optional().allow(null)
})

const reorderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      sequenceOrder: Joi.number().integer().min(0).required()
    })
  ).required()
})

// ================================================================
// CAPACITY SETTINGS ROUTES
// ================================================================

/**
 * GET /api/resource-capacity/settings
 * Get all capacity settings (admin/manager view)
 */
router.get('/settings',
  authenticateToken,
  requirePermission('users.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const filters = {
        resourceType: req.query.resource_type as string,
        department: req.query.department as string,
        isActive: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined
      }

      const settings = await resourceCapacityService.getAllCapacitySettings(filters)
      
      log.info('[CAPACITY] Retrieved all capacity settings', { count: settings.length })
      
      res.json({
        success: true,
        data: settings,
        count: settings.length
      })
    } catch (error: any) {
      log.error('[CAPACITY] Failed to get capacity settings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capacity settings',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/settings/:userId
 * Get capacity settings for a specific user
 */
router.get('/settings/:userId',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { userId } = req.params
      const currentUserId = (req as any).user?.id
      const userRole = (req as any).user?.role?.toLowerCase()
      const userPermissions = (req as any).user?.permissions || {}
      
      // Admins can view all, users can view their own, managers can view all
      const isAdmin = userRole === 'admin'
      const isOwnSettings = userId === currentUserId
      // Permissions can be an object { "users.view": true } or an array ["users.view"]
      const hasViewPermission = Array.isArray(userPermissions) 
        ? userPermissions.includes('users.view')
        : userPermissions['users.view'] === true
      
      if (!isAdmin && !isOwnSettings && !hasViewPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      const settings = await resourceCapacityService.getCapacitySettings(userId)
      
      // Return 200 with null data if no settings found (allows frontend to use defaults)
      res.json({
        success: true,
        data: settings || null
      })
    } catch (error: any) {
      // Handle missing table gracefully
      if (error.code === '42P01') {
        log.warn('[CAPACITY] resource_capacity_settings table not found. Run migration 356.', { userId: req.params.userId })
        return res.json({
          success: true,
          data: null,
          message: 'Capacity settings table not yet created. Run migration 356.'
        })
      }
      
      log.error('[CAPACITY] Failed to get user capacity settings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve capacity settings',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/resource-capacity/settings
 * Create or update capacity settings
 */
router.post('/settings',
  authenticateToken,
  requirePermission('users.manage'),
  validate(capacitySettingsSchema),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      
      const settings = await resourceCapacityService.upsertCapacitySettings(req.body, userId)
      
      log.info('[CAPACITY] Upserted capacity settings', { 
        settingsId: settings.id,
        targetUserId: req.body.userId
      })
      
      res.status(201).json({
        success: true,
        data: settings
      })
    } catch (error: any) {
      log.error('[CAPACITY] Failed to upsert capacity settings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to save capacity settings',
        message: error.message
      })
    }
  }
)

/**
 * DELETE /api/resource-capacity/settings/:settingsId
 * Deactivate capacity settings
 */
router.delete('/settings/:settingsId',
  authenticateToken,
  requirePermission('users.manage'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { settingsId } = req.params
      
      const success = await resourceCapacityService.deactivateCapacitySettings(settingsId)
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Capacity settings not found'
        })
      }
      
      log.info('[CAPACITY] Deactivated capacity settings', { settingsId })
      
      res.json({
        success: true,
        message: 'Capacity settings deactivated'
      })
    } catch (error: any) {
      log.error('[CAPACITY] Failed to deactivate capacity settings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate capacity settings',
        message: error.message
      })
    }
  }
)

// ================================================================
// CHECKLIST ITEMS ROUTES
// ================================================================

/**
 * GET /api/resource-capacity/tasks/:taskId/checklist
 * Get checklist items for a task
 */
router.get('/tasks/:taskId/checklist',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { taskId } = req.params
      
      const items = await resourceCapacityService.getChecklistItems(taskId)
      
      log.info('[CHECKLIST] Retrieved checklist items', { taskId, count: items.length })
      
      res.json({
        success: true,
        data: items,
        count: items.length
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to get checklist items:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve checklist items',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/resource-capacity/tasks/:taskId/checklist
 * Create a checklist item
 */
router.post('/tasks/:taskId/checklist',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(checklistItemSchema),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { taskId } = req.params
      const userId = (req as any).user!.id
      
      const item = await resourceCapacityService.createChecklistItem(
        { ...req.body, taskId },
        userId
      )
      
      log.info('[CHECKLIST] Created checklist item', { taskId, itemId: item.id })
      
      res.status(201).json({
        success: true,
        data: item
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to create checklist item:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create checklist item',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/resource-capacity/checklist/:itemId
 * Update a checklist item
 */
router.put('/checklist/:itemId',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(checklistItemUpdateSchema),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { itemId } = req.params
      const userId = (req as any).user!.id
      
      const item = await resourceCapacityService.updateChecklistItem(itemId, req.body, userId)
      
      log.info('[CHECKLIST] Updated checklist item', { itemId })
      
      res.json({
        success: true,
        data: item
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to update checklist item:', error)
      
      if (error.message === 'Checklist item not found') {
        return res.status(404).json({
          success: false,
          error: 'Checklist item not found'
        })
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update checklist item',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/resource-capacity/checklist/:itemId/toggle
 * Toggle checklist item completion
 */
router.post('/checklist/:itemId/toggle',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { itemId } = req.params
      const userId = (req as any).user!.id
      
      const item = await resourceCapacityService.toggleChecklistItem(itemId, userId)
      
      log.info('[CHECKLIST] Toggled checklist item', { itemId, isCompleted: item.isCompleted })
      
      res.json({
        success: true,
        data: item
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to toggle checklist item:', error)
      
      if (error.message === 'Checklist item not found') {
        return res.status(404).json({
          success: false,
          error: 'Checklist item not found'
        })
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to toggle checklist item',
        message: error.message
      })
    }
  }
)

/**
 * DELETE /api/resource-capacity/checklist/:itemId
 * Delete a checklist item
 */
router.delete('/checklist/:itemId',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { itemId } = req.params
      
      const success = await resourceCapacityService.deleteChecklistItem(itemId)
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Checklist item not found'
        })
      }
      
      log.info('[CHECKLIST] Deleted checklist item', { itemId })
      
      res.json({
        success: true,
        message: 'Checklist item deleted'
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to delete checklist item:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete checklist item',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/resource-capacity/tasks/:taskId/checklist/reorder
 * Reorder checklist items
 */
router.post('/tasks/:taskId/checklist/reorder',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(reorderSchema),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { taskId } = req.params
      const { items } = req.body
      
      await resourceCapacityService.reorderChecklistItems(taskId, items)
      
      log.info('[CHECKLIST] Reordered checklist items', { taskId, count: items.length })
      
      res.json({
        success: true,
        message: 'Checklist items reordered'
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to reorder checklist items:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to reorder checklist items',
        message: error.message
      })
    }
  }
)

// ================================================================
// UNAVAILABILITY ROUTES
// ================================================================

/**
 * GET /api/resource-capacity/unavailability
 * Get unavailability records for current user or all (for managers)
 */
router.get('/unavailability',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const currentUserId = (req as any).user!.id
      const requestedUserId = req.query.user_id as string
      const hasManagerPermission = (req as any).user?.permissions?.includes('users.view')
      
      // Non-managers can only see their own
      const userId = hasManagerPermission && requestedUserId ? requestedUserId : currentUserId
      
      const filters = {
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        status: req.query.status as string
      }
      
      const records = await resourceCapacityService.getUnavailability(userId, filters)
      
      res.json({
        success: true,
        data: records,
        count: records.length
      })
    } catch (error: any) {
      log.error('[UNAVAILABILITY] Failed to get unavailability:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve unavailability records',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/unavailability/pending
 * Get all pending unavailability requests (for managers)
 */
router.get('/unavailability/pending',
  authenticateToken,
  requirePermission('users.manage'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const requests = await resourceCapacityService.getPendingUnavailabilityRequests()
      
      log.info('[UNAVAILABILITY] Retrieved pending requests', { count: requests.length })
      
      res.json({
        success: true,
        data: requests,
        count: requests.length
      })
    } catch (error: any) {
      log.error('[UNAVAILABILITY] Failed to get pending requests:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending requests',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/resource-capacity/unavailability
 * Create unavailability record
 */
router.post('/unavailability',
  authenticateToken,
  validate(unavailabilitySchema),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const currentUserId = (req as any).user!.id
      const hasManagerPermission = (req as any).user?.permissions?.includes('users.manage')
      
      // Non-managers can only create for themselves
      if (!hasManagerPermission && req.body.userId !== currentUserId) {
        return res.status(403).json({
          success: false,
          error: 'You can only create unavailability records for yourself'
        })
      }
      
      const record = await resourceCapacityService.createUnavailability(req.body, currentUserId)
      
      log.info('[UNAVAILABILITY] Created unavailability record', { 
        recordId: record.id,
        userId: req.body.userId,
        type: req.body.unavailabilityType
      })
      
      res.status(201).json({
        success: true,
        data: record
      })
    } catch (error: any) {
      log.error('[UNAVAILABILITY] Failed to create unavailability:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create unavailability record',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/resource-capacity/unavailability/:id/status
 * Approve or reject unavailability request
 */
router.put('/unavailability/:id/status',
  authenticateToken,
  requirePermission('users.manage'),
  validate(Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'cancelled').required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { status } = req.body
      const userId = (req as any).user!.id
      
      const record = await resourceCapacityService.updateUnavailabilityStatus(id, status, userId)
      
      log.info('[UNAVAILABILITY] Updated unavailability status', { recordId: id, status })
      
      res.json({
        success: true,
        data: record
      })
    } catch (error: any) {
      log.error('[UNAVAILABILITY] Failed to update status:', error)
      
      if (error.message === 'Unavailability record not found') {
        return res.status(404).json({
          success: false,
          error: 'Unavailability record not found'
        })
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update unavailability status',
        message: error.message
      })
    }
  }
)

/**
 * DELETE /api/resource-capacity/unavailability/:id
 * Delete unavailability record
 */
router.delete('/unavailability/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      
      const success = await resourceCapacityService.deleteUnavailability(id)
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Unavailability record not found'
        })
      }
      
      log.info('[UNAVAILABILITY] Deleted unavailability record', { recordId: id })
      
      res.json({
        success: true,
        message: 'Unavailability record deleted'
      })
    } catch (error: any) {
      log.error('[UNAVAILABILITY] Failed to delete unavailability:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete unavailability record',
        message: error.message
      })
    }
  }
)

// ================================================================
// UTILIZATION QUERY ROUTES
// ================================================================

/**
 * GET /api/resource-capacity/utilization/portfolio
 * Get portfolio-level resource utilization
 */
router.get('/utilization/portfolio',
  authenticateToken,
  requirePermission('analytics.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const utilization = await resourceCapacityService.getPortfolioUtilization()
      
      log.info('[UTILIZATION] Retrieved portfolio utilization', { count: utilization.length })
      
      res.json({
        success: true,
        data: utilization,
        count: utilization.length
      })
    } catch (error: any) {
      log.error('[UTILIZATION] Failed to get portfolio utilization:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve portfolio utilization',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/utilization/portfolio/summary
 * Get portfolio capacity summary statistics
 */
router.get('/utilization/portfolio/summary',
  authenticateToken,
  requirePermission('analytics.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const summary = await resourceCapacityService.getPortfolioSummary()
      
      log.info('[UTILIZATION] Retrieved portfolio summary')
      
      res.json({
        success: true,
        data: summary
      })
    } catch (error: any) {
      log.error('[UTILIZATION] Failed to get portfolio summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve portfolio summary',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/utilization/program/:programId
 * Get program-level resource summary
 */
router.get('/utilization/program/:programId',
  authenticateToken,
  requirePermission('programs.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { programId } = req.params
      
      const summary = await resourceCapacityService.getProgramResourceSummary(programId)
      
      log.info('[UTILIZATION] Retrieved program resource summary', { programId, count: summary.length })
      
      res.json({
        success: true,
        data: summary,
        count: summary.length
      })
    } catch (error: any) {
      log.error('[UTILIZATION] Failed to get program resource summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve program resource summary',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/utilization/project/:projectId
 * Get project-level resource summary
 */
router.get('/utilization/project/:projectId',
  authenticateToken,
  requirePermission('projects.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      
      const summary = await resourceCapacityService.getProjectResourceSummary(projectId)
      
      log.info('[UTILIZATION] Retrieved project resource summary', { projectId, count: summary.length })
      
      res.json({
        success: true,
        data: summary,
        count: summary.length
      })
    } catch (error: any) {
      log.error('[UTILIZATION] Failed to get project resource summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve project resource summary',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/utilization/user/:userId
 * Get detailed utilization for a specific user
 */
router.get('/utilization/user/:userId',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { userId } = req.params
      const currentUserId = (req as any).user!.id
      
      // Users can view their own details, managers can view all
      const hasPermission = userId === currentUserId || (req as any).user?.permissions?.includes('users.view')
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }
      
      const details = await resourceCapacityService.getUserUtilizationDetails(userId)
      
      log.info('[UTILIZATION] Retrieved user utilization details', { userId })
      
      res.json({
        success: true,
        data: details
      })
    } catch (error: any) {
      log.error('[UTILIZATION] Failed to get user utilization details:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user utilization details',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/resource-capacity/utilization/me
 * Get current user's utilization
 */
router.get('/utilization/me',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      
      const details = await resourceCapacityService.getUserUtilizationDetails(userId)
      
      log.info('[UTILIZATION] Retrieved current user utilization', { userId })
      
      res.json({
        success: true,
        data: details
      })
    } catch (error: any) {
      log.error('[UTILIZATION] Failed to get current user utilization:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve utilization details',
        message: error.message
      })
    }
  }
)

// ================================================================
// TASKS AND RESOURCES ROUTES
// ================================================================

/**
 * GET /api/resource-capacity/tasks
 * Get all tasks with resource assignments
 */
router.get('/tasks',
  authenticateToken,
  requirePermission('projects.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const filters = {
        projectId: req.query.project_id as string,
        userId: req.query.user_id as string,
        status: req.query.status as string
      }
      
      const tasks = await resourceCapacityService.getAllTasksWithResources(filters)
      
      log.info('[TASKS] Retrieved tasks with resources', { count: tasks.length, filters })
      
      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      })
    } catch (error: any) {
      log.error('[TASKS] Failed to get tasks with resources:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tasks',
        message: error.message
      })
    }
  }
)

// ================================================================
// CHECKLIST ITEMS (PORTFOLIO VIEW) ROUTES
// ================================================================

/**
 * GET /api/resource-capacity/checklist
 * Get all checklist items with resource assignments
 */
router.get('/checklist',
  authenticateToken,
  requirePermission('projects.view'),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const filters = {
        projectId: req.query.project_id as string,
        taskId: req.query.task_id as string,
        userId: req.query.user_id as string,
        isCompleted: req.query.is_completed === 'true' ? true : req.query.is_completed === 'false' ? false : undefined
      }
      
      const items = await resourceCapacityService.getAllChecklistItemsWithResources(filters)
      
      log.info('[CHECKLIST] Retrieved all checklist items with resources', { count: items.length, filters })
      
      res.json({
        success: true,
        data: items,
        count: items.length
      })
    } catch (error: any) {
      log.error('[CHECKLIST] Failed to get all checklist items:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve checklist items',
        message: error.message
      })
    }
  }
)

export default router

