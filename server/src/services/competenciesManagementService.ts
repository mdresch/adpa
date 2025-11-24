/**
 * Competencies Management Service
 * 
 * Manages normalized competencies catalog and assignments to roles and stakeholders
 * 
 * Features:
 * - CRUD operations for competencies
 * - Assign competencies to roles with required levels
 * - Assign competencies to stakeholders with proficiency levels
 * - Get competencies for roles and stakeholders
 * 
 * Migration: 209_stakeholder_role_skills_integration.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface Competency {
  id: string
  name: string
  description?: string
  category?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateCompetencyInput {
  name: string
  description?: string
  category?: string
}

export interface RoleCompetency {
  id: string
  roleId: string
  competencyId: string
  competencyName?: string
  requiredLevel: string
  isRequired: boolean
  createdAt?: Date
}

export interface StakeholderCompetency {
  id: string
  stakeholderId: string
  competencyId: string
  competencyName?: string
  proficiencyLevel: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: Date
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create a new competency
 */
export async function createCompetency(
  input: CreateCompetencyInput,
  userId?: string
): Promise<Competency> {
  try {
    const result = await pool.query(
      `INSERT INTO competencies (name, description, category)
       VALUES ($1, $2, $3)
       RETURNING 
         id,
         name,
         description,
         category,
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        input.name,
        input.description || null,
        input.category || null
      ]
    )

    const competency = result.rows[0]

    logger.info('Competency created', {
      competencyId: competency.id,
      name: input.name,
      category: input.category
    })

    return competency
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      throw new Error(`Competency with name "${input.name}" already exists`)
    }
    logger.error('createCompetency error', { error, input })
    throw error
  }
}

/**
 * Get all competencies, optionally filtered by category
 */
export async function getAllCompetencies(category?: string): Promise<Competency[]> {
  try {
    const query = category
      ? `SELECT 
           id,
           name,
           description,
           category,
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM competencies
         WHERE category = $1
         ORDER BY name ASC`
      : `SELECT 
           id,
           name,
           description,
           category,
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM competencies
         ORDER BY name ASC`

    const result = await pool.query(query, category ? [category] : [])

    return result.rows
  } catch (error) {
    logger.error('getAllCompetencies error', { error, category })
    throw error
  }
}

/**
 * Get competency by ID
 */
export async function getCompetencyById(id: string): Promise<Competency | null> {
  try {
    const result = await pool.query(
      `SELECT 
         id,
         name,
         description,
         category,
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM competencies
       WHERE id = $1`,
      [id]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('getCompetencyById error', { error, id })
    throw error
  }
}

/**
 * Update competency
 */
export async function updateCompetency(
  id: string,
  updates: Partial<CreateCompetencyInput>
): Promise<Competency | null> {
  try {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`)
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`)
      values.push(updates.description)
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`)
      values.push(updates.category)
    }

    if (setClauses.length === 0) {
      return getCompetencyById(id)
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE competencies 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        name,
        description,
        category,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    const result = await pool.query(query, values)

    logger.info('Competency updated', { competencyId: id, updates })

    return result.rows[0] || null
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error(`Competency with name "${updates.name}" already exists`)
    }
    logger.error('updateCompetency error', { error, id, updates })
    throw error
  }
}

/**
 * Delete competency
 */
export async function deleteCompetency(id: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM competencies WHERE id = $1`,
      [id]
    )

    logger.info('Competency deleted', { competencyId: id })

    return result.rowCount > 0
  } catch (error: any) {
    if (error.code === '23503') { // Foreign key violation
      throw new Error('Cannot delete competency: it is assigned to roles or stakeholders')
    }
    logger.error('deleteCompetency error', { error, id })
    throw error
  }
}

/**
 * Assign competency to role
 */
export async function assignCompetencyToRole(
  roleId: string,
  competencyId: string,
  requiredLevel: string = 'intermediate',
  isRequired: boolean = true
): Promise<RoleCompetency> {
  try {
    const result = await pool.query(
      `INSERT INTO role_competencies (role_id, competency_id, required_level, is_required)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (role_id, competency_id) 
       DO UPDATE SET 
         required_level = EXCLUDED.required_level,
         is_required = EXCLUDED.is_required
       RETURNING 
         id,
         role_id as "roleId",
         competency_id as "competencyId",
         required_level as "requiredLevel",
         is_required as "isRequired",
         created_at as "createdAt"`,
      [roleId, competencyId, requiredLevel, isRequired]
    )

    const roleCompetency = result.rows[0]

    logger.info('Competency assigned to role', {
      roleId,
      competencyId,
      requiredLevel,
      isRequired
    })

    return roleCompetency
  } catch (error) {
    logger.error('assignCompetencyToRole error', { error, roleId, competencyId })
    throw error
  }
}

/**
 * Assign competency to stakeholder
 */
export async function assignCompetencyToStakeholder(
  stakeholderId: string,
  competencyId: string,
  proficiencyLevel: string = 'intermediate',
  options?: {
    verified?: boolean
    verifiedBy?: string
    notes?: string
  }
): Promise<StakeholderCompetency> {
  try {
    const verified = options?.verified || false
    const verifiedAt = verified && options?.verifiedBy ? new Date() : null

    const result = await pool.query(
      `INSERT INTO stakeholder_competencies (
         stakeholder_id, 
         competency_id, 
         proficiency_level,
         verified,
         verified_by,
         verified_at,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stakeholder_id, competency_id) 
       DO UPDATE SET 
         proficiency_level = EXCLUDED.proficiency_level,
         verified = EXCLUDED.verified,
         verified_by = EXCLUDED.verified_by,
         verified_at = EXCLUDED.verified_at,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING 
         id,
         stakeholder_id as "stakeholderId",
         competency_id as "competencyId",
         proficiency_level as "proficiencyLevel",
         verified,
         verified_by as "verifiedBy",
         verified_at as "verifiedAt",
         notes,
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        stakeholderId,
        competencyId,
        proficiencyLevel,
        verified,
        options?.verifiedBy || null,
        verifiedAt,
        options?.notes || null
      ]
    )

    const stakeholderCompetency = result.rows[0]

    logger.info('Competency assigned to stakeholder', {
      stakeholderId,
      competencyId,
      proficiencyLevel,
      verified
    })

    return stakeholderCompetency
  } catch (error) {
    logger.error('assignCompetencyToStakeholder error', { error, stakeholderId, competencyId })
    throw error
  }
}

/**
 * Get competencies for a role
 */
export async function getRoleCompetencies(roleId: string): Promise<RoleCompetency[]> {
  try {
    const result = await pool.query(
      `SELECT 
         rc.id,
         rc.role_id as "roleId",
         rc.competency_id as "competencyId",
         c.name as "competencyName",
         rc.required_level as "requiredLevel",
         rc.is_required as "isRequired",
         rc.created_at as "createdAt"
       FROM role_competencies rc
       INNER JOIN competencies c ON rc.competency_id = c.id
       WHERE rc.role_id = $1
       ORDER BY rc.is_required DESC, c.name ASC`,
      [roleId]
    )

    return result.rows
  } catch (error) {
    logger.error('getRoleCompetencies error', { error, roleId })
    throw error
  }
}

/**
 * Get competencies for a stakeholder
 */
export async function getStakeholderCompetencies(stakeholderId: string): Promise<StakeholderCompetency[]> {
  try {
    const result = await pool.query(
      `SELECT 
         sc.id,
         sc.stakeholder_id as "stakeholderId",
         sc.competency_id as "competencyId",
         c.name as "competencyName",
         sc.proficiency_level as "proficiencyLevel",
         sc.verified,
         sc.verified_by as "verifiedBy",
         sc.verified_at as "verifiedAt",
         sc.notes,
         sc.created_at as "createdAt",
         sc.updated_at as "updatedAt"
       FROM stakeholder_competencies sc
       INNER JOIN competencies c ON sc.competency_id = c.id
       WHERE sc.stakeholder_id = $1
       ORDER BY c.name ASC`,
      [stakeholderId]
    )

    return result.rows
  } catch (error) {
    logger.error('getStakeholderCompetencies error', { error, stakeholderId })
    throw error
  }
}

/**
 * Remove competency from role
 */
export async function removeCompetencyFromRole(roleId: string, competencyId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM role_competencies 
       WHERE role_id = $1 AND competency_id = $2`,
      [roleId, competencyId]
    )

    logger.info('Competency removed from role', { roleId, competencyId })

    return result.rowCount > 0
  } catch (error) {
    logger.error('removeCompetencyFromRole error', { error, roleId, competencyId })
    throw error
  }
}

/**
 * Remove competency from stakeholder
 */
export async function removeCompetencyFromStakeholder(stakeholderId: string, competencyId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM stakeholder_competencies 
       WHERE stakeholder_id = $1 AND competency_id = $2`,
      [stakeholderId, competencyId]
    )

    logger.info('Competency removed from stakeholder', { stakeholderId, competencyId })

    return result.rowCount > 0
  } catch (error) {
    logger.error('removeCompetencyFromStakeholder error', { error, stakeholderId, competencyId })
    throw error
  }
}

