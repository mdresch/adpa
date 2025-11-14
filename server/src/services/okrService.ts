/**
 * OKR Service
 * TASK-1281: API endpoints for OKRs and Key Results
 * 
 * Manages Objectives and Key Results (OKRs) at organization, portfolio, program, and project levels
 * Supports cascading OKRs, progress tracking, and automatic calculations
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// TYPES
// ============================================================================

export interface OKR {
  id: string
  organization_id?: string | null
  strategic_goal_id?: string | null
  parent_okr_id?: string | null
  level: 'organization' | 'portfolio' | 'program' | 'project'
  entity_id?: string | null
  entity_type?: 'program' | 'project' | null
  objective_title: string
  objective_description?: string | null
  objective_category?: 'strategic' | 'operational' | 'innovation' | null
  okr_period?: string | null
  period_start?: Date | null
  period_end?: Date | null
  owner_id?: string | null
  owner_name?: string | null
  owner_role?: string | null
  confidence_level?: number | null
  progress_percentage?: number | null
  status?: 'on-track' | 'at-risk' | 'behind' | 'achieved' | 'not-started' | null
  is_stretch_goal: boolean
  priority?: 'critical' | 'high' | 'medium' | 'low' | null
  created_at: Date
  updated_at: Date
}

export interface KeyResult {
  id: string
  okr_id: string
  key_result_title: string
  key_result_description?: string | null
  metric_name?: string | null
  metric_unit?: string | null
  baseline_value?: number | null
  target_value: number
  current_value: number
  stretch_target?: number | null
  progress_percentage?: number | null
  progress_status?: 'not-started' | 'in-progress' | 'achieved' | 'at-risk' | 'behind' | null
  measurement_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  last_measured_at?: Date | null
  next_measurement_date?: Date | null
  owner_id?: string | null
  contributing_projects?: string[] | null
  created_at: Date
  updated_at: Date
}

export interface CreateOKRInput {
  organization_id?: string
  strategic_goal_id?: string
  parent_okr_id?: string
  level: 'organization' | 'portfolio' | 'program' | 'project'
  entity_id?: string
  entity_type?: 'program' | 'project'
  objective_title: string
  objective_description?: string
  objective_category?: 'strategic' | 'operational' | 'innovation'
  okr_period?: string
  period_start?: string
  period_end?: string
  owner_id?: string
  owner_name?: string
  owner_role?: string
  confidence_level?: number
  is_stretch_goal?: boolean
  priority?: 'critical' | 'high' | 'medium' | 'low'
}

export interface UpdateOKRInput {
  objective_title?: string
  objective_description?: string
  objective_category?: 'strategic' | 'operational' | 'innovation'
  okr_period?: string
  period_start?: string
  period_end?: string
  owner_id?: string
  owner_name?: string
  owner_role?: string
  confidence_level?: number
  progress_percentage?: number
  status?: 'on-track' | 'at-risk' | 'behind' | 'achieved' | 'not-started'
  is_stretch_goal?: boolean
  priority?: 'critical' | 'high' | 'medium' | 'low'
}

export interface CreateKeyResultInput {
  okr_id: string
  key_result_title: string
  key_result_description?: string
  metric_name?: string
  metric_unit?: string
  baseline_value?: number
  target_value: number
  current_value?: number
  stretch_target?: number
  measurement_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  next_measurement_date?: string
  owner_id?: string
  contributing_projects?: string[]
}

export interface UpdateKeyResultInput {
  key_result_title?: string
  key_result_description?: string
  metric_name?: string
  metric_unit?: string
  baseline_value?: number
  target_value?: number
  current_value?: number
  stretch_target?: number
  measurement_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  next_measurement_date?: string
  owner_id?: string
  contributing_projects?: string[]
}

export interface OKRWithKeyResults extends OKR {
  key_results?: KeyResult[]
}

// ============================================================================
// SERVICE
// ============================================================================

class OKRService {
  /**
   * Get all OKRs with optional filtering
   */
  async getOKRs(options: {
    level?: 'organization' | 'portfolio' | 'program' | 'project'
    entity_id?: string
    entity_type?: 'program' | 'project'
    parent_okr_id?: string
    organization_id?: string
    include_key_results?: boolean
  } = {}): Promise<OKR[]> {
    try {
      let query = `
        SELECT * FROM portfolio_okrs
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (options.level) {
        paramCount++
        query += ` AND level = $${paramCount}`
        params.push(options.level)
      }

      if (options.entity_id) {
        paramCount++
        query += ` AND entity_id = $${paramCount}`
        params.push(options.entity_id)
      }

      if (options.entity_type) {
        paramCount++
        query += ` AND entity_type = $${paramCount}`
        params.push(options.entity_type)
      }

      if (options.parent_okr_id) {
        paramCount++
        query += ` AND parent_okr_id = $${paramCount}`
        params.push(options.parent_okr_id)
      } else if (options.parent_okr_id === null) {
        query += ` AND parent_okr_id IS NULL`
      }

      if (options.organization_id) {
        paramCount++
        query += ` AND (organization_id = $${paramCount} OR organization_id IS NULL)`
        params.push(options.organization_id)
      }

      query += ` ORDER BY created_at DESC`

      const result = await pool.query(query, params)
      const okrs = result.rows as OKR[]

      // Optionally include key results
      if (options.include_key_results && okrs.length > 0) {
        const okrIds = okrs.map(o => o.id)
        const keyResults = await this.getKeyResultsByOKRIds(okrIds)
        
        // Group key results by OKR ID
        const krMap = new Map<string, KeyResult[]>()
        keyResults.forEach(kr => {
          if (!krMap.has(kr.okr_id)) {
            krMap.set(kr.okr_id, [])
          }
          krMap.get(kr.okr_id)!.push(kr)
        })

        // Attach key results to OKRs
        okrs.forEach(okr => {
          (okr as OKRWithKeyResults).key_results = krMap.get(okr.id) || []
        })
      }

      return okrs
    } catch (error) {
      logger.error('getOKRs error', { error })
      throw error
    }
  }

  /**
   * Get a single OKR by ID
   */
  async getOKRById(id: string, includeKeyResults = false): Promise<OKR | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM portfolio_okrs WHERE id = $1',
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      const okr = result.rows[0] as OKR

      if (includeKeyResults) {
        const keyResults = await this.getKeyResultsByOKRIds([id])
        ;(okr as OKRWithKeyResults).key_results = keyResults
      }

      return okr
    } catch (error) {
      logger.error('getOKRById error', { error })
      throw error
    }
  }

  /**
   * Create a new OKR
   */
  async createOKR(data: CreateOKRInput, userId: string): Promise<OKR> {
    try {
      const id = uuidv4()
      
      const result = await pool.query(
        `INSERT INTO portfolio_okrs (
          id, organization_id, strategic_goal_id, parent_okr_id,
          level, entity_id, entity_type,
          objective_title, objective_description, objective_category,
          okr_period, period_start, period_end,
          owner_id, owner_name, owner_role,
          confidence_level, is_stretch_goal, priority
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) RETURNING *`,
        [
          id,
          data.organization_id || null,
          data.strategic_goal_id || null,
          data.parent_okr_id || null,
          data.level,
          data.entity_id || null,
          data.entity_type || null,
          data.objective_title,
          data.objective_description || null,
          data.objective_category || null,
          data.okr_period || null,
          data.period_start ? new Date(data.period_start) : null,
          data.period_end ? new Date(data.period_end) : null,
          data.owner_id || null,
          data.owner_name || null,
          data.owner_role || null,
          data.confidence_level || null,
          data.is_stretch_goal || false,
          data.priority || null,
        ]
      )

      return result.rows[0] as OKR
    } catch (error) {
      logger.error('createOKR error', { error })
      throw error
    }
  }

  /**
   * Update an OKR
   */
  async updateOKR(id: string, data: UpdateOKRInput, userId: string): Promise<OKR | null> {
    try {
      const updates: string[] = []
      const params: any[] = []
      let paramCount = 0

      if (data.objective_title !== undefined) {
        paramCount++
        updates.push(`objective_title = $${paramCount}`)
        params.push(data.objective_title)
      }

      if (data.objective_description !== undefined) {
        paramCount++
        updates.push(`objective_description = $${paramCount}`)
        params.push(data.objective_description)
      }

      if (data.objective_category !== undefined) {
        paramCount++
        updates.push(`objective_category = $${paramCount}`)
        params.push(data.objective_category)
      }

      if (data.okr_period !== undefined) {
        paramCount++
        updates.push(`okr_period = $${paramCount}`)
        params.push(data.okr_period)
      }

      if (data.period_start !== undefined) {
        paramCount++
        updates.push(`period_start = $${paramCount}`)
        params.push(data.period_start ? new Date(data.period_start) : null)
      }

      if (data.period_end !== undefined) {
        paramCount++
        updates.push(`period_end = $${paramCount}`)
        params.push(data.period_end ? new Date(data.period_end) : null)
      }

      if (data.owner_id !== undefined) {
        paramCount++
        updates.push(`owner_id = $${paramCount}`)
        params.push(data.owner_id)
      }

      if (data.owner_name !== undefined) {
        paramCount++
        updates.push(`owner_name = $${paramCount}`)
        params.push(data.owner_name)
      }

      if (data.owner_role !== undefined) {
        paramCount++
        updates.push(`owner_role = $${paramCount}`)
        params.push(data.owner_role)
      }

      if (data.confidence_level !== undefined) {
        paramCount++
        updates.push(`confidence_level = $${paramCount}`)
        params.push(data.confidence_level)
      }

      if (data.progress_percentage !== undefined) {
        paramCount++
        updates.push(`progress_percentage = $${paramCount}`)
        params.push(data.progress_percentage)
      }

      if (data.status !== undefined) {
        paramCount++
        updates.push(`status = $${paramCount}`)
        params.push(data.status)
      }

      if (data.is_stretch_goal !== undefined) {
        paramCount++
        updates.push(`is_stretch_goal = $${paramCount}`)
        params.push(data.is_stretch_goal)
      }

      if (data.priority !== undefined) {
        paramCount++
        updates.push(`priority = $${paramCount}`)
        params.push(data.priority)
      }

      if (updates.length === 0) {
        return await this.getOKRById(id)
      }

      paramCount++
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      params.push(id)

      const result = await pool.query(
        `UPDATE portfolio_okrs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      )

      if (result.rows.length === 0) {
        return null
      }

      // Recalculate progress from key results
      await this.recalculateOKRProgress(id)

      return result.rows[0] as OKR
    } catch (error) {
      logger.error('updateOKR error', { error })
      throw error
    }
  }

  /**
   * Delete an OKR (cascades to key results)
   */
  async deleteOKR(id: string, userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM portfolio_okrs WHERE id = $1 RETURNING id',
        [id]
      )

      return result.rows.length > 0
    } catch (error) {
      logger.error('deleteOKR error', { error })
      throw error
    }
  }

  /**
   * Recalculate OKR progress from key results
   */
  async recalculateOKRProgress(okrId: string): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT calculate_okr_progress($1) as avg_progress`,
        [okrId]
      )

      const avgProgress = parseFloat(result.rows[0]?.avg_progress || '0')

      await pool.query(
        `UPDATE portfolio_okrs 
         SET progress_percentage = $1,
             status = CASE
               WHEN $1 >= 100 THEN 'achieved'
               WHEN $1 >= 70 THEN 'on-track'
               WHEN $1 >= 40 THEN 'at-risk'
               ELSE 'behind'
             END
         WHERE id = $2`,
        [avgProgress, okrId]
      )
    } catch (error) {
      logger.error('recalculateOKRProgress error', { error })
      throw error
    }
  }

  /**
   * Get key results by OKR ID(s)
   */
  async getKeyResultsByOKRIds(okrIds: string[]): Promise<KeyResult[]> {
    try {
      if (okrIds.length === 0) {
        return []
      }

      const result = await pool.query(
        `SELECT * FROM portfolio_key_results 
         WHERE okr_id = ANY($1::uuid[])
         ORDER BY created_at ASC`,
        [okrIds]
      )

      return result.rows as KeyResult[]
    } catch (error) {
      logger.error('getKeyResultsByOKRIds error', { error })
      throw error
    }
  }

  /**
   * Get key results for a single OKR
   */
  async getKeyResults(okrId: string): Promise<KeyResult[]> {
    try {
      return await this.getKeyResultsByOKRIds([okrId])
    } catch (error) {
      logger.error('getKeyResults error', { error })
      throw error
    }
  }

  /**
   * Get a single key result by ID
   */
  async getKeyResultById(id: string): Promise<KeyResult | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM portfolio_key_results WHERE id = $1',
        [id]
      )

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0] as KeyResult
    } catch (error) {
      logger.error('getKeyResultById error', { error })
      throw error
    }
  }

  /**
   * Create a new key result
   */
  async createKeyResult(data: CreateKeyResultInput, userId: string): Promise<KeyResult> {
    try {
      const id = uuidv4()

      const result = await pool.query(
        `INSERT INTO portfolio_key_results (
          id, okr_id,
          key_result_title, key_result_description,
          metric_name, metric_unit,
          baseline_value, target_value, current_value, stretch_target,
          measurement_frequency, next_measurement_date,
          owner_id, contributing_projects
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *`,
        [
          id,
          data.okr_id,
          data.key_result_title,
          data.key_result_description || null,
          data.metric_name || null,
          data.metric_unit || null,
          data.baseline_value || null,
          data.target_value,
          data.current_value || 0,
          data.stretch_target || null,
          data.measurement_frequency || null,
          data.next_measurement_date ? new Date(data.next_measurement_date) : null,
          data.owner_id || null,
          data.contributing_projects || null,
        ]
      )

      const keyResult = result.rows[0] as KeyResult

      // Recalculate OKR progress
      await this.recalculateOKRProgress(data.okr_id)

      return keyResult
    } catch (error) {
      logger.error('createKeyResult error', { error })
      throw error
    }
  }

  /**
   * Update a key result
   */
  async updateKeyResult(id: string, data: UpdateKeyResultInput, userId: string): Promise<KeyResult | null> {
    try {
      const updates: string[] = []
      const params: any[] = []
      let paramCount = 0

      if (data.key_result_title !== undefined) {
        paramCount++
        updates.push(`key_result_title = $${paramCount}`)
        params.push(data.key_result_title)
      }

      if (data.key_result_description !== undefined) {
        paramCount++
        updates.push(`key_result_description = $${paramCount}`)
        params.push(data.key_result_description)
      }

      if (data.metric_name !== undefined) {
        paramCount++
        updates.push(`metric_name = $${paramCount}`)
        params.push(data.metric_name)
      }

      if (data.metric_unit !== undefined) {
        paramCount++
        updates.push(`metric_unit = $${paramCount}`)
        params.push(data.metric_unit)
      }

      if (data.baseline_value !== undefined) {
        paramCount++
        updates.push(`baseline_value = $${paramCount}`)
        params.push(data.baseline_value)
      }

      if (data.target_value !== undefined) {
        paramCount++
        updates.push(`target_value = $${paramCount}`)
        params.push(data.target_value)
      }

      if (data.current_value !== undefined) {
        paramCount++
        updates.push(`current_value = $${paramCount}`)
        params.push(data.current_value)
      }

      if (data.stretch_target !== undefined) {
        paramCount++
        updates.push(`stretch_target = $${paramCount}`)
        params.push(data.stretch_target)
      }

      if (data.measurement_frequency !== undefined) {
        paramCount++
        updates.push(`measurement_frequency = $${paramCount}`)
        params.push(data.measurement_frequency)
      }

      if (data.next_measurement_date !== undefined) {
        paramCount++
        updates.push(`next_measurement_date = $${paramCount}`)
        params.push(data.next_measurement_date ? new Date(data.next_measurement_date) : null)
      }

      if (data.owner_id !== undefined) {
        paramCount++
        updates.push(`owner_id = $${paramCount}`)
        params.push(data.owner_id)
      }

      if (data.contributing_projects !== undefined) {
        paramCount++
        updates.push(`contributing_projects = $${paramCount}`)
        params.push(data.contributing_projects)
      }

      if (updates.length === 0) {
        return await this.getKeyResultById(id)
      }

      // Update last_measured_at if current_value changed
      if (data.current_value !== undefined) {
        // CURRENT_TIMESTAMP is a SQL function, not a parameter, so don't increment paramCount
        updates.push(`last_measured_at = CURRENT_TIMESTAMP`)
      }

      // updated_at is also a SQL function, not a parameter
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      paramCount++
      params.push(id)

      const result = await pool.query(
        `UPDATE portfolio_key_results SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      )

      if (result.rows.length === 0) {
        return null
      }

      const keyResult = result.rows[0] as KeyResult

      // Recalculate OKR progress
      await this.recalculateOKRProgress(keyResult.okr_id)

      return keyResult
    } catch (error) {
      logger.error('updateKeyResult error', { error })
      throw error
    }
  }

  /**
   * Delete a key result
   */
  async deleteKeyResult(id: string, userId: string): Promise<boolean> {
    try {
      // Get OKR ID before deletion for progress recalculation
      const krResult = await pool.query(
        'SELECT okr_id FROM portfolio_key_results WHERE id = $1',
        [id]
      )

      if (krResult.rows.length === 0) {
        return false
      }

      const okrId = krResult.rows[0].okr_id

      const result = await pool.query(
        'DELETE FROM portfolio_key_results WHERE id = $1 RETURNING id',
        [id]
      )

      if (result.rows.length > 0) {
        // Recalculate OKR progress
        await this.recalculateOKRProgress(okrId)
        return true
      }

      return false
    } catch (error) {
      logger.error('deleteKeyResult error', { error })
      throw error
    }
  }
}

export default new OKRService()

