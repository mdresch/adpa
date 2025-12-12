/**
 * Save Deliverables
 * 
 * Persists deliverables to the database with deduplication, normalization, and validation.
 * Handles date normalization and status mapping.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import type { Deliverable } from './types'

/**
 * Normalize status value to database enum
 * DB allows: not_started, in_progress, review, completed, delivered
 * AI returns: planned, in_progress, completed, delayed, cancelled
 */
function normalizeStatus(rawStatus: string | undefined): 'not_started' | 'in_progress' | 'review' | 'completed' | 'delivered' {
  const statusMap: Record<string, 'not_started' | 'in_progress' | 'review' | 'completed' | 'delivered'> = {
    'planned': 'not_started',
    'not_started': 'not_started',
    'pending': 'not_started',
    'in_progress': 'in_progress',
    'active': 'in_progress',
    'review': 'review',
    'reviewing': 'review',
    'completed': 'completed',
    'done': 'completed',
    'delivered': 'delivered',
    'delayed': 'in_progress',  // Map delayed to in_progress
    'cancelled': 'not_started',  // Map cancelled to not_started
    'canceled': 'not_started'
  }
  
  if (!rawStatus) return 'not_started'
  const normalized = rawStatus.toLowerCase().trim()
  return statusMap[normalized] || 'not_started'
}

/**
 * Deduplicate deliverables by name
 */
function deduplicateDeliverables(deliverables: Deliverable[]): Deliverable[] {
  const deduplicatedMap = new Map<string, Deliverable>()
  
  deliverables.forEach(deliverable => {
    const normalizedName = deliverable.name.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, deliverable)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Deliverable = {
        ...existing,
        description: deliverable.description || existing.description,
        type: deliverable.type || existing.type,
        due_date: deliverable.due_date || existing.due_date,
        status: deliverable.status || existing.status,
        owner: deliverable.owner || existing.owner,
        acceptance_criteria: deliverable.acceptance_criteria || existing.acceptance_criteria,
        phase: deliverable.phase || existing.phase
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-DELIVERABLES] Merged duplicate deliverable: "${deliverable.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save deliverables to database
 */
export async function saveDeliverables(
  client: PoolClient,
  projectId: string,
  userId: string,
  deliverables: Deliverable[]
): Promise<PersistenceResult> {
  if (deliverables.length === 0) {
    logger.info('[EXTRACTION] No deliverables to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate deliverables
    const uniqueDeliverables = deduplicateDeliverables(deliverables)
    const skippedCount = deliverables.length - uniqueDeliverables.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-DELIVERABLES] Deduplicated ${deliverables.length} → ${uniqueDeliverables.length} deliverables`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueDeliverables.forEach((d, index) => {
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      )
      
      // Normalize status
      const mappedStatus = normalizeStatus(d.status)
      
      // Validate and parse due_date
      // This handles formats like "Mar 15, 2026 (prototype approval)", "Jan 2026", etc.
      const parsedDueDate = normalizeDate(d.due_date)
      if (d.due_date && !parsedDueDate) {
        logger.warn(`[EXTRACTION] Deliverable "${d.name}" has invalid due_date: ${d.due_date}, setting to null`)
      }
      
      // Resolve source_document_id
      const sourceDocumentId = d.source_document_id || null
      
      values.push(
        projectId,
        d.name,
        d.description,
        d.type,
        parsedDueDate,
        mappedStatus,  // Use mapped status value
        d.owner || null,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO deliverables (
        project_id, name, description, type, due_date, status, 
        owner, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        source_document_id = COALESCE(EXCLUDED.source_document_id, deliverables.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueDeliverables.length} deliverables (deduplicated from ${deliverables.length})`)

    return {
      saved: uniqueDeliverables.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-DELIVERABLES] Failed to save deliverables', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: deliverables.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

