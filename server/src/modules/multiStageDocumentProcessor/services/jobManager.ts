/**
 * Job Manager Service
 * Manages document processing jobs and stage jobs
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  DocumentProcessingRequest,
  DocumentProcessingJob,
  StageJob,
  ProcessingStatus,
  ProcessingHistory,
  ProcessingHistoryFilters
} from '../types'

export class JobManager {
  async createJob(request: DocumentProcessingRequest): Promise<DocumentProcessingJob> {
    try {
      logger.info('Creating document processing job', { requestId: request.request_id })

      const jobId = uuidv4()

      // Create job record
      await pool.query(
        `
        INSERT INTO document_processing_jobs (
          job_id, request_id, template_id, project_id, user_id, status, created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
        `,
        [
          jobId,
          request.request_id,
          request.template_id,
          request.project_id,
          request.user_id,
          'pending',
          JSON.stringify(request.metadata || {})
        ]
      )

      // Create pipeline execution record
      await pool.query(
        `
        INSERT INTO pipeline_executions (
          job_id, request_id, status, progress, stages_completed, stages_remaining, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `,
        [
          jobId,
          request.request_id,
          'pending',
          0,
          [],
          ['context_gathering', 'template_processing', 'ai_generation', 'context_injection', 'quality_assurance', 'output_formatting']
        ]
      )

      const job: DocumentProcessingJob = {
        job_id: jobId,
        request_id: request.request_id,
        status: {
          status: 'pending',
          progress: 0,
          stages_completed: [],
          stages_remaining: ['context_gathering', 'template_processing', 'ai_generation', 'context_injection', 'quality_assurance', 'output_formatting']
        },
        created_at: new Date(),
        progress: 0,
        stages: [],
        metadata: request.metadata || {}
      }

      logger.info('Document processing job created successfully', {
        jobId,
        requestId: request.request_id
      })

      return job

    } catch (error) {
      logger.error('Failed to create document processing job', {
        requestId: request.request_id,
        error: error.message
      })
      throw error
    }
  }

  async createAsyncJob(request: DocumentProcessingRequest): Promise<DocumentProcessingJob> {
    try {
      logger.info('Creating async document processing job', { requestId: request.request_id })

      const job = await this.createJob(request)

      // Update job status to running
      await this.updateJobStatus(job.job_id, 'running', 0)

      logger.info('Async document processing job created successfully', {
        jobId: job.job_id,
        requestId: request.request_id
      })

      return job

    } catch (error) {
      logger.error('Failed to create async document processing job', {
        requestId: request.request_id,
        error: error.message
      })
      throw error
    }
  }

  async updateJobStatus(jobId: string, status: string, progress: number, currentStage?: string): Promise<void> {
    try {
      logger.debug('Updating job status', { jobId, status, progress, currentStage })

      await pool.query(
        `
        UPDATE document_processing_jobs 
        SET status = $2, progress = $3, current_stage = $4, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, status, progress, currentStage]
      )

      await pool.query(
        `
        UPDATE pipeline_executions 
        SET status = $2, progress = $3, current_stage = $4, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, status, progress, currentStage]
      )

      logger.info('Job status updated successfully', {
        jobId,
        status,
        progress,
        currentStage
      })

    } catch (error) {
      logger.error('Failed to update job status', {
        jobId,
        status,
        progress,
        error: error.message
      })
      throw error
    }
  }

  async completeJob(jobId: string, result: any): Promise<void> {
    try {
      logger.info('Completing job', { jobId })

      await pool.query(
        `
        UPDATE document_processing_jobs 
        SET status = $2, progress = $3, completed_at = CURRENT_TIMESTAMP, result = $4, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, result.status, result.progress, JSON.stringify(result)]
      )

      await pool.query(
        `
        UPDATE pipeline_executions 
        SET status = $2, progress = $3, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, result.status, result.progress]
      )

      logger.info('Job completed successfully', { jobId })

    } catch (error) {
      logger.error('Failed to complete job', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async failJob(jobId: string, error: any): Promise<void> {
    try {
      logger.info('Failing job', { jobId })

      await pool.query(
        `
        UPDATE document_processing_jobs 
        SET status = $2, error = $3, failed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, error.status, JSON.stringify(error.error)]
      )

      await pool.query(
        `
        UPDATE pipeline_executions 
        SET status = $2, error = $3, failed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, error.status, JSON.stringify(error.error)]
      )

      logger.info('Job failed successfully', { jobId })

    } catch (err) {
      logger.error('Failed to fail job', {
        jobId,
        error: err.message
      })
      throw err
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      logger.info('Cancelling job', { jobId })

      await pool.query(
        `
        UPDATE document_processing_jobs 
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1 AND status IN ('pending', 'running')
        `,
        [jobId]
      )

      await pool.query(
        `
        UPDATE pipeline_executions 
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1 AND status IN ('pending', 'running')
        `,
        [jobId]
      )

      logger.info('Job cancelled successfully', { jobId })

    } catch (error) {
      logger.error('Failed to cancel job', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<ProcessingStatus> {
    try {
      logger.debug('Getting job status', { jobId })

      const result = await pool.query(
        `
        SELECT dpj.*, pe.stages_completed, pe.stages_remaining, pe.estimated_completion
        FROM document_processing_jobs dpj
        LEFT JOIN pipeline_executions pe ON dpj.job_id = pe.job_id
        WHERE dpj.job_id = $1
        `,
        [jobId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Job not found: ${jobId}`)
      }

      const job = result.rows[0]

      const status: ProcessingStatus = {
        status: job.status,
        progress: job.progress,
        current_stage: job.current_stage,
        stages_completed: job.stages_completed || [],
        stages_remaining: job.stages_remaining || [],
        estimated_completion: job.estimated_completion,
        error: job.error ? JSON.parse(job.error) : undefined
      }

      logger.info('Job status retrieved successfully', {
        jobId,
        status: status.status,
        progress: status.progress
      })

      return status

    } catch (error) {
      logger.error('Failed to get job status', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async createStageJob(stageId: string, input: any): Promise<StageJob> {
    try {
      logger.info('Creating stage job', { stageId, stageType: input.stage_type })

      const jobId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create stage job record
      await pool.query(
        `
        INSERT INTO stage_jobs (
          job_id, stage_id, stage_type, status, input_data, created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
        `,
        [
          jobId,
          stageId,
          input.stage_type,
          'pending',
          JSON.stringify(input),
          JSON.stringify(input.metadata || {})
        ]
      )

      const stageJob: StageJob = {
        job_id: jobId,
        stage_id: stageId,
        stage_type: input.stage_type,
        status: {
          status: 'pending',
          progress: 0
        },
        created_at: new Date(),
        progress: 0,
        input: input,
        metadata: input.metadata || {}
      }

      logger.info('Stage job created successfully', {
        stageJobId: jobId,
        stageId,
        stageType: input.stage_type
      })

      return stageJob

    } catch (error) {
      logger.error('Failed to create stage job', {
        stageId,
        stageType: input.stage_type,
        error: error.message
      })
      throw error
    }
  }

  async updateStageJobStatus(jobId: string, status: string, progress: number): Promise<void> {
    try {
      logger.debug('Updating stage job status', { jobId, status, progress })

      await pool.query(
        `
        UPDATE stage_jobs 
        SET status = $2, progress = $3, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, status, progress]
      )

      logger.info('Stage job status updated successfully', {
        jobId,
        status,
        progress
      })

    } catch (error) {
      logger.error('Failed to update stage job status', {
        jobId,
        status,
        progress,
        error: error.message
      })
      throw error
    }
  }

  async completeStageJob(jobId: string, result: any): Promise<void> {
    try {
      logger.info('Completing stage job', { jobId })

      await pool.query(
        `
        UPDATE stage_jobs 
        SET status = $2, progress = $3, completed_at = CURRENT_TIMESTAMP, output_data = $4, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, result.status, result.progress, JSON.stringify(result.output)]
      )

      logger.info('Stage job completed successfully', { jobId })

    } catch (error) {
      logger.error('Failed to complete stage job', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async failStageJob(jobId: string, error: any): Promise<void> {
    try {
      logger.info('Failing stage job', { jobId })

      await pool.query(
        `
        UPDATE stage_jobs 
        SET status = $2, error = $3, failed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
        `,
        [jobId, error.status, JSON.stringify(error.error)]
      )

      logger.info('Stage job failed successfully', { jobId })

    } catch (err) {
      logger.error('Failed to fail stage job', {
        jobId,
        error: err.message
      })
      throw err
    }
  }

  async getStageJobStatus(jobId: string): Promise<ProcessingStatus> {
    try {
      logger.debug('Getting stage job status', { jobId })

      const result = await pool.query(
        'SELECT * FROM stage_jobs WHERE job_id = $1',
        [jobId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Stage job not found: ${jobId}`)
      }

      const stageJob = result.rows[0]

      const status: ProcessingStatus = {
        status: stageJob.status,
        progress: stageJob.progress,
        started_at: stageJob.started_at,
        completed_at: stageJob.completed_at,
        error: stageJob.error ? JSON.parse(stageJob.error) : undefined
      }

      logger.info('Stage job status retrieved successfully', {
        jobId,
        status: status.status,
        progress: status.progress
      })

      return status

    } catch (error) {
      logger.error('Failed to get stage job status', {
        jobId,
        error: error.message
      })
      throw error
    }
  }

  async getProcessingHistory(filters?: ProcessingHistoryFilters): Promise<ProcessingHistory[]> {
    try {
      logger.info('Getting processing history', { filters })

      let sql = `
        SELECT 
          dpj.job_id as history_id,
          dpj.request_id,
          dpj.user_id,
          dpj.project_id,
          dpj.template_id,
          dpj.status,
          dpj.created_at,
          dpj.completed_at,
          EXTRACT(EPOCH FROM (dpj.completed_at - dpj.created_at)) * 1000 as processing_time,
          dpj.error
        FROM document_processing_jobs dpj
        WHERE 1=1
      `
      const params: any[] = []
      let paramIndex = 1

      // Apply filters
      if (filters) {
        if (filters.user_id) {
          sql += ` AND dpj.user_id = $${paramIndex}`
          params.push(filters.user_id)
          paramIndex++
        }

        if (filters.project_id) {
          sql += ` AND dpj.project_id = $${paramIndex}`
          params.push(filters.project_id)
          paramIndex++
        }

        if (filters.template_id) {
          sql += ` AND dpj.template_id = $${paramIndex}`
          params.push(filters.template_id)
          paramIndex++
        }

        if (filters.status) {
          sql += ` AND dpj.status = $${paramIndex}`
          params.push(filters.status)
          paramIndex++
        }

        if (filters.date_from) {
          sql += ` AND dpj.created_at >= $${paramIndex}`
          params.push(filters.date_from)
          paramIndex++
        }

        if (filters.date_to) {
          sql += ` AND dpj.created_at <= $${paramIndex}`
          params.push(filters.date_to)
          paramIndex++
        }
      }

      sql += ' ORDER BY dpj.created_at DESC'

      if (filters?.limit) {
        sql += ` LIMIT $${paramIndex}`
        params.push(filters.limit)
        paramIndex++
      }

      if (filters?.offset) {
        sql += ` OFFSET $${paramIndex}`
        params.push(filters.offset)
        paramIndex++
      }

      const result = await pool.query(sql, params)

      const history: ProcessingHistory[] = result.rows.map(row => ({
        history_id: row.history_id,
        request_id: row.request_id,
        user_id: row.user_id,
        project_id: row.project_id,
        template_id: row.template_id,
        status: row.status,
        created_at: row.created_at,
        completed_at: row.completed_at,
        processing_time: row.processing_time,
        stages_completed: [], // Would be populated from stage_executions table
        error: row.error ? JSON.parse(row.error) : undefined
      }))

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

  async getJobById(jobId: string): Promise<DocumentProcessingJob | null> {
    try {
      logger.debug('Getting job by ID', { jobId })

      const result = await pool.query(
        `
        SELECT dpj.*, pe.stages_completed, pe.stages_remaining
        FROM document_processing_jobs dpj
        LEFT JOIN pipeline_executions pe ON dpj.job_id = pe.job_id
        WHERE dpj.job_id = $1
        `,
        [jobId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      const job: DocumentProcessingJob = {
        job_id: row.job_id,
        request_id: row.request_id,
        status: {
          status: row.status,
          progress: row.progress,
          current_stage: row.current_stage,
          stages_completed: row.stages_completed || [],
          stages_remaining: row.stages_remaining || []
        },
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        progress: row.progress,
        current_stage: row.current_stage,
        stages: [], // Would be populated from stage_jobs table
        metadata: row.metadata || {}
      }

      logger.info('Job retrieved successfully', { jobId })

      return job

    } catch (error) {
      logger.error('Failed to get job by ID', {
        jobId,
        error: error.message
      })
      return null
    }
  }

  async getJobsByStatus(status: string, limit: number = 100): Promise<DocumentProcessingJob[]> {
    try {
      logger.debug('Getting jobs by status', { status, limit })

      const result = await pool.query(
        `
        SELECT dpj.*, pe.stages_completed, pe.stages_remaining
        FROM document_processing_jobs dpj
        LEFT JOIN pipeline_executions pe ON dpj.job_id = pe.job_id
        WHERE dpj.status = $1
        ORDER BY dpj.created_at DESC
        LIMIT $2
        `,
        [status, limit]
      )

      const jobs: DocumentProcessingJob[] = result.rows.map(row => ({
        job_id: row.job_id,
        request_id: row.request_id,
        status: {
          status: row.status,
          progress: row.progress,
          current_stage: row.current_stage,
          stages_completed: row.stages_completed || [],
          stages_remaining: row.stages_remaining || []
        },
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        progress: row.progress,
        current_stage: row.current_stage,
        stages: [],
        metadata: row.metadata || {}
      }))

      logger.info('Jobs retrieved successfully', {
        status,
        limit,
        jobsCount: jobs.length
      })

      return jobs

    } catch (error) {
      logger.error('Failed to get jobs by status', {
        status,
        limit,
        error: error.message
      })
      return []
    }
  }

  async cleanupOldJobs(retentionDays: number = 30): Promise<void> {
    try {
      logger.info('Cleaning up old jobs', { retentionDays })

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // Delete old jobs
      const jobResult = await pool.query(
        'DELETE FROM document_processing_jobs WHERE created_at < $1 AND status IN (\'completed\', \'failed\', \'cancelled\')',
        [cutoffDate]
      )

      // Delete old pipeline executions
      const pipelineResult = await pool.query(
        'DELETE FROM pipeline_executions WHERE created_at < $1 AND status IN (\'completed\', \'failed\', \'cancelled\')',
        [cutoffDate]
      )

      // Delete old stage jobs
      const stageResult = await pool.query(
        'DELETE FROM stage_jobs WHERE created_at < $1 AND status IN (\'completed\', \'failed\', \'cancelled\')',
        [cutoffDate]
      )

      // Delete old stage executions
      const stageExecutionResult = await pool.query(
        'DELETE FROM stage_executions WHERE created_at < $1',
        [cutoffDate]
      )

      logger.info('Old jobs cleaned up successfully', {
        retentionDays,
        jobsDeleted: jobResult.rowCount,
        pipelineExecutionsDeleted: pipelineResult.rowCount,
        stageJobsDeleted: stageResult.rowCount,
        stageExecutionsDeleted: stageExecutionResult.rowCount
      })

    } catch (error) {
      logger.error('Failed to cleanup old jobs', {
        retentionDays,
        error: error.message
      })
      throw error
    }
  }
}

