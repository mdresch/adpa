/**
 * Deduper
 * 
 * Provides base deduplication utilities. Each entity type may have custom deduplication logic,
 * but this provides common patterns and helpers.
 */

import { logger } from '../../../utils/logger'

/**
 * Generate a deduplication key for an entity
 * Override this per entity type with entity-specific logic
 */
export type DedupeKeyGenerator<T> = (entity: T) => string

/**
 * Normalize string for deduplication (lowercase, trim, remove special chars)
 */
export function normalizeForDedupe(value: string | undefined | null): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
}

/**
 * Generate simple dedupe key from entity fields
 */
export function generateDedupeKey(fields: (string | undefined | null)[]): string {
  return fields
    .map(field => normalizeForDedupe(field?.toString()))
    .filter(field => field.length > 0)
    .join('|')
}

/**
 * Deduplicate entities using a key generator
 */
export function deduplicateEntities<T>(
  entities: T[],
  keyGenerator: DedupeKeyGenerator<T>,
  entityType: string
): T[] {
  const seen = new Map<string, T>()
  const duplicates: T[] = []
  
  for (const entity of entities) {
    const key = keyGenerator(entity)
    
    if (key && seen.has(key)) {
      duplicates.push(entity)
      logger.debug(`[EXTRACTION-DEDUPE] Duplicate ${entityType} detected: ${key}`)
    } else if (key) {
      seen.set(key, entity)
    }
  }
  
  if (duplicates.length > 0) {
    logger.info(`[EXTRACTION-DEDUPE] Removed ${duplicates.length} duplicate ${entityType} (from ${entities.length} total)`)
  }
  
  return Array.from(seen.values())
}

/**
 * Deduplicate entities by a specific field
 */
export function deduplicateByField<T>(
  entities: T[],
  fieldName: keyof T,
  entityType: string
): T[] {
  return deduplicateEntities(
    entities,
    (entity) => normalizeForDedupe(String(entity[fieldName])),
    entityType
  )
}

/**
 * Deduplicate entities by multiple fields (all must match)
 */
export function deduplicateByFields<T>(
  entities: T[],
  fieldNames: (keyof T)[],
  entityType: string
): T[] {
  return deduplicateEntities(
    entities,
    (entity) => generateDedupeKey(
      fieldNames.map(field => String(entity[field] || ''))
    ),
    entityType
  )
}

