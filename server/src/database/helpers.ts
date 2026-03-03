import { getDatabasePoolSafe } from './connection'
import { logger } from '../utils/logger'
import type { QueryResult, QueryResultRow } from 'pg'

/**
 * Safe database query helper that gracefully handles pool initialization states.
 * Returns empty result set if pool is not ready instead of throwing.
 * 
 * Use this for queries during server initialization or in services that may
 * execute before connectDatabase() completes.
 * 
 * @param sql - SQL query string
 * @param params - Query parameters (optional)
 * @returns Query result with rows and rowCount, or empty result if pool unavailable
 */
export async function safeQuery<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getDatabasePoolSafe()
  
  if (!pool) {
    logger.warn('[DB-GUARD] safeQuery called but pool is not initialized', {
      sqlPreview: sql.substring(0, 50)
    })
    return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] }
  }

  try {
    return await pool.query<T>(sql, params)
  } catch (error: any) {
    logger.error('[DB-GUARD] Query failed', { 
      sqlPreview: sql.substring(0, 100),
      error: error?.message,
      code: error?.code
    })
    return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] }
  }
}

/**
 * Check if database pool is ready for queries.
 * Use before performing non-critical DB operations during startup.
 * 
 * @returns true if pool is initialized and ready
 */
export function isDatabaseReady(): boolean {
  return getDatabasePoolSafe() !== null
}