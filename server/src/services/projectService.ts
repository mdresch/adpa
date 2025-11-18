import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export async function findByProgram(programId: string) {
  try {
    const result = await pool.query(
      `SELECT 
         p.*, 
         u.name as owner_name, 
         u.email as owner_email,
         COUNT(DISTINCT d.id) as document_count,
         AVG(
           CASE 
             WHEN d.generation_metadata->>'quality' IS NOT NULL 
             THEN (d.generation_metadata->>'quality')::numeric
             WHEN d.generation_metadata->'qualityMetrics'->>'overallQuality' IS NOT NULL
             THEN (d.generation_metadata->'qualityMetrics'->>'overallQuality')::numeric
             ELSE NULL
           END
         ) as document_quality_score
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
       WHERE p.program_id = $1
       GROUP BY p.id, u.name, u.email
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
      'name', 'description', 'framework', 'status', 'priority', 'start_date', 
      'end_date', 'budget', 'currency', 'owner_id', 'program_id',
      'team_members', 'metadata', 'settings'
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

/**
 * Replicate selected project configuration and (optionally) documents to similar projects.
 * Options:
 *  - targetProjectIds?: string[]  // explicit list of project IDs to replicate into
 *  - matchBy?: 'framework' | 'program' // find projects with matching framework or program
 *  - includeDocuments?: boolean // whether to copy documents
 */
export async function replicateToProjects(projectId: string, options: any = {}, userId: string) {
  const { targetProjectIds, matchBy = 'framework', includeDocuments = false } = options

  const client = await pool.connect()
  try {
    // Fetch source project
    const srcRes = await client.query('SELECT * FROM projects WHERE id = $1', [projectId])
    if (srcRes.rows.length === 0) {
      const err: any = new Error('Project not found')
      err.code = 'PROJECT_NOT_FOUND'
      throw err
    }
    const source = srcRes.rows[0]

    // Determine target projects
    let targets: string[] = []
    if (Array.isArray(targetProjectIds) && targetProjectIds.length > 0) {
      targets = targetProjectIds.filter((id: string) => id !== projectId)
    } else {
      if (matchBy === 'framework') {
        const q = await client.query('SELECT id FROM projects WHERE framework = $1 AND id <> $2', [source.framework, projectId])
        targets = q.rows.map(r => r.id)
      } else if (matchBy === 'program') {
        const q = await client.query('SELECT id FROM projects WHERE program_id = $1 AND id <> $2', [source.program_id, projectId])
        targets = q.rows.map(r => r.id)
      } else {
        const err: any = new Error('Invalid matchBy option')
        err.code = 'INVALID_OPTIONS'
        throw err
      }
    }

    if (targets.length === 0) {
      return { message: 'No target projects found', targets: [] }
    }

    await client.query('BEGIN')

    const summary: any[] = []

    for (const targetId of targets) {
      // Merge settings and add metadata pointing to source
      const settingsJson = source.settings || {}
      const metadataPatch = { replicated_from: projectId, replicated_at: new Date().toISOString(), replicated_by: userId }

      // Update target project's settings (JSONB concat) and metadata
      await client.query(
        `UPDATE projects SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{replication}', $3::jsonb, true), updated_at = NOW() WHERE id = $1`,
        [targetId, JSON.stringify(settingsJson), JSON.stringify(metadataPatch)]
      )

      let docsCopied = 0
      if (includeDocuments) {
        const docsRes = await client.query('SELECT * FROM documents WHERE project_id = $1 AND parent_document_id IS NULL', [projectId])
        for (const doc of docsRes.rows) {
          const newDocId = uuidv4()
          await client.query(
            `INSERT INTO documents (id, project_id, title, content, template_id, generation_metadata, created_by, created_at, updated_at, metadata)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),$8)`,
            [newDocId, targetId, `Replicated: ${doc.title || doc.name}`, doc.content, doc.template_id || null, doc.generation_metadata || null, userId, JSON.stringify({ replicated_from: doc.id, replicated_at: new Date().toISOString() })]
          )
          docsCopied++
        }
      }

      summary.push({ targetId, updated: true, documentsReplicated: docsCopied })
    }

    await client.query('COMMIT')
    return { message: 'Replication complete', targets: summary }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    logger.error('replicateToProjects error', { error })
    throw error
  } finally {
    client.release()
  }
}

export const projectService = {
  findByProgram,
  update,
  replicateToProjects,
}

export default projectService
