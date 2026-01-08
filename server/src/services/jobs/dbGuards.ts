const db = require('../../lib/db')
;(async function(){ try{ await db.initDb() } catch(e){} })();
import type { Pool } from 'pg'
import { logger } from '../../utils/logger'

/**
 * Execute a database query safely. Returns the query result or null on error.
 * This helper logs the error and prevents processors from throwing on secondary
 * bookkeeping failures (so the original job error is preserved).
 */
export async function safeQuery(pool: Pool | null, sql: string, params: any[] = []) {
  if (!pool) {
    logger.warn('[DB-GUARD] safeQuery called but pool is not initialized')
    return null
  }

  try {
    return await db.query(sql, params)
  } catch (err: any) {
    logger.error('[DB-GUARD] Database query failed', { sql, params, message: err?.message })
    return null
  }
}

/**
 * Wrapper for update-style queries that returns boolean success.
 */
export async function safeUpdate(pool: Pool | null, sql: string, params: any[] = []): Promise<boolean> {
  const res = await safeQuery(pool, sql, params)
  return !!(res && (res.rowCount === undefined || res.rowCount >= 0))
}
