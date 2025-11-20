/**
 * Skills Management Service
 * 
 * Manages normalized skills catalog and assignments to roles and stakeholders
 * 
 * Features:
 * - CRUD operations for skills
 * - Assign skills to roles with proficiency requirements
 * - Assign skills to stakeholders with proficiency levels
 * - Get skills for roles and stakeholders
 * - Calculate skill match between stakeholders and roles
 * 
 * Migration: 209_stakeholder_role_skills_integration.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface Skill {
  id: string
  name: string
  description?: string
  category?: string
  proficiencyLevels?: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateSkillInput {
  name: string
  description?: string
  category?: string
  proficiencyLevels?: string[]
}

export interface RoleSkill {
  id: string
  roleId: string
  skillId: string
  skillName?: string
  requiredProficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  isRequired: boolean
  createdAt?: Date
}

export interface StakeholderSkill {
  id: string
  stakeholderId: string
  skillId: string
  skillName?: string
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  yearsOfExperience?: number
  verified: boolean
  verifiedBy?: string
  verifiedAt?: Date
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create a new skill
 */
export async function createSkill(
  input: CreateSkillInput,
  userId?: string
): Promise<Skill> {
  try {
    const result = await pool.query(
      `INSERT INTO skills (name, description, category, proficiency_levels)
       VALUES ($1, $2, $3, $4)
       RETURNING 
         id,
         name,
         description,
         category,
         proficiency_levels as "proficiencyLevels",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        input.name,
        input.description || null,
        input.category || null,
        input.proficiencyLevels || ['beginner', 'intermediate', 'advanced', 'expert']
      ]
    )

    const skill = result.rows[0]

    logger.info('Skill created', {
      skillId: skill.id,
      name: input.name,
      category: input.category
    })

    return skill
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      throw new Error(`Skill with name "${input.name}" already exists`)
    }
    logger.error('createSkill error', { error, input })
    throw error
  }
}

/**
 * Get all skills, optionally filtered by category
 */
export async function getAllSkills(category?: string): Promise<Skill[]> {
  try {
    const query = category
      ? `SELECT 
           id,
           name,
           description,
           category,
           proficiency_levels as "proficiencyLevels",
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM skills
         WHERE category = $1
         ORDER BY name ASC`
      : `SELECT 
           id,
           name,
           description,
           category,
           proficiency_levels as "proficiencyLevels",
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM skills
         ORDER BY name ASC`

    const result = await pool.query(query, category ? [category] : [])

    return result.rows
  } catch (error) {
    logger.error('getAllSkills error', { error, category })
    throw error
  }
}

/**
 * Get skill by ID
 */
export async function getSkillById(id: string): Promise<Skill | null> {
  try {
    const result = await pool.query(
      `SELECT 
         id,
         name,
         description,
         category,
         proficiency_levels as "proficiencyLevels",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM skills
       WHERE id = $1`,
      [id]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('getSkillById error', { error, id })
    throw error
  }
}

/**
 * Update skill
 */
export async function updateSkill(
  id: string,
  updates: Partial<CreateSkillInput>
): Promise<Skill | null> {
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
    if (updates.proficiencyLevels !== undefined) {
      setClauses.push(`proficiency_levels = $${paramIndex++}`)
      values.push(updates.proficiencyLevels)
    }

    if (setClauses.length === 0) {
      return getSkillById(id)
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE skills 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        name,
        description,
        category,
        proficiency_levels as "proficiencyLevels",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    const result = await pool.query(query, values)

    logger.info('Skill updated', { skillId: id, updates })

    return result.rows[0] || null
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error(`Skill with name "${updates.name}" already exists`)
    }
    logger.error('updateSkill error', { error, id, updates })
    throw error
  }
}

/**
 * Delete skill
 */
export async function deleteSkill(id: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM skills WHERE id = $1`,
      [id]
    )

    logger.info('Skill deleted', { skillId: id })

    return result.rowCount > 0
  } catch (error: any) {
    if (error.code === '23503') { // Foreign key violation
      throw new Error('Cannot delete skill: it is assigned to roles or stakeholders')
    }
    logger.error('deleteSkill error', { error, id })
    throw error
  }
}

/**
 * Assign skill to role
 */
export async function assignSkillToRole(
  roleId: string,
  skillId: string,
  requiredProficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate',
  isRequired: boolean = true
): Promise<RoleSkill> {
  try {
    const result = await pool.query(
      `INSERT INTO role_skills (role_id, skill_id, required_proficiency, is_required)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (role_id, skill_id) 
       DO UPDATE SET 
         required_proficiency = EXCLUDED.required_proficiency,
         is_required = EXCLUDED.is_required
       RETURNING 
         id,
         role_id as "roleId",
         skill_id as "skillId",
         required_proficiency as "requiredProficiency",
         is_required as "isRequired",
         created_at as "createdAt"`,
      [roleId, skillId, requiredProficiency, isRequired]
    )

    const roleSkill = result.rows[0]

    logger.info('Skill assigned to role', {
      roleId,
      skillId,
      requiredProficiency,
      isRequired
    })

    return roleSkill
  } catch (error) {
    logger.error('assignSkillToRole error', { error, roleId, skillId })
    throw error
  }
}

/**
 * Assign skill to stakeholder
 */
export async function assignSkillToStakeholder(
  stakeholderId: string,
  skillId: string,
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate',
  options?: {
    yearsOfExperience?: number
    verified?: boolean
    verifiedBy?: string
    notes?: string
  }
): Promise<StakeholderSkill> {
  try {
    const verified = options?.verified || false
    const verifiedAt = verified && options?.verifiedBy ? new Date() : null

    const result = await pool.query(
      `INSERT INTO stakeholder_skills (
         stakeholder_id, 
         skill_id, 
         proficiency_level, 
         years_of_experience,
         verified,
         verified_by,
         verified_at,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (stakeholder_id, skill_id) 
       DO UPDATE SET 
         proficiency_level = EXCLUDED.proficiency_level,
         years_of_experience = EXCLUDED.years_of_experience,
         verified = EXCLUDED.verified,
         verified_by = EXCLUDED.verified_by,
         verified_at = EXCLUDED.verified_at,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING 
         id,
         stakeholder_id as "stakeholderId",
         skill_id as "skillId",
         proficiency_level as "proficiencyLevel",
         years_of_experience as "yearsOfExperience",
         verified,
         verified_by as "verifiedBy",
         verified_at as "verifiedAt",
         notes,
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        stakeholderId,
        skillId,
        proficiencyLevel,
        options?.yearsOfExperience || null,
        verified,
        options?.verifiedBy || null,
        verifiedAt,
        options?.notes || null
      ]
    )

    const stakeholderSkill = result.rows[0]

    logger.info('Skill assigned to stakeholder', {
      stakeholderId,
      skillId,
      proficiencyLevel,
      verified
    })

    return stakeholderSkill
  } catch (error) {
    logger.error('assignSkillToStakeholder error', { error, stakeholderId, skillId })
    throw error
  }
}

/**
 * Get skills for a role
 */
export async function getRoleSkills(roleId: string): Promise<RoleSkill[]> {
  try {
    const result = await pool.query(
      `SELECT 
         rs.id,
         rs.role_id as "roleId",
         rs.skill_id as "skillId",
         s.name as "skillName",
         rs.required_proficiency as "requiredProficiency",
         rs.is_required as "isRequired",
         rs.created_at as "createdAt"
       FROM role_skills rs
       INNER JOIN skills s ON rs.skill_id = s.id
       WHERE rs.role_id = $1
       ORDER BY rs.is_required DESC, s.name ASC`,
      [roleId]
    )

    return result.rows
  } catch (error) {
    logger.error('getRoleSkills error', { error, roleId })
    throw error
  }
}

/**
 * Get skills for a stakeholder
 */
export async function getStakeholderSkills(stakeholderId: string): Promise<StakeholderSkill[]> {
  try {
    const result = await pool.query(
      `SELECT 
         ss.id,
         ss.stakeholder_id as "stakeholderId",
         ss.skill_id as "skillId",
         s.name as "skillName",
         ss.proficiency_level as "proficiencyLevel",
         ss.years_of_experience as "yearsOfExperience",
         ss.verified,
         ss.verified_by as "verifiedBy",
         ss.verified_at as "verifiedAt",
         ss.notes,
         ss.created_at as "createdAt",
         ss.updated_at as "updatedAt"
       FROM stakeholder_skills ss
       INNER JOIN skills s ON ss.skill_id = s.id
       WHERE ss.stakeholder_id = $1
       ORDER BY s.name ASC`,
      [stakeholderId]
    )

    return result.rows
  } catch (error) {
    logger.error('getStakeholderSkills error', { error, stakeholderId })
    throw error
  }
}

/**
 * Calculate skill match percentage between stakeholder and role
 */
export async function matchStakeholderToRole(
  stakeholderId: string,
  roleId: string
): Promise<{ matchPercentage: number; matchedSkills: number; totalRequiredSkills: number; missingSkills: string[] }> {
  try {
    // Use the database function for accurate calculation
    const matchResult = await pool.query(
      `SELECT calculate_skill_match($1, $2) as match_percentage`,
      [stakeholderId, roleId]
    )

    const matchPercentage = parseFloat(matchResult.rows[0].match_percentage)

    // Get total required skills
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM role_skills
       WHERE role_id = $1 AND is_required = TRUE`,
      [roleId]
    )

    const totalRequiredSkills = parseInt(totalResult.rows[0].total)

    // Get matched skills count
    const matchedResult = await pool.query(
      `SELECT COUNT(*) as matched
       FROM role_skills rs
       INNER JOIN stakeholder_skills ss ON rs.skill_id = ss.skill_id
       WHERE rs.role_id = $1
         AND rs.is_required = TRUE
         AND ss.stakeholder_id = $2
         AND (
           (rs.required_proficiency = 'beginner' AND ss.proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
           OR (rs.required_proficiency = 'intermediate' AND ss.proficiency_level IN ('intermediate', 'advanced', 'expert'))
           OR (rs.required_proficiency = 'advanced' AND ss.proficiency_level IN ('advanced', 'expert'))
           OR (rs.required_proficiency = 'expert' AND ss.proficiency_level = 'expert')
         )`,
      [roleId, stakeholderId]
    )

    const matchedSkills = parseInt(matchedResult.rows[0].matched)

    // Get missing skills
    const missingResult = await pool.query(
      `SELECT s.name
       FROM role_skills rs
       INNER JOIN skills s ON rs.skill_id = s.id
       WHERE rs.role_id = $1
         AND rs.is_required = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM stakeholder_skills ss
           WHERE ss.stakeholder_id = $2
             AND ss.skill_id = rs.skill_id
             AND (
               (rs.required_proficiency = 'beginner' AND ss.proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
               OR (rs.required_proficiency = 'intermediate' AND ss.proficiency_level IN ('intermediate', 'advanced', 'expert'))
               OR (rs.required_proficiency = 'advanced' AND ss.proficiency_level IN ('advanced', 'expert'))
               OR (rs.required_proficiency = 'expert' AND ss.proficiency_level = 'expert')
             )
         )`,
      [roleId, stakeholderId]
    )

    const missingSkills = missingResult.rows.map((row: any) => row.name)

    return {
      matchPercentage,
      matchedSkills,
      totalRequiredSkills,
      missingSkills
    }
  } catch (error) {
    logger.error('matchStakeholderToRole error', { error, stakeholderId, roleId })
    throw error
  }
}

/**
 * Remove skill from role
 */
export async function removeSkillFromRole(roleId: string, skillId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM role_skills 
       WHERE role_id = $1 AND skill_id = $2`,
      [roleId, skillId]
    )

    logger.info('Skill removed from role', { roleId, skillId })

    return result.rowCount > 0
  } catch (error) {
    logger.error('removeSkillFromRole error', { error, roleId, skillId })
    throw error
  }
}

/**
 * Remove skill from stakeholder
 */
export async function removeSkillFromStakeholder(stakeholderId: string, skillId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM stakeholder_skills 
       WHERE stakeholder_id = $1 AND skill_id = $2`,
      [stakeholderId, skillId]
    )

    logger.info('Skill removed from stakeholder', { stakeholderId, skillId })

    return result.rowCount > 0
  } catch (error) {
    logger.error('removeSkillFromStakeholder error', { error, stakeholderId, skillId })
    throw error
  }
}

