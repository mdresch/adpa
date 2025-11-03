/**
 * Task Scheduling Service
 * 
 * Assigns resources (people) to tasks with planned hours
 * Auto-suggests best-fit resources based on role, availability, and cost
 * 
 * Features:
 * - Assign employees to tasks
 * - Calculate planned cost (hours × rate)
 * - Check resource availability
 * - Suggest optimal resource assignments
 * - Track resource utilization
 * 
 * Migration: 208_tasks_scheduling_wbs_import.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface TaskAssignment {
  id?: string
  taskId: string
  resourceAssignmentId: string
  userId: string
  userName?: string
  roleId?: string
  roleName?: string
  plannedHours: number
  hourlyRate: number
  plannedCost?: number
  scheduledStartDate?: Date
  scheduledEndDate?: Date
  allocationPercentage?: number
  actualHours?: number
  actualCost?: number
  percentComplete?: number
  status?: string
}

export interface ResourceSuggestion {
  userId: string
  userName: string
  email: string
  roleId: string
  roleName: string
  hourlyRate: number
  availableHours: number
  allocationPercentage: number
  currentWorkload: number
  efficiency: number
  matchScore: number
  recommendation: string
}

/**
 * Assign resource to task
 */
export async function assignResourceToTask(
  taskId: string,
  resourceAssignmentId: string,
  plannedHours: number,
  userId: string,
  options?: {
    scheduledStartDate?: Date
    scheduledEndDate?: Date
    allocationPercentage?: number
  }
): Promise<TaskAssignment> {
  try {
    // Get resource assignment details (role, rate, etc.)
    const resourceResult = await pool.query(`
      SELECT 
        pra.user_id,
        pra.hourly_rate,
        pra.role_id,
        u.name as user_name,
        pr.role_name
      FROM project_resource_assignments pra
      JOIN users u ON pra.user_id = u.id
      JOIN project_roles pr ON pra.role_id = pr.id
      WHERE pra.id = $1
    `, [resourceAssignmentId])
    
    if (resourceResult.rows.length === 0) {
      throw new Error('Resource assignment not found')
    }
    
    const resource = resourceResult.rows[0]
    const plannedCost = plannedHours * resource.hourly_rate
    
    // Create task assignment
    const result = await pool.query(`
      INSERT INTO task_assignments (
        task_id,
        resource_assignment_id,
        user_id,
        user_name,
        role_id,
        role_name,
        planned_hours,
        hourly_rate,
        planned_cost,
        scheduled_start_date,
        scheduled_end_date,
        allocation_percentage,
        assigned_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        task_id as "taskId",
        user_id as "userId",
        user_name as "userName",
        planned_hours as "plannedHours",
        planned_cost as "plannedCost"
    `, [
      taskId,
      resourceAssignmentId,
      resource.user_id,
      resource.user_name,
      resource.role_id,
      resource.role_name,
      plannedHours,
      resource.hourly_rate,
      plannedCost,
      options?.scheduledStartDate,
      options?.scheduledEndDate,
      options?.allocationPercentage || 100,
      userId
    ])
    
    const assignment = result.rows[0]
    
    logger.info('Resource assigned to task', {
      taskId,
      userId: resource.user_id,
      plannedHours,
      plannedCost
    })
    
    return assignment
  } catch (error) {
    logger.error('assignResourceToTask error', { error, taskId })
    throw error
  }
}

/**
 * Get resource assignments for a task
 */
export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  try {
    const result = await pool.query(`
      SELECT 
        ta.id,
        ta.task_id as "taskId",
        ta.user_id as "userId",
        ta.user_name as "userName",
        ta.role_name as "roleName",
        ta.planned_hours as "plannedHours",
        ta.hourly_rate as "hourlyRate",
        ta.planned_cost as "plannedCost",
        ta.actual_hours as "actualHours",
        ta.actual_cost as "actualCost",
        ta.hours_variance as "hoursVariance",
        ta.cost_variance as "costVariance",
        ta.efficiency_percent as "efficiencyPercent",
        ta.percent_complete as "percentComplete",
        ta.status,
        ta.scheduled_start_date as "scheduledStartDate",
        ta.scheduled_end_date as "scheduledEndDate"
      FROM task_assignments ta
      WHERE ta.task_id = $1
      ORDER BY ta.assigned_at
    `, [taskId])
    
    return result.rows
  } catch (error) {
    logger.error('getTaskAssignments error', { error, taskId })
    throw error
  }
}

/**
 * Suggest best resources for a task based on role, availability, and cost
 */
export async function suggestResourcesForTask(
  taskId: string,
  limit: number = 5
): Promise<ResourceSuggestion[]> {
  try {
    // Get task details
    const taskResult = await pool.query(`
      SELECT 
        t.project_id,
        t.required_role_id,
        t.required_role_name,
        t.estimated_hours
      FROM project_tasks t
      WHERE t.id = $1
    `, [taskId])
    
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found')
    }
    
    const task = taskResult.rows[0]
    
    // Find available resources with matching role
    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email,
        pr.id as role_id,
        pr.role_name,
        pra.hourly_rate,
        pra.allocation_percentage,
        
        -- Calculate available hours
        COALESCE(pra.estimated_hours, 0) - COALESCE(pra.actual_hours, 0) as available_hours,
        
        -- Current workload
        (
          SELECT COALESCE(SUM(ta2.planned_hours), 0)
          FROM task_assignments ta2
          WHERE ta2.user_id = u.id 
            AND ta2.status IN ('scheduled', 'in-progress')
        ) as current_planned_hours,
        
        -- Historical efficiency
        (
          SELECT 
            CASE WHEN SUM(ta3.actual_hours) > 0 
            THEN (SUM(ta3.planned_hours) / SUM(ta3.actual_hours)) * 100
            ELSE 100
            END
          FROM task_assignments ta3
          WHERE ta3.user_id = u.id 
            AND ta3.status = 'completed'
            AND ta3.actual_hours > 0
        ) as avg_efficiency_percent
        
      FROM project_resource_assignments pra
      JOIN users u ON pra.user_id = u.id
      JOIN project_roles pr ON pra.role_id = pr.id
      WHERE pra.project_id = $1
        AND pra.status = 'active'
        AND (
          pra.role_id = $2 
          OR pr.role_name ILIKE $3
          OR $2 IS NULL
        )
      ORDER BY 
        -- Prioritize: role match, availability, low cost, high efficiency
        CASE WHEN pra.role_id = $2 THEN 1 ELSE 2 END,
        (COALESCE(pra.estimated_hours, 0) - COALESCE(pra.actual_hours, 0)) DESC,
        pra.hourly_rate ASC
      LIMIT $4
    `, [
      task.project_id,
      task.required_role_id,
      task.required_role_name || '%',
      limit
    ])
    
    // Calculate match score for each suggestion
    const suggestions: ResourceSuggestion[] = result.rows.map((row: any) => {
      const availableHours = parseFloat(row.available_hours) || 0
      const efficiency = parseFloat(row.avg_efficiency_percent) || 100
      const currentWorkload = parseFloat(row.current_planned_hours) || 0
      
      // Calculate match score (0-100)
      let matchScore = 0
      
      // Role match (40 points)
      if (row.role_id === task.required_role_id) {
        matchScore += 40
      } else if (task.required_role_name && 
                 row.role_name.toLowerCase().includes(task.required_role_name.toLowerCase())) {
        matchScore += 20
      }
      
      // Availability (30 points)
      if (availableHours >= (task.estimated_hours || 0)) {
        matchScore += 30
      } else if (availableHours > 0) {
        matchScore += 15
      }
      
      // Efficiency (20 points)
      if (efficiency >= 100) matchScore += 20
      else if (efficiency >= 90) matchScore += 15
      else if (efficiency >= 80) matchScore += 10
      
      // Low workload (10 points)
      if (currentWorkload < 40) matchScore += 10
      else if (currentWorkload < 80) matchScore += 5
      
      // Recommendation
      let recommendation = 'Good fit'
      if (matchScore >= 80) recommendation = 'Excellent match - Recommended'
      else if (matchScore >= 60) recommendation = 'Good match'
      else if (matchScore >= 40) recommendation = 'Acceptable match'
      else recommendation = 'Poor match - Consider alternatives'
      
      return {
        userId: row.user_id,
        userName: row.user_name,
        email: row.email,
        roleId: row.role_id,
        roleName: row.role_name,
        hourlyRate: parseFloat(row.hourly_rate),
        availableHours,
        allocationPercentage: parseFloat(row.allocation_percentage) || 100,
        currentWorkload,
        efficiency,
        matchScore,
        recommendation
      }
    })
    
    return suggestions
  } catch (error) {
    logger.error('suggestResourcesForTask error', { error, taskId })
    throw error
  }
}

/**
 * Get my assigned tasks (for employee timesheet view)
 */
export async function getMyAssignedTasks(
  userId: string,
  filters?: {
    projectId?: string
    status?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<any[]> {
  try {
    let query = `
      SELECT 
        ta.*,
        t.task_number,
        t.task_name,
        t.wbs_code,
        t.description as task_description,
        t.phase,
        p.id as project_id,
        p.name as project_name
      FROM task_assignments ta
      JOIN project_tasks t ON ta.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE ta.user_id = $1
    `
    
    const params: any[] = [userId]
    let paramIndex = 2
    
    if (filters?.projectId) {
      query += ` AND t.project_id = $${paramIndex++}`
      params.push(filters.projectId)
    }
    
    if (filters?.status) {
      query += ` AND ta.status = $${paramIndex++}`
      params.push(filters.status)
    }
    
    if (filters?.startDate) {
      query += ` AND ta.scheduled_end_date >= $${paramIndex++}`
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      query += ` AND ta.scheduled_start_date <= $${paramIndex++}`
      params.push(filters.endDate)
    }
    
    query += ` ORDER BY ta.scheduled_start_date, t.task_number`
    
    const result = await pool.query(query, params)
    
    return result.rows
  } catch (error) {
    logger.error('getMyAssignedTasks error', { error, userId })
    throw error
  }
}

/**
 * Check resource availability for task assignment
 */
export async function checkResourceAvailability(
  userId: string,
  projectId: string,
  requiredHours: number,
  startDate?: Date,
  endDate?: Date
): Promise<{
  isAvailable: boolean
  availableHours: number
  currentWorkload: number
  message: string
}> {
  try {
    const result = await pool.query(`
      SELECT 
        pra.estimated_hours as budgeted_hours,
        pra.actual_hours,
        pra.allocation_percentage,
        (
          SELECT COALESCE(SUM(ta.planned_hours), 0)
          FROM task_assignments ta
          JOIN project_tasks t ON ta.task_id = t.id
          WHERE ta.user_id = $1
            AND ta.status IN ('scheduled', 'in-progress')
            AND t.project_id = $2
        ) as current_planned_hours
      FROM project_resource_assignments pra
      WHERE pra.user_id = $1
        AND pra.project_id = $2
        AND pra.status = 'active'
      LIMIT 1
    `, [userId, projectId])
    
    if (result.rows.length === 0) {
      return {
        isAvailable: false,
        availableHours: 0,
        currentWorkload: 0,
        message: 'User is not assigned to this project'
      }
    }
    
    const resource = result.rows[0]
    const budgetedHours = parseFloat(resource.budgeted_hours) || 0
    const actualHours = parseFloat(resource.actual_hours) || 0
    const currentPlannedHours = parseFloat(resource.current_planned_hours) || 0
    
    const availableHours = budgetedHours - actualHours - currentPlannedHours
    const isAvailable = availableHours >= requiredHours
    
    let message = ''
    if (isAvailable) {
      message = `Available: ${availableHours} hours remaining`
    } else {
      message = `Insufficient capacity: ${availableHours} hours available, ${requiredHours} needed (short by ${requiredHours - availableHours} hours)`
    }
    
    return {
      isAvailable,
      availableHours,
      currentWorkload: currentPlannedHours,
      message
    }
  } catch (error) {
    logger.error('checkResourceAvailability error', { error, userId, projectId })
    throw error
  }
}

/**
 * Bulk assign resources to multiple tasks
 */
export async function bulkAssignResources(
  assignments: Array<{
    taskId: string
    resourceAssignmentId: string
    plannedHours: number
  }>,
  userId: string
): Promise<{ assigned: number; failed: number; errors: string[] }> {
  const results = {
    assigned: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  for (const assignment of assignments) {
    try {
      await assignResourceToTask(
        assignment.taskId,
        assignment.resourceAssignmentId,
        assignment.plannedHours,
        userId
      )
      results.assigned++
    } catch (error: any) {
      results.failed++
      results.errors.push(`Task ${assignment.taskId}: ${error.message}`)
    }
  }
  
  logger.info('Bulk assignment completed', results)
  
  return results
}

/**
 * Unassign resource from task
 */
export async function unassignResourceFromTask(assignmentId: string): Promise<boolean> {
  try {
    // Check if there are approved time entries
    const timeResult = await pool.query(`
      SELECT COUNT(*) as entry_count
      FROM time_entries
      WHERE task_assignment_id = $1 AND status = 'approved'
    `, [assignmentId])
    
    if (parseInt(timeResult.rows[0].entry_count) > 0) {
      throw new Error('Cannot unassign: approved time entries exist for this assignment')
    }
    
    await pool.query('DELETE FROM task_assignments WHERE id = $1', [assignmentId])
    
    logger.info('Resource unassigned from task', { assignmentId })
    
    return true
  } catch (error) {
    logger.error('unassignResourceFromTask error', { error, assignmentId })
    throw error
  }
}

/**
 * Get resource workload summary
 */
export async function getResourceWorkload(
  projectId?: string,
  userId?: string
): Promise<any[]> {
  try {
    let query = 'SELECT * FROM resource_workload WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1
    
    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`
      params.push(projectId)
    }
    
    if (userId) {
      query += ` AND user_id = $${paramIndex++}`
      params.push(userId)
    }
    
    query += ' ORDER BY user_name, project_name'
    
    const result = await pool.query(query, params)
    
    return result.rows
  } catch (error) {
    logger.error('getResourceWorkload error', { error })
    throw error
  }
}

