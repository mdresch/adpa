/**
 * Playbook API Routes
 * RISK_MANAGEMENT_ENHANCEMENT_DESIGN.md - Phase 1 Implementation
 */

import { Router, Request, Response } from 'express'
import Joi from 'joi'
import { authenticateToken } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { playbookService } from '../services/playbookService'
import { logger, childLogger } from '../utils/logger'

const router = Router()

/**
 * GET /api/playbooks
 * List all playbooks with optional filters
 */
router.get(
    '/',
    authenticateToken,
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const filters = {
                project_id: req.query.project_id as string,
                category: req.query.category ? (req.query.category as string).split(',') : undefined,
                trigger_type: req.query.trigger_type ? (req.query.trigger_type as string).split(',') : undefined,
                is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
                search: req.query.search as string
            }

            const playbooks = await playbookService.getPlaybooks(filters)

            res.json({
                success: true,
                data: playbooks
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to get playbooks:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve playbooks',
                message: error.message
            })
        }
    }
)

/**
 * GET /api/playbooks/match
 * Find playbooks matching criteria
 */
router.get(
    '/match',
    authenticateToken,
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const criteria = {
                project_id: req.query.project_id as string,
                risk_category: req.query.risk_category as string,
                severity_level: req.query.severity_level as string,
                priority_level: req.query.priority_level as string,
                impact: req.query.impact as string,
                probability: req.query.probability as string
            }

            if (!criteria.project_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing project_id'
                })
            }

            const matches = await playbookService.findMatchingPlaybooks(criteria)

            res.json({
                success: true,
                data: matches
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to match playbooks:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to match playbooks',
                message: error.message
            })
        }
    }
)

/**
 * GET /api/playbooks/executions
 * List all executions with optional filters
 */
router.get(
    '/executions',
    authenticateToken,
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const filters = {
                playbook_id: req.query.playbook_id as string,
                triggered_by_type: req.query.triggered_by_type as string,
                triggered_by_id: req.query.triggered_by_id as string,
                status: req.query.status ? (req.query.status as string).split(',') : undefined,
                project_id: req.query.project_id as string
            }

            const executions = await playbookService.getExecutions(filters)

            res.json({
                success: true,
                data: executions
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to get executions:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve executions',
                message: error.message
            })
        }
    }
)

/**
 * GET /api/playbooks/executions/:id
 * Get single execution details
 */
router.get(
    '/executions/:id',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required()
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const execution = await playbookService.getExecutionById(req.params.id)

            if (!execution) {
                return res.status(404).json({
                    success: false,
                    error: 'Execution not found'
                })
            }

            res.json({
                success: true,
                data: execution
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to get execution:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve execution',
                message: error.message
            })
        }
    }
)

/**
 * GET /api/playbooks/:id
 * Get a single playbook by ID
 */
router.get(
    '/:id',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required()
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const playbook = await playbookService.getPlaybookById(req.params.id)

            if (!playbook) {
                return res.status(404).json({
                    success: false,
                    error: 'Playbook not found'
                })
            }

            res.json({
                success: true,
                data: playbook
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to get playbook:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve playbook',
                message: error.message
            })
        }
    }
)

/**
 * POST /api/playbooks
 * Create a new playbook
 */
router.post(
    '/',
    authenticateToken,
    validate(Joi.object({
        project_id: Joi.string().uuid().required(),
        title: Joi.string().required().min(1).max(255),
        description: Joi.string().optional().allow('', null),
        category: Joi.string().required().valid('risk', 'incident', 'escalation', 'resolution'),
        trigger_type: Joi.string().required().valid('auto', 'manual', 'threshold'),
        applicable_risk_categories: Joi.array().items(Joi.string()).optional(),
        applicable_severity_levels: Joi.array().items(Joi.string()).optional(),
        applicable_priority_levels: Joi.array().items(Joi.string()).optional(),
        is_active: Joi.boolean().optional()
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        const userId = (req as any).user.id
        try {
            const playbook = await playbookService.createPlaybook(req.body, userId)

            res.status(201).json({
                success: true,
                data: playbook
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to create playbook:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to create playbook',
                message: error.message
            })
        }
    }
)

/**
 * PUT /api/playbooks/:id
 * Update an existing playbook
 */
router.put(
    '/:id',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required()
    })),
    validate(Joi.object({
        title: Joi.string().optional().min(1).max(255),
        description: Joi.string().optional().allow('', null),
        category: Joi.string().optional().valid('risk', 'incident', 'escalation', 'resolution'),
        trigger_type: Joi.string().optional().valid('auto', 'manual', 'threshold'),
        applicable_risk_categories: Joi.array().items(Joi.string()).optional(),
        applicable_severity_levels: Joi.array().items(Joi.string()).optional(),
        applicable_priority_levels: Joi.array().items(Joi.string()).optional(),
        is_active: Joi.boolean().optional()
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        const userId = (req as any).user.id
        try {
            const playbook = await playbookService.updatePlaybook(req.params.id, req.body, userId)

            res.json({
                success: true,
                data: playbook
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to update playbook:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to update playbook',
                message: error.message
            })
        }
    }
)

/**
 * DELETE /api/playbooks/:id
 * Delete a playbook
 */
router.delete(
    '/:id',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required()
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        try {
            const deleted = await playbookService.deletePlaybook(req.params.id)

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Playbook not found'
                })
            }

            res.json({
                success: true,
                message: 'Playbook deleted successfully'
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to delete playbook:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to delete playbook',
                message: error.message
            })
        }
    }
)

/**
 * POST /api/playbooks/:id/execute
 * Execute a playbook
 */
router.post(
    '/:id/execute',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required()
    })),
    validate(Joi.object({
        triggered_by_type: Joi.string().required().valid('risk', 'issue', 'escalation', 'manual'),
        triggered_by_id: Joi.string().uuid().required(),
        trigger_type: Joi.string().required().valid('auto', 'manual'),
        trigger_reason: Joi.string().optional().allow('', null)
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        const userId = (req as any).user.id
        try {
            const input = {
                playbook_id: req.params.id,
                ...req.body
            }
            const execution = await playbookService.executePlaybook(input, userId)

            res.status(201).json({
                success: true,
                data: execution
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to execute playbook:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to execute playbook',
                message: error.message
            })
        }
    }
)

/**
 * POST /api/playbooks/executions/:id/cancel
 * Cancel an execution
 */
router.post(
    '/executions/:id/cancel',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required()
    })),
    validate(Joi.object({
        reason: Joi.string().required().min(1)
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        const userId = (req as any).user.id
        try {
            const execution = await playbookService.cancelExecution(req.params.id, userId, req.body.reason)

            res.json({
                success: true,
                data: execution
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to cancel execution:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to cancel execution',
                message: error.message
            })
        }
    }
)

/**
 * POST /api/playbooks/executions/:id/steps/:stepId/complete
 * Complete a step in an execution
 */
router.post(
    '/executions/:id/steps/:stepId/complete',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required(),
        stepId: Joi.string().uuid().required()
    })),
    validate(Joi.object({
        notes: Joi.string().optional().allow('', null),
        evidence: Joi.object().optional().default({})
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        const userId = (req as any).user.id
        try {
            const stepExecution = await playbookService.completeStep(
                req.params.id,
                req.params.stepId,
                userId,
                req.body.notes,
                req.body.evidence
            )

            res.json({
                success: true,
                data: stepExecution
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to complete step:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to complete step',
                message: error.message
            })
        }
    }
)

/**
 * POST /api/playbooks/executions/:id/steps/:stepId/notes
 * Update completion notes for a completed step
 */
router.post(
    '/executions/:id/steps/:stepId/notes',
    authenticateToken,
    validateParams(Joi.object({
        id: Joi.string().uuid().required(),
        stepId: Joi.string().uuid().required()
    })),
    validate(Joi.object({
        notes: Joi.string().optional().allow('', null),
        evidence: Joi.object().optional().default({})
    })),
    async (req: Request, res: Response) => {
        const log = childLogger({ requestId: (req as any).requestId })
        const userId = (req as any).user.id
        try {
            const stepExecution = await playbookService.updateStepNotes(
                req.params.id,
                req.params.stepId,
                userId,
                req.body.notes,
                req.body.evidence
            )

            res.json({
                success: true,
                data: stepExecution
            })
        } catch (error: any) {
            log.error('[PLAYBOOKS] Failed to update step notes:', error)
            res.status(500).json({
                success: false,
                error: 'Failed to update step notes',
                message: error.message
            })
        }
    }
)

export default router
