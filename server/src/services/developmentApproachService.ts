/**
 * Development Approach Service
 * Business logic for Development Approach CRUD operations
 * 
 * Note: This is a project-level entity (ONE record per project)
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { validate as isUuid } from 'uuid'
import type { DevelopmentApproach, TailoringDecision } from './extraction/entities/development_approaches/types'

export interface DevelopmentApproachRecord extends DevelopmentApproach {
  id: string
  project_id: string
  created_at: Date
  updated_at: Date
  defined_by?: string
  approved_by?: string | null
  effective_date?: Date | null
  defined_by_name?: string | null
  approved_by_name?: string | null
}

export interface CreateDevelopmentApproachInput {
  project_id: string
  approach: 'predictive' | 'adaptive' | 'hybrid' | 'incremental' | 'iterative'
  methodology?: 'waterfall' | 'scrum' | 'kanban' | 'lean' | 'safe' | 'prince2' | 'custom' | null
  justification: string
  uncertainty_level?: 'low' | 'medium' | 'high' | null
  requirements_stability?: 'stable' | 'evolving' | 'uncertain' | null
  stakeholder_engagement_model?: string | null
  delivery_cadence?: 'single' | 'iterative' | 'incremental' | 'continuous' | null
  organizational_maturity?: 'low' | 'medium' | 'high' | null
  team_experience_level?: 'junior' | 'mixed' | 'senior' | null
  regulatory_constraints?: boolean | null
  tailoring_decisions?: TailoringDecision[]
  life_cycle_phases?: string[]
  iteration_length?: number | null
  iteration_unit?: 'days' | 'weeks' | null
  governance_approach?: 'lightweight' | 'standard' | 'formal' | null
  review_gates?: string[]
  source_document_id?: string | null
  approved_by?: string | null
  effective_date?: Date | string | null
}

export interface UpdateDevelopmentApproachInput {
  approach?: 'predictive' | 'adaptive' | 'hybrid' | 'incremental' | 'iterative'
  methodology?: 'waterfall' | 'scrum' | 'kanban' | 'lean' | 'safe' | 'prince2' | 'custom' | null
  justification?: string
  uncertainty_level?: 'low' | 'medium' | 'high' | null
  requirements_stability?: 'stable' | 'evolving' | 'uncertain' | null
  stakeholder_engagement_model?: string | null
  delivery_cadence?: 'single' | 'iterative' | 'incremental' | 'continuous' | null
  organizational_maturity?: 'low' | 'medium' | 'high' | null
  team_experience_level?: 'junior' | 'mixed' | 'senior' | null
  regulatory_constraints?: boolean | null
  tailoring_decisions?: TailoringDecision[]
  life_cycle_phases?: string[]
  iteration_length?: number | null
  iteration_unit?: 'days' | 'weeks' | null
  governance_approach?: 'lightweight' | 'standard' | 'formal' | null
  review_gates?: string[]
  source_document_id?: string | null
  approved_by?: string | null
  effective_date?: Date | string | null
}

class DevelopmentApproachService {
  /**
   * Get development approach for a project (one record per project)
   */
  async getByProject(projectId: string): Promise<DevelopmentApproachRecord | null> {
    try {
      if (!isUuid(projectId)) {
        throw new Error('Invalid project ID format')
      }

      const result = await pool.query(
        `
        SELECT 
          da.id,
          da.project_id,
          da.approach,
          da.methodology,
          da.justification,
          da.uncertainty_level,
          da.requirements_stability,
          da.stakeholder_engagement_model,
          da.delivery_cadence,
          da.organizational_maturity,
          da.team_experience_level,
          da.regulatory_constraints,
          da.tailoring_decisions,
          da.life_cycle_phases,
          da.iteration_length,
          da.iteration_unit,
          da.governance_approach,
          da.review_gates,
          da.source_document_id,
          da.defined_by,
          da.approved_by,
          da.effective_date,
          da.created_at,
          da.updated_at,
          u_defined.name as defined_by_name,
          u_approved.name as approved_by_name
        FROM development_approach da
        LEFT JOIN users u_defined ON da.defined_by = u_defined.id
        LEFT JOIN users u_approved ON da.approved_by = u_approved.id
        WHERE da.project_id = $1
        `,
        [projectId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToRecord(result.rows[0])
    } catch (error) {
      logger.error('[DEVELOPMENT-APPROACH-SERVICE] Error getting development approach by project', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Create or update development approach (UPSERT - one per project)
   */
  async createOrUpdate(
    projectId: string,
    input: CreateDevelopmentApproachInput | UpdateDevelopmentApproachInput,
    userId: string
  ): Promise<DevelopmentApproachRecord> {
    try {
      if (!isUuid(projectId)) {
        throw new Error('Invalid project ID format')
      }

      if (!isUuid(userId)) {
        throw new Error('Invalid user ID format')
      }

      // Verify project exists
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1',
        [projectId]
      )

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found')
      }

      // Prepare values for UPSERT
      const tailoringDecisionsJson = input.tailoring_decisions && input.tailoring_decisions.length > 0
        ? JSON.stringify(input.tailoring_decisions)
        : '[]'

      const lifeCyclePhasesArray = input.life_cycle_phases || []
      const reviewGatesArray = input.review_gates || []

      const effectiveDate = input.effective_date
        ? (typeof input.effective_date === 'string' ? new Date(input.effective_date) : input.effective_date)
        : null

      // Determine required fields - for create, approach and justification are required
      const isCreate = 'approach' in input && input.approach !== undefined
      if (isCreate && (!input.approach || !input.justification)) {
        throw new Error('Approach and justification are required')
      }

      // Check existing record to determine if we're updating
      const existing = await this.getByProject(projectId)
      
      // For update, use existing values where not provided; for create, use provided or defaults
      const approach = input.approach ?? existing?.approach ?? null
      const methodology = input.methodology !== undefined ? input.methodology : existing?.methodology ?? null
      const justification = input.justification ?? existing?.justification ?? 'No justification provided'

      if (!approach || !justification) {
        throw new Error('Approach and justification are required')
      }

      // Use UPSERT pattern (ON CONFLICT) like the extraction service
      await pool.query(
        `
        INSERT INTO development_approach (
          project_id, approach, methodology, justification,
          uncertainty_level, requirements_stability, stakeholder_engagement_model, delivery_cadence,
          organizational_maturity, team_experience_level, regulatory_constraints,
          tailoring_decisions, life_cycle_phases, iteration_length, iteration_unit,
          governance_approach, review_gates,
          source_document_id, defined_by, approved_by, effective_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (project_id) DO UPDATE SET
          approach = EXCLUDED.approach,
          methodology = EXCLUDED.methodology,
          justification = EXCLUDED.justification,
          uncertainty_level = COALESCE(EXCLUDED.uncertainty_level, development_approach.uncertainty_level),
          requirements_stability = COALESCE(EXCLUDED.requirements_stability, development_approach.requirements_stability),
          stakeholder_engagement_model = COALESCE(EXCLUDED.stakeholder_engagement_model, development_approach.stakeholder_engagement_model),
          delivery_cadence = COALESCE(EXCLUDED.delivery_cadence, development_approach.delivery_cadence),
          organizational_maturity = COALESCE(EXCLUDED.organizational_maturity, development_approach.organizational_maturity),
          team_experience_level = COALESCE(EXCLUDED.team_experience_level, development_approach.team_experience_level),
          regulatory_constraints = COALESCE(EXCLUDED.regulatory_constraints, development_approach.regulatory_constraints),
          tailoring_decisions = COALESCE(EXCLUDED.tailoring_decisions, development_approach.tailoring_decisions),
          life_cycle_phases = COALESCE(EXCLUDED.life_cycle_phases, development_approach.life_cycle_phases),
          iteration_length = COALESCE(EXCLUDED.iteration_length, development_approach.iteration_length),
          iteration_unit = COALESCE(EXCLUDED.iteration_unit, development_approach.iteration_unit),
          governance_approach = COALESCE(EXCLUDED.governance_approach, development_approach.governance_approach),
          review_gates = COALESCE(EXCLUDED.review_gates, development_approach.review_gates),
          source_document_id = COALESCE(EXCLUDED.source_document_id, development_approach.source_document_id),
          approved_by = COALESCE(EXCLUDED.approved_by, development_approach.approved_by),
          effective_date = COALESCE(EXCLUDED.effective_date, development_approach.effective_date),
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          projectId,
          approach,
          methodology,
          justification,
          input.uncertainty_level ?? existing?.uncertainty_level ?? null,
          input.requirements_stability ?? existing?.requirements_stability ?? null,
          input.stakeholder_engagement_model ?? existing?.stakeholder_engagement_model ?? null,
          input.delivery_cadence ?? existing?.delivery_cadence ?? null,
          input.organizational_maturity ?? existing?.organizational_maturity ?? null,
          input.team_experience_level ?? existing?.team_experience_level ?? null,
          input.regulatory_constraints ?? existing?.regulatory_constraints ?? false,
          tailoringDecisionsJson,
          lifeCyclePhasesArray,
          input.iteration_length ?? existing?.iteration_length ?? null,
          input.iteration_unit ?? existing?.iteration_unit ?? null,
          input.governance_approach ?? existing?.governance_approach ?? null,
          reviewGatesArray,
          input.source_document_id ?? existing?.source_document_id ?? null,
          existing?.defined_by ?? userId, // Keep existing defined_by or set to current user
          input.approved_by ?? existing?.approved_by ?? null,
          effectiveDate ?? existing?.effective_date ?? null
        ]
      )

      // Fetch the complete record with user names
      const updated = await this.getByProject(projectId)
      if (!updated) {
        throw new Error('Failed to retrieve created/updated development approach')
      }

      logger.info('[DEVELOPMENT-APPROACH-SERVICE] Development approach saved', {
        projectId,
        approach: updated.approach,
        methodology: updated.methodology
      })

      return updated
    } catch (error) {
      logger.error('[DEVELOPMENT-APPROACH-SERVICE] Error creating/updating development approach', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Get tailoring decisions for a project
   */
  async getTailoringDecisions(projectId: string): Promise<TailoringDecision[]> {
    try {
      const approach = await this.getByProject(projectId)
      if (!approach || !approach.tailoring_decisions) {
        return []
      }
      return approach.tailoring_decisions
    } catch (error) {
      logger.error('[DEVELOPMENT-APPROACH-SERVICE] Error getting tailoring decisions', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Map database row to DevelopmentApproachRecord
   */
  private mapRowToRecord(row: any): DevelopmentApproachRecord {
    return {
      id: row.id,
      project_id: row.project_id,
      approach: row.approach,
      methodology: row.methodology,
      justification: row.justification,
      uncertainty_level: row.uncertainty_level,
      requirements_stability: row.requirements_stability,
      stakeholder_engagement_model: row.stakeholder_engagement_model,
      delivery_cadence: row.delivery_cadence,
      organizational_maturity: row.organizational_maturity,
      team_experience_level: row.team_experience_level,
      regulatory_constraints: row.regulatory_constraints ?? false,
      tailoring_decisions: Array.isArray(row.tailoring_decisions)
        ? row.tailoring_decisions
        : (typeof row.tailoring_decisions === 'string'
            ? JSON.parse(row.tailoring_decisions)
            : []),
      life_cycle_phases: Array.isArray(row.life_cycle_phases) ? row.life_cycle_phases : [],
      iteration_length: row.iteration_length,
      iteration_unit: row.iteration_unit,
      governance_approach: row.governance_approach,
      review_gates: Array.isArray(row.review_gates) ? row.review_gates : [],
      source_document_id: row.source_document_id,
      defined_by: row.defined_by,
      approved_by: row.approved_by,
      effective_date: row.effective_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      defined_by_name: row.defined_by_name,
      approved_by_name: row.approved_by_name
    }
  }
}

export default new DevelopmentApproachService()

