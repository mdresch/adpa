import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export async function findByProgram(programId: string) {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.program_id = $1
       ORDER BY p.created_at DESC`,
      [programId]
    )
    return result.rows
  } catch (error) {
    logger.error('findByProgram error', { error })
    throw error
  }
}

/**
 * Update project and handle program assignment validation.
 * If program_id is provided (including null), validate existence or allow null.
 * Enforce that only program owner or admin may assign a project to a program.
 */
export async function update(projectId: string, data: any, userId: string) {
  try {
    // If program_id is explicitly provided (could be null to unassign)
    if (Object.prototype.hasOwnProperty.call(data, 'program_id')) {
      const programId = data.program_id
      if (programId) {
        // Verify program exists and get owner
        const progRes = await pool.query('SELECT id, owner_id FROM programs WHERE id = $1', [programId])
        if (progRes.rows.length === 0) {
          const err: any = new Error('Program not found')
          err.code = 'PROGRAM_NOT_FOUND'
          throw err
        }

        const program = progRes.rows[0]

        // Check user role to authorize assignment
        const userRes = await pool.query('SELECT id, role FROM users WHERE id = $1', [userId])
        const user = userRes.rows[0] || { role: 'user' }

        const isOwner = program.owner_id === userId
        const isAdmin = user.role === 'admin'

        if (!isOwner && !isAdmin) {
          const err: any = new Error('Forbidden')
          err.code = 'FORBIDDEN'
          throw err
        }
      }
      // if program_id is null, that's allowed (unassign)
    }

    // Build dynamic update with SQL injection protection
    // Whitelist of allowed updatable fields to prevent SQL injection
    const ALLOWED_FIELDS = [
      'name', 'description', 'status', 'priority', 'start_date', 
      'end_date', 'budget', 'currency', 'owner_id', 'program_id',
      'metadata', 'settings'
    ]
    
    const keys = Object.keys(data)
    if (keys.length === 0) {
      // Return current project
      const cur = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId])
      return cur.rows[0] || null
    }

    // Validate all keys against whitelist to prevent SQL injection
    const invalidKeys = keys.filter(k => !ALLOWED_FIELDS.includes(k))
    if (invalidKeys.length > 0) {
      const err: any = new Error(`Invalid fields: ${invalidKeys.join(', ')}`)
      err.code = 'INVALID_FIELDS'
      throw err
    }

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`)
    const values = keys.map(k => data[k])

    const query = `UPDATE projects SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`
    const res = await pool.query(query, [projectId, ...values])
    return res.rows[0] || null
  } catch (error) {
    logger.error('projectService.update error', { error })
    throw error
  }
}

export const projectService = {
  findByProgram,
  update,
}

export default projectService
