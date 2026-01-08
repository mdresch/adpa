;(async function(){ try{ await (require('../../lib/db')).initDb() } catch(e){} })();
/**
 * Extraction Orchestrator
 * 
 * Coordinates entity extraction using the registry.
 * Handles errors, partial success, and maintains queue contract compatibility.
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import type { PoolClient } from 'pg'
import type { ExtractionDocument, ExtractionOptions } from './base/ExtractionResult'
import { ExtractionContext } from './base/ExtractionContext'
import { extractionRegistry } from './ExtractionRegistry'
import type { EntityExtractor, EntitySaver } from './ExtractionRegistry'
import type { PersistenceResult } from './base/Persistence'

/**
 * Get project documents for extraction
 */
async function getProjectDocuments(
  projectId: string,
  documentIds?: string[]
): Promise<ExtractionDocument[]> {
  try {
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }

    let query = `
      SELECT 
        d.id,
        COALESCE(d.title, t.name, 'Untitled Document ' || SUBSTRING(d.id::text, 1, 8)) as title,
        d.content,
        t.name as template_name
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1
        AND d.deleted_at IS NULL
        AND d.content IS NOT NULL
        AND d.content != ''
        AND d.parent_document_id IS NULL
    `

    const params: any[] = [projectId]

    if (documentIds && documentIds.length > 0) {
      query += ` AND d.id = ANY($2::uuid[])`
      params.push(documentIds)
    }

    query += ` ORDER BY d.created_at ASC`

    if (!pool) {
      throw new Error('Database pool not initialized after connection attempt')
    }
    const result = await db.query(query, params)
    return result.rows
  } catch (error: unknown) {
    logger.error('[EXTRACTION] Failed to fetch project documents', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Extract a single entity type
 */
export async function extractSingleEntityType(
  projectId: string,
  userId: string,
  entityType: string,
  options: ExtractionOptions = {}
): Promise<any[]> {
  try {
    // Check if entity is registered and enabled
    if (!extractionRegistry.hasEntity(entityType)) {
      logger.warn(`[EXTRACTION-ORCHESTRATOR] Entity type not registered: ${entityType}`)
      return []
    }

    if (!extractionRegistry.isEnabled(entityType)) {
      logger.info(`[EXTRACTION-ORCHESTRATOR] Entity type disabled via feature flag: ${entityType}`)
      return []
    }

    // Get documents
    const documents = await getProjectDocuments(projectId, options.documentIds)

    if (documents.length === 0) {
      logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] No documents found - cannot extract entities`)
      return []
    }

    // Create context
    const context = new ExtractionContext(projectId, userId, documents, options)

    // Get extractor
    const extractor = extractionRegistry.getExtractor(entityType)
    if (!extractor) {
      logger.error(`[EXTRACTION-ORCHESTRATOR] No extractor found for: ${entityType}`)
      return []
    }

    // Extract entities
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Starting extraction`, {
      projectId,
      documentCount: documents.length,
      provider: context.provider,
      model: context.model
    })

    const result = await extractor(context, {
      temperature: options.temperature,
      maxTokens: options.maxTokens
    })

    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Extraction completed`, {
      projectId,
      entityCount: result.entities.length,
      rejectedCount: result.rejectedCount,
      cacheHit: result.stats.cacheHit,
      durationMs: result.stats.durationMs
    })

    return result.entities
  } catch (error: unknown) {
    logger.error(`[EXTRACTION-${entityType.toUpperCase()}] Extraction failed`, {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

/**
 * Save a single entity type
 */
export async function saveSingleEntityType(
  projectId: string,
  userId: string,
  entityType: string,
  entities: any[]
): Promise<PersistenceResult> {
  if (!pool) {
    throw new Error('Database pool not initialized')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check if entity is registered
    if (!extractionRegistry.hasEntity(entityType)) {
      logger.warn(`[EXTRACTION-ORCHESTRATOR] Entity type not registered: ${entityType}`)
      await client.query('ROLLBACK')
      return { saved: 0, skipped: 0, failed: 0 }
    }

    // Get saver
    const saver = extractionRegistry.getSaver(entityType)
    if (!saver) {
      logger.error(`[EXTRACTION-ORCHESTRATOR] No saver found for: ${entityType}`)
      await client.query('ROLLBACK')
      return { saved: 0, skipped: 0, failed: 0 }
    }

    // Save entities
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Saving ${entities.length} entities`, {
      projectId
    })

    const result = await saver(client, projectId, userId, entities)

    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Save completed`, {
      projectId,
      saved: result.saved,
      skipped: result.skipped,
      failed: result.failed
    })

    if (result.failed > 0 && result.error) {
      throw new Error(result.error)
    }

    await client.query('COMMIT')
    return result
  } catch (error: unknown) {
    await client.query('ROLLBACK')
    logger.error(`[EXTRACTION-${entityType.toUpperCase()}] Save failed`, {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  } finally {
    client.release()
  }
}

/**
 * Extract and save a single entity type (convenience method)
 */
export async function extractAndSaveEntityType(
  projectId: string,
  userId: string,
  entityType: string,
  options: ExtractionOptions = {}
): Promise<{ extracted: number; saved: number; rejected: number }> {
  const entities = await extractSingleEntityType(projectId, userId, entityType, options)

  if (entities.length > 0) {
    await saveSingleEntityType(projectId, userId, entityType, entities)
  }

  return {
    extracted: entities.length,
    saved: entities.length,
    rejected: 0 // Rejected entities are filtered out during extraction
  }
}

