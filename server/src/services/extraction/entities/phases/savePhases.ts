/**
 * Save Phases
 * 
 * Persists phases to the database with deduplication, date normalization, and validation.
 * Handles required date fields (start_date and end_date are NOT NULL).
 */

import { logger } from '../../../../utils/logger'
import { getCurrentDate, addDays } from '../../../../utils/dateUtils'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import type { Phase } from './types'

/**
 * Deduplicate phases by name
 */
function deduplicatePhases(phases: Phase[]): Phase[] {
  const deduplicatedMap = new Map<string, Phase>()
  
  phases.forEach(phase => {
    const normalizedName = phase.name.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, phase)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Phase = {
        ...existing,
        description: phase.description || existing.description,
        start_date: phase.start_date || existing.start_date,
        end_date: phase.end_date || existing.end_date,
        status: phase.status || existing.status,
        deliverables: phase.deliverables || existing.deliverables,
        key_activities: phase.key_activities || existing.key_activities
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-PHASES] Merged duplicate phase: "${phase.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save phases to database
 */
export async function savePhases(
  client: PoolClient,
  projectId: string,
  userId: string,
  phases: Phase[]
): Promise<PersistenceResult> {
  if (phases.length === 0) {
    logger.info('[EXTRACTION] No phases to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate phases
    const uniquePhases = deduplicatePhases(phases)
    const skippedCount = phases.length - uniquePhases.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-PHASES] Deduplicated ${phases.length} → ${uniquePhases.length} phases`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniquePhases.forEach((p, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      
      // Validate and sanitize dates using utility functions
      // Use normalizeDate to extract dates from strings like "Prior to 2025-11-15"
      let startDate = normalizeDate(p.start_date)
      let endDate = normalizeDate(p.end_date)
      
      // start_date is NOT NULL in database - provide default if missing
      if (!startDate) {
        startDate = getCurrentDate()
        logger.warn(`[EXTRACTION] Phase "${p.name}" missing start_date, defaulting to ${startDate}`)
      }
      
      // end_date is NOT NULL in database - provide default if missing
      if (!endDate) {
        // Default: 30 days after start_date
        endDate = addDays(startDate, 30)
        logger.warn(`[EXTRACTION] Phase "${p.name}" missing end_date, defaulting to ${endDate}`)
      }
      
      // Resolve source_document_id
      const sourceDocumentId = p.source_document_id || null
      
      values.push(
        projectId,
        p.name,
        p.description,
        startDate,
        endDate,
        p.status,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO phases (
        project_id, name, description, start_date, end_date, status, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        source_document_id = COALESCE(EXCLUDED.source_document_id, phases.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniquePhases.length} phases (deduplicated from ${phases.length})`)

    return {
      saved: uniquePhases.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PHASES] Failed to save phases', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: phases.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

