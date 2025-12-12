/**
 * Save Scope Items
 * 
 * Persists scope items to the database with deduplication and validation.
 * Maps is_in_scope boolean to inclusion_status text field.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScopeItem } from './types'

/**
 * Deduplicate scope items by title
 */
function deduplicateScopeItems(scopeItems: ScopeItem[]): ScopeItem[] {
  const deduplicatedMap = new Map<string, ScopeItem>()
  
  scopeItems.forEach(scopeItem => {
    const normalizedTitle = scopeItem.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, scopeItem)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: ScopeItem = {
        ...existing,
        description: scopeItem.description || existing.description,
        is_in_scope: scopeItem.is_in_scope !== undefined ? scopeItem.is_in_scope : existing.is_in_scope,
        category: scopeItem.category || existing.category,
        justification: scopeItem.justification || existing.justification,
        priority: scopeItem.priority || existing.priority
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-SCOPE-ITEMS] Merged duplicate scope item: "${scopeItem.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save scope items to database
 */
export async function saveScopeItems(
  client: PoolClient,
  projectId: string,
  userId: string,
  scopeItems: ScopeItem[]
): Promise<PersistenceResult> {
  if (scopeItems.length === 0) {
    logger.info('[EXTRACTION] No scope_items to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate scope items
    const uniqueScopeItems = deduplicateScopeItems(scopeItems)
    const skippedCount = scopeItems.length - uniqueScopeItems.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-SCOPE-ITEMS] Deduplicated ${scopeItems.length} → ${uniqueScopeItems.length} scope items`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueScopeItems.forEach((si, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      
      // Map is_in_scope boolean to inclusion_status text
      const inclusionStatus = si.is_in_scope ? 'in_scope' : 'out_of_scope'
      
      // Resolve source_document_id
      const sourceDocumentId = si.source_document_id || null
      
      values.push(
        projectId,
        si.title,        // For title column
        si.title,        // For item_name column (NOT NULL)
        si.description,
        inclusionStatus, // Map to inclusion_status column
        si.category || null,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO scope_items (
        project_id, title, item_name, description, inclusion_status, category, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, item_name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        inclusion_status = EXCLUDED.inclusion_status,
        category = EXCLUDED.category,
        source_document_id = COALESCE(EXCLUDED.source_document_id, scope_items.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueScopeItems.length} scope items (deduplicated from ${scopeItems.length})`)

    return {
      saved: uniqueScopeItems.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-SCOPE-ITEMS] Failed to save scope items', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: scopeItems.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

