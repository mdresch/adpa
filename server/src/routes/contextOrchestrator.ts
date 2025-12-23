/**
 * Context Orchestrator Routes
 * API endpoints for enhanced context gathering and injection
 */

import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger'
import { contextOrchestrator } from '../modules/contextOrchestrator'
import { randomBytes } from 'crypto'
import Joi from 'joi'
import type { 
  EnhancedContextRequest,
  ContextGatheringMetrics 
} from '../modules/contextOrchestrator'
import type { ContextInjectionRequest } from '../modules/contextInjection/types'

const router = Router()

/**
 * POST /api/context-orchestrator/gather
 * Enhanced context gathering with validation, freshness checking, and comprehensive logging
 */
// Validation schema for /gather endpoint
const gatherRequestSchema = Joi.object({
  request_id: Joi.string().optional(),
  template_id: Joi.string().uuid().optional(),
  project_id: Joi.string().uuid().optional(),
  user_id: Joi.string().uuid().optional(),
  document_type: Joi.string().default('general'),
  gathering_config: Joi.object().optional(),
  enable_external_sources: Joi.boolean().optional(),
  enable_rag: Joi.boolean().optional(),
  enable_baseline: Joi.boolean().optional(),
  enable_access_control: Joi.boolean().optional(),
  enable_freshness_validation: Joi.boolean().optional(),
  freshness_threshold: Joi.number().integer().min(0).optional(),
  required_permissions: Joi.array().items(Joi.string()).optional(),
  context_size_limit: Joi.number().integer().min(0).optional()
}).or('template_id', 'project_id') // At least one is required

router.post('/gather', async (req: Request, res: Response) => {
  try {
    // Input validation
    const { error, value } = gatherRequestSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      })
    }

    // Generate secure request ID if not provided
    const requestId = value.request_id || `ctx_${Date.now()}_${randomBytes(6).toString('base64url').substring(0, 9)}`

    const request: EnhancedContextRequest = {
      request_id: requestId,
      template_id: value.template_id,
      project_id: value.project_id,
      user_id: value.user_id || req.user?.id,
      document_type: value.document_type || 'general',
      gathering_config: value.gathering_config || {
        context_sources: [
          {
            source_id: 'project_context',
            source_name: 'Project Context',
            source_type: 'database',
            enabled: true
          },
          {
            source_id: 'user_profile_context',
            source_name: 'User Profile Context',
            source_type: 'database',
            enabled: true
          },
          {
            source_id: 'document_history_context',
            source_name: 'Document History Context',
            source_type: 'database',
            enabled: true
          }
        ],
        enable_external_source_integration: value.enable_external_sources ?? false,
        enable_rag_integration: value.enable_rag ?? true,
        enable_baseline_integration: value.enable_baseline ?? true
      },
      enable_access_control: value.enable_access_control ?? true,
      enable_freshness_validation: value.enable_freshness_validation ?? true,
      freshness_threshold: value.freshness_threshold || 86400000, // 24 hours
      required_permissions: value.required_permissions || ['read'],
      context_size_limit: value.context_size_limit || 10 * 1024 * 1024 // 10MB
    }

    logger.info('[CONTEXT-ORCHESTRATOR-API] Starting enhanced context gathering', {
      requestId: request.request_id,
      templateId: request.template_id,
      projectId: request.project_id,
      userId: request.user_id
    })

    const result = await contextOrchestrator.gatherContextWithValidation(request)

    logger.info('[CONTEXT-ORCHESTRATOR-API] Enhanced context gathering completed', {
      requestId: request.request_id,
      success: true,
      totalSources: result.metrics.total_sources_attempted,
      successfulSources: result.metrics.successful_sources,
      totalDataSize: result.metrics.total_data_size_bytes,
      processingTime: result.metrics.total_processing_time_ms,
      warningsCount: result.warnings.length,
      errorsCount: result.errors.length
    })

    res.json({
      success: true,
      data: result,
      metadata: {
        request_id: request.request_id,
        processing_time_ms: result.metrics.total_processing_time_ms,
        total_sources: result.metrics.total_sources_attempted,
        successful_sources: result.metrics.successful_sources,
        total_data_size_bytes: result.metrics.total_data_size_bytes
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('[CONTEXT-ORCHESTRATOR-API] Enhanced context gathering failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })

    res.status(500).json({
      success: false,
      error: 'Context gathering failed',
      details: errorMessage
    })
  }
})

/**
 * POST /api/context-orchestrator/inject
 * Enhanced context injection with validation and logging
 */
router.post('/inject', async (req: Request, res: Response) => {
  try {
    const request: ContextInjectionRequest = {
      template_id: req.body.template_id,
      project_id: req.body.project_id,
      user_id: req.body.user_id || req.user?.id,
      variables: req.body.variables || {},
      config_override: req.body.config_override
    }

    logger.info('[CONTEXT-ORCHESTRATOR-API] Starting enhanced context injection', {
      templateId: request.template_id,
      projectId: request.project_id,
      userId: request.user_id
    })

    const result = await contextOrchestrator.injectContextWithValidation(request)

    logger.info('[CONTEXT-ORCHESTRATOR-API] Enhanced context injection completed', {
      templateId: request.template_id,
      success: result.success,
      bundleId: result.bundle.bundle_id
    })

    res.json({
      success: true,
      data: result
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('[CONTEXT-ORCHESTRATOR-API] Enhanced context injection failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })

    res.status(500).json({
      success: false,
      error: 'Context injection failed',
      details: errorMessage
    })
  }
})

/**
 * GET /api/context-orchestrator/health
 * Get context orchestrator health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    logger.info('[CONTEXT-ORCHESTRATOR-API] Getting health status')

    const healthStatus = await contextOrchestrator.getHealthStatus()

    logger.info('[CONTEXT-ORCHESTRATOR-API] Health status retrieved', {
      overallHealth: healthStatus.overall_health
    })

    res.json({
      success: true,
      data: healthStatus
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('[CONTEXT-ORCHESTRATOR-API] Failed to get health status', {
      error: errorMessage
    })

    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      details: errorMessage
    })
  }
})

/**
 * GET /api/context-orchestrator/metrics
 * Get context gathering metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { 
      start_date, 
      end_date, 
      request_id,
      limit = 100,
      offset = 0 
    } = req.query

    logger.info('[CONTEXT-ORCHESTRATOR-API] Getting context metrics', {
      startDate: start_date,
      endDate: end_date,
      requestId: request_id,
      limit,
      offset
    })

    // Build query conditions
    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (start_date) {
      conditions.push(`created_at >= $${paramIndex}`)
      values.push(start_date)
      paramIndex++
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex}`)
      values.push(end_date)
      paramIndex++
    }

    if (request_id) {
      conditions.push(`request_id = $${paramIndex}`)
      values.push(request_id)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Add limit and offset with proper parameterization
    values.push(parseInt(limit as string), parseInt(offset as string))
    const limitParamIndex = values.length - 1
    const offsetParamIndex = values.length

    const query = `
      SELECT * FROM context_gathering_metrics 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `

    const { pool } = require('../database/connection')
    const result = await pool.query(query, values)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM context_gathering_metrics 
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, values.slice(0, -2))
    const total = parseInt(countResult.rows[0].total)

    logger.info('[CONTEXT-ORCHESTRATOR-API] Context metrics retrieved', {
      count: result.rows.length,
      total
    })

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        has_more: parseInt(offset as string) + result.rows.length < total
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('[CONTEXT-ORCHESTRATOR-API] Failed to get context metrics', {
      error: errorMessage
    })

    res.status(500).json({
      success: false,
      error: 'Failed to get context metrics',
      details: errorMessage
    })
  }
})

/**
 * GET /api/context-orchestrator/source-logs
 * Get context source logs
 */
router.get('/source-logs', async (req: Request, res: Response) => {
  try {
    const { 
      source_id,
      source_type,
      start_date, 
      end_date,
      success,
      limit = 100,
      offset = 0 
    } = req.query

    logger.info('[CONTEXT-ORCHESTRATOR-API] Getting context source logs', {
      sourceId: source_id,
      sourceType: source_type,
      startDate: start_date,
      endDate: end_date,
      success,
      limit,
      offset
    })

    // Build query conditions
    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (source_id) {
      conditions.push(`source_id = $${paramIndex}`)
      values.push(source_id)
      paramIndex++
    }

    if (source_type) {
      conditions.push(`source_type = $${paramIndex}`)
      values.push(source_type)
      paramIndex++
    }

    if (start_date) {
      conditions.push(`retrieval_timestamp >= $${paramIndex}`)
      values.push(start_date)
      paramIndex++
    }

    if (end_date) {
      conditions.push(`retrieval_timestamp <= $${paramIndex}`)
      values.push(end_date)
      paramIndex++
    }

    if (success !== undefined) {
      conditions.push(`success = $${paramIndex}`)
      values.push(success === 'true')
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Add limit and offset with proper parameterization
    values.push(parseInt(limit as string), parseInt(offset as string))
    const limitParamIndex = values.length - 1
    const offsetParamIndex = values.length

    const query = `
      SELECT * FROM context_source_logs 
      ${whereClause}
      ORDER BY retrieval_timestamp DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `

    const { pool } = require('../database/connection')
    const result = await pool.query(query, values)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM context_source_logs 
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, values.slice(0, -2))
    const total = parseInt(countResult.rows[0].total)

    logger.info('[CONTEXT-ORCHESTRATOR-API] Context source logs retrieved', {
      count: result.rows.length,
      total
    })

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        has_more: parseInt(offset as string) + result.rows.length < total
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('[CONTEXT-ORCHESTRATOR-API] Failed to get context source logs', {
      error: errorMessage
    })

    res.status(500).json({
      success: false,
      error: 'Failed to get context source logs',
      details: errorMessage
    })
  }
})

export default router