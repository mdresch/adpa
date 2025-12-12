/**
 * Save Quality Standards
 * 
 * Persists quality standards to the database with deduplication and validation.
 * Maps title to both title and standard_name columns (standard_name is NOT NULL).
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { QualityStandard } from './types'

/**
 * Deduplicate quality standards by title
 */
function deduplicateQualityStandards(qualityStandards: QualityStandard[]): QualityStandard[] {
  const deduplicatedMap = new Map<string, QualityStandard>()
  
  qualityStandards.forEach(qs => {
    const normalizedTitle = qs.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, qs)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: QualityStandard = {
        ...existing,
        description: qs.description || existing.description,
        category: qs.category || existing.category,
        standard_type: qs.standard_type || existing.standard_type,
        requirements: qs.requirements || existing.requirements,
        measurement_criteria: qs.measurement_criteria || existing.measurement_criteria,
        compliance_level: qs.compliance_level || existing.compliance_level
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-QUALITY_STANDARDS] Merged duplicate standard: "${qs.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save quality standards to database
 */
export async function saveQualityStandards(
  client: PoolClient,
  projectId: string,
  userId: string,
  qualityStandards: QualityStandard[]
): Promise<PersistenceResult> {
  if (qualityStandards.length === 0) {
    logger.info('[EXTRACTION] No quality_standards to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate quality standards
    const uniqueQualityStandards = deduplicateQualityStandards(qualityStandards)
    const skippedCount = qualityStandards.length - uniqueQualityStandards.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-QUALITY_STANDARDS] Deduplicated ${qualityStandards.length} → ${uniqueQualityStandards.length} quality standards`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueQualityStandards.forEach((qs, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = qs.source_document_id || null
      
      values.push(
        projectId,
        qs.title,        // For title column
        qs.title,        // For standard_name column (NOT NULL)
        qs.description,
        qs.category,
        qs.measurement_criteria || null,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO quality_standards (
        project_id, title, standard_name, description, category, 
        measurement_criteria, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, standard_name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        measurement_criteria = EXCLUDED.measurement_criteria,
        source_document_id = COALESCE(EXCLUDED.source_document_id, quality_standards.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueQualityStandards.length} quality standards (deduplicated from ${qualityStandards.length})`)

    return {
      saved: uniqueQualityStandards.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-QUALITY-STANDARDS] Failed to save quality standards', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: qualityStandards.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

