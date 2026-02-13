/**
 * Baseline Extraction Job Service
 * Handles processing of baseline extraction jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 * 
 * Phase 5: Updated to support dependency injection while maintaining
 * backward compatibility with static methods.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { io } from '@/socket'
import type { IQueueJob } from './queue/IQueue'
// Phase 3: Use centralized types
import type { BaselineExtractionJobData, JobStatus, QueueName } from './types'
// Phase 5: Dependency injection
import type { QueueServiceDependencies } from './queue/QueueDependencies'

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: JobStatus, progress: number, workerId?: string, queueName?: QueueName | string, errorMessage?: string) => Promise<void>
  dependencies?: QueueServiceDependencies // Phase 5: Optional dependencies for DI
}

/**
 * Service class for processing baseline extraction jobs
 * Phase 5: Supports both static methods (backward compatibility) and instance methods (DI)
 */
export class BaselineExtractionJobService {
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
   * Process a baseline extraction job (instance method with DI)
   */
  async processJob(job: IQueueJob, options: ProcessJobOptions): Promise<any> {
    return BaselineExtractionJobService.processJob(job, options, {
      database: this.database,
      websocket: this.websocket,
      logger: this.logger,
    } as QueueServiceDependencies)
  }

  /**
   * Process a baseline extraction job (static method for backward compatibility)
   * Phase 5: Now accepts optional dependencies parameter
   */
  static async processJob(job: IQueueJob, options: ProcessJobOptions, deps?: QueueServiceDependencies): Promise<any> {
    // Phase 5: Use injected dependencies or fall back to global imports
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const ws = deps?.websocket || io
    const log = deps?.logger || logger
    const { jobId, userId, project_id, document_ids, ai_provider, ai_model } = job.data as BaselineExtractionJobData
    const { workerId, updateJobStatus } = options

    try {
      // Update job status to processing and assign worker
      await updateJobStatus(jobId, "processing", 10, workerId, "baseline-processing")

      // Get project name
      const project_name = await this.getProjectName(project_id, deps)

      log.info(`Starting baseline extraction for project ${project_id} (${project_name || 'Unknown'})`)

      // Get project documents directly from database
      await updateJobStatus(jobId, "processing", 30, workerId, "baseline-processing")

      let documentsQuery = `
        SELECT id, name as title, content, template_name 
        FROM documents 
        WHERE project_id = $1 AND deleted_at IS NULL
      `
      let queryParams: any[] = [project_id]

      if (document_ids && document_ids.length > 0) {
        documentsQuery += ` AND id = ANY($2)`
        queryParams = [project_id, document_ids]
      }

      const documentsResult = await db.query(documentsQuery, queryParams)
      const documents = documentsResult.rows

      // Extract entities with location tracking using enhanced coordinator
      const { EnhancedEntityExtractionCoordinator } = await import('../enhancedEntityExtractionCoordinator')
      const enhancedCoordinator = new EnhancedEntityExtractionCoordinator()
      const extractionResults = await enhancedCoordinator.extractAllEntitiesWithLocations(
        documents,
        project_id,
        {
          aiProvider: ai_provider,
          aiModel: ai_model
        }
      )

      // Convert enhanced results to baseline format
      const extractionResult = this.convertEnhancedResultsToBaselineFormat(extractionResults)

      await updateJobStatus(jobId, "processing", 70, workerId, "baseline-processing")

      // Create baseline in database
      const { baselineService } = await import('../baselineService')
      const baseline = await baselineService.createBaselineFromEntities(
        project_id,
        userId
      )

      await updateJobStatus(jobId, "processing", 90, workerId, "baseline-processing")

      // Update job to completed
      await db.query(
        `UPDATE jobs 
         SET status = 'completed', result = $1, progress = 100, 
             worker_id = COALESCE(worker_id, $3),
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify({ baseline_id: baseline.id, baseline }), jobId, workerId]
      )

      // Emit success notification
      ws.emit("job:completed", {
        jobId,
        userId,
        status: "completed",
        message: `Baseline extracted successfully for ${project_name || 'project'}`,
        projectId: project_id,
        baselineId: baseline.id,
      })

      // Emit baseline:created event to project room
      ws.to(`project:${project_id}`).emit("baseline:created", {
        baselineId: baseline.id,
        projectId: project_id,
        projectName: project_name,
      })

      log.info(`Baseline extraction job completed: ${jobId}`)

      return { baseline_id: baseline.id, baseline }
    } catch (error) {
      log.error(`Baseline extraction job failed: ${jobId}`, error)

      // Update job with error
      await db.query(
        `UPDATE jobs 
         SET status = 'failed', error_message = $1, 
             worker_id = COALESCE(worker_id, $3),
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
             failed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error instanceof Error ? error.message : "Unknown error", jobId, workerId]
      )

      // Emit failure notification
      ws.emit("job:failed", {
        jobId,
        userId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        message: `Failed to extract baseline for project`,
        projectId: project_id,
      })

      throw error
    }
  }

  /**
   * Convert enhanced extraction results to baseline format
   */
  private static convertEnhancedResultsToBaselineFormat(results: any): any {
    // Combine all entity types into a single array for baseline compatibility
    const allEntities = [
      ...(results.performance_actuals || []),
      ...(results.requirements || []),
      ...(results.tasks || []),
      ...(results.risks || []),
      ...(results.mitigations || []),
      ...(results.issues || []),
      ...(results.playbooks || []),
      ...(results.deliverables || []),
      ...(results.stakeholders || []),
      ...(results.resources || []),
      ...(results.milestones || []),
      ...(results.work_items || []),
      ...(results.success_criteria || []),
      ...(results.constraints || []),
      ...(results.scope_items || []),
      ...(results.activities || []),
      ...(results.phases || []),
      ...(results.opportunities || []),
      ...(results.quality_audits || []),
      ...(results.best_practices || []),
      ...(results.template_improvements || [])
    ]

    return {
      entities: allEntities,
      totalExtracted: allEntities.length,
      byType: this.countEntitiesByType(results),
      averageConfidence: this.calculateAverageConfidence(allEntities)
    }
  }

  /**
   * Count entities by type from enhanced results
   */
  private static countEntitiesByType(results: any): Record<string, number> {
    const counts: Record<string, number> = {}

    Object.entries(results).forEach(([type, entities]: [string, any[]]) => {
      if (Array.isArray(entities)) {
        counts[type] = entities.length
      }
    })

    return counts
  }

  /**
   * Calculate average confidence from entities
   */
  private static calculateAverageConfidence(entities: any[]): number {
    if (entities.length === 0) return 0

    const confidenceValues = entities
      .map(entity => entity.extraction_confidence || 0)
      .filter(conf => conf > 0)

    if (confidenceValues.length === 0) return 0

    return confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length
  }

  /**
   * Get project name from database
   * Phase 5: Accepts optional dependencies
   */
  private static async getProjectName(project_id: string, deps?: QueueServiceDependencies): Promise<string | undefined> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const log = deps?.logger || logger
    try {
      const projectResult = await db.query('SELECT name FROM projects WHERE id = $1', [project_id])
      if (projectResult.rows.length > 0) {
        return projectResult.rows[0].name
      }
    } catch (error) {
      log.warn(`Could not fetch project name for ${project_id}:`, error)
    }
    return undefined
  }
}
