/**
 * Save Requirements
 * 
 * Persists requirements to the database with deduplication, normalization, and validation.
 * Handles enum mapping for status, priority, and type fields.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { Requirement } from './types'

/**
 * Normalize acceptance criteria to array format
 */
function normalizeAcceptanceCriteria(criteria: string | string[] | undefined): string[] | null {
  if (!criteria) return null
  if (Array.isArray(criteria)) return criteria
  return [criteria]
}

/**
 * Normalize status value to database enum
 * DB allows: draft, approved, implemented, verified
 * AI returns: proposed, approved, in_progress, completed, deferred
 */
function normalizeStatus(rawStatus: string | undefined): 'draft' | 'approved' | 'implemented' | 'verified' {
  const statusMap: Record<string, 'draft' | 'approved' | 'implemented' | 'verified'> = {
    'proposed': 'draft',
    'approved': 'approved',
    'in_progress': 'draft',
    'completed': 'implemented',
    'deferred': 'draft'
  }
  
  if (!rawStatus) return 'draft'
  const normalized = rawStatus.toLowerCase().trim()
  return statusMap[normalized] || 'draft'
}

/**
 * Normalize priority value to database enum
 * DB allows: high, medium, low
 * AI returns: critical, high, medium, low
 */
function normalizePriority(rawPriority: string | undefined): 'high' | 'medium' | 'low' {
  const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
    'critical': 'high',
    'very_high': 'high',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'very_low': 'low'
  }
  
  if (!rawPriority) return 'medium'
  const normalized = rawPriority.toLowerCase().trim()
  return priorityMap[normalized] || 'medium'
}

/**
 * Normalize type value to database enum
 * DB allows: functional, non_functional, business, technical
 * AI returns: functional, non-functional, business, technical
 */
function normalizeType(rawType: string | undefined): 'functional' | 'non_functional' | 'business' | 'technical' {
  const typeMap: Record<string, 'functional' | 'non_functional' | 'business' | 'technical'> = {
    'functional': 'functional',
    'non-functional': 'non_functional',
    'non_functional': 'non_functional',
    'business': 'business',
    'technical': 'technical'
  }
  
  if (!rawType) return 'functional'
  const normalized = rawType.toLowerCase().trim()
  return typeMap[normalized] || 'functional'
}

/**
 * Deduplicate requirements by title
 */
function deduplicateRequirements(requirements: Requirement[]): Requirement[] {
  const deduplicatedMap = new Map<string, Requirement>()
  
  requirements.forEach(req => {
    const normalizedTitle = req.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, req)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: Requirement = {
        ...existing,
        description: req.description || existing.description,
        type: req.type || existing.type,
        priority: req.priority || existing.priority,
        status: req.status || existing.status,
        acceptance_criteria: req.acceptance_criteria || existing.acceptance_criteria,
        source: req.source || existing.source
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-REQUIREMENTS] Merged duplicate requirement: "${req.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save requirements to database
 */
export async function saveRequirements(
  client: PoolClient,
  projectId: string,
  userId: string,
  requirements: Requirement[]
): Promise<PersistenceResult> {
  if (requirements.length === 0) {
    logger.info('[EXTRACTION] No requirements to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate requirements
    const uniqueRequirements = deduplicateRequirements(requirements)
    const skippedCount = requirements.length - uniqueRequirements.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-REQUIREMENTS] Deduplicated ${requirements.length} → ${uniqueRequirements.length} requirements`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueRequirements.forEach((r, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )
      
      // Convert acceptance_criteria string to array if it exists
      const acceptanceCriteria = normalizeAcceptanceCriteria(r.acceptance_criteria)
      
      // Normalize enum values
      const mappedStatus = normalizeStatus(r.status)
      const mappedPriority = normalizePriority(r.priority)
      const mappedType = normalizeType(r.type)
      
      // Resolve source_document_id
      const sourceDocumentId = r.source_document_id || null
      
      // Both title and name columns use the same value (title)
      values.push(
        projectId,
        r.title,        // For title column
        r.title,        // For name column (NOT NULL requirement)
        r.description,
        mappedType,     // Use mapped type value
        mappedPriority, // Use mapped priority value
        mappedStatus,   // Use mapped status value
        acceptanceCriteria,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO requirements (
        project_id, title, name, description, type, priority, status, 
        acceptance_criteria, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        acceptance_criteria = EXCLUDED.acceptance_criteria,
        source_document_id = COALESCE(EXCLUDED.source_document_id, requirements.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueRequirements.length} requirements (deduplicated from ${requirements.length})`)

    return {
      saved: uniqueRequirements.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-REQUIREMENTS] Failed to save requirements', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: requirements.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

