/**
 * Multi-Stage Document Processor
 * Orchestrates the 6-stage document processing pipeline
 */

import { logger } from '../../utils/logger'
import { randomUUID } from 'crypto'
import { pool } from '../../database/connection'
import { ContextGatheringStage } from './stages/contextGatheringStage'
import { TemplateProcessingStage } from './stages/templateProcessingStage'
import { AIGenerationStage } from './stages/aiGenerationStage'
import { ContextInjectionStage } from './stages/contextInjectionStage'
import { QualityAssuranceStage } from './stages/qualityAssuranceStage'
import { OutputFormattingStage } from './stages/outputFormattingStage'
import { PipelineOrchestrator } from './services/pipelineOrchestrator'
import { JobManager } from './services/jobManager'
import { MetricsCollector } from './services/metricsCollector'
import type {
  MultiStageDocumentProcessor as IMultiStageDocumentProcessor,
  DocumentProcessingRequest,
  DocumentProcessingResult,
  DocumentProcessingJob,
  ProcessingStatus,
  StageInput,
  StageOutput,
  StageJob,
  PipelineConfig,
  ValidationResult,
  ProcessingMetrics,
  StageMetrics,
  StageType,
  ProcessingHistory,
  ProcessingHistoryFilters
} from './types'

export interface MultiStageDocumentProcessorConfig {
  enableParallelProcessing: boolean
  enableQualityGates: boolean
  enableMonitoring: boolean
  maxProcessingTime: number
  defaultRetryAttempts: number
  jobTimeout: number
  maxConcurrentJobs: number
  enableMetricsCollection: boolean
  enableErrorTracking: boolean
}

export class MultiStageDocumentProcessor implements IMultiStageDocumentProcessor {
  private contextGatheringStage: ContextGatheringStage
  private templateProcessingStage: TemplateProcessingStage
  private aiGenerationStage: AIGenerationStage
  private contextInjectionStage: ContextInjectionStage
  private qualityAssuranceStage: QualityAssuranceStage
  private outputFormattingStage: OutputFormattingStage
  private pipelineOrchestrator: PipelineOrchestrator
  private jobManager: JobManager
  private metricsCollector: MetricsCollector
  private config: MultiStageDocumentProcessorConfig

  constructor(config: MultiStageDocumentProcessorConfig) {
    this.config = config
    this.contextGatheringStage = new ContextGatheringStage()
    this.templateProcessingStage = new TemplateProcessingStage()
    this.aiGenerationStage = new AIGenerationStage()
    this.contextInjectionStage = new ContextInjectionStage()
    this.qualityAssuranceStage = new QualityAssuranceStage()
    this.outputFormattingStage = new OutputFormattingStage()
    this.pipelineOrchestrator = new PipelineOrchestrator()
    this.jobManager = new JobManager()
    this.metricsCollector = new MetricsCollector()
  }

  async processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResult> {
    try {
      logger.info('Starting document processing', { 
        requestId: request.request_id,
        templateId: request.template_id,
        projectId: request.project_id,
        userId: request.user_id
      })

      const startTime = Date.now()

      // Validate request
      const validationResult = await this.validateProcessingRequest(request)
      if (!validationResult.valid) {
        throw new Error(`Invalid processing request: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      // Initialize processing job
      const job = await this.jobManager.createJob(request)
      
      // Execute pipeline stages
      const stageResults = await this.pipelineOrchestrator.executePipeline(request, job.job_id)

      // Collect final document
      const finalDocument = await this.collectFinalDocument(stageResults)

      // Generate quality report
      const qualityReport = await this.generateQualityReport(finalDocument, stageResults)

      // Calculate processing metrics
      const processingTime = Date.now() - startTime
      const processingMetrics = await this.calculateProcessingMetrics(request, stageResults, processingTime)

      // Update job status
      await this.jobManager.completeJob(job.job_id, {
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
        final_document: finalDocument,
        quality_report: qualityReport,
        processing_metrics: processingMetrics
      })

      // Collect metrics
      await this.metricsCollector.recordProcessingMetrics(request, stageResults, processingTime)

      const result: DocumentProcessingResult = {
        result_id: `result_${randomUUID()}`,
        request_id: request.request_id,
        status: {
          status: 'completed',
          progress: 100,
          stages_completed: stageResults.map(s => s.stage_id),
          stages_remaining: []
        },
        stages: stageResults,
        final_document: finalDocument,
        quality_report: qualityReport,
        processing_metrics: processingMetrics,
        metadata: {
          processing_time: processingTime,
          stages_count: stageResults.length,
          quality_score: qualityReport.overall_score
        }
      }

      logger.info('Document processing completed successfully', {
        requestId: request.request_id,
        processingTime,
        qualityScore: qualityReport.overall_score,
        stagesCompleted: stageResults.length
      })

      return result

    } catch (error) {
      logger.error('Document processing failed', {
        requestId: request.request_id,
        error: error.message
      })
      throw error
    }
  }

  async processDocumentAsync(request: DocumentProcessingRequest): Promise<DocumentProcessingJob> {
    try {
      logger.info('Starting async document processing', { 
        requestId: request.request_id,
        templateId: request.template_id,
        projectId: request.project_id,
        userId: request.user_id
      })

      // Validate request
      const validationResult = await this.validateProcessingRequest(request)
      if (!validationResult.valid) {
        throw new Error(`Invalid processing request: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      // Create async job
      const job = await this.jobManager.createAsyncJob(request)

      // Start processing in background
      this.processDocumentInBackground(request, job.job_id)

      logger.info('Async document processing job created', {
        jobId: job.job_id,
        requestId: request.request_id
      })

      return job

    } catch (error) {
      logger.error('Failed to start async document processing', {
        requestId: request.request_id,
        error: error.message
      })
      throw error
    }
  }

  async getProcessingStatus(jobId: string): Promise<ProcessingStatus> {
    try {
      logger.debug('Getting processing status', { jobId })

      const status = await this.jobManager.getJobStatus(jobId)

      logger.info('Processing status retrieved', {
        jobId,
        status: status.status,
        progress: status.progress
      })

      return status

    } catch (error) {
      logger.error('Failed to get processing status', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async cancelProcessing(jobId: string): Promise<void> {
    try {
      logger.info('Cancelling document processing', { jobId })

      await this.jobManager.cancelJob(jobId)

      logger.info('Document processing cancelled successfully', { jobId })

    } catch (error) {
      logger.error('Failed to cancel document processing', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async executeStage(stageId: string, input: StageInput): Promise<StageOutput> {
    const startTime = Date.now()
    try {
      logger.info('Executing stage', { stageId, stageType: input.stage_type })

      // Execute stage based on type
      let output: StageOutput
      switch (input.stage_type) {
        case 'context_gathering':
          output = await this.contextGatheringStage.execute(input)
          break
        case 'template_processing':
          output = await this.templateProcessingStage.execute(input)
          break
        case 'ai_generation':
          output = await this.aiGenerationStage.execute(input)
          break
        case 'context_injection':
          output = await this.contextInjectionStage.execute(input)
          break
        case 'quality_assurance':
          output = await this.qualityAssuranceStage.execute(input)
          break
        case 'output_formatting':
          output = await this.outputFormattingStage.execute(input)
          break
        default:
          throw new Error(`Unknown stage type: ${input.stage_type}`)
      }

      const executionTime = Date.now() - startTime

      // Record stage metrics
      await this.metricsCollector.recordStageMetrics(stageId, input.stage_type, executionTime, output.quality_score, true)

      logger.info('Stage executed successfully', {
        stageId,
        stageType: input.stage_type,
        executionTime,
        qualityScore: output.quality_score
      })

      return output

    } catch (error) {
      logger.error('Stage execution failed', {
        stageId,
        stageType: input.stage_type,
        error: error.message
      })
      const executionTime = Date.now() - startTime
      try {
        await this.metricsCollector.recordStageMetrics(stageId, input.stage_type, executionTime, 0, false)
      } catch (metricsError) {
        logger.warn('Failed to record failed stage metrics', {
          stageId,
          stageType: input.stage_type,
          error: (metricsError as Error).message
        })
      }
      throw error
    }
  }

  async executeStageAsync(stageId: string, input: StageInput): Promise<StageJob> {
    try {
      logger.info('Starting async stage execution', { stageId, stageType: input.stage_type })

      // Create stage job
      const stageJob = await this.jobManager.createStageJob(stageId, input)

      // Execute stage in background
      this.executeStageInBackground(stageId, input, stageJob.job_id)

      logger.info('Async stage execution started', {
        stageJobId: stageJob.job_id,
        stageId,
        stageType: input.stage_type
      })

      return stageJob

    } catch (error) {
      logger.error('Failed to start async stage execution', {
        stageId,
        stageType: input.stage_type,
        error: error.message
      })
      throw error
    }
  }

  async getStageStatus(jobId: string): Promise<ProcessingStatus> {
    try {
      logger.debug('Getting stage status', { jobId })

      const status = await this.jobManager.getStageJobStatus(jobId)

      logger.info('Stage status retrieved', {
        jobId,
        status: status.status,
        progress: status.progress
      })

      return status

    } catch (error) {
      logger.error('Failed to get stage status', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async configurePipeline(config: PipelineConfig): Promise<void> {
    try {
      logger.info('Configuring pipeline', { pipelineId: config.pipeline_id })

      // Validate pipeline configuration
      const validationResult = await this.validatePipelineConfig(config)
      if (!validationResult.valid) {
        throw new Error(`Invalid pipeline configuration: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      // Store pipeline configuration
      await this.storePipelineConfig(config)

      // Update orchestrator configuration
      await this.pipelineOrchestrator.configurePipeline(config)

      logger.info('Pipeline configured successfully', { pipelineId: config.pipeline_id })

    } catch (error) {
      logger.error('Failed to configure pipeline', {
        pipelineId: config.pipeline_id,
        error: error.message
      })
      throw error
    }
  }

  async getPipelineConfig(): Promise<PipelineConfig> {
    try {
      logger.debug('Getting pipeline configuration')

      const config = await this.retrievePipelineConfig()

      logger.info('Pipeline configuration retrieved successfully')

      return config

    } catch (error) {
      logger.error('Failed to get pipeline configuration', {
        error: error.message
      })
      throw error
    }
  }

  async validatePipelineConfig(config: PipelineConfig): Promise<ValidationResult> {
    try {
      logger.debug('Validating pipeline configuration', { pipelineId: config.pipeline_id })

      const errors: any[] = []
      const warnings: any[] = []
      const suggestions: any[] = []

      // Validate stages
      if (!config.stages || config.stages.length === 0) {
        errors.push({
          field: 'stages',
          error_code: 'MISSING_STAGES',
          message: 'Pipeline must have at least one stage',
          severity: 'error'
        })
      }

      // Validate stage order
      const stageOrders = config.stages.map(s => s.order).sort((a, b) => a - b)
      for (let i = 0; i < stageOrders.length; i++) {
        if (stageOrders[i] !== i + 1) {
          errors.push({
            field: 'stages',
            error_code: 'INVALID_STAGE_ORDER',
            message: `Stage order must be sequential starting from 1, found: ${stageOrders[i]}`,
            severity: 'error'
          })
        }
      }

      // Validate stage dependencies
      for (const stage of config.stages) {
        for (const dependency of stage.dependencies) {
          const dependencyStage = config.stages.find(s => s.stage_id === dependency)
          if (!dependencyStage) {
            errors.push({
              field: 'stages',
              error_code: 'MISSING_DEPENDENCY',
              message: `Stage ${stage.stage_id} depends on non-existent stage: ${dependency}`,
              severity: 'error'
            })
          }
        }
      }

      // Validate quality gates
      for (const gate of config.quality_gates) {
        const gateStage = config.stages.find(s => s.stage_id === gate.stage_id)
        if (!gateStage) {
          errors.push({
            field: 'quality_gates',
            error_code: 'INVALID_GATE_STAGE',
            message: `Quality gate ${gate.gate_id} references non-existent stage: ${gate.stage_id}`,
            severity: 'error'
          })
        }
      }

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }

      logger.info('Pipeline configuration validation completed', {
        pipelineId: config.pipeline_id,
        valid: result.valid,
        errorsCount: errors.length,
        warningsCount: warnings.length
      })

      return result

    } catch (error) {
      logger.error('Failed to validate pipeline configuration', {
        pipelineId: config.pipeline_id,
        error: error.message
      })
      throw error
    }
  }

  async getProcessingMetrics(timeframe: string): Promise<ProcessingMetrics> {
    try {
      logger.info('Getting processing metrics', { timeframe })

      const metrics = await this.metricsCollector.getProcessingMetrics(timeframe)

      logger.info('Processing metrics retrieved successfully', {
        timeframe,
        totalRequests: metrics.total_requests,
        successfulRequests: metrics.successful_requests,
        averageProcessingTime: metrics.average_processing_time
      })

      return metrics

    } catch (error) {
      logger.error('Failed to get processing metrics', {
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async getStageMetrics(stageId: string, timeframe: string): Promise<StageMetrics> {
    try {
      logger.info('Getting stage metrics', { stageId, timeframe })

      const metrics = await this.metricsCollector.getStageMetrics(stageId, timeframe)

      logger.info('Stage metrics retrieved successfully', {
        stageId,
        timeframe,
        totalExecutions: metrics.total_executions,
        successfulExecutions: metrics.successful_executions,
        averageExecutionTime: metrics.average_execution_time
      })

      return metrics

    } catch (error) {
      logger.error('Failed to get stage metrics', {
        stageId,
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async getProcessingHistory(filters?: ProcessingHistoryFilters): Promise<ProcessingHistory[]> {
    try {
      logger.info('Getting processing history', { filters })

      const history = await this.jobManager.getProcessingHistory(filters)

      logger.info('Processing history retrieved successfully', {
        filters,
        historyCount: history.length
      })

      return history

    } catch (error) {
      logger.error('Failed to get processing history', {
        filters,
        error: error.message
      })
      return []
    }
  }

  // Private helper methods
  private async validateProcessingRequest(request: DocumentProcessingRequest): Promise<ValidationResult> {
    const errors: any[] = []
    const warnings: any[] = []
    const suggestions: any[] = []

    // Validate required fields
    if (!request.request_id) {
      errors.push({
        field: 'request_id',
        error_code: 'MISSING_REQUEST_ID',
        message: 'Request ID is required',
        severity: 'error'
      })
    }

    if (!request.template_id) {
      errors.push({
        field: 'template_id',
        error_code: 'MISSING_TEMPLATE_ID',
        message: 'Template ID is required',
        severity: 'error'
      })
    }

    if (!request.project_id) {
      errors.push({
        field: 'project_id',
        error_code: 'MISSING_PROJECT_ID',
        message: 'Project ID is required',
        severity: 'error'
      })
    }

    if (!request.user_id) {
      errors.push({
        field: 'user_id',
        error_code: 'MISSING_USER_ID',
        message: 'User ID is required',
        severity: 'error'
      })
    }

    // Validate processing configuration
    if (!request.processing_config) {
      errors.push({
        field: 'processing_config',
        error_code: 'MISSING_PROCESSING_CONFIG',
        message: 'Processing configuration is required',
        severity: 'error'
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  private async collectFinalDocument(stageResults: any[]): Promise<any> {
    // Collect the final document from the last stage
    const lastStage = stageResults[stageResults.length - 1]
    return lastStage.output.output_data
  }

  private async generateQualityReport(finalDocument: any, stageResults: any[]): Promise<any> {
    // Generate comprehensive quality report
    const overallScore = stageResults.reduce((sum, stage) => sum + stage.output.quality_score, 0) / stageResults.length
    
    return {
      report_id: `quality_${randomUUID()}`,
      document_id: finalDocument.document_id,
      overall_score: overallScore,
      assessments: [],
      recommendations: [],
      issues: [],
      metadata: {
        stages_assessed: stageResults.length,
        assessment_timestamp: new Date()
      }
    }
  }

  private async calculateProcessingMetrics(request: DocumentProcessingRequest, stageResults: any[], processingTime: number): Promise<ProcessingMetrics> {
    return {
      total_requests: 1,
      successful_requests: 1,
      failed_requests: 0,
      average_processing_time: processingTime,
      stage_metrics: this.buildEmptyStageMetrics(),
      quality_metrics: {
        average_quality_score: stageResults.reduce((sum, stage) => sum + stage.output.quality_score, 0) / stageResults.length,
        quality_distribution: {},
        improvement_trends: [],
        common_issues: []
      },
      performance_metrics: {
        average_response_time: processingTime,
        throughput: 1,
        resource_utilization: {
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          network_usage: 0
        },
        error_rates: {
          total_errors: 0,
          error_rate: 0,
          error_types: {},
          error_trends: []
        }
      }
    }
  }

  private buildEmptyStageMetrics(): Record<StageType, StageMetrics> {
    const stageTypes: StageType[] = [
      'context_gathering',
      'template_processing',
      'ai_generation',
      'context_injection',
      'quality_assurance',
      'output_formatting'
    ]

    return stageTypes.reduce((acc, stageType) => {
      acc[stageType] = {
        stage_id: stageType,
        stage_type: stageType,
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        average_execution_time: 0,
        quality_scores: [],
        error_rates: []
      }
      return acc
    }, {} as Record<StageType, StageMetrics>)
  }

  private async processDocumentInBackground(request: DocumentProcessingRequest, jobId: string): Promise<void> {
    try {
      // Update job status to running
      await this.jobManager.updateJobStatus(jobId, 'running', 0)

      // Process document
      const result = await this.processDocument(request)

      // Update job with result
      await this.jobManager.completeJob(jobId, {
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
        result: result
      })

    } catch (error) {
      logger.error('Background document processing failed', {
        jobId,
        requestId: request.request_id,
        error: error.message
      })

      // Update job with error
      await this.jobManager.failJob(jobId, {
        status: 'failed',
        error: {
          error_id: `error_${randomUUID()}`,
          error_type: 'PROCESSING_ERROR',
          error_message: error.message,
          error_code: 'PROCESSING_FAILED',
          timestamp: new Date(),
          context: { jobId, requestId: request.request_id }
        }
      })
    }
  }

  private async executeStageInBackground(stageId: string, input: StageInput, jobId: string): Promise<void> {
    try {
      // Update stage job status to running
      await this.jobManager.updateStageJobStatus(jobId, 'running', 0)

      // Execute stage
      const output = await this.executeStage(stageId, input)

      // Update stage job with result
      await this.jobManager.completeStageJob(jobId, {
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
        output: output
      })

    } catch (error) {
      logger.error('Background stage execution failed', {
        jobId,
        stageId,
        error: error.message
      })

      // Update stage job with error
      await this.jobManager.failStageJob(jobId, {
        status: 'failed',
        error: {
          error_id: `error_${randomUUID()}`,
          error_type: 'STAGE_ERROR',
          error_message: error.message,
          error_code: 'STAGE_FAILED',
          timestamp: new Date(),
          context: { jobId, stageId }
        }
      })
    }
  }

  private async storePipelineConfig(config: PipelineConfig): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO pipeline_configurations (
          pipeline_id, pipeline_name, description, stages, global_config,
          quality_gates, monitoring_config, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (pipeline_id) DO UPDATE SET
          pipeline_name = EXCLUDED.pipeline_name,
          description = EXCLUDED.description,
          stages = EXCLUDED.stages,
          global_config = EXCLUDED.global_config,
          quality_gates = EXCLUDED.quality_gates,
          monitoring_config = EXCLUDED.monitoring_config,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          config.pipeline_id,
          config.pipeline_name,
          config.description,
          JSON.stringify(config.stages),
          JSON.stringify(config.global_config),
          JSON.stringify(config.quality_gates),
          JSON.stringify(config.monitoring_config)
        ]
      )

    } catch (error) {
      logger.error('Failed to store pipeline configuration', {
        pipelineId: config.pipeline_id,
        error: error.message
      })
      throw error
    }
  }

  private async retrievePipelineConfig(): Promise<PipelineConfig> {
    try {
      const result = await pool.query(
        'SELECT * FROM pipeline_configurations ORDER BY updated_at DESC LIMIT 1'
      )

      if (result.rows.length === 0) {
        throw new Error('No pipeline configuration found')
      }

      const row = result.rows[0]
      return {
        pipeline_id: row.pipeline_id,
        pipeline_name: row.pipeline_name,
        description: row.description,
        stages: row.stages || [],
        global_config: row.global_config || {},
        quality_gates: row.quality_gates || [],
        monitoring_config: row.monitoring_config || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      }

    } catch (error) {
      logger.error('Failed to retrieve pipeline configuration', {
        error: error.message
      })
      throw error
    }
  }
}

