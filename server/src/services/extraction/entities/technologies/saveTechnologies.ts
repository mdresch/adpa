/**
 * Save Technologies
 * 
 * Persists technologies to the database with deduplication and validation.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { Technology } from './types'

/**
 * Deduplicate technologies by name
 */
function deduplicateTechnologies(technologies: Technology[]): Technology[] {
  // Deduplicate by normalized name (ON CONFLICT requires unique names)
  const uniqueMap = new Map<string, Technology>()
  
  technologies.forEach(tech => {
    const normalizedName = tech.name.toLowerCase().trim()
    if (!uniqueMap.has(normalizedName)) {
      uniqueMap.set(normalizedName, tech)
    } else {
      // Duplicate found - keep first occurrence
      logger.debug(`[EXTRACTION-TECHNOLOGIES] Skipping duplicate technology: "${tech.name}"`)
    }
  })
  
  return Array.from(uniqueMap.values())
}

/**
 * Save technologies to database
 */
export async function saveTechnologies(
  client: PoolClient,
  projectId: string,
  userId: string,
  technologies: Technology[]
): Promise<PersistenceResult> {
  if (technologies.length === 0) {
    logger.info('[EXTRACTION] No technologies to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate technologies
    const uniqueTechnologies = deduplicateTechnologies(technologies)
    const skippedCount = technologies.length - uniqueTechnologies.length

    if (skippedCount > 0) {
      logger.warn(`[EXTRACTION] Deduplicated technologies: ${technologies.length} → ${uniqueTechnologies.length}`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueTechnologies.forEach((t, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = t.source_document_id || null
      
      values.push(
        projectId,
        t.name,
        t.category || 'other', // Default to 'other' if category not provided
        t.description || null,
        t.version || null,
        t.purpose || null,
        t.license || null,
        t.vendor || null,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO technologies (
        project_id, name, category, description, version, purpose, license, vendor, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        purpose = EXCLUDED.purpose,
        license = EXCLUDED.license,
        vendor = EXCLUDED.vendor,
        source_document_id = COALESCE(EXCLUDED.source_document_id, technologies.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueTechnologies.length} technologies`)

    return {
      saved: uniqueTechnologies.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-TECHNOLOGIES] Failed to save technologies', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: technologies.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

