/**
 * Persistence
 * 
 * Provides base interfaces and utilities for database persistence operations.
 * Each entity type will implement its own persistence logic, but this provides
 * common patterns and transaction helpers.
 */

import type { PoolClient } from 'pg'
import { logger } from '../../../utils/logger'

/**
 * Persistence result
 */
export interface PersistenceResult {
  /** Number of entities inserted/updated */
  saved: number
  /** Number of entities skipped (duplicates, etc.) */
  skipped: number
  /** Number of entities that failed validation */
  failed: number
  /** Error message if persistence failed */
  error?: string
}

/**
 * Base interface for entity persistence operations
 */
export interface EntityPersistence<T> {
  /**
   * Save entities to database
   * @param client Database client (within transaction)
   * @param projectId Project ID
   * @param userId User ID
   * @param entities Entities to save
   * @returns Persistence result
   */
  save(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: T[]
  ): Promise<PersistenceResult>
}

/**
 * Execute persistence within a transaction
 */
export async function executeWithTransaction<T>(
  client: PoolClient,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  try {
    await client.query('BEGIN')
    const result = await operation(client)
    await client.query('COMMIT')
    return result
  } catch (error: any) {
    await client.query('ROLLBACK')
    logger.error('[EXTRACTION-PERSISTENCE] Transaction rolled back', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Build placeholder string for bulk insert (e.g., "($1, $2, $3), ($4, $5, $6)")
 */
export function buildBulkInsertPlaceholders(
  rowCount: number,
  columnCount: number
): string {
  const rows: string[] = []
  let paramIndex = 1
  
  for (let i = 0; i < rowCount; i++) {
    const placeholders: string[] = []
    for (let j = 0; j < columnCount; j++) {
      placeholders.push(`$${paramIndex++}`)
    }
    rows.push(`(${placeholders.join(', ')})`)
  }
  
  return rows.join(', ')
}

/**
 * Normalize date string to ISO format (YYYY-MM-DD)
 */
export function normalizeDate(value: any): string | null {
  if (!value) return null
  
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    const lowered = trimmed.toLowerCase()
    if (
      ['tbd', 'n/a', 'na', 'none', 'unknown', 'not specified', 'ongoing', 'yyyy-mm-dd'].includes(lowered)
    ) {
      return null
    }

    const directIso = trimmed.match(/(\d{4}-\d{2}-\d{2})/)
    if (directIso) {
      return directIso[1]
    }

    const monthDayYear = trimmed.match(
      /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})/i
    )
    if (monthDayYear) {
      const [, monthName, dayRaw, year] = monthDayYear
      const monthMap: Record<string, string> = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', sept: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12'
      }
      const month = monthMap[monthName.toLowerCase()]
      if (month) {
        const day = dayRaw.padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    }

    const monthYear = trimmed.match(
      /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})$/i
    )
    if (monthYear) {
      const [, monthName, year] = monthYear
      const monthMap: Record<string, string> = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', sept: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12'
      }
      const month = monthMap[monthName.toLowerCase()]
      if (month) return `${year}-${month}-01`
    }

    // Try to parse and format as a fallback
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  
  return null
}

/**
 * Normalize enum value to allowed set
 */
export function normalizeEnum<T extends string>(
  value: any,
  allowed: Set<T>,
  defaultValue: T | null = null
): T | null {
  if (!value) return defaultValue
  
  const normalized = String(value).toLowerCase().trim()
  return allowed.has(normalized as T) ? (normalized as T) : defaultValue
}

/**
 * Truncate string to max length
 */
export function truncateString(value: string | undefined | null, maxLength: number): string {
  if (!value) return ''
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength)
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: any): boolean {
  if (typeof value !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

