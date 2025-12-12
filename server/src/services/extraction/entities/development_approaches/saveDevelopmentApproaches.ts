/**
 * Save Development Approaches
 * 
 * Persists project-level development approach metadata (ONE record per project).
 * Uses UPSERT on project_id to ensure one record per project.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeEnum } from '../../base/Persistence'
import type { DevelopmentApproach } from './types'

/**
 * Ensure value is a string array
 * Handles arrays, comma/semicolon/pipe-separated strings, and single strings
 */
function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : String(item ?? '')).trim())
      .filter(item => item.length > 0)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('|')) {
      return trimmed
        .split(/[,;|]/)
        .map(part => part.trim())
        .filter(part => part.length > 0)
    }
    return [trimmed]
  }

  return []
}

/**
 * Save development approach to database
 * This is project-level metadata - ONE record per project (UPSERT)
 */
export async function saveDevelopmentApproaches(
  client: PoolClient,
  projectId: string,
  userId: string,
  developmentApproaches: DevelopmentApproach[]
): Promise<PersistenceResult> {
  if (developmentApproaches.length === 0) {
    logger.info('[EXTRACTION] No development_approach to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // TASK-90: This is project-level metadata - take the first (and should be only) approach
    const approach = developmentApproaches[0]

    // Normalize approach values
    const allowedApproaches = new Set(['predictive', 'adaptive', 'hybrid', 'incremental', 'iterative'])
    const rawApproach = (approach.approach || 'hybrid').toString().toLowerCase()
    const normalizedApproach = allowedApproaches.has(rawApproach) ? rawApproach : 'hybrid'

    // Normalize methodology
    const allowedMethodologies = new Set(['waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom'])
    const rawMethodology = (approach.methodology || approach.framework || '').toString().toLowerCase()
    const normalizedMethodology = allowedMethodologies.has(rawMethodology) ? rawMethodology : null

    // Normalize other enum fields
    const uncertaintyLevel = normalizeEnum(
      approach.uncertainty_level,
      new Set(['low', 'medium', 'high']),
      null
    )

    const requirementsStability = normalizeEnum(
      approach.requirements_stability,
      new Set(['stable', 'evolving', 'uncertain']),
      null
    )

    const deliveryCadence = normalizeEnum(
      approach.delivery_cadence,
      new Set(['single', 'iterative', 'incremental', 'continuous']),
      null
    )

    const organizationalMaturity = normalizeEnum(
      approach.organizational_maturity,
      new Set(['low', 'medium', 'high']),
      null
    )

    const teamExperienceLevel = normalizeEnum(
      approach.team_experience_level,
      new Set(['junior', 'mixed', 'senior']),
      null
    )

    const iterationUnit = normalizeEnum(
      approach.iteration_unit,
      new Set(['days', 'weeks']),
      null
    )

    const governanceApproach = normalizeEnum(
      approach.governance_approach,
      new Set(['lightweight', 'standard', 'formal']),
      null
    )

    // Prepare tailoring decisions JSONB
    const tailoringDecisions = Array.isArray(approach.tailoring_decisions) && approach.tailoring_decisions.length > 0
      ? JSON.stringify(approach.tailoring_decisions)
      : '[]'

    // Prepare life cycle phases JSONB
    const lifeCyclePhases = Array.isArray(approach.life_cycle_phases) && approach.life_cycle_phases.length > 0
      ? JSON.stringify(approach.life_cycle_phases)
      : '[]'

    // Prepare review gates JSONB
    const reviewGates = Array.isArray(approach.review_gates) && approach.review_gates.length > 0
      ? JSON.stringify(approach.review_gates)
      : '[]'

    // Calculate iteration_length (convert weeks to days if needed)
    let iterationLength: number | null = null
    if (approach.iteration_length) {
      iterationLength = approach.iteration_length
    } else if (approach.iteration_length_weeks) {
      iterationLength = approach.iteration_length_weeks * 7 // Convert weeks to days
    }

    // Ensure justification is provided
    const justification = approach.justification || approach.tailoring_decisions_text || 'No justification provided'

    // Validate and normalize source_document_id
    const sourceDocumentId = approach.source_document_id || null

    // UPSERT into development_approach table (one per project)
    // Note: Table uses defined_by (not created_by) and has no updated_by column
    // created_at and updated_at are auto-managed by database
    await client.query(
      `INSERT INTO development_approach (
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
        uncertainty_level = EXCLUDED.uncertainty_level,
        requirements_stability = EXCLUDED.requirements_stability,
        stakeholder_engagement_model = EXCLUDED.stakeholder_engagement_model,
        delivery_cadence = EXCLUDED.delivery_cadence,
        organizational_maturity = EXCLUDED.organizational_maturity,
        team_experience_level = EXCLUDED.team_experience_level,
        regulatory_constraints = EXCLUDED.regulatory_constraints,
        tailoring_decisions = EXCLUDED.tailoring_decisions,
        life_cycle_phases = EXCLUDED.life_cycle_phases,
        iteration_length = EXCLUDED.iteration_length,
        iteration_unit = EXCLUDED.iteration_unit,
        governance_approach = EXCLUDED.governance_approach,
        review_gates = EXCLUDED.review_gates,
        source_document_id = COALESCE(EXCLUDED.source_document_id, development_approach.source_document_id),
        defined_by = COALESCE(EXCLUDED.defined_by, development_approach.defined_by),
        approved_by = COALESCE(EXCLUDED.approved_by, development_approach.approved_by),
        effective_date = COALESCE(EXCLUDED.effective_date, development_approach.effective_date),
        updated_at = CURRENT_TIMESTAMP`,
      [
        projectId,
        normalizedApproach,
        normalizedMethodology,
        justification,
        uncertaintyLevel,
        requirementsStability,
        approach.stakeholder_engagement_model || null,
        deliveryCadence,
        organizationalMaturity,
        teamExperienceLevel,
        approach.regulatory_constraints || false,
        tailoringDecisions,
        lifeCyclePhases,
        iterationLength,
        iterationUnit,
        governanceApproach,
        reviewGates,
        sourceDocumentId,
        userId, // defined_by
        null, // approved_by - not extracted, would be set manually
        null  // effective_date - not extracted, would be set manually
      ]
    )

    logger.info(`[EXTRACTION] Saved development approach: ${normalizedApproach} (${normalizedMethodology || 'N/A'}) for project ${projectId}`)

    return {
      saved: 1,
      skipped: developmentApproaches.length > 1 ? developmentApproaches.length - 1 : 0,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-DEVELOPMENT-APPROACHES] Failed to save development approach', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: developmentApproaches.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

