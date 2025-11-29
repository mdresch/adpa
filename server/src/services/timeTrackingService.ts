/**
 * Time Tracking Service
 * 
 * Handles time entry submission, approval workflows, and labor cost calculations
 * Core service for Hours × Rate labor cost tracking
 * 
 * Features:
 * - Time entry creation (hours worked × hourly rate)
 * - Approval workflow for contractor hours
 * - Automatic cost calculation
 * - Integration with project actual costs
 * - Overtime tracking
 * 
 * Migration: 206_cost_management_system.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface TimeEntry {
  id?: string
  projectId: string
  assignmentId: string
  userId: string
  entryDate: Date
  hoursWorked: number
  overtimeHours?: number
  hourlyRate: number
  overtimeRate?: number
  regularCost?: number
  overtimeCost?: number
  totalCost?: number
  taskId?: string
  taskName?: string
  workDescription?: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced' | 'paid'
  submittedAt?: Date
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  invoiceNumber?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ResourceAssignment {
  id?: string
  projectId: string
  userId: string
  roleId: string
  assignmentType: 'full-time' | 'part-time' | 'contractor' | 'consultant'
  allocationPercentage: number
  hourlyRate: number
  dailyRate?: number
  startDate: Date
  endDate?: Date
  estimatedHours?: number
  estimatedCost?: number
  actualHours?: number
  actualCost?: number
  status: 'planned' | 'active' | 'completed' | 'on-hold' | 'cancelled'
  requiresApproval: boolean
  approvedBy?: string
  approvalDate?: Date
}

/**
 * Create resource assignment (assign person to project with role and rate)
 */
export async function createResourceAssignment(
  input: Omit<ResourceAssignment, 'id' | 'actualHours' | 'actualCost'>,
  userId: string
): Promise<ResourceAssignment> {
  try {
    // Calculate estimated cost
    const estimatedCost = input.estimatedHours 
      ? input.estimatedHours * input.hourlyRate 
      : null
    
    const result = await pool.query(
      `INSERT INTO project_resource_assignments (
        project_id,
        user_id,
        role_id,
        assignment_type,
        allocation_percentage,
        hourly_rate,
        daily_rate,
        start_date,
        end_date,
        estimated_hours,
        estimated_cost,
        status,
        requires_approval,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING 
        id,
        project_id as "projectId",
        user_id as "userId",
        role_id as "roleId",
        hourly_rate as "hourlyRate",
        estimated_cost as "estimatedCost",
        status`,
      [
        input.projectId,
        input.userId,
        input.roleId,
        input.assignmentType,
        input.allocationPercentage,
        input.hourlyRate,
        input.dailyRate,
        input.startDate,
        input.endDate,
        input.estimatedHours,
        estimatedCost,
        input.status || 'active',
        input.requiresApproval || false,
        userId
      ]
    )
    
    const assignment = result.rows[0]
    
    logger.info('Resource assignment created', {
      assignmentId: assignment.id,
      projectId: input.projectId,
      userId: input.userId,
      hourlyRate: input.hourlyRate
    })
    
    return assignment
  } catch (error) {
    logger.error('createResourceAssignment error', { error, input })
    throw error
  }
}

/**
 * Get resource assignments for a project
 */
export async function getProjectResourceAssignments(projectId: string): Promise<any[]> {
  try {
    // Get project_resource_assignments (existing resource assignments)
    const assignmentsResult = await pool.query(
      `SELECT 
        pra.*,
        u.name as user_name,
        u.email as user_email,
        pr.role_name,
        pr.role_type,
        pr.seniority_level
      FROM project_resource_assignments pra
      JOIN users u ON pra.user_id = u.id
      JOIN project_roles pr ON pra.role_id = pr.id
      WHERE pra.project_id = $1
      ORDER BY pra.start_date DESC, u.name ASC`,
      [projectId]
    )
    
    // Get stakeholders who are team members (is_team_member = true)
    // These should also be available for task assignment
    const teamMembersResult = await pool.query(
      `SELECT 
        s.id,
        s.project_id,
        s.user_id,
        s.name as user_name,
        s.email as user_email,
        s.role as role_name,
        s.is_team_member,
        s.stakeholder_type,
        -- Try to find a matching project_role by role name
        pr.id as role_id,
        pr.role_type,
        pr.seniority_level,
        -- Use a default hourly rate if not set (could be from role or stakeholder metadata)
        -- Handle case where metadata might not exist or be null
        COALESCE(
          CASE WHEN s.metadata IS NOT NULL THEN (s.metadata->>'hourly_rate')::numeric ELSE NULL END,
          pr.default_hourly_rate,
          0
        ) as hourly_rate,
        -- Mark as stakeholder-based assignment
        'stakeholder' as assignment_source
      FROM stakeholders s
      LEFT JOIN project_roles pr ON pr.project_id = s.project_id 
        AND LOWER(TRIM(pr.role_name)) = LOWER(TRIM(s.role))
      WHERE s.project_id = $1
        AND s.is_team_member = true
        AND s.stakeholder_type = 'internal'
        AND s.user_id IS NOT NULL
      ORDER BY s.name ASC`,
      [projectId]
    )
    
    // Combine both results
    const assignments = assignmentsResult.rows.map(row => ({
      ...row,
      assignment_source: 'resource_assignment'
    }))
    
    const teamMembers = teamMembersResult.rows.map(row => ({
      id: `stakeholder-${row.id}`, // Prefix to distinguish from resource assignments
      project_id: row.project_id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      role_id: row.role_id,
      role_name: row.role_name,
      role_type: row.role_type,
      seniority_level: row.seniority_level,
      hourly_rate: row.hourly_rate || 0,
      assignment_source: 'stakeholder',
      stakeholder_id: row.id, // Keep reference to original stakeholder
      // Default values for fields that might not exist for stakeholders
      assignment_type: 'full-time',
      allocation_percentage: 100,
      start_date: null,
      end_date: null,
      estimated_hours: null,
      status: 'active'
    }))
    
    // Combine and deduplicate by user_id (prefer resource assignments over stakeholders)
    const combined = [...assignments]
    const assignedUserIds = new Set(assignments.map(a => a.user_id))
    
    // Only add stakeholders that aren't already in resource assignments
    teamMembers.forEach(tm => {
      if (!assignedUserIds.has(tm.user_id)) {
        combined.push(tm)
      }
    })
    
    return combined
  } catch (error) {
    logger.error('getProjectResourceAssignments error', { error, projectId })
    throw error
  }
}

/**
 * Submit time entry (hours worked × rate = cost)
 */
export async function submitTimeEntry(
  input: Omit<TimeEntry, 'id' | 'totalCost' | 'regularCost' | 'overtimeCost'>,
  userId: string
): Promise<TimeEntry> {
  try {
    // Get assignment details to verify hourly rate
    const assignmentResult = await pool.query(
      'SELECT hourly_rate, requires_approval FROM project_resource_assignments WHERE id = $1',
      [input.assignmentId]
    )
    
    if (assignmentResult.rows.length === 0) {
      throw new Error('Resource assignment not found')
    }
    
    const assignment = assignmentResult.rows[0]
    const hourlyRate = input.hourlyRate || assignment.hourly_rate
    const overtimeRate = input.overtimeRate || (hourlyRate * 1.5)  // Default 1.5× for overtime
    
    // Calculate costs
    const regularCost = input.hoursWorked * hourlyRate
    const overtimeCost = (input.overtimeHours || 0) * overtimeRate
    const totalCost = regularCost + overtimeCost
    
    // Determine initial status
    const initialStatus = assignment.requires_approval ? 'submitted' : 'approved'
    
    const result = await pool.query(
      `INSERT INTO time_entries (
        project_id,
        assignment_id,
        user_id,
        entry_date,
        hours_worked,
        overtime_hours,
        hourly_rate,
        overtime_rate,
        regular_cost,
        overtime_cost,
        total_cost,
        task_id,
        task_name,
        work_description,
        status,
        submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        CASE WHEN $15 = 'submitted' THEN NOW() ELSE NULL END)
      RETURNING 
        id,
        project_id as "projectId",
        hours_worked as "hoursWorked",
        total_cost as "totalCost",
        status`,
      [
        input.projectId,
        input.assignmentId,
        userId,
        input.entryDate,
        input.hoursWorked,
        input.overtimeHours || 0,
        hourlyRate,
        overtimeRate,
        regularCost,
        overtimeCost,
        totalCost,
        input.taskId,
        input.taskName,
        input.workDescription,
        initialStatus
      ]
    )
    
    const timeEntry = result.rows[0]
    
    logger.info('Time entry submitted', {
      timeEntryId: timeEntry.id,
      hours: input.hoursWorked,
      cost: totalCost,
      status: initialStatus
    })
    
    // If auto-approved (internal), trigger cost update
    if (initialStatus === 'approved') {
      await updateProjectCostBreakdown(input.projectId)
    }
    
    return timeEntry
  } catch (error) {
    logger.error('submitTimeEntry error', { error, input })
    throw error
  }
}

/**
 * Approve time entry (triggers cost calculation)
 */
export async function approveTimeEntry(
  timeEntryId: string,
  approverId: string
): Promise<TimeEntry> {
  try {
    const result = await pool.query(
      `UPDATE time_entries 
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING 
         id,
         project_id as "projectId",
         hours_worked as "hoursWorked",
         total_cost as "totalCost",
         status`,
      [approverId, timeEntryId]
    )
    
    if (result.rows.length === 0) {
      throw new Error('Time entry not found')
    }
    
    const timeEntry = result.rows[0]
    
    logger.info('Time entry approved', {
      timeEntryId,
      approverId,
      cost: timeEntry.totalCost
    })
    
    // Trigger will auto-update project costs
    
    return timeEntry
  } catch (error) {
    logger.error('approveTimeEntry error', { error, timeEntryId })
    throw error
  }
}

/**
 * Reject time entry
 */
export async function rejectTimeEntry(
  timeEntryId: string,
  approverId: string,
  reason: string
): Promise<TimeEntry> {
  try {
    const result = await pool.query(
      `UPDATE time_entries 
       SET status = 'rejected',
           approved_by = $1,
           approved_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [approverId, reason, timeEntryId]
    )
    
    if (result.rows.length === 0) {
      throw new Error('Time entry not found')
    }
    
    logger.info('Time entry rejected', { timeEntryId, reason })
    
    return result.rows[0]
  } catch (error) {
    logger.error('rejectTimeEntry error', { error, timeEntryId })
    throw error
  }
}

/**
 * Get time entries for a project
 */
export async function getProjectTimeEntries(
  projectId: string,
  filters?: {
    userId?: string
    status?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<TimeEntry[]> {
  try {
    let query = `
      SELECT 
        te.*,
        u.name as user_name,
        pr.role_name,
        pr.role_type
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      JOIN project_resource_assignments pra ON te.assignment_id = pra.id
      JOIN project_roles pr ON pra.role_id = pr.id
      WHERE te.project_id = $1
    `
    
    const params: any[] = [projectId]
    let paramIndex = 2
    
    if (filters?.userId) {
      query += ` AND te.user_id = $${paramIndex++}`
      params.push(filters.userId)
    }
    
    if (filters?.status) {
      query += ` AND te.status = $${paramIndex++}`
      params.push(filters.status)
    }
    
    if (filters?.startDate) {
      query += ` AND te.entry_date >= $${paramIndex++}`
      params.push(filters.startDate)
    }
    
    if (filters?.endDate) {
      query += ` AND te.entry_date <= $${paramIndex++}`
      params.push(filters.endDate)
    }
    
    query += ` ORDER BY te.entry_date DESC, u.name ASC`
    
    const result = await pool.query(query, params)
    
    return result.rows
  } catch (error) {
    logger.error('getProjectTimeEntries error', { error, projectId })
    throw error
  }
}

/**
 * Get pending time entries requiring approval
 */
export async function getPendingApprovals(projectId?: string): Promise<TimeEntry[]> {
  try {
    const query = `
      SELECT 
        te.*,
        u.name as user_name,
        pr.role_name,
        p.name as project_name
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      JOIN projects p ON te.project_id = p.id
      JOIN project_resource_assignments pra ON te.assignment_id = pra.id
      JOIN project_roles pr ON pra.role_id = pr.id
      WHERE te.status = 'submitted'
      ${projectId ? 'AND te.project_id = $1' : ''}
      ORDER BY te.submitted_at ASC
    `
    
    const params = projectId ? [projectId] : []
    const result = await pool.query(query, params)
    
    return result.rows
  } catch (error) {
    logger.error('getPendingApprovals error', { error, projectId })
    throw error
  }
}

/**
 * Manually update project cost breakdown (callable from API)
 */
export async function updateProjectCostBreakdown(projectId: string): Promise<void> {
  try {
    await pool.query('SELECT update_project_cost_breakdown($1)', [projectId])
    
    logger.info('Project cost breakdown updated', { projectId })
  } catch (error) {
    logger.error('updateProjectCostBreakdown error', { error, projectId })
    throw error
  }
}

/**
 * Get project cost breakdown with all categories
 */
export async function getProjectCostBreakdown(projectId: string): Promise<any> {
  try {
    const result = await pool.query(
      `SELECT * FROM project_cost_breakdown WHERE project_id = $1`,
      [projectId]
    )
    
    if (result.rows.length === 0) {
      // Create initial breakdown if doesn't exist
      await updateProjectCostBreakdown(projectId)
      
      const newResult = await pool.query(
        'SELECT * FROM project_cost_breakdown WHERE project_id = $1',
        [projectId]
      )
      
      return newResult.rows[0] || null
    }
    
    return result.rows[0]
  } catch (error) {
    logger.error('getProjectCostBreakdown error', { error, projectId })
    throw error
  }
}

/**
 * Get time tracking summary by role for a project
 */
export async function getTimeTrackingByRole(projectId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM time_tracking_by_role WHERE project_id = $1',
      [projectId]
    )
    
    return result.rows
  } catch (error) {
    logger.error('getTimeTrackingByRole error', { error, projectId })
    throw error
  }
}

/**
 * Bulk approve time entries
 */
export async function bulkApproveTimeEntries(
  timeEntryIds: string[],
  approverId: string
): Promise<number> {
  try {
    const result = await pool.query(
      `UPDATE time_entries 
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = ANY($2::uuid[])
         AND status = 'submitted'
       RETURNING id`,
      [approverId, timeEntryIds]
    )
    
    const approvedCount = result.rows.length
    
    logger.info('Bulk time entries approved', {
      count: approvedCount,
      approverId
    })
    
    // Get unique project IDs to update cost breakdowns
    const projectIds = await pool.query(
      'SELECT DISTINCT project_id FROM time_entries WHERE id = ANY($1::uuid[])',
      [result.rows.map(r => r.id)]
    )
    
    // Update cost breakdown for each affected project
    for (const row of projectIds.rows) {
      await updateProjectCostBreakdown(row.project_id)
    }
    
    return approvedCount
  } catch (error) {
    logger.error('bulkApproveTimeEntries error', { error, timeEntryIds })
    throw error
  }
}

