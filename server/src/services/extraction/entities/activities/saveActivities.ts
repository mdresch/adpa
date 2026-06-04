/**
 * Save Activities
 * 
 * Persists activities to the database with deduplication, normalization, and validation.
 * Handles date conversion, UUID validation for assigned_to, and status mapping.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { isValidUUID } from '../../base/Persistence'
import { convertQuarterDate } from '../../../../utils/dateUtils'
import type { Activity } from './types'

/**
 * Normalize status value to database enum
 * DB allows: not_started, in_progress, completed, blocked, cancelled
 * AI returns: planned, not_started, in_progress, completed, blocked, cancelled
 */
function normalizeStatus(rawStatus: string | undefined): 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' {
  const statusMap: Record<string, 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'> = {
    'planned': 'not_started',
    'pending': 'not_started',
    'not_started': 'not_started',
    'in_progress': 'in_progress',
    'active': 'in_progress',
    'completed': 'completed',
    'done': 'completed',
    'blocked': 'blocked',
    'on_hold': 'blocked',
    'cancelled': 'cancelled',
    'canceled': 'cancelled'
  }
  
  if (!rawStatus) return 'not_started'
  const normalized = rawStatus.toLowerCase().trim()
  return statusMap[normalized] || 'not_started'
}

/**
 * Validate and normalize assigned_to (must be UUID)
 */
function validateAssignedTo(assignedTo: string | undefined): string | null {
  if (!assignedTo) return null
  if (isValidUUID(assignedTo)) {
    return assignedTo
  }
  logger.warn(`[EXTRACTION] Activity has invalid assigned_to UUID: ${assignedTo}, setting to null`)
  return null
}

/**
 * Deduplicate activities by name
 */
function deduplicateActivities(activities: Activity[]): Activity[] {
  const deduplicatedMap = new Map<string, Activity>()
  
  activities.forEach(activity => {
    const normalizedName = activity.name.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, activity)
    } else {
      // Duplicate found - merge details
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Activity = {
        ...existing,
        description: activity.description || existing.description,
        category: activity.category || existing.category,
        start_date: activity.start_date || existing.start_date,
        end_date: activity.end_date || existing.end_date,
        duration: activity.duration || existing.duration,
        assigned_to: activity.assigned_to || existing.assigned_to,
        dependencies: activity.dependencies?.length ? activity.dependencies : existing.dependencies
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.info(`[EXTRACTION] Merged duplicate activity: "${activity.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save activities to database
 */
export async function saveActivities(
  client: PoolClient,
  projectId: string,
  userId: string,
  activities: Activity[]
): Promise<PersistenceResult> {
  if (activities.length === 0) {
    logger.info('[EXTRACTION] No activities to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate activities
    const uniqueActivities = deduplicateActivities(activities)
    const skippedCount = activities.length - uniqueActivities.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION] Deduplicated ${activities.length} activities to ${uniqueActivities.length} unique activities`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueActivities.forEach((a, index) => {
      const offset = index * 11
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )
      
      // Normalize status
      const mappedStatus = normalizeStatus(a.status)
      
      // Validate assigned_to (must be UUID)
      const assignedTo = validateAssignedTo(a.assigned_to)
      
      // Parse and validate dates (handle quarter formats like "Q1 2026")
      const startDate = a.start_date ? convertQuarterDate(a.start_date) : null
      const endDate = a.end_date ? convertQuarterDate(a.end_date) : null
      
      // Resolve source_document_id
      const sourceDocumentId = a.source_document_id || null
      
      // Both name and activity_name columns use the same value
      const activityName = a.name || a.activity_name || 'Untitled Activity'

      values.push(
        projectId,
        activityName,          // For name column
        activityName,          // For activity_name column (NOT NULL)
        a.description || 'Activity description not specified',
        a.category || null,
        startDate,
        endDate,
        mappedStatus,    // Use mapped status value
        assignedTo,      // Use validated UUID or null
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO activities (
        project_id, name, activity_name, description, category, start_date, 
        end_date, status, assigned_to, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, activity_name) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        assigned_to = EXCLUDED.assigned_to,
        source_document_id = COALESCE(EXCLUDED.source_document_id, activities.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueActivities.length} activities (deduplicated from ${activities.length})`)

    return {
      saved: uniqueActivities.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ACTIVITIES] Failed to save activities', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: activities.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

