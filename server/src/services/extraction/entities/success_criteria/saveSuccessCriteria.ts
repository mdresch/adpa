/**
 * Save Success Criteria
 * 
 * Persists success criteria to the database with deduplication, numeric extraction, and validation.
 * Handles target_value numeric extraction and dual column mapping (title/name).
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { SuccessCriterion } from './types'

/**
 * Extract numeric value from target_value string
 * Handles cases like "95%", "100 users", ">= 50", etc.
 */
function extractNumericValue(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (!value) return null
  
  // Try to coerce to number first
  const coerced = coerceNumber(value)
  if (coerced !== null) {
    return coerced
  }
  
  // If coercion fails, try to extract number from string
  // Handle cases like "95%", "100 users", ">= 50", etc.
  const numericMatch = String(value).match(/(\d+(?:\.\d+)?)/)
  if (numericMatch) {
    const parsed = parseFloat(numericMatch[1])
    return isNaN(parsed) ? null : parsed
  }
  
  logger.debug(`[EXTRACTION] Could not extract numeric from: ${value}, setting to null`)
  return null
}

/**
 * Deduplicate success criteria by title
 */
function deduplicateSuccessCriteria(successCriteria: SuccessCriterion[]): SuccessCriterion[] {
  // Deduplicate by normalized title (ON CONFLICT requires unique titles)
  const uniqueMap = new Map<string, SuccessCriterion>()
  
  successCriteria.forEach(sc => {
    const normalizedTitle = (sc.title || '').toLowerCase().trim()
    if (!uniqueMap.has(normalizedTitle)) {
      uniqueMap.set(normalizedTitle, sc)
    } else {
      // Duplicate found - keep first occurrence (title is unique key)
      logger.debug(`[EXTRACTION-SUCCESS-CRITERIA] Skipping duplicate success criterion: "${sc.title}"`)
    }
  })
  
  return Array.from(uniqueMap.values())
}

/**
 * Save success criteria to database
 */
export async function saveSuccessCriteria(
  client: PoolClient,
  projectId: string,
  userId: string,
  successCriteria: SuccessCriterion[]
): Promise<PersistenceResult> {
  if (successCriteria.length === 0) {
    logger.info('[EXTRACTION] No success_criteria to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate success criteria
    const uniqueCriteria = deduplicateSuccessCriteria(successCriteria)
    const skippedCount = successCriteria.length - uniqueCriteria.length

    if (skippedCount > 0) {
      logger.warn(`[EXTRACTION] Deduplicated success_criteria: ${successCriteria.length} → ${uniqueCriteria.length}`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueCriteria.forEach((sc, index) => {
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      )
      
      // Extract numeric value from target_value
      const targetValue = extractNumericValue(sc.target_value)
      
      // Resolve source_document_id
      const sourceDocumentId = sc.source_document_id || null
      
      values.push(
        projectId,
        sc.title,        // For title column
        sc.title,        // For name column (NOT NULL)
        sc.description,
        sc.metric,
        targetValue,     // Use extracted numeric value
        sc.measurement_method,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO success_criteria (
        project_id, title, name, description, metric, target_value, measurement_method, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        metric = EXCLUDED.metric,
        target_value = EXCLUDED.target_value,
        measurement_method = EXCLUDED.measurement_method,
        source_document_id = COALESCE(EXCLUDED.source_document_id, success_criteria.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueCriteria.length} success criteria`)

    return {
      saved: uniqueCriteria.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-SUCCESS-CRITERIA] Failed to save success criteria', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: successCriteria.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

