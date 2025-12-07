/**
 * Baseline Extraction Job Service
 * Handles processing of baseline extraction jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { io } from '../../server'
import type Bull from 'bull'

interface BaselineExtractionJobData {
  jobId: string
  userId?: string
  project_id: string
  document_ids?: string[]
  ai_provider?: string
  ai_model?: string
  project_name?: string
}

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: string, progress: number, workerId?: string, queueName?: string, errorMessage?: string) => Promise<void>
}

/**
 * Service class for processing baseline extraction jobs
 */
export class BaselineExtractionJobService {
  /**
   * Process a baseline extraction job
   */
  static async processJob(job: Bull.Job, options: ProcessJobOptions): Promise<any> {
    const { jobId, userId, project_id, document_ids, ai_provider, ai_model } = job.data as BaselineExtractionJobData
    let { project_name } = job.data as BaselineExtractionJobData
    const { workerId, updateJobStatus } = options

    try {
      // Update job status to processing and assign worker
      await updateJobStatus(jobId, "processing", 10, workerId, "baseline-processing")
      
      // Look up project name if not provided
      if (!project_name && project_id) {
        project_name = await this.getProjectName(project_id)
      }
      
      logger.info(`Starting baseline extraction for project ${project_id} (${project_name || 'Unknown'})`)
      
      // Extract baseline using AI (this takes 3-10 seconds)
      const { baselineService } = await import('../baselineService')
      
      await updateJobStatus(jobId, "processing", 30)
      
      const extractionResult = await baselineService.extractBaselineFromCorpus(
        project_id,
        userId,
        {
          includeDocumentIds: document_ids,
          aiProvider: ai_provider,
          aiModel: ai_model
        }
      )
      
      await updateJobStatus(jobId, "processing", 70)
      
      // Create baseline in database
      const corpus = document_ids || (await baselineService.getProjectDocumentCorpus(project_id)).map((d: any) => d.id)
      const baseline = await baselineService.createBaseline(
        project_id,
        userId,
        extractionResult,
        corpus
      )
      
      await updateJobStatus(jobId, "processing", 90)
      
      // Update job to completed
      await pool.query(
        `UPDATE jobs 
         SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify({ baseline_id: baseline.id, baseline }), jobId]
      )
      
      // Emit success notification
      io.emit("job:completed", {
        jobId,
        userId,
        status: "completed",
        message: `Baseline extracted successfully for ${project_name || 'project'}`,
        projectId: project_id,
        baselineId: baseline.id,
      })
      
      // Emit baseline:created event to project room
      io.to(`project:${project_id}`).emit("baseline:created", {
        baselineId: baseline.id,
        projectId: project_id,
        projectName: project_name,
      })
      
      logger.info(`Baseline extraction job completed: ${jobId}`)
      
      return { baseline_id: baseline.id, baseline }
    } catch (error) {
      logger.error(`Baseline extraction job failed: ${jobId}`, error)
      
      // Update job with error
      await pool.query(
        `UPDATE jobs 
         SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error instanceof Error ? error.message : "Unknown error", jobId]
      )
      
      // Emit failure notification
      io.emit("job:failed", {
        jobId,
        userId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        message: `Failed to extract baseline for ${project_name || 'project'}`,
        projectId: project_id,
      })
      
      throw error
    }
  }

  /**
   * Get project name from database
   */
  private static async getProjectName(project_id: string): Promise<string | undefined> {
    try {
      const projectResult = await pool.query('SELECT name FROM projects WHERE id = $1', [project_id])
      if (projectResult.rows.length > 0) {
        return projectResult.rows[0].name
      }
    } catch (error) {
      logger.warn(`Could not fetch project name for ${project_id}:`, error)
    }
    return undefined
  }
}

