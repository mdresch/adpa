/**
 * Save Performance Actuals
 * 
 * Persists performance actuals to the database with deduplication, validation, and entity type checking.
 * Performance actuals track actual vs. planned performance across schedule, cost, scope, and quality.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate, truncateString } from '../../base/Persistence'
import { coerceNumber, coerceInteger } from '../../base/Parser'
import type { PerformanceActual } from './types'

/**
 * Validate entity_type enum
 */
const VALID_ENTITY_TYPES = new Set(['milestone', 'deliverable', 'activity', 'phase', 'resource'])

/**
 * Deduplicate performance actuals by entity_type + entity_name + measurement_date
 */
function deduplicateActuals(actuals: PerformanceActual[]): PerformanceActual[] {
  const deduplicatedMap = new Map<string, PerformanceActual>()
  
  actuals.forEach(actual => {
    const entityType = VALID_ENTITY_TYPES.has(actual.entity_type) ? actual.entity_type : 'milestone'
    const measurementDate = actual.actual_end_date || actual.actual_start_date || new Date().toISOString().split('T')[0]
    const normalizedMeasurementDate = normalizeDate(measurementDate)
    
    if (!normalizedMeasurementDate || !actual.entity_name || actual.entity_name.trim().length === 0) {
      return
    }
    
    const key = `${entityType}:${actual.entity_name.trim().toLowerCase()}:${normalizedMeasurementDate}`
    
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, actual)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(key)!
      const merged: PerformanceActual = {
        ...existing,
        entity_id: actual.entity_id || existing.entity_id,
        planned_start_date: actual.planned_start_date || existing.planned_start_date,
        actual_start_date: actual.actual_start_date || existing.actual_start_date,
        planned_end_date: actual.planned_end_date || existing.planned_end_date,
        actual_end_date: actual.actual_end_date || existing.actual_end_date,
        planned_cost: actual.planned_cost !== undefined ? actual.planned_cost : existing.planned_cost,
        actual_cost: actual.actual_cost !== undefined ? actual.actual_cost : existing.actual_cost,
        planned_progress_percent: actual.planned_progress_percent !== undefined ? actual.planned_progress_percent : existing.planned_progress_percent,
        actual_progress_percent: actual.actual_progress_percent !== undefined ? actual.actual_progress_percent : existing.actual_progress_percent,
        quality_score: actual.quality_score !== undefined ? actual.quality_score : existing.quality_score,
        defects_found: actual.defects_found !== undefined ? actual.defects_found : existing.defects_found,
        rework_hours: actual.rework_hours !== undefined ? actual.rework_hours : existing.rework_hours,
        notes: actual.notes || existing.notes
      }
      deduplicatedMap.set(key, merged)
      logger.debug(`[EXTRACTION-PERFORMANCE_ACTUALS] Merged duplicate performance actual: "${actual.entity_name}" (${entityType}, ${normalizedMeasurementDate})`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save performance actuals to database
 */
export async function savePerformanceActuals(
  client: PoolClient,
  projectId: string,
  userId: string,
  actuals: PerformanceActual[]
): Promise<PersistenceResult> {
  if (actuals.length === 0) {
    logger.info('[EXTRACTION] No performance_actuals to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate actuals
    const uniqueActuals = deduplicateActuals(actuals)
    const skippedCount = actuals.length - uniqueActuals.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-PERFORMANCE_ACTUALS] Deduplicated ${actuals.length} → ${uniqueActuals.length} performance actuals`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []
    let validItemCount = 0 // Counter for valid items only (not forEach index)

    uniqueActuals.forEach((actual) => {
      // Validate entity_type
      const entityType = VALID_ENTITY_TYPES.has(actual.entity_type) ? actual.entity_type : 'milestone'
      
      // Use current date as measurement_date if not provided
      const measurementDate = actual.actual_end_date || actual.actual_start_date || new Date().toISOString().split('T')[0]
      const normalizedMeasurementDate = normalizeDate(measurementDate)
      
      if (!normalizedMeasurementDate) {
        logger.warn(`[EXTRACTION] Skipping performance actual due to invalid measurement date: ${measurementDate}`)
        return
      }

      if (!actual.entity_name || actual.entity_name.trim().length === 0) {
        logger.warn(`[EXTRACTION] Skipping performance actual due to missing entity_name`)
        return
      }

      // Calculate offset based on valid item count (19 columns)
      const offset = validItemCount * 19
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19})`
      )

      const notesSegments = []
      if (actual.notes) {
        notesSegments.push(actual.notes)
      }
      if (actual.source_document) {
        notesSegments.push(`Source: ${actual.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        entityType,
        actual.entity_id || null,
        truncateString(actual.entity_name, 500),
        actual.planned_start_date ? normalizeDate(actual.planned_start_date) : null,
        actual.actual_start_date ? normalizeDate(actual.actual_start_date) : null,
        actual.planned_end_date ? normalizeDate(actual.planned_end_date) : null,
        actual.actual_end_date ? normalizeDate(actual.actual_end_date) : null,
        actual.planned_cost !== null && actual.planned_cost !== undefined ? actual.planned_cost : null,
        actual.actual_cost !== null && actual.actual_cost !== undefined ? actual.actual_cost : null,
        actual.planned_progress_percent !== null && actual.planned_progress_percent !== undefined ? actual.planned_progress_percent : null,
        actual.actual_progress_percent !== null && actual.actual_progress_percent !== undefined ? actual.actual_progress_percent : null,
        actual.quality_score !== null && actual.quality_score !== undefined ? actual.quality_score : null,
        actual.defects_found !== null && actual.defects_found !== undefined ? actual.defects_found : null,
        actual.rework_hours !== null && actual.rework_hours !== undefined ? actual.rework_hours : null,
        normalizedMeasurementDate,
        'extracted', // measurement_method
        userId, // measured_by
        notes
      )

      // Increment counter only after successfully adding a valid item
      validItemCount++
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid performance actuals to save after filtering')
      return { saved: 0, skipped: skippedCount, failed: 0 }
    }

    // Verify alignment: values.length should equal placeholders.length * 19
    if (values.length !== placeholders.length * 19) {
      logger.error('[EXTRACTION] Placeholder/value misalignment detected', {
        valuesLength: values.length,
        placeholdersLength: placeholders.length,
        expectedValuesLength: placeholders.length * 19
      })
      throw new Error(`Placeholder/value misalignment: ${values.length} values but ${placeholders.length} placeholders (expected ${placeholders.length * 19} values)`)
    }

    // Execute bulk insert
    await client.query(
      `
      INSERT INTO performance_actuals (
        project_id, entity_type, entity_id, entity_name,
        planned_start_date, actual_start_date, planned_end_date, actual_end_date,
        planned_cost, actual_cost,
        planned_progress_percent, actual_progress_percent,
        quality_score, defects_found, rework_hours,
        measurement_date, measurement_method, measured_by, notes
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, entity_type, entity_id, entity_name, measurement_date) DO UPDATE SET
        planned_start_date = COALESCE(EXCLUDED.planned_start_date, performance_actuals.planned_start_date),
        actual_start_date = COALESCE(EXCLUDED.actual_start_date, performance_actuals.actual_start_date),
        planned_end_date = COALESCE(EXCLUDED.planned_end_date, performance_actuals.planned_end_date),
        actual_end_date = COALESCE(EXCLUDED.actual_end_date, performance_actuals.actual_end_date),
        planned_cost = COALESCE(EXCLUDED.planned_cost, performance_actuals.planned_cost),
        actual_cost = COALESCE(EXCLUDED.actual_cost, performance_actuals.actual_cost),
        planned_progress_percent = COALESCE(EXCLUDED.planned_progress_percent, performance_actuals.planned_progress_percent),
        actual_progress_percent = COALESCE(EXCLUDED.actual_progress_percent, performance_actuals.actual_progress_percent),
        quality_score = COALESCE(EXCLUDED.quality_score, performance_actuals.quality_score),
        defects_found = COALESCE(EXCLUDED.defects_found, performance_actuals.defects_found),
        rework_hours = COALESCE(EXCLUDED.rework_hours, performance_actuals.rework_hours),
        notes = COALESCE(EXCLUDED.notes, performance_actuals.notes),
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueActuals.length} performance actuals (deduplicated from ${actuals.length})`)

    return {
      saved: uniqueActuals.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PERFORMANCE-ACTUALS] Failed to save performance actuals', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: actuals.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

