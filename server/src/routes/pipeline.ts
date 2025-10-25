/**
 * Pipeline API Routes
 * Exposes the 6-stage document processing pipeline to the frontend
 */

import express from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import Joi from 'joi'
import { logger, childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import { v4 as uuidv4 } from 'uuid'
import { PipelineOrchestrator } from '../modules/multiStageDocumentProcessor/services/pipelineOrchestrator'
import { addJob, getJobStatus as getQueueJobStatus } from '../services/queueService'
import AnalyticsTrackingService from '../services/analyticsTrackingService'

const router = express.Router()
const pipelineOrchestrator = new PipelineOrchestrator()

/**
 * GET /api/pipeline/health
 * Health check endpoint (no auth required)
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Pipeline API is operational',
    timestamp: new Date(),
    queuesConnected: true
  })
})

/**
 * POST /api/pipeline/start
 * Start a new pipeline processing job
 */
router.post('/start',
  authenticateToken,
  requirePermission('documents.create'),
  validate(Joi.object({
    templateId: Joi.string().uuid().required(),
    projectId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().optional(),
    contextBundle: Joi.object().optional(),
    processingConfig: Joi.object({
      enableParallelProcessing: Joi.boolean().default(false),
      enableQualityGates: Joi.boolean().default(true),
      enableRefinement: Joi.boolean().default(true),
      enablePersonalization: Joi.boolean().default(true),
      maxProcessingTime: Joi.number().default(300000),
      retryAttempts: Joi.number().default(3)
    }).optional(),
    enhancementConfig: Joi.object().optional(),
    qualityConfig: Joi.object().optional(),
    outputConfig: Joi.object({
      primary_format: Joi.string().valid('markdown', 'pdf', 'docx', 'html').default('markdown'),
      secondary_formats: Joi.array().items(Joi.string().valid('pdf', 'docx', 'html')).default([]),
      include_metadata: Joi.boolean().default(true)
    }).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const {
        templateId,
        projectId,
        userId,
        contextBundle,
        processingConfig,
        enhancementConfig,
        qualityConfig,
        outputConfig
      } = req.body

      const user = (req as any).user
      const actualUserId = userId || user.id

      log.info('Starting pipeline processing', {
        templateId,
        projectId,
        userId: actualUserId
      })

      // Create job ID and request ID
      const jobId = uuidv4()
      const requestId = uuidv4()

      // Create pipeline execution record
      const executionResult = await pool.query(
        `
        INSERT INTO pipeline_executions (
          job_id, request_id, template_id, project_id, user_id,
          status, progress, current_stage, stages_completed, stages_remaining,
          started_at, created_at, updated_at,
          processing_config, enhancement_config, quality_config, output_config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
        `,
        [
          jobId,
          requestId,
          templateId,
          projectId,
          actualUserId,
          'pending',
          0,
          null,
          [],
          ['context_gathering', 'template_processing', 'ai_generation', 'context_injection', 'quality_assurance', 'output_formatting'],
          new Date(),
          new Date(),
          new Date(),
          JSON.stringify(processingConfig || {}),
          JSON.stringify(enhancementConfig || {}),
          JSON.stringify(qualityConfig || {}),
          JSON.stringify(outputConfig || {})
        ]
      )

      const execution = executionResult.rows[0]

      // Add job to queue for async processing
      await addJob('pipeline-processing', {
        jobId,
        requestId,
        templateId,
        projectId,
        userId: actualUserId,
        contextBundle,
        processingConfig,
        enhancementConfig,
        qualityConfig,
        outputConfig
      }, {
        priority: 5,
        attempts: processingConfig?.retryAttempts || 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      })

      log.info('Pipeline job created and queued', { jobId, requestId })

      // Return job information
      res.status(201).json({
        success: true,
        data: {
          jobId: execution.job_id,
          requestId: execution.request_id,
          templateId: execution.template_id,
          projectId: execution.project_id,
          userId: execution.user_id,
          status: execution.status,
          progress: execution.progress,
          currentStage: execution.current_stage,
          stages: [
            { id: 'context_gathering', name: 'Context Gathering', status: 'pending', progress: 0 },
            { id: 'template_processing', name: 'Template Processing', status: 'pending', progress: 0 },
            { id: 'ai_generation', name: 'AI Generation', status: 'pending', progress: 0 },
            { id: 'context_injection', name: 'Context Injection', status: 'pending', progress: 0 },
            { id: 'quality_assurance', name: 'Quality Assurance', status: 'pending', progress: 0 },
            { id: 'output_formatting', name: 'Output Formatting', status: 'pending', progress: 0 }
          ],
          createdAt: execution.created_at,
          startedAt: execution.started_at
        }
      })

    } catch (error) {
      log.error('Error starting pipeline processing:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to start pipeline processing',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pipeline/job/:jobId/status
 * Get the status of a pipeline job
 */
router.get('/job/:jobId/status',
  authenticateToken,
  requirePermission('documents.read'),
  validateParams(Joi.object({ jobId: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { jobId } = req.params

      // Get pipeline execution from database
      const result = await pool.query(
        `
        SELECT 
          pe.*,
          json_agg(
            json_build_object(
              'stage_id', se.stage_id,
              'stage_type', se.stage_type,
              'status', se.status,
              'progress', CASE WHEN se.status = 'completed' THEN 100 WHEN se.status = 'running' THEN 50 ELSE 0 END,
              'quality_score', se.quality_score,
              'execution_time', se.execution_time,
              'started_at', se.started_at,
              'completed_at', se.completed_at,
              'error', se.error_message
            ) ORDER BY se.created_at
          ) FILTER (WHERE se.stage_id IS NOT NULL) as stages
        FROM pipeline_executions pe
        LEFT JOIN stage_executions se ON pe.job_id = se.job_id
        WHERE pe.job_id = $1
        GROUP BY pe.job_id
        `,
        [jobId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Pipeline job not found'
        })
      }

      const execution = result.rows[0]
      
      // Build stages array with current status
      const stageDefinitions = [
        { id: 'context_gathering', name: 'Context Gathering', description: 'Gathering context from various sources' },
        { id: 'template_processing', name: 'Template Processing', description: 'Processing and enhancing template' },
        { id: 'ai_generation', name: 'AI Generation', description: 'Generating content with AI' },
        { id: 'context_injection', name: 'Context Injection', description: 'Injecting context into document' },
        { id: 'quality_assurance', name: 'Quality Assurance', description: 'Assessing document quality' },
        { id: 'output_formatting', name: 'Output Formatting', description: 'Formatting final output' }
      ]

      const stages = stageDefinitions.map(stageDef => {
        const stageExecution = (execution.stages || []).find(s => s.stage_id === stageDef.id)
        return {
          id: stageDef.id,
          name: stageDef.name,
          description: stageDef.description,
          status: stageExecution?.status || 'pending',
          progress: stageExecution?.progress || 0,
          qualityScore: stageExecution?.quality_score,
          executionTime: stageExecution?.execution_time,
          startedAt: stageExecution?.started_at,
          completedAt: stageExecution?.completed_at,
          error: stageExecution?.error
        }
      })

      res.json({
        success: true,
        data: {
          jobId: execution.job_id,
          requestId: execution.request_id,
          templateId: execution.template_id,
          projectId: execution.project_id,
          userId: execution.user_id,
          status: execution.status,
          progress: execution.progress || 0,
          currentStage: execution.current_stage,
          stages,
          createdAt: execution.created_at,
          startedAt: execution.started_at,
          completedAt: execution.completed_at,
          totalDuration: execution.completed_at 
            ? new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()
            : null,
          overallQualityScore: execution.overall_quality_score,
          error: execution.error
        }
      })

    } catch (error) {
      log.error('Error getting pipeline job status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline job status',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/pipeline/job/:jobId/cancel
 * Cancel a running pipeline job
 */
router.post('/job/:jobId/cancel',
  authenticateToken,
  requirePermission('documents.delete'),
  validateParams(Joi.object({ jobId: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { jobId } = req.params

      await pipelineOrchestrator.cancelPipeline(jobId)

      log.info('Pipeline job cancelled', { jobId })

      res.json({
        success: true,
        message: 'Pipeline job cancelled successfully'
      })

    } catch (error) {
      log.error('Error cancelling pipeline job:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to cancel pipeline job',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pipeline/jobs
 * Get all pipeline jobs for the current user
 */
router.get('/jobs',
  authenticateToken,
  requirePermission('documents.read'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const user = (req as any).user
      const { page = 1, limit = 20, status } = req.query

      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT 
          pe.*,
          t.name as template_name,
          p.name as project_name,
          COUNT(*) OVER() as total_count
        FROM pipeline_executions pe
        LEFT JOIN templates t ON pe.template_id = t.id
        LEFT JOIN projects p ON pe.project_id = p.id
        WHERE pe.user_id = $1
      `
      
      const params: any[] = [user.id]
      
      if (status) {
        query += ` AND pe.status = $${params.length + 1}`
        params.push(status)
      }

      query += ` ORDER BY pe.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(Number(limit), offset)

      const result = await pool.query(query, params)

      const jobs = result.rows.map(row => ({
        jobId: row.job_id,
        requestId: row.request_id,
        templateId: row.template_id,
        templateName: row.template_name,
        projectId: row.project_id,
        projectName: row.project_name,
        userId: row.user_id,
        status: row.status,
        progress: row.progress || 0,
        currentStage: row.current_stage,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        overallQualityScore: row.overall_quality_score
      }))

      const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0

      res.json({
        success: true,
        data: jobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / Number(limit))
        }
      })

    } catch (error) {
      log.error('Error getting pipeline jobs:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline jobs',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pipeline/metrics
 * Get pipeline processing metrics
 */
router.get('/metrics',
  authenticateToken,
  requirePermission('documents.read'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const user = (req as any).user

      const result = await pool.query(
        `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
          COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
          AVG(overall_quality_score) FILTER (WHERE overall_quality_score IS NOT NULL) as avg_quality_score,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) FILTER (WHERE completed_at IS NOT NULL) as avg_duration_ms
        FROM pipeline_executions
        WHERE user_id = $1
        `,
        [user.id]
      )

      const metrics = result.rows[0]

      res.json({
        success: true,
        data: {
          totalJobs: Number(metrics.total_jobs),
          completedJobs: Number(metrics.completed_jobs),
          failedJobs: Number(metrics.failed_jobs),
          runningJobs: Number(metrics.running_jobs),
          averageQualityScore: metrics.avg_quality_score ? parseFloat(metrics.avg_quality_score) : null,
          averageDuration: metrics.avg_duration_ms ? parseFloat(metrics.avg_duration_ms) : null
        }
      })

    } catch (error) {
      log.error('Error getting pipeline metrics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline metrics',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pipeline/job/:jobId/stage/:stageId
 * Get detailed information about a specific stage
 */
router.get('/job/:jobId/stage/:stageId',
  authenticateToken,
  requirePermission('documents.read'),
  validateParams(Joi.object({
    jobId: Joi.string().uuid().required(),
    stageId: Joi.string().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { jobId, stageId } = req.params

      const result = await pool.query(
        `
        SELECT * FROM stage_executions
        WHERE job_id = $1 AND stage_id = $2
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [jobId, stageId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Stage execution not found'
        })
      }

      const stage = result.rows[0]

      res.json({
        success: true,
        data: {
          jobId: stage.job_id,
          stageId: stage.stage_id,
          stageType: stage.stage_type,
          status: stage.status,
          executionTime: stage.execution_time,
          qualityScore: stage.quality_score,
          inputData: stage.input_data,
          outputData: stage.output_data,
          startedAt: stage.started_at,
          completedAt: stage.completed_at,
          error: stage.error_message
        }
      })

    } catch (error) {
      log.error('Error getting stage details:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get stage details',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pipeline/templates
 * Get available templates for pipeline processing
 */
router.get('/templates',
  authenticateToken,
  requirePermission('templates.read'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const result = await pool.query(
        `
        SELECT 
          id, 
          name, 
          description, 
          category, 
          framework, 
          is_public, 
          created_at,
          development_status,
          validation_count,
          success_count,
          CASE 
            WHEN validation_count = 0 THEN 0
            ELSE ROUND((success_count::NUMERIC / validation_count::NUMERIC * 100), 2)
          END as success_rate,
          last_validated_at
        FROM templates
        WHERE deleted_at IS NULL
        ORDER BY 
          CASE development_status
            WHEN 'production' THEN 1
            WHEN 'validated' THEN 2
            WHEN 'testing' THEN 3
            WHEN 'compliance' THEN 4
            WHEN 'draft' THEN 5
            ELSE 6
          END,
          name
        `
      )

      // Calculate health rating for each template
      const templatesWithHealth = result.rows.map(template => {
        let health_rating = null
        if (template.validation_count > 0 && template.success_rate !== null) {
          if (template.success_rate >= 90) {
            health_rating = 'Excellent'
          } else if (template.success_rate >= 80) {
            health_rating = 'Good'
          } else if (template.success_rate >= 70) {
            health_rating = 'Fair'
          } else {
            health_rating = 'Needs Improvement'
          }
        }
        return {
          ...template,
          health_rating
        }
      })

      res.json({
        success: true,
        data: templatesWithHealth
      })

    } catch (error) {
      log.error('Error getting templates:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get templates',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pipeline/projects
 * Get available projects for pipeline processing
 */
router.get('/projects',
  authenticateToken,
  requirePermission('projects.read'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const user = (req as any).user

      const result = await pool.query(
        `
        SELECT p.id, p.name, p.description, p.status, p.created_at
        FROM projects p
        WHERE p.created_by = $1 OR p.owner_id = $1
        ORDER BY p.name
        `,
        [user.id]
      )

      res.json({
        success: true,
        data: result.rows
      })

    } catch (error) {
      log.error('Error getting projects:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get projects',
        message: error.message
      })
    }
  }
)

export default router
