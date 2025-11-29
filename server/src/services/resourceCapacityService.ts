/**
 * Resource Capacity Management Service
 * 
 * Handles:
 * - Resource capacity settings (contracted hours, targets, schedule)
 * - Checklist items with resource assignment
 * - Resource unavailability (leave, holidays, etc.)
 * - Utilization queries at all levels (task, project, program, portfolio)
 * 
 * Reference: Migration 356 - Resource Capacity Management
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

// ================================================================
// INTERFACES
// ================================================================

export interface ResourceCapacitySettings {
  id?: string
  userId: string
  contractedHoursPerWeek: number
  contractedHoursPerDay: number
  contractedDaysPerWeek: number
  workStartTime: string
  workEndTime: string
  timezone: string
  targetUtilizationPercent: number
  maxAllocationPercent: number
  minAllocationPercent: number
  annualLeaveDays: number
  publicHolidaysCalendar: string
  resourceType: 'full-time' | 'part-time' | 'contractor' | 'consultant' | 'intern' | 'temporary'
  costCenter?: string
  department?: string
  effectiveFrom: string
  effectiveUntil?: string
  isActive: boolean
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ChecklistItem {
  id?: string
  taskId: string
  itemName: string
  description?: string
  sequenceOrder: number
  assignedUserId?: string
  assignedUserName?: string
  assignedRoleId?: string
  assignedRoleName?: string
  estimatedHours?: number
  actualHours?: number
  isCompleted: boolean
  isBlocked: boolean
  blockedReason?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  dueDate?: string
  completedAt?: Date
  completedBy?: string
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ResourceUnavailability {
  id?: string
  userId: string
  unavailabilityType: 'annual-leave' | 'sick-leave' | 'public-holiday' | 'training' | 
                      'conference' | 'jury-duty' | 'parental-leave' | 'personal' | 'other'
  description?: string
  startDate: string
  endDate: string
  isFullDay: boolean
  startTime?: string
  endTime?: string
  hoursUnavailable?: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approvedBy?: string
  approvedAt?: Date
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface PortfolioUtilization {
  userId: string
  userName: string
  userEmail: string
  resourceType: string
  contractedWeeklyHours: number
  monthlyCapacityHours: number
  targetUtilizationPercent: number
  maxAllocationPercent: number
  totalPlannedHours: number
  totalActualHours: number
  projectsAssigned: number
  unavailableHoursNext30Days: number
  availableCapacityHours: number
  plannedUtilizationPercent: number
  actualUtilizationPercent: number
  allocationStatus: string
  hoursToTarget: number
  hoursToMax: number
}

export interface PortfolioSummary {
  totalResources: number
  fullTimeCount: number
  otherCount: number
  totalWeeklyCapacity: number
  totalMonthlyCapacity: number
  totalAvailableCapacity: number
  totalPlannedHours: number
  totalActualHours: number
  avgUtilizationPercent: number
  avgActiveUtilization: number
  overAllocatedCount: number
  over100Count: number
  optimalCount: number
  underTargetCount: number
  lowUtilizationCount: number
  unallocatedCount: number
  targetAchievementPercent: number
}

// ================================================================
// CAPACITY SETTINGS FUNCTIONS
// ================================================================

/**
 * Get capacity settings for a user
 */
export async function getCapacitySettings(userId: string): Promise<ResourceCapacitySettings | null> {
  try {
    // First, try to get the most recent active settings (regardless of effective date)
    // This allows viewing settings that are scheduled for the future
    const result = await pool.query(`
      SELECT 
        id,
        user_id as "userId",
        contracted_hours_per_week as "contractedHoursPerWeek",
        contracted_hours_per_day as "contractedHoursPerDay",
        contracted_days_per_week as "contractedDaysPerWeek",
        work_start_time as "workStartTime",
        work_end_time as "workEndTime",
        timezone,
        target_utilization_percent as "targetUtilizationPercent",
        max_allocation_percent as "maxAllocationPercent",
        min_allocation_percent as "minAllocationPercent",
        annual_leave_days as "annualLeaveDays",
        public_holidays_calendar as "publicHolidaysCalendar",
        resource_type as "resourceType",
        cost_center as "costCenter",
        department,
        effective_from as "effectiveFrom",
        effective_until as "effectiveUntil",
        is_active as "isActive",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM resource_capacity_settings
      WHERE user_id = $1 
        AND is_active = TRUE
      ORDER BY effective_from DESC, created_at DESC
      LIMIT 1
    `, [userId])

    const settings = result.rows[0] || null
    logger.info('[CAPACITY] Retrieved capacity settings', { 
      userId, 
      found: !!settings,
      settingsId: settings?.id,
      effectiveFrom: settings?.effectiveFrom 
    })
    return settings
  } catch (error: any) {
    // Handle missing table gracefully - return null if table doesn't exist
    if (error.code === '42P01') {
      logger.warn('[CAPACITY] resource_capacity_settings table not found. Run migration 356.', { userId })
      return null
    }
    logger.error('[CAPACITY] Failed to get capacity settings', { error: error.message, userId })
    throw error
  }
}

/**
 * Get all capacity settings (with optional filters)
 */
export async function getAllCapacitySettings(filters?: {
  resourceType?: string
  department?: string
  isActive?: boolean
}): Promise<ResourceCapacitySettings[]> {
  try {
    let query = `
      SELECT 
        rcs.id,
        rcs.user_id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        rcs.contracted_hours_per_week as "contractedHoursPerWeek",
        rcs.contracted_hours_per_day as "contractedHoursPerDay",
        rcs.contracted_days_per_week as "contractedDaysPerWeek",
        rcs.work_start_time as "workStartTime",
        rcs.work_end_time as "workEndTime",
        rcs.timezone,
        rcs.target_utilization_percent as "targetUtilizationPercent",
        rcs.max_allocation_percent as "maxAllocationPercent",
        rcs.min_allocation_percent as "minAllocationPercent",
        rcs.annual_leave_days as "annualLeaveDays",
        rcs.public_holidays_calendar as "publicHolidaysCalendar",
        rcs.resource_type as "resourceType",
        rcs.cost_center as "costCenter",
        rcs.department,
        rcs.effective_from as "effectiveFrom",
        rcs.effective_until as "effectiveUntil",
        rcs.is_active as "isActive",
        rcs.created_at as "createdAt",
        rcs.updated_at as "updatedAt"
      FROM resource_capacity_settings rcs
      JOIN users u ON rcs.user_id = u.id
      WHERE 1=1
    `
    const values: any[] = []
    let paramCount = 0

    if (filters?.resourceType) {
      paramCount++
      query += ` AND rcs.resource_type = $${paramCount}`
      values.push(filters.resourceType)
    }

    if (filters?.department) {
      paramCount++
      query += ` AND rcs.department = $${paramCount}`
      values.push(filters.department)
    }

    if (filters?.isActive !== undefined) {
      paramCount++
      query += ` AND rcs.is_active = $${paramCount}`
      values.push(filters.isActive)
    }

    query += ` ORDER BY u.name ASC`

    const result = await pool.query(query, values)
    return result.rows
  } catch (error: any) {
    // Handle missing table gracefully - return empty array if table doesn't exist
    if (error.code === '42P01') {
      logger.warn('[CAPACITY] resource_capacity_settings table not found. Run migration 356.')
      return []
    }
    logger.error('[CAPACITY] Failed to get all capacity settings', { error: error.message })
    throw error
  }
}

/**
 * Create or update capacity settings for a user
 */
export async function upsertCapacitySettings(
  settings: Partial<ResourceCapacitySettings>,
  createdBy: string
): Promise<ResourceCapacitySettings> {
  try {
    // If an ID is provided, update that specific row
    if (settings.id) {
      const updateResult = await pool.query(`
        UPDATE resource_capacity_settings SET
          contracted_hours_per_week = $2,
          contracted_hours_per_day = $3,
          contracted_days_per_week = $4,
          work_start_time = $5,
          work_end_time = $6,
          timezone = $7,
          target_utilization_percent = $8,
          max_allocation_percent = $9,
          min_allocation_percent = $10,
          annual_leave_days = $11,
          public_holidays_calendar = $12,
          resource_type = $13,
          cost_center = $14,
          department = $15,
          effective_from = $16,
          effective_until = $17,
          is_active = $18,
          updated_at = NOW()
        WHERE id = $1
        RETURNING 
          id,
          user_id as "userId",
          contracted_hours_per_week as "contractedHoursPerWeek",
          contracted_hours_per_day as "contractedHoursPerDay",
          contracted_days_per_week as "contractedDaysPerWeek",
          work_start_time as "workStartTime",
          work_end_time as "workEndTime",
          timezone,
          target_utilization_percent as "targetUtilizationPercent",
          max_allocation_percent as "maxAllocationPercent",
          min_allocation_percent as "minAllocationPercent",
          annual_leave_days as "annualLeaveDays",
          public_holidays_calendar as "publicHolidaysCalendar",
          resource_type as "resourceType",
          cost_center as "costCenter",
          department,
          effective_from as "effectiveFrom",
          effective_until as "effectiveUntil",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [
        settings.id,
        settings.contractedHoursPerWeek ?? 40,
        settings.contractedHoursPerDay ?? 8,
        settings.contractedDaysPerWeek ?? 5,
        settings.workStartTime ?? '09:00',
        settings.workEndTime ?? '17:00',
        settings.timezone ?? 'UTC',
        settings.targetUtilizationPercent ?? 80,
        settings.maxAllocationPercent ?? 100,
        settings.minAllocationPercent ?? 0,
        settings.annualLeaveDays ?? 25,
        settings.publicHolidaysCalendar ?? 'US',
        settings.resourceType ?? 'full-time',
        settings.costCenter,
        settings.department,
        settings.effectiveFrom ?? new Date().toISOString().split('T')[0],
        settings.effectiveUntil,
        settings.isActive ?? true
      ])
      
      if (updateResult.rows.length > 0) {
        const savedSettings = updateResult.rows[0]
        logger.info('[CAPACITY] Updated existing capacity settings', { 
          userId: settings.userId,
          settingsId: savedSettings.id
        })
        return savedSettings
      }
    }

    // Otherwise, try to find and update the most recent active settings
    const existing = await getCapacitySettings(settings.userId!)
    if (existing && existing.id) {
      const updateResult = await pool.query(`
        UPDATE resource_capacity_settings SET
          contracted_hours_per_week = $2,
          contracted_hours_per_day = $3,
          contracted_days_per_week = $4,
          work_start_time = $5,
          work_end_time = $6,
          timezone = $7,
          target_utilization_percent = $8,
          max_allocation_percent = $9,
          min_allocation_percent = $10,
          annual_leave_days = $11,
          public_holidays_calendar = $12,
          resource_type = $13,
          cost_center = $14,
          department = $15,
          effective_from = $16,
          effective_until = $17,
          is_active = $18,
          updated_at = NOW()
        WHERE id = $1
        RETURNING 
          id,
          user_id as "userId",
          contracted_hours_per_week as "contractedHoursPerWeek",
          contracted_hours_per_day as "contractedHoursPerDay",
          contracted_days_per_week as "contractedDaysPerWeek",
          work_start_time as "workStartTime",
          work_end_time as "workEndTime",
          timezone,
          target_utilization_percent as "targetUtilizationPercent",
          max_allocation_percent as "maxAllocationPercent",
          min_allocation_percent as "minAllocationPercent",
          annual_leave_days as "annualLeaveDays",
          public_holidays_calendar as "publicHolidaysCalendar",
          resource_type as "resourceType",
          cost_center as "costCenter",
          department,
          effective_from as "effectiveFrom",
          effective_until as "effectiveUntil",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [
        existing.id,
        settings.contractedHoursPerWeek ?? existing.contractedHoursPerWeek ?? 40,
        settings.contractedHoursPerDay ?? existing.contractedHoursPerDay ?? 8,
        settings.contractedDaysPerWeek ?? existing.contractedDaysPerWeek ?? 5,
        settings.workStartTime ?? existing.workStartTime ?? '09:00',
        settings.workEndTime ?? existing.workEndTime ?? '17:00',
        settings.timezone ?? existing.timezone ?? 'UTC',
        settings.targetUtilizationPercent ?? existing.targetUtilizationPercent ?? 80,
        settings.maxAllocationPercent ?? existing.maxAllocationPercent ?? 100,
        settings.minAllocationPercent ?? existing.minAllocationPercent ?? 0,
        settings.annualLeaveDays ?? existing.annualLeaveDays ?? 25,
        settings.publicHolidaysCalendar ?? existing.publicHolidaysCalendar ?? 'US',
        settings.resourceType ?? existing.resourceType ?? 'full-time',
        settings.costCenter ?? existing.costCenter,
        settings.department ?? existing.department,
        settings.effectiveFrom ?? existing.effectiveFrom ?? new Date().toISOString().split('T')[0],
        settings.effectiveUntil ?? existing.effectiveUntil,
        settings.isActive ?? existing.isActive ?? true
      ])
      
      if (updateResult.rows.length > 0) {
        const savedSettings = updateResult.rows[0]
        logger.info('[CAPACITY] Updated existing capacity settings (found by user)', { 
          userId: settings.userId,
          settingsId: savedSettings.id
        })
        return savedSettings
      }
    }

    // If no existing settings found, create a new one
    const result = await pool.query(`
      INSERT INTO resource_capacity_settings (
        user_id, contracted_hours_per_week, contracted_hours_per_day, contracted_days_per_week,
        work_start_time, work_end_time, timezone, target_utilization_percent,
        max_allocation_percent, min_allocation_percent, annual_leave_days,
        public_holidays_calendar, resource_type, cost_center, department,
        effective_from, effective_until, is_active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      ON CONFLICT (user_id, effective_from) DO UPDATE SET
        contracted_hours_per_week = EXCLUDED.contracted_hours_per_week,
        contracted_hours_per_day = EXCLUDED.contracted_hours_per_day,
        contracted_days_per_week = EXCLUDED.contracted_days_per_week,
        work_start_time = EXCLUDED.work_start_time,
        work_end_time = EXCLUDED.work_end_time,
        timezone = EXCLUDED.timezone,
        target_utilization_percent = EXCLUDED.target_utilization_percent,
        max_allocation_percent = EXCLUDED.max_allocation_percent,
        min_allocation_percent = EXCLUDED.min_allocation_percent,
        annual_leave_days = EXCLUDED.annual_leave_days,
        public_holidays_calendar = EXCLUDED.public_holidays_calendar,
        resource_type = EXCLUDED.resource_type,
        cost_center = EXCLUDED.cost_center,
        department = EXCLUDED.department,
        effective_until = EXCLUDED.effective_until,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING 
        id,
        user_id as "userId",
        contracted_hours_per_week as "contractedHoursPerWeek",
        contracted_hours_per_day as "contractedHoursPerDay",
        contracted_days_per_week as "contractedDaysPerWeek",
        work_start_time as "workStartTime",
        work_end_time as "workEndTime",
        timezone,
        target_utilization_percent as "targetUtilizationPercent",
        max_allocation_percent as "maxAllocationPercent",
        min_allocation_percent as "minAllocationPercent",
        annual_leave_days as "annualLeaveDays",
        public_holidays_calendar as "publicHolidaysCalendar",
        resource_type as "resourceType",
        cost_center as "costCenter",
        department,
        effective_from as "effectiveFrom",
        effective_until as "effectiveUntil",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      settings.userId,
      settings.contractedHoursPerWeek ?? 40,
      settings.contractedHoursPerDay ?? 8,
      settings.contractedDaysPerWeek ?? 5,
      settings.workStartTime ?? '09:00',
      settings.workEndTime ?? '17:00',
      settings.timezone ?? 'UTC',
      settings.targetUtilizationPercent ?? 80,
      settings.maxAllocationPercent ?? 100,
      settings.minAllocationPercent ?? 0,
      settings.annualLeaveDays ?? 25,
      settings.publicHolidaysCalendar ?? 'US',
      settings.resourceType ?? 'full-time',
      settings.costCenter,
      settings.department,
      settings.effectiveFrom ?? new Date().toISOString().split('T')[0],
      settings.effectiveUntil,
      settings.isActive ?? true,
      createdBy
    ])

    const savedSettings = result.rows[0]
    logger.info('[CAPACITY] Upserted capacity settings', { 
      userId: settings.userId,
      settingsId: savedSettings.id,
      effectiveFrom: savedSettings.effectiveFrom,
      effectiveUntil: savedSettings.effectiveUntil,
      isActive: savedSettings.isActive,
      department: savedSettings.department,
      resourceType: savedSettings.resourceType
    })
    return savedSettings
  } catch (error: any) {
    logger.error('[CAPACITY] Failed to upsert capacity settings', { error: error.message })
    throw error
  }
}

/**
 * Deactivate capacity settings
 */
export async function deactivateCapacitySettings(settingsId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      UPDATE resource_capacity_settings
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [settingsId])

    return result.rowCount > 0
  } catch (error: any) {
    logger.error('[CAPACITY] Failed to deactivate capacity settings', { error: error.message })
    throw error
  }
}

// ================================================================
// CHECKLIST ITEMS FUNCTIONS
// ================================================================

/**
 * Get checklist items for a task
 */
export async function getChecklistItems(taskId: string): Promise<ChecklistItem[]> {
  try {
    const result = await pool.query(`
      SELECT 
        ci.id,
        ci.task_id as "taskId",
        ci.item_name as "itemName",
        ci.description,
        ci.sequence_order as "sequenceOrder",
        ci.assigned_user_id as "assignedUserId",
        ci.assigned_user_name as "assignedUserName",
        ci.assigned_role_id as "assignedRoleId",
        ci.assigned_role_name as "assignedRoleName",
        ci.estimated_hours as "estimatedHours",
        ci.actual_hours as "actualHours",
        ci.is_completed as "isCompleted",
        ci.is_blocked as "isBlocked",
        ci.blocked_reason as "blockedReason",
        ci.priority,
        ci.category,
        ci.due_date as "dueDate",
        ci.completed_at as "completedAt",
        ci.completed_by as "completedBy",
        ci.created_by as "createdBy",
        ci.created_at as "createdAt",
        ci.updated_at as "updatedAt",
        u.name as "assignedUserDisplayName",
        u.email as "assignedUserEmail"
      FROM checklist_items ci
      LEFT JOIN users u ON ci.assigned_user_id = u.id
      WHERE ci.task_id = $1
      ORDER BY ci.sequence_order ASC, ci.created_at ASC
    `, [taskId])

    return result.rows
  } catch (error: any) {
    logger.error('[CHECKLIST] Failed to get checklist items', { error: error.message, taskId })
    throw error
  }
}

/**
 * Create a checklist item
 */
export async function createChecklistItem(
  item: Partial<ChecklistItem>,
  createdBy: string
): Promise<ChecklistItem> {
  try {
    // Get user name if userId is provided
    let assignedUserName = item.assignedUserName
    if (item.assignedUserId && !assignedUserName) {
      const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [item.assignedUserId])
      assignedUserName = userResult.rows[0]?.name
    }

    // Get role name if roleId is provided
    let assignedRoleName = item.assignedRoleName
    if (item.assignedRoleId && !assignedRoleName) {
      const roleResult = await pool.query('SELECT name FROM project_roles WHERE id = $1', [item.assignedRoleId])
      assignedRoleName = roleResult.rows[0]?.name
    }

    const result = await pool.query(`
      INSERT INTO checklist_items (
        task_id, item_name, description, sequence_order,
        assigned_user_id, assigned_user_name, assigned_role_id, assigned_role_name,
        estimated_hours, priority, category, due_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        task_id as "taskId",
        item_name as "itemName",
        description,
        sequence_order as "sequenceOrder",
        assigned_user_id as "assignedUserId",
        assigned_user_name as "assignedUserName",
        assigned_role_id as "assignedRoleId",
        assigned_role_name as "assignedRoleName",
        estimated_hours as "estimatedHours",
        actual_hours as "actualHours",
        is_completed as "isCompleted",
        is_blocked as "isBlocked",
        priority,
        category,
        due_date as "dueDate",
        created_at as "createdAt"
    `, [
      item.taskId,
      item.itemName,
      item.description,
      item.sequenceOrder ?? 0,
      item.assignedUserId,
      assignedUserName,
      item.assignedRoleId,
      assignedRoleName,
      item.estimatedHours,
      item.priority ?? 'medium',
      item.category,
      item.dueDate,
      createdBy
    ])

    logger.info('[CHECKLIST] Created checklist item', { taskId: item.taskId, itemName: item.itemName })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[CHECKLIST] Failed to create checklist item', { error: error.message })
    throw error
  }
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  itemId: string,
  updates: Partial<ChecklistItem>,
  updatedBy: string
): Promise<ChecklistItem> {
  try {
    // Build dynamic update query
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 0

    const fieldMap: { [key: string]: string } = {
      itemName: 'item_name',
      description: 'description',
      sequenceOrder: 'sequence_order',
      assignedUserId: 'assigned_user_id',
      assignedUserName: 'assigned_user_name',
      assignedRoleId: 'assigned_role_id',
      assignedRoleName: 'assigned_role_name',
      estimatedHours: 'estimated_hours',
      actualHours: 'actual_hours',
      isCompleted: 'is_completed',
      isBlocked: 'is_blocked',
      blockedReason: 'blocked_reason',
      priority: 'priority',
      category: 'category',
      dueDate: 'due_date'
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (updates[key as keyof ChecklistItem] !== undefined) {
        paramCount++
        fields.push(`${dbField} = $${paramCount}`)
        values.push(updates[key as keyof ChecklistItem])
      }
    }

    // Handle completion
    if (updates.isCompleted === true) {
      paramCount++
      fields.push(`completed_at = NOW()`)
      fields.push(`completed_by = $${paramCount}`)
      values.push(updatedBy)
    } else if (updates.isCompleted === false) {
      fields.push(`completed_at = NULL`)
      fields.push(`completed_by = NULL`)
    }

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    paramCount++
    values.push(itemId)

    const result = await pool.query(`
      UPDATE checklist_items
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING 
        id,
        task_id as "taskId",
        item_name as "itemName",
        description,
        sequence_order as "sequenceOrder",
        assigned_user_id as "assignedUserId",
        assigned_user_name as "assignedUserName",
        assigned_role_id as "assignedRoleId",
        assigned_role_name as "assignedRoleName",
        estimated_hours as "estimatedHours",
        actual_hours as "actualHours",
        is_completed as "isCompleted",
        is_blocked as "isBlocked",
        blocked_reason as "blockedReason",
        priority,
        category,
        due_date as "dueDate",
        completed_at as "completedAt",
        completed_by as "completedBy",
        updated_at as "updatedAt"
    `, values)

    if (result.rows.length === 0) {
      throw new Error('Checklist item not found')
    }

    logger.info('[CHECKLIST] Updated checklist item', { itemId })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[CHECKLIST] Failed to update checklist item', { error: error.message, itemId })
    throw error
  }
}

/**
 * Delete a checklist item
 */
export async function deleteChecklistItem(itemId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      DELETE FROM checklist_items WHERE id = $1 RETURNING id
    `, [itemId])

    return result.rowCount > 0
  } catch (error: any) {
    logger.error('[CHECKLIST] Failed to delete checklist item', { error: error.message, itemId })
    throw error
  }
}

/**
 * Toggle checklist item completion
 */
export async function toggleChecklistItem(
  itemId: string,
  completedBy: string
): Promise<ChecklistItem> {
  try {
    const result = await pool.query(`
      UPDATE checklist_items
      SET 
        is_completed = NOT is_completed,
        completed_at = CASE WHEN is_completed THEN NULL ELSE NOW() END,
        completed_by = CASE WHEN is_completed THEN NULL ELSE $2 END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        task_id as "taskId",
        item_name as "itemName",
        is_completed as "isCompleted",
        completed_at as "completedAt",
        completed_by as "completedBy"
    `, [itemId, completedBy])

    if (result.rows.length === 0) {
      throw new Error('Checklist item not found')
    }

    return result.rows[0]
  } catch (error: any) {
    logger.error('[CHECKLIST] Failed to toggle checklist item', { error: error.message, itemId })
    throw error
  }
}

/**
 * Reorder checklist items
 */
export async function reorderChecklistItems(
  taskId: string,
  itemOrder: { id: string; sequenceOrder: number }[]
): Promise<void> {
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      for (const item of itemOrder) {
        await client.query(`
          UPDATE checklist_items
          SET sequence_order = $1, updated_at = NOW()
          WHERE id = $2 AND task_id = $3
        `, [item.sequenceOrder, item.id, taskId])
      }
      
      await client.query('COMMIT')
      logger.info('[CHECKLIST] Reordered checklist items', { taskId, count: itemOrder.length })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    logger.error('[CHECKLIST] Failed to reorder checklist items', { error: error.message, taskId })
    throw error
  }
}

// ================================================================
// UNAVAILABILITY FUNCTIONS
// ================================================================

/**
 * Get unavailability records for a user
 */
export async function getUnavailability(
  userId: string,
  filters?: { startDate?: string; endDate?: string; status?: string }
): Promise<ResourceUnavailability[]> {
  try {
    let query = `
      SELECT 
        id,
        user_id as "userId",
        unavailability_type as "unavailabilityType",
        description,
        start_date as "startDate",
        end_date as "endDate",
        is_full_day as "isFullDay",
        start_time as "startTime",
        end_time as "endTime",
        hours_unavailable as "hoursUnavailable",
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM resource_unavailability
      WHERE user_id = $1
    `
    const values: any[] = [userId]
    let paramCount = 1

    if (filters?.startDate) {
      paramCount++
      query += ` AND end_date >= $${paramCount}`
      values.push(filters.startDate)
    }

    if (filters?.endDate) {
      paramCount++
      query += ` AND start_date <= $${paramCount}`
      values.push(filters.endDate)
    }

    if (filters?.status) {
      paramCount++
      query += ` AND status = $${paramCount}`
      values.push(filters.status)
    }

    query += ` ORDER BY start_date DESC`

    const result = await pool.query(query, values)
    return result.rows
  } catch (error: any) {
    // Handle missing table gracefully - return empty array if table doesn't exist
    if (error.code === '42P01') {
      logger.warn('[UNAVAILABILITY] resource_unavailability table not found. Run migration 356.', { userId })
      return []
    }
    logger.error('[UNAVAILABILITY] Failed to get unavailability', { error: error.message, userId })
    throw error
  }
}

/**
 * Get all pending unavailability requests (for managers)
 */
export async function getPendingUnavailabilityRequests(): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        ru.id,
        ru.user_id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        ru.unavailability_type as "unavailabilityType",
        ru.description,
        ru.start_date as "startDate",
        ru.end_date as "endDate",
        ru.is_full_day as "isFullDay",
        ru.hours_unavailable as "hoursUnavailable",
        ru.status,
        ru.created_at as "createdAt"
      FROM resource_unavailability ru
      JOIN users u ON ru.user_id = u.id
      WHERE ru.status = 'pending'
      ORDER BY ru.start_date ASC
    `)
    return result.rows
  } catch (error: any) {
    // Handle missing table gracefully - return empty array if table doesn't exist
    if (error.code === '42P01') {
      logger.warn('[UNAVAILABILITY] resource_unavailability table not found. Run migration 356.')
      return []
    }
    logger.error('[UNAVAILABILITY] Failed to get pending requests', { error: error.message })
    throw error
  }
}

/**
 * Create unavailability record
 */
export async function createUnavailability(
  unavailability: Partial<ResourceUnavailability>,
  createdBy: string
): Promise<ResourceUnavailability> {
  try {
    // Calculate hours if not provided
    let hoursUnavailable = unavailability.hoursUnavailable
    if (!hoursUnavailable && unavailability.startDate && unavailability.endDate) {
      const start = new Date(unavailability.startDate)
      const end = new Date(unavailability.endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      hoursUnavailable = days * 8 // Assume 8 hours per day
    }

    const result = await pool.query(`
      INSERT INTO resource_unavailability (
        user_id, unavailability_type, description, start_date, end_date,
        is_full_day, start_time, end_time, hours_unavailable, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        user_id as "userId",
        unavailability_type as "unavailabilityType",
        description,
        start_date as "startDate",
        end_date as "endDate",
        is_full_day as "isFullDay",
        start_time as "startTime",
        end_time as "endTime",
        hours_unavailable as "hoursUnavailable",
        status,
        created_at as "createdAt"
    `, [
      unavailability.userId,
      unavailability.unavailabilityType,
      unavailability.description,
      unavailability.startDate,
      unavailability.endDate,
      unavailability.isFullDay ?? true,
      unavailability.startTime,
      unavailability.endTime,
      hoursUnavailable,
      unavailability.status ?? 'pending',
      createdBy
    ])

    logger.info('[UNAVAILABILITY] Created unavailability record', { 
      userId: unavailability.userId, 
      type: unavailability.unavailabilityType 
    })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[UNAVAILABILITY] Failed to create unavailability', { error: error.message })
    throw error
  }
}

/**
 * Update unavailability status (approve/reject)
 */
export async function updateUnavailabilityStatus(
  unavailabilityId: string,
  status: 'approved' | 'rejected' | 'cancelled',
  approvedBy: string
): Promise<ResourceUnavailability> {
  try {
    const result = await pool.query(`
      UPDATE resource_unavailability
      SET 
        status = $1,
        approved_by = $2,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        id,
        user_id as "userId",
        unavailability_type as "unavailabilityType",
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt"
    `, [status, approvedBy, unavailabilityId])

    if (result.rows.length === 0) {
      throw new Error('Unavailability record not found')
    }

    logger.info('[UNAVAILABILITY] Updated unavailability status', { unavailabilityId, status })
    return result.rows[0]
  } catch (error: any) {
    logger.error('[UNAVAILABILITY] Failed to update unavailability status', { error: error.message })
    throw error
  }
}

/**
 * Delete unavailability record
 */
export async function deleteUnavailability(unavailabilityId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      DELETE FROM resource_unavailability WHERE id = $1 RETURNING id
    `, [unavailabilityId])

    return result.rowCount > 0
  } catch (error: any) {
    logger.error('[UNAVAILABILITY] Failed to delete unavailability', { error: error.message })
    throw error
  }
}

// ================================================================
// UTILIZATION QUERY FUNCTIONS
// ================================================================

/**
 * Get portfolio-level resource utilization
 */
export async function getPortfolioUtilization(): Promise<PortfolioUtilization[]> {
  try {
    const result = await pool.query(`
      SELECT 
        user_id as "userId",
        user_name as "userName",
        user_email as "userEmail",
        resource_type as "resourceType",
        contracted_weekly_hours as "contractedWeeklyHours",
        monthly_capacity_hours as "monthlyCapacityHours",
        target_utilization_percent as "targetUtilizationPercent",
        max_allocation_percent as "maxAllocationPercent",
        total_planned_hours as "totalPlannedHours",
        total_actual_hours as "totalActualHours",
        projects_assigned as "projectsAssigned",
        unavailable_hours_next_30_days as "unavailableHoursNext30Days",
        available_capacity_hours as "availableCapacityHours",
        planned_utilization_percent as "plannedUtilizationPercent",
        actual_utilization_percent as "actualUtilizationPercent",
        allocation_status as "allocationStatus",
        hours_to_target as "hoursToTarget",
        hours_to_max as "hoursToMax"
      FROM portfolio_resource_utilization
      ORDER BY user_name ASC
    `)

    return result.rows
  } catch (error: any) {
    // Handle missing view gracefully - return empty array if view doesn't exist
    if (error.code === '42P01') {
      logger.warn('[UTILIZATION] portfolio_resource_utilization view not found. Run migration 356.')
      return []
    }
    logger.error('[UTILIZATION] Failed to get portfolio utilization', { error: error.message })
    throw error
  }
}

/**
 * Get portfolio capacity summary
 */
export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const defaultSummary: PortfolioSummary = {
    totalResources: 0,
    fullTimeCount: 0,
    otherCount: 0,
    totalWeeklyCapacity: 0,
    totalMonthlyCapacity: 0,
    totalAvailableCapacity: 0,
    totalPlannedHours: 0,
    totalActualHours: 0,
    avgUtilizationPercent: 0,
    avgActiveUtilization: 0,
    overAllocatedCount: 0,
    over100Count: 0,
    optimalCount: 0,
    underTargetCount: 0,
    lowUtilizationCount: 0,
    unallocatedCount: 0,
    targetAchievementPercent: 0
  }

  try {
    const result = await pool.query(`
      SELECT 
        total_resources as "totalResources",
        full_time_count as "fullTimeCount",
        other_count as "otherCount",
        total_weekly_capacity as "totalWeeklyCapacity",
        total_monthly_capacity as "totalMonthlyCapacity",
        total_available_capacity as "totalAvailableCapacity",
        total_planned_hours as "totalPlannedHours",
        total_actual_hours as "totalActualHours",
        avg_utilization_percent as "avgUtilizationPercent",
        avg_active_utilization as "avgActiveUtilization",
        over_allocated_count as "overAllocatedCount",
        over_100_count as "over100Count",
        optimal_count as "optimalCount",
        under_target_count as "underTargetCount",
        low_utilization_count as "lowUtilizationCount",
        unallocated_count as "unallocatedCount",
        target_achievement_percent as "targetAchievementPercent"
      FROM portfolio_capacity_summary
    `)

    return result.rows[0] || defaultSummary
  } catch (error: any) {
    // Handle missing view gracefully - return default summary if view doesn't exist
    if (error.code === '42P01') {
      logger.warn('[UTILIZATION] portfolio_capacity_summary view not found. Run migration 356.')
      return defaultSummary
    }
    logger.error('[UTILIZATION] Failed to get portfolio summary', { error: error.message })
    throw error
  }
}

/**
 * Get program-level resource summary
 */
export async function getProgramResourceSummary(programId: string): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        program_id as "programId",
        program_name as "programName",
        user_id as "userId",
        user_name as "userName",
        total_planned_hours as "totalPlannedHours",
        total_actual_hours as "totalActualHours",
        projects_assigned as "projectsAssigned",
        total_tasks as "totalTasks",
        total_checklist_items as "totalChecklistItems",
        program_allocated_hours as "programAllocatedHours"
      FROM program_resource_summary
      WHERE program_id = $1
      ORDER BY user_name ASC
    `, [programId])

    return result.rows
  } catch (error: any) {
    logger.error('[UTILIZATION] Failed to get program resource summary', { error: error.message, programId })
    throw error
  }
}

/**
 * Get project-level resource summary
 */
export async function getProjectResourceSummary(projectId: string): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        project_id as "projectId",
        project_name as "projectName",
        user_id as "userId",
        user_name as "userName",
        task_planned_hours as "taskPlannedHours",
        task_actual_hours as "taskActualHours",
        checklist_estimated_hours as "checklistEstimatedHours",
        checklist_actual_hours as "checklistActualHours",
        total_planned_hours as "totalPlannedHours",
        total_actual_hours as "totalActualHours",
        assigned_tasks as "assignedTasks",
        assigned_checklist_items as "assignedChecklistItems"
      FROM project_resource_summary
      WHERE project_id = $1
      ORDER BY user_name ASC
    `, [projectId])

    return result.rows
  } catch (error: any) {
    logger.error('[UTILIZATION] Failed to get project resource summary', { error: error.message, projectId })
    throw error
  }
}

/**
 * Get user utilization details
 */
export async function getUserUtilizationDetails(userId: string): Promise<any> {
  try {
    // Get capacity settings
    const capacityResult = await pool.query(`
      SELECT * FROM portfolio_resource_utilization WHERE user_id = $1
    `, [userId])

    // Get task breakdown
    const tasksResult = await pool.query(`
      SELECT * FROM task_resource_utilization WHERE user_id = $1
    `, [userId])

    // Get checklist breakdown
    const checklistResult = await pool.query(`
      SELECT * FROM checklist_resource_utilization WHERE user_id = $1
    `, [userId])

    // Get upcoming unavailability
    const unavailabilityResult = await pool.query(`
      SELECT * FROM resource_unavailability 
      WHERE user_id = $1 
        AND status = 'approved'
        AND end_date >= CURRENT_DATE
      ORDER BY start_date ASC
    `, [userId])

    return {
      utilization: capacityResult.rows[0],
      tasks: tasksResult.rows,
      checklistItems: checklistResult.rows,
      upcomingUnavailability: unavailabilityResult.rows
    }
  } catch (error: any) {
    logger.error('[UTILIZATION] Failed to get user utilization details', { error: error.message, userId })
    throw error
  }
}

/**
 * Get all tasks with resource assignments (portfolio-wide)
 */
export async function getAllTasksWithResources(filters?: {
  projectId?: string
  userId?: string
  status?: string
}): Promise<any[]> {
  try {
    let query = `
      SELECT 
        t.id as "taskId",
        t.task_name as "taskName",
        t.task_number as "taskNumber",
        t.project_id as "projectId",
        p.name as "projectName",
        t.status as "taskStatus",
        t.percent_complete as "percentComplete",
        t.planned_start_date as "plannedStartDate",
        t.planned_end_date as "plannedEndDate",
        t.estimated_hours as "estimatedHours",
        ta.id as "assignmentId",
        ta.user_id as "userId",
        ta.user_name as "userName",
        ta.role_name as "roleName",
        ta.planned_hours as "plannedHours",
        ta.actual_hours as "actualHours",
        ta.status as "assignmentStatus",
        ta.scheduled_start_date as "scheduledStartDate",
        ta.scheduled_end_date as "scheduledEndDate",
        ta.allocation_percentage as "allocationPercentage"
      FROM project_tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      INNER JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    if (filters?.projectId) {
      query += ` AND t.project_id = $${paramIndex++}`
      params.push(filters.projectId)
    }
    
    if (filters?.userId) {
      query += ` AND ta.user_id = $${paramIndex++}`
      params.push(filters.userId)
    }
    
    if (filters?.status) {
      query += ` AND ta.status = $${paramIndex++}`
      params.push(filters.status)
    }
    
    query += ` ORDER BY p.name, t.task_number, ta.user_name`
    
    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    // Handle missing table gracefully
    if (error.code === '42P01') {
      logger.warn('[TASKS] task_assignments table not found', { filters })
      return []
    }
    logger.error('[TASKS] Failed to get tasks with resources', { error: error.message, filters })
    throw error
  }
}

/**
 * Get all checklist items with resource assignments (portfolio-wide)
 */
export async function getAllChecklistItemsWithResources(filters?: {
  projectId?: string
  taskId?: string
  userId?: string
  isCompleted?: boolean
}): Promise<any[]> {
  try {
    let query = `
      SELECT 
        ci.id as "itemId",
        ci.item_name as "itemName",
        ci.description,
        ci.task_id as "taskId",
        t.task_name as "taskName",
        t.task_number as "taskNumber",
        t.project_id as "projectId",
        p.name as "projectName",
        ci.assigned_user_id as "userId",
        ci.assigned_user_name as "userName",
        ci.assigned_role_id as "roleId",
        ci.assigned_role_name as "roleName",
        ci.estimated_hours as "estimatedHours",
        ci.actual_hours as "actualHours",
        ci.is_completed as "isCompleted",
        ci.is_blocked as "isBlocked",
        ci.priority,
        ci.category,
        ci.due_date as "dueDate",
        ci.sequence_order as "sequenceOrder"
      FROM checklist_items ci
      INNER JOIN project_tasks t ON ci.task_id = t.id
      INNER JOIN projects p ON t.project_id = p.id
      WHERE ci.assigned_user_id IS NOT NULL
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    if (filters?.projectId) {
      query += ` AND t.project_id = $${paramIndex++}`
      params.push(filters.projectId)
    }
    
    if (filters?.taskId) {
      query += ` AND ci.task_id = $${paramIndex++}`
      params.push(filters.taskId)
    }
    
    if (filters?.userId) {
      query += ` AND ci.assigned_user_id = $${paramIndex++}`
      params.push(filters.userId)
    }
    
    if (filters?.isCompleted !== undefined) {
      query += ` AND ci.is_completed = $${paramIndex++}`
      params.push(filters.isCompleted)
    }
    
    query += ` ORDER BY p.name, t.task_number, ci.sequence_order`
    
    const result = await pool.query(query, params)
    return result.rows
  } catch (error: any) {
    // Handle missing table gracefully
    if (error.code === '42P01') {
      logger.warn('[CHECKLIST] checklist_items table not found', { filters })
      return []
    }
    logger.error('[CHECKLIST] Failed to get all checklist items with resources', { error: error.message, filters })
    throw error
  }
}

