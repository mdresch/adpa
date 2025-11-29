/**
 * Mitigation Plan API Routes
 * TASK-1135: Mitigation plans tracked to completion
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../middleware/auth'
import { validate } from '../middleware/validation'
import Joi from 'joi'
import {
  getMitigationPlans,
  getMitigationPlanById,
  createMitigationPlan,
  updateMitigationPlan,
  deleteMitigationPlan,
  getMitigationPlanStats,
  getRiskMitigationCompletion,
  MitigationPlanFilters
} from '../services/mitigationPlanService'
import { logger, childLogger } from '../utils/logger'
import { aiService } from '../services/aiService'
import { pool } from '../database/connection'

const router = Router()

/**
 * GET /api/mitigation-plans
 * Get all mitigation plans with optional filters
 */
router.get(
  '/',
  authenticateToken,
  // Remove validation middleware - handle validation in route handler for more flexibility
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Validate risk_id if provided (must be UUID if present)
      const riskId = req.query.risk_id as string
      if (riskId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId)) {
        // If risk_id is not a UUID, return empty results (likely a mock/test risk)
        log.warn('[MITIGATION-PLANS] Invalid risk_id format (not UUID), returning empty results', { risk_id: riskId })
        return res.json({
          success: true,
          data: [],
          count: 0
        })
      }
      
      const filters: MitigationPlanFilters = {
        risk_id: riskId,
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as string[] : [req.query.status as string]) : undefined,
        owner_id: req.query.owner_id as string,
        assigned_to: req.query.assigned_to as string,
        priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority as string[] : [req.query.priority as string]) : undefined,
        action_type: req.query.action_type ? (Array.isArray(req.query.action_type) ? req.query.action_type as string[] : [req.query.action_type as string]) : undefined,
        overdue: req.query.overdue === 'true',
        due_before: req.query.due_before as string
      }
      
      const userId = (req as any).user!.id
      const plans = await getMitigationPlans(filters, userId)
      
      log.info('[MITIGATION-PLANS] Retrieved mitigation plans', { count: plans.length })
      
      res.json({
        success: true,
        data: plans,
        count: plans.length
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to get mitigation plans:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve mitigation plans',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/mitigation-plans/stats
 * Get mitigation plan statistics
 */
router.get(
  '/stats',
  authenticateToken,
  // Remove validation middleware - handle validation in route handler
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Validate risk_id if provided (must be UUID if present)
      const riskId = req.query.risk_id as string
      if (riskId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(riskId)) {
        // If risk_id is not a UUID, return empty stats (likely a mock/test risk)
        log.warn('[MITIGATION-PLANS] Invalid risk_id format (not UUID) for stats, returning empty stats', { risk_id: riskId })
        return res.json({
          success: true,
          data: {
            total: 0,
            by_status: { completed: 0, planned: 0, in_progress: 0, cancelled: 0, on_hold: 0 },
            by_priority: { critical: 0, high: 0, medium: 0, low: 0 },
            completion_rate: 0,
            overdue_count: 0,
            completion_percentage_avg: 0
          }
        })
      }
      
      const filters: MitigationPlanFilters = {
        risk_id: riskId,
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as string[] : [req.query.status as string]) : undefined
      }
      
      const stats = await getMitigationPlanStats(filters)
      
      log.info('[MITIGATION-PLANS] Retrieved mitigation plan stats')
      
      res.json({
        success: true,
        data: stats
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to get mitigation plan stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve mitigation plan statistics',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/mitigation-plans/suggest
 * Generate AI-powered mitigation plan suggestions for a risk
 */
router.post(
  '/suggest',
  authenticateToken,
  validate(Joi.object({
    risk_id: Joi.string().uuid().required(),
    risk_title: Joi.string().optional(),
    risk_description: Joi.string().optional(),
    risk_category: Joi.string().optional(),
    risk_probability: Joi.number().optional(),
    risk_impact: Joi.number().optional(),
    risk_severity: Joi.string().optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const { risk_id } = req.body // Extract risk_id early for error handling
    try {
      const { risk_title, risk_description, risk_category, risk_probability, risk_impact, risk_severity } = req.body
      
      // Fetch risk details if not provided
      let riskTitle = risk_title
      let riskDescription = risk_description
      let riskCategory = risk_category
      let riskProbability = risk_probability
      let riskImpact = risk_impact
      let riskSeverity = risk_severity
      
      if (!riskTitle || !riskDescription) {
        const riskResult = await pool.query(
          `SELECT title, description, category, probability, impact, risk_level 
           FROM risks 
           WHERE id = $1`,
          [risk_id]
        )
        
        if (riskResult.rows.length > 0) {
          const risk = riskResult.rows[0]
          riskTitle = riskTitle || risk.title || 'Unknown Risk'
          riskDescription = riskDescription || risk.description || ''
          riskCategory = riskCategory || risk.category || 'technical'
          riskProbability = riskProbability || risk.probability || 50
          riskImpact = riskImpact || risk.impact || 3
          riskSeverity = riskSeverity || risk.risk_level || 'medium'
        }
      }
      
      // Build AI prompt for mitigation plan suggestions
      const prompt = `You are a risk management expert. Analyze the following risk and generate 3-5 comprehensive mitigation plan suggestions.

RISK DETAILS:
Title: ${riskTitle}
Description: ${riskDescription}
Category: ${riskCategory || 'Not specified'}
Probability: ${riskProbability || 'Unknown'}%
Impact: ${riskImpact || 'Unknown'}/5
Severity: ${riskSeverity || 'Unknown'}

Generate mitigation plan suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Short, actionable title for the mitigation plan",
      "description": "Detailed description of the mitigation action (2-3 sentences)",
      "action_type": "mitigation|contingency|avoidance|transfer|acceptance",
      "priority": "critical|high|medium|low",
      "expected_effectiveness": 85,
      "key_steps": [
        "Step 1 description",
        "Step 2 description",
        "Step 3 description"
      ],
      "estimated_duration_days": 30,
      "resource_requirements": "Brief description of resources needed",
      "success_criteria": "How to measure if this mitigation is successful"
    }
  ]
}

Guidelines:
- Generate 3-5 diverse mitigation plan suggestions
- Prioritize actionable, specific plans over generic advice
- Consider the risk category, probability, and impact when suggesting actions
- Mix different action types (mitigation, contingency, avoidance, transfer, acceptance)
- Provide realistic timeframes and resource requirements
- Include measurable success criteria
- Expected effectiveness should be a percentage (0-100)
- Return ONLY valid JSON, no markdown or explanation`

      log.info('[MITIGATION-PLANS-SUGGEST] Generating AI suggestions', { risk_id })
      
      // Use the built-in AI provider selection and fallback mechanism
      // This automatically:
      // 1. Queries the database for active AI providers (ordered by priority)
      // 2. Tries providers in order of priority
      // 3. Automatically falls back to next provider if one fails
      // 4. Handles model errors, rate limits, and insufficient credits
      // 5. Applies exponential backoff for failed providers
      // 
      // By not passing fallbackProviders, it uses ALL active providers from the database
      // This ensures we use the configured providers and their priorities
      let aiResponse
      try {
        // Get the best available provider from database (by priority)
        const availableProviders = await aiService.getAvailableProviders()
        const activeProviders = availableProviders.filter(p => p.is_active)
        
        if (activeProviders.length === 0) {
          throw new Error('No active AI providers configured. Please configure at least one AI provider in Settings.')
        }
        
        // Use the highest priority active provider as preferred
        const preferredProvider = activeProviders[0].type
        log.info('[MITIGATION-PLANS-SUGGEST] Using AI provider system', {
          preferredProvider,
          totalActiveProviders: activeProviders.length,
          providers: activeProviders.map(p => `${p.type} (priority: ${p.name})`).join(', ')
        })
        
        // Call generateWithFallback without fallbackProviders list
        // This lets it use ALL active providers from database in priority order
        aiResponse = await aiService.generateWithFallback({
          prompt,
          provider: preferredProvider, // Use highest priority provider
          // model: undefined - let each provider use its default model
          temperature: 0.7,
          max_tokens: 3000,
          userId: (req as any).user!.id
        })
        // Note: Not passing fallbackProviders means it uses ALL active providers from DB
        
        log.info('[MITIGATION-PLANS-SUGGEST] AI suggestions generated successfully', { 
          providerUsed: (aiResponse as any).providerUsed || 'unknown',
          contentLength: aiResponse.content?.length || 0
        })
      } catch (fallbackError: any) {
        // If all providers failed, log detailed error info
        log.error('[MITIGATION-PLANS-SUGGEST] All AI providers failed in fallback chain', {
          error: fallbackError.message,
          lastProvider: fallbackError.provider || 'unknown',
          errorType: fallbackError.type || 'unknown'
        })
        // Re-throw to be handled by outer catch block
        throw fallbackError
      }
      
      // Parse AI response
      let suggestions: any[] = []
      try {
        const parsed = JSON.parse(aiResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
        suggestions = parsed.suggestions || []
        
        // Validate and normalize suggestions
        suggestions = suggestions.map((suggestion: any, index: number) => ({
          title: suggestion.title || `Mitigation Plan ${index + 1}`,
          description: suggestion.description || '',
          action_type: suggestion.action_type || 'mitigation',
          priority: suggestion.priority || 'medium',
          expected_effectiveness: Math.min(100, Math.max(0, suggestion.expected_effectiveness || 75)),
          key_steps: Array.isArray(suggestion.key_steps) ? suggestion.key_steps : [],
          estimated_duration_days: suggestion.estimated_duration_days || 30,
          resource_requirements: suggestion.resource_requirements || '',
          success_criteria: suggestion.success_criteria || ''
        }))
      } catch (parseError: any) {
        log.error('[MITIGATION-PLANS-SUGGEST] Failed to parse AI response', { error: parseError.message, response: aiResponse.content.substring(0, 500) })
        throw new Error('Failed to parse AI suggestions. Please try again.')
      }
      
      log.info('[MITIGATION-PLANS-SUGGEST] Generated suggestions', { count: suggestions.length })
      
      res.json({
        success: true,
        data: {
          risk_id,
          suggestions,
          generated_at: new Date().toISOString()
        }
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS-SUGGEST] Failed to generate suggestions:', {
        error: error.message,
        stack: error.stack,
        risk_id
      })
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to generate mitigation plan suggestions'
      let statusCode = 500
      
      if (error.message?.includes('No active providers') || error.message?.includes('All active providers')) {
        errorMessage = 'No AI providers are currently configured or active. Please configure at least one AI provider in Settings.'
        statusCode = 503 // Service Unavailable
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('credits')) {
        errorMessage = 'AI provider has insufficient credits. Please add credits to your AI provider account.'
        statusCode = 402 // Payment Required
      } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        errorMessage = 'AI provider rate limit exceeded. Please try again in a few moments.'
        statusCode = 429 // Too Many Requests
      }
      
      // Make sure we haven't already sent a response
      if (!res.headersSent) {
        res.status(statusCode).json({
          success: false,
          error: 'Failed to generate mitigation plan suggestions',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
      } else {
        // If response already sent, pass to error handler
        next(error)
      }
    }
  }
)

/**
 * GET /api/mitigation-plans/risk/:riskId/completion
 * Get risk-level mitigation completion percentage
 */
router.get(
  '/risk/:riskId/completion',
  authenticateToken,
  validate(Joi.object({
    riskId: Joi.string().uuid().required()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { riskId } = req.params
      
      const completion = await getRiskMitigationCompletion(riskId)
      
      log.info('[MITIGATION-PLANS] Retrieved risk mitigation completion', { riskId, completion })
      
      res.json({
        success: true,
        data: {
          risk_id: riskId,
          completion_percentage: completion
        }
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to get risk mitigation completion:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk mitigation completion',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/mitigation-plans/:id
 * Get a single mitigation plan by ID
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
      
      const plan = await getMitigationPlanById(id)
      
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Mitigation plan not found'
        })
      }
      
      log.info('[MITIGATION-PLANS] Retrieved mitigation plan', { id })
      
      res.json({
        success: true,
        data: plan
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to get mitigation plan:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve mitigation plan',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/mitigation-plans
 * Create a new mitigation plan
 */
router.post(
  '/',
  authenticateToken,
  validate(Joi.object({
    risk_id: Joi.string().uuid().required(),
    title: Joi.string().required().min(1).max(500),
    description: Joi.string().optional().max(5000),
    action_type: Joi.string().valid('mitigation', 'contingency', 'avoidance', 'transfer', 'acceptance').default('mitigation'),
    owner_id: Joi.string().uuid().optional().allow(null),
    assigned_to: Joi.string().uuid().optional().allow(null),
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'cancelled', 'on_hold').default('planned'),
    completion_percentage: Joi.number().min(0).max(100).default(0),
    planned_start_date: Joi.string().isoDate().optional().allow(null),
    planned_completion_date: Joi.string().isoDate().optional().allow(null),
    due_date: Joi.string().isoDate().optional().allow(null),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').default('medium'),
    expected_effectiveness: Joi.number().min(0).max(100).optional().allow(null),
    completion_notes: Joi.string().optional().allow('', null).max(5000)
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const plan = await createMitigationPlan(req.body, userId)
      
      log.info('[MITIGATION-PLANS] Created mitigation plan', { id: plan.id, risk_id: plan.risk_id })
      
      res.status(201).json({
        success: true,
        data: plan
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to create mitigation plan:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create mitigation plan',
        message: error.message
      })
    }
  }
)

/**
 * PUT /api/mitigation-plans/:id
 * Update an existing mitigation plan
 */
router.put(
  '/:id',
  authenticateToken,
  validate(Joi.object({
    id: Joi.string().uuid().required(),
    title: Joi.string().optional().min(1).max(500),
    description: Joi.string().optional().max(5000),
    action_type: Joi.string().valid('mitigation', 'contingency', 'avoidance', 'transfer', 'acceptance').optional(),
    owner_id: Joi.string().uuid().optional().allow(null),
    assigned_to: Joi.string().uuid().optional().allow(null),
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'cancelled', 'on_hold').optional(),
    completion_percentage: Joi.number().min(0).max(100).optional(),
    planned_start_date: Joi.string().isoDate().optional().allow(null),
    planned_completion_date: Joi.string().isoDate().optional().allow(null),
    actual_start_date: Joi.string().isoDate().optional().allow(null),
    actual_completion_date: Joi.string().isoDate().optional().allow(null),
    due_date: Joi.string().isoDate().optional().allow(null),
    priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
    expected_effectiveness: Joi.number().min(0).max(100).optional().allow(null),
    progress_notes: Joi.array().items(Joi.string()).optional(),
    completion_notes: Joi.string().optional().allow('', null).max(5000),
    completion_evidence: Joi.object().optional()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = (req as any).user!.id
      
      const plan = await updateMitigationPlan(id, req.body, userId)
      
      log.info('[MITIGATION-PLANS] Updated mitigation plan', { id: plan.id })
      
      res.json({
        success: true,
        data: plan
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to update mitigation plan:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update mitigation plan',
        message: error.message
      })
    }
  }
)

/**
 * DELETE /api/mitigation-plans/:id
 * Delete a mitigation plan
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
      
      const deleted = await deleteMitigationPlan(id)
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Mitigation plan not found'
        })
      }
      
      log.info('[MITIGATION-PLANS] Deleted mitigation plan', { id })
      
      res.json({
        success: true,
        message: 'Mitigation plan deleted successfully'
      })
    } catch (error: any) {
      log.error('[MITIGATION-PLANS] Failed to delete mitigation plan:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete mitigation plan',
        message: error.message
      })
    }
  }
)

export default router
