/**
 * Prioritization Service
 * TASK-328: Scoring API endpoints for portfolio prioritization
 * 
 * Manages prioritization criteria, project scores, and rankings
 * Supports weighted scoring model with automatic calculations
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// TYPES
// ============================================================================

export interface PrioritizationCriterion {
  id: string
  organization_id?: string | null
  name: string
  weight: number
  scale_min: number
  scale_max: number
  is_inverted: boolean
  description?: string | null
  sort_order?: number | null
  is_active: boolean
  created_at: Date
  updated_at: Date
  created_by?: string | null
}

export interface ProjectPriorityScore {
  id: string
  project_id: string
  criteria_id: string
  raw_score: number
  weighted_score: number
  justification?: string | null
  scored_by?: string | null
  scored_at: Date
  updated_at: Date
}

export interface ProjectRanking {
  project_id: string
  project_name: string
  program_id?: string | null
  program_name?: string | null
  total_score: number
  rank: number
  priority_tier: 'Critical' | 'High' | 'Medium' | 'Low'
  criteria_count: number
  last_scored_at?: Date | null
}

export interface CreateCriterionInput {
  name: string
  weight: number
  description?: string
  scale_min?: number
  scale_max?: number
  is_inverted?: boolean
  sort_order?: number
  organization_id?: string
}

export interface UpdateCriterionInput {
  name?: string
  weight?: number
  description?: string
  scale_min?: number
  scale_max?: number
  is_inverted?: boolean
  sort_order?: number
  is_active?: boolean
}

export interface CreateScoreInput {
  project_id: string
  criteria_id: string
  raw_score: number
  justification?: string
}

export interface UpdateScoreInput {
  raw_score?: number
  justification?: string
}

export interface PairwiseComparisonResult {
  project_id: string
  priority_score: number
  rank: number
}

export interface SavePairwiseComparisonInput {
  program_id?: string
  project_rankings: PairwiseComparisonResult[]
  method: 'pairwise_comparison'
}

// ============================================================================
// SERVICE
// ============================================================================

class PrioritizationService {
  /**
   * Get all prioritization criteria
   */
  async getCriteria(options: { 
    is_active?: boolean
    organization_id?: string 
  } = {}): Promise<PrioritizationCriterion[]> {
    try {
      let query = `
        SELECT * FROM prioritization_criteria
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (options.is_active !== undefined) {
        paramCount++
        query += ` AND is_active = $${paramCount}`
        params.push(options.is_active)
      }

      if (options.organization_id !== undefined) {
        paramCount++
        query += ` AND (organization_id = $${paramCount} OR organization_id IS NULL)`
        params.push(options.organization_id)
      }

      query += ` ORDER BY sort_order ASC NULLS LAST, name ASC`

      const result = await pool.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('getCriteria error', { error })
      throw error
    }
  }

  /**
   * Get a single criterion by ID
   */
  async getCriterionById(id: string): Promise<PrioritizationCriterion | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM prioritization_criteria WHERE id = $1',
        [id]
      )
      return result.rows[0] || null
    } catch (error) {
      logger.error('getCriterionById error', { error })
      throw error
    }
  }

  /**
   * Create a new prioritization criterion
   */
  async createCriterion(
    data: CreateCriterionInput,
    userId: string
  ): Promise<PrioritizationCriterion> {
    try {
      // Validate weight sum if this is an active criterion
      if (data.weight !== undefined) {
        const activeCriteria = await this.getCriteria({ is_active: true })
        const totalWeight = activeCriteria.reduce((sum, c) => sum + parseFloat(c.weight.toString()), 0)
        
        // Warn if adding this criterion would exceed 100%
        if (totalWeight + data.weight > 100) {
          logger.warn(`Creating criterion with weight ${data.weight}% would exceed 100% total (current: ${totalWeight}%)`)
        }
      }

      const id = uuidv4()
      const result = await pool.query(
        `INSERT INTO prioritization_criteria (
          id, name, weight, description, scale_min, scale_max, 
          is_inverted, sort_order, organization_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          id,
          data.name,
          data.weight,
          data.description || null,
          data.scale_min ?? 1,
          data.scale_max ?? 5,
          data.is_inverted ?? false,
          data.sort_order || null,
          data.organization_id || null,
          userId
        ]
      )

      logger.info(`Created prioritization criterion: ${data.name}`, { criterionId: id, userId })
      return result.rows[0]
    } catch (error) {
      logger.error('createCriterion error', { error })
      throw error
    }
  }

  /**
   * Update a prioritization criterion
   */
  async updateCriterion(
    id: string,
    data: UpdateCriterionInput,
    userId: string
  ): Promise<PrioritizationCriterion | null> {
    try {
      // Check if criterion exists
      const existing = await this.getCriterionById(id)
      if (!existing) {
        return null
      }

      // Build update query dynamically
      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`)
        values.push(data.name)
      }
      if (data.weight !== undefined) {
        updates.push(`weight = $${paramCount++}`)
        values.push(data.weight)
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`)
        values.push(data.description || null)
      }
      if (data.scale_min !== undefined) {
        updates.push(`scale_min = $${paramCount++}`)
        values.push(data.scale_min)
      }
      if (data.scale_max !== undefined) {
        updates.push(`scale_max = $${paramCount++}`)
        values.push(data.scale_max)
      }
      if (data.is_inverted !== undefined) {
        updates.push(`is_inverted = $${paramCount++}`)
        values.push(data.is_inverted)
      }
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCount++}`)
        values.push(data.sort_order)
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`)
        values.push(data.is_active)
      }

      if (updates.length === 0) {
        return existing
      }

      values.push(id)
      const query = `
        UPDATE prioritization_criteria
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await pool.query(query, values)
      logger.info(`Updated prioritization criterion: ${id}`, { userId })
      return result.rows[0] || null
    } catch (error) {
      logger.error('updateCriterion error', { error })
      throw error
    }
  }

  /**
   * Delete a prioritization criterion
   */
  async deleteCriterion(id: string): Promise<boolean> {
    try {
      // Check if criterion has scores
      const scoresResult = await pool.query(
        'SELECT COUNT(*) FROM project_priority_scores WHERE criteria_id = $1',
        [id]
      )
      const scoreCount = parseInt(scoresResult.rows[0].count)

      if (scoreCount > 0) {
        const err: any = new Error(`Cannot delete criterion: ${scoreCount} project score(s) exist`)
        err.code = 'CRITERION_IN_USE'
        throw err
      }

      const result = await pool.query(
        'DELETE FROM prioritization_criteria WHERE id = $1',
        [id]
      )

      logger.info(`Deleted prioritization criterion: ${id}`)
      return result.rowCount !== null && result.rowCount > 0
    } catch (error) {
      logger.error('deleteCriterion error', { error })
      throw error
    }
  }

  /**
   * Get scores for a project
   */
  async getProjectScores(projectId: string): Promise<ProjectPriorityScore[]> {
    try {
      const result = await pool.query(
        `SELECT ps.*, pc.name as criteria_name, pc.weight as criteria_weight
         FROM project_priority_scores ps
         JOIN prioritization_criteria pc ON ps.criteria_id = pc.id
         WHERE ps.project_id = $1
         ORDER BY pc.sort_order ASC NULLS LAST, pc.name ASC`,
        [projectId]
      )
      return result.rows
    } catch (error) {
      logger.error('getProjectScores error', { error })
      throw error
    }
  }

  /**
   * Get a single score by ID
   */
  async getScoreById(id: string): Promise<ProjectPriorityScore | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM project_priority_scores WHERE id = $1',
        [id]
      )
      return result.rows[0] || null
    } catch (error) {
      logger.error('getScoreById error', { error })
      throw error
    }
  }

  /**
   * Create or update a project score
   */
  async upsertScore(
    data: CreateScoreInput,
    userId: string
  ): Promise<ProjectPriorityScore> {
    try {
      // Validate project exists
      const projectResult = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [data.project_id]
      )
      if (projectResult.rows.length === 0) {
        const err: any = new Error('Project not found')
        err.code = 'PROJECT_NOT_FOUND'
        throw err
      }

      // Validate criterion exists
      const criterionResult = await pool.query(
        'SELECT id, scale_min, scale_max FROM prioritization_criteria WHERE id = $1',
        [data.criteria_id]
      )
      if (criterionResult.rows.length === 0) {
        const err: any = new Error('Criterion not found')
        err.code = 'CRITERION_NOT_FOUND'
        throw err
      }

      const criterion = criterionResult.rows[0]
      const scaleMin = criterion.scale_min || 1
      const scaleMax = criterion.scale_max || 5

      // Validate raw_score is within scale
      if (data.raw_score < scaleMin || data.raw_score > scaleMax) {
        const err: any = new Error(
          `Raw score must be between ${scaleMin} and ${scaleMax}`
        )
        err.code = 'INVALID_SCORE'
        throw err
      }

      // Upsert score (weighted_score is calculated automatically by trigger)
      const result = await pool.query(
        `INSERT INTO project_priority_scores (
          project_id, criteria_id, raw_score, justification, scored_by
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id, criteria_id)
        DO UPDATE SET
          raw_score = EXCLUDED.raw_score,
          justification = EXCLUDED.justification,
          scored_by = EXCLUDED.scored_by,
          scored_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          data.project_id,
          data.criteria_id,
          data.raw_score,
          data.justification || null,
          userId
        ]
      )

      logger.info(`Upserted project score`, {
        projectId: data.project_id,
        criteriaId: data.criteria_id,
        rawScore: data.raw_score,
        userId
      })

      return result.rows[0]
    } catch (error) {
      logger.error('upsertScore error', { error })
      throw error
    }
  }

  /**
   * Update a project score
   */
  async updateScore(
    id: string,
    data: UpdateScoreInput,
    userId: string
  ): Promise<ProjectPriorityScore | null> {
    try {
      // Get existing score
      const existing = await this.getScoreById(id)
      if (!existing) {
        return null
      }

      // Get criterion to validate scale
      const criterionResult = await pool.query(
        'SELECT scale_min, scale_max FROM prioritization_criteria WHERE id = $1',
        [existing.criteria_id]
      )
      const criterion = criterionResult.rows[0]
      const scaleMin = criterion.scale_min || 1
      const scaleMax = criterion.scale_max || 5

      // Validate raw_score if provided
      if (data.raw_score !== undefined) {
        if (data.raw_score < scaleMin || data.raw_score > scaleMax) {
          const err: any = new Error(
            `Raw score must be between ${scaleMin} and ${scaleMax}`
          )
          err.code = 'INVALID_SCORE'
          throw err
        }
      }

      // Build update query
      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (data.raw_score !== undefined) {
        updates.push(`raw_score = $${paramCount++}`)
        values.push(data.raw_score)
      }
      if (data.justification !== undefined) {
        updates.push(`justification = $${paramCount++}`)
        values.push(data.justification || null)
      }

      if (updates.length === 0) {
        return existing
      }

      updates.push(`scored_by = $${paramCount++}`)
      values.push(userId)
      updates.push(`scored_at = CURRENT_TIMESTAMP`)
      updates.push(`updated_at = CURRENT_TIMESTAMP`)

      values.push(id)
      const query = `
        UPDATE project_priority_scores
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await pool.query(query, values)
      logger.info(`Updated project score: ${id}`, { userId })
      return result.rows[0] || null
    } catch (error) {
      logger.error('updateScore error', { error })
      throw error
    }
  }

  /**
   * Delete a project score
   */
  async deleteScore(id: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM project_priority_scores WHERE id = $1',
        [id]
      )
      logger.info(`Deleted project score: ${id}`)
      return result.rowCount !== null && result.rowCount > 0
    } catch (error) {
      logger.error('deleteScore error', { error })
      throw error
    }
  }

  /**
   * Get rankings for projects (optionally filtered by program)
   */
  async getRankings(options: {
    program_id?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ rankings: ProjectRanking[], total: number }> {
    try {
      let query = `
        SELECT * FROM project_priority_rankings
        WHERE 1=1
      `
      let countQuery = `
        SELECT COUNT(*) FROM project_priority_rankings
        WHERE 1=1
      `
      const params: any[] = []
      const countParams: any[] = []
      let paramCount = 0
      let countParamCount = 0

      if (options.program_id) {
        paramCount++
        countParamCount++
        query += ` AND program_id = $${paramCount}`
        countQuery += ` AND program_id = $${countParamCount}`
        params.push(options.program_id)
        countParams.push(options.program_id)
      }

      query += ` ORDER BY rank ASC, total_score DESC`

      if (options.limit !== undefined) {
        paramCount++
        query += ` LIMIT $${paramCount}`
        params.push(options.limit)
      }

      if (options.offset !== undefined) {
        paramCount++
        query += ` OFFSET $${paramCount}`
        params.push(options.offset)
      }

      const [rankingsResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ])

      return {
        rankings: rankingsResult.rows,
        total: parseInt(countResult.rows[0].count)
      }
    } catch (error) {
      logger.error('getRankings error', { error })
      throw error
    }
  }

  /**
   * Get ranking for a specific project
   */
  async getProjectRanking(projectId: string): Promise<ProjectRanking | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM project_priority_rankings WHERE project_id = $1',
        [projectId]
      )
      return result.rows[0] || null
    } catch (error) {
      logger.error('getProjectRanking error', { error })
      throw error
    }
  }

  /**
   * Calculate total score for a project (sum of weighted scores)
   */
  async calculateProjectTotalScore(projectId: string): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT COALESCE(SUM(weighted_score), 0) as total_score
         FROM project_priority_scores
         WHERE project_id = $1`,
        [projectId]
      )
      return parseFloat(result.rows[0].total_score) || 0
    } catch (error) {
      logger.error('calculateProjectTotalScore error', { error })
      throw error
    }
  }

  /**
   * Save pairwise comparison results as prioritization scores
   * Creates or gets a "Pairwise Comparison" criterion and saves scores for all projects
   */
  async savePairwiseComparisonResults(
    data: SavePairwiseComparisonInput,
    userId: string
  ): Promise<{ saved: number; criterionId: string }> {
    try {
      // Find or create "Pairwise Comparison" criterion
      let criterionResult = await pool.query(
        `SELECT id FROM prioritization_criteria WHERE name = 'Pairwise Comparison' AND is_active = true LIMIT 1`
      )

      let criterionId: string

      if (criterionResult.rows.length === 0) {
        // Create the criterion if it doesn't exist
        const createResult = await pool.query(
          `INSERT INTO prioritization_criteria (
            name, weight, description, scale_min, scale_max, is_inverted, sort_order, is_active, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            'Pairwise Comparison',
            100, // Full weight since this is the only criterion for pairwise
            'Priority score derived from pairwise comparison methodology',
            1,
            5,
            false,
            999, // High sort order to put it last
            true,
            userId
          ]
        )
        criterionId = createResult.rows[0].id
        logger.info('Created Pairwise Comparison criterion', { criterionId })
      } else {
        criterionId = criterionResult.rows[0].id
      }

      // Convert pairwise priority scores (0-1 range) to raw scores (1-5 scale)
      // Map: 0.0-0.2 -> 1, 0.2-0.4 -> 2, 0.4-0.6 -> 3, 0.6-0.8 -> 4, 0.8-1.0 -> 5
      const convertToRawScore = (priorityScore: number): number => {
        if (priorityScore <= 0.2) return 1
        if (priorityScore <= 0.4) return 2
        if (priorityScore <= 0.6) return 3
        if (priorityScore <= 0.8) return 4
        return 5
      }

      // Save scores for all projects
      let savedCount = 0
      for (const ranking of data.project_rankings) {
        const rawScore = convertToRawScore(ranking.priority_score)
        const justification = `Pairwise comparison rank: ${ranking.rank}, priority score: ${ranking.priority_score.toFixed(3)}`

        try {
          await this.upsertScore(
            {
              project_id: ranking.project_id,
              criteria_id: criterionId,
              raw_score: rawScore,
              justification: justification
            },
            userId
          )
          savedCount++
        } catch (error) {
          logger.warn('Failed to save pairwise score for project', {
            projectId: ranking.project_id,
            error
          })
          // Continue with other projects
        }
      }

      logger.info('Saved pairwise comparison results', {
        savedCount,
        totalRankings: data.project_rankings.length,
        criterionId,
        userId
      })

      return { saved: savedCount, criterionId }
    } catch (error) {
      logger.error('savePairwiseComparisonResults error', { error })
      throw error
    }
  }
}

export default new PrioritizationService()

