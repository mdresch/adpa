import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface Program {
  id: string
  portfolio_id?: string
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
        portfolio_id, name, description, budget, currency, start_date, end_date, status, owner_id, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.portfolio_id || null,
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
    const result = await pool.query(`
      SELECT p.*, pg.portfolio_name
      FROM programs p
      LEFT JOIN portfolio_governance pg ON p.portfolio_id = pg.id
      WHERE p.id = $1
    `, [id])
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

export async function listPrograms(opts: { limit?: number; offset?: number; ownerId?: string; portfolioId?: string; status?: string; search?: string } = {}) {
  try {
    const clauses: string[] = []
    const params: any[] = []
    let idx = 1

    if (opts.ownerId) {
      clauses.push(`p.owner_id = $${idx++}`)
      params.push(opts.ownerId)
    }

    if (opts.portfolioId) {
      clauses.push(`p.portfolio_id = $${idx++}`)
      params.push(opts.portfolioId)
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
        pg.portfolio_name,
        (SELECT COUNT(*) FROM projects WHERE program_id = p.id) as project_count
      FROM programs p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN portfolio_governance pg ON p.portfolio_id = pg.id
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
    // Check if review_meetings table exists
    let hasReviewMeetings = false
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'review_meetings'
        )
      `)
      hasReviewMeetings = tableCheck.rows[0]?.exists === true
    } catch (err) {
      logger.warn('Could not check for review_meetings table', { error: err })
    }

    // Build query with conditional review meeting joins
    const reviewJoin = hasReviewMeetings
      ? `LEFT JOIN review_meetings rm ON rm.program_id = $1
         LEFT JOIN review_decisions rd ON rd.review_meeting_id = rm.id 
           AND (p.id = ANY(rd.affected_projects::uuid[]))`
      : ''

    const reviewSelects = hasReviewMeetings
      ? `MAX(rm.scheduled_date) as last_review_date,
         MAX(CASE WHEN rm.status = 'completed' THEN rm.actual_date END) as last_review_completed_date`
      : `NULL::DATE as last_review_date,
         NULL::DATE as last_review_completed_date`

    const query = `
      SELECT 
        p.*,
        u.email as owner_email,
        u.name as owner_name,
        COUNT(DISTINCT d.id) as document_count,
        -- Quality Metrics (from qualityMetrics object)
        -- Safely extract numeric values using jsonb_extract_path_text to handle both JSONB and text formats
        -- Strip percentage signs and other formatting before casting to numeric
        AVG(
          CASE 
            WHEN d.generation_metadata->>'quality' IS NOT NULL 
              AND regexp_replace(d.generation_metadata->>'quality', '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(d.generation_metadata->>'quality', '[^0-9.]', '', 'g')::numeric * 100
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'overallQuality') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'overallQuality'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'overallQuality'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as document_quality_score,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'completeness') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'completeness'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'completeness'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_completeness,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'structureScore') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'structureScore'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'structureScore'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_structure_score,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'formattingScore') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'formattingScore'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'formattingScore'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_formatting_score,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'contentDepth') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'contentDepth'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'contentDepth'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_content_depth,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'accuracy') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'accuracy'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'accuracy'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_accuracy,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'consistency') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'consistency'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'consistency'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_consistency,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'contextRelevance') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'contextRelevance'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'contextRelevance'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_context_relevance,
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'professionalQuality') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'professionalQuality'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'professionalQuality'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_professional_quality,
        -- Compliance Metrics (ONLY standardsCompliance - do NOT mix with quality score)
        -- This is specifically for framework compliance (PMBOK/BABOK/DMBOK standards adherence)
        AVG(
          CASE 
            WHEN d.generation_metadata ? 'qualityMetrics'
              AND jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'standardsCompliance') IS NOT NULL
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'standardsCompliance'), '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$'
              AND regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'standardsCompliance'), '[^0-9.]', '', 'g')::numeric > 0
            THEN regexp_replace(jsonb_extract_path_text(d.generation_metadata, 'qualityMetrics', 'standardsCompliance'), '[^0-9.]', '', 'g')::numeric
            ELSE NULL
          END
        ) as avg_standards_compliance,
        -- Content Metrics (calculate from content if columns are NULL/0)
        SUM(
          CASE 
            WHEN COALESCE(d.word_count, 0) > 0 THEN d.word_count
            WHEN d.content IS NOT NULL AND d.content != '' THEN
              array_length(regexp_split_to_array(trim(d.content), E'\\s+'), 1)
            ELSE 0
          END
        ) as total_word_count,
        SUM(
          CASE 
            WHEN COALESCE(d.character_count, 0) > 0 THEN d.character_count
            WHEN d.content IS NOT NULL THEN length(d.content)
            ELSE 0
          END
        ) as total_character_count,
        SUM(
          CASE 
            WHEN COALESCE(d.sentence_count, 0) > 0 THEN d.sentence_count
            WHEN d.content IS NOT NULL AND d.content != '' THEN
              array_length(regexp_split_to_array(d.content, '[.!?]+'), 1) - 1
            ELSE 0
          END
        ) as total_sentence_count,
        SUM(
          CASE 
            WHEN COALESCE(d.paragraph_count, 0) > 0 THEN d.paragraph_count
            WHEN d.content IS NOT NULL AND d.content != '' THEN
              (length(d.content) - length(replace(d.content, E'\n\n', ''))) / 2 + 1
            ELSE 0
          END
        ) as total_paragraph_count,
        AVG(
          CASE 
            WHEN COALESCE(d.word_count, 0) > 0 THEN d.word_count
            WHEN d.content IS NOT NULL AND d.content != '' THEN
              array_length(regexp_split_to_array(trim(d.content), E'\\s+'), 1)
            ELSE 0
          END
        ) as avg_words_per_document,
        CASE 
          WHEN SUM(
            CASE 
              WHEN COALESCE(d.sentence_count, 0) > 0 THEN d.sentence_count
              WHEN d.content IS NOT NULL AND d.content != '' THEN
                array_length(regexp_split_to_array(d.content, '[.!?]+'), 1) - 1
              ELSE 0
            END
          ) > 0 
          THEN SUM(
            CASE 
              WHEN COALESCE(d.word_count, 0) > 0 THEN d.word_count
              WHEN d.content IS NOT NULL AND d.content != '' THEN
                array_length(regexp_split_to_array(trim(d.content), E'\\s+'), 1)
              ELSE 0
            END
          )::numeric / SUM(
            CASE 
              WHEN COALESCE(d.sentence_count, 0) > 0 THEN d.sentence_count
              WHEN d.content IS NOT NULL AND d.content != '' THEN
                array_length(regexp_split_to_array(d.content, '[.!?]+'), 1) - 1
              ELSE 0
            END
          )::numeric
          ELSE 0
        END as avg_words_per_sentence,
        -- Review Status
        COUNT(DISTINCT CASE WHEN d.status = 'under_review' THEN d.id END) as documents_under_review,
        COUNT(DISTINCT CASE WHEN d.status = 'reviewed' THEN d.id END) as documents_reviewed,
        ${reviewSelects}
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
      ${reviewJoin}
      WHERE p.program_id = $1
      GROUP BY p.id, u.email, u.name
      ORDER BY p.created_at DESC
    `

    const result = await pool.query(query, [programId])

    logger.info('[PROGRAM] Projects fetched', {
      programId,
      count: result.rows.length,
      sampleCompliance: result.rows[0]?.avg_standards_compliance,
      sampleQuality: result.rows[0]?.document_quality_score
    })
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
