import { logger } from '../utils/logger'
import { connectDatabase, getDatabasePool } from '../database/connection'

type QueryResult = any

let initialized = false

export async function initDb(): Promise<void> {
  if (initialized) return
  await connectDatabase()
  initialized = true
}

export async function query(text: string, params?: any[], options?: { retries?: number, backoffMs?: number }): Promise<QueryResult | null> {
  // Default to 1 attempt because connection.ts already handles retries for transient errors.
  // Higher retry counts here create a multiplier effect that trips the circuit breaker too early.
  const retries = options?.retries ?? 1
  const baseBackoff = options?.backoffMs ?? 200

  let lastErr: any = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!initialized) {
        await initDb()
      }

      const pool = getDatabasePool()
      const res = await pool.query(text, params)
      return res
    } catch (err: any) {
      lastErr = err
      logger.warn('[DB] Query attempt failed', { attempt, retries, message: err?.message })
      if (attempt < retries) {
        const delay = baseBackoff * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  logger.error('[DB] Query failed after retries', { text, params, error: lastErr?.message })
  throw lastErr
}

export function getPool() {
  if (!initialized) throw new Error('Database not initialized; call initDb() first')
  return getDatabasePool()
}

export async function end() {
  try {
    const pool = getDatabasePool()
    await pool.end()
    initialized = false
  } catch (e) {
    // ignore
  }
}

export default { initDb, query, getPool, end }
