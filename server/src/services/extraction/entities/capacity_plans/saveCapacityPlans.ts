/**
 * Save Capacity Plans
 * 
 * Persists capacity plans to the database with deduplication and validation.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate, truncateString, buildBulkInsertPlaceholders } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { CapacityPlan } from './types'

/**
 * Deduplicate capacity plans by team_member + period
 */
function deduplicateCapacityPlans(capacityPlans: CapacityPlan[]): CapacityPlan[] {
  const deduplicatedMap = new Map<string, CapacityPlan>()
  
  capacityPlans.forEach(plan => {
    const periodStart = normalizeDate(plan.period_start)
    const periodEnd = normalizeDate(plan.period_end)
    
    if (!periodStart || !periodEnd || !plan.team_member) {
      return
    }
    
    const key = `${plan.team_member.toLowerCase().trim()}:${periodStart}:${periodEnd}`
    
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, plan)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(key)!
      const merged: CapacityPlan = {
        ...existing,
        role: plan.role || existing.role,
        available_hours: plan.available_hours !== undefined ? plan.available_hours : existing.available_hours,
        allocated_hours: plan.allocated_hours !== undefined ? plan.allocated_hours : existing.allocated_hours,
        utilization_percentage: plan.utilization_percentage !== undefined ? plan.utilization_percentage : existing.utilization_percentage,
        notes: plan.notes || existing.notes
      }
      deduplicatedMap.set(key, merged)
      logger.debug(`[EXTRACTION-CAPACITY_PLANS] Merged duplicate capacity plan: "${plan.team_member}" (${periodStart} - ${periodEnd})`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save capacity plans to database
 */
export async function saveCapacityPlans(
  client: PoolClient,
  projectId: string,
  userId: string,
  capacityPlans: CapacityPlan[]
): Promise<PersistenceResult> {
  if (capacityPlans.length === 0) {
    logger.info('[EXTRACTION] No capacity_plans to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate capacity plans
    const uniqueCapacityPlans = deduplicateCapacityPlans(capacityPlans)
    const skippedCount = capacityPlans.length - uniqueCapacityPlans.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-CAPACITY_PLANS] Deduplicated ${capacityPlans.length} → ${uniqueCapacityPlans.length} capacity plans`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueCapacityPlans.forEach((plan, index) => {
      const periodStart = normalizeDate(plan.period_start)
      const periodEnd = normalizeDate(plan.period_end)

      if (!periodStart || !periodEnd) {
        logger.warn(
          `[EXTRACTION] Skipping capacity plan for ${plan.team_member} due to invalid period (${plan.period_start} - ${plan.period_end})`
        )
        return
      }

      const offset = index * 12
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      )

      const notesSegments = []
      if (plan.notes) {
        notesSegments.push(plan.notes)
      }
      if (plan.source_document) {
        notesSegments.push(`Source: ${plan.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        truncateString(plan.team_member, 255) || 'Team Member',
        plan.role ? truncateString(plan.role, 255) : null,
        periodStart,
        periodEnd,
        coerceNumber(plan.available_hours) ?? null,
        coerceNumber(plan.allocated_hours) ?? null,
        coerceNumber(plan.utilization_percentage) ?? null,
        notes,
        plan.source_document_id || null,
        userId,
        userId
      )
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid capacity plans to store after validation')
      return { saved: 0, skipped: skippedCount, failed: 0 }
    }

    // Execute bulk insert
    await client.query(
      `
      INSERT INTO capacity_plans (
        project_id, team_member, role, period_start, period_end,
        available_hours, allocated_hours, utilization_percentage,
        notes, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, team_member, period_start, period_end) DO UPDATE SET
        role = EXCLUDED.role,
        available_hours = EXCLUDED.available_hours,
        allocated_hours = EXCLUDED.allocated_hours,
        utilization_percentage = EXCLUDED.utilization_percentage,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, capacity_plans.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueCapacityPlans.length} capacity plan records (deduplicated from ${capacityPlans.length})`)

    return {
      saved: uniqueCapacityPlans.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-CAPACITY-PLANS] Failed to save capacity plans', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: capacityPlans.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

