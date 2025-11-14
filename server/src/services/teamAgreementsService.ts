/**
 * Team Agreements Service
 * TASK-138: Business logic for Team Agreements CRUD operations
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface TeamAgreement {
  id: string
  project_id: string
  title: string
  description: string
  category: 'working_hours' | 'communication' | 'decision_making' | 'conflict_resolution' | 
            'quality_standards' | 'meeting_norms' | 'code_of_conduct' | 'collaboration_tools' | 
            'response_times' | 'knowledge_sharing' | 'other'
  agreed_by: string[] // JSONB array of user IDs
  facilitated_by?: string
  effective_date: Date
  review_frequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed'
  next_review_date?: Date
  status: 'draft' | 'active' | 'under_review' | 'revised' | 'deprecated'
  adherence_score?: number // 1.0 to 10.0
  violations_count: number
  last_violation_date?: Date
  source_document_id?: string
  notes?: string
  created_at: Date
  updated_at: Date
  created_by?: string
}

export interface CreateTeamAgreementInput {
  project_id: string
  title: string
  description: string
  category: TeamAgreement['category']
  agreed_by?: string[]
  facilitated_by?: string
  effective_date: Date | string
  review_frequency?: TeamAgreement['review_frequency']
  next_review_date?: Date | string
  status?: TeamAgreement['status']
  adherence_score?: number
  violations_count?: number
  source_document_id?: string
  notes?: string
}

export interface UpdateTeamAgreementInput {
  title?: string
  description?: string
  category?: TeamAgreement['category']
  agreed_by?: string[]
  facilitated_by?: string
  effective_date?: Date | string
  review_frequency?: TeamAgreement['review_frequency']
  next_review_date?: Date | string
  status?: TeamAgreement['status']
  adherence_score?: number
  violations_count?: number
  last_violation_date?: Date | string
  source_document_id?: string
  notes?: string
}

export interface TeamAgreementAdherenceLog {
  id: string
  agreement_id: string
  date_recorded: Date
  adherence_score?: number
  notes?: string
  recorded_by?: string
  created_at: Date
}

class TeamAgreementsService {
  /**
   * Get all team agreements for a project
   */
  async getByProject(projectId: string, filters?: {
    category?: string
    status?: string
  }): Promise<TeamAgreement[]> {
    try {
      // Use a subquery to force PostgreSQL to handle UUID comparison correctly
      // This avoids type inference issues when the column type doesn't match expectations
      let query = `
        SELECT 
          ta.id,
          ta.project_id,
          ta.title,
          ta.description,
          ta.category,
          ta.agreed_by,
          ta.facilitated_by,
          ta.effective_date,
          ta.review_frequency,
          ta.next_review_date,
          ta.status,
          ta.adherence_score,
          ta.violations_count,
          ta.last_violation_date,
          ta.source_document_id,
          ta.notes,
          ta.created_at,
          ta.updated_at,
          ta.created_by,
          u.name as created_by_name,
          ta.facilitated_by as facilitated_by_name
        FROM team_agreements ta
        LEFT JOIN users u ON ta.created_by = u.id
        WHERE ta.project_id::text = $1::text
      `
      const params: any[] = [projectId]
      let paramIndex = 2

      if (filters?.category) {
        query += ` AND ta.category = $${paramIndex}`
        params.push(filters.category)
        paramIndex++
      }

      if (filters?.status) {
        query += ` AND ta.status = $${paramIndex}`
        params.push(filters.status)
        paramIndex++
      }

      query += `
        ORDER BY ta.effective_date DESC, ta.created_at DESC
      `

      logger.debug('[TeamAgreementsService] Executing query:', {
        query: query.substring(0, 200) + '...',
        params: params,
        projectId
      })

      const result = await pool.query(query, params)
      logger.debug('[TeamAgreementsService] Query result:', {
        rowCount: result.rows.length,
        firstRow: result.rows[0] ? Object.keys(result.rows[0]) : []
      })
      return result.rows.map(this.mapRowToAgreement)
    } catch (error: any) {
      logger.error('[TeamAgreementsService] Error getting agreements by project:', {
        error: error.message,
        stack: error.stack,
        projectId,
        filters
      })
      throw error
    }
  }

  /**
   * Get a single team agreement by ID
   */
  async getById(agreementId: string): Promise<TeamAgreement | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          ta.*,
          u.name as created_by_name,
          uf.name as facilitated_by_name
        FROM team_agreements ta
        LEFT JOIN users u ON ta.created_by = u.id
        LEFT JOIN users uf ON ta.facilitated_by = uf.id
        WHERE ta.id = $1
        `,
        [agreementId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToAgreement(result.rows[0])
    } catch (error) {
      logger.error('[TeamAgreementsService] Error getting agreement by ID:', error)
      throw error
    }
  }

  /**
   * Create a new team agreement
   */
  async create(input: CreateTeamAgreementInput, userId: string): Promise<TeamAgreement> {
    try {
      const result = await pool.query(
        `
        INSERT INTO team_agreements (
          project_id,
          title,
          description,
          category,
          agreed_by,
          facilitated_by,
          effective_date,
          review_frequency,
          next_review_date,
          status,
          adherence_score,
          violations_count,
          source_document_id,
          notes,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
        `,
        [
          input.project_id,
          input.title,
          input.description,
          input.category,
          input.agreed_by || [], // Pass array directly - pg library converts to JSONB automatically
          input.facilitated_by || null,
          input.effective_date,
          input.review_frequency || null,
          input.next_review_date || null,
          input.status || 'active',
          input.adherence_score || null,
          input.violations_count || 0,
          input.source_document_id || null,
          input.notes || null,
          userId
        ]
      )

      return this.mapRowToAgreement(result.rows[0])
    } catch (error) {
      logger.error('[TeamAgreementsService] Error creating agreement:', error)
      throw error
    }
  }

  /**
   * Update an existing team agreement
   */
  async update(agreementId: string, input: UpdateTeamAgreementInput): Promise<TeamAgreement> {
    try {
      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (input.title !== undefined) {
        updates.push(`title = $${paramIndex++}`)
        params.push(input.title)
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`)
        params.push(input.description)
      }
      if (input.category !== undefined) {
        updates.push(`category = $${paramIndex++}`)
        params.push(input.category)
      }
      if (input.agreed_by !== undefined) {
        updates.push(`agreed_by = $${paramIndex++}`)
        params.push(input.agreed_by) // Pass array directly - pg library converts to JSONB automatically
      }
      if (input.facilitated_by !== undefined) {
        updates.push(`facilitated_by = $${paramIndex++}`)
        params.push(input.facilitated_by || null)
      }
      if (input.effective_date !== undefined) {
        updates.push(`effective_date = $${paramIndex++}`)
        params.push(input.effective_date)
      }
      if (input.review_frequency !== undefined) {
        updates.push(`review_frequency = $${paramIndex++}`)
        params.push(input.review_frequency || null)
      }
      if (input.next_review_date !== undefined) {
        updates.push(`next_review_date = $${paramIndex++}`)
        params.push(input.next_review_date || null)
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`)
        params.push(input.status)
      }
      if (input.adherence_score !== undefined) {
        updates.push(`adherence_score = $${paramIndex++}`)
        params.push(input.adherence_score || null)
      }
      if (input.violations_count !== undefined) {
        updates.push(`violations_count = $${paramIndex++}`)
        params.push(input.violations_count)
      }
      if (input.last_violation_date !== undefined) {
        updates.push(`last_violation_date = $${paramIndex++}`)
        params.push(input.last_violation_date || null)
      }
      if (input.source_document_id !== undefined) {
        updates.push(`source_document_id = $${paramIndex++}`)
        params.push(input.source_document_id || null)
      }
      if (input.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`)
        params.push(input.notes || null)
      }

      if (updates.length === 0) {
        // No updates, return existing
        const existing = await this.getById(agreementId)
        if (!existing) {
          throw new Error('Team agreement not found')
        }
        return existing
      }

      params.push(agreementId)
      const result = await pool.query(
        `
        UPDATE team_agreements
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
        `,
        params
      )

      if (result.rows.length === 0) {
        throw new Error('Team agreement not found')
      }

      return this.mapRowToAgreement(result.rows[0])
    } catch (error) {
      logger.error('[TeamAgreementsService] Error updating agreement:', error)
      throw error
    }
  }

  /**
   * Delete a team agreement
   */
  async delete(agreementId: string): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM team_agreements WHERE id = $1 RETURNING id',
        [agreementId]
      )

      if (result.rows.length === 0) {
        throw new Error('Team agreement not found')
      }
    } catch (error) {
      logger.error('[TeamAgreementsService] Error deleting agreement:', error)
      throw error
    }
  }

  /**
   * Record adherence score for an agreement
   */
  async recordAdherence(
    agreementId: string,
    adherenceScore: number,
    notes: string | undefined,
    userId: string
  ): Promise<TeamAgreementAdherenceLog> {
    try {
      // Validate score range
      if (adherenceScore < 1.0 || adherenceScore > 10.0) {
        throw new Error('Adherence score must be between 1.0 and 10.0')
      }

      const result = await pool.query(
        `
        INSERT INTO team_agreement_adherence_log (
          agreement_id,
          adherence_score,
          notes,
          recorded_by
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [agreementId, adherenceScore, notes || null, userId]
      )

      // Update the agreement's current adherence score
      await pool.query(
        `
        UPDATE team_agreements
        SET adherence_score = $1
        WHERE id = $2
        `,
        [adherenceScore, agreementId]
      )

      return this.mapRowToAdherenceLog(result.rows[0])
    } catch (error) {
      logger.error('[TeamAgreementsService] Error recording adherence:', error)
      throw error
    }
  }

  /**
   * Get adherence log for an agreement
   */
  async getAdherenceLog(agreementId: string): Promise<TeamAgreementAdherenceLog[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          tal.*,
          u.name as recorded_by_name
        FROM team_agreement_adherence_log tal
        LEFT JOIN users u ON tal.recorded_by = u.id
        WHERE tal.agreement_id = $1
        ORDER BY tal.date_recorded DESC
        `,
        [agreementId]
      )

      return result.rows.map(this.mapRowToAdherenceLog)
    } catch (error) {
      logger.error('[TeamAgreementsService] Error getting adherence log:', error)
      throw error
    }
  }

  /**
   * Record a violation for an agreement
   */
  async recordViolation(agreementId: string): Promise<TeamAgreement> {
    try {
      const result = await pool.query(
        `
        UPDATE team_agreements
        SET 
          violations_count = violations_count + 1,
          last_violation_date = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [agreementId]
      )

      if (result.rows.length === 0) {
        throw new Error('Team agreement not found')
      }

      return this.mapRowToAgreement(result.rows[0])
    } catch (error) {
      logger.error('[TeamAgreementsService] Error recording violation:', error)
      throw error
    }
  }

  /**
   * Map database row to TeamAgreement object
   */
  private mapRowToAgreement(row: any): TeamAgreement {
    try {
      // Handle agreed_by JSONB field - PostgreSQL returns it as JSONB which is already parsed
      let agreedBy: string[] = []
      if (row.agreed_by) {
        if (Array.isArray(row.agreed_by)) {
          agreedBy = row.agreed_by
        } else if (typeof row.agreed_by === 'string') {
          try {
            agreedBy = JSON.parse(row.agreed_by)
          } catch {
            agreedBy = []
          }
        } else if (typeof row.agreed_by === 'object' && row.agreed_by !== null) {
          // Handle case where JSONB is returned as an object
          agreedBy = Array.isArray(row.agreed_by) ? row.agreed_by : []
        }
      }

      return {
        id: row.id,
        project_id: row.project_id,
        title: row.title || '',
        description: row.description || '',
        category: row.category,
        agreed_by: agreedBy,
        facilitated_by: row.facilitated_by || undefined,
        effective_date: row.effective_date,
        review_frequency: row.review_frequency || undefined,
        next_review_date: row.next_review_date || undefined,
        status: row.status || 'active',
        adherence_score: row.adherence_score ? parseFloat(String(row.adherence_score)) : undefined,
        violations_count: row.violations_count || 0,
        last_violation_date: row.last_violation_date || undefined,
        source_document_id: row.source_document_id || undefined,
        notes: row.notes || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by || undefined
      }
    } catch (error: any) {
      logger.error('[TeamAgreementsService] Error mapping row to agreement:', {
        error: error.message,
        row: row ? { id: row.id, keys: Object.keys(row) } : null
      })
      throw new Error(`Failed to map team agreement row: ${error.message}`)
    }
  }

  /**
   * Map database row to TeamAgreementAdherenceLog object
   */
  private mapRowToAdherenceLog(row: any): TeamAgreementAdherenceLog {
    return {
      id: row.id,
      agreement_id: row.agreement_id,
      date_recorded: row.date_recorded,
      adherence_score: row.adherence_score ? parseFloat(row.adherence_score) : undefined,
      notes: row.notes,
      recorded_by: row.recorded_by,
      created_at: row.created_at
    }
  }
}

export default new TeamAgreementsService()

