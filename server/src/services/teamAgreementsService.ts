/**
 * Team Agreements Service
 * TASK-138: Business logic for Team Agreements CRUD operations
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { validate as isUuid } from 'uuid'

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
  created_by_name?: string | null
  facilitated_by_name?: string | null
  agreed_by_details?: AgreementParticipant[]
}

export interface AgreementParticipant {
  id: string
  name: string | null
  email: string | null
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
  recorded_by_name?: string | null
  created_at: Date
}

interface UserSummary {
  id: string
  name: string | null
  email: string | null
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
          uf.name as facilitated_by_name
        FROM team_agreements ta
        LEFT JOIN users u ON ta.created_by = u.id
        LEFT JOIN users uf ON ta.facilitated_by = uf.id
        WHERE ta.project_id::text = $1::text
      `
      const params: (string | number)[] = [projectId]
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
      const userIds = this.collectUserIds(result.rows)
      const userMap = await this.fetchUserSummaries(userIds)
      logger.debug('[TeamAgreementsService] Query result:', {
        rowCount: result.rows.length,
        firstRow: result.rows[0] ? Object.keys(result.rows[0]) : []
      })
      return result.rows.map(row => this.mapRowToAgreement(row, userMap))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error('[TeamAgreementsService] Error getting agreements by project:', {
        error: errorMessage,
        stack: errorStack,
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

      const userIds = this.collectUserIds(result.rows)
      const userMap = await this.fetchUserSummaries(userIds)
      return this.mapRowToAgreement(result.rows[0], userMap)
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

      const userMap = await this.fetchUserSummaries(this.collectUserIds(result.rows))
      return this.mapRowToAgreement(result.rows[0], userMap)
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
      const params: (string | number | string[] | Date | null | undefined)[] = []
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

      updates.push('updated_at = NOW()')
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

      const userMap = await this.fetchUserSummaries(this.collectUserIds(result.rows))
      return this.mapRowToAgreement(result.rows[0], userMap)
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
        RETURNING 
          id,
          agreement_id,
          date_recorded,
          adherence_score,
          notes,
          recorded_by,
          created_at,
          (SELECT name FROM users WHERE id = $4) as recorded_by_name
        `,
        [agreementId, adherenceScore, notes || null, userId]
      )

      // Update the agreement's current adherence score
      await pool.query(
        `
        UPDATE team_agreements
        SET adherence_score = $1,
            updated_at = NOW()
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
          last_violation_date = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [agreementId]
      )

      if (result.rows.length === 0) {
        throw new Error('Team agreement not found')
      }

      const userMap = await this.fetchUserSummaries(this.collectUserIds(result.rows))
      return this.mapRowToAgreement(result.rows[0], userMap)
    } catch (error) {
      logger.error('[TeamAgreementsService] Error recording violation:', error)
      throw error
    }
  }

  /**
   * Map database row to TeamAgreement object
   */
  private mapRowToAgreement(row: Record<string, unknown>, userMap?: Record<string, UserSummary>): TeamAgreement {
    try {
      const agreedBy = this.normalizeAgreedBy(row.agreed_by)
      const agreedByDetails: AgreementParticipant[] = agreedBy.map(id => {
        const user = userMap?.[id]
        return {
          id,
          name: user?.name ?? null,
          email: user?.email ?? null
        }
      })

      const id = String(row.id ?? '')
      const projectId = String(row.project_id ?? '')
      const facilitatedById = row.facilitated_by ? String(row.facilitated_by) : undefined
      const createdById = row.created_by ? String(row.created_by) : undefined

      return {
        id,
        project_id: projectId,
        title: String(row.title ?? ''),
        description: String(row.description ?? ''),
        category: row.category as TeamAgreement['category'],
        agreed_by: agreedBy,
        agreed_by_details: agreedByDetails,
        facilitated_by: facilitatedById,
        facilitated_by_name: (row.facilitated_by_name ? String(row.facilitated_by_name) : null) ?? (facilitatedById && userMap?.[facilitatedById]?.name) ?? null,
        effective_date: row.effective_date as Date,
        review_frequency: (row.review_frequency as TeamAgreement['review_frequency']) || undefined,
        next_review_date: (row.next_review_date as Date) || undefined,
        status: (row.status as TeamAgreement['status']) || 'active',
        adherence_score: row.adherence_score ? parseFloat(String(row.adherence_score)) : undefined,
        violations_count: Number(row.violations_count ?? 0),
        last_violation_date: (row.last_violation_date as Date) || undefined,
        source_document_id: row.source_document_id ? String(row.source_document_id) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
        created_at: row.created_at as Date,
        updated_at: row.updated_at as Date,
        created_by: createdById,
        created_by_name: (row.created_by_name ? String(row.created_by_name) : null) ?? (createdById && userMap?.[createdById]?.name) ?? null
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[TeamAgreementsService] Error mapping row to agreement:', {
        error: errorMessage,
        row: row ? { id: row.id, keys: Object.keys(row) } : null
      })
      throw new Error(`Failed to map team agreement row: ${errorMessage}`)
    }
  }

  /**
   * Map database row to TeamAgreementAdherenceLog object
   */
  private mapRowToAdherenceLog(row: Record<string, unknown>): TeamAgreementAdherenceLog {
    return {
      id: String(row.id ?? ''),
      agreement_id: String(row.agreement_id ?? ''),
      date_recorded: row.date_recorded as Date,
      adherence_score: row.adherence_score ? parseFloat(String(row.adherence_score)) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      recorded_by: row.recorded_by ? String(row.recorded_by) : undefined,
      recorded_by_name: row.recorded_by_name ? String(row.recorded_by_name) : null,
      created_at: row.created_at as Date
    }
  }

  private normalizeAgreedBy(raw: unknown): string[] {
    if (!raw) {
      return []
    }

    if (Array.isArray(raw)) {
      return raw.filter((value): value is string => typeof value === 'string' && value.length > 0)
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
          : []
      } catch {
        return []
      }
    }

    if (typeof raw === 'object' && raw !== null) {
      return Array.isArray(raw)
        ? raw.filter((value): value is string => typeof value === 'string' && value.length > 0)
        : []
    }

    return []
  }

  private collectUserIds(rows: Record<string, unknown>[]): string[] {
    const ids = new Set<string>()
    for (const row of rows) {
      this.normalizeAgreedBy(row.agreed_by).forEach(id => {
        if (isUuid(id)) {
          ids.add(id)
        }
      })
      const facilitatedBy = row.facilitated_by ? String(row.facilitated_by) : null
      if (facilitatedBy && isUuid(facilitatedBy)) {
        ids.add(facilitatedBy)
      }
      const createdBy = row.created_by ? String(row.created_by) : null
      if (createdBy && isUuid(createdBy)) {
        ids.add(createdBy)
      }
    }
    return Array.from(ids)
  }

  private async fetchUserSummaries(userIds: string[]): Promise<Record<string, UserSummary>> {
    if (!userIds.length) {
      return {}
    }

    const result = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE id = ANY($1::uuid[])
      `,
      [userIds]
    )

    return result.rows.reduce<Record<string, UserSummary>>((acc, user) => {
      acc[user.id] = {
        id: user.id,
        name: user.name || null,
        email: user.email || null
      }
      return acc
    }, {})
  }
}

const teamAgreementsService = new TeamAgreementsService()
export default teamAgreementsService

