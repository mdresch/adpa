/**
 * Mitigation Plan Service
 * TASK-1135: Mitigation plans tracked to completion
 * 
 * Provides CRUD operations and completion tracking for risk mitigation plans
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface MitigationPlan {
  id: string
  risk_id: string
  title: string
  description?: string
  action_type: 'mitigation' | 'contingency' | 'avoidance' | 'transfer' | 'acceptance'
  owner_id?: string
  assigned_to?: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  completion_percentage: number
  planned_start_date?: string
  planned_completion_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  due_date?: string
  progress_notes?: string[]
  completion_notes?: string
  completion_evidence?: Record<string, any>
  priority: 'critical' | 'high' | 'medium' | 'low'
  expected_effectiveness?: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  created_by?: string
  completed_by?: string
  completed_at?: string
}

export interface CreateMitigationPlanInput {
  risk_id: string
  title: string
  description?: string
  action_type?: 'mitigation' | 'contingency' | 'avoidance' | 'transfer' | 'acceptance'
  owner_id?: string
  assigned_to?: string
  planned_start_date?: string
  planned_completion_date?: string
  due_date?: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  expected_effectiveness?: number
  metadata?: Record<string, any>
}

export interface UpdateMitigationPlanInput {
  title?: string
  description?: string
  action_type?: 'mitigation' | 'contingency' | 'avoidance' | 'transfer' | 'acceptance'
  owner_id?: string
  assigned_to?: string
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  completion_percentage?: number
  planned_start_date?: string
  planned_completion_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  due_date?: string
  progress_notes?: string[]
  completion_notes?: string
  completion_evidence?: Record<string, any>
  priority?: 'critical' | 'high' | 'medium' | 'low'
  expected_effectiveness?: number
  metadata?: Record<string, any>
}

export interface MitigationPlanFilters {
  risk_id?: string
  status?: string[]
  owner_id?: string
  assigned_to?: string
  priority?: string[]
  action_type?: string[]
  overdue?: boolean
  due_before?: string
}

export interface MitigationPlanStats {
  total: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
  completion_rate: number
  overdue_count: number
  completion_percentage_avg: number
}

/**
 * Get all mitigation plans with optional filters
 */
export async function getMitigationPlans(
  filters: MitigationPlanFilters = {},
  userId?: string
): Promise<MitigationPlan[]> {
  try {
    let query = `
      SELECT 
        mp.*,
        u1.name as owner_name,
        u2.name as assigned_to_name,
        u3.name as created_by_name,
        u4.name as completed_by_name
      FROM mitigation_plans mp
      LEFT JOIN users u1 ON mp.owner_id = u1.id
      LEFT JOIN users u2 ON mp.assigned_to = u2.id
      LEFT JOIN users u3 ON mp.created_by = u3.id
      LEFT JOIN users u4 ON mp.completed_by = u4.id
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramCount = 0
    
    if (filters.risk_id) {
      paramCount++
      query += ` AND mp.risk_id = $${paramCount}`
      params.push(filters.risk_id)
    }
    
    if (filters.status && filters.status.length > 0) {
      paramCount++
      query += ` AND mp.status = ANY($${paramCount}::text[])`
      params.push(filters.status)
    }
    
    if (filters.owner_id) {
      paramCount++
      query += ` AND mp.owner_id = $${paramCount}`
      params.push(filters.owner_id)
    }
    
    if (filters.assigned_to) {
      paramCount++
      query += ` AND mp.assigned_to = $${paramCount}`
      params.push(filters.assigned_to)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      paramCount++
      query += ` AND mp.priority = ANY($${paramCount}::text[])`
      params.push(filters.priority)
    }
    
    if (filters.action_type && filters.action_type.length > 0) {
      paramCount++
      query += ` AND mp.action_type = ANY($${paramCount}::text[])`
      params.push(filters.action_type)
    }
    
    if (filters.overdue) {
      query += ` AND mp.due_date < CURRENT_DATE AND mp.status NOT IN ('completed', 'cancelled')`
    }
    
    if (filters.due_before) {
      paramCount++
      query += ` AND mp.due_date <= $${paramCount}`
      params.push(filters.due_before)
    }
    
    query += ` ORDER BY mp.priority DESC, mp.due_date ASC NULLS LAST, mp.created_at DESC`
    
    const result = await pool.query(query, params)
    
    return result.rows.map(row => ({
      id: row.id,
      risk_id: row.risk_id,
      title: row.title,
      description: row.description,
      action_type: row.action_type,
      owner_id: row.owner_id,
      assigned_to: row.assigned_to,
      status: row.status,
      completion_percentage: row.completion_percentage,
      planned_start_date: row.planned_start_date,
      planned_completion_date: row.planned_completion_date,
      actual_start_date: row.actual_start_date,
      actual_completion_date: row.actual_completion_date,
      due_date: row.due_date,
      progress_notes: row.progress_notes || [],
      completion_notes: row.completion_notes,
      completion_evidence: row.completion_evidence || {},
      priority: row.priority,
      expected_effectiveness: row.expected_effectiveness,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      completed_by: row.completed_by,
      completed_at: row.completed_at,
    }))
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to get mitigation plans:', error)
    throw error
  }
}

/**
 * Get a single mitigation plan by ID
 */
export async function getMitigationPlanById(planId: string): Promise<MitigationPlan | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM mitigation_plans WHERE id = $1`,
      [planId]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      id: row.id,
      risk_id: row.risk_id,
      title: row.title,
      description: row.description,
      action_type: row.action_type,
      owner_id: row.owner_id,
      assigned_to: row.assigned_to,
      status: row.status,
      completion_percentage: row.completion_percentage,
      planned_start_date: row.planned_start_date,
      planned_completion_date: row.planned_completion_date,
      actual_start_date: row.actual_start_date,
      actual_completion_date: row.actual_completion_date,
      due_date: row.due_date,
      progress_notes: row.progress_notes || [],
      completion_notes: row.completion_notes,
      completion_evidence: row.completion_evidence || {},
      priority: row.priority,
      expected_effectiveness: row.expected_effectiveness,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      completed_by: row.completed_by,
      completed_at: row.completed_at,
    }
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to get mitigation plan:', error)
    throw error
  }
}

/**
 * Create a new mitigation plan
 */
export async function createMitigationPlan(
  input: CreateMitigationPlanInput,
  userId: string
): Promise<MitigationPlan> {
  try {
    const result = await pool.query(
      `INSERT INTO mitigation_plans (
        risk_id, title, description, action_type, owner_id, assigned_to,
        planned_start_date, planned_completion_date, due_date, priority,
        expected_effectiveness, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        input.risk_id,
        input.title,
        input.description || null,
        input.action_type || 'mitigation',
        input.owner_id || null,
        input.assigned_to || null,
        input.planned_start_date || null,
        input.planned_completion_date || null,
        input.due_date || null,
        input.priority || 'medium',
        input.expected_effectiveness || null,
        JSON.stringify(input.metadata || {}),
        userId
      ]
    )
    
    const row = result.rows[0]
    return await getMitigationPlanById(row.id) as MitigationPlan
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to create mitigation plan:', error)
    throw error
  }
}

/**
 * Update an existing mitigation plan
 */
export async function updateMitigationPlan(
  planId: string,
  input: UpdateMitigationPlanInput,
  userId: string
): Promise<MitigationPlan> {
  try {
    const updates: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (input.title !== undefined) {
      paramCount++
      updates.push(`title = $${paramCount}`)
      params.push(input.title)
    }
    
    if (input.description !== undefined) {
      paramCount++
      updates.push(`description = $${paramCount}`)
      params.push(input.description)
    }
    
    if (input.action_type !== undefined) {
      paramCount++
      updates.push(`action_type = $${paramCount}`)
      params.push(input.action_type)
    }
    
    if (input.owner_id !== undefined) {
      paramCount++
      updates.push(`owner_id = $${paramCount}`)
      params.push(input.owner_id)
    }
    
    if (input.assigned_to !== undefined) {
      paramCount++
      updates.push(`assigned_to = $${paramCount}`)
      params.push(input.assigned_to)
    }
    
    // Get current plan to check status change
    const currentPlan = await getMitigationPlanById(planId)
    const isStatusChangingToCompleted = input.status === 'completed' && currentPlan?.status !== 'completed'
    const isStatusChangingFromCompleted = input.status !== undefined && input.status !== 'completed' && currentPlan?.status === 'completed'
    
    if (input.status !== undefined) {
      paramCount++
      updates.push(`status = $${paramCount}`)
      params.push(input.status)
      
      // Auto-set actual_start_date when status changes to in_progress
      if (input.status === 'in_progress') {
        paramCount++
        updates.push(`actual_start_date = COALESCE(actual_start_date, CURRENT_DATE)`)
      }
      
      // Auto-set completion fields when status changes to completed
      if (isStatusChangingToCompleted) {
        // Set completion_percentage to 100 if not already set
        if (input.completion_percentage === undefined) {
          paramCount++
          updates.push(`completion_percentage = $${paramCount}`)
          params.push(100)
        }
        
        // Set actual_completion_date if not already set
        if (input.actual_completion_date === undefined) {
          updates.push(`actual_completion_date = COALESCE(actual_completion_date, CURRENT_DATE)`)
        }
        
        // Set completed_at if not already set
        updates.push(`completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`)
        
        // Set completed_by if not already set (use COALESCE to preserve existing value)
        // We need to check current plan's completed_by to avoid overwriting
        if (!currentPlan?.completed_by) {
          paramCount++
          updates.push(`completed_by = $${paramCount}`)
          params.push(userId)
        }
      }
      
      // Reset completion fields if status changes from completed
      if (isStatusChangingFromCompleted) {
        updates.push(`completed_at = NULL`)
        updates.push(`completed_by = NULL`)
        updates.push(`actual_completion_date = NULL`)
      }
    }
    
    if (input.completion_percentage !== undefined) {
      paramCount++
      updates.push(`completion_percentage = $${paramCount}`)
      params.push(input.completion_percentage)
    }
    
    if (input.planned_start_date !== undefined) {
      paramCount++
      updates.push(`planned_start_date = $${paramCount}`)
      params.push(input.planned_start_date)
    }
    
    if (input.planned_completion_date !== undefined) {
      paramCount++
      updates.push(`planned_completion_date = $${paramCount}`)
      params.push(input.planned_completion_date)
    }
    
    if (input.actual_start_date !== undefined) {
      paramCount++
      updates.push(`actual_start_date = $${paramCount}`)
      params.push(input.actual_start_date)
    }
    
    if (input.actual_completion_date !== undefined) {
      paramCount++
      updates.push(`actual_completion_date = $${paramCount}`)
      params.push(input.actual_completion_date)
    }
    
    if (input.due_date !== undefined) {
      paramCount++
      updates.push(`due_date = $${paramCount}`)
      params.push(input.due_date)
    }
    
    if (input.progress_notes !== undefined) {
      paramCount++
      updates.push(`progress_notes = $${paramCount}`)
      params.push(input.progress_notes)
    }
    
    if (input.completion_notes !== undefined) {
      paramCount++
      updates.push(`completion_notes = $${paramCount}`)
      params.push(input.completion_notes)
    }
    
    if (input.completion_evidence !== undefined) {
      paramCount++
      updates.push(`completion_evidence = $${paramCount}`)
      params.push(JSON.stringify(input.completion_evidence))
    }
    
    if (input.priority !== undefined) {
      paramCount++
      updates.push(`priority = $${paramCount}`)
      params.push(input.priority)
    }
    
    if (input.expected_effectiveness !== undefined) {
      paramCount++
      updates.push(`expected_effectiveness = $${paramCount}`)
      params.push(input.expected_effectiveness)
    }
    
    if (input.metadata !== undefined) {
      paramCount++
      updates.push(`metadata = $${paramCount}`)
      params.push(JSON.stringify(input.metadata))
    }
    
    if (updates.length === 0) {
      return await getMitigationPlanById(planId) as MitigationPlan
    }
    
    paramCount++
    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(planId)
    
    await pool.query(
      `UPDATE mitigation_plans SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      params
    )
    
    return await getMitigationPlanById(planId) as MitigationPlan
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to update mitigation plan:', error)
    throw error
  }
}

/**
 * Delete a mitigation plan
 */
export async function deleteMitigationPlan(planId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM mitigation_plans WHERE id = $1`,
      [planId]
    )
    
    return result.rowCount !== null && result.rowCount > 0
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to delete mitigation plan:', error)
    throw error
  }
}

/**
 * Get mitigation plan statistics
 */
export async function getMitigationPlanStats(
  filters: MitigationPlanFilters = {}
): Promise<MitigationPlanStats> {
  try {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'planned') as planned,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical,
        COUNT(*) FILTER (WHERE priority = 'high') as high,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium,
        COUNT(*) FILTER (WHERE priority = 'low') as low,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue,
        COALESCE(AVG(completion_percentage), 0) as avg_completion
      FROM mitigation_plans
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramCount = 0
    
    if (filters.risk_id) {
      paramCount++
      query += ` AND risk_id = $${paramCount}`
      params.push(filters.risk_id)
    }
    
    if (filters.status && filters.status.length > 0) {
      paramCount++
      query += ` AND status = ANY($${paramCount}::text[])`
      params.push(filters.status)
    }
    
    const result = await pool.query(query, params)
    const row = result.rows[0]
    
    const total = parseInt(row.total) || 0
    const completed = parseInt(row.completed) || 0
    const completion_rate = total > 0 ? (completed / total) * 100 : 0
    
    return {
      total,
      by_status: {
        completed: parseInt(row.completed) || 0,
        planned: parseInt(row.planned) || 0,
        in_progress: parseInt(row.in_progress) || 0,
        cancelled: parseInt(row.cancelled) || 0,
        on_hold: parseInt(row.on_hold) || 0,
      },
      by_priority: {
        critical: parseInt(row.critical) || 0,
        high: parseInt(row.high) || 0,
        medium: parseInt(row.medium) || 0,
        low: parseInt(row.low) || 0,
      },
      completion_rate: Math.round(completion_rate * 100) / 100,
      overdue_count: parseInt(row.overdue) || 0,
      completion_percentage_avg: Math.round(parseFloat(row.avg_completion) * 100) / 100,
    }
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to get mitigation plan stats:', error)
    throw error
  }
}

/**
 * Get mitigation completion percentage for a risk
 */
export async function getRiskMitigationCompletion(riskId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT calculate_risk_mitigation_completion($1) as completion`,
      [riskId]
    )
    
    return parseInt(result.rows[0].completion) || 0
  } catch (error: any) {
    logger.error('[MITIGATION-PLANS] Failed to get risk mitigation completion:', error)
    return 0
  }
}

