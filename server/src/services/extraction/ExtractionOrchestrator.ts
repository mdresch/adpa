; (async function () { try { await (require('../../lib/db')).initDb() } catch (e) { } })();
/**
 * Extraction Orchestrator
 * 
 * Coordinates entity extraction using the registry.
 * Handles errors, partial success, maintains queue contract compatibility,
 * and logs failures to the dead-letter table for recovery.
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import type { PoolClient } from 'pg'
import type { ExtractionDocument, ExtractionOptions, ExtractionResult } from './base/ExtractionResult'
import { ExtractionContext } from './base/ExtractionContext'
import { extractionRegistry } from './ExtractionRegistry'
import type { EntityExtractor, EntitySaver } from './ExtractionRegistry'
import type { PersistenceResult } from './base/Persistence'
import { deadLetterService } from './DeadLetterService'

/**
 * Get project documents for extraction
 */
async function getProjectDocuments(
  projectId: string,
  documentIds?: string[]
): Promise<ExtractionDocument[]> {
  try {
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
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
    const result = await pool.query(query, params)
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
 * Extract a single entity type (returns only entities for backward compatibility)
 */
export async function extractSingleEntityType(
  projectId: string,
  userId: string,
  entityType: string,
  options: ExtractionOptions = {}
): Promise<any[]> {
  const result = await extractSingleEntityTypeDetailed(projectId, userId, entityType, options)
  return result.entities
}

/**
 * Extract a single entity type with full results and stats
 */
export async function extractSingleEntityTypeDetailed(
  projectId: string,
  userId: string,
  entityType: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult<any>> {
  let correlationId: string | undefined

  try {
    // Check if entity is registered and enabled
    if (!extractionRegistry.hasEntity(entityType)) {
      logger.warn(`[EXTRACTION-ORCHESTRATOR] Entity type not registered: ${entityType}`)
      return {
        entities: [], rejectedCount: 0, skippedCount: 0,
        stats: { totalExtracted: 0, afterDeduplication: 0, afterSourceResolution: 0, finalCount: 0, cacheHit: false, durationMs: 0, provider: 'none', model: 'none' }
      }
    }

    if (!extractionRegistry.isEnabled(entityType)) {
      logger.info(`[EXTRACTION-ORCHESTRATOR] Entity type disabled via feature flag: ${entityType}`)
      return {
        entities: [], rejectedCount: 0, skippedCount: 0,
        stats: { totalExtracted: 0, afterDeduplication: 0, afterSourceResolution: 0, finalCount: 0, cacheHit: false, durationMs: 0, provider: 'none', model: 'none' }
      }
    }

    // Get documents
    const documents = await getProjectDocuments(projectId, options.documentIds)

    if (documents.length === 0) {
      logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] No documents found - cannot extract entities`)
      return {
        entities: [], rejectedCount: 0, skippedCount: 0,
        stats: {
          totalExtracted: 0, afterDeduplication: 0, afterSourceResolution: 0, finalCount: 0,
          cacheHit: false, durationMs: 0, provider: 'none', model: 'none'
        }
      }
    }

    // Create context (includes correlationId generation)
    const context = new ExtractionContext(projectId, userId, documents, options)
    correlationId = context.correlationId

    // Get extractor
    const extractor = extractionRegistry.getExtractor(entityType)
    if (!extractor) {
      logger.error(`[EXTRACTION-ORCHESTRATOR] No extractor found for: ${entityType}`, {
        correlationId
      })
      return {
        entities: [], rejectedCount: 0, skippedCount: 0,
        stats: {
          totalExtracted: 0, afterDeduplication: 0, afterSourceResolution: 0, finalCount: 0,
          cacheHit: false, durationMs: 0, provider: 'none', model: 'none', correlationId
        }
      }
    }

    // Extract entities
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Starting extraction`, {
      projectId,
      correlationId,
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
      correlationId,
      entityCount: result.entities.length,
      rejectedCount: result.rejectedCount,
      cacheHit: result.stats.cacheHit,
      durationMs: result.stats.durationMs
    })

    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const stackTrace = error instanceof Error ? error.stack : undefined

    logger.error(`[EXTRACTION-${entityType.toUpperCase()}] Extraction failed`, {
      projectId,
      correlationId,
      error: errorMessage
    })

    // Log to dead-letter table for recovery
    try {
      await deadLetterService.logFailure({
        projectId,
        entityType,
        errorMessage,
        stackTrace: stackTrace ? { message: stackTrace } : undefined,
        correlationId,
        status: 'pending'
      })
    } catch (dlError: unknown) {
      logger.error('[EXTRACTION-ORCHESTRATOR] Failed to log to dead-letter', {
        projectId,
        correlationId,
        error: dlError instanceof Error ? dlError.message : String(dlError)
      })
      // Don't re-throw; extraction already failed, don't fail again on DL logging
    }

    return {
      entities: [], rejectedCount: 0, skippedCount: 0,
      stats: {
        totalExtracted: 0, afterDeduplication: 0, afterSourceResolution: 0, finalCount: 0,
        cacheHit: false, durationMs: 0, provider: 'none', model: 'none', correlationId
      }
    }
  }
}

/**
 * Save a single entity type
 */
export async function saveSingleEntityType(
  projectId: string,
  userId: string | null,
  entityType: string,
  entities: any[],
  correlationId?: string
): Promise<PersistenceResult> {
  if (!pool) {
    throw new Error('Database pool not initialized')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Check if entity is registered
    if (!extractionRegistry.hasEntity(entityType)) {
      logger.warn(`[EXTRACTION-ORCHESTRATOR] Entity type not registered: ${entityType}`, {
        correlationId
      })
      await client.query('ROLLBACK')
      return { saved: 0, skipped: 0, failed: 0 }
    }

    // Get saver
    const saver = extractionRegistry.getSaver(entityType)
    if (!saver) {
      logger.error(`[EXTRACTION-ORCHESTRATOR] No saver found for: ${entityType}`, {
        correlationId
      })
      await client.query('ROLLBACK')
      return { saved: 0, skipped: 0, failed: 0 }
    }

    // Save entities
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Saving ${entities.length} entities`, {
      projectId,
      correlationId
    })

    const result = await saver(client, projectId, userId, entities)

    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Save completed`, {
      projectId,
      correlationId,
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const stackTrace = error instanceof Error ? error.stack : undefined

    logger.error(`[EXTRACTION-${entityType.toUpperCase()}] Save failed`, {
      projectId,
      correlationId,
      error: errorMessage
    })

    // Log to dead-letter table
    try {
      await deadLetterService.logFailure({
        projectId,
        entityType,
        errorMessage,
        stackTrace: stackTrace ? { message: stackTrace } : undefined,
        correlationId,
        status: 'pending'
      })
    } catch (dlError: unknown) {
      logger.error('[EXTRACTION-ORCHESTRATOR] Failed to log save failure to dead-letter', {
        projectId,
        correlationId,
        error: dlError instanceof Error ? dlError.message : String(dlError)
      })
    }

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
): Promise<{ extracted: number; saved: number; rejected: number; correlationId?: string }> {
  let correlationId: string | undefined

  try {
    // Create context to get correlationId
    const documents = await getProjectDocuments(projectId, options.documentIds)
    if (documents.length === 0) {
      return { extracted: 0, saved: 0, rejected: 0 }
    }

    const context = new ExtractionContext(projectId, userId, documents, options)
    correlationId = context.correlationId

    const entities = await extractSingleEntityType(projectId, userId, entityType, options)

    if (entities.length > 0) {
      await saveSingleEntityType(projectId, userId, entityType, entities, correlationId)
    }

    return {
      extracted: entities.length,
      saved: entities.length,
      rejected: 0,
      correlationId
    }
  } catch (error: unknown) {
    logger.error(`[EXTRACTION-ORCHESTRATOR] Extract and save failed for ${entityType}`, {
      projectId,
      correlationId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { extracted: 0, saved: 0, rejected: 0, correlationId }
  }
}
