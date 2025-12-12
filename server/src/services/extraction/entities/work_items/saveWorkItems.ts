/**
 * Save Work Items
 * 
 * Persists work items to the database with deduplication and validation.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate, truncateString, buildBulkInsertPlaceholders } from '../../base/Persistence'
import { coerceNumber, coerceArray } from '../../base/Parser'
import type { WorkItem } from './types'

/**
 * Get activity ID map for linking work items to activities
 */
async function getActivityIdMap(client: PoolClient, projectId: string): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; activity_name: string | null }>(
    `SELECT id, activity_name FROM activities WHERE project_id = $1`,
    [projectId]
  )
  const map = new Map<string, string>()
  result.rows.forEach(row => {
    if (row.activity_name) {
      map.set(row.activity_name.toLowerCase().trim(), row.id)
    }
  })
  return map
}

/**
 * Normalize work item status
 */
function normalizeStatus(rawStatus: string | undefined): string {
  const statusMap: Record<string, string> = {
    todo: 'todo',
    'to_do': 'todo',
    backlog: 'todo',
    planned: 'todo',
    in_progress: 'in_progress',
    active: 'in_progress',
    doing: 'in_progress',
    review: 'review',
    verifying: 'review',
    done: 'done',
    completed: 'done',
    finished: 'done',
    blocked: 'blocked',
    impeded: 'blocked'
  }

  if (!rawStatus) return 'todo'
  const normalized = rawStatus.toLowerCase().replace(/\s+/g, '_')
  return statusMap[normalized] || 'todo'
}

/**
 * Deduplicate work items by name
 */
function deduplicateWorkItems(workItems: WorkItem[]): WorkItem[] {
  const deduplicatedMap = new Map<string, WorkItem>()
  
  workItems.forEach(item => {
    const normalizedName = (item.name || '').trim().toLowerCase()
    
    if (!normalizedName) {
      return
    }
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, item)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: WorkItem = {
        ...existing,
        description: item.description || existing.description,
        activity_name: item.activity_name || existing.activity_name,
        assigned_to: item.assigned_to || existing.assigned_to,
        estimated_hours: item.estimated_hours !== undefined ? item.estimated_hours : existing.estimated_hours,
        actual_hours: item.actual_hours !== undefined ? item.actual_hours : existing.actual_hours,
        progress_percentage: item.progress_percentage !== undefined ? item.progress_percentage : existing.progress_percentage,
        status: item.status || existing.status,
        blockers: item.blockers?.length ? item.blockers : existing.blockers,
        completed_date: item.completed_date || existing.completed_date
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-WORK_ITEMS] Merged duplicate work item: "${item.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save work items to database
 */
export async function saveWorkItems(
  client: PoolClient,
  projectId: string,
  userId: string,
  workItems: WorkItem[]
): Promise<PersistenceResult> {
  if (workItems.length === 0) {
    logger.info('[EXTRACTION] No work_items to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Get activity map for linking
    const activityMap = await getActivityIdMap(client, projectId)

    // Deduplicate work items
    const uniqueWorkItems = deduplicateWorkItems(workItems)
    const skippedCount = workItems.length - uniqueWorkItems.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-WORK_ITEMS] Deduplicated ${workItems.length} → ${uniqueWorkItems.length} work items`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueWorkItems.forEach((item, index) => {
      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      const status = normalizeStatus(item.status)
      
      const progressRaw = coerceNumber(item.progress_percentage)
      const progressPercentage =
        progressRaw === null || progressRaw === undefined
          ? null
          : Math.max(0, Math.min(100, progressRaw))

      const activityName = item.activity_name ? item.activity_name.toLowerCase().trim() : ''
      const activityId = activityName ? activityMap.get(activityName) || null : null

      values.push(
        projectId,
        truncateString(item.name, 255) || 'Work Item',
        item.description || null,
        item.activity_name || null,
        activityId,
        item.assigned_to ? truncateString(item.assigned_to, 255) : null,
        coerceNumber(item.estimated_hours) ?? null,
        coerceNumber(item.actual_hours) ?? null,
        progressPercentage,
        status,
        coerceArray<string>(item.blockers),
        normalizeDate(item.completed_date),
        item.source_document_id || null,
        userId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `
      INSERT INTO work_items (
        project_id, name, description, activity_name, activity_id, assigned_to,
        estimated_hours, actual_hours, progress_percentage, status, blockers,
        completed_date, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        activity_name = EXCLUDED.activity_name,
        activity_id = EXCLUDED.activity_id,
        assigned_to = EXCLUDED.assigned_to,
        estimated_hours = EXCLUDED.estimated_hours,
        actual_hours = EXCLUDED.actual_hours,
        progress_percentage = EXCLUDED.progress_percentage,
        status = EXCLUDED.status,
        blockers = EXCLUDED.blockers,
        completed_date = EXCLUDED.completed_date,
        source_document_id = COALESCE(EXCLUDED.source_document_id, work_items.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueWorkItems.length} work items (deduplicated from ${workItems.length})`)

    return {
      saved: uniqueWorkItems.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-WORK-ITEMS] Failed to save work items', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: workItems.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

