/**
 * Stakeholder Service
 * 
 * Manages stakeholder operations including user linking, role assignments, and skill matching
 * 
 * Features:
 * - Link stakeholders to users
 * - Assign roles to stakeholders within projects
 * - Get stakeholder roles and skill matches
 * - Find stakeholders by role with skill matching
 * 
 * Migration: 209_stakeholder_role_skills_integration.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { matchStakeholderToRole } from './skillsManagementService'

export interface StakeholderRoleAssignment {
  id: string
  stakeholderId: string
  stakeholderName?: string
  stakeholderEmail?: string
  roleId: string
  roleName?: string
  projectId: string
  assignmentType: 'primary' | 'secondary' | 'backup' | 'consultant'
  startDate?: Date
  endDate?: Date
  allocationPercentage: number
  status: 'active' | 'inactive' | 'completed' | 'cancelled'
  assignedBy?: string
  assignedAt?: Date
  notes?: string
}

export interface StakeholderSkillMatch {
  stakeholderId: string
  stakeholderName: string
  stakeholderEmail: string
  matchPercentage: number
  matchedSkills: number
  totalRequiredSkills: number
  missingSkills: string[]
}

/**
 * Link stakeholder to user account
 */
export async function linkStakeholderToUser(
  stakeholderId: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify stakeholder exists
    const stakeholderCheck = await pool.query(
      `SELECT id, stakeholder_type FROM stakeholders WHERE id = $1`,
      [stakeholderId]
    )

    if (stakeholderCheck.rows.length === 0) {
      throw new Error('Stakeholder not found')
    }

    // Verify user exists
    const userCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    )

    if (userCheck.rows.length === 0) {
      throw new Error('User not found')
    }

    // Update stakeholder with user link
    const result = await pool.query(
      `UPDATE stakeholders 
       SET user_id = $1, 
           stakeholder_type = 'internal',
           updated_at = NOW()
       WHERE id = $2`,
      [userId, stakeholderId]
    )

    logger.info('Stakeholder linked to user', {
      stakeholderId,
      userId
    })

    return result.rowCount > 0
  } catch (error) {
    logger.error('linkStakeholderToUser error', { error, stakeholderId, userId })
    throw error
  }
}

/**
 * Assign role to stakeholder within a project
 */
export async function assignRoleToStakeholder(
  stakeholderId: string,
  roleId: string,
  projectId: string,
  options?: {
    assignmentType?: 'primary' | 'secondary' | 'backup' | 'consultant'
    startDate?: Date
    endDate?: Date
    allocationPercentage?: number
    notes?: string
  },
  assignedBy?: string
): Promise<StakeholderRoleAssignment> {
  try {
    // Verify stakeholder exists
    const stakeholderCheck = await pool.query(
      `SELECT id, project_id FROM stakeholders WHERE id = $1`,
      [stakeholderId]
    )

    if (stakeholderCheck.rows.length === 0) {
      throw new Error('Stakeholder not found')
    }

    // Verify stakeholder belongs to project
    if (stakeholderCheck.rows[0].project_id !== projectId) {
      throw new Error('Stakeholder does not belong to this project')
    }

    // Verify role exists
    const roleCheck = await pool.query(
      `SELECT id FROM project_roles WHERE id = $1`,
      [roleId]
    )

    if (roleCheck.rows.length === 0) {
      throw new Error('Role not found')
    }

    // Verify project exists
    const projectCheck = await pool.query(
      `SELECT id FROM projects WHERE id = $1`,
      [projectId]
    )

    if (projectCheck.rows.length === 0) {
      throw new Error('Project not found')
    }

    const result = await pool.query(
      `INSERT INTO stakeholder_role_assignments (
         stakeholder_id,
         role_id,
         project_id,
         assignment_type,
         start_date,
         end_date,
         allocation_percentage,
         assigned_by,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (stakeholder_id, role_id, project_id) 
       DO UPDATE SET 
         assignment_type = EXCLUDED.assignment_type,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         allocation_percentage = EXCLUDED.allocation_percentage,
         notes = EXCLUDED.notes,
         status = 'active'
       RETURNING 
         id,
         stakeholder_id as "stakeholderId",
         role_id as "roleId",
         project_id as "projectId",
         assignment_type as "assignmentType",
         start_date as "startDate",
         end_date as "endDate",
         allocation_percentage as "allocationPercentage",
         status,
         assigned_by as "assignedBy",
         assigned_at as "assignedAt",
         notes`,
      [
        stakeholderId,
        roleId,
        projectId,
        options?.assignmentType || 'primary',
        options?.startDate || null,
        options?.endDate || null,
        options?.allocationPercentage || 100,
        assignedBy || null,
        options?.notes || null
      ]
    )

    const assignment = result.rows[0]

    logger.info('Role assigned to stakeholder', {
      stakeholderId,
      roleId,
      projectId,
      assignmentType: options?.assignmentType || 'primary'
    })

    return assignment
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      throw new Error('Stakeholder already has this role assigned in this project')
    }
    logger.error('assignRoleToStakeholder error', { error, stakeholderId, roleId, projectId })
    throw error
  }
}

/**
 * Get roles assigned to a stakeholder
 */
export async function getStakeholderRoles(
  stakeholderId: string,
  projectId?: string
): Promise<StakeholderRoleAssignment[]> {
  try {
    let query = `
      SELECT 
        sra.id,
        sra.stakeholder_id as "stakeholderId",
        s.name as "stakeholderName",
        s.email as "stakeholderEmail",
        sra.role_id as "roleId",
        pr.role_name as "roleName",
        sra.project_id as "projectId",
        sra.assignment_type as "assignmentType",
        sra.start_date as "startDate",
        sra.end_date as "endDate",
        sra.allocation_percentage as "allocationPercentage",
        sra.status,
        sra.assigned_by as "assignedBy",
        sra.assigned_at as "assignedAt",
        sra.notes
      FROM stakeholder_role_assignments sra
      INNER JOIN stakeholders s ON sra.stakeholder_id = s.id
      INNER JOIN project_roles pr ON sra.role_id = pr.id
      WHERE sra.stakeholder_id = $1
    `

    const params: any[] = [stakeholderId]

    if (projectId) {
      query += ` AND sra.project_id = $2`
      params.push(projectId)
    }

    query += ` ORDER BY sra.assigned_at DESC`

    const result = await pool.query(query, params)

    return result.rows
  } catch (error) {
    logger.error('getStakeholderRoles error', { error, stakeholderId, projectId })
    throw error
  }
}

/**
 * Get stakeholders assigned to a role within a project
 */
export async function getStakeholdersByRole(
  roleId: string,
  projectId: string
): Promise<StakeholderRoleAssignment[]> {
  try {
    const result = await pool.query(
      `SELECT 
         sra.id,
         sra.stakeholder_id as "stakeholderId",
         s.name as "stakeholderName",
         s.email as "stakeholderEmail",
         sra.role_id as "roleId",
         pr.role_name as "roleName",
         sra.project_id as "projectId",
         sra.assignment_type as "assignmentType",
         sra.start_date as "startDate",
         sra.end_date as "endDate",
         sra.allocation_percentage as "allocationPercentage",
         sra.status,
         sra.assigned_by as "assignedBy",
         sra.assigned_at as "assignedAt",
         sra.notes
       FROM stakeholder_role_assignments sra
       INNER JOIN stakeholders s ON sra.stakeholder_id = s.id
       INNER JOIN project_roles pr ON sra.role_id = pr.id
       WHERE sra.role_id = $1 AND sra.project_id = $2
       ORDER BY sra.assignment_type, s.name ASC`,
      [roleId, projectId]
    )

    return result.rows
  } catch (error) {
    logger.error('getStakeholdersByRole error', { error, roleId, projectId })
    throw error
  }
}

/**
 * Get stakeholders with skill match for a role, sorted by match percentage
 */
export async function getStakeholderSkillMatch(
  roleId: string,
  projectId?: string
): Promise<StakeholderSkillMatch[]> {
  try {
    // Get all stakeholders (optionally filtered by project)
    let stakeholderQuery = `
      SELECT DISTINCT s.id, s.name, s.email
      FROM stakeholders s
    `

    const params: any[] = []

    if (projectId) {
      stakeholderQuery += ` WHERE s.project_id = $1`
      params.push(projectId)
    }

    const stakeholdersResult = await pool.query(stakeholderQuery, params)
    const stakeholders = stakeholdersResult.rows

    // Calculate match for each stakeholder
    const matches: StakeholderSkillMatch[] = []

    for (const stakeholder of stakeholders) {
      try {
        const match = await matchStakeholderToRole(stakeholder.id, roleId)
        matches.push({
          stakeholderId: stakeholder.id,
          stakeholderName: stakeholder.name || 'Unknown',
          stakeholderEmail: stakeholder.email || '',
          matchPercentage: match.matchPercentage,
          matchedSkills: match.matchedSkills,
          totalRequiredSkills: match.totalRequiredSkills,
          missingSkills: match.missingSkills
        })
      } catch (error) {
        logger.warn('Error calculating match for stakeholder', {
          stakeholderId: stakeholder.id,
          roleId,
          error
        })
        // Continue with other stakeholders
      }
    }

    // Sort by match percentage descending
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage)

    return matches
  } catch (error) {
    logger.error('getStakeholderSkillMatch error', { error, roleId, projectId })
    throw error
  }
}

/**
 * Remove role assignment from stakeholder
 */
export async function removeRoleFromStakeholder(
  stakeholderId: string,
  roleId: string,
  projectId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM stakeholder_role_assignments 
       WHERE stakeholder_id = $1 AND role_id = $2 AND project_id = $3`,
      [stakeholderId, roleId, projectId]
    )

    logger.info('Role removed from stakeholder', {
      stakeholderId,
      roleId,
      projectId
    })

    return result.rowCount > 0
  } catch (error) {
    logger.error('removeRoleFromStakeholder error', { error, stakeholderId, roleId, projectId })
    throw error
  }
}

/**
 * Update stakeholder role assignment status
 */
export async function updateStakeholderRoleAssignmentStatus(
  assignmentId: string,
  status: 'active' | 'inactive' | 'completed' | 'cancelled'
): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE stakeholder_role_assignments 
       SET status = $1
       WHERE id = $2`,
      [status, assignmentId]
    )

    logger.info('Stakeholder role assignment status updated', {
      assignmentId,
      status
    })

    return result.rowCount > 0
  } catch (error) {
    logger.error('updateStakeholderRoleAssignmentStatus error', { error, assignmentId, status })
    throw error
  }
}

