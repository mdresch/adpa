/**
 * Skills Matching Service
 * 
 * Provides advanced skills matching algorithms between stakeholders and roles
 * 
 * Features:
 * - Calculate skill match percentage
 * - Identify missing skills
 * - Find skill gaps in projects
 * - Recommend skills for stakeholders to acquire
 * 
 * Migration: 209_stakeholder_role_skills_integration.sql
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { matchStakeholderToRole } from './skillsManagementService'

export interface SkillMatchResult {
  matchPercentage: number
  matchedSkills: number
  totalRequiredSkills: number
  missingSkills: Array<{
    skillId: string
    skillName: string
    requiredProficiency: string
    stakeholderProficiency?: string
  }>
  matchedSkillsDetails: Array<{
    skillId: string
    skillName: string
    requiredProficiency: string
    stakeholderProficiency: string
  }>
}

export interface SkillGap {
  roleId: string
  roleName: string
  skillId: string
  skillName: string
  requiredProficiency: string
  requiredCount: number
  availableCount: number
  gap: number
  stakeholders: Array<{
    stakeholderId: string
    stakeholderName: string
    hasSkill: boolean
    proficiencyLevel?: string
  }>
}

/**
 * Calculate skill match percentage between stakeholder and role
 * Enhanced version with detailed breakdown
 */
export async function calculateSkillMatch(
  stakeholderId: string,
  roleId: string
): Promise<SkillMatchResult> {
  try {
    // Get required skills for the role
    const requiredSkillsResult = await pool.query(
      `SELECT 
         rs.skill_id as "skillId",
         s.name as "skillName",
         rs.required_proficiency as "requiredProficiency",
         rs.is_required
       FROM role_skills rs
       INNER JOIN skills s ON rs.skill_id = s.id
       WHERE rs.role_id = $1 AND rs.is_required = TRUE
       ORDER BY s.name ASC`,
      [roleId]
    )

    const requiredSkills = requiredSkillsResult.rows
    const totalRequiredSkills = requiredSkills.length

    if (totalRequiredSkills === 0) {
      return {
        matchPercentage: 100,
        matchedSkills: 0,
        totalRequiredSkills: 0,
        missingSkills: [],
        matchedSkillsDetails: []
      }
    }

    // Get stakeholder skills
    const stakeholderSkillsResult = await pool.query(
      `SELECT 
         ss.skill_id as "skillId",
         s.name as "skillName",
         ss.proficiency_level as "proficiencyLevel"
       FROM stakeholder_skills ss
       INNER JOIN skills s ON ss.skill_id = s.id
       WHERE ss.stakeholder_id = $1
       ORDER BY s.name ASC`,
      [stakeholderId]
    )

    const stakeholderSkills = stakeholderSkillsResult.rows
    const stakeholderSkillsMap = new Map(
      stakeholderSkills.map(s => [s.skillId, s])
    )

    // Match skills
    const matchedSkillsDetails: SkillMatchResult['matchedSkillsDetails'] = []
    const missingSkills: SkillMatchResult['missingSkills'] = []

    for (const requiredSkill of requiredSkills) {
      const stakeholderSkill = stakeholderSkillsMap.get(requiredSkill.skillId)

      if (stakeholderSkill) {
        // Check if proficiency level matches
        const proficiencyMatch = checkProficiencyMatch(
          requiredSkill.requiredProficiency,
          stakeholderSkill.proficiencyLevel
        )

        if (proficiencyMatch) {
          matchedSkillsDetails.push({
            skillId: requiredSkill.skillId,
            skillName: requiredSkill.skillName,
            requiredProficiency: requiredSkill.requiredProficiency,
            stakeholderProficiency: stakeholderSkill.proficiencyLevel
          })
        } else {
          missingSkills.push({
            skillId: requiredSkill.skillId,
            skillName: requiredSkill.skillName,
            requiredProficiency: requiredSkill.requiredProficiency,
            stakeholderProficiency: stakeholderSkill.proficiencyLevel
          })
        }
      } else {
        missingSkills.push({
          skillId: requiredSkill.skillId,
          skillName: requiredSkill.skillName,
          requiredProficiency: requiredSkill.requiredProficiency
        })
      }
    }

    const matchedSkills = matchedSkillsDetails.length
    const matchPercentage = (matchedSkills / totalRequiredSkills) * 100

    return {
      matchPercentage: Math.round(matchPercentage * 100) / 100,
      matchedSkills,
      totalRequiredSkills,
      missingSkills,
      matchedSkillsDetails
    }
  } catch (error) {
    logger.error('calculateSkillMatch error', { error, stakeholderId, roleId })
    throw error
  }
}

/**
 * Check if stakeholder proficiency level meets required proficiency
 */
function checkProficiencyMatch(
  required: string,
  stakeholder: string
): boolean {
  const levels = ['beginner', 'intermediate', 'advanced', 'expert']
  const requiredIndex = levels.indexOf(required.toLowerCase())
  const stakeholderIndex = levels.indexOf(stakeholder.toLowerCase())

  if (requiredIndex === -1 || stakeholderIndex === -1) {
    return false
  }

  // Stakeholder proficiency must be >= required proficiency
  return stakeholderIndex >= requiredIndex
}

/**
 * Get missing skills for a stakeholder to match a role
 */
export async function getMissingSkills(
  stakeholderId: string,
  roleId: string
): Promise<Array<{ skillId: string; skillName: string; requiredProficiency: string }>> {
  try {
    const match = await calculateSkillMatch(stakeholderId, roleId)
    return match.missingSkills.map(ms => ({
      skillId: ms.skillId,
      skillName: ms.skillName,
      requiredProficiency: ms.requiredProficiency || ''
    }))
  } catch (error) {
    logger.error('getMissingSkills error', { error, stakeholderId, roleId })
    throw error
  }
}

/**
 * Get skill gaps for a role in a project
 * Identifies which stakeholders lack required skills
 */
export async function getSkillGaps(
  roleId: string,
  projectId: string
): Promise<SkillGap[]> {
  try {
    // Get required skills for the role
    const requiredSkillsResult = await pool.query(
      `SELECT 
         rs.skill_id as "skillId",
         s.name as "skillName",
         rs.required_proficiency as "requiredProficiency",
         rs.is_required
       FROM role_skills rs
       INNER JOIN skills s ON rs.skill_id = s.id
       WHERE rs.role_id = $1 AND rs.is_required = TRUE`,
      [roleId]
    )

    const requiredSkills = requiredSkillsResult.rows

    // Get stakeholders with this role in the project
    const stakeholdersResult = await pool.query(
      `SELECT 
         s.id as "stakeholderId",
         s.name as "stakeholderName",
         sra.assignment_type
       FROM stakeholders s
       INNER JOIN stakeholder_role_assignments sra ON s.id = sra.stakeholder_id
       WHERE sra.role_id = $1
         AND sra.project_id = $2
         AND sra.status = 'active'`,
      [roleId, projectId]
    )

    const stakeholders = stakeholdersResult.rows
    const gaps: SkillGap[] = []

    // Check each required skill
    for (const requiredSkill of requiredSkills) {
      const stakeholdersWithSkill: any[] = []
      const stakeholdersWithoutSkill: any[] = []

      for (const stakeholder of stakeholders) {
        // Check if stakeholder has this skill with sufficient proficiency
        const skillCheck = await pool.query(
          `SELECT proficiency_level
           FROM stakeholder_skills
           WHERE stakeholder_id = $1 AND skill_id = $2`,
          [stakeholder.stakeholderId, requiredSkill.skillId]
        )

        if (skillCheck.rows.length > 0) {
          const proficiency = skillCheck.rows[0].proficiency_level
          if (checkProficiencyMatch(requiredSkill.requiredProficiency, proficiency)) {
            stakeholdersWithSkill.push({
              stakeholderId: stakeholder.stakeholderId,
              stakeholderName: stakeholder.stakeholderName,
              hasSkill: true,
              proficiencyLevel: proficiency
            })
          } else {
            stakeholdersWithoutSkill.push({
              stakeholderId: stakeholder.stakeholderId,
              stakeholderName: stakeholder.stakeholderName,
              hasSkill: false,
              proficiencyLevel: proficiency
            })
          }
        } else {
          stakeholdersWithoutSkill.push({
            stakeholderId: stakeholder.stakeholderId,
            stakeholderName: stakeholder.stakeholderName,
            hasSkill: false
          })
        }
      }

      // Get role name
      const roleResult = await pool.query(
        `SELECT role_name FROM project_roles WHERE id = $1`,
        [roleId]
      )

      const roleName = roleResult.rows[0]?.role_name || 'Unknown'

      gaps.push({
        roleId,
        roleName,
        skillId: requiredSkill.skillId,
        skillName: requiredSkill.skillName,
        requiredProficiency: requiredSkill.requiredProficiency,
        requiredCount: stakeholders.length, // Assume 1 per stakeholder for now
        availableCount: stakeholdersWithSkill.length,
        gap: stakeholders.length - stakeholdersWithSkill.length,
        stakeholders: [...stakeholdersWithSkill, ...stakeholdersWithoutSkill]
      })
    }

    return gaps.filter(gap => gap.gap > 0)
  } catch (error) {
    logger.error('getSkillGaps error', { error, roleId, projectId })
    throw error
  }
}

/**
 * Recommend skills for a stakeholder to acquire to match a target role
 */
export async function recommendSkillsForStakeholder(
  stakeholderId: string,
  targetRoleId: string
): Promise<Array<{
  skillId: string
  skillName: string
  category?: string
  requiredProficiency: string
  currentProficiency?: string
  priority: 'high' | 'medium' | 'low'
  learningResources?: string[]
}>> {
  try {
    const match = await calculateSkillMatch(stakeholderId, targetRoleId)

    const recommendations = await Promise.all(
      match.missingSkills.map(async (missingSkill) => {
        // Get skill details
        const skillResult = await pool.query(
          `SELECT category FROM skills WHERE id = $1`,
          [missingSkill.skillId]
        )

        const category = skillResult.rows[0]?.category

        // Determine priority based on proficiency gap
        let priority: 'high' | 'medium' | 'low' = 'medium'
        if (missingSkill.stakeholderProficiency) {
          const levels = ['beginner', 'intermediate', 'advanced', 'expert']
          const requiredIndex = levels.indexOf(missingSkill.requiredProficiency.toLowerCase())
          const currentIndex = levels.indexOf(missingSkill.stakeholderProficiency.toLowerCase())
          const gap = requiredIndex - currentIndex

          if (gap >= 2) {
            priority = 'high'
          } else if (gap === 1) {
            priority = 'medium'
          } else {
            priority = 'low'
          }
        } else {
          priority = 'high' // No skill at all = high priority
        }

        return {
          skillId: missingSkill.skillId,
          skillName: missingSkill.skillName,
          category,
          requiredProficiency: missingSkill.requiredProficiency,
          currentProficiency: missingSkill.stakeholderProficiency,
          priority,
          learningResources: [] // Could be populated from a learning resources table
        }
      })
    )

    // Sort by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 }
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return recommendations
  } catch (error) {
    logger.error('recommendSkillsForStakeholder error', { error, stakeholderId, targetRoleId })
    throw error
  }
}

/**
 * Find best matching stakeholders for a role based on skills
 */
export async function findBestMatchingStakeholders(
  roleId: string,
  projectId: string,
  limit: number = 10
): Promise<Array<{
  stakeholderId: string
  stakeholderName: string
  stakeholderEmail: string
  matchPercentage: number
  matchedSkills: number
  totalRequiredSkills: number
  missingSkills: string[]
}>> {
  try {
    // Get all stakeholders in the project
    const stakeholdersResult = await pool.query(
      `SELECT id, name, email
       FROM stakeholders
       WHERE project_id = $1`,
      [projectId]
    )

    const stakeholders = stakeholdersResult.rows
    const matches: Array<{
      stakeholderId: string
      stakeholderName: string
      stakeholderEmail: string
      matchPercentage: number
      matchedSkills: number
      totalRequiredSkills: number
      missingSkills: string[]
    }> = []

    // Calculate match for each stakeholder
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
      }
    }

    // Sort by match percentage descending
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage)

    return matches.slice(0, limit)
  } catch (error) {
    logger.error('findBestMatchingStakeholders error', { error, roleId, projectId })
    throw error
  }
}

