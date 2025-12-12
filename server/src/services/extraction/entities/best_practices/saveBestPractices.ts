/**
 * Save Best Practices
 * 
 * Persists best practices to the database with deduplication and validation.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { BestPractice } from './types'

/**
 * Deduplicate best practices by title
 */
function deduplicateBestPractices(bestPractices: BestPractice[]): BestPractice[] {
  const deduplicatedMap = new Map<string, BestPractice>()
  
  bestPractices.forEach(bp => {
    const normalizedTitle = bp.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      // First occurrence - add to map
      deduplicatedMap.set(normalizedTitle, bp)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: BestPractice = {
        ...existing,
        description: bp.description || existing.description,
        category: bp.category || existing.category,
        applicability: bp.applicability || existing.applicability,
        source: bp.source || existing.source
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-BEST_PRACTICES] Merged duplicate: "${bp.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save best practices to database
 */
export async function saveBestPractices(
  client: PoolClient,
  projectId: string,
  userId: string,
  bestPractices: BestPractice[]
): Promise<PersistenceResult> {
  if (bestPractices.length === 0) {
    logger.info('[EXTRACTION] No best_practices to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate best practices
    const uniqueBestPractices = deduplicateBestPractices(bestPractices)
    const skippedCount = bestPractices.length - uniqueBestPractices.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-BEST_PRACTICES] Deduplicated ${bestPractices.length} → ${uniqueBestPractices.length} best practices`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueBestPractices.forEach((bp, index) => {
      const offset = index * 6
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = bp.source_document_id || null
      
      values.push(
        projectId,
        bp.title,
        bp.description,
        bp.category,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO best_practices (
        project_id, title, description, category, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        source_document_id = COALESCE(EXCLUDED.source_document_id, best_practices.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueBestPractices.length} best practices (deduplicated from ${bestPractices.length})`)

    return {
      saved: uniqueBestPractices.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-BEST-PRACTICES] Failed to save best practices', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: bestPractices.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

