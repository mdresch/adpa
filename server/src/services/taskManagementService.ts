/**
 * Task Management Service
 * 
 * CRUD operations for project tasks
 * Supports manual task creation and AI-imported tasks
 * 
 * Features:
 * - Create, read, update, delete tasks
 * - Task hierarchy (parent-child)
 * - Task dependencies
 * - Progress tracking
 * - Variance analysis
 * 
 * Migration: 208_tasks_scheduling_wbs_import.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface ProjectTask {
  id?: string
  projectId: string
  parentTaskId?: string
  taskNumber?: string
  wbsCode?: string
  taskName: string
  description?: string
  requiredRoleId?: string
  requiredRoleName?: string
  requiredSkills?: string[]
  requiredResourceCount?: number
  estimatedHours?: number
  estimatedDurationDays?: number
  estimatedCost?: number
  plannedStartDate?: Date
  plannedEndDate?: Date
  actualStartDate?: Date
  actualEndDate?: Date
  deliverables?: string[]
  acceptanceCriteria?: string
  percentComplete?: number
  status?: string
  actualHours?: number
  actualCost?: number
  phase?: string
  category?: string
  priority?: string
}

export interface CreateTaskInput {
  projectId: string
  taskName: string
  description?: string
  estimatedHours?: number
  requiredRoleId?: string
  plannedStartDate?: Date
  plannedEndDate?: Date
  priority?: string
  phase?: string
  parentTaskId?: string
}

/**
 * Create a new task
 */
export async function createTask(
  input: CreateTaskInput,
  userId: string
): Promise<ProjectTask> {
  try {
    // Get next task number for project
    const numberResult = await pool.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(task_number FROM '\\d+') AS INTEGER)), 0) + 1 as next_number
      FROM project_tasks
      WHERE project_id = $1 AND task_number LIKE 'TASK-%'
    `, [input.projectId])
    
    const taskNumber = `TASK-${String(numberResult.rows[0].next_number).padStart(3, '0')}`
    
    const result = await pool.query(`
      INSERT INTO project_tasks (
        project_id,
        parent_task_id,
        task_number,
        task_name,
        description,
        estimated_hours,
        required_role_id,
        planned_start_date,
        planned_end_date,
        priority,
        phase,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        task_number as "taskNumber",
        task_name as "taskName",
        estimated_hours as "estimatedHours",
        status
    `, [
      input.projectId,
      input.parentTaskId,
      taskNumber,
      input.taskName,
      input.description,
      input.estimatedHours,
      input.requiredRoleId,
      input.plannedStartDate,
      input.plannedEndDate,
      input.priority || 'medium',
      input.phase,
      'planned',
      userId
    ])
    
    const task = result.rows[0]
    
    logger.info('Task created', {
      taskId: task.id,
      taskName: input.taskName,
      projectId: input.projectId
    })
    
    return task
  } catch (error) {
    logger.error('createTask error', { error, input })
    throw error
  }
}

/**
 * Get all tasks for a project
 */
export async function getProjectTasks(
  projectId: string,
  filters?: {
    status?: string
    phase?: string
    assignedToUserId?: string
    parentTaskId?: string | null
  }
): Promise<any[]> {
  try {
    let query = `
      SELECT * FROM task_summary
      WHERE project_id = $1
    `
    const params: any[] = [projectId]
    let paramIndex = 2
    
    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`
      params.push(filters.status)
    }
    
    if (filters?.phase) {
      query += ` AND phase = $${paramIndex++}`
      params.push(filters.phase)
    }
    
    if (filters?.parentTaskId !== undefined) {
      if (filters.parentTaskId === null) {
        query += ` AND parent_task_id IS NULL`
      } else {
        query += ` AND parent_task_id = $${paramIndex++}`
        params.push(filters.parentTaskId)
      }
    }
    
    query += ` ORDER BY wbs_code NULLS LAST, task_number`
    
    const result = await pool.query(query, params)
    
    return result.rows
  } catch (error) {
    logger.error('getProjectTasks error', { error, projectId })
    throw error
  }
}

/**
 * Get task by ID with full details
 */
export async function getTaskById(taskId: string): Promise<ProjectTask | null> {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        pr.role_name,
        pr.default_hourly_rate,
        COUNT(DISTINCT ta.id) as assignment_count,
        STRING_AGG(DISTINCT u.name, ', ') as assigned_to_names
      FROM project_tasks t
      LEFT JOIN project_roles pr ON t.required_role_id = pr.id
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.id = $1
      GROUP BY t.id, pr.role_name, pr.default_hourly_rate
    `, [taskId])
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('getTaskById error', { error, taskId })
    throw error
  }
}

/**
 * Update task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<CreateTaskInput>
): Promise<ProjectTask | null> {
  try {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    const fieldMap: { [key: string]: string } = {
      taskName: 'task_name',
      description: 'description',
      estimatedHours: 'estimated_hours',
      requiredRoleId: 'required_role_id',
      plannedStartDate: 'planned_start_date',
      plannedEndDate: 'planned_end_date',
      priority: 'priority',
      phase: 'phase',
      parentTaskId: 'parent_task_id'
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${paramIndex++}`)
        values.push(value)
      }
    })
    
    if (setClauses.length === 0) {
      return getTaskById(taskId)
    }
    
    setClauses.push(`updated_at = NOW()`)
    values.push(taskId)
    
    const query = `
      UPDATE project_tasks 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `
    
    const result = await pool.query(query, values)
    
    logger.info('Task updated', { taskId, updates })
    
    return result.rows[0] || null
  } catch (error) {
    logger.error('updateTask error', { error, taskId, updates })
    throw error
  }
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    await pool.query('DELETE FROM project_tasks WHERE id = $1', [taskId])
    
    logger.info('Task deleted', { taskId })
    
    return true
  } catch (error) {
    logger.error('deleteTask error', { error, taskId })
    throw error
  }
}

/**
 * Update task progress
 */
export async function updateTaskProgress(
  taskId: string,
  percentComplete: number
): Promise<void> {
  try {
    await pool.query(`
      UPDATE project_tasks
      SET percent_complete = $1,
          status = CASE
            WHEN $1 >= 100 THEN 'completed'
            WHEN $1 > 0 THEN 'in-progress'
            ELSE status
          END,
          completed_at = CASE WHEN $1 >= 100 THEN NOW() ELSE completed_at END,
          updated_at = NOW()
      WHERE id = $2
    `, [percentComplete, taskId])
    
    logger.info('Task progress updated', { taskId, percentComplete })
  } catch (error) {
    logger.error('updateTaskProgress error', { error, taskId })
    throw error
  }
}

/**
 * Get task hierarchy (parent-child structure)
 */
export async function getTaskHierarchy(projectId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM get_task_hierarchy($1)',
      [projectId]
    )
    
    return result.rows
  } catch (error) {
    logger.error('getTaskHierarchy error', { error, projectId })
    throw error
  }
}

/**
 * Get task dependencies
 */
export async function getTaskDependencies(taskId: string): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        td.*,
        pt.task_name as depends_on_task_name,
        pt.status as depends_on_status,
        pt.percent_complete as depends_on_progress
      FROM task_dependencies td
      JOIN project_tasks pt ON td.depends_on_task_id = pt.id
      WHERE td.task_id = $1
      ORDER BY td.dependency_type
    `, [taskId])
    
    return result.rows
  } catch (error) {
    logger.error('getTaskDependencies error', { error, taskId })
    throw error
  }
}

/**
 * Create task dependency
 */
export async function createTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
  dependencyType: string = 'finish-to-start',
  lagDays: number = 0
): Promise<any> {
  try {
    const result = await pool.query(`
      INSERT INTO task_dependencies (
        task_id,
        depends_on_task_id,
        dependency_type,
        lag_days
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [taskId, dependsOnTaskId, dependencyType, lagDays])
    
    logger.info('Task dependency created', {
      taskId,
      dependsOnTaskId,
      dependencyType
    })
    
    return result.rows[0]
  } catch (error) {
    logger.error('createTaskDependency error', { error })
    throw error
  }
}

