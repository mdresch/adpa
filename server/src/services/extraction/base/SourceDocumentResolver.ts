/**
 * Source Document Resolver
 * 
 * Resolves source_document titles to document IDs with exact, fuzzy, and fallback matching.
 */

import { logger } from '../../../utils/logger'
import type { ExtractionContext } from './ExtractionContext'
import type { SourceResolutionResult } from './ExtractionResult'

/**
 * Resolve source document ID from source_document title
 * Returns the resolved document ID, or undefined if not found
 */
export function resolveSourceDocumentId(
  sourceDocument: string | undefined,
  documentMap: Map<string, string>
): string | undefined {
  if (!sourceDocument) return undefined
  
  const docTitle = sourceDocument.trim()
  if (!docTitle) return undefined
  
  // Try exact match first
  let sourceDocumentId = documentMap.get(docTitle.toLowerCase()) || 
                        documentMap.get(docTitle.toLowerCase().replace(/[^\w\s]/g, ''))
  
  // If not found, try fuzzy matching
  if (!sourceDocumentId) {
    for (const [title, id] of documentMap.entries()) {
      if (docTitle.toLowerCase().includes(title) || title.includes(docTitle.toLowerCase())) {
        sourceDocumentId = id
        logger.debug(`[EXTRACTION] Fuzzy matched document "${docTitle}" to "${title}" (ID: ${id})`)
        break
      }
    }
  }
  
  return sourceDocumentId
}

/**
 * Resolve source document ID with strict validation
 * Returns resolution result with method used
 */
export function resolveSourceDocumentIdStrict(
  entity: any,
  context: ExtractionContext,
  entityType: string,
  entityName: string
): SourceResolutionResult {
  // Try to resolve from AI-provided source_document
  if (entity.source_document) {
    const documentId = resolveSourceDocumentId(entity.source_document, context.documentMap)
    
    if (documentId) {
      const doc = context.getDocumentById(documentId)
      logger.debug(`[EXTRACTION-${entityType.toUpperCase()}] ✅ Resolved source_document_id for "${entityName}" from "${entity.source_document}" → ${documentId}`)
      entity.source_document_id = documentId
      return {
        resolved: true,
        documentId,
        documentTitle: doc?.title || entity.source_document,
        method: 'exact'
      }
    } else {
      logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] Could not resolve source_document_id for "${entityName}" from "${entity.source_document}" - using fallback`)
      logger.debug(`[EXTRACTION-${entityType.toUpperCase()}] Available documents: ${Array.from(context.documentMap.keys()).join(', ')}`)
    }
  } else {
    logger.debug(`[EXTRACTION-${entityType.toUpperCase()}] Entity "${entityName}" has no source_document field - using fallback to first document`)
  }
  
  // Fallback: Use first document if available
  if (context.documents.length > 0 && context.documents[0].id) {
    const firstDoc = context.documents[0]
    entity.source_document_id = firstDoc.id
    entity.source_document = firstDoc.title || firstDoc.template_name || `Document ${firstDoc.id.substring(0, 8)}`
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] ✅ Applied fallback source_document_id for "${entityName}" → ${firstDoc.id} (${entity.source_document})`)
    return {
      resolved: true,
      documentId: firstDoc.id,
      documentTitle: entity.source_document,
      method: 'fallback'
    }
  }
  
  // No documents available - reject entity
  logger.error(`[EXTRACTION-${entityType.toUpperCase()}] REJECTED: Entity "${entityName}" - no source_document provided and no documents available for fallback`)
  return {
    resolved: false,
    method: 'rejected'
  }
}

