/**
 * Task Management Routes
 * 
 * API endpoints for:
 * - WBS import from AI-extracted documents
 * - Task CRUD operations
 * - Resource scheduling and assignment
 * - Task variance reporting
 * 
 * Migration: 208_tasks_scheduling_wbs_import.sql
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import * as wbsImportService from '../services/wbsImportService'
import * as taskManagementService from '../services/taskManagementService'
import * as taskSchedulingService from '../services/taskSchedulingService'

const router = express.Router()

// ================================================================
// WBS IMPORT FROM AI EXTRACTION
// ================================================================

/**
 * POST /api/tasks/import-wbs
 * Import WBS from AI-extracted entities to project tasks
 */
router.post('/import-wbs',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    projectId: Joi.string().uuid().required(),
    documentId: Joi.string().uuid().optional(),
    useProjectEntities: Joi.boolean().optional(),
    options: Joi.object({
      createHierarchy: Joi.boolean().optional(),
      importDependencies: Joi.boolean().optional(),
      autoMatchRoles: Joi.boolean().optional(),
      overwriteExisting: Joi.boolean().optional()
    }).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const { projectId, documentId, useProjectEntities, options } = req.body
      
      // Import from project-level entities if useProjectEntities is true
      const result = await wbsImportService.importWBSFromProjectEntities(
        projectId,
        userId,
        options || {}
      )
      
      res.status(201).json({
        success: true,
        data: result,
        message: `Imported ${result.tasksCreated} tasks from extracted entities`
      })
    } catch (error: any) {
      log.error('WBS import failed', error)
      res.status(500).json({ 
        error: error.message || 'Failed to import WBS'
      })
    }
  }
)

/**
 * GET /api/tasks/wbs-import-history/:projectId
 * Get WBS import history for a project
 */
router.get('/wbs-import-history/:projectId',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const history = await wbsImportService.getWBSImportHistory(req.params.projectId)
      
      res.json({ success: true, data: history })
    } catch (error) {
      log.error('Failed to get WBS import history', error)
      res.status(500).json({ error: 'Failed to get import history' })
    }
  }
)

// ================================================================
// TASK MANAGEMENT
// ================================================================

/**
 * GET /api/tasks/project/:projectId
 * Get all tasks for a project
 */
router.get('/project/:projectId',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const filters = {
        status: req.query.status as string | undefined,
        phase: req.query.phase as string | undefined,
        assignedToUserId: req.query.assignedTo as string | undefined,
        parentTaskId: req.query.parentId as string | undefined
      }
      
      const tasks = await taskManagementService.getProjectTasks(req.params.projectId, filters)
      
      res.json({ success: true, data: tasks })
    } catch (error) {
      log.error('Failed to get project tasks', error)
      res.status(500).json({ error: 'Failed to get tasks' })
    }
  }
)

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const task = await taskManagementService.getTaskById(req.params.id)
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }
      
      res.json({ success: true, data: task })
    } catch (error) {
      log.error('Failed to get task', error)
      res.status(500).json({ error: 'Failed to get task' })
    }
  }
)

/**
 * POST /api/tasks
 * Create new task
 */
router.post('/',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    projectId: Joi.string().uuid().required(),
    taskName: Joi.string().max(255).required(),
    description: Joi.string().optional(),
    estimatedHours: Joi.number().min(0).optional(),
    requiredRoleId: Joi.string().uuid().optional(),
    plannedStartDate: Joi.date().optional(),
    plannedEndDate: Joi.date().optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    phase: Joi.string().optional(),
    parentTaskId: Joi.string().uuid().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const task = await taskManagementService.createTask(req.body, userId)
      
      res.status(201).json({ success: true, data: task })
    } catch (error) {
      log.error('Failed to create task', error)
      res.status(500).json({ error: 'Failed to create task' })
    }
  }
)

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put('/:id',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    taskName: Joi.string().max(255).optional(),
    description: Joi.string().optional(),
    estimatedHours: Joi.number().min(0).optional(),
    requiredRoleId: Joi.string().uuid().optional(),
    plannedStartDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().isoDate(),
      Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
    ).optional().allow(null),
    plannedEndDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().isoDate(),
      Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
    ).optional().allow(null),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    phase: Joi.string().optional().allow('', null),
    category: Joi.string().optional().allow('', null),
    status: Joi.string().valid('planned', 'scheduled', 'in_progress', 'in-progress', 'completed', 'blocked', 'on-hold', 'cancelled').optional(),
    percentComplete: Joi.number().min(0).max(100).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const task = await taskManagementService.updateTask(req.params.id, req.body)
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }
      
      res.json({ success: true, data: task })
    } catch (error) {
      log.error('Failed to update task', error)
      res.status(500).json({ error: 'Failed to update task' })
    }
  }
)

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await taskManagementService.deleteTask(req.params.id)
      
      res.json({ success: true, message: 'Task deleted' })
    } catch (error) {
      log.error('Failed to delete task', error)
      res.status(500).json({ error: 'Failed to delete task' })
    }
  }
)

/**
 * PUT /api/tasks/:id/progress
 * Update task progress
 */
router.put('/:id/progress',
  authenticateToken,
  validate(Joi.object({
    percentComplete: Joi.number().min(0).max(100).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await taskManagementService.updateTaskProgress(
        req.params.id,
        req.body.percentComplete
      )
      
      res.json({ success: true, message: 'Task progress updated' })
    } catch (error) {
      log.error('Failed to update task progress', error)
      res.status(500).json({ error: 'Failed to update progress' })
    }
  }
)

/**
 * POST /api/tasks/:id/log-hours
 * Log hours worked on a task
 */
router.post('/:id/log-hours',
  authenticateToken,
  validate(Joi.object({
    actual_hours: Joi.number().min(0).required(),
    date: Joi.string().isoDate().optional(),
    notes: Joi.string().optional().allow('', null)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const taskId = req.params.id
      const { actual_hours, date, notes } = req.body
      
      // Get current task to check existing actual_hours
      const task = await taskManagementService.getTaskById(taskId)
      if (!task) {
        return res.status(404).json({ error: 'Task not found' })
      }
      
      // Add the new hours to existing actual_hours (or set if null)
      const currentHours = task.actualHours || task.actual_hours || 0
      const newHours = currentHours + actual_hours
      
      // Since updateTask doesn't support actualHours yet, let's update it directly
      await pool.query(
        'UPDATE project_tasks SET actual_hours = $1, updated_at = NOW() WHERE id = $2',
        [newHours, taskId]
      )
      
      log.info('Hours logged to task', { taskId, hours: actual_hours, totalHours: newHours })
      
      res.json({ 
        success: true, 
        data: { 
          taskId,
          hoursLogged: actual_hours,
          totalHours: newHours
        },
        message: `Logged ${actual_hours} hours to task`
      })
    } catch (error: any) {
      log.error('Failed to log hours', error)
      res.status(500).json({ error: error.message || 'Failed to log hours' })
    }
  }
)

// ================================================================
// RESOURCE SCHEDULING & ASSIGNMENT
// ================================================================

/**
 * POST /api/tasks/:id/assign
 * Assign resource to task
 */
router.post('/:id/assign',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    resourceAssignmentId: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().pattern(/^stakeholder-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ).required(),
    plannedHours: Joi.number().min(0.1).required(),
    scheduledStartDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().isoDate(),
      Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
    ).optional().allow(null),
    scheduledEndDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().isoDate(),
      Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
    ).optional().allow(null),
    allocationPercentage: Joi.number().min(0).max(100).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      
      // Parse date strings to Date objects (handle timezone issues)
      const parseDate = (dateStr: string | Date | null | undefined): Date | undefined => {
        if (!dateStr || dateStr === '') return undefined
        if (dateStr instanceof Date) return dateStr
        if (typeof dateStr === 'string') {
          // Parse YYYY-MM-DD as local date to avoid timezone issues
          const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
          if (match) {
            const year = parseInt(match[1], 10)
            const month = parseInt(match[2], 10) - 1 // JavaScript months are 0-indexed
            const day = parseInt(match[3], 10)
            return new Date(year, month, day)
          }
          // Fallback for other formats
          return new Date(dateStr)
        }
        return undefined
      }
      
      const assignment = await taskSchedulingService.assignResourceToTask(
        req.params.id,
        req.body.resourceAssignmentId,
        req.body.plannedHours,
        userId,
        {
          scheduledStartDate: parseDate(req.body.scheduledStartDate),
          scheduledEndDate: parseDate(req.body.scheduledEndDate),
          allocationPercentage: req.body.allocationPercentage
        }
      )
      
      res.status(201).json({ success: true, data: assignment })
    } catch (error) {
      log.error('Failed to assign resource', error)
      res.status(500).json({ error: 'Failed to assign resource to task' })
    }
  }
)

/**
 * GET /api/tasks/:id/assignments
 * Get resource assignments for a task
 */
router.get('/:id/assignments',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const assignments = await taskSchedulingService.getTaskAssignments(req.params.id)
      
      res.json({ success: true, data: assignments })
    } catch (error) {
      log.error('Failed to get task assignments', error)
      res.status(500).json({ error: 'Failed to get assignments' })
    }
  }
)

/**
 * GET /api/tasks/:id/suggest-resources
 * Get suggested resources for task assignment
 */
router.get('/:id/suggest-resources',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const limit = parseInt(req.query.limit as string) || 5
      const suggestions = await taskSchedulingService.suggestResourcesForTask(
        req.params.id,
        limit
      )
      
      res.json({ success: true, data: suggestions })
    } catch (error) {
      log.error('Failed to get resource suggestions', error)
      res.status(500).json({ error: 'Failed to get suggestions' })
    }
  }
)

/**
 * DELETE /api/tasks/assignments/:assignmentId
 * Unassign resource from task
 */
router.delete('/assignments/:assignmentId',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      await taskSchedulingService.unassignResourceFromTask(req.params.assignmentId)
      
      res.json({ success: true, message: 'Resource unassigned from task' })
    } catch (error: any) {
      log.error('Failed to unassign resource', error)
      res.status(error.message?.includes('approved time entries') ? 400 : 500)
         .json({ error: error.message || 'Failed to unassign resource' })
    }
  }
)

// ================================================================
// MY TASKS (Employee View)
// ================================================================

/**
 * GET /api/tasks/my-tasks
 * Get tasks assigned to current user
 */
router.get('/my-tasks',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user?.id
      const filters = {
        projectId: req.query.projectId as string | undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      }
      
      const tasks = await taskSchedulingService.getMyAssignedTasks(userId, filters)
      
      res.json({ success: true, data: tasks })
    } catch (error) {
      log.error('Failed to get my tasks', error)
      res.status(500).json({ error: 'Failed to get tasks' })
    }
  }
)

// ================================================================
// RESOURCE WORKLOAD & CAPACITY
// ================================================================

/**
 * GET /api/tasks/resource-workload
 * Get resource workload summary
 */
router.get('/resource-workload',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const projectId = req.query.projectId as string | undefined
      const userId = req.query.userId as string | undefined
      
      const workload = await taskSchedulingService.getResourceWorkload(projectId, userId)
      
      res.json({ success: true, data: workload })
    } catch (error) {
      log.error('Failed to get resource workload', error)
      res.status(500).json({ error: 'Failed to get workload' })
    }
  }
)

/**
 * POST /api/tasks/check-availability
 * Check if resource has availability for task
 */
router.post('/check-availability',
  authenticateToken,
  validate(Joi.object({
    userId: Joi.string().uuid().required(),
    projectId: Joi.string().uuid().required(),
    requiredHours: Joi.number().min(0).required(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const availability = await taskSchedulingService.checkResourceAvailability(
        req.body.userId,
        req.body.projectId,
        req.body.requiredHours,
        req.body.startDate,
        req.body.endDate
      )
      
      res.json({ success: true, data: availability })
    } catch (error) {
      log.error('Failed to check availability', error)
      res.status(500).json({ error: 'Failed to check availability' })
    }
  }
)

// ================================================================
// TASK HIERARCHY & DEPENDENCIES
// ================================================================

/**
 * GET /api/tasks/project/:projectId/hierarchy
 * Get task hierarchy for WBS display
 */
router.get('/project/:projectId/hierarchy',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const hierarchy = await taskManagementService.getTaskHierarchy(req.params.projectId)
      
      res.json({ success: true, data: hierarchy })
    } catch (error) {
      log.error('Failed to get task hierarchy', error)
      res.status(500).json({ error: 'Failed to get hierarchy' })
    }
  }
)

/**
 * GET /api/tasks/:id/dependencies
 * Get task dependencies
 */
router.get('/:id/dependencies',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const dependencies = await taskManagementService.getTaskDependencies(req.params.id)
      
      res.json({ success: true, data: dependencies })
    } catch (error) {
      log.error('Failed to get dependencies', error)
      res.status(500).json({ error: 'Failed to get dependencies' })
    }
  }
)

/**
 * POST /api/tasks/:id/dependencies
 * Create task dependency
 */
router.post('/:id/dependencies',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    dependsOnTaskId: Joi.string().uuid().required(),
    dependencyType: Joi.string().valid(
      'finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish'
    ).optional(),
    lagDays: Joi.number().integer().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Use addTaskDependency which has validation (prevents circular deps, self-deps, etc.)
      const dependency = await taskManagementService.addTaskDependency(
        req.params.id,
        req.body.dependsOnTaskId,
        req.body.dependencyType || 'finish-to-start',
        req.body.lagDays || 0
      )
      
      res.status(201).json({ success: true, data: dependency })
    } catch (error: any) {
      log.error('Failed to create dependency', error)
      res.status(500).json({ 
        error: error.message || 'Failed to create dependency' 
      })
    }
  }
)

/**
 * DELETE /api/tasks/:id/dependencies/:dependencyId
 * Remove task dependency
 */
router.delete('/:id/dependencies/:dependencyId',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const removed = await taskManagementService.removeTaskDependency(req.params.dependencyId)
      
      if (!removed) {
        return res.status(404).json({ error: 'Dependency not found' })
      }
      
      res.json({ success: true, message: 'Dependency removed successfully' })
    } catch (error: any) {
      log.error('Failed to remove dependency', error)
      res.status(500).json({ 
        error: error.message || 'Failed to remove dependency' 
      })
    }
  }
)

// ================================================================
// TASK ROLE ASSIGNMENTS (Multiple Roles Per Task)
// Migration: 209_stakeholder_role_skills_integration.sql
// ================================================================

/**
 * POST /api/tasks/:id/roles
 * Assign role to task
 */
router.post('/:id/roles',
  authenticateToken,
  requirePermission('projects.manage'),
  validate(Joi.object({
    roleId: Joi.string().uuid().required(),
    roleType: Joi.string().valid('owner', 'executor', 'reviewer', 'approver', 'consultant').optional(),
    isPrimary: Joi.boolean().optional(),
    requiredCount: Joi.number().integer().min(1).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: taskId } = req.params
      const { roleId, roleType, isPrimary, requiredCount } = req.body

      const taskRole = await taskManagementService.assignRoleToTask(
        taskId,
        roleId,
        roleType || 'owner',
        {
          isPrimary,
          requiredCount
        }
      )

      log.info(`Role ${roleId} assigned to task ${taskId}`)

      res.status(201).json({
        success: true,
        data: taskRole
      })
    } catch (error: any) {
      log.error('Failed to assign role to task', error)
      if (error.message?.includes('not found')) {
        return res.status(404).json({ error: error.message })
      }
      if (error.message?.includes('already assigned')) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: 'Failed to assign role to task' })
    }
  }
)

/**
 * GET /api/tasks/:id/roles
 * Get roles assigned to a task
 */
router.get('/:id/roles',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: taskId } = req.params
      const taskRoles = await taskManagementService.getTaskRoles(taskId)

      res.json({
        success: true,
        data: taskRoles,
        count: taskRoles.length
      })
    } catch (error) {
      log.error('Failed to get task roles', error)
      res.status(500).json({ error: 'Failed to get task roles' })
    }
  }
)

/**
 * DELETE /api/tasks/:id/roles/:roleId
 * Remove role from task
 */
router.delete('/:id/roles/:roleId',
  authenticateToken,
  requirePermission('projects.manage'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: taskId, roleId } = req.params
      const roleType = req.query.roleType as string | undefined

      const removed = await taskManagementService.removeRoleFromTask(
        taskId,
        roleId,
        roleType
      )

      if (!removed) {
        return res.status(404).json({ error: 'Role assignment not found' })
      }

      log.info(`Role ${roleId} removed from task ${taskId}`)

      res.json({
        success: true,
        message: 'Role removed from task successfully'
      })
    } catch (error) {
      log.error('Failed to remove role from task', error)
      res.status(500).json({ error: 'Failed to remove role from task' })
    }
  }
)

/**
 * GET /api/tasks/:id/suggested-stakeholders
 * Get stakeholders matching task roles with skill match percentages
 */
router.get('/:id/suggested-stakeholders',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: taskId } = req.params
      const suggestions = await taskManagementService.suggestStakeholdersForTask(taskId)

      res.json({
        success: true,
        data: suggestions,
        count: suggestions.length
      })
    } catch (error) {
      log.error('Failed to get suggested stakeholders', error)
      res.status(500).json({ error: 'Failed to get suggested stakeholders' })
    }
  }
)

/**
 * GET /api/tasks/:id/skill-gaps
 * Identify missing skills for task completion
 */
router.get('/:id/skill-gaps',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: taskId } = req.params
      const gaps = await taskManagementService.getSkillGapsForTask(taskId)

      res.json({
        success: true,
        data: gaps,
        count: gaps.length
      })
    } catch (error) {
      log.error('Failed to get skill gaps', error)
      res.status(500).json({ error: 'Failed to get skill gaps' })
    }
  }
)

export default router

