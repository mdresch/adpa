// Project Access Verification Module
//
// Provides centralized access control logic for verifying user permissions
// on projects across the ADPA application.
//
// This module consolidates the project access verification logic that was
// previously duplicated across multiple route files.

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

/**
 * Verify if a user has access to a specific project
 * @param user - Authenticated user object
 * @param projectId - ID of the project to verify access for
 * @returns Promise<boolean> - True if user has access, false otherwise
 */
export async function verifyProjectAccess(user: any, projectId: string): Promise<boolean> {
    try {
        const userId = user?.id
        const userRole = user?.role?.toLowerCase()
        const userCompanyId = user?.company_id
        const isSuperAdmin = userRole === 'super_admin'
        const isAdmin = userRole === 'admin'

        // Super admin can access any project - just verify project exists
        if (isSuperAdmin) {
            const projectExists = await pool.query(
                'SELECT id FROM projects WHERE id = $1',
                [projectId]
            )
            return projectExists.rows.length > 0
        }

        // Admin can access projects from their company
        if (isAdmin) {
            if (userCompanyId) {
                const projectCheck = await pool.query(
                    'SELECT id FROM projects WHERE id = $1 AND company_id = $2',
                    [projectId, userCompanyId]
                )
                return projectCheck.rows.length > 0
            } else {
                // Admin with no company_id - fall back to ownership check
                const projectCheck = await pool.query(
                    'SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR created_by = $2)',
                    [projectId, userId]
                )
                return projectCheck.rows.length > 0
            }
        }

        // Regular users: check ownership, created_by, or team_members
        const query = `
      SELECT id, owner_id, created_by, team_members
      FROM projects
      WHERE id = $1
    `

        const result = await pool.query(query, [projectId])

        if (result.rows.length === 0) {
            return false // Project doesn't exist
        }

        const project = result.rows[0]
        const isOwner = project.owner_id === userId || project.created_by === userId
        const teamMembers = project.team_members || []
        const isInTeam = Array.isArray(teamMembers) && teamMembers.includes(userId)

        return isOwner || isInTeam

    } catch (error: any) {
        logger.error('Project access verification failed', {
            userId: user?.id,
            projectId,
            error: error.message
        })
        return false
    }
}