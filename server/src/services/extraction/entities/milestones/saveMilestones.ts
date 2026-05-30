/**
 * Save Milestones
 * 
 * Persists milestones to the database with deduplication, normalization, and validation.
 * Handles date normalization and status mapping.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import { convertQuarterDate } from '../../../../utils/dateUtils'
import type { Milestone } from './types'

/**
 * Normalize status value to database enum
 * DB allows: planned, in_progress, completed, delayed
 * AI returns: pending, in_progress, completed, delayed
 */
function normalizeStatus(rawStatus: string | undefined): 'planned' | 'in_progress' | 'completed' | 'delayed' {
  const statusMap: Record<string, 'planned' | 'in_progress' | 'completed' | 'delayed'> = {
    'pending': 'planned',
    'planned': 'planned',
    'not_started': 'planned',
    'in_progress': 'in_progress',
    'active': 'in_progress',
    'completed': 'completed',
    'done': 'completed',
    'delayed': 'delayed',
    'overdue': 'delayed'
  }

  if (!rawStatus) return 'planned'
  const normalized = rawStatus.toLowerCase().trim()
  return statusMap[normalized] || 'planned'
}

import { generateMilestoneIdempotencyKey } from '../../IdempotencyKeyService'

/**
 * Deduplicate milestones by idempotency key
 */
function deduplicateMilestones(projectId: string, milestones: Milestone[]): Milestone[] {
  const deduplicatedMap = new Map<string, Milestone>()

  milestones.forEach(milestone => {
    const normalizedName = milestone.name.trim().toLowerCase()
    const idempotencyKey = generateMilestoneIdempotencyKey(projectId, {
      name: milestone.name,
      planned_date: milestone.due_date
    })

    if (!deduplicatedMap.has(normalizedName)) {
      // Add hash to the object for later use in save
      (milestone as any).idempotency_key = idempotencyKey
      deduplicatedMap.set(normalizedName, milestone)
    } else {
      // Duplicate found - merge details
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Milestone = {
        ...existing,
        description: milestone.description || existing.description,
        due_date: milestone.due_date || existing.due_date,
        status: milestone.status || existing.status,
        deliverables: milestone.deliverables?.length ? milestone.deliverables : existing.deliverables,
        dependencies: milestone.dependencies?.length ? milestone.dependencies : existing.dependencies
      }
      ; (merged as any).idempotency_key = idempotencyKey
      deduplicatedMap.set(normalizedName, merged)
    }
  })

  return Array.from(deduplicatedMap.values())
}

/**
 * Save milestones to database
 */
export async function saveMilestones(
  client: PoolClient,
  projectId: string,
  userId: string,
  milestones: Milestone[]
): Promise<PersistenceResult> {
  if (milestones.length === 0) {
    logger.info('[EXTRACTION] No milestones to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate milestones
    const uniqueMilestones = deduplicateMilestones(projectId, milestones)
    const skippedCount = milestones.length - uniqueMilestones.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-MILESTONES] Deduplicated ${milestones.length} → ${uniqueMilestones.length} milestones`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueMilestones.forEach((m, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )

      // Normalize status
      const mappedStatus = normalizeStatus(m.status)

      // Date normalization
      let dueDate = convertQuarterDate(m.due_date)
      if (!dueDate) {
        const defaultDate = new Date()
        defaultDate.setFullYear(defaultDate.getFullYear() + 1)
        dueDate = defaultDate.toISOString().split('T')[0]
      }

      // Resolve source_document_id
      const sourceDocumentId = m.source_document_id || null

      values.push(
        projectId,
        m.name,
        m.description,
        dueDate,
        mappedStatus,
        sourceDocumentId,
        userId,
        (m as any).idempotency_key
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO milestones (
        project_id, name, description, due_date, status, source_document_id, created_by, idempotency_key
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        source_document_id = COALESCE(EXCLUDED.source_document_id, milestones.source_document_id),
        idempotency_key = COALESCE(EXCLUDED.idempotency_key, milestones.idempotency_key),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueMilestones.length} milestones (deduplicated from ${milestones.length})`)

    return {
      saved: uniqueMilestones.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-MILESTONES] Failed to save milestones', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      saved: 0,
      skipped: 0,
      failed: milestones.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

