/**
 * Issue Service
 * ENTITY_TYPE_ISSUES_LOG.md - Complete implementation
 * 
 * Provides CRUD operations and resolution tracking for issues
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { getMitigationPlans, updateMitigationPlan } from './mitigationPlanService'
import * as playbookService from './playbookService'
import { aiService } from './aiService'

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
  playbook_execution_id?: string
  resolution_workflow?: any
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
  playbook_execution_id?: string
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
  playbook_execution_id?: string
  resolution_workflow?: any
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
 * Input for escalating a risk to an issue with proper translation
 * TASK: Risk-to-Issue Escalation with Root Cause Analysis
 */
export interface RiskToIssueEscalationInput {
  // Required context for escalation
  trigger_reason: 'threshold_breach' | 'manual_escalation' | 'probability_increase' | 'impact_increase' | 'external_event' | 'timeline_breach'
  trigger_description: string

  // Root cause analysis fields
  root_cause_hypothesis?: string
  contributing_factors?: string[]
  evidence_collected?: string[]

  // Impact assessment when risk materializes
  actual_impact?: string
  affected_areas?: string[]
  affected_stakeholders?: string[]

  // Priority override (otherwise derived from risk impact)
  priority?: 'critical' | 'high' | 'medium' | 'low'

  // Immediate actions already taken or workarounds applied
  immediate_actions_taken?: string
  workaround_applied?: string

  // Suggested mitigation strategy based on RCA
  recommended_mitigation?: string

  // Timeline for resolution
  target_resolution_date?: string
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
 * SECURITY FIX: Enforce ownership
 */
export async function getIssueById(id: string, userId?: string): Promise<Issue | null> {
  try {
    let query = `SELECT 
        i.*,
        u1.name as raised_by_name,
        u2.name as assigned_to_name,
        u3.name as escalated_to_name
      FROM issues i
      LEFT JOIN users u1 ON i.raised_by = u1.id
      LEFT JOIN users u2 ON i.assigned_to = u2.id
      LEFT JOIN users u3 ON i.escalated_to = u3.id
      WHERE i.id = $1`;
    
    const params: any[] = [id];

    if (userId) {
      query += ` AND i.created_by = $2`;
      params.push(userId);
    }

    const result = await pool.query(query, params)

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
        source_document_id, tags, created_by, playbook_execution_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        userId,
        input.playbook_execution_id || null
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

    if (input.playbook_execution_id !== undefined) {
      paramCount++
      updates.push(`playbook_execution_id = $${paramCount}`)
      params.push(input.playbook_execution_id || null)
    }

    if (input.resolution_workflow !== undefined) {
      paramCount++
      updates.push(`resolution_workflow = $${paramCount}`)
      params.push(JSON.stringify(input.resolution_workflow))
    }

    if (updates.length === 0) {
      // No updates, return existing issue
      const existing = await getIssueById(id)
      if (!existing) {
        throw new Error('Issue not found')
      }
      return existing
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    paramCount++
    params.push(id)

    const result = await pool.query(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    )

    if (!result || !Array.isArray(result.rows) || result.rows.length === 0) {
      throw new Error('Issue not found or database query failed')
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
 * SECURITY FIX: Check ownership
 */
export async function deleteIssue(id: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query('DELETE FROM issues WHERE id = $1 AND created_by = $2', [id, userId])
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
 * Materialize a risk into an issue (legacy compatibility)
 * When a risk matures/escalates into an actual problem, convert it to an issue
 * @deprecated Use escalateRiskToIssue for new implementations with RCA support
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
  // Delegate to the enhanced function with minimal escalation input
  return escalateRiskToIssue(riskId, userId, {
    trigger_reason: 'manual_escalation',
    trigger_description: 'Risk manually escalated to issue',
    actual_impact: additionalData?.impact,
    affected_areas: additionalData?.affected_areas,
    priority: additionalData?.priority
  })
}

/**
 * Risk-to-Issue Terminology Translation Map
 * Converts risk-oriented language to issue-oriented language
 */
const RISK_TO_ISSUE_WORDING: Record<string, { issuePrefix: string; verbTransform: string; actionContext: string }> = {
  // Risk categories and their issue equivalents
  'probability': { issuePrefix: 'Occurrence', verbTransform: 'has occurred', actionContext: 'requires immediate attention' },
  'likelihood': { issuePrefix: 'Event', verbTransform: 'has materialized', actionContext: 'needs resolution' },
  'potential': { issuePrefix: 'Confirmed', verbTransform: 'is now', actionContext: 'demands action' },
  'may': { issuePrefix: 'Has', verbTransform: 'confirmed to', actionContext: 'requires response' },
  'could': { issuePrefix: 'Does', verbTransform: 'is now', actionContext: 'needs handling' },
  'might': { issuePrefix: 'Currently', verbTransform: 'is affecting', actionContext: 'requires resolution' }
}

/**
 * Transform risk description to issue description with proper terminology
 */
function transformRiskToIssueWording(riskDescription: string): string {
  let issueDescription = riskDescription

  // Transform probability/likelihood language to certainty language
  const transformations: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /\b(may|might|could)\s+(cause|result|lead)/gi, replacement: 'is causing' },
    { pattern: /\b(may|might|could)\s+(affect|impact)/gi, replacement: 'is affecting' },
    { pattern: /\b(potential|possible)\s+(risk|threat|issue)/gi, replacement: 'confirmed issue' },
    { pattern: /\b(risk\s+of|threat\s+of)/gi, replacement: 'confirmed occurrence of' },
    { pattern: /\b(likelihood|probability)\s+(is|of)/gi, replacement: 'has occurred with' },
    { pattern: /\bif\s+(this|the)\s+risk\b/gi, replacement: 'now that this issue' },
    { pattern: /\b(risk\s+event)/gi, replacement: 'issue' },
    { pattern: /\b(mitigation\s+strategy)/gi, replacement: 'resolution approach' },
    { pattern: /\b(contingency\s+plan)/gi, replacement: 'corrective action plan' },
    { pattern: /\b(risk\s+owner)/gi, replacement: 'issue assignee' },
    { pattern: /\b(monitor\s+for)/gi, replacement: 'actively manage' },
    { pattern: /\b(watch\s+for\s+signs)/gi, replacement: 'assess current state of' }
  ]

  for (const { pattern, replacement } of transformations) {
    issueDescription = issueDescription.replace(pattern, replacement)
  }

  return issueDescription
}

/**
 * Generate issue title from risk title with proper action-oriented wording
 */
function generateIssueTitle(riskTitle: string, triggerReason: RiskToIssueEscalationInput['trigger_reason']): string {
  // Remove risk-oriented prefixes if present
  let cleanTitle = riskTitle
    .replace(/^(Risk:|Potential:|Possible:|Threat:)\s*/i, '')
    .trim()

  // Add issue-oriented prefix based on trigger reason
  const triggerPrefixes: Record<RiskToIssueEscalationInput['trigger_reason'], string> = {
    'threshold_breach': '[ACTIVE]',
    'manual_escalation': '[ESCALATED]',
    'probability_increase': '[CONFIRMED]',
    'impact_increase': '[HIGH IMPACT]',
    'external_event': '[EXTERNAL]',
    'timeline_breach': '[URGENT]'
  }

  return `${triggerPrefixes[triggerReason]} ${cleanTitle}`
}

/**
 * Generate structured issue description from risk with RCA context and mitigation plans
 */
function generateIssueDescription(
  risk: {
    description?: string
    mitigation_strategy?: string
    contingency_plan?: string
    probability?: string
    impact?: string
    source_document_id?: string
    source_document_name?: string
  },
  escalationInput: RiskToIssueEscalationInput,
  mitigationPlans?: Array<{
    id: string
    title: string
    description?: string
    action_type: string
    status: string
    priority: string
    expected_effectiveness?: number
    cost_estimate?: string
    completion_percentage: number
    progress_notes?: string[]
    completion_notes?: string
    metadata?: Record<string, any>
  }>
): string {
  const sections: string[] = []

  // Section 1: Issue Summary (transformed from risk)
  sections.push('## Issue Summary')
  sections.push(transformRiskToIssueWording(risk.description || 'No description provided'))
  sections.push('')

  // Section 2: Trigger and Context
  sections.push('## Escalation Context')
  sections.push(`**Trigger Reason:** ${escalationInput.trigger_reason.replace(/_/g, ' ').toUpperCase()}`)
  sections.push(`**Trigger Description:** ${escalationInput.trigger_description}`)
  if (risk.probability && risk.impact) {
    sections.push(`**Original Risk Profile:** Probability: ${risk.probability}, Impact: ${risk.impact}`)
  }
  sections.push('')

  // Section 3: Root Cause Analysis (if provided)
  if (escalationInput.root_cause_hypothesis || escalationInput.contributing_factors?.length) {
    sections.push('## Root Cause Analysis')
    if (escalationInput.root_cause_hypothesis) {
      sections.push(`**Hypothesis:** ${escalationInput.root_cause_hypothesis}`)
    }
    if (escalationInput.contributing_factors?.length) {
      sections.push('**Contributing Factors:**')
      for (const factor of escalationInput.contributing_factors) {
        sections.push(`- ${factor}`)
      }
    }
    if (escalationInput.evidence_collected?.length) {
      sections.push('**Evidence Collected:**')
      for (const evidence of escalationInput.evidence_collected) {
        sections.push(`- ${evidence}`)
      }
    }
    sections.push('')
  }

  // Section 4: Recommended Resolution (from risk mitigation + RCA-based recommendation)
  sections.push('## Resolution Approach')
  if (escalationInput.recommended_mitigation) {
    sections.push(`**RCA-Based Recommendation:** ${escalationInput.recommended_mitigation}`)
  }
  if (risk.mitigation_strategy) {
    sections.push(`**Original Mitigation Strategy:** ${transformRiskToIssueWording(risk.mitigation_strategy)}`)
  }
  if (risk.contingency_plan) {
    sections.push(`**Contingency Actions:** ${transformRiskToIssueWording(risk.contingency_plan)}`)
  }
  sections.push('')

  // Section 5: Source Document Reference
  if (risk.source_document_id || risk.source_document_name) {
    sections.push('## Source Document Reference')
    if (risk.source_document_name) {
      sections.push(`**Document:** ${risk.source_document_name}`)
    }
    if (risk.source_document_id) {
      sections.push(`**Document ID:** ${risk.source_document_id}`)
    }
    sections.push('')
  }

  // Section 6: Mitigation Plans (for playbook initiation)
  if (mitigationPlans && mitigationPlans.length > 0) {
    sections.push('## Related Mitigation Plans')
    sections.push('The following mitigation plans were defined for this risk and may provide guidance for issue resolution:')
    sections.push('')

    for (const plan of mitigationPlans) {
      sections.push(`### ${plan.title}`)
      sections.push(`**Action Type:** ${plan.action_type}`)
      sections.push(`**Status:** ${plan.status}`)
      sections.push(`**Priority:** ${plan.priority}`)
      sections.push(`**Completion:** ${plan.completion_percentage}%`)

      if (plan.expected_effectiveness) {
        sections.push(`**Expected Effectiveness:** ${plan.expected_effectiveness}%`)
      }
      if (plan.cost_estimate) {
        sections.push(`**Cost Estimate:** ${plan.cost_estimate.charAt(0).toUpperCase() + plan.cost_estimate.slice(1)}`)
      }
      if (plan.description) {
        sections.push(`**Description:** ${plan.description}`)
      }
      if (plan.progress_notes && plan.progress_notes.length > 0) {
        sections.push('**Progress Notes:**')
        plan.progress_notes.forEach((note, index) => {
          sections.push(`${index + 1}. ${note}`)
        })
      }
      if (plan.completion_notes) {
        sections.push(`**Completion Notes:** ${plan.completion_notes}`)
      }
      if (plan.metadata && Object.keys(plan.metadata).length > 0) {
        // Extract any structured data from metadata that might contain key steps, resources, etc.
        if (plan.metadata.key_steps && Array.isArray(plan.metadata.key_steps)) {
          sections.push('**Key Steps:**')
          plan.metadata.key_steps.forEach((step: string, index: number) => {
            sections.push(`${index + 1}. ${step}`)
          })
        }
        if (plan.metadata.resource_requirements) {
          sections.push(`**Resource Requirements:** ${plan.metadata.resource_requirements}`)
        }
        if (plan.metadata.success_criteria) {
          sections.push(`**Success Criteria:** ${plan.metadata.success_criteria}`)
        }
      }
      sections.push('')
    }

    sections.push('**Note:** These mitigation plans may be used to initiate operational playbooks for issue resolution.')
    sections.push('')
  }

  // Section 7: Immediate Actions (if any taken)
  if (escalationInput.immediate_actions_taken || escalationInput.workaround_applied) {
    sections.push('## Immediate Response')
    if (escalationInput.immediate_actions_taken) {
      sections.push(`**Actions Taken:** ${escalationInput.immediate_actions_taken}`)
    }
    if (escalationInput.workaround_applied) {
      sections.push(`**Workaround Applied:** ${escalationInput.workaround_applied}`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Escalate a risk to an issue with full RCA support and proper terminology translation
 * This is the recommended function for risk-to-issue escalation
 */
export async function escalateRiskToIssue(
  riskId: string,
  userId: string,
  escalationInput: RiskToIssueEscalationInput
): Promise<Issue> {
  try {
    // Get the risk details with source document information
    const riskResult = await pool.query(
      `SELECT 
        r.id, r.project_id, r.title, r.description, r.category, 
        r.probability, r.impact, r.mitigation_strategy, r.contingency_plan,
        r.owner, r.source_document_id, r.status,
        d.name as source_document_name, d.id as source_document_id
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

    // Check if risk is already materialized
    if (risk.status === 'materialized') {
      logger.warn('[ISSUE-SERVICE] Risk already materialized', { riskId, existingStatus: risk.status })
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

    // Determine priority from escalation input, risk impact, or trigger severity
    let priority = escalationInput.priority || priorityMap[risk.impact] || 'medium'

    // Escalate priority for certain trigger reasons
    if (escalationInput.trigger_reason === 'threshold_breach' && priority !== 'critical') {
      priority = priority === 'low' ? 'medium' : priority === 'medium' ? 'high' : 'critical'
    }
    if (escalationInput.trigger_reason === 'timeline_breach' && priority === 'low') {
      priority = 'medium'
    }

    // Fetch all mitigation plans for this risk
    let mitigationPlans: any[] = []
    try {
      mitigationPlans = await getMitigationPlans({ risk_id: riskId }, userId)
      logger.info('[ISSUE-SERVICE] Fetched mitigation plans for risk', {
        riskId,
        planCount: mitigationPlans.length
      })
    } catch (error: any) {
      logger.warn('[ISSUE-SERVICE] Failed to fetch mitigation plans', {
        riskId,
        error: error.message
      })
      // Continue without mitigation plans if fetch fails
    }

    // Generate properly worded issue title and description
    const issueTitle = generateIssueTitle(risk.title, escalationInput.trigger_reason)
    const issueDescription = generateIssueDescription(risk, escalationInput, mitigationPlans)

    // Combine affected areas from risk and escalation input
    const affectedAreas = [
      ...(escalationInput.affected_areas || []),
      ...(escalationInput.affected_stakeholders || [])
    ]

    // Create issue from risk with enhanced content
    const issueInput: CreateIssueInput = {
      project_id: risk.project_id,
      title: issueTitle,
      description: issueDescription,
      category: categoryMap[risk.category] || 'other',
      priority: priority,
      impact: escalationInput.actual_impact || `Risk "${risk.title}" has materialized and requires immediate resolution`,
      affected_areas: affectedAreas,
      related_risk_id: riskId,
      source_document_id: risk.source_document_id || undefined,
      target_resolution_date: escalationInput.target_resolution_date
    }

    // Create the issue
    const issue = await createIssue(issueInput, userId)

    // Update issue with root cause and workaround if provided
    if (escalationInput.root_cause_hypothesis || escalationInput.workaround_applied) {
      await updateIssue(issue.id, {
        root_cause: escalationInput.root_cause_hypothesis,
        workaround: escalationInput.workaround_applied
      }, userId)
    }

    // Store escalation details in issue notes for complete audit trail
    const escalationNotes = [
      '=== RISK ESCALATION DETAILS ===',
      `Risk ID: ${riskId}`,
      `Original Risk Title: ${risk.title}`,
      `Risk Category: ${risk.category}`,
      `Risk Probability: ${risk.probability}`,
      `Risk Impact: ${risk.impact}`,
      `Trigger Reason: ${escalationInput.trigger_reason}`,
      `Trigger Description: ${escalationInput.trigger_description}`,
      '',
      'ROOT CAUSE ANALYSIS:',
      escalationInput.root_cause_hypothesis ? `Hypothesis: ${escalationInput.root_cause_hypothesis}` : 'No hypothesis provided',
      escalationInput.contributing_factors && escalationInput.contributing_factors.length > 0
        ? `Contributing Factors:\n${escalationInput.contributing_factors.map((factor, i) => `  ${i + 1}. ${factor}`).join('\n')}`
        : 'No contributing factors identified',
      escalationInput.evidence_collected && escalationInput.evidence_collected.length > 0
        ? `Evidence Collected:\n${escalationInput.evidence_collected.map((evidence, i) => `  ${i + 1}. ${evidence}`).join('\n')}`
        : 'No evidence collected',
      '',
      'IMPACT ASSESSMENT:',
      escalationInput.actual_impact ? `Actual Impact: ${escalationInput.actual_impact}` : 'No actual impact documented',
      escalationInput.affected_areas && escalationInput.affected_areas.length > 0
        ? `Affected Areas:\n${escalationInput.affected_areas.map((area, i) => `  ${i + 1}. ${area}`).join('\n')}`
        : 'No affected areas specified',
      escalationInput.affected_stakeholders && escalationInput.affected_stakeholders.length > 0
        ? `Affected Stakeholders:\n${escalationInput.affected_stakeholders.map((stakeholder, i) => `  ${i + 1}. ${stakeholder}`).join('\n')}`
        : 'No affected stakeholders specified',
      '',
      'IMMEDIATE ACTIONS:',
      escalationInput.immediate_actions_taken ? `Actions Taken: ${escalationInput.immediate_actions_taken}` : 'No immediate actions documented',
      escalationInput.workaround_applied ? `Workaround Applied: ${escalationInput.workaround_applied}` : 'No workaround applied',
      escalationInput.recommended_mitigation ? `Recommended Mitigation: ${escalationInput.recommended_mitigation}` : 'No recommended mitigation',
      '',
      `Escalation Priority: ${priority}`,
      escalationInput.target_resolution_date ? `Target Resolution Date: ${escalationInput.target_resolution_date}` : 'No target resolution date set',
      '',
      'SOURCE DOCUMENTATION:',
      risk.source_document_id ? `Source Document ID: ${risk.source_document_id}` : 'No source document referenced',
      risk.source_document_name ? `Source Document Name: ${risk.source_document_name}` : '',
      ''
    ]

    // Combine all notes and update the issue
    const allNotes = [...escalationNotes]

    if (mitigationPlans.length > 0) {
      const mitigationPlanNotes = [
        '=== MITIGATION PLANS FOR PLAYBOOK INITIATION ===',
        `Risk ID: ${riskId}`,
        `Total Mitigation Plans: ${mitigationPlans.length}`,
        '',
        'Mitigation Plans:',
        ...mitigationPlans.map((plan, index) => {
          const planDetails = [
            `${index + 1}. ${plan.title} (ID: ${plan.id})`,
            `   - Action Type: ${plan.action_type}`,
            `   - Status: ${plan.status}`,
            `   - Priority: ${plan.priority}`,
            `   - Completion: ${plan.completion_percentage}%`,
            plan.expected_effectiveness ? `   - Expected Effectiveness: ${plan.expected_effectiveness}%` : '',
            plan.cost_estimate ? `   - Cost Estimate: ${plan.cost_estimate}` : '',
            plan.status === 'in_progress' || plan.status === 'planned'
              ? '   - ⚠️ ACTIVE: May trigger playbook execution'
              : ''
          ].filter(Boolean).join('\n')
          return planDetails
        }),
        '',
        'Playbook Trigger Candidates:',
        ...mitigationPlans
          .filter(plan =>
            (plan.status === 'in_progress' || plan.status === 'planned') &&
            (plan.action_type === 'contingency' || plan.action_type === 'mitigation')
          )
          .map(plan => `- ${plan.title} (${plan.action_type}, ${plan.priority} priority)`)
      ].join('\n')

      allNotes.push(mitigationPlanNotes)
    }

    // Append to existing notes or create new notes
    const existingNotes = issue.notes || ''
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n${allNotes.join('\n')}`
      : allNotes.join('\n')

    await updateIssue(issue.id, { notes: updatedNotes }, userId)

    logger.info('[ISSUE-SERVICE] Stored escalation details and mitigation plan references in issue notes', {
      issueId: issue.id,
      riskId,
      planCount: mitigationPlans.length,
      playbookCandidates: mitigationPlans.filter(p =>
        (p.status === 'in_progress' || p.status === 'planned') &&
        (p.action_type === 'contingency' || p.action_type === 'mitigation')
      ).length
    })

    // Link mitigation plans to the new issue
    if (mitigationPlans.length > 0) {
      try {
        await Promise.all(mitigationPlans.map(plan =>
          updateMitigationPlan(plan.id, { issue_id: issue.id }, userId)
        ))
        logger.info('[ISSUE-SERVICE] Linked mitigation plans to issue', {
          issueId: issue.id,
          count: mitigationPlans.length
        })
      } catch (err) {
        logger.error('[ISSUE-SERVICE] Failed to link mitigation plans to issue', { error: err })
        // Don't fail the escalation if linking fails, just log it
      }
    }

    // Update risk status to 'materialized'
    try {
      await pool.query(
        `UPDATE risks 
         SET status = 'materialized', updated_at = NOW()
         WHERE id = $1 AND status != 'closed'`,
        [riskId]
      )
    } catch (err) {
      logger.warn('[ISSUE-SERVICE] Could not update risk status to materialized', { riskId, error: err })
    }

    // Log the escalation event for audit trail
    logger.info('[ISSUE-SERVICE] Escalated risk to issue with RCA and mitigation plans', {
      riskId,
      issueId: issue.id,
      projectId: risk.project_id,
      triggerReason: escalationInput.trigger_reason,
      hasRootCauseAnalysis: !!escalationInput.root_cause_hypothesis,
      priority: priority,
      mitigationPlanCount: mitigationPlans.length,
      sourceDocumentId: risk.source_document_id,
      sourceDocumentName: risk.source_document_name
    })

    return issue
  } catch (error: any) {
    logger.error('[ISSUE-SERVICE] Failed to escalate risk to issue:', error)
    throw error
  }
}

/**
 * Suggest root cause analysis based on risk category and description
 * Helper function for UI to provide RCA guidance
 */
export function suggestRootCauseAnalysis(
  riskCategory: string,
  riskDescription: string
): { suggestedHypotheses: string[]; suggestedContributingFactors: string[]; analysisQuestions: string[] } {
  const categoryAnalysis: Record<string, { hypotheses: string[]; factors: string[]; questions: string[] }> = {
    'technical': {
      hypotheses: [
        'System architecture limitations',
        'Technology stack incompatibility',
        'Performance bottleneck under load',
        'Integration failure between components'
      ],
      factors: ['Code complexity', 'Technical debt', 'Missing monitoring', 'Inadequate testing'],
      questions: ['When did the issue first manifest?', 'What system changes preceded this?', 'Are there error logs available?']
    },
    'resource': {
      hypotheses: [
        'Insufficient resource allocation',
        'Skills gap in team composition',
        'Resource conflict with other projects',
        'Unexpected resource unavailability'
      ],
      factors: ['Poor capacity planning', 'Competing priorities', 'Training gaps', 'Vendor dependency'],
      questions: ['What resources are currently allocated?', 'Are there competing projects?', 'What skills are missing?']
    },
    'schedule': {
      hypotheses: [
        'Underestimated task complexity',
        'Dependencies not properly identified',
        'Scope creep without timeline adjustment',
        'External delays cascading through schedule'
      ],
      factors: ['Optimistic estimates', 'Hidden dependencies', 'Change management gaps', 'Communication delays'],
      questions: ['What was the original estimate basis?', 'Which dependencies were missed?', 'What scope changes occurred?']
    },
    'budget': {
      hypotheses: [
        'Underestimated costs',
        'Unplanned expenses',
        'Scope expansion without budget adjustment',
        'Vendor price increases'
      ],
      factors: ['Poor estimation', 'Lack of contingency', 'Scope creep', 'Currency fluctuations'],
      questions: ['What was the original budget basis?', 'What unexpected costs emerged?', 'Were contingencies used?']
    },
    'external': {
      hypotheses: [
        'Vendor/supplier failure',
        'Regulatory change impact',
        'Market condition shift',
        'Third-party service outage'
      ],
      factors: ['Supplier dependency', 'Regulatory monitoring gap', 'Market volatility', 'Contract limitations'],
      questions: ['Which external entity is involved?', 'Was this foreseeable?', 'What are contractual obligations?']
    }
  }

  const analysis = categoryAnalysis[riskCategory] || categoryAnalysis['technical']

  return {
    suggestedHypotheses: analysis.hypotheses,
    suggestedContributingFactors: analysis.factors,
    analysisQuestions: analysis.questions
  }
}

/**
 * Get resolution recommendations (playbooks) for an issue (Phase 2 Enhancement)
 */
export async function getResolutionRecommendations(issueId: string): Promise<playbookService.Playbook[]> {
  const log = logger.child({ service: 'issueService', method: 'getResolutionRecommendations' })

  try {
    log.info('[ISSUES] Starting resolution recommendations', { issueId })

    const result = await pool.query("SELECT project_id, category, priority FROM issues WHERE id = $1", [issueId])

    log.info('[ISSUES] Database query result', {
      issueId,
      rowsFound: result.rows.length,
      hasResult: !!result,
      hasRows: !!(result && result.rows)
    })

    if (result.rows.length === 0) {
      log.warn('[ISSUES] Issue not found for resolution recommendations', { issueId })
      return []
    }

    const issue = result.rows[0]

    // Log the issue data for debugging
    log.info('[ISSUES] Getting resolution recommendations for issue', {
      issueId,
      projectId: issue.project_id,
      category: issue.category,
      priority: issue.priority
    })

    const playbooks = await playbookService.findMatchingPlaybooks({
      project_id: issue.project_id,
      risk_category: issue.category,
      priority_level: issue.priority
    })

    log.info('[ISSUES] Playbook matching completed', {
      issueId,
      playbooksFound: playbooks.length,
      playbookTitles: playbooks.map(p => p.title)
    })

    return playbooks
  } catch (error) {
    log.error('[ISSUES] Error getting resolution recommendations:', { issueId, error })
    return []
  }
}

/**
 * Get resolution metrics for a project (Phase 2 Enhancement)
 */
export async function getResolutionMetrics(projectId: string): Promise<any> {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_issues,
        COUNT(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 END) as closed_issues,
        AVG(CASE WHEN status = 'resolved' OR status = 'closed' THEN 
          EXTRACT(EPOCH FROM (date_resolved - date_raised)) / 3600 END) as avg_resolution_hours,
        COUNT(CASE WHEN playbook_execution_id IS NOT NULL THEN 1 END) as issues_with_playbooks
      FROM issues
      WHERE project_id = $1
    `, [projectId])

    return stats.rows[0]
  } catch (error) {
    logger.error('[ISSUES] Error getting resolution metrics:', error)
    return null
  }
}

/**
 * AI-powered Root Cause Analysis (RCA) for an existing issue
 */
export async function analyzeIssueRootCauseWithAI(
  issueId: string,
  userId?: string
): Promise<{
  suggestedHypotheses: string[];
  suggestedContributingFactors: string[];
  analysisQuestions: string[];
  suggestedResolution?: string;
  confidenceScore: number;
}> {
  try {
    // 1. Fetch issue details
    const result = await pool.query(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    )

    if (result.rows.length === 0) {
      throw new Error(`Issue not found: ${issueId}`)
    }

    const issue = result.rows[0] as Issue

    // 2. Prepare prompt
    const prompt = `
      Conduct a professional Root Cause Analysis (RCA) for the following project issue:
      
      TITLE: ${issue.title}
      DESCRIPTION: ${issue.description}
      CATEGORY: ${issue.category}
      PRIORITY: ${issue.priority}
      IMPACT: ${issue.impact || 'Not specified'}
      STATUS: ${issue.status}
      
      Please provide:
      1. A list of likely hypotheses for the root cause (using methodologies like 5 Whys or Fishbone where applicable).
      2. A list of potential contributing factors.
      3. Precise questions that should be asked to further investigate.
      4. A concise suggested resolution or mitigation strategy.
      5. A confidence score (0.0 to 1.0) for this analysis.
      
      Format your response strictly as a JSON object with the following keys:
      {
        "suggestedHypotheses": ["hypothesis 1", "hypothesis 2", ...],
        "suggestedContributingFactors": ["factor 1", "factor 2", ...],
        "analysisQuestions": ["question 1", "question 2", ...],
        "suggestedResolution": "A concise resolution recommendation string",
        "confidenceScore": 0.85
      }
    `

    // 3. Call AI service with fallback support
    logger.info('[ISSUES] Requesting AI RCA analysis', { issueId, category: issue.category })

    const aiResponse = await aiService.generateWithFallback({
      prompt,
      provider: 'google', // Default to Google but will fallback if needed
      system_prompt: 'You are an expert project manager and systems analyst specializing in Root Cause Analysis (RCA) for complex enterprise projects.',
      userId,
      projectId: issue.project_id
    })

    // 4. Parse response
    // Sometimes AI wraps JSON in backticks, let's clean it
    let cleanContent = aiResponse.content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.substring(7, cleanContent.length - 3).trim()
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.substring(3, cleanContent.length - 3).trim()
    }

    const analysis = JSON.parse(cleanContent)

    logger.info('[ISSUES] AI RCA analysis completed', {
      issueId,
      confidence: analysis.confidenceScore,
      hypotheses: analysis.suggestedHypotheses?.length
    })

    return {
      suggestedHypotheses: analysis.suggestedHypotheses || [],
      suggestedContributingFactors: analysis.suggestedContributingFactors || [],
      analysisQuestions: analysis.analysisQuestions || [],
      suggestedResolution: analysis.suggestedResolution,
      confidenceScore: analysis.confidenceScore || 0
    }
  } catch (err: any) {
    logger.error('[ISSUES] AI RCA analysis failed:', err)
    throw new Error(`AI RCA analysis failed: ${err.message}`)
  }
}
