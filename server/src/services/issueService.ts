/**
 * Issue Service
 * ENTITY_TYPE_ISSUES_LOG.md - Complete implementation
 * 
 * Provides CRUD operations and resolution tracking for issues
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface Issue {
  id: string
  project_id: string
  title: string
  description: string
  category: 'technical' | 'resource' | 'schedule' | 'communication' | 'quality' | 'external' | 'scope' | 'budget' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact?: string
  affected_areas?: string[]
  raised_by?: string
  assigned_to?: string
  escalated_to?: string
  status: 'open' | 'acknowledged' | 'in_progress' | 'blocked' | 'resolved' | 'closed'
  resolution?: string
  workaround?: string
  root_cause?: string
  ai_suggested_resolution?: string
  ai_confidence?: number
  date_raised: string
  target_resolution_date?: string
  date_resolved?: string
  date_closed?: string
  related_risk_id?: string
  related_milestone_id?: string
  related_deliverable_id?: string
  source_document_id?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  created_by?: string
}

export interface CreateIssueInput {
  project_id: string
  title: string
  description: string
  category: Issue['category']
  priority: Issue['priority']
  impact?: string
  affected_areas?: string[]
  assigned_to?: string
  target_resolution_date?: string
  related_risk_id?: string
  related_milestone_id?: string
  related_deliverable_id?: string
  source_document_id?: string
  tags?: string[]
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  category?: Issue['category']
  priority?: Issue['priority']
  impact?: string
  affected_areas?: string[]
  assigned_to?: string
  escalated_to?: string
  status?: Issue['status']
  resolution?: string
  workaround?: string
  root_cause?: string
  target_resolution_date?: string
  related_risk_id?: string
  notes?: string
  tags?: string[]
}

export interface IssueFilters {
  project_id?: string
  status?: string[]
  priority?: string[]
  category?: string[]
  assigned_to?: string
  raised_by?: string
  related_risk_id?: string
  search?: string
}

/**
 * Get all issues with optional filters
 */
export async function getIssues(
  filters: IssueFilters = {},
  userId?: string
): Promise<Issue[]> {
  try {
    let query = `
      SELECT 
        i.*,
        u1.name as raised_by_name,
        u2.name as assigned_to_name,
        u3.name as escalated_to_name
      FROM issues i
      LEFT JOIN users u1 ON i.raised_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN users u3 ON i.escalated_to = u3.id
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramCount = 0
    
    if (filters.project_id) {
      paramCount++
      query += ` AND i.project_id = $${paramCount}`
      params.push(filters.project_id)
    }
    
    if (filters.status && filters.status.length > 0) {
      paramCount++
      query += ` AND i.status = ANY($${paramCount})`
      params.push(filters.status)
    }
    
    if (filters.priority && filters.priority.length > 0) {
      paramCount++
      query += ` AND i.priority = ANY($${paramCount})`
      params.push(filters.priority)
    }
    
    if (filters.category && filters.category.length > 0) {
      paramCount++
      query += ` AND i.category = ANY($${paramCount})`
      params.push(filters.category)
    }
    
    if (filters.assigned_to) {
      paramCount++
      query += ` AND i.assigned_to = $${paramCount}`
      params.push(filters.assigned_to)
    }
    
    if (filters.raised_by) {
      paramCount++
      query += ` AND i.raised_by = $${paramCount}`
      params.push(filters.raised_by)
    }
    
    if (filters.related_risk_id) {
      paramCount++
      query += ` AND i.related_risk_id = $${paramCount}`
      params.push(filters.related_risk_id)
    }
    
    if (filters.search) {
      paramCount++
      query += ` AND (i.title ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`
      params.push(`%${filters.search}%`)
    }
    
    query += ` ORDER BY 
      CASE i.priority 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      i.date_raised DESC
    `
    
    const result = await pool.query(query, params)
    
    return result.rows.map(row => ({
      ...row,
      affected_areas: Array.isArray(row.affected_areas) ? row.affected_areas : [],
      tags: Array.isArray(row.tags) ? row.tags : []
    }))
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to get issues:', error)
    throw error
  }
}

/**
 * Get a single issue by ID
 */
export async function getIssueById(id: string): Promise<Issue | null> {
  try {
    const result = await pool.query(
      `SELECT 
        i.*,
        u1.name as raised_by_name,
        u2.name as assigned_to_name,
        u3.name as escalated_to_name
      FROM issues i
      LEFT JOIN users u1 ON i.raised_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN users u3 ON i.escalated_to = u3.id
      WHERE i.id = $1`,
      [id]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    return {
      ...row,
      affected_areas: Array.isArray(row.affected_areas) ? row.affected_areas : [],
      tags: Array.isArray(row.tags) ? row.tags : []
    }
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to get issue:', error)
    throw error
  }
}

/**
 * Create a new issue
 */
export async function createIssue(
  input: CreateIssueInput,
  userId: string
): Promise<Issue> {
  try {
    const result = await pool.query(
      `INSERT INTO issues (
        project_id, title, description, category, priority, impact,
        affected_areas, raised_by, assigned_to, target_resolution_date,
        related_risk_id, related_milestone_id, related_deliverable_id,
        source_document_id, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        input.project_id,
        input.title,
        input.description,
        input.category,
        input.priority,
        input.impact || null,
        JSON.stringify(input.affected_areas || []),
        userId, // raised_by
        input.assigned_to || null,
        input.target_resolution_date || null,
        input.related_risk_id || null,
        input.related_milestone_id || null,
        input.related_deliverable_id || null,
        input.source_document_id || null,
        input.tags || [],
        userId
      ]
    )
    
    const row = result.rows[0]
    return {
      ...row,
      affected_areas: Array.isArray(row.affected_areas) ? row.affected_areas : [],
      tags: Array.isArray(row.tags) ? row.tags : []
    }
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to create issue:', error)
    throw error
  }
}

/**
 * Update an existing issue
 */
export async function updateIssue(
  id: string,
  input: UpdateIssueInput,
  userId: string
): Promise<Issue> {
  try {
    const updates: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (input.title !== undefined) {
      paramCount++
      updates.push(`title = $${paramCount}`)
      params.push(input.title)
    }
    
    if (input.description !== undefined) {
      paramCount++
      updates.push(`description = $${paramCount}`)
      params.push(input.description)
    }
    
    if (input.category !== undefined) {
      paramCount++
      updates.push(`category = $${paramCount}`)
      params.push(input.category)
    }
    
    if (input.priority !== undefined) {
      paramCount++
      updates.push(`priority = $${paramCount}`)
      params.push(input.priority)
    }
    
    if (input.impact !== undefined) {
      paramCount++
      updates.push(`impact = $${paramCount}`)
      params.push(input.impact)
    }
    
    if (input.affected_areas !== undefined) {
      paramCount++
      updates.push(`affected_areas = $${paramCount}`)
      params.push(JSON.stringify(input.affected_areas))
    }
    
    if (input.assigned_to !== undefined) {
      paramCount++
      updates.push(`assigned_to = $${paramCount}`)
      params.push(input.assigned_to || null)
    }
    
    if (input.escalated_to !== undefined) {
      paramCount++
      updates.push(`escalated_to = $${paramCount}`)
      params.push(input.escalated_to || null)
    }
    
    if (input.status !== undefined) {
      paramCount++
      updates.push(`status = $${paramCount}`)
      params.push(input.status)
    }
    
    if (input.resolution !== undefined) {
      paramCount++
      updates.push(`resolution = $${paramCount}`)
      params.push(input.resolution)
    }
    
    if (input.workaround !== undefined) {
      paramCount++
      updates.push(`workaround = $${paramCount}`)
      params.push(input.workaround)
    }
    
    if (input.root_cause !== undefined) {
      paramCount++
      updates.push(`root_cause = $${paramCount}`)
      params.push(input.root_cause)
    }
    
    if (input.target_resolution_date !== undefined) {
      paramCount++
      updates.push(`target_resolution_date = $${paramCount}`)
      params.push(input.target_resolution_date || null)
    }
    
    if (input.related_risk_id !== undefined) {
      paramCount++
      updates.push(`related_risk_id = $${paramCount}`)
      params.push(input.related_risk_id || null)
    }
    
    if (input.notes !== undefined) {
      paramCount++
      updates.push(`notes = $${paramCount}`)
      params.push(input.notes)
    }
    
    if (input.tags !== undefined) {
      paramCount++
      updates.push(`tags = $${paramCount}`)
      params.push(input.tags)
    }
    
    if (updates.length === 0) {
      // No updates, return existing issue
      const existing = await getIssueById(id)
      if (!existing) {
        throw new Error('Issue not found')
      }
      return existing
    }
    
    paramCount++
    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    
    paramCount++
    params.push(id)
    
    const result = await pool.query(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    )
    
    if (result.rows.length === 0) {
      throw new Error('Issue not found')
    }
    
    const row = result.rows[0]
    return {
      ...row,
      affected_areas: Array.isArray(row.affected_areas) ? row.affected_areas : [],
      tags: Array.isArray(row.tags) ? row.tags : []
    }
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to update issue:', error)
    throw error
  }
}

/**
 * Delete an issue
 */
export async function deleteIssue(id: string): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM issues WHERE id = $1', [id])
    return result.rowCount !== null && result.rowCount > 0
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to delete issue:', error)
    throw error
  }
}

/**
 * Get issue status history
 */
export async function getIssueStatusHistory(issueId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT 
        h.*,
        u.name as changed_by_name
      FROM issue_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.issue_id = $1
      ORDER BY h.changed_at DESC`,
      [issueId]
    )
    
    return result.rows
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to get issue status history:', error)
    throw error
  }
}

/**
 * Get issue statistics for a project
 */
export async function getIssueStats(projectId: string): Promise<any> {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE status = 'open') as open_issues,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged_issues,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_issues,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_issues,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_issues,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_issues,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_issues,
        COUNT(*) FILTER (WHERE priority = 'high') as high_issues,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_issues,
        COUNT(*) FILTER (WHERE priority = 'low') as low_issues,
        COUNT(*) FILTER (WHERE target_resolution_date < CURRENT_TIMESTAMP AND status NOT IN ('resolved', 'closed')) as overdue_issues
      FROM issues
      WHERE project_id = $1`,
      [projectId]
    )
    
    return result.rows[0] || {}
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to get issue stats:', error)
    throw error
  }
}

/**
 * Materialize a risk into an issue
 * When a risk matures/escalates into an actual problem, convert it to an issue
 */
export async function materializeRiskIntoIssue(
  riskId: string,
  userId: string,
  additionalData?: {
    impact?: string
    affected_areas?: string[]
    priority?: 'critical' | 'high' | 'medium' | 'low'
  }
): Promise<Issue> {
  try {
    // Get the risk details
    const riskResult = await pool.query(
      `SELECT 
        r.id, r.project_id, r.title, r.description, r.category, 
        r.probability, r.impact, r.mitigation_strategy, r.contingency_plan,
        r.owner, r.source_document_id,
        d.name as source_document_name
      FROM risks r
      LEFT JOIN documents d ON r.source_document_id = d.id
      WHERE r.id = $1`,
      [riskId]
    )

    if (riskResult.rows.length === 0) {
      throw new Error(`Risk not found: ${riskId}`)
    }

    const risk = riskResult.rows[0]
    
    // Validate required fields
    if (!risk.project_id) {
      throw new Error(`Risk ${riskId} has no project_id`)
    }
    if (!risk.title) {
      throw new Error(`Risk ${riskId} has no title`)
    }

    // Map risk category to issue category
    const categoryMap: Record<string, Issue['category']> = {
      'technical': 'technical',
      'resource': 'resource',
      'schedule': 'schedule',
      'communication': 'communication',
      'quality': 'quality',
      'external': 'external',
      'scope': 'scope',
      'budget': 'budget',
      'other': 'other'
    }

    // Map risk impact to issue priority
    const priorityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'very_high': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'very_low': 'low'
    }

    // Determine priority from risk impact or use provided priority
    const priority = additionalData?.priority || priorityMap[risk.impact] || 'medium'

    // Create issue from risk
    const issueInput: CreateIssueInput = {
      project_id: risk.project_id,
      title: `Risk Materialized: ${risk.title || 'Untitled Risk'}`,
      description: `This issue was created from a materialized risk.\n\n**Original Risk:**\n${risk.description || 'No description provided'}\n\n**Mitigation Strategy:**\n${risk.mitigation_strategy || 'None specified'}\n\n**Contingency Plan:**\n${risk.contingency_plan || 'None specified'}`,
      category: categoryMap[risk.category] || 'other',
      priority: priority,
      impact: additionalData?.impact || `Risk with ${risk.impact || 'unknown'} impact has materialized`,
      affected_areas: additionalData?.affected_areas || [],
      related_risk_id: riskId,
      source_document_id: risk.source_document_id || undefined
    }

    // Create the issue
    const issue = await createIssue(issueInput, userId)

    // Update risk status to 'materialized' if column exists
    try {
      await pool.query(
        `UPDATE risks 
         SET status = 'materialized', updated_at = NOW()
         WHERE id = $1 AND status != 'closed'`,
        [riskId]
      )
    } catch (err) {
      // If status column doesn't support 'materialized', just log
      logger.warn('[ISSUE-SERVICE] Could not update risk status to materialized', { riskId, error: err })
    }

    logger.info('[ISSUE-SERVICE] Materialized risk into issue', {
      riskId,
      issueId: issue.id,
      projectId: risk.project_id
    })

    return issue
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to materialize risk into issue:', error)
    throw error
  }
}

