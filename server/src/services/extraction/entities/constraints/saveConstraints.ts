/**
 * Save Constraints
 * 
 * Persists constraints to the database with deduplication, normalization, and validation.
 * Handles type mapping from AI values to database enum values.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { Constraint } from './types'

/**
 * Normalize type value to database enum
 * DB allows: budget, time, resource, technical, regulatory, business
 * AI returns: scope, time, cost, quality, resource, technical, regulatory
 */
function normalizeType(rawType: string | undefined): 'budget' | 'time' | 'resource' | 'technical' | 'regulatory' | 'business' {
  const typeMap: Record<string, 'budget' | 'time' | 'resource' | 'technical' | 'regulatory' | 'business'> = {
    'cost': 'budget',
    'financial': 'budget',
    'budget': 'budget',
    'time': 'time',
    'schedule': 'time',
    'resource': 'resource',
    'resources': 'resource',
    'technical': 'technical',
    'technology': 'technical',
    'regulatory': 'regulatory',
    'compliance': 'regulatory',
    'business': 'business',
    'scope': 'business',  // Map scope to business
    'quality': 'business'  // Map quality to business
  }
  
  if (!rawType) return 'business'
  const normalized = rawType.toLowerCase().trim()
  return typeMap[normalized] || 'business'
}

/**
 * Deduplicate constraints by title
 */
function deduplicateConstraints(constraints: Constraint[]): Constraint[] {
  return Array.from(
    new Map(constraints.map(c => [(c.title || '').toLowerCase().trim(), c])).values()
  )
}

/**
 * Save constraints to database
 */
export async function saveConstraints(
  client: PoolClient,
  projectId: string,
  userId: string,
  constraints: Constraint[]
): Promise<PersistenceResult> {
  if (constraints.length === 0) {
    logger.info('[EXTRACTION] No constraints to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate constraints
    const uniqueConstraints = deduplicateConstraints(constraints)
    const skippedCount = constraints.length - uniqueConstraints.length

    if (skippedCount > 0) {
      logger.warn(`[EXTRACTION] Deduplicated constraints: ${constraints.length} → ${uniqueConstraints.length}`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueConstraints.forEach((c, index) => {
      const offset = index * 7
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      )
      
      // Normalize type
      const mappedType = normalizeType(c.type)
      
      // Resolve source_document_id
      const sourceDocumentId = c.source_document_id || null
      
      // Both title and name columns use the same value (title)
      values.push(
        projectId,
        c.title,        // For title column
        c.title,        // For name column (NOT NULL)
        c.description,
        mappedType,     // Use mapped type value
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO constraints (
        project_id, title, name, description, type, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        source_document_id = COALESCE(EXCLUDED.source_document_id, constraints.source_document_id),
        type = EXCLUDED.type,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueConstraints.length} constraints`)

    return {
      saved: uniqueConstraints.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-CONSTRAINTS] Failed to save constraints', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: constraints.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

