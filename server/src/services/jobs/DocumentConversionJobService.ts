/**
 * Document Conversion Job Service
 * Handles processing of document conversion jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 * 
 * Phase 5: Updated to support dependency injection while maintaining
 * backward compatibility with static methods.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { io } from '../../server'
import type Bull from 'bull'
// Phase 3: Use centralized types
import type { DocumentConversionJobData, JobStatus, QueueName } from './types'
// Phase 5: Dependency injection
import type { QueueServiceDependencies } from './queue/QueueDependencies'

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: JobStatus, progress: number, workerId?: string, queueName?: QueueName | string, errorMessage?: string) => Promise<void>
  dependencies?: QueueServiceDependencies // Phase 5: Optional dependencies for DI
}

/**
 * Service class for processing document conversion jobs
 * Phase 5: Supports both static methods (backward compatibility) and instance methods (DI)
 */
export class DocumentConversionJobService {
  // Phase 5: Instance properties for dependency injection
  private database: QueueServiceDependencies['database']
  private websocket: QueueServiceDependencies['websocket']
  private logger: QueueServiceDependencies['logger']

  /**
   * Phase 5: Constructor for dependency injection
   */
  constructor(dependencies?: QueueServiceDependencies) {
    if (dependencies) {
      this.database = dependencies.database
      this.websocket = dependencies.websocket
      this.logger = dependencies.logger
    } else {
      // Fallback to global imports for backward compatibility
      this.database = { query: pool.query.bind(pool), connect: pool.connect.bind(pool), end: pool.end.bind(pool) } as any
      this.websocket = io as any
      this.logger = logger as any
    }
  }

  /**
   * Process a document conversion job (instance method with DI)
   */
  async processJob(job: Bull.Job, options: ProcessJobOptions): Promise<any> {
    return DocumentConversionJobService.processJob(job, options, {
      database: this.database,
      websocket: this.websocket,
      logger: this.logger,
    } as QueueServiceDependencies)
  }

  /**
   * Process a document conversion job (static method for backward compatibility)
   * Phase 5: Now accepts optional dependencies parameter
   */
  static async processJob(job: Bull.Job, options: ProcessJobOptions, deps?: QueueServiceDependencies): Promise<any> {
    // Phase 5: Use injected dependencies or fall back to global imports
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const ws = deps?.websocket || io
    const log = deps?.logger || logger
    const { jobId, userId, documentId, format } = job.data as DocumentConversionJobData
    const { workerId, updateJobStatus } = options

    try {
      // Update job status to processing and assign worker
      await updateJobStatus(jobId, "processing", 20, workerId, "document-processing")

      // Get document from database
      const document = await this.getDocument(documentId, deps)

      // Update progress
      await updateJobStatus(jobId, "processing", 50, workerId, "document-processing")

      // Convert document to target format
      const convertedContent = await this.convertDocument(document, format)

      // Update progress
      await updateJobStatus(jobId, "processing", 90, workerId, "document-processing")

      // Prepare result
      const result = {
        originalId: documentId,
        format,
        content: convertedContent,
        convertedAt: new Date().toISOString(),
      }

      // Save result to database
      await db.query(
        `
        UPDATE jobs 
        SET status = 'completed', result = $1, progress = 100, 
            worker_id = COALESCE(worker_id, $3),
            started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
            processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [JSON.stringify(result), jobId, workerId]
      )

      // Emit real-time update
      ws.emit("job:completed", {
        jobId,
        userId,
        status: "completed",
        result,
      })

      log.info(`Document conversion job completed: ${jobId}`)

      return result
    } catch (error) {
      log.error(`Document conversion job failed: ${jobId}`, error)

      // Update job with error
      await db.query(
        `
        UPDATE jobs 
        SET status = 'failed', error_message = $1, 
            worker_id = COALESCE(worker_id, $3),
            started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
            processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
            failed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [error instanceof Error ? error.message : "Unknown error", jobId, workerId]
      )

      // Emit real-time update
      ws.emit("job:failed", {
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
   * Phase 5: Accepts optional dependencies
   */
  private static async getDocument(documentId: string, deps?: QueueServiceDependencies): Promise<any> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const docResult = await db.query("SELECT * FROM documents WHERE id = $1", [documentId])

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

