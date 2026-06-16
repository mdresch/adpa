/**
 * Pipeline Orchestrator Service
 * Orchestrates the execution of the 6-stage document processing pipeline
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import AnalyticsTrackingService from '../../../services/analyticsTrackingService'
import type {
  DocumentProcessingRequest,
  PipelineConfig,
  StageResult,
  StageInput,
  StageOutput,
  QualityGate
} from '../types'

export class PipelineOrchestrator {
  private pipelineConfig: PipelineConfig | null = null

  async executePipeline(request: DocumentProcessingRequest, jobId: string): Promise<StageResult[]> {
    try {
      logger.info('Executing document processing pipeline', { 
        requestId: request.request_id,
        jobId,
        templateId: request.template_id
      })

      const startTime = Date.now()
      const stageResults: StageResult[] = []

      // Get pipeline configuration
      const config = this.pipelineConfig || await this.getDefaultPipelineConfig()

      // Execute stages in order
      for (const stage of config.stages) {
        if (!stage.enabled) {
          logger.info('Skipping disabled stage', { stageId: stage.stage_id })
          continue
        }

        try {
          // Check dependencies
          await this.checkStageDependencies(stage, stageResults)

          // Execute stage
          const stageResult = await this.executeStage(stage, request, jobId, stageResults)
          stageResults.push(stageResult)

          // Apply quality gates
          await this.applyQualityGates(stage, stageResult, config.quality_gates)

          // Update job progress
          const progress = (stageResults.length / config.stages.length) * 100
          await this.updateJobProgress(jobId, progress, stage.stage_id)

        } catch (error) {
          logger.error('Stage execution failed', {
            stageId: stage.stage_id,
            stageType: stage.stage_type,
            error: error.message
          })

          // Handle stage failure based on configuration
          if (stage.config.fail_on_error) {
            throw error
          } else {
            // Continue with next stage, but log the failure
            stageResults.push({
              stage_id: stage.stage_id,
              stage_type: stage.stage_type,
              status: 'failed',
              execution_time: 0,
              quality_score: 0,
              output: {
                stage_id: stage.stage_id,
                stage_type: stage.stage_type,
                output_data: null,
                quality_score: 0,
                processing_time: 0,
                metadata: { error: error.message }
              },
              error: {
                error_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                error_type: 'STAGE_EXECUTION_ERROR',
                error_message: error.message,
                error_code: 'STAGE_FAILED',
                stage_id: stage.stage_id,
                timestamp: new Date(),
                context: { stageId: stage.stage_id, stageType: stage.stage_type }
              },
              metadata: { failed: true, error: error.message }
            })
          }
        }
      }

      const totalTime = Date.now() - startTime

      logger.info('Document processing pipeline completed', {
        requestId: request.request_id,
        jobId,
        totalTime,
        stagesCompleted: stageResults.length,
        successfulStages: stageResults.filter(s => s.status === 'completed').length,
        failedStages: stageResults.filter(s => s.status === 'failed').length
      })

      return stageResults

    } catch (error) {
      logger.error('Pipeline execution failed', {
        requestId: request.request_id,
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async configurePipeline(config: PipelineConfig): Promise<void> {
    try {
      logger.info('Configuring pipeline orchestrator', { pipelineId: config.pipeline_id })

      this.pipelineConfig = config

      // Store configuration in database
      await this.storePipelineConfiguration(config)

      logger.info('Pipeline orchestrator configured successfully', { pipelineId: config.pipeline_id })

    } catch (error) {
      logger.error('Failed to configure pipeline orchestrator', {
        pipelineId: config.pipeline_id,
        error: error.message
      })
      throw error
    }
  }

  async getPipelineStatus(jobId: string): Promise<any> {
    try {
      logger.debug('Getting pipeline status', { jobId })

      const result = await pool.query(
        'SELECT * FROM pipeline_executions WHERE job_id = $1',
        [jobId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Pipeline execution not found: ${jobId}`)
      }

      const execution = result.rows[0]

      return {
        job_id: jobId,
        status: execution.status,
        progress: execution.progress,
        current_stage: execution.current_stage,
        stages_completed: execution.stages_completed || [],
        stages_remaining: execution.stages_remaining || [],
        started_at: execution.started_at,
        estimated_completion: execution.estimated_completion,
        error: execution.error
      }

    } catch (error) {
      logger.error('Failed to get pipeline status', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async cancelPipeline(jobId: string): Promise<void> {
    try {
      logger.info('Cancelling pipeline execution', { jobId })

      await pool.query(
        `
        UPDATE pipeline_executions 
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
        WHERE job_id = $1 AND status IN ('pending', 'running')
        `,
        [jobId]
      )

      logger.info('Pipeline execution cancelled successfully', { jobId })

    } catch (error) {
      logger.error('Failed to cancel pipeline execution', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  // Private helper methods
  private async executeStage(
    stage: any,
    request: DocumentProcessingRequest,
    jobId: string,
    previousResults: StageResult[]
  ): Promise<StageResult> {
    const startTime = Date.now()
    const startedAt = new Date(startTime)

    logger.info('Executing stage', {
      stageId: stage.stage_id,
      stageType: stage.stage_type,
      jobId
    })

    // Prepare stage input
    const stageInput: StageInput = {
      stage_id: stage.stage_id,
      stage_type: stage.stage_type,
      input_data: this.prepareStageInput(stage, request, previousResults),
      context: await this.prepareStageContext(stage, request),
      config: stage.config,
      metadata: {
        job_id: jobId,
        request_id: request.request_id,
        stage_order: stage.order
      }
    }

    // Execute stage based on type
    let stageOutput: StageOutput
    switch (stage.stage_type) {
      case 'context_gathering':
        stageOutput = await this.executeContextGatheringStage(stageInput)
        break
      case 'template_processing':
        stageOutput = await this.executeTemplateProcessingStage(stageInput)
        break
      case 'ai_generation':
        stageOutput = await this.executeAIGenerationStage(stageInput)
        break
      case 'context_injection':
        stageOutput = await this.executeContextInjectionStage(stageInput)
        break
      case 'quality_assurance':
        stageOutput = await this.executeQualityAssuranceStage(stageInput)
        break
      case 'output_formatting':
        stageOutput = await this.executeOutputFormattingStage(stageInput)
        break
      default:
        throw new Error(`Unknown stage type: ${stage.stage_type}`)
    }

    const executionTime = Date.now() - startTime
    const completedAt = new Date(startTime + executionTime)

    // Store stage execution record
    await this.storeStageExecution(jobId, stage, stageInput, stageOutput, executionTime)

    // Emit per-stage job analytics (non-blocking)
    ;(async () => {
      try {
        await AnalyticsTrackingService.trackJobExecution({
          jobId: `${jobId}:${stage.stage_id}`,
          jobType: `pipeline_stage:${stage.stage_type}`,
          queueName: 'pipeline',
          status: 'completed',
          priority: 0,
          queuedAt: startedAt,
          startedAt: startedAt,
          completedAt: completedAt,
          durationMs: executionTime,
          success: true,
          userId: (stageInput.context as any)?.user_id || null,
          projectId: (stageInput.context as any)?.project_id || null,
          jobData: {
            stage_id: stage.stage_id,
            stage_type: stage.stage_type,
            order: stage.order,
          },
          resultData: {
            quality_score: stageOutput.quality_score,
            metadata: stageOutput.metadata || null,
          },
        })
      } catch (e) {
        // swallow; analytics should never break pipeline
      }
    })()

    const stageResult: StageResult = {
      stage_id: stage.stage_id,
      stage_type: stage.stage_type,
      status: 'completed',
      execution_time: executionTime,
      quality_score: stageOutput.quality_score,
      output: stageOutput,
      metadata: {
        execution_time: executionTime,
        quality_score: stageOutput.quality_score
      }
    }

    logger.info('Stage executed successfully', {
      stageId: stage.stage_id,
      stageType: stage.stage_type,
      executionTime,
      qualityScore: stageOutput.quality_score
    })

    return stageResult
  }

  private async checkStageDependencies(stage: any, completedStages: StageResult[]): Promise<void> {
    if (!stage.dependencies || stage.dependencies.length === 0) {
      return
    }

    const completedStageIds = completedStages
      .filter(s => s.status === 'completed')
      .map(s => s.stage_id)

    for (const dependency of stage.dependencies) {
      if (!completedStageIds.includes(dependency)) {
        throw new Error(`Stage ${stage.stage_id} depends on stage ${dependency} which has not been completed`)
      }
    }
  }

  private async applyQualityGates(stage: any, stageResult: StageResult, qualityGates: QualityGate[]): Promise<void> {
    const stageGates = qualityGates.filter(gate => gate.stage_id === stage.stage_id)

    for (const gate of stageGates) {
      const gateResult = await this.evaluateQualityGate(gate, stageResult)

      if (!gateResult.passed) {
        logger.warn('Quality gate failed', {
          gateId: gate.gate_id,
          stageId: stage.stage_id,
          score: gateResult.score,
          threshold: gate.threshold
        })

        if (gate.action_on_failure === 'stop') {
          throw new Error(`Quality gate ${gate.gate_id} failed for stage ${stage.stage_id}`)
        }
      }
    }
  }

  private async evaluateQualityGate(gate: QualityGate, stageResult: StageResult): Promise<any> {
    // Evaluate quality gate criteria
    let totalScore = 0
    let totalWeight = 0

    for (const criterion of gate.criteria) {
      const criterionScore = await this.evaluateQualityCriterion(criterion, stageResult)
      totalScore += criterionScore * criterion.weight
      totalWeight += criterion.weight
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0

    return {
      gate_id: gate.gate_id,
      passed: finalScore >= gate.threshold,
      score: finalScore,
      threshold: gate.threshold,
      criteria_results: gate.criteria.map(c => ({
        criterion_id: c.criterion_id,
        score: 0, // Would be calculated
        passed: true // Would be calculated
      }))
    }
  }

  private async evaluateQualityCriterion(criterion: any, stageResult: StageResult): Promise<number> {
    // Evaluate individual quality criterion
    // This would implement specific quality evaluation logic
    return 0.8 // Placeholder score
  }

  private prepareStageInput(stage: any, request: DocumentProcessingRequest, previousResults: StageResult[]): any {
    // Prepare input data for the stage based on previous results
    const input: any = {
      request: request,
      previous_stages: previousResults
    }

    // Add stage-specific input preparation
    switch (stage.stage_type) {
      case 'context_gathering':
        input.template_id = request.template_id
        input.project_id = request.project_id
        input.user_id = request.user_id
        break
      case 'template_processing':
        // Add template_id from request
        input.template_id = request.template_id
        input.project_id = request.project_id
        input.user_id = request.user_id
        // Get context from previous stage
        const contextStage = previousResults.find(r => r.stage_type === 'context_gathering')
        if (contextStage) {
          input.context = contextStage.output.output_data
        }
        break
      case 'ai_generation':
        // Get processed template from previous stage
        const templateStage = previousResults.find(r => r.stage_type === 'template_processing')
        if (templateStage) {
          const result = templateStage.output.output_data
          input.processed_template = result?.processed_template || result
        }
        // Pass gathered context from context_gathering so AI stage can use project, user, GKG context
        const gatheredContextStage = previousResults.find(r => r.stage_type === 'context_gathering')
        if (gatheredContextStage?.output?.output_data?.context_bundle?.context_data) {
          input.context = gatheredContextStage.output.output_data.context_bundle.context_data
        }
        input.template_id = request.template_id
        input.project_id = request.project_id
        input.user_id = request.user_id
        break
      case 'context_injection':
        // Get generated document from previous stage
        const aiStage = previousResults.find(r => r.stage_type === 'ai_generation')
        if (aiStage) {
          const result = aiStage.output.output_data
          input.generated_document = result?.generated_document || result
        }
        input.template_id = request.template_id
        input.project_id = request.project_id
        input.user_id = request.user_id
        break
      case 'quality_assurance':
        // Get contextualized document from previous stage
        const contextInjectionStage = previousResults.find(r => r.stage_type === 'context_injection')
        if (contextInjectionStage) {
          const result = contextInjectionStage.output.output_data
          input.contextualized_document = result?.contextualized_document || result
        }
        input.template_id = request.template_id
        input.project_id = request.project_id
        input.user_id = request.user_id
        break
      case 'output_formatting':
        // Get quality-assessed document from previous stage
        const qualityStage = previousResults.find(r => r.stage_type === 'quality_assurance')
        if (qualityStage) {
          const result = qualityStage.output.output_data
          input.quality_assessed_document = result?.quality_assessed_document || result
        }
        input.template_id = request.template_id
        input.project_id = request.project_id
        input.user_id = request.user_id
        break
    }

    return input
  }

  private async prepareStageContext(stage: any, request: DocumentProcessingRequest): Promise<any> {
    // Prepare context data for the stage
    return {
      template_id: request.template_id,
      project_id: request.project_id,
      user_id: request.user_id,
      processing_config: request.processing_config,
      context_config: request.context_config,
      quality_config: request.quality_config,
      output_config: request.output_config
    }
  }

  // Stage execution methods (these would delegate to actual stage implementations)
  private async executeContextGatheringStage(input: StageInput): Promise<StageOutput> {
    const { ContextGatheringStage } = await Promise.resolve().then(() => require('../stages/contextGatheringStage'))
    const stage = new ContextGatheringStage()
    return await stage.execute(input)
  }

  private async executeTemplateProcessingStage(input: StageInput): Promise<StageOutput> {
    const { TemplateProcessingStage } = await Promise.resolve().then(() => require('../stages/templateProcessingStage'))
    const stage = new TemplateProcessingStage()
    return await stage.execute(input)
  }

  private async executeAIGenerationStage(input: StageInput): Promise<StageOutput> {
    const { AIGenerationStage } = await Promise.resolve().then(() => require('../stages/aiGenerationStage'))
    const stage = new AIGenerationStage()
    return await stage.execute(input)
  }

  private async executeContextInjectionStage(input: StageInput): Promise<StageOutput> {
    const { ContextInjectionStage } = await Promise.resolve().then(() => require('../stages/contextInjectionStage'))
    const stage = new ContextInjectionStage()
    return await stage.execute(input)
  }

  private async executeQualityAssuranceStage(input: StageInput): Promise<StageOutput> {
    const { QualityAssuranceStage } = await Promise.resolve().then(() => require('../stages/qualityAssuranceStage'))
    const stage = new QualityAssuranceStage()
    return await stage.execute(input)
  }

  private async executeOutputFormattingStage(input: StageInput): Promise<StageOutput> {
    const { OutputFormattingStage } = await Promise.resolve().then(() => require('../stages/outputFormattingStage'))
    const stage = new OutputFormattingStage()
    return await stage.execute(input)
  }

  private async updateJobProgress(jobId: string, progress: number, currentStage?: string): Promise<void> {
    try {
      await pool.query(
        `
        UPDATE pipeline_executions 
        SET progress = $2, current_stage = $3, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, progress, currentStage]
      )

    } catch (error) {
      logger.error('Failed to update job progress', {
        jobId,
        progress,
        currentStage,
        error: error.message
      })
    }
  }

  private async storeStageExecution(
    jobId: string,
    stage: any,
    input: StageInput,
    output: StageOutput,
    executionTime: number
  ): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO stage_executions (
          job_id, stage_id, stage_type, input_data, output_data, execution_time,
          quality_score, status, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          jobId,
          stage.stage_id,
          stage.stage_type,
          JSON.stringify(input),
          JSON.stringify(output),
          executionTime,
          output.quality_score,
          'completed'
        ]
      )

    } catch (error) {
      logger.error('Failed to store stage execution', {
        jobId,
        stageId: stage.stage_id,
        error: error.message
      })
    }
  }

  private async storePipelineConfiguration(config: PipelineConfig): Promise<void> {
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

  private async getDefaultPipelineConfig(): Promise<PipelineConfig> {
    return {
      pipeline_id: 'default_pipeline',
      pipeline_name: 'Default Document Processing Pipeline',
      description: 'Standard 6-stage document processing pipeline',
      stages: [
        {
          stage_id: 'context_gathering',
          stage_type: 'context_gathering',
          name: 'Context Gathering',
          description: 'Gather and analyze context from various sources',
          order: 1,
          enabled: true,
          config: {
            stage_id: 'context_gathering',
            stage_type: 'context_gathering',
            enabled: true,
            timeout: 30000,
            retry_attempts: 3,
            fail_on_error: true,
            quality_threshold: 0.8,
            config: { fail_on_error: true }
          },
          dependencies: [],
          timeout: 30000,
          retry_attempts: 3
        },
        {
          stage_id: 'template_processing',
          stage_type: 'template_processing',
          name: 'Template Processing',
          description: 'Process and enhance template with context',
          order: 2,
          enabled: true,
          config: {
            stage_id: 'template_processing',
            stage_type: 'template_processing',
            enabled: true,
            timeout: 30000,
            retry_attempts: 3,
            fail_on_error: true,
            quality_threshold: 0.8,
            config: { fail_on_error: true }
          },
          dependencies: ['context_gathering'],
          timeout: 30000,
          retry_attempts: 3
        },
        {
          stage_id: 'ai_generation',
          stage_type: 'ai_generation',
          name: 'AI Generation',
          description: 'Generate document content using AI models',
          order: 3,
          enabled: true,
            config: {
              stage_id: 'ai_generation',
              stage_type: 'ai_generation',
              enabled: true,
              timeout: 120000,
              retry_attempts: 2,
              fail_on_error: true,
              quality_threshold: 0.8,
              config: { fail_on_error: true }
            },
          dependencies: ['template_processing'],
          timeout: 120000,
          retry_attempts: 2
        },
        {
          stage_id: 'context_injection',
          stage_type: 'context_injection',
          name: 'Context Injection',
          description: 'Inject context and personalize document',
          order: 4,
          enabled: true,
            config: {
              stage_id: 'context_injection',
              stage_type: 'context_injection',
              enabled: true,
              timeout: 30000,
              retry_attempts: 3,
              fail_on_error: true,
              quality_threshold: 0.8,
              config: { fail_on_error: true }
            },
          dependencies: ['ai_generation'],
          timeout: 30000,
          retry_attempts: 3
        },
        {
          stage_id: 'quality_assurance',
          stage_type: 'quality_assurance',
          name: 'Quality Assurance',
          description: 'Assess and validate document quality',
          order: 5,
          enabled: true,
            config: {
              stage_id: 'quality_assurance',
              stage_type: 'quality_assurance',
              enabled: true,
              timeout: 45000,
              retry_attempts: 2,
              fail_on_error: false,
              quality_threshold: 0.85,
              config: { fail_on_error: false }
            },
          dependencies: ['context_injection'],
          timeout: 45000,
          retry_attempts: 2
        },
        {
          stage_id: 'output_formatting',
          stage_type: 'output_formatting',
          name: 'Output Formatting',
          description: 'Format document for final output',
          order: 6,
          enabled: true,
            config: {
              stage_id: 'output_formatting',
              stage_type: 'output_formatting',
              enabled: true,
              timeout: 30000,
              retry_attempts: 3,
              fail_on_error: true,
              quality_threshold: 0.8,
              config: { fail_on_error: true }
            },
          dependencies: ['quality_assurance'],
          timeout: 30000,
          retry_attempts: 3
        }
      ],
      global_config: {
        enable_parallel_processing: false,
        enable_quality_gates: true,
        enable_monitoring: true,
        max_processing_time: 300000,
        default_retry_attempts: 3,
        quality_thresholds: {
          content_quality: 0.7,
          methodology_compliance: 0.8,
          stakeholder_satisfaction: 0.7,
          technical_accuracy: 0.8,
          overall_quality: 0.75
        }
      },
      quality_gates: [
        {
          gate_id: 'content_quality_gate',
          gate_name: 'Content Quality Gate',
          stage_id: 'quality_assurance',
          criteria: [
            {
              criterion_id: 'content_completeness',
              criterion_name: 'Content Completeness',
              metric: 'completeness_score',
              threshold: 0.8,
              weight: 0.3
            },
            {
              criterion_id: 'content_clarity',
              criterion_name: 'Content Clarity',
              metric: 'clarity_score',
              threshold: 0.7,
              weight: 0.3
            },
            {
              criterion_id: 'content_consistency',
              criterion_name: 'Content Consistency',
              metric: 'consistency_score',
              threshold: 0.8,
              weight: 0.4
            }
          ],
          threshold: 0.75,
          action_on_failure: 'warn'
        }
      ],
      monitoring_config: {
        enable_metrics_collection: true,
        enable_error_tracking: true,
        enable_performance_monitoring: true,
        metrics_retention_period: 30,
        alert_thresholds: [
          {
            metric: 'processing_time',
            threshold: 300000,
            condition: 'greater_than',
            severity: 'high',
            notification_channels: ['email', 'slack']
          }
        ]
      },
      created_at: new Date(),
      updated_at: new Date()
    }
  }
}

