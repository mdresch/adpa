/**
 * Development Approach Service
 * Purpose: Manage project-level development approach metadata for PMBOK 8 Domain 3 compliance
 * Domain: Development Approach & Life Cycle Performance Domain
 * Created: January 15, 2026
 */

import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { DevelopmentApproach } from './types';
import { validateDevelopmentApproach } from './validation';

/**
 * Get development approach for a project
 */
export async function getDevelopmentApproach(projectId: string): Promise<DevelopmentApproach | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM development_approach WHERE project_id = $1',
      [projectId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('[DEV_APPROACH] Failed to get development approach:', error);
    throw new Error('Failed to retrieve development approach');
  }
}

/**
 * Create or update development approach for a project
 */
export async function upsertDevelopmentApproach(
  projectId: string,
  approachData: Partial<DevelopmentApproach>,
  userId: string
): Promise<DevelopmentApproach> {
  try {
    // Validate input
    const validatedData = validateDevelopmentApproach(approachData);
    
    // Set metadata
    const now = new Date();
    const data = {
      ...validatedData,
      project_id: projectId,
      defined_by: userId,
      approved_by: userId, // Default to same user, can be updated later
      effective_date: validatedData.effective_date || now,
      created_at: now,
      updated_at: now
    };
    
    // Use INSERT ... ON CONFLICT DO UPDATE for upsert
    const result = await pool.query(
      `
      INSERT INTO development_approach (
        id, project_id, approach, methodology, justification,
        uncertainty_level, requirements_stability, stakeholder_engagement_model,
        delivery_cadence, organizational_maturity, team_experience_level,
        regulatory_constraints, tailoring_decisions, life_cycle_phases,
        iteration_length, iteration_unit, governance_approach, review_gates,
        source_document_id, defined_by, approved_by, effective_date,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24
      )
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
        source_document_id = EXCLUDED.source_document_id,
        defined_by = EXCLUDED.defined_by,
        approved_by = EXCLUDED.approved_by,
        effective_date = EXCLUDED.effective_date,
        updated_at = EXCLUDED.updated_at
      RETURNING *
      `,
      [
        approachData.id || require('crypto').randomUUID(),
        projectId,
        data.approach,
        data.methodology,
        data.justification,
        data.uncertainty_level,
        data.requirements_stability,
        data.stakeholder_engagement_model,
        data.delivery_cadence,
        data.organizational_maturity,
        data.team_experience_level,
        data.regulatory_constraints,
        data.tailoring_decisions,
        data.life_cycle_phases,
        data.iteration_length,
        data.iteration_unit,
        data.governance_approach,
        data.review_gates,
        data.source_document_id,
        data.defined_by,
        data.approved_by,
        data.effective_date,
        data.created_at,
        data.updated_at
      ]
    );
    
    const createdApproach = result.rows[0];
    
    // Update project table with development_approach_id for quick access
    await pool.query(
      'UPDATE projects SET development_approach_id = $1 WHERE id = $2',
      [createdApproach.id, projectId]
    );
    
    logger.info('[DEV_APPROACH] Development approach created/updated', {
      projectId,
      approach: createdApproach.approach,
      methodology: createdApproach.methodology
    });
    
    return createdApproach;
  } catch (error) {
    logger.error('[DEV_APPROACH] Failed to upsert development approach:', error);
    throw new Error('Failed to save development approach');
  }
}

/**
 * Delete development approach for a project
 */
export async function deleteDevelopmentApproach(projectId: string): Promise<void> {
  try {
    await pool.query('DELETE FROM development_approach WHERE project_id = $1', [projectId]);
    
    // Clear reference in projects table
    await pool.query(
      'UPDATE projects SET development_approach_id = NULL WHERE id = $1',
      [projectId]
    );
    
    logger.info('[DEV_APPROACH] Development approach deleted', { projectId });
  } catch (error) {
    logger.error('[DEV_APPROACH] Failed to delete development approach:', error);
    throw new Error('Failed to delete development approach');
  }
}

/**
 * Get development approach by ID
 */
export async function getDevelopmentApproachById(id: string): Promise<DevelopmentApproach | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM development_approach WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('[DEV_APPROACH] Failed to get development approach by ID:', error);
    throw new Error('Failed to retrieve development approach');
  }
}

/**
 * List development approaches across projects (for analytics)
 */
export async function listDevelopmentApproaches(
  filters?: {
    approach?: string;
    methodology?: string;
    limit?: number;
    offset?: number;
  }
): Promise<DevelopmentApproach[]> {
  try {
    let query = 'SELECT * FROM development_approach WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;
    
    if (filters?.approach) {
      query += ` AND approach = $${paramCount++}`;
      params.push(filters.approach);
    }
    
    if (filters?.methodology) {
      query += ` AND methodology = $${paramCount++}`;
      params.push(filters.methodology);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    if (filters?.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(filters.limit);
    }
    
    if (filters?.offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(filters.offset);
    }
    
    const result = await pool.query(query, params);
    
    return result.rows;
  } catch (error) {
    logger.error('[DEV_APPROACH] Failed to list development approaches:', error);
    throw new Error('Failed to list development approaches');
  }
}

/**
 * Get statistics on development approach usage
 */
export async function getDevelopmentApproachStatistics(): Promise<{
  byApproach: Record<string, number>;
  byMethodology: Record<string, number>;
  totalProjects: number;
  projectsWithApproach: number;
}> {
  try {
    // Count by approach
    const approachResult = await pool.query(
      'SELECT approach, COUNT(*) as count FROM development_approach GROUP BY approach'
    );
    
    // Count by methodology
    const methodologyResult = await pool.query(
      'SELECT methodology, COUNT(*) as count FROM development_approach GROUP BY methodology'
    );
    
    // Total projects
    const totalProjectsResult = await pool.query('SELECT COUNT(*) as count FROM projects');
    
    // Projects with development approach
    const projectsWithApproachResult = await pool.query(
      'SELECT COUNT(*) as count FROM development_approach'
    );
    
    return {
      byApproach: approachResult.rows.reduce((acc, row) => {
        acc[row.approach] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>),
      byMethodology: methodologyResult.rows.reduce((acc, row) => {
        acc[row.methodology] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>),
      totalProjects: parseInt(totalProjectsResult.rows[0].count),
      projectsWithApproach: parseInt(projectsWithApproachResult.rows[0].count)
    };
  } catch (error) {
    logger.error('[DEV_APPROACH] Failed to get statistics:', error);
    throw new Error('Failed to retrieve statistics');
  }
}