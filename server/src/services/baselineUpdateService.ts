;(async function(){ try{ await (require('../lib/db')).initDb() } catch(e){} })();
/**
 * Baseline Update Service
 * TASK-746: Baseline update upon approval
 * 
 * Handles automatic baseline updates when change requests are approved.
 * Implements Phase 3: Workflow Automation from DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md
 */

import { pool, getDatabasePool } from '../database/connection'
import { logger } from '../utils/logger'
import { PoolClient } from 'pg'

export interface BaselineUpdateResult {
  updateId?: string
  baselineId: string
  baselineVersion: string
  updatedFields: string[]
  updateSummary: string
  success: boolean
  message: string
}

export interface BaselineChange {
  entityType: string
  driftType: 'added' | 'removed' | 'modified'
  description: string
  baselineValue: any
  currentValue: any
  requiresApproval?: boolean
}

/**
 * Update baseline from an approved change request
 */
export async function updateBaselineFromChangeRequest(
  changeRequestId: string,
  approvedBy: string
): Promise<BaselineUpdateResult> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    logger.info('[BASELINE-UPDATE] Updating baseline from approved CR', {
      changeRequestId,
      approvedBy
    })
    
    // Call the database function to update the baseline
    const result = await client.query(
      `SELECT update_baseline_from_cr($1, $2) as update_id`,
      [changeRequestId, approvedBy]
    )
    
    const updateId = result.rows[0]?.update_id
    
    if (!updateId) {
      await client.query('ROLLBACK')
      return {
        baselineId: '',
        baselineVersion: '',
        updatedFields: [],
        updateSummary: 'No baseline changes found in change request',
        success: false,
        message: 'Change request did not contain baseline updates or no active baseline exists'
      }
    }
    
    // Get update details
    const updateDetails = await client.query(
      `SELECT 
        bcu.*,
        pb.id as baseline_id,
        pb.version as baseline_version
       FROM baseline_cr_updates bcu
       JOIN project_baselines pb ON bcu.baseline_id = pb.id
       WHERE bcu.id = $1`,
      [updateId]
    )
    
    if (updateDetails.rows.length === 0) {
      await client.query('ROLLBACK')
      throw new Error(`Baseline update record not found: ${updateId}`)
    }
    
    const update = updateDetails.rows[0]
    
    await client.query('COMMIT')
    
    logger.info('[BASELINE-UPDATE] Baseline updated successfully', {
      updateId,
      baselineId: update.baseline_id,
      baselineVersion: update.baseline_version_after,
      changeRequestId
    })
    
    return {
      updateId,
      baselineId: update.baseline_id,
      baselineVersion: update.baseline_version_after,
      updatedFields: update.updated_fields?.fields || [],
      updateSummary: update.update_summary,
      success: true,
      message: `Baseline updated to version ${update.baseline_version_after}`
    }
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('[BASELINE-UPDATE] Error updating baseline from CR:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get baseline update history for a project
 */
export async function getBaselineUpdateHistory(
  projectId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const result = await getDatabasePool().query(
      `SELECT 
        bcu.*,
        pb.version as current_baseline_version,
        d.title as change_request_title,
        d.status as change_request_status,
        u.email as approved_by_email
       FROM baseline_cr_updates bcu
       JOIN project_baselines pb ON bcu.baseline_id = pb.id
       LEFT JOIN documents d ON bcu.change_request_id = d.id
       LEFT JOIN users u ON bcu.approved_by = u.id
       WHERE pb.project_id = $1
       ORDER BY bcu.approved_at DESC
       LIMIT $2`,
      [projectId, limit]
    )
    
    return result.rows
  } catch (error) {
    logger.error('[BASELINE-UPDATE] Error fetching baseline update history:', error)
    throw error
  }
}

/**
 * Get baseline update details by update ID
 */
export async function getBaselineUpdateDetails(updateId: string): Promise<any> {
  try {
    const result = await getDatabasePool().query(
      `SELECT 
        bcu.*,
        pb.id as baseline_id,
        pb.project_id,
        pb.version as current_baseline_version,
        pb.status as baseline_status,
        d.title as change_request_title,
        d.content as change_request_content,
        d.status as change_request_status,
        u.email as approved_by_email,
        p.name as project_name
       FROM baseline_cr_updates bcu
       JOIN project_baselines pb ON bcu.baseline_id = pb.id
       JOIN documents d ON bcu.change_request_id = d.id
       LEFT JOIN users u ON bcu.approved_by = u.id
       LEFT JOIN projects p ON pb.project_id = p.id
       WHERE bcu.id = $1`,
      [updateId]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    logger.error('[BASELINE-UPDATE] Error fetching baseline update details:', error)
    throw error
  }
}

/**
 * Get baseline changes from a change request before approval
 * This allows previewing what baseline changes will be made
 */
export async function previewBaselineChanges(
  changeRequestId: string
): Promise<any> {
  try {
    const result = await getDatabasePool().query(
      `SELECT extract_baseline_changes_from_cr($1) as baseline_changes`,
      [changeRequestId]
    )
    
    const baselineChanges = result.rows[0]?.baseline_changes || {}
    
    // Count changes by component
    const changesSummary = {
      scope_baseline: baselineChanges.scope_baseline ? 
        (Array.isArray(baselineChanges.scope_baseline) ? baselineChanges.scope_baseline.length : 0) : 0,
      technical_baseline: baselineChanges.technical_baseline ? 
        (Array.isArray(baselineChanges.technical_baseline) ? baselineChanges.technical_baseline.length : 0) : 0,
      timeline_baseline: baselineChanges.timeline_baseline ? 
        (Array.isArray(baselineChanges.timeline_baseline) ? baselineChanges.timeline_baseline.length : 0) : 0,
      cost_baseline: baselineChanges.cost_baseline ? 
        (Array.isArray(baselineChanges.cost_baseline) ? baselineChanges.cost_baseline.length : 0) : 0,
      resource_baseline: baselineChanges.resource_baseline ? 
        (Array.isArray(baselineChanges.resource_baseline) ? baselineChanges.resource_baseline.length : 0) : 0,
      success_criteria: baselineChanges.success_criteria ? 
        (Array.isArray(baselineChanges.success_criteria) ? baselineChanges.success_criteria.length : 0) : 0,
    }
    
    const totalChanges = Object.values(changesSummary).reduce((sum, count) => sum + count, 0)
    
    return {
      baselineChanges,
      changesSummary,
      totalChanges,
      hasChanges: totalChanges > 0
    }
  } catch (error) {
    logger.error('[BASELINE-UPDATE] Error previewing baseline changes:', error)
    throw error
  }
}

/**
 * Manually trigger baseline update from a change request
 * (For cases where automatic trigger didn't work or was disabled)
 */
export async function manuallyUpdateBaseline(
  changeRequestId: string,
  userId: string
): Promise<BaselineUpdateResult> {
  try {
    // Verify CR is approved
    const crResult = await getDatabasePool().query(
      `SELECT status, type, project_id 
       FROM documents 
       WHERE id = $1`,
      [changeRequestId]
    )
    
    if (crResult.rows.length === 0) {
      throw new Error('Change request not found')
    }
    
    const cr = crResult.rows[0]
    
    if (cr.type !== 'change_request') {
      throw new Error('Document is not a change request')
    }
    
    if (cr.status !== 'approved') {
      throw new Error('Change request must be approved before updating baseline')
    }
    
    // Update the baseline
    return await updateBaselineFromChangeRequest(changeRequestId, userId)
  } catch (error) {
    logger.error('[BASELINE-UPDATE] Error manually updating baseline:', error)
    throw error
  }
}

/**
 * Check if a baseline update has already been applied for a change request
 */
export async function hasBaselineBeenUpdated(
  changeRequestId: string
): Promise<boolean> {
  try {
    const result = await getDatabasePool().query(
      `SELECT COUNT(*) as count 
       FROM baseline_cr_updates 
       WHERE change_request_id = $1`,
      [changeRequestId]
    )
    
    return parseInt(result.rows[0].count) > 0
  } catch (error) {
    logger.error('[BASELINE-UPDATE] Error checking baseline update status:', error)
    throw error
  }
}

export const baselineUpdateService = {
  updateBaselineFromChangeRequest,
  getBaselineUpdateHistory,
  getBaselineUpdateDetails,
  previewBaselineChanges,
  manuallyUpdateBaseline,
  hasBaselineBeenUpdated
}
