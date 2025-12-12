/**
 * Save Performance Measurements
 * 
 * Persists performance measurements to the database with deduplication, success criterion linking,
 * and validation. This entity requires linking to success_criteria via fuzzy name matching.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate, truncateString } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { PerformanceMeasurement } from './types'

/**
 * Get success criterion ID map for linking measurements to criteria
 * Uses fuzzy matching with multiple normalization strategies
 */
async function getSuccessCriterionIdMap(
  client: PoolClient,
  projectId: string
): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; name: string | null }>(
    `SELECT id, name FROM success_criteria WHERE project_id = $1`,
    [projectId]
  )
  const map = new Map<string, string>()
  result.rows.forEach(row => {
    if (row.name) {
      const normalizedName = row.name.toLowerCase().trim()
      // Store exact match
      map.set(normalizedName, row.id)
      // Store normalized version (remove special chars, extra spaces)
      const cleaned = normalizedName.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
      if (cleaned !== normalizedName) {
        map.set(cleaned, row.id)
      }
      // Store key words for partial matching
      const words = cleaned.split(/\s+/).filter(w => w.length > 3)
      words.forEach(word => {
        if (!map.has(`partial:${word}`)) {
          map.set(`partial:${word}`, row.id)
        }
      })
    }
  })
  return map
}

/**
 * Find success criterion ID using fuzzy matching
 * Tries exact match, cleaned match, and partial word matching
 */
function findSuccessCriterionId(
  criterionName: string,
  successCriteriaMap: Map<string, string>
): string | null {
  if (!criterionName) return null
  
  const normalized = criterionName.toLowerCase().trim()
  
  // Try exact match first
  let criterionId = successCriteriaMap.get(normalized)
  if (criterionId) return criterionId
  
  // Try cleaned version (remove special chars)
  const cleaned = normalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
  criterionId = successCriteriaMap.get(cleaned)
  if (criterionId) return criterionId
  
  // Try partial matching using key words
  const words = cleaned.split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    criterionId = successCriteriaMap.get(`partial:${word}`)
    if (criterionId) {
      logger.debug(`[EXTRACTION] Matched criterion "${criterionName}" via partial word "${word}"`)
      return criterionId
    }
  }
  
  return null
}

/**
 * Build document map for source document resolution
 */
async function buildDocumentMap(
  client: PoolClient,
  projectId: string
): Promise<Map<string, string>> {
  const documentResult = await client.query<{ id: string; title: string }>(
    `SELECT id, title FROM documents WHERE project_id = $1`,
    [projectId]
  )
  const documentMap = new Map<string, string>()
  documentResult.rows.forEach(row => {
    if (row.title && row.id) {
      documentMap.set(row.title.toLowerCase().trim(), row.id)
      // Also map normalized version for fuzzy matching
      const normalizedTitle = row.title.toLowerCase().trim().replace(/[^\w\s]/g, '')
      if (normalizedTitle !== row.title.toLowerCase().trim()) {
        documentMap.set(normalizedTitle, row.id)
      }
    }
  })
  return documentMap
}

/**
 * Normalize status value
 */
function normalizeStatus(rawStatus: string | undefined): string {
  const statusMap: Record<string, string> = {
    on_track: 'on_track',
    'on track': 'on_track',
    at_risk: 'at_risk',
    'at risk': 'at_risk',
    off_track: 'off_track',
    'off track': 'off_track'
  }

  if (!rawStatus) return 'on_track'
  const normalized = rawStatus.toLowerCase().replace(/\s+/g, '_')
  return statusMap[normalized] || 'on_track'
}

/**
 * Normalize trend value
 */
function normalizeTrend(rawTrend: string | undefined): 'improving' | 'stable' | 'declining' | null {
  const trendOptions = new Set(['improving', 'stable', 'declining'])
  if (!rawTrend) return null
  const normalized = rawTrend.toLowerCase().trim()
  return trendOptions.has(normalized) ? normalized as 'improving' | 'stable' | 'declining' : null
}

/**
 * Deduplicate performance measurements by criterion_name + measurement_date
 */
function deduplicateMeasurements(measurements: PerformanceMeasurement[]): PerformanceMeasurement[] {
  const deduplicatedMap = new Map<string, PerformanceMeasurement>()
  
  measurements.forEach(measurement => {
    const criterionName = measurement.success_criterion_name?.trim()
    
    if (!criterionName) {
      return
    }
    
    // Use provided date, or fallback to current date if missing
    let measurementDate = normalizeDate(measurement.measurement_date)
    if (!measurementDate) {
      measurementDate = new Date().toISOString().split('T')[0]
    }
    
    const key = `${criterionName.toLowerCase()}:${measurementDate}`
    
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, measurement)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(key)!
      const merged: PerformanceMeasurement = {
        ...existing,
        actual_value: measurement.actual_value !== undefined ? measurement.actual_value : existing.actual_value,
        target_value: measurement.target_value !== undefined ? measurement.target_value : existing.target_value,
        units: measurement.units || existing.units,
        variance: measurement.variance !== undefined ? measurement.variance : existing.variance,
        variance_percentage: measurement.variance_percentage !== undefined ? measurement.variance_percentage : existing.variance_percentage,
        trend: measurement.trend || existing.trend,
        status: measurement.status || existing.status,
        notes: measurement.notes || existing.notes
      }
      deduplicatedMap.set(key, merged)
      logger.debug(`[EXTRACTION-PERFORMANCE_MEASUREMENTS] Merged duplicate measurement: "${criterionName}" (${measurementDate})`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save performance measurements to database
 */
export async function savePerformanceMeasurements(
  client: PoolClient,
  projectId: string,
  userId: string,
  measurements: PerformanceMeasurement[]
): Promise<PersistenceResult> {
  if (measurements.length === 0) {
    logger.info('[EXTRACTION] No performance_measurements to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Get success criterion map for linking
    const successCriteriaMap = await getSuccessCriterionIdMap(client, projectId)
    
    // Get document map for source document resolution
    const documentMap = await buildDocumentMap(client, projectId)

    // Deduplicate measurements
    const uniqueMeasurements = deduplicateMeasurements(measurements)
    const skippedCount = measurements.length - uniqueMeasurements.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-PERFORMANCE_MEASUREMENTS] Deduplicated ${measurements.length} → ${uniqueMeasurements.length} performance measurements`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueMeasurements.forEach((measurement, index) => {
      const criterionName = measurement.success_criterion_name?.trim()
      
      if (!criterionName) {
        logger.warn(
          `[EXTRACTION] Skipping measurement due to missing criterion name (${measurement.success_criterion_name})`
        )
        return
      }

      // Use provided date, or fallback to current date if missing
      let measurementDate = normalizeDate(measurement.measurement_date)
      if (!measurementDate) {
        measurementDate = new Date().toISOString().split('T')[0]
        logger.debug(
          `[EXTRACTION] Using fallback date for measurement "${criterionName}" (no date provided, using today)`
        )
      }

      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      // Use fuzzy matching to find success criterion ID
      const criterionId = findSuccessCriterionId(criterionName, successCriteriaMap)
      if (!criterionId) {
        logger.warn(`[EXTRACTION] No success criterion found for "${criterionName}", storing without linkage`)
      } else {
        logger.debug(`[EXTRACTION] Matched criterion "${criterionName}" to ID ${criterionId}`)
      }
      
      // Resolve source_document_id
      let sourceDocumentId: string | null = null
      if (measurement.source_document_id) {
        // Already resolved during extraction
        sourceDocumentId = measurement.source_document_id
      } else if (measurement.source_document) {
        // Try to resolve from document title
        const docTitle = measurement.source_document.trim()
        sourceDocumentId = documentMap.get(docTitle.toLowerCase()) || 
                          documentMap.get(docTitle.toLowerCase().replace(/[^\w\s]/g, '')) || null
        
        // Try fuzzy matching if exact match failed
        if (!sourceDocumentId) {
          for (const [title, id] of documentMap.entries()) {
            if (docTitle.toLowerCase().includes(title) || title.includes(docTitle.toLowerCase())) {
              sourceDocumentId = id
              logger.debug(`[EXTRACTION] Fuzzy matched document "${docTitle}" to "${title}" (ID: ${id})`)
              break
            }
          }
        }
        
        if (!sourceDocumentId) {
          logger.warn(`[EXTRACTION] Could not resolve source_document_id for "${docTitle}"`)
        }
      }

      const status = normalizeStatus(measurement.status)
      const trend = normalizeTrend(measurement.trend)

      const notesSegments = []
      if (measurement.notes) {
        notesSegments.push(measurement.notes)
      }
      if (measurement.source_document && !sourceDocumentId) {
        // Only add source document to notes if we couldn't resolve the ID
        notesSegments.push(`Source: ${measurement.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        criterionId,
        truncateString(criterionName, 255),
        measurementDate,
        coerceNumber(measurement.actual_value) ?? null,
        coerceNumber(measurement.target_value) ?? null,
        measurement.units ? truncateString(measurement.units, 50) : null,
        coerceNumber(measurement.variance) ?? null,
        coerceNumber(measurement.variance_percentage) ?? null,
        trend,
        status,
        notes,
        sourceDocumentId,
        userId,
        userId
      )
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid performance measurements to store after validation')
      return { saved: 0, skipped: skippedCount, failed: 0 }
    }

    // Execute bulk insert
    await client.query(
      `
      INSERT INTO performance_measurements (
        project_id, success_criterion_id, success_criterion_name, measurement_date,
        actual_value, target_value, units, variance, variance_percentage, trend,
        status, notes, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, success_criterion_name, measurement_date) DO UPDATE SET
        success_criterion_id = COALESCE(EXCLUDED.success_criterion_id, performance_measurements.success_criterion_id),
        actual_value = EXCLUDED.actual_value,
        target_value = EXCLUDED.target_value,
        units = EXCLUDED.units,
        variance = EXCLUDED.variance,
        variance_percentage = EXCLUDED.variance_percentage,
        trend = EXCLUDED.trend,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, performance_measurements.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueMeasurements.length} performance measurement records (deduplicated from ${measurements.length})`)

    return {
      saved: uniqueMeasurements.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Failed to save performance measurements', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: measurements.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

