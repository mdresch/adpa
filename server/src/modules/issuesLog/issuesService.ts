/**
 * Issues Log Service
 * Purpose: Backend service for issues tracking and management
 * Domain: Project Work Performance Domain, Uncertainty Domain
 * Created: February 4, 2026
 */

import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { Issue, IssueStatusHistory, IssueFilters, IssueStatistics, IssueUpdate } from './types';
import { validateIssue, validateIssueUpdate, validateIssueFilters } from './validation';

/**
 * Create a new issue
 */
export async function createIssue(
  issueData: Partial<Issue>,
  userId: string
): Promise<Issue> {
  try {
    // Validate input
    const validatedData = validateIssue(issueData);
    
    // Set metadata
    const now = new Date();
    const data = {
      ...validatedData,
      raised_by: userId,
      date_raised: now,
      created_at: now,
      updated_at: now
    };
    
    // Insert into database
    const result = await pool.query(
      `
      INSERT INTO issues (
        id, project_id, title, description, category, priority, impact,
        affected_areas, raised_by, assigned_to, escalated_to, status,
        resolution, workaround, root_cause, date_raised,
        target_resolution_date, related_risk_id, related_milestone_id,
        related_deliverable_id, source_document_id, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      RETURNING *
      `,
      [
        data.id || require('crypto').randomUUID(),
        data.project_id,
        data.title,
        data.description,
        data.category,
        data.priority,
        data.impact,
        data.affected_areas,
        data.raised_by,
        data.assigned_to,
        data.escalated_to,
        data.status,
        data.resolution,
        data.workaround,
        data.root_cause,
        data.date_raised,
        data.target_resolution_date,
        data.related_risk_id,
        data.related_milestone_id,
        data.related_deliverable_id,
        data.source_document_id,
        data.notes,
        data.created_at,
        data.updated_at
      ]
    );
    
    const createdIssue = result.rows[0];
    
    logger.info('[ISSUES] Issue created', {
      issueId: createdIssue.id,
      projectId: createdIssue.project_id,
      title: createdIssue.title,
      priority: createdIssue.priority
    });
    
    return createdIssue;
  } catch (error) {
    logger.error('[ISSUES] Failed to create issue:', error);
    throw new Error('Failed to create issue');
  }
}

/**
 * Get issue by ID
 */
export async function getIssueById(issueId: string): Promise<Issue | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('[ISSUES] Failed to get issue by ID:', error);
    throw new Error('Failed to retrieve issue');
  }
}

/**
 * List issues with filters
 */
export async function listIssues(filters: IssueFilters = {}): Promise<Issue[]> {
  try {
    // Validate filters
    const validatedFilters = validateIssueFilters(filters);
    
    let query = 'SELECT * FROM issues WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;
    
    // Apply filters
    if (validatedFilters.project_id) {
      query += ` AND project_id = $${paramCount++}`;
      params.push(validatedFilters.project_id);
    }
    
    if (validatedFilters.status) {
      if (Array.isArray(validatedFilters.status)) {
        query += ` AND status = ANY($${paramCount++})`;
        params.push(validatedFilters.status);
      } else {
        query += ` AND status = $${paramCount++}`;
        params.push(validatedFilters.status);
      }
    }
    
    if (validatedFilters.priority) {
      if (Array.isArray(validatedFilters.priority)) {
        query += ` AND priority = ANY($${paramCount++})`;
        params.push(validatedFilters.priority);
      } else {
        query += ` AND priority = $${paramCount++}`;
        params.push(validatedFilters.priority);
      }
    }
    
    if (validatedFilters.category) {
      if (Array.isArray(validatedFilters.category)) {
        query += ` AND category = ANY($${paramCount++})`;
        params.push(validatedFilters.category);
      } else {
        query += ` AND category = $${paramCount++}`;
        params.push(validatedFilters.category);
      }
    }
    
    if (validatedFilters.assigned_to) {
      query += ` AND assigned_to = $${paramCount++}`;
      params.push(validatedFilters.assigned_to);
    }
    
    if (validatedFilters.raised_by) {
      query += ` AND raised_by = $${paramCount++}`;
      params.push(validatedFilters.raised_by);
    }
    
    // Add sorting and pagination
    query += ' ORDER BY date_raised DESC';
    
    if (validatedFilters.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(validatedFilters.limit);
    }
    
    if (validatedFilters.offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(validatedFilters.offset);
    }
    
    const result = await pool.query(query, params);
    
    return result.rows;
  } catch (error) {
    logger.error('[ISSUES] Failed to list issues:', error);
    throw new Error('Failed to list issues');
  }
}

/**
 * Update an issue
 */
export async function updateIssue(
  issueId: string,
  updateData: IssueUpdate,
  userId: string
): Promise<Issue> {
  try {
    // Validate update data
    const validatedData = validateIssueUpdate(updateData);
    
    // Build update query
    let query = 'UPDATE issues SET';
    const params: any[] = [];
    let paramCount = 1;
    
    const updates: string[] = [];
    
    if (validatedData.title !== undefined) {
      updates.push(` title = $${paramCount++}`);
      params.push(validatedData.title);
    }
    
    if (validatedData.description !== undefined) {
      updates.push(` description = $${paramCount++}`);
      params.push(validatedData.description);
    }
    
    if (validatedData.category !== undefined) {
      updates.push(` category = $${paramCount++}`);
      params.push(validatedData.category);
    }
    
    if (validatedData.priority !== undefined) {
      updates.push(` priority = $${paramCount++}`);
      params.push(validatedData.priority);
    }
    
    if (validatedData.impact !== undefined) {
      updates.push(` impact = $${paramCount++}`);
      params.push(validatedData.impact);
    }
    
    if (validatedData.affected_areas !== undefined) {
      updates.push(` affected_areas = $${paramCount++}`);
      params.push(validatedData.affected_areas);
    }
    
    if (validatedData.assigned_to !== undefined) {
      updates.push(` assigned_to = $${paramCount++}`);
      params.push(validatedData.assigned_to);
    }
    
    if (validatedData.escalated_to !== undefined) {
      updates.push(` escalated_to = $${paramCount++}`);
      params.push(validatedData.escalated_to);
    }
    
    if (validatedData.status !== undefined) {
      updates.push(` status = $${paramCount++}`);
      params.push(validatedData.status);
    }
    
    if (validatedData.resolution !== undefined) {
      updates.push(` resolution = $${paramCount++}`);
      params.push(validatedData.resolution);
    }
    
    if (validatedData.workaround !== undefined) {
      updates.push(` workaround = $${paramCount++}`);
      params.push(validatedData.workaround);
    }
    
    if (validatedData.root_cause !== undefined) {
      updates.push(` root_cause = $${paramCount++}`);
      params.push(validatedData.root_cause);
    }
    
    if (validatedData.target_resolution_date !== undefined) {
      updates.push(` target_resolution_date = $${paramCount++}`);
      params.push(validatedData.target_resolution_date);
    }
    
    if (validatedData.notes !== undefined) {
      updates.push(` notes = $${paramCount++}`);
      params.push(validatedData.notes);
    }
    
    // Add updated_at and updated_by
    updates.push(` updated_at = $${paramCount++}`);
    params.push(new Date());
    
    query += updates.join(', ') + ` WHERE id = $${paramCount++}`;
    params.push(issueId);
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      throw new Error('Issue not found');
    }
    
    const updatedIssue = result.rows[0];
    
    logger.info('[ISSUES] Issue updated', {
      issueId: updatedIssue.id,
      status: updatedIssue.status
    });
    
    return updatedIssue;
  } catch (error) {
    logger.error('[ISSUES] Failed to update issue:', error);
    throw new Error('Failed to update issue');
  }
}

/**
 * Delete an issue
 */
export async function deleteIssue(issueId: string): Promise<void> {
  try {
    const result = await pool.query(
      'DELETE FROM issues WHERE id = $1 RETURNING id',
      [issueId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Issue not found');
    }
    
    logger.info('[ISSUES] Issue deleted', { issueId });
  } catch (error) {
    logger.error('[ISSUES] Failed to delete issue:', error);
    throw new Error('Failed to delete issue');
  }
}

/**
 * Get issue status history
 */
export async function getIssueStatusHistory(issueId: string): Promise<IssueStatusHistory[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM issue_status_history WHERE issue_id = $1 ORDER BY changed_at DESC',
      [issueId]
    );
    
    return result.rows;
  } catch (error) {
    logger.error('[ISSUES] Failed to get issue status history:', error);
    throw new Error('Failed to retrieve issue status history');
  }
}

/**
 * Get issue statistics
 */
export async function getIssueStatistics(projectId?: string): Promise<IssueStatistics> {
  try {
    let query = '';
    const params: any[] = [];
    
    if (projectId) {
      query = 'WHERE project_id = $1';
      params.push(projectId);
    }
    
    // Get total issues
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count FROM issues ${query}`,
      params
    );
    
    // Get open issues
    const openResult = await pool.query(
      `SELECT COUNT(*) as count FROM issues ${query} AND status IN ('open', 'acknowledged', 'in_progress', 'blocked')`,
      params
    );
    
    // Get critical issues
    const criticalResult = await pool.query(
      `SELECT COUNT(*) as count FROM issues ${query} AND priority = 'critical'`,
      params
    );
    
    // Get issues by status
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM issues ${query} GROUP BY status`,
      params
    );
    
    // Get issues by priority
    const priorityResult = await pool.query(
      `SELECT priority, COUNT(*) as count FROM issues ${query} GROUP BY priority`,
      params
    );
    
    // Get issues by category
    const categoryResult = await pool.query(
      `SELECT category, COUNT(*) as count FROM issues ${query} GROUP BY category`,
      params
    );
    
    // Get average resolution time
    const resolutionResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (date_resolved - date_raised)) / 3600) as avg_hours 
       FROM issues ${query} WHERE date_resolved IS NOT NULL`,
      params
    );
    
    return {
      total_issues: parseInt(totalResult.rows[0].count),
      open_issues: parseInt(openResult.rows[0].count),
      critical_issues: parseInt(criticalResult.rows[0].count),
      by_status: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>),
      by_priority: priorityResult.rows.reduce((acc, row) => {
        acc[row.priority] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>),
      by_category: categoryResult.rows.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>),
      avg_resolution_time_hours: resolutionResult.rows[0].avg_hours ? parseFloat(resolutionResult.rows[0].avg_hours) : undefined
    };
  } catch (error) {
    logger.error('[ISSUES] Failed to get issue statistics:', error);
    throw new Error('Failed to retrieve issue statistics');
  }
}

/**
 * Materialize a risk into an issue
 */
export async function createIssueFromRisk(
  riskId: string,
  userId: string
): Promise<Issue> {
  try {
    // Get risk details
    const riskResult = await pool.query(
      'SELECT id, project_id, title, description, category, impact FROM risks WHERE id = $1',
      [riskId]
    );
    
    if (riskResult.rows.length === 0) {
      throw new Error('Risk not found');
    }
    
    const risk = riskResult.rows[0];
    
    // Create issue from risk
    const issue = await createIssue({
      project_id: risk.project_id,
      title: `Risk Materialized: ${risk.title}`,
      description: risk.description,
      category: mapRiskCategoryToIssueCategory(risk.category),
      priority: mapRiskImpactToPriority(risk.impact),
      impact: risk.impact,
      related_risk_id: risk.id,
      status: 'open'
    }, userId);
    
    // Update risk with related issue
    await pool.query(
      'UPDATE risks SET related_issue_id = $1, status = $2 WHERE id = $3',
      [issue.id, 'materialized', riskId]
    );
    
    logger.info('[ISSUES] Issue created from materialized risk', {
      riskId,
      issueId: issue.id
    });
    
    return issue;
  } catch (error) {
    logger.error('[ISSUES] Failed to create issue from risk:', error);
    throw new Error('Failed to create issue from risk');
  }
}

/**
 * Create issue from baseline drift
 */
export async function createIssueFromDrift(
  driftDetection: {
    entity_name: string;
    drift_description: string;
    variance_percent: number;
    severity: 'high' | 'medium' | 'low';
  },
  projectId: string,
  userId: string
): Promise<Issue> {
  try {
    const issue = await createIssue({
      project_id: projectId,
      title: `Baseline Drift: ${driftDetection.entity_name}`,
      description: `Drift detected: ${driftDetection.drift_description}`,
      category: 'scope',
      priority: driftDetection.severity === 'high' ? 'high' : 'medium',
      impact: `Baseline variance: ${driftDetection.variance_percent}%`,
      status: 'open'
    }, userId);
    
    logger.info('[ISSUES] Issue created from baseline drift', {
      issueId: issue.id,
      entity: driftDetection.entity_name
    });
    
    return issue;
  } catch (error) {
    logger.error('[ISSUES] Failed to create issue from drift:', error);
    throw new Error('Failed to create issue from drift');
  }
}

/**
 * Create issue from performance variance
 */
export async function createIssueFromPerformanceVariance(
  actual: {
    entity_name: string;
    schedule_variance_days?: number;
    schedule_variance_percent?: number;
  },
  projectId: string,
  userId: string
): Promise<Issue | null> {
  try {
    // Only create issue if variance exceeds threshold
    if (actual.schedule_variance_days && actual.schedule_variance_days < -5) {
      const issue = await createIssue({
        project_id: projectId,
        title: `Schedule Delay: ${actual.entity_name}`,
        description: `${Math.abs(actual.schedule_variance_days)} days behind schedule`,
        category: 'schedule',
        priority: 'high',
        impact: `Timeline impact: ${actual.schedule_variance_percent}% delay`,
        status: 'open'
      }, userId);
      
      logger.info('[ISSUES] Issue created from performance variance', {
        issueId: issue.id,
        entity: actual.entity_name
      });
      
      return issue;
    }
    
    return null;
  } catch (error) {
    logger.error('[ISSUES] Failed to create issue from performance variance:', error);
    throw new Error('Failed to create issue from performance variance');
  }
}

// Helper functions
function mapRiskCategoryToIssueCategory(riskCategory: string): Issue['category'] {
  const mapping: Record<string, Issue['category']> = {
    'technical': 'technical',
    'resource': 'resource',
    'schedule': 'schedule',
    'communication': 'communication',
    'quality': 'quality',
    'external': 'external',
    'scope': 'scope',
    'budget': 'budget',
    'other': 'other'
  };
  
  return mapping[riskCategory] || 'other';
}

function mapRiskImpactToPriority(impact: string): Issue['priority'] {
  const highImpactKeywords = ['critical', 'severe', 'major', 'high'];
  const mediumImpactKeywords = ['medium', 'moderate'];
  
  if (highImpactKeywords.some(kw => impact.toLowerCase().includes(kw))) {
    return 'high';
  } else if (mediumImpactKeywords.some(kw => impact.toLowerCase().includes(kw))) {
    return 'medium';
  } else {
    return 'low';
  }
}