/**
 * Issue API Routes
 * ENTITY_TYPE_ISSUES_LOG.md - Complete implementation
 */

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import Joi from 'joi'
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
  getIssueStatusHistory,
  getIssueStats,
  materializeRiskIntoIssue,
  escalateRiskToIssue,
  suggestRootCauseAnalysis,
  getResolutionRecommendations,
  getResolutionMetrics,
  IssueFilters,
  RiskToIssueEscalationInput
} from '../services/issueService'
import { logger, childLogger } from '../utils/logger'
import { aiService } from '../services/aiService'
import { pool } from '../database/connection'

const router = Router()

/**
 * GET /api/issues
 * Get all issues with optional filters
 */
router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const filters: IssueFilters = {
        project_id: req.query.project_id as string,
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as string[] : [req.query.status as string]) : undefined,
        priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority as string[] : [req.query.priority as string]) : undefined,
        category: req.query.category ? (Array.isArray(req.query.category) ? req.query.category as string[] : [req.query.category as string]) : undefined,
        assigned_to: req.query.assigned_to as string,
        raised_by: req.query.raised_by as string,
        related_risk_id: req.query.related_risk_id as string,
        search: req.query.search as string
      }

      const userId = (req as any).user!.id
      const issues = await getIssues(filters, userId)

      log.info('[ISSUES] Retrieved issues', { count: issues.length })

      res.json({
        success: true,
        data: issues,
        count: issues.length
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to get issues:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve issues',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/issues/stats/:projectId
 * Get issue statistics for a project
 */
router.get(
  '/stats/:projectId',
  authenticateToken,
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params

      const stats = await getIssueStats(projectId)

      log.info('[ISSUES] Retrieved issue stats', { projectId })

      res.json({
        success: true,
        data: stats
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to get issue stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve issue statistics',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/issues/suggest-resolution
 * Generate AI-powered resolution suggestions for an issue
 */
router.post(
  '/suggest-resolution',
  authenticateToken,
  validate(Joi.object({
    issue_id: Joi.string().uuid().required(),
    issue_title: Joi.string().optional(),
    issue_description: Joi.string().optional(),
    issue_category: Joi.string().optional(),
    issue_priority: Joi.string().optional(),
    issue_impact: Joi.string().optional()
  })),
  async (req: Request, res: Response, next) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const { issue_id } = req.body
    try {
      const { issue_title, issue_description, issue_category, issue_priority, issue_impact } = req.body

      // Fetch issue details if not provided
      let issueTitle = issue_title
      let issueDescription = issue_description
      let issueCategory = issue_category
      let issuePriority = issue_priority
      let issueImpact = issue_impact

      if (!issueTitle || !issueDescription) {
        const issueResult = await pool.query(
          `SELECT title, description, category, priority, impact 
           FROM issues 
           WHERE id = $1`,
          [issue_id]
        )

        if (issueResult.rows.length > 0) {
          const issue = issueResult.rows[0]
          issueTitle = issueTitle || issue.title || 'Unknown Issue'
          issueDescription = issueDescription || issue.description || ''
          issueCategory = issueCategory || issue.category || 'other'
          issuePriority = issuePriority || issue.priority || 'medium'
          issueImpact = issueImpact || issue.impact || ''
        }
      }

      // Build AI prompt for resolution suggestions
      const prompt = `You are a project management expert specializing in issue resolution. Analyze the following issue and generate 3-5 comprehensive resolution suggestions.

ISSUE DETAILS:
Title: ${issueTitle}
Description: ${issueDescription}
Category: ${issueCategory || 'Not specified'}
Priority: ${issuePriority || 'Unknown'}
Impact: ${issueImpact || 'Not specified'}

Generate resolution suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Short, actionable title for the resolution",
      "description": "Detailed description of the resolution approach (2-3 sentences)",
      "resolution_type": "immediate|short_term|long_term|preventive",
      "priority": "critical|high|medium|low",
      "expected_effectiveness": 85,
      "key_steps": [
        "Step 1 description",
        "Step 2 description",
        "Step 3 description"
      ],
      "estimated_duration_days": 7,
      "resource_requirements": "Brief description of resources needed",
      "success_criteria": "How to measure if this resolution is successful",
      "root_cause_addressed": "What root cause this resolution addresses"
    }
  ]
}

Guidelines:
- Generate 3-5 diverse resolution suggestions
- Prioritize actionable, specific resolutions over generic advice
- Consider the issue category, priority, and impact when suggesting resolutions
- Mix different resolution types (immediate fixes, short-term workarounds, long-term solutions, preventive measures)
- Provide realistic timeframes and resource requirements
- Include measurable success criteria
- Expected effectiveness should be a percentage (0-100)
- Address root causes when possible
- Return ONLY valid JSON, no markdown or explanation`

      log.info('[ISSUES-SUGGEST-RESOLUTION] Generating AI suggestions', { issue_id })

      // Use the built-in AI provider selection and fallback mechanism
      let aiResponse
      try {
        const availableProviders = await aiService.getAvailableProviders()
        const activeProviders = availableProviders.filter(p => p.is_active)

        if (activeProviders.length === 0) {
          throw new Error('No active AI providers configured. Please configure at least one AI provider in Settings.')
        }

        const preferredProvider = activeProviders[0].type
        log.info('[ISSUES-SUGGEST-RESOLUTION] Using AI provider system', {
          preferredProvider,
          totalActiveProviders: activeProviders.length
        })

        aiResponse = await aiService.generateWithFallback({
          prompt,
          provider: preferredProvider,
          temperature: 0.7,
          max_tokens: 3000,
          userId: (req as any).user!.id
        })

        log.info('[ISSUES-SUGGEST-RESOLUTION] AI suggestions generated successfully', {
          providerUsed: (aiResponse as any).providerUsed || 'unknown',
          contentLength: aiResponse.content?.length || 0
        })
      } catch (fallbackError: any) {
        log.error('[ISSUES-SUGGEST-RESOLUTION] All AI providers failed in fallback chain', {
          error: fallbackError.message,
          lastProvider: fallbackError.provider || 'unknown'
        })
        throw fallbackError
      }

      // Parse AI response
      let suggestions: any[] = []
      try {
        const parsed = JSON.parse(aiResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
        suggestions = parsed.suggestions || []

        // Validate and normalize suggestions
        suggestions = suggestions.map((suggestion: any, index: number) => ({
          title: suggestion.title || `Resolution ${index + 1}`,
          description: suggestion.description || '',
          resolution_type: suggestion.resolution_type || 'short_term',
          priority: suggestion.priority || 'medium',
          expected_effectiveness: Math.min(100, Math.max(0, suggestion.expected_effectiveness || 75)),
          key_steps: Array.isArray(suggestion.key_steps) ? suggestion.key_steps : [],
          estimated_duration_days: suggestion.estimated_duration_days || 7,
          resource_requirements: suggestion.resource_requirements || '',
          success_criteria: suggestion.success_criteria || '',
          root_cause_addressed: suggestion.root_cause_addressed || ''
        }))
      } catch (parseError: any) {
        log.error('[ISSUES-SUGGEST-RESOLUTION] Failed to parse AI response', { error: parseError.message, response: aiResponse.content.substring(0, 500) })
        throw new Error('Failed to parse AI suggestions. Please try again.')
      }

      log.info('[ISSUES-SUGGEST-RESOLUTION] Generated suggestions', { count: suggestions.length })

      res.json({
        success: true,
        data: {
          issue_id,
          suggestions,
          generated_at: new Date().toISOString()
        }
      })
    } catch (error: any) {
      log.error('[ISSUES-SUGGEST-RESOLUTION] Failed to generate suggestions:', {
        error: error.message,
        stack: error.stack,
        issue_id
      })

      let errorMessage = error.message || 'Failed to generate resolution suggestions'
      let statusCode = 500

      if (error.message?.includes('No active providers') || error.message?.includes('All active providers')) {
        errorMessage = 'No AI providers are currently configured or active. Please configure at least one AI provider in Settings.'
        statusCode = 503
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('credits')) {
        errorMessage = 'AI provider has insufficient credits. Please add credits to your AI provider account.'
        statusCode = 402
      } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        errorMessage = 'AI provider rate limit exceeded. Please try again in a few moments.'
        statusCode = 429
      }

      if (!res.headersSent) {
        res.status(statusCode).json({
          success: false,
          error: 'Failed to generate resolution suggestions',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      } else {
        next(error)
      }
    }
  }
)

/**
 * GET /api/issues/:id
 * Get a single issue by ID
 */
router.get(
  '/:id',
  authenticateToken,
  validate(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const issue = await getIssueById(id)

      if (!issue) {
        return res.status(404).json({
          success: false,
          error: 'Issue not found'
        })
      }

      log.info('[ISSUES] Retrieved issue', { id })

      res.json({
        success: true,
        data: issue
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to get issue:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve issue',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/issues/:id/history
 * Get issue status history
 */
router.get(
  '/:id/history',
  authenticateToken,
  validate(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const history = await getIssueStatusHistory(id)

      log.info('[ISSUES] Retrieved issue status history', { id, count: history.length })

      res.json({
        success: true,
        data: history
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to get issue status history:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve issue status history',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/issues
 * Create a new issue
 */
router.post(
  '/',
  authenticateToken,
  validate(Joi.object({
    project_id: Joi.string().uuid().required(),
    title: Joi.string().required().min(1).max(200),
    description: Joi.string().required().min(1),
    category: Joi.string().valid('technical', 'resource', 'schedule', 'communication', 'quality', 'external', 'scope', 'budget', 'other').required(),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
    impact: Joi.string().optional().allow('', null),
    affected_areas: Joi.array().items(Joi.string()).optional(),
    assigned_to: Joi.string().uuid().optional().allow('', null),
    target_resolution_date: Joi.string().isoDate().optional().allow('', null),
    related_risk_id: Joi.string().uuid().optional().allow('', null),
    related_milestone_id: Joi.string().uuid().optional().allow('', null),
    related_deliverable_id: Joi.string().uuid().optional().allow('', null),
    tags: Joi.array().items(Joi.string()).optional()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const issue = await createIssue(req.body, userId)

      log.info('[ISSUES] Created issue', { id: issue.id, project_id: issue.project_id })

      res.status(201).json({
        success: true,
        data: issue
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to create issue:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create issue',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/issues/:id
 * Update an existing issue
 */
router.put(
  '/:id',
  authenticateToken,
  validate(Joi.object({
    id: Joi.string().uuid().required(),
    title: Joi.string().optional().min(1).max(200),
    description: Joi.string().optional().min(1),
    category: Joi.string().valid('technical', 'resource', 'schedule', 'communication', 'quality', 'external', 'scope', 'budget', 'other').optional(),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
    impact: Joi.string().optional().allow('', null),
    affected_areas: Joi.array().items(Joi.string()).optional(),
    assigned_to: Joi.string().uuid().optional().allow('', null),
    escalated_to: Joi.string().uuid().optional().allow('', null),
    status: Joi.string().valid('open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'closed').optional(),
    resolution: Joi.string().optional().allow('', null),
    workaround: Joi.string().optional().allow('', null),
    root_cause: Joi.string().optional().allow('', null),
    target_resolution_date: Joi.string().isoDate().optional().allow('', null),
    related_risk_id: Joi.string().uuid().optional().allow('', null),
    notes: Joi.string().optional().allow('', null),
    tags: Joi.array().items(Joi.string()).optional()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user!.id

      const issue = await updateIssue(id, req.body, userId)

      log.info('[ISSUES] Updated issue', { id: issue.id })

      res.json({
        success: true,
        data: issue
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to update issue:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update issue',
        message: error.message
      })
    }
  }
)

/**
 * DELETE /api/issues/:id
 * Delete an issue
 */
router.delete(
  '/:id',
  authenticateToken,
  validate(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const deleted = await deleteIssue(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Issue not found'
        })
      }

      log.info('[ISSUES] Deleted issue', { id })

      res.json({
        success: true,
        message: 'Issue deleted successfully'
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to delete issue:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete issue',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/issues/materialize-risk/:riskId
 * Convert a materialized risk into an issue
 */
router.post(
  '/materialize-risk/:riskId',
  authenticateToken,
  validate(Joi.object({
    impact: Joi.string().optional().allow('', null),
    affected_areas: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { riskId } = req.params
      const userId = (req as any).user!.id

      const issue = await materializeRiskIntoIssue(riskId, userId, req.body)

      log.info('[ISSUES] Materialized risk into issue', { riskId, issueId: issue.id })

      res.json({
        success: true,
        data: issue,
        message: 'Risk successfully materialized into issue'
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to materialize risk:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to materialize risk into issue',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/issues/escalate-risk/:riskId
 * Escalate a risk to an issue with full RCA support and proper terminology translation
 * This is the recommended endpoint for risk-to-issue escalation
 */
router.post(
  '/escalate-risk/:riskId',
  authenticateToken,
  validate(Joi.object({
    // Required escalation context
    trigger_reason: Joi.string().valid(
      'threshold_breach', 'manual_escalation', 'probability_increase',
      'impact_increase', 'external_event', 'timeline_breach'
    ).required(),
    trigger_description: Joi.string().required().min(10).max(1000),

    // Root cause analysis fields
    root_cause_hypothesis: Joi.string().optional().allow('', null),
    contributing_factors: Joi.array().items(Joi.string()).optional(),
    evidence_collected: Joi.array().items(Joi.string()).optional(),

    // Impact assessment
    actual_impact: Joi.string().optional().allow('', null),
    affected_areas: Joi.array().items(Joi.string()).optional(),
    affected_stakeholders: Joi.array().items(Joi.string()).optional(),

    // Priority override
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),

    // Immediate actions
    immediate_actions_taken: Joi.string().optional().allow('', null),
    workaround_applied: Joi.string().optional().allow('', null),

    // Resolution
    recommended_mitigation: Joi.string().optional().allow('', null),
    target_resolution_date: Joi.string().isoDate().optional().allow('', null)
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { riskId } = req.params
      const userId = (req as any).user!.id

      const escalationInput: RiskToIssueEscalationInput = {
        trigger_reason: req.body.trigger_reason,
        trigger_description: req.body.trigger_description,
        root_cause_hypothesis: req.body.root_cause_hypothesis,
        contributing_factors: req.body.contributing_factors,
        evidence_collected: req.body.evidence_collected,
        actual_impact: req.body.actual_impact,
        affected_areas: req.body.affected_areas,
        affected_stakeholders: req.body.affected_stakeholders,
        priority: req.body.priority,
        immediate_actions_taken: req.body.immediate_actions_taken,
        workaround_applied: req.body.workaround_applied,
        recommended_mitigation: req.body.recommended_mitigation,
        target_resolution_date: req.body.target_resolution_date
      }

      const issue = await escalateRiskToIssue(riskId, userId, escalationInput)

      log.info('[ISSUES] Escalated risk to issue with RCA', {
        riskId,
        issueId: issue.id,
        triggerReason: escalationInput.trigger_reason,
        hasRCA: !!escalationInput.root_cause_hypothesis
      })

      res.status(201).json({
        success: true,
        data: issue,
        message: 'Risk successfully escalated to issue with root cause analysis'
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to escalate risk:', error)

      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Risk not found',
          message: error.message
        })
      }

      res.status(500).json({
        success: false,
        error: 'Failed to escalate risk to issue',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/issues/suggest-rca
 * Get root cause analysis suggestions based on risk category
 */
router.post(
  '/suggest-rca',
  authenticateToken,
  validate(Joi.object({
    risk_category: Joi.string().required(),
    risk_description: Joi.string().optional().allow('', null)
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { risk_category, risk_description } = req.body

      const suggestions = suggestRootCauseAnalysis(
        risk_category,
        risk_description || ''
      )

      log.info('[ISSUES] Generated RCA suggestions', {
        risk_category,
        hypothesesCount: suggestions.suggestedHypotheses.length
      })

      res.json({
        success: true,
        data: suggestions
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to generate RCA suggestions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate root cause analysis suggestions',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/issues/:id/resolution-recommendations
 * Get resolution recommendations (playbooks) for an issue
 */
router.get(
  '/:id/resolution-recommendations',
  authenticateToken,
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const recommendations = await getResolutionRecommendations(id)

      log.info('[ISSUES] Retrieved resolution recommendations', { id, count: recommendations.length })

      res.json({
        success: true,
        data: { recommendations }
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to get resolution recommendations:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resolution recommendations',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/issues/project/:projectId/resolution-metrics
 * Get resolution metrics for a project
 */
router.get(
  '/project/:projectId/resolution-metrics',
  authenticateToken,
  validateParams(Joi.object({
    projectId: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const metrics = await getResolutionMetrics(projectId)

      log.info('[ISSUES] Retrieved resolution metrics', { projectId })

      res.json({
        success: true,
        data: { metrics }
      })
    } catch (error: any) {
      log.error('[ISSUES] Failed to get resolution metrics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resolution metrics',
        message: error.message
      })
    }
  }
)

export default router
