import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface Program {
  id: string
  name: string
  description?: string
  budget?: string
  currency?: string
  start_date: string
  end_date: string
  status?: string
  owner_id: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export async function createProgram(data: Partial<Program>): Promise<Program> {
  try {
    const result = await pool.query(
      `INSERT INTO programs (
        name, description, budget, currency, start_date, end_date, status, owner_id, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        data.name,
        data.description || null,
        data.budget || null,
        data.currency || 'USD',
        data.start_date,
        data.end_date,
        data.status || 'green',
        data.owner_id,
        data.created_by || null,
      ]
    )

    return result.rows[0]
  } catch (error) {
    logger.error('createProgram error', { error })
    throw error
  }
}

export async function getProgramById(id: string): Promise<Program | null> {
  try {
    const result = await pool.query(`SELECT * FROM programs WHERE id = $1`, [id])
    return result.rows[0] || null
  } catch (error) {
    logger.error('getProgramById error', { error })
    throw error
  }
}

export async function updateProgram(id: string, updates: Partial<Program>): Promise<Program | null> {
  try {
    // Build dynamic SET clause safely
    const keys = Object.keys(updates)
    if (keys.length === 0) return getProgramById(id)

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`)
    const values = keys.map(k => (updates as any)[k])

    const query = `UPDATE programs SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`
    const result = await pool.query(query, [id, ...values])
    return result.rows[0] || null
  } catch (error) {
    logger.error('updateProgram error', { error })
    throw error
  }
}

export async function deleteProgram(id: string): Promise<boolean> {
  try {
    await pool.query(`DELETE FROM programs WHERE id = $1`, [id])
    return true
  } catch (error) {
    logger.error('deleteProgram error', { error })
    throw error
  }
}

export async function listPrograms(opts: { limit?: number; offset?: number; ownerId?: string; status?: string; search?: string } = {}) {
  try {
    const clauses: string[] = []
    const params: any[] = []
    let idx = 1

    if (opts.ownerId) {
      clauses.push(`owner_id = $${idx++}`)
      params.push(opts.ownerId)
    }

    if (opts.status) {
      clauses.push(`status = $${idx++}`)
      params.push(opts.status)
    }

    if (opts.search) {
      clauses.push(`to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${idx++})`)
      params.push(opts.search)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const limit = opts.limit || 25
    const offset = opts.offset || 0

    const query = `SELECT * FROM programs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`
    params.push(limit, offset)

    const result = await pool.query(query, params)
    return result.rows
  } catch (error) {
    logger.error('listPrograms error', { error })
    throw error
  }
}

export const programService = {
  createProgram,
  getProgramById,
  updateProgram,
  deleteProgram,
  listPrograms,
}

export default programService
