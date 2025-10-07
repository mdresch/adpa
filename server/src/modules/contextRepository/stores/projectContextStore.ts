/**
 * Project Context Store
 * Manages project-related context data for AI-enhanced document generation
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import type {
  ProjectContext,
  Stakeholder,
  Requirement,
  Constraint,
  Timeline,
  Risk,
  SuccessCriteria,
  ProjectFilters
} from '../types'

export class ProjectContextStore {
  async getProject(projectId: string): Promise<ProjectContext | null> {
    try {
      logger.debug('Fetching project context', { project_id: projectId })

      const result = await pool.query(
        `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.priority,
          p.owner_id,
          p.team_members,
          p.start_date,
          p.end_date,
          p.budget,
          p.metadata,
          p.created_at,
          p.updated_at,
          u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
        `,
        [projectId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const projectRow = result.rows[0]

      // Fetch related data
      const [
        stakeholders,
        requirements,
        constraints,
        timeline,
        risks,
        successCriteria
      ] = await Promise.all([
        this.getProjectStakeholders(projectId),
        this.getProjectRequirements(projectId),
        this.getProjectConstraints(projectId),
        this.getProjectTimeline(projectId),
        this.getProjectRisks(projectId),
        this.getProjectSuccessCriteria(projectId)
      ])

      const projectContext: ProjectContext = {
        project_id: projectRow.id,
        name: projectRow.name,
        description: projectRow.description,
        status: projectRow.status,
        priority: projectRow.priority,
        owner_id: projectRow.owner_id,
        owner_name: projectRow.owner_name,
        team_members: projectRow.team_members || [],
        start_date: projectRow.start_date,
        end_date: projectRow.end_date,
        budget: projectRow.budget,
        metadata: projectRow.metadata,
        stakeholders,
        requirements,
        constraints,
        timeline: timeline || this.createDefaultTimeline(projectRow.start_date, projectRow.end_date),
        risks,
        success_criteria: successCriteria,
        created_at: projectRow.created_at,
        updated_at: projectRow.updated_at
      }

      logger.debug('Project context retrieved successfully', {
        project_id: projectId,
        stakeholders_count: stakeholders.length,
        requirements_count: requirements.length,
        risks_count: risks.length
      })

      return projectContext

    } catch (error) {
      logger.error('Failed to fetch project context', {
        project_id: projectId,
        error: error.message
      })
      throw error
    }
  }

  async getProjectStakeholders(projectId: string): Promise<Stakeholder[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          s.id,
          s.name,
          s.role,
          s.email,
          s.phone,
          s.organization,
          s.influence_level,
          s.interest_level,
          s.responsibilities,
          s.expectations,
          s.communication_preferences,
          s.availability,
          s.metadata
        FROM stakeholders s
        WHERE s.project_id = $1 AND s.deleted_at IS NULL
        ORDER BY s.influence_level DESC, s.name
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        role: row.role,
        email: row.email,
        phone: row.phone,
        organization: row.organization,
        influence_level: row.influence_level,
        interest_level: row.interest_level,
        responsibilities: row.responsibilities || [],
        expectations: row.expectations || [],
        communication_preferences: row.communication_preferences || [],
        availability: row.availability || {},
        metadata: row.metadata
      }))

    } catch (error) {
      logger.error('Failed to fetch project stakeholders', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async getProjectRequirements(projectId: string): Promise<Requirement[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.type,
          r.priority,
          r.status,
          r.source,
          r.acceptance_criteria,
          r.dependencies,
          r.risks,
          r.metadata
        FROM requirements r
        WHERE r.project_id = $1 AND r.deleted_at IS NULL
        ORDER BY r.priority DESC, r.name
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        priority: row.priority,
        status: row.status,
        source: row.source,
        acceptance_criteria: row.acceptance_criteria || [],
        dependencies: row.dependencies || [],
        risks: row.risks || [],
        metadata: row.metadata
      }))

    } catch (error) {
      logger.error('Failed to fetch project requirements', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async getProjectConstraints(projectId: string): Promise<Constraint[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          c.id,
          c.name,
          c.description,
          c.type,
          c.impact,
          c.mitigation_strategy,
          c.metadata
        FROM constraints c
        WHERE c.project_id = $1 AND c.deleted_at IS NULL
        ORDER BY c.impact DESC, c.name
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        impact: row.impact,
        mitigation_strategy: row.mitigation_strategy,
        metadata: row.metadata
      }))

    } catch (error) {
      logger.error('Failed to fetch project constraints', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async getProjectTimeline(projectId: string): Promise<Timeline | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          p.start_date,
          p.end_date,
          p.metadata
        FROM projects p
        WHERE p.id = $1 AND p.deleted_at IS NULL
        `,
        [projectId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const projectRow = result.rows[0]
      const startDate = projectRow.start_date
      const endDate = projectRow.end_date

      if (!startDate || !endDate) {
        return null
      }

      // Fetch milestones and phases
      const [milestones, phases] = await Promise.all([
        this.getProjectMilestones(projectId),
        this.getProjectPhases(projectId)
      ])

      const durationDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        milestones,
        phases,
        dependencies: [], // Would be populated from project dependencies
        critical_path: [] // Would be calculated from project dependencies
      }

    } catch (error) {
      logger.error('Failed to fetch project timeline', {
        project_id: projectId,
        error: error.message
      })
      return null
    }
  }

  async getProjectRisks(projectId: string): Promise<Risk[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.category,
          r.probability,
          r.impact,
          r.risk_level,
          r.mitigation_strategy,
          r.contingency_plan,
          r.owner,
          r.status,
          r.metadata
        FROM risks r
        WHERE r.project_id = $1 AND r.deleted_at IS NULL
        ORDER BY r.risk_level DESC, r.probability DESC, r.name
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        probability: row.probability,
        impact: row.impact,
        risk_level: row.risk_level,
        mitigation_strategy: row.mitigation_strategy,
        contingency_plan: row.contingency_plan,
        owner: row.owner,
        status: row.status,
        metadata: row.metadata
      }))

    } catch (error) {
      logger.error('Failed to fetch project risks', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async getProjectSuccessCriteria(projectId: string): Promise<SuccessCriteria[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          sc.id,
          sc.name,
          sc.description,
          sc.type,
          sc.measurement_method,
          sc.target_value,
          sc.current_value,
          sc.status,
          sc.metadata
        FROM success_criteria sc
        WHERE sc.project_id = $1 AND sc.deleted_at IS NULL
        ORDER BY sc.name
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        measurement_method: row.measurement_method,
        target_value: row.target_value,
        current_value: row.current_value,
        status: row.status,
        metadata: row.metadata
      }))

    } catch (error) {
      logger.error('Failed to fetch project success criteria', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async searchProjects(query: string, filters?: ProjectFilters): Promise<ProjectContext[]> {
    try {
      let sql = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.priority,
          p.owner_id,
          p.team_members,
          p.start_date,
          p.end_date,
          p.budget,
          p.metadata,
          p.created_at,
          p.updated_at,
          u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.deleted_at IS NULL
      `
      const params: any[] = []
      let paramIndex = 1

      // Add text search
      if (query) {
        sql += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
        params.push(`%${query}%`)
        paramIndex++
      }

      // Add filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          sql += ` AND p.status = ANY($${paramIndex})`
          params.push(filters.status)
          paramIndex++
        }

        if (filters.priority && filters.priority.length > 0) {
          sql += ` AND p.priority = ANY($${paramIndex})`
          params.push(filters.priority)
          paramIndex++
        }

        if (filters.owner_id) {
          sql += ` AND p.owner_id = $${paramIndex}`
          params.push(filters.owner_id)
          paramIndex++
        }

        if (filters.start_date_from) {
          sql += ` AND p.start_date >= $${paramIndex}`
          params.push(filters.start_date_from)
          paramIndex++
        }

        if (filters.start_date_to) {
          sql += ` AND p.start_date <= $${paramIndex}`
          params.push(filters.start_date_to)
          paramIndex++
        }

        if (filters.budget_min) {
          sql += ` AND p.budget >= $${paramIndex}`
          params.push(filters.budget_min)
          paramIndex++
        }

        if (filters.budget_max) {
          sql += ` AND p.budget <= $${paramIndex}`
          params.push(filters.budget_max)
          paramIndex++
        }
      }

      sql += ` ORDER BY p.updated_at DESC LIMIT 50`

      const result = await pool.query(sql, params)

      // Convert to ProjectContext objects (simplified for search results)
      const projects: ProjectContext[] = []
      for (const row of result.rows) {
        const project: ProjectContext = {
          project_id: row.id,
          name: row.name,
          description: row.description,
          status: row.status,
          priority: row.priority,
          owner_id: row.owner_id,
          owner_name: row.owner_name,
          team_members: row.team_members || [],
          start_date: row.start_date,
          end_date: row.end_date,
          budget: row.budget,
          metadata: row.metadata,
          stakeholders: [],
          requirements: [],
          constraints: [],
          timeline: this.createDefaultTimeline(row.start_date, row.end_date),
          risks: [],
          success_criteria: [],
          created_at: row.created_at,
          updated_at: row.updated_at
        }
        projects.push(project)
      }

      return projects

    } catch (error) {
      logger.error('Failed to search projects', {
        query,
        filters,
        error: error.message
      })
      return []
    }
  }

  async getSimilarProjects(project: ProjectContext, limit: number = 5): Promise<ProjectContext[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.status,
          p.priority,
          p.owner_id,
          p.team_members,
          p.start_date,
          p.end_date,
          p.budget,
          p.metadata,
          p.created_at,
          p.updated_at,
          u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.deleted_at IS NULL
        AND p.id != $1
        AND (
          p.status = $2 OR 
          p.priority = $3 OR
          p.owner_id = $4 OR
          p.team_members && $5
        )
        ORDER BY 
          CASE WHEN p.status = $2 THEN 1 ELSE 0 END +
          CASE WHEN p.priority = $3 THEN 1 ELSE 0 END +
          CASE WHEN p.owner_id = $4 THEN 1 ELSE 0 END +
          CASE WHEN p.team_members && $5 THEN 1 ELSE 0 END DESC,
          p.updated_at DESC
        LIMIT $6
        `,
        [
          project.project_id,
          project.status,
          project.priority,
          project.owner_id,
          project.team_members,
          limit
        ]
      )

      // Convert to ProjectContext objects (simplified for similarity results)
      const similarProjects: ProjectContext[] = []
      for (const row of result.rows) {
        const similarProject: ProjectContext = {
          project_id: row.id,
          name: row.name,
          description: row.description,
          status: row.status,
          priority: row.priority,
          owner_id: row.owner_id,
          owner_name: row.owner_name,
          team_members: row.team_members || [],
          start_date: row.start_date,
          end_date: row.end_date,
          budget: row.budget,
          metadata: row.metadata,
          stakeholders: [],
          requirements: [],
          constraints: [],
          timeline: this.createDefaultTimeline(row.start_date, row.end_date),
          risks: [],
          success_criteria: [],
          created_at: row.created_at,
          updated_at: row.updated_at
        }
        similarProjects.push(similarProject)
      }

      return similarProjects

    } catch (error) {
      logger.error('Failed to get similar projects', {
        project_id: project.project_id,
        error: error.message
      })
      return []
    }
  }

  private async getProjectMilestones(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          m.id,
          m.name,
          m.description,
          m.date,
          m.status,
          m.dependencies,
          m.deliverables,
          m.success_criteria
        FROM milestones m
        WHERE m.project_id = $1 AND m.deleted_at IS NULL
        ORDER BY m.date
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        date: row.date,
        status: row.status,
        dependencies: row.dependencies || [],
        deliverables: row.deliverables || [],
        success_criteria: row.success_criteria || []
      }))

    } catch (error) {
      logger.error('Failed to fetch project milestones', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  private async getProjectPhases(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          ph.id,
          ph.name,
          ph.description,
          ph.start_date,
          ph.end_date,
          ph.status,
          ph.deliverables,
          ph.team_members
        FROM phases ph
        WHERE ph.project_id = $1 AND ph.deleted_at IS NULL
        ORDER BY ph.start_date
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        deliverables: row.deliverables || [],
        team_members: row.team_members || []
      }))

    } catch (error) {
      logger.error('Failed to fetch project phases', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  private createDefaultTimeline(startDate?: Date, endDate?: Date): Timeline {
    const now = new Date()
    const defaultStart = startDate || now
    const defaultEnd = endDate || new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 days from now

    return {
      start_date: defaultStart,
      end_date: defaultEnd,
      duration_days: Math.ceil((defaultEnd.getTime() - defaultStart.getTime()) / (1000 * 60 * 60 * 24)),
      milestones: [],
      phases: [],
      dependencies: [],
      critical_path: []
    }
  }
}
