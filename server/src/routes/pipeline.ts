/**
 * Pipeline API Routes
 * Handles requests for the 6-stage document processing pipeline
 */

import { Router } from 'express'
import { logger } from '../utils/logger'
import { MultiStageDocumentProcessor } from '../modules/multiStageDocumentProcessor'
import { ContextRepository } from '../modules/contextRepository'
import { ContextRetrievalService } from '../modules/contextRetrieval'
import { HistoricalAnalysisService } from '../modules/historicalAnalysis'
import { ContextBundle } from '../modules/contextBundle'
import { ContextFreshnessManager } from '../modules/contextFreshness'
import { ContextAccessControlManager } from '../modules/contextAccessControl'
import { EnhancedTemplateProcessor } from '../modules/enhancedTemplateProcessor'
import { pool } from '../database/connection'

const router = Router()

// Initialize services
const multiStageProcessor = new MultiStageDocumentProcessor({
  enableParallelProcessing: true,
  enableQualityGates: true,
  enableRefinement: true,
  maxProcessingTime: 300000, // 5 minutes
  defaultRetryAttempts: 3,
  qualityThresholds: {
    structureQuality: 0.8,
    contentQuality: 0.8,
    methodologyCompliance: 0.8,
    aiEnhancementQuality: 0.8,
    overallQuality: 0.8
  }
})

const contextRepository = new ContextRepository()
const contextRetrievalService = new ContextRetrievalService({
  enableSemanticSearch: true,
  enableKeywordSearch: true,
  enableRelevanceScoring: true,
  maxResults: 50,
  similarityThreshold: 0.7
})

const historicalAnalysisService = new HistoricalAnalysisService({
  minPatternFrequency: 0.3,
  minConfidence: 0.7,
  enableLearning: true,
  learningThreshold: 0.8,
  maxAnalysisDepth: 5,
  enableTrendAnalysis: true,
  trendAnalysisWindow: 30,
  enableBestPracticeExtraction: true,
  bestPracticeThreshold: 0.8,
  enableQualityAssessment: true,
  qualityAssessmentCriteria: ['completeness', 'accuracy', 'clarity'],
  enableComplianceCheck: true,
  complianceStandards: ['ISO', 'PMI', 'BABOK'],
  enableRecommendationGeneration: true,
  recommendationThreshold: 0.7,
  maxRecommendations: 10,
  enablePerformanceTracking: true,
  performanceTrackingWindow: 7
})
const contextFreshnessManager = new ContextFreshnessManager({
  defaultRefreshInterval: 3600,
  maxContextAge: 86400,
  enableAutomaticRefresh: true,
  enableStalenessDetection: true,
  stalenessThreshold: 0.5,
  enablePriorityBasedRefresh: true,
  enableTimeBasedPrioritization: true,
  enablePolicyBasedManagement: true,
  enableAnalytics: true,
  enableHealthMonitoring: true,
  healthCheckInterval: 300,
  enablePerformanceOptimization: true,
  enableCostOptimization: false,
  enableComplianceMonitoring: true,
  enableAuditLogging: true,
  enableAlerting: true,
  alertThresholds: {
    staleness: 0.7,
    performance: 0.8,
    health: 0.6
  }
})

const contextAccessControlManager = new ContextAccessControlManager({
  enableRoleBasedAccess: true,
  enablePermissionBasedAccess: true,
  enableSecurityLevels: true,
  enableContextBasedAccess: true,
  enablePolicyBasedAccess: true,
  enableAuditLogging: true,
  enableAccessMonitoring: true,
  enableComplianceChecking: true,
  enableRiskAssessment: true,
  defaultSecurityLevel: 'medium',
  sessionTimeout: 3600,
  maxFailedAttempts: 3,
  lockoutDuration: 900,
  enableEncryption: true,
  enableDataMasking: false,
  enableAccessAnalytics: true,
  enablePerformanceMonitoring: true
})

const enhancedTemplateProcessor = new EnhancedTemplateProcessor({
  enableAIInsights: true,
  enableMethodologyAlignment: true,
  enableQualityOptimization: true,
  enablePerformanceOptimization: true,
  maxProcessingTime: 300000,
  defaultRetryAttempts: 3,
  qualityThresholds: {
    structureQuality: 0.8,
    contentQuality: 0.8,
    methodologyCompliance: 0.8,
    aiEnhancementQuality: 0.8,
    overallQuality: 0.8
  }
})

/**
 * POST /api/pipeline/start
 * Start a new pipeline processing job
 */
router.post('/start', async (req, res) => {
  try {
    const {
      templateId,
      projectId,
      userId,
      contextBundle,
      processingConfig,
      enhancementConfig,
      qualityConfig
    } = req.body

    logger.info('Starting pipeline processing', {
      templateId,
      projectId,
      userId
    })

    // Validate required fields
    if (!templateId || !projectId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: templateId, projectId, userId'
      })
    }

    // Create processing request
    const request = {
      request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      template_id: templateId,
      project_id: projectId,
      user_id: userId,
      context_bundle: contextBundle || {},
      processing_config: processingConfig || {
        enable_ai_enhancement: true,
        enable_methodology_alignment: true,
        enable_quality_optimization: true,
        enable_performance_optimization: true,
        max_processing_time: 300000,
        retry_attempts: 3,
        quality_thresholds: {
          structure_quality: 0.8,
          content_quality: 0.8,
          methodology_compliance: 0.8,
          ai_enhancement_quality: 0.8,
          overall_quality: 0.8
        }
      },
      enhancement_config: enhancementConfig || {
        ai_insights_enabled: true,
        methodology_alignment_enabled: true,
        content_enhancement_enabled: true,
        variable_optimization_enabled: true,
        structure_optimization_enabled: true,
        enhancement_strategies: [
          {
            strategy_id: 'ai_insights',
            strategy_name: 'AI Insights',
            strategy_type: 'ai_insights',
            enabled: true,
            priority: 1,
            config: {}
          }
        ]
      },
      quality_config: qualityConfig || {
        enable_structure_validation: true,
        enable_content_validation: true,
        enable_methodology_validation: true,
        enable_ai_validation: true,
        quality_gates: [],
        validation_criteria: {}
      },
      metadata: {
        created_at: new Date().toISOString(),
        user_agent: req.get('User-Agent'),
        ip_address: req.ip
      }
    }

    // Start processing
    const job = await multiStageProcessor.processDocument(request)

    logger.info('Pipeline processing started successfully', {
      jobId: job.job_id,
      requestId: request.request_id
    })

    res.json({
      jobId: job.job_id,
      requestId: request.request_id,
      status: job.status,
      progress: job.progress,
      currentStage: job.current_stage,
      stages: job.stages || [],
      createdAt: job.created_at,
      metadata: job.metadata
    })

  } catch (error) {
    logger.error('Failed to start pipeline processing', {
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      error: 'Failed to start pipeline processing',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/job/:jobId/status
 * Get the status of a specific job
 */
router.get('/job/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params

    logger.debug('Getting job status', { jobId })

    const status = await multiStageProcessor.getJobStatus(jobId)

    res.json({
      jobId: status.job_id,
      status: status.status,
      progress: status.progress,
      currentStage: status.current_stage,
      stagesCompleted: status.stages_completed,
      stagesRemaining: status.stages_remaining,
      estimatedCompletion: status.estimated_completion,
      error: status.error,
      createdAt: status.created_at,
      startedAt: status.started_at,
      completedAt: status.completed_at
    })

  } catch (error) {
    logger.error('Failed to get job status', {
      jobId: req.params.jobId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    })
  }
})

/**
 * POST /api/pipeline/job/:jobId/cancel
 * Cancel a running job
 */
router.post('/job/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params

    logger.info('Cancelling job', { jobId })

    await multiStageProcessor.cancelJob(jobId)

    res.json({
      message: 'Job cancelled successfully',
      jobId
    })

  } catch (error) {
    logger.error('Failed to cancel job', {
      jobId: req.params.jobId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/jobs
 * Get all jobs
 */
router.get('/jobs', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, userId } = req.query

    logger.debug('Getting jobs', { limit, offset, status, userId })

    let query = `
      SELECT 
        job_id,
        request_id,
        template_id,
        project_id,
        user_id,
        status,
        progress,
        current_stage,
        stages_completed,
        stages_remaining,
        error,
        created_at,
        started_at,
        completed_at,
        metadata
      FROM document_processing_jobs
      WHERE 1=1
    `

    const params: any[] = []
    let paramCount = 0

    if (status) {
      paramCount++
      query += ` AND status = $${paramCount}`
      params.push(status)
    }

    if (userId) {
      paramCount++
      query += ` AND user_id = $${paramCount}`
      params.push(userId)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    const jobs = result.rows.map(row => ({
      jobId: row.job_id,
      requestId: row.request_id,
      templateId: row.template_id,
      projectId: row.project_id,
      userId: row.user_id,
      status: row.status,
      progress: row.progress,
      currentStage: row.current_stage,
      stagesCompleted: row.stages_completed || [],
      stagesRemaining: row.stages_remaining || [],
      error: row.error,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      metadata: row.metadata || {}
    }))

    res.json(jobs)

  } catch (error) {
    logger.error('Failed to get jobs', {
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to get jobs',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/metrics
 * Get pipeline metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    logger.debug('Getting pipeline metrics')

    // Get job statistics
    const jobStatsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(progress) as avg_progress,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
      FROM document_processing_jobs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status
    `)

    const jobStats = jobStatsResult.rows.reduce((acc, row) => {
      acc[row.status] = {
        count: parseInt(row.count),
        avgProgress: parseFloat(row.avg_progress) || 0,
        avgDuration: parseFloat(row.avg_duration) || 0
      }
      return acc
    }, {})

    // Get stage performance
    const stageStatsResult = await pool.query(`
      SELECT 
        stage_name,
        COUNT(*) as count,
        AVG(quality_score) as avg_quality,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
      FROM stage_executions
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY stage_name
    `)

    const stageStats = stageStatsResult.rows.reduce((acc, row) => {
      acc[row.stage_name] = {
        count: parseInt(row.count),
        avgQuality: parseFloat(row.avg_quality) || 0,
        avgDuration: parseFloat(row.avg_duration) || 0
      }
      return acc
    }, {})

    // Get quality trends
    const qualityTrendsResult = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        AVG(quality_score) as avg_quality
      FROM stage_executions
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour
    `)

    const qualityTrends = qualityTrendsResult.rows.map(row => ({
      hour: row.hour,
      avgQuality: parseFloat(row.avg_quality) || 0
    }))

    res.json({
      jobStats,
      stageStats,
      qualityTrends,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to get pipeline metrics', {
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to get pipeline metrics',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/job/:jobId/stage/:stageId
 * Get stage details
 */
router.get('/job/:jobId/stage/:stageId', async (req, res) => {
  try {
    const { jobId, stageId } = req.params

    logger.debug('Getting stage details', { jobId, stageId })

    const result = await pool.query(`
      SELECT *
      FROM stage_executions
      WHERE job_id = $1 AND stage_name = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [jobId, stageId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Stage not found'
      })
    }

    const stage = result.rows[0]

    res.json({
      jobId: stage.job_id,
      stageId: stage.stage_name,
      status: stage.status,
      progress: stage.progress,
      qualityScore: stage.quality_score,
      startedAt: stage.started_at,
      completedAt: stage.completed_at,
      duration: stage.duration,
      results: stage.results,
      error: stage.error,
      metadata: stage.metadata
    })

  } catch (error) {
    logger.error('Failed to get stage details', {
      jobId: req.params.jobId,
      stageId: req.params.stageId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to get stage details',
      message: error.message
    })
  }
})

/**
 * POST /api/pipeline/job/:jobId/stage/:stageId/retry
 * Retry a failed stage
 */
router.post('/job/:jobId/stage/:stageId/retry', async (req, res) => {
  try {
    const { jobId, stageId } = req.params

    logger.info('Retrying stage', { jobId, stageId })

    // This would trigger a retry of the specific stage
    // Implementation depends on the MultiStageDocumentProcessor retry logic

    res.json({
      message: 'Stage retry initiated',
      jobId,
      stageId
    })

  } catch (error) {
    logger.error('Failed to retry stage', {
      jobId: req.params.jobId,
      stageId: req.params.stageId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to retry stage',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/job/:jobId/logs
 * Get job logs
 */
router.get('/job/:jobId/logs', async (req, res) => {
  try {
    const { jobId } = req.params

    logger.debug('Getting job logs', { jobId })

    const result = await pool.query(`
      SELECT *
      FROM stage_executions
      WHERE job_id = $1
      ORDER BY created_at ASC
    `, [jobId])

    const logs = result.rows.map(row => ({
      stageId: row.stage_name,
      status: row.status,
      progress: row.progress,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      error: row.error,
      metadata: row.metadata
    }))

    res.json({
      jobId,
      logs,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to get job logs', {
      jobId: req.params.jobId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to get job logs',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/job/:jobId/stage/:stageId/logs
 * Get stage logs
 */
router.get('/job/:jobId/stage/:stageId/logs', async (req, res) => {
  try {
    const { jobId, stageId } = req.params

    logger.debug('Getting stage logs', { jobId, stageId })

    const result = await pool.query(`
      SELECT *
      FROM stage_executions
      WHERE job_id = $1 AND stage_name = $2
      ORDER BY created_at ASC
    `, [jobId, stageId])

    const logs = result.rows.map(row => ({
      status: row.status,
      progress: row.progress,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      error: row.error,
      results: row.results,
      metadata: row.metadata
    }))

    res.json({
      jobId,
      stageId,
      logs,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Failed to get stage logs', {
      jobId: req.params.jobId,
      stageId: req.params.stageId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to get stage logs',
      message: error.message
    })
  }
})

/**
 * GET /api/pipeline/job/:jobId/export
 * Export job results
 */
router.get('/job/:jobId/export', async (req, res) => {
  try {
    const { jobId } = req.params
    const { format = 'json' } = req.query

    logger.info('Exporting job results', { jobId, format })

    // Get job data
    const jobResult = await pool.query(`
      SELECT *
      FROM document_processing_jobs
      WHERE job_id = $1
    `, [jobId])

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Job not found'
      })
    }

    const job = jobResult.rows[0]

    // Get stage data
    const stageResult = await pool.query(`
      SELECT *
      FROM stage_executions
      WHERE job_id = $1
      ORDER BY created_at ASC
    `, [jobId])

    const stages = stageResult.rows

    const exportData = {
      jobId: job.job_id,
      requestId: job.request_id,
      templateId: job.template_id,
      projectId: job.project_id,
      userId: job.user_id,
      status: job.status,
      progress: job.progress,
      currentStage: job.current_stage,
      stages: stages.map(stage => ({
        stageId: stage.stage_name,
        status: stage.status,
        progress: stage.progress,
        qualityScore: stage.quality_score,
        startedAt: stage.started_at,
        completedAt: stage.completed_at,
        duration: stage.duration,
        results: stage.results,
        error: stage.error,
        metadata: stage.metadata
      })),
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      metadata: job.metadata,
      exportedAt: new Date().toISOString()
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="pipeline-job-${jobId}.json"`)
      res.json(exportData)
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="pipeline-job-${jobId}.csv"`)
      res.send(csv)
    } else {
      res.status(400).json({
        error: 'Unsupported export format',
        supportedFormats: ['json', 'csv']
      })
    }

  } catch (error) {
    logger.error('Failed to export job results', {
      jobId: req.params.jobId,
      error: error.message
    })

    res.status(500).json({
      error: 'Failed to export job results',
      message: error.message
    })
  }
})

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data: any): string {
  const headers = ['Job ID', 'Status', 'Progress', 'Current Stage', 'Created At', 'Completed At']
  const rows = [headers.join(',')]

  const row = [
    data.jobId,
    data.status,
    data.progress,
    data.currentStage || '',
    data.createdAt,
    data.completedAt || ''
  ]

  rows.push(row.join(','))

  return rows.join('\n')
}

export default router

