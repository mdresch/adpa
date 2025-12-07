/**
 * Document Conversion Job Service
 * Handles processing of document conversion jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { io } from '../../server'
import type Bull from 'bull'

interface DocumentConversionJobData {
  jobId: string
  userId?: string
  documentId: string
  format: string
}

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: string, progress: number, workerId?: string, queueName?: string, errorMessage?: string) => Promise<void>
}

/**
 * Service class for processing document conversion jobs
 */
export class DocumentConversionJobService {
  /**
   * Process a document conversion job
   */
  static async processJob(job: Bull.Job, options: ProcessJobOptions): Promise<any> {
    const { jobId, userId, documentId, format } = job.data as DocumentConversionJobData
    const { workerId, updateJobStatus } = options

    try {
      // Update job status to processing and assign worker
      await updateJobStatus(jobId, "processing", 20, workerId, "document-processing")

      // Get document from database
      const document = await this.getDocument(documentId)

      // Update progress
      await updateJobStatus(jobId, "processing", 50)

      // Convert document to target format
      const convertedContent = await this.convertDocument(document, format)

      // Update progress
      await updateJobStatus(jobId, "processing", 90)

      // Prepare result
      const result = {
        originalId: documentId,
        format,
        content: convertedContent,
        convertedAt: new Date().toISOString(),
      }

      // Save result to database
      await pool.query(
        `
        UPDATE jobs 
        SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [JSON.stringify(result), jobId]
      )

      // Emit real-time update
      io.emit("job:completed", {
        jobId,
        userId,
        status: "completed",
        result,
      })

      logger.info(`Document conversion job completed: ${jobId}`)

      return result
    } catch (error) {
      logger.error(`Document conversion job failed: ${jobId}`, error)

      // Update job with error
      await pool.query(
        `
        UPDATE jobs 
        SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [error instanceof Error ? error.message : "Unknown error", jobId]
      )

      // Emit real-time update
      io.emit("job:failed", {
        jobId,
        userId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })

      throw error
    }
  }

  /**
   * Get document from database
   */
  private static async getDocument(documentId: string): Promise<any> {
    const docResult = await pool.query("SELECT * FROM documents WHERE id = $1", [documentId])
    
    if (docResult.rows.length === 0) {
      throw new Error("Document not found")
    }

    return docResult.rows[0]
  }

  /**
   * Convert document to target format
   * TODO: Integrate with DocumentFormatService for proper conversion
   */
  private static async convertDocument(document: any, format: string): Promise<any> {
    // This would integrate with actual document conversion services
    // For now, return a placeholder
    // TODO: Replace with DocumentFormatService integration
    return {
      format,
      content: `Converted document: ${document.name}`,
      size: 1024,
    }
  }
}

