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
  status?: string
  actualHours?: number
  actualCost?: number
  phase?: string
  category?: string
  priority?: string
  // Optional details returned by the details endpoint
  assignedUserId?: string | null
  assignedUserName?: string | null
  sourceDocumentId?: string | null
  sourceDocumentTitle?: string | null
  sourceEntityId?: string | null
  importedFromWbs?: boolean
  createdAt?: Date
  updatedAt?: Date
  dependencies?: TaskDependency[]
  assignedResources?: AssignedResource[]
}

export interface TaskDependency {
  id: string
  predecessorTaskId?: string | null
  successorTaskId?: string | null
  dependencyType?: string
  lagDays?: number
  predecessorTask?: { taskNumber?: string; taskName?: string }
  successorTask?: { taskNumber?: string; taskName?: string }
}

export interface AssignedResource {
  id: string
  taskId: string
  userId?: string | null
  userName?: string | null
  roleId?: string | null
  roleName?: string | null
  allocationPercentage?: number | null
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
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    // Get the base task
    const taskResult = await pool.query(`
      SELECT 
        t.*, 
        pr.role_name as required_role_name,
        d.title as source_document_title
      FROM project_tasks t
      LEFT JOIN project_roles pr ON t.required_role_id = pr.id
      LEFT JOIN documents d ON t.source_document_id = d.id
      WHERE t.id = $1
    `, [taskId])
    
    if (!taskResult.rows.length) {
      return null
    }
    
    const task = taskResult.rows[0]
    
    // Get task dependencies — split into two reads to avoid duplicates/ambiguous ordering
    // a) rows where this task is the successor (this task depends on another)
    const depsAsSuccessor = await pool.query(
      `SELECT td.*, pt1.task_number as predecessor_task_number, pt1.task_name as predecessor_task_name, pt2.task_number as successor_task_number, pt2.task_name as successor_task_name
         FROM task_dependencies td
         LEFT JOIN project_tasks pt1 ON td.depends_on_task_id = pt1.id
         LEFT JOIN project_tasks pt2 ON td.task_id = pt2.id
         WHERE td.task_id = $1`,
      [taskId]
    )

    // b) rows where this task is the predecessor (other tasks depend on this task)
    const depsAsPredecessor = await pool.query(
      `SELECT td.*, pt1.task_number as predecessor_task_number, pt1.task_name as predecessor_task_name, pt2.task_number as successor_task_number, pt2.task_name as successor_task_name
         FROM task_dependencies td
         LEFT JOIN project_tasks pt1 ON td.depends_on_task_id = pt1.id
         LEFT JOIN project_tasks pt2 ON td.task_id = pt2.id
         WHERE td.depends_on_task_id = $1`,
      [taskId]
    )

    // Merge both lists, deduplicate by dependency id just in case
    const depsRows = [...depsAsSuccessor.rows, ...depsAsPredecessor.rows]
    const seen = new Set<string>()
    const dependencies: TaskDependency[] = []

    for (const dep of depsRows) {
      if (!dep.id || seen.has(dep.id)) continue
      seen.add(dep.id)
      dependencies.push({
        id: dep.id,
        predecessorTaskId: dep.depends_on_task_id || null,
        successorTaskId: dep.task_id || null,
        dependencyType: dep.dependency_type,
        lagDays: dep.lag_days,
        predecessorTask: {
          taskNumber: dep.predecessor_task_number,
          taskName: dep.predecessor_task_name
        },
        successorTask: {
          taskNumber: dep.successor_task_number,
          taskName: dep.successor_task_name
        }
      })
    }
    
    // Get task assignments/resources
    const resourcesResult = await pool.query(`
      SELECT 
        ta.id,
        ta.task_id,
        ta.user_id,
        ta.user_name,
        ta.role_id,
        ta.role_name,
        ta.allocation_percentage,
        ta.planned_hours,
        ta.actual_hours,
        ta.status
      FROM task_assignments ta
      WHERE ta.task_id = $1
    `, [taskId])
    
    const assigned_resources: AssignedResource[] = resourcesResult.rows.map(res => ({
      id: res.id,
      taskId: res.task_id,
      userId: res.user_id || null,
      userName: res.user_name || null,
      roleId: res.role_id || null,
      roleName: res.role_name || null,
      allocationPercentage: res.allocation_percentage ?? null
    }))
    
    // Get primary assignment (first one or the one with 100% allocation)
    const primaryAssignment = assigned_resources.find(r => r.allocationPercentage === 100) || assigned_resources[0]
    
    // Map DB row to typed ProjectTask (camelCase properties)
    const mapped: ProjectTask & { id: string; project_id?: string } = {
      id: task.id,
      projectId: task.project_id,
      taskNumber: task.task_number,
      wbsCode: task.wbs_code,
      taskName: task.task_name,
      description: task.description,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      plannedStartDate: task.planned_start_date,
      plannedEndDate: task.planned_end_date,
      requiredRoleId: task.required_role_id,
      requiredRoleName: task.required_role_name,
      assignedUserId: primaryAssignment?.userId ?? null,
      assignedUserName: primaryAssignment?.userName ?? null,
      status: task.status,
      percentComplete: task.percent_complete ?? 0,
      sourceDocumentId: task.source_document_id ?? null,
      sourceDocumentTitle: task.source_document_title ?? null,
      sourceEntityId: task.source_entity_id ?? null,
      importedFromWbs: task.imported_from_wbs ?? false,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }

    // attach dependency / assignment payloads on the returned object
    mapped.dependencies = dependencies
    mapped.assignedResources = assigned_resources

    return mapped
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
    
    // Security: Validate key exists in fieldMap to prevent prototype pollution
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMap.hasOwnProperty(key) && fieldMap[key]) {
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

// ================================================================
// TASK ROLE ASSIGNMENTS (Multiple Roles Per Task)
// Migration: 209_stakeholder_role_skills_integration.sql
// ================================================================

export interface TaskRole {
  id: string
  taskId: string
  roleId: string
  roleName?: string
  roleType: 'owner' | 'executor' | 'reviewer' | 'approver' | 'consultant'
  isPrimary: boolean
  requiredCount: number
  assignedCount: number
  createdAt?: Date
}

/**
 * Assign role to task
 */
export async function assignRoleToTask(
  taskId: string,
  roleId: string,
  roleType: 'owner' | 'executor' | 'reviewer' | 'approver' | 'consultant' = 'owner',
  options?: {
    isPrimary?: boolean
    requiredCount?: number
  }
): Promise<TaskRole> {
  try {
    // Verify task exists
    const taskCheck = await pool.query(
      `SELECT id, project_id FROM project_tasks WHERE id = $1`,
      [taskId]
    )

    if (taskCheck.rows.length === 0) {
      throw new Error('Task not found')
    }

    // Verify role exists
    const roleCheck = await pool.query(
      `SELECT id, role_name FROM project_roles WHERE id = $1`,
      [roleId]
    )

    if (roleCheck.rows.length === 0) {
      throw new Error('Role not found')
    }

    const result = await pool.query(
      `INSERT INTO task_roles (
         task_id,
         role_id,
         role_type,
         is_primary,
         required_count
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (task_id, role_id, role_type) 
       DO UPDATE SET 
         is_primary = EXCLUDED.is_primary,
         required_count = EXCLUDED.required_count
       RETURNING 
         id,
         task_id as "taskId",
         role_id as "roleId",
         role_type as "roleType",
         is_primary as "isPrimary",
         required_count as "requiredCount",
         assigned_count as "assignedCount",
         created_at as "createdAt"`,
      [
        taskId,
        roleId,
        roleType,
        options?.isPrimary || false,
        options?.requiredCount || 1
      ]
    )

    const taskRole = result.rows[0]
    taskRole.roleName = roleCheck.rows[0].role_name

    logger.info('Role assigned to task', {
      taskId,
      roleId,
      roleType,
      isPrimary: options?.isPrimary || false
    })

    return taskRole
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      throw new Error('Role already assigned to task with this role type')
    }
    logger.error('assignRoleToTask error', { error, taskId, roleId })
    throw error
  }
}

/**
 * Get roles assigned to a task
 */
export async function getTaskRoles(taskId: string): Promise<TaskRole[]> {
  try {
    const result = await pool.query(
      `SELECT 
         tr.id,
         tr.task_id as "taskId",
         tr.role_id as "roleId",
         pr.role_name as "roleName",
         tr.role_type as "roleType",
         tr.is_primary as "isPrimary",
         tr.required_count as "requiredCount",
         tr.assigned_count as "assignedCount",
         tr.created_at as "createdAt"
       FROM task_roles tr
       INNER JOIN project_roles pr ON tr.role_id = pr.id
       WHERE tr.task_id = $1
       ORDER BY tr.is_primary DESC, tr.role_type, pr.role_name ASC`,
      [taskId]
    )

    return result.rows
  } catch (error) {
    logger.error('getTaskRoles error', { error, taskId })
    throw error
  }
}

/**
 * Get tasks by role
 */
export async function getTasksByRole(roleId: string, projectId?: string): Promise<any[]> {
  try {
    let query = `
      SELECT 
        tr.id as "taskRoleId",
        tr.role_type as "roleType",
        tr.is_primary as "isPrimary",
        tr.required_count as "requiredCount",
        tr.assigned_count as "assignedCount",
        t.id,
        t.project_id as "projectId",
        t.task_number as "taskNumber",
        t.task_name as "taskName",
        t.status,
        t.percent_complete as "percentComplete"
      FROM task_roles tr
      INNER JOIN project_tasks t ON tr.task_id = t.id
      WHERE tr.role_id = $1
    `

    const params: any[] = [roleId]

    if (projectId) {
      query += ` AND t.project_id = $2`
      params.push(projectId)
    }

    query += ` ORDER BY t.task_number ASC`

    const result = await pool.query(query, params)

    return result.rows
  } catch (error) {
    logger.error('getTasksByRole error', { error, roleId, projectId })
    throw error
  }
}

/**
 * Remove role from task
 */
export async function removeRoleFromTask(
  taskId: string,
  roleId: string,
  roleType?: string
): Promise<boolean> {
  try {
    let query = `
      DELETE FROM task_roles 
      WHERE task_id = $1 AND role_id = $2
    `
    const params: any[] = [taskId, roleId]

    if (roleType) {
      query += ` AND role_type = $3`
      params.push(roleType)
    }

    const result = await pool.query(query, params)

    logger.info('Role removed from task', {
      taskId,
      roleId,
      roleType
    })

    return result.rowCount > 0
  } catch (error) {
    logger.error('removeRoleFromTask error', { error, taskId, roleId })
    throw error
  }
}

/**
 * Get available stakeholders for a task (matching roles and skills)
 */
export async function getAvailableStakeholdersForTask(taskId: string): Promise<any[]> {
  try {
    // Get task roles
    const taskRoles = await getTaskRoles(taskId)

    if (taskRoles.length === 0) {
      return []
    }

    // Get project ID from task
    const taskResult = await pool.query(
      `SELECT project_id FROM project_tasks WHERE id = $1`,
      [taskId]
    )

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found')
    }

    const projectId = taskResult.rows[0].project_id

    // Get stakeholders assigned to these roles in this project
    const roleIds = taskRoles.map(tr => tr.roleId)
    const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(', ')

    const result = await pool.query(
      `SELECT DISTINCT
         s.id as "stakeholderId",
         s.name as "stakeholderName",
         s.email as "stakeholderEmail",
         sra.role_id as "roleId",
         pr.role_name as "roleName",
         sra.assignment_type as "assignmentType",
         sra.status,
         sra.allocation_percentage as "allocationPercentage"
       FROM stakeholders s
       INNER JOIN stakeholder_role_assignments sra ON s.id = sra.stakeholder_id
       INNER JOIN project_roles pr ON sra.role_id = pr.id
       WHERE sra.role_id IN (${placeholders})
         AND sra.project_id = $${roleIds.length + 1}
         AND sra.status = 'active'
       ORDER BY s.name ASC`,
      [...roleIds, projectId]
    )

    return result.rows
  } catch (error) {
    logger.error('getAvailableStakeholdersForTask error', { error, taskId })
    throw error
  }
}

/**
 * Suggest stakeholders for a task based on role and skill matching
 * This is a simplified version - full AI-powered matching would be in a separate service
 */
export async function suggestStakeholdersForTask(taskId: string): Promise<any[]> {
  try {
    const taskRoles = await getTaskRoles(taskId)

    if (taskRoles.length === 0) {
      return []
    }

    // Get project ID
    const taskResult = await pool.query(
      `SELECT project_id FROM project_tasks WHERE id = $1`,
      [taskId]
    )

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found')
    }

    const projectId = taskResult.rows[0].project_id

    // For each role, get stakeholders with skill matches
    const suggestions: any[] = []

    for (const taskRole of taskRoles) {
      // Get stakeholders with this role in the project
      const stakeholdersResult = await pool.query(
        `SELECT 
           s.id,
           s.name,
           s.email,
           sra.assignment_type,
           sra.allocation_percentage
         FROM stakeholders s
         INNER JOIN stakeholder_role_assignments sra ON s.id = sra.stakeholder_id
         WHERE sra.role_id = $1
           AND sra.project_id = $2
           AND sra.status = 'active'`,
        [taskRole.roleId, projectId]
      )

      // Calculate skill match for each stakeholder
      for (const stakeholder of stakeholdersResult.rows) {
        try {
          const { matchStakeholderToRole } = await import('./skillsManagementService')
          const match = await matchStakeholderToRole(stakeholder.id, taskRole.roleId)

          suggestions.push({
            stakeholderId: stakeholder.id,
            stakeholderName: stakeholder.name,
            stakeholderEmail: stakeholder.email,
            roleId: taskRole.roleId,
            roleName: taskRole.roleName,
            roleType: taskRole.roleType,
            matchPercentage: match.matchPercentage,
            matchedSkills: match.matchedSkills,
            totalRequiredSkills: match.totalRequiredSkills,
            missingSkills: match.missingSkills,
            assignmentType: stakeholder.assignment_type,
            allocationPercentage: stakeholder.allocation_percentage
          })
        } catch (error) {
          logger.warn('Error calculating match for stakeholder', {
            stakeholderId: stakeholder.id,
            roleId: taskRole.roleId,
            error
          })
        }
      }
    }

    // Sort by match percentage descending
    suggestions.sort((a, b) => b.matchPercentage - a.matchPercentage)

    return suggestions
  } catch (error) {
    logger.error('suggestStakeholdersForTask error', { error, taskId })
    throw error
  }
}

/**
 * Get skill gaps for a task (identify missing skills needed for completion)
 */
export async function getSkillGapsForTask(taskId: string): Promise<any[]> {
  try {
    const taskRoles = await getTaskRoles(taskId)

    if (taskRoles.length === 0) {
      return []
    }

    // Get project ID
    const taskResult = await pool.query(
      `SELECT project_id FROM project_tasks WHERE id = $1`,
      [taskId]
    )

    if (taskResult.rows.length === 0) {
      throw new Error('Task not found')
    }

    const projectId = taskResult.rows[0].project_id

    const gaps: any[] = []

    for (const taskRole of taskRoles) {
      // Get required skills for this role
      const requiredSkillsResult = await pool.query(
        `SELECT 
           s.id as "skillId",
           s.name as "skillName",
           rs.required_proficiency as "requiredProficiency",
           rs.is_required
         FROM role_skills rs
         INNER JOIN skills s ON rs.skill_id = s.id
         WHERE rs.role_id = $1 AND rs.is_required = TRUE`,
        [taskRole.roleId]
      )

      // Get stakeholders with this role in the project
      const stakeholdersResult = await pool.query(
        `SELECT s.id, s.name, s.email
         FROM stakeholders s
         INNER JOIN stakeholder_role_assignments sra ON s.id = sra.stakeholder_id
         WHERE sra.role_id = $1
           AND sra.project_id = $2
           AND sra.status = 'active'`,
        [taskRole.roleId, projectId]
      )

      // Check which required skills are missing from stakeholders
      for (const requiredSkill of requiredSkillsResult.rows) {
        const stakeholdersWithSkill = await pool.query(
          `SELECT COUNT(*) as count
           FROM stakeholder_skills ss
           WHERE ss.skill_id = $1
             AND ss.stakeholder_id IN (
               SELECT sra.stakeholder_id
               FROM stakeholder_role_assignments sra
               WHERE sra.role_id = $2
                 AND sra.project_id = $3
                 AND sra.status = 'active'
             )
             AND (
               ($4 = 'beginner' AND ss.proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
               OR ($4 = 'intermediate' AND ss.proficiency_level IN ('intermediate', 'advanced', 'expert'))
               OR ($4 = 'advanced' AND ss.proficiency_level IN ('advanced', 'expert'))
               OR ($4 = 'expert' AND ss.proficiency_level = 'expert')
             )`,
          [
            requiredSkill.skillId,
            taskRole.roleId,
            projectId,
            requiredSkill.requiredProficiency
          ]
        )

        const count = parseInt(stakeholdersWithSkill.rows[0].count)

        if (count < taskRole.requiredCount) {
          gaps.push({
            roleId: taskRole.roleId,
            roleName: taskRole.roleName,
            roleType: taskRole.roleType,
            skillId: requiredSkill.skillId,
            skillName: requiredSkill.skillName,
            requiredProficiency: requiredSkill.requiredProficiency,
            requiredCount: taskRole.requiredCount,
            availableCount: count,
            gap: taskRole.requiredCount - count
          })
        }
      }
    }

    return gaps
  } catch (error) {
    logger.error('getSkillGapsForTask error', { error, taskId })
    throw error
  }
}

