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
      clauses.push(`p.owner_id = $${idx++}`)
      params.push(opts.ownerId)
    }

    if (opts.status) {
      clauses.push(`p.status = $${idx++}`)
      params.push(opts.status)
    }

    if (opts.search) {
      clauses.push(`to_tsvector('english', coalesce(p.name, '') || ' ' || coalesce(p.description, '')) @@ plainto_tsquery('english', $${idx++})`)
      params.push(opts.search)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const limit = opts.limit || 25
    const offset = opts.offset || 0

    // Enhanced query: Include owner name and project count
    const query = `
      SELECT 
        p.*,
        u.name as owner_name,
        (SELECT COUNT(*) FROM projects WHERE program_id = p.id) as project_count
      FROM programs p
      LEFT JOIN users u ON p.owner_id = u.id
      ${where} 
      ORDER BY p.created_at DESC 
      LIMIT $${idx++} OFFSET $${idx++}
    `
    params.push(limit, offset)

    const result = await pool.query(query, params)
    
    logger.info('[PROGRAMS] List query returned', { 
      rowCount: result.rows.length,
      query: where
    })
    
    return result.rows
  } catch (error) {
    logger.error('listPrograms error', { error })
    throw error
  }
}

/**
 * Get all projects assigned to a program
 */
export async function getProgramProjects(programId: string): Promise<Record<string, unknown>[]> {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        u.email as owner_email,
        u.name as owner_name,
        (SELECT COUNT(*) FROM documents WHERE project_id = p.id) as document_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.program_id = $1
      ORDER BY p.created_at DESC
    `, [programId])
    
    logger.info('[PROGRAM] Projects fetched', { programId, count: result.rows.length })
    return result.rows
  } catch (error) {
    logger.error('getProgramProjects error', { error })
    throw error
  }
}

/**
 * Assign a project to a program
 */
export async function assignProject(programId: string, projectId: string): Promise<any> {
  try {
    const result = await pool.query(`
      UPDATE projects 
      SET program_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [programId, projectId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    logger.info('[PROGRAM] Project assigned', { programId, projectId })
    return result.rows[0]
  } catch (error) {
    logger.error('assignProject error', { error })
    throw error
  }
}

/**
 * Remove a project from a program
 */
export async function removeProject(projectId: string): Promise<boolean> {
  try {
    await pool.query(`
      UPDATE projects 
      SET program_id = NULL, updated_at = NOW()
      WHERE id = $1
    `, [projectId])
    
    logger.info('[PROGRAM] Project removed', { projectId })
    return true
  } catch (error) {
    logger.error('removeProject error', { error })
    throw error
  }
}

/**
 * Check if a program can be archived
 * Returns true only if ALL projects in the program are archived
 */
export async function canArchiveProgram(programId: string): Promise<{ canArchive: boolean; reason?: string; unarchivedCount?: number }> {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE archived = true) as archived_projects,
        COUNT(*) FILTER (WHERE archived = false OR archived IS NULL) as unarchived_projects
      FROM projects
      WHERE program_id = $1
    `, [programId])
    
    const { total_projects, archived_projects, unarchived_projects } = result.rows[0]
    
    if (parseInt(total_projects) === 0) {
      return { 
        canArchive: true 
      }
    }
    
    if (parseInt(unarchived_projects) > 0) {
      return {
        canArchive: false,
        reason: `Cannot archive program: ${unarchived_projects} project(s) are not archived yet`,
        unarchivedCount: parseInt(unarchived_projects)
      }
    }
    
    return { canArchive: true }
  } catch (error) {
    logger.error('canArchiveProgram error', { error })
    throw error
  }
}

/**
 * Archive a program
 * Only succeeds if all underlying projects are archived
 */
export async function archiveProgram(programId: string, userId: string): Promise<any> {
  try {
    // Check if program can be archived
    const archiveCheck = await canArchiveProgram(programId)
    
    if (!archiveCheck.canArchive) {
      throw new Error(archiveCheck.reason || 'Cannot archive program')
    }
    
    const result = await pool.query(`
      UPDATE programs 
      SET 
        archived = true,
        archived_at = NOW(),
        archived_by = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [programId, userId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    logger.info('[PROGRAM] Program archived', { programId, userId })
    return result.rows[0]
  } catch (error) {
    logger.error('archiveProgram error', { error })
    throw error
  }
}

/**
 * Unarchive a program
 */
export async function unarchiveProgram(programId: string): Promise<any> {
  try {
    const result = await pool.query(`
      UPDATE programs 
      SET 
        archived = false,
        archived_at = NULL,
        archived_by = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [programId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    logger.info('[PROGRAM] Program unarchived', { programId })
    return result.rows[0]
  } catch (error) {
    logger.error('unarchiveProgram error', { error })
    throw error
  }
}

export const programService = {
  createProgram,
  getProgramById,
  updateProgram,
  deleteProgram,
  listPrograms,
  getProgramProjects,
  assignProject,
  removeProject,
  canArchiveProgram,
  archiveProgram,
  unarchiveProgram,
}

export default programService
