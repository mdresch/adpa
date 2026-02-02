/**
 * Enhanced Projects API for Playbook Generation
 * Includes standalone projects and program-level projects with child projects
 */

import express from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import * as programService from "../services/programService"

const router = express.Router()

interface PlaybookProject {
  id: string
  name: string
  description?: string
  type: 'project' | 'program'
  status?: string
  owner_id: string
  owner_name?: string
  owner_email?: string
  document_count?: number
  last_activity?: string
  program_id?: string
  program_name?: string
  child_projects?: Array<{
    id: string
    name: string
    description?: string
    status?: string
    document_count?: number
  }>
  created_at?: string
  updated_at?: string
}

/**
 * GET /api/playbook-projects
 * Get all projects available for playbook generation including program-level projects
 */
router.get("/", authenticateToken, requirePermission("projects.view"), async (req, res) => {
  try {
    const userId = req.user?.id
    const userRole = req.user?.role
    const isSuperAdmin = userRole === "super_admin"

    logger.info('[Playbook Projects Debug] Starting project retrieval', { userId, userRole, isSuperAdmin })

    // Get user's company_id for filtering
    let userCompanyId: string | null = null
    if (!isSuperAdmin) {
      try {
        const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [userId])
        if (userResult.rows.length > 0) {
          userCompanyId = userResult.rows[0].company_id
        }
      } catch (err: any) {
        logger.warn('Could not get company_id for user', { error: err.message })
      }
    }

    logger.info('[Playbook Projects Debug] User company info', { userCompanyId })

    const projects: PlaybookProject[] = []

    // 1. Get standalone projects (projects without program_id)
    const standaloneProjectsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.owner_id,
        p.program_id,
        u.name as owner_name,
        u.email as owner_email,
        COUNT(d.id) as document_count,
        GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity,
        p.created_at,
        p.updated_at
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
      WHERE p.program_id IS NULL
    `

    let standaloneParams: any[] = []
    let standaloneWhereClauses: string[] = []

    // Apply user filtering for standalone projects
    if (!isSuperAdmin && userCompanyId) {
      standaloneWhereClauses.push(`p.company_id = $${standaloneParams.length + 1}`)
      standaloneParams.push(userCompanyId)
    } else if (!isSuperAdmin) {
      standaloneWhereClauses.push(`(p.owner_id = $${standaloneParams.length + 1} OR p.team_members ? $${standaloneParams.length + 1}::text)`)
      standaloneParams.push(userId)
    }

    const standaloneWhere = standaloneWhereClauses.length > 0 
      ? `WHERE ${standaloneWhereClauses.join(' AND ')}`
      : ''

    const standaloneQuery = `${standaloneProjectsQuery} ${standaloneWhere}
      GROUP BY p.id, u.name, u.email 
      ORDER BY p.name ASC`

    logger.info('[Playbook Projects Debug] Executing standalone query', { query: standaloneQuery, params: standaloneParams })

    const standaloneResult = await pool.query(standaloneQuery, standaloneParams)

    logger.info('[Playbook Projects Debug] Standalone projects result', { count: standaloneResult.rows.length })

    // Add standalone projects to results
    standaloneResult.rows.forEach(row => {
      projects.push({
        id: row.id,
        name: row.name,
        description: row.description,
        type: 'project' as const,
        status: row.status,
        owner_id: row.owner_id,
        owner_name: row.owner_name,
        owner_email: row.owner_email,
        document_count: parseInt(row.document_count) || 0,
        last_activity: row.last_activity,
        program_id: row.program_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      })
    })

    // 2. Get programs and their child projects
    const programsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.status,
        p.owner_id,
        u.name as owner_name,
        u.email as owner_email,
        COUNT(pr.id) as project_count,
        p.created_at,
        p.updated_at
      FROM programs p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN projects pr ON pr.program_id = p.id
    `

    let programParams: any[] = []
    let programWhereClauses: string[] = []

    // Apply user filtering for programs
    if (!isSuperAdmin && userCompanyId) {
      programWhereClauses.push(`p.company_id = $${programParams.length + 1}`)
      programParams.push(userCompanyId)
    } else if (!isSuperAdmin) {
      programWhereClauses.push(`p.owner_id = $${programParams.length + 1}`)
      programParams.push(userId)
    }

    const programWhere = programWhereClauses.length > 0 
      ? `WHERE ${programWhereClauses.join(' AND ')}`
      : ''

    const fullProgramsQuery = `${programsQuery} ${programWhere}
      GROUP BY p.id, u.name, u.email 
      ORDER BY p.name ASC`

    logger.info('[Playbook Projects Debug] Executing programs query', { query: fullProgramsQuery, params: programParams })

    const programsResult = await pool.query(fullProgramsQuery, programParams)

    logger.info('[Playbook Projects Debug] Programs result', { count: programsResult.rows.length })

    // For each program, get its child projects
    for (const program of programsResult.rows) {
      try {
        const childProjects = await programService.getProgramProjects(program.id)
        
        logger.info('[Playbook Projects Debug] Child projects for program', { 
          programId: program.id, 
          programName: program.name,
          childCount: childProjects.length 
        })
        
        // Transform child projects data
        const transformedChildren = childProjects.map((child: any) => ({
          id: child.id,
          name: child.name,
          description: child.description,
          status: child.status,
          document_count: parseInt(child.document_count) || 0
        }))

        projects.push({
          id: program.id,
          name: program.name,
          description: program.description,
          type: 'program' as const,
          status: program.status,
          owner_id: program.owner_id,
          owner_name: program.owner_name,
          owner_email: program.owner_email,
          document_count: parseInt(program.project_count) || 0,
          last_activity: program.updated_at,
          program_id: null, // Programs don't have a parent program
          program_name: null,
          child_projects: transformedChildren,
          created_at: program.created_at,
          updated_at: program.updated_at
        })
      } catch (error) {
        logger.error(`Failed to get child projects for program ${program.id}`, { error })
        // Add program without child projects if there's an error
        projects.push({
          id: program.id,
          name: program.name,
          description: program.description,
          type: 'program' as const,
          status: program.status,
          owner_id: program.owner_id,
          owner_name: program.owner_name,
          owner_email: program.owner_email,
          document_count: parseInt(program.project_count) || 0,
          last_activity: program.updated_at,
          program_id: null,
          program_name: null,
          child_projects: [],
          created_at: program.created_at,
          updated_at: program.updated_at
        })
      }
    }

    logger.info('[Playbook Projects] Retrieved projects for playbook generation', {
      totalProjects: projects.length,
      standaloneProjects: standaloneResult.rows.length,
      programs: programsResult.rows.length,
      userId
    })

    res.json({
      success: true,
      projects,
      summary: {
        total: projects.length,
        standalone: standaloneResult.rows.length,
        programs: programsResult.rows.length
      },
      debug: {
        userId,
        userRole,
        isSuperAdmin,
        userCompanyId,
        standaloneQuery: standaloneQuery,
        programsQuery: fullProgramsQuery
      }
    })

  } catch (error: any) {
    logger.error('[Playbook Projects] Failed to retrieve projects', {
      error: error.message,
      stack: error.stack
    })
    
    res.status(500).json({
      success: false,
      error: "Failed to retrieve projects",
      details: error.message,
      debug: {
        message: error.message,
        stack: error.stack
      }
    })
  }
})

/**
 * GET /api/playbook-projects/:id/details
 * Get detailed information about a specific project or program
 */
router.get("/:id/details", authenticateToken, requirePermission("projects.view"), async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    // First, check if it's a program
    const program = await programService.getProgramById(id)
    
    if (program) {
      // It's a program - return program details with child projects
      const childProjects = await programService.getProgramProjects(id)
      
      const transformedChildren = childProjects.map((child: any) => ({
        id: child.id,
        name: child.name,
        description: child.description,
        status: child.status,
        document_count: parseInt(child.document_count) || 0,
        last_activity: child.last_activity,
        owner_name: child.owner_name,
        owner_email: child.owner_email
      }))

      res.json({
        success: true,
        project: {
          ...program,
          type: 'program',
          child_projects: transformedChildren
        }
      })
    } else {
      // It's a standalone project
      const projectQuery = `
        SELECT 
          p.*,
          u.name as owner_name,
          u.email as owner_email,
          COUNT(d.id) as document_count,
          MAX(d.updated_at) as last_document_activity,
          GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
        WHERE p.id = $1
        GROUP BY p.id, u.name, u.email
      `
      
      const projectResult = await pool.query(projectQuery, [id])
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Project not found"
        })
      }

      const project = projectResult.rows[0]
      
      res.json({
        success: true,
        project: {
          ...project,
          type: 'project',
          child_projects: []
        }
      })
    }

  } catch (error: any) {
    logger.error('[Playbook Projects] Failed to get project details', {
      error: error.message,
      projectId: req.params.id
    })
    
    res.status(500).json({
      success: false,
      error: "Failed to retrieve project details",
      details: error.message
    })
  }
})

export default router
