/**
 * Queue Service Class
 * Phase 5: Add Abstraction Layers and Dependency Injection
 * 
 * Main queue service class that uses dependency injection and queue abstraction.
 * This allows for better testability and decoupling from specific implementations.
 */

import type { IQueue } from './IQueue'
import type { QueueServiceDependencies } from './QueueDependencies'
import type { JobType, JobData, JobOptions, QueueName } from '../types'
import { validateJobData, validateJobType } from '../validation'
import {
  JobValidationError,
  JobTypeError,
  JobQueueError,
  JobDatabaseError,
  StuckJobsError,
} from '../errors'
import { v4 as uuidv4 } from 'uuid'
import { PerformanceMonitor } from '../../../utils/performanceMonitor'

/**
 * Queue Service Class
 * 
 * Manages job queues with dependency injection and abstraction layers.
 */
export class QueueService {
  private queues: Map<QueueName, IQueue> = new Map()
  private dependencies: QueueServiceDependencies

  constructor(dependencies: QueueServiceDependencies) {
    this.dependencies = dependencies
  }

  /**
   * Register a queue
   */
  registerQueue(name: QueueName, queue: IQueue): void {
    this.queues.set(name, queue)
  }

  /**
   * Get a queue by name
   */
  getQueue(name: QueueName): IQueue | undefined {
    return this.queues.get(name)
  }

  /**
   * Get all registered queues
   */
  getAllQueues(): Map<QueueName, IQueue> {
    return new Map(this.queues)
  }

  /**
   * Add a job to the appropriate queue
   * Phase 5: Enhanced with stuck job checking, caching, and full project/template/document name resolution
   */
  async addJob(
    type: JobType,
    data: unknown,
    options?: JobOptions
  ): Promise<string> {
    const endTiming = PerformanceMonitor.start('QueueService.addJob')
    // Phase 3: Validate job type
    let validatedType: JobType
    try {
      validatedType = validateJobType(type)
    } catch (error) {
      throw new JobTypeError(type, error instanceof Error ? error.message : 'Invalid job type')
    }

    // Phase 3: Validate job data
    let validatedData: JobData
    try {
      validatedData = validateJobData(validatedType, data)
    } catch (error) {
      if (error instanceof JobValidationError) {
        throw error
      }
      throw new JobValidationError(
        error instanceof Error ? error.message : 'Job data validation failed',
        undefined,
        undefined,
        (data as any)?.jobId,
        validatedType
      )
    }

    const jobId = validatedData.jobId || options?.jobId || uuidv4()
    let queueName: QueueName
    let queue: IQueue | undefined

    try {
      // Check for stuck jobs before allowing new jobs (optional safety check)
      // This can be disabled by setting SKIP_STUCK_JOB_CHECK=true in environment
      let stuckCheckTiming: (() => void) | null = null
      if (process.env.SKIP_STUCK_JOB_CHECK !== 'true') {
        stuckCheckTiming = PerformanceMonitor.start('QueueService.addJob.stuckJobCheck')
        const stuckJobsCheck = await this.dependencies.database.query(
          `SELECT COUNT(*) as count
           FROM jobs
           WHERE status = 'processing'
           AND (
             error_message IS NOT NULL
             OR started_at < NOW() - INTERVAL '1 hour'
             OR processing_started_at < NOW() - INTERVAL '1 hour'
           )
           LIMIT 1`
        )

        const stuckCount = (stuckJobsCheck && stuckJobsCheck.rows && stuckJobsCheck.rows.length > 0)
          ? parseInt(stuckJobsCheck.rows[0]?.count || '0')
          : 0
        if (stuckCheckTiming) stuckCheckTiming()

        if (stuckCount > 0) {
          this.dependencies.logger.warn(`⚠️  Blocking new job creation: ${stuckCount} stuck jobs detected. Run cleanup script first.`)

          // Auto-cleanup: Mark stuck jobs as failed before blocking
          const cleanupTiming = PerformanceMonitor.start('QueueService.addJob.stuckJobCleanup')
          try {
            const autoCleanupResult = await this.dependencies.database.query(
              `UPDATE jobs
               SET status = 'failed',
                   completed_at = CURRENT_TIMESTAMP,
                   error_message = COALESCE(
                     error_message,
                     'Job stuck in processing - auto-cleaned before blocking new jobs'
                   )
               WHERE status = 'processing'
               AND (
                 error_message IS NOT NULL
                 OR started_at < NOW() - INTERVAL '1 hour'
                 OR processing_started_at < NOW() - INTERVAL '1 hour'
               )`
            )
            if (autoCleanupResult.rowCount > 0) {
              cleanupTiming()
              this.dependencies.logger.info(`🧹 Auto-cleaned ${autoCleanupResult.rowCount} stuck jobs before blocking new job creation`, {
                jobsCleaned: autoCleanupResult.rowCount,
                performance: PerformanceMonitor.getStats('QueueService.addJob.stuckJobCleanup'),
              })
            } else {
              cleanupTiming()
            }
          } catch (cleanupError) {
            cleanupTiming()
            this.dependencies.logger.error('Failed to auto-clean stuck jobs:', cleanupError)
          }

          // Re-check after cleanup
          const recheckTiming = PerformanceMonitor.start('QueueService.addJob.stuckJobRecheck')
          const recheckResult = await this.dependencies.database.query(
            `SELECT COUNT(*) as count
             FROM jobs
             WHERE status = 'processing'
             AND (
               error_message IS NOT NULL
               OR started_at < NOW() - INTERVAL '1 hour'
               OR processing_started_at < NOW() - INTERVAL '1 hour'
             )
             LIMIT 1`
          )
          const remainingStuck = parseInt(recheckResult.rows[0]?.count || '0')
          recheckTiming()

          if (remainingStuck > 0) {
            throw new StuckJobsError(
              remainingStuck,
              `Cannot add new jobs: ${remainingStuck} stuck job(s) still detected after auto-cleanup. ` +
              `Please run 'npm run cleanup:all-stuck' to clean up stuck jobs first. ` +
              `To bypass this check, set SKIP_STUCK_JOB_CHECK=true in environment.`
            )
          } else {
            this.dependencies.logger.info(`✅ Auto-cleanup successful. Proceeding with new job creation.`)
          }
        }
      }

      // Determine which queue to use based on job type
      switch (validatedType) {
        case "ai-generate":
          queueName = "ai-processing"
          break
        case "document-convert":
          queueName = "document-processing"
          break
        case "pipeline-processing":
          queueName = "pipeline-processing"
          break
        case "baseline-extract":
          queueName = "baseline-processing"
          break
        case "process-flow":
          queueName = "process-flow-processing"
          break
        case "document-regeneration":
          queueName = "document-regeneration"
          break
        case "quality-audit":
          queueName = "quality-audit"
          break
        case "extract-project-data":
          queueName = "project-data-extraction"
          break
        case "gkg-bootstrap":
        case "gkg-sync-project":
        case "gkg-sync-document":
          queueName = "gkg-sync"
          break
        default:
          // Handle dynamic extract-entity types
          if (typeof validatedType === 'string' && (validatedType as string).startsWith('extract-entity-')) {
            queueName = "project-data-extraction"
          } else {
            throw new JobTypeError(type, `No queue mapping for job type: ${type}`)
          }
      }

      queue = this.getQueue(queueName)
      if (!queue) {
        throw new JobQueueError(`Queue ${queueName} not found or not registered`)
      }

      // Extract project info for ALL job types
      let projectId: string | null = null
      let projectName: string | null = null
      let templateName: string | null = null
      let documentName: string | null = null

      // Extract projectId from different possible locations based on job type
      if (validatedType === 'process-flow' && 'config' in validatedData && validatedData.config?.projectId) {
        projectId = validatedData.config.projectId
      } else if ('projectId' in validatedData) {
        // ai-generate, extract-project-data, etc.
        projectId = validatedData.projectId
      } else if ('project_id' in validatedData) {
        // baseline-extract uses project_id
        projectId = validatedData.project_id
      } else if ('variables' in validatedData && validatedData.variables && typeof validatedData.variables === 'object' && 'project_id' in validatedData.variables) {
        // From variables
        projectId = validatedData.variables.project_id as string
      }

      // Phase 4: Optimize N+1 queries - use single JOIN query instead of separate queries
      // Extract template ID and document ID for potential lookups
      let templateId: string | null = null
      if ('template_id' in validatedData) {
        templateId = validatedData.template_id || null
      } else if ('config' in validatedData && validatedData.config?.templateId) {
        templateId = validatedData.config.templateId
      } else if ('templateId' in validatedData) {
        templateId = validatedData.templateId
      }

      let documentId: string | null = null
      if (validatedType === 'extract-project-data' && 'documentIds' in validatedData && Array.isArray(validatedData.documentIds) && validatedData.documentIds.length === 1) {
        documentId = validatedData.documentIds[0]
      } else if ('documentId' in validatedData) {
        documentId = validatedData.documentId
      }

      if (!documentName && 'name' in validatedData && typeof validatedData.name === 'string') {
        documentName = validatedData.name
      }

      // Phase 4: Single query to fetch project, template, and document names with caching
      if (projectId || templateId || documentId) {
        try {
          // Check cache first for each ID
          const cacheKeys = {
            project: projectId ? `cache:project:name:${projectId}` : null,
            template: templateId ? `cache:template:name:${templateId}` : null,
            document: documentId ? `cache:document:name:${documentId}` : null,
          }

          // Try to get from cache
          const cacheTiming = PerformanceMonitor.start('QueueService.addJob.cacheLookup')
          const [cachedProjectName, cachedTemplateName, cachedDocumentName] = await Promise.all([
            cacheKeys.project ? this.dependencies.cache.get(cacheKeys.project) : Promise.resolve(null),
            cacheKeys.template ? this.dependencies.cache.get(cacheKeys.template) : Promise.resolve(null),
            cacheKeys.document ? this.dependencies.cache.get(cacheKeys.document) : Promise.resolve(null),
          ])
          cacheTiming()

          if (cachedProjectName) {
            projectName = cachedProjectName
            PerformanceMonitor.recordCacheHit('QueueService.addJob.projectName')
          } else if (projectId) {
            PerformanceMonitor.recordCacheMiss('QueueService.addJob.projectName')
          }

          if (cachedTemplateName) {
            templateName = cachedTemplateName
            PerformanceMonitor.recordCacheHit('QueueService.addJob.templateName')
          } else if (templateId) {
            PerformanceMonitor.recordCacheMiss('QueueService.addJob.templateName')
          }

          if (cachedDocumentName) {
            documentName = cachedDocumentName
            PerformanceMonitor.recordCacheHit('QueueService.addJob.documentName')
          } else if (documentId) {
            PerformanceMonitor.recordCacheMiss('QueueService.addJob.documentName')
          }

          // If we have all cached values, skip database query
          const needsQuery = (projectId && !projectName) || (templateId && !templateName) || (documentId && !documentName)

          if (needsQuery) {
            // Build query with conditional JOINs
            const dbQueryTiming = PerformanceMonitor.start('QueueService.addJob.nameResolutionQuery')
            const selectFields: string[] = []
            const joins: string[] = []
            const params: (string | null)[] = []
            let paramIndex = 1

            if (projectId && !projectName) {
              selectFields.push('p.name as project_name')
              joins.push('LEFT JOIN projects p ON p.id = $' + paramIndex)
              params.push(projectId)
              paramIndex++
            } else {
              selectFields.push('NULL as project_name')
            }

            if (templateId && !templateName) {
              selectFields.push('t.name as template_name')
              joins.push('LEFT JOIN templates t ON t.id = $' + paramIndex)
              params.push(templateId)
              paramIndex++
            } else {
              selectFields.push('NULL as template_name')
            }

            if (documentId && !documentName) {
              selectFields.push('d.name as document_name')
              joins.push('LEFT JOIN documents d ON d.id = $' + paramIndex)
              params.push(documentId)
              paramIndex++
            } else {
              selectFields.push('NULL as document_name')
            }

            // Use a dummy table for the query (PostgreSQL requires FROM clause)
            const query = `
              SELECT ${selectFields.join(', ')}
              FROM (SELECT 1) as dummy
              ${joins.join(' ')}
            `

            const result = await this.dependencies.database.query(query, params)
            dbQueryTiming()

            if (result.rows.length > 0) {
              const row = result.rows[0]
              if (row.project_name && !projectName) {
                projectName = row.project_name
                // Cache for 1 hour (project names don't change often)
                if (cacheKeys.project) await this.dependencies.cache.set(cacheKeys.project, projectName, 3600)
              }
              if (row.template_name && !templateName) {
                templateName = row.template_name
                // Cache for 1 hour
                if (cacheKeys.template) await this.dependencies.cache.set(cacheKeys.template, templateName, 3600)
              }
              if (row.document_name && !documentName) {
                documentName = row.document_name
                // Cache for 30 minutes (documents can be renamed)
                if (cacheKeys.document) await this.dependencies.cache.set(cacheKeys.document, documentName, 1800)
              }
            }
          }
        } catch (err) {
          this.dependencies.logger.warn('Failed to lookup names for job (falling back to individual queries):', err)
          // Fallback to individual queries if optimized query fails
          if (projectId && !projectName) {
            try {
              const projectResult = await this.dependencies.database.query('SELECT name FROM projects WHERE id = $1', [projectId])
              if (projectResult.rows.length > 0) {
                projectName = projectResult.rows[0].name
              }
            } catch (e) {
              this.dependencies.logger.warn('Failed to lookup project name:', e)
            }
          }
          if (templateId && !templateName) {
            try {
              const templateResult = await this.dependencies.database.query('SELECT name FROM templates WHERE id = $1', [templateId])
              if (templateResult.rows.length > 0) {
                templateName = templateResult.rows[0].name
              }
            } catch (e) {
              this.dependencies.logger.warn('Failed to lookup template name:', e)
            }
          }
          if (documentId && !documentName) {
            try {
              const docResult = await this.dependencies.database.query('SELECT name FROM documents WHERE id = $1', [documentId])
              if (docResult.rows.length > 0) {
                documentName = docResult.rows[0].name
              }
            } catch (e) {
              this.dependencies.logger.warn('Failed to lookup document name:', e)
            }
          }
        }
      }

      // ATOMIC OPERATION: Save to database first, then add to queue
      // If queue add fails, rollback database entry
      const dbInsertTiming = PerformanceMonitor.start('QueueService.addJob.databaseInsert')
      try {
        // Get or create a worker ID for this job
        // Workers are automatically available when the server is running (processors are registered)
        // Use a placeholder worker ID that will be updated when processing starts
        const placeholderWorkerId = `worker-pending-${process.pid}`

        // Step 1: Insert into database with placeholder worker_id
        // The worker_id will be updated to the actual worker when processing starts
        await this.dependencies.database.query(
          `
          INSERT INTO jobs (id, type, status, data, created_by, project_id, project_name, template_name, document_name, queue_name, queued_at, worker_id)
          VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
        `,
          [jobId, validatedType, JSON.stringify(validatedData), validatedData.userId, projectId, projectName, templateName, documentName, queueName, placeholderWorkerId]
        )
        dbInsertTiming()

        // Step 2: Add to queue using abstraction
        const queueAddTiming = PerformanceMonitor.start('QueueService.addJob.queueAdd')
        try {
          await queue.add(validatedType, validatedData, {
            jobId, // Use the validated jobId
            priority: options?.priority || 0,
            delay: options?.delay || 0,
            attempts: options?.attempts,
            backoff: options?.backoff,
            timeout: options?.timeout,
            removeOnComplete: options?.removeOnComplete,
            removeOnFail: options?.removeOnFail,
            ...options,
          })
          queueAddTiming()

          this.dependencies.logger.info(`Job added to queue: ${jobId} (${validatedType})`)

          // Log cache performance periodically
          const cacheStats = PerformanceMonitor.getCacheStats('QueueService.addJob.projectName')
          if (cacheStats && (cacheStats.hits + cacheStats.misses) % 50 === 0) {
            this.dependencies.logger.debug('Cache performance', {
              projectName: PerformanceMonitor.getCacheStats('QueueService.addJob.projectName'),
              templateName: PerformanceMonitor.getCacheStats('QueueService.addJob.templateName'),
              documentName: PerformanceMonitor.getCacheStats('QueueService.addJob.documentName'),
            })
          }

          return jobId
        } catch (queueError: unknown) {
          // Queue add failed - rollback database entry
          const errorMessage = queueError instanceof Error ? queueError.message : String(queueError)
          this.dependencies.logger.error(`Failed to add job to queue, rolling back database entry: ${jobId}`, queueError)
          try {
            await this.dependencies.database.query('DELETE FROM jobs WHERE id = $1', [jobId])
            this.dependencies.logger.info(`Rolled back database entry for job: ${jobId}`)
          } catch (rollbackError) {
            this.dependencies.logger.error(`Failed to rollback database entry for job ${jobId}:`, rollbackError)
            // Mark as failed in database since we can't delete it
            await this.dependencies.database.query(
              `UPDATE jobs SET status = 'failed', error_message = $1, 
                   started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
                   processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
                   completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [`Failed to add to queue: ${errorMessage}`, jobId]
            )
          }
          throw new JobQueueError(
            `Failed to add job to queue: ${errorMessage}`,
            queueName,
            jobId,
            validatedType
          )
        }
      } catch (dbError: unknown) {
        // Database insert failed - don't add to queue
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
        this.dependencies.logger.error(`Failed to insert job into database: ${jobId}`, dbError)
        throw new JobDatabaseError(
          `Failed to create job record: ${errorMessage}`,
          'INSERT',
          jobId,
          validatedType
        )
      }
    } catch (error) {
      // Re-throw JobError instances as-is, wrap others
      if (error instanceof JobValidationError || error instanceof JobTypeError || error instanceof StuckJobsError || error instanceof JobQueueError || error instanceof JobDatabaseError) {
        throw error
      }
      this.dependencies.logger.error("Failed to add job:", error)
      throw new JobQueueError(
        `Failed to add job to queue: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        jobId,
        validatedType
      )
    } finally {
      // Always end the main timing
      endTiming()
    }
  }

  /**
   * Get job status from database
   */
  async getJobStatus(jobId: string): Promise<any> {
    const endTiming = PerformanceMonitor.start('QueueService.getJobStatus')
    try {
      const result = await this.dependencies.database.query(
        'SELECT * FROM jobs WHERE id = $1',
        [jobId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0]
    } catch (error) {
      this.dependencies.logger.error('Failed to get job status', { jobId, error })
      throw new JobDatabaseError(
        `Failed to get job status: ${error instanceof Error ? error.message : String(error)}`,
        jobId
      )
    } finally {
      endTiming()
    }
  }

  /**
   * Update job status in database
   */
  async updateJobStatus(
    jobId: string,
    status: string,
    progress?: number,
    workerId?: string,
    queueName?: string,
    errorMessage?: string
  ): Promise<void> {
    const endTiming = PerformanceMonitor.start('QueueService.updateJobStatus')
    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      updates.push(`status = $${paramIndex++}`)
      values.push(status)

      if (progress !== undefined) {
        updates.push(`progress = $${paramIndex++}`)
        values.push(progress)
      }

      if (workerId) {
        updates.push(`worker_id = $${paramIndex++}`)
        values.push(workerId)
      }

      if (queueName) {
        updates.push(`queue_name = $${paramIndex++}`)
        values.push(queueName)
      }

      if (errorMessage !== undefined) {
        updates.push(`error_message = $${paramIndex++}`)
        values.push(errorMessage)
      }

      if (status === 'processing' && !updates.some(u => u.includes('processing_started_at'))) {
        updates.push(`processing_started_at = CURRENT_TIMESTAMP`)
      }

      if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`)
      }

      if (status === 'failed') {
        updates.push(`failed_at = CURRENT_TIMESTAMP`)
      }

      values.push(jobId)

      await this.dependencies.database.query(
        `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      )
    } catch (error) {
      this.dependencies.logger.error('Failed to update job status', { jobId, status, error })
      throw new JobDatabaseError(
        `Failed to update job status: ${error instanceof Error ? error.message : String(error)}`,
        jobId
      )
    } finally {
      endTiming()
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const endTiming = PerformanceMonitor.start('QueueService.cancelJob')
    try {
      // Update database
      await this.dependencies.database.query(
        "UPDATE jobs SET status = 'cancelled' WHERE id = $1",
        [jobId]
      )

      // Try to remove from all queues
      for (const [queueName, queue] of this.queues) {
        try {
          const job = await queue.getJob(jobId)
          if (job) {
            await job.remove()
            this.dependencies.logger.info(`Job ${jobId} removed from queue ${queueName}`)
          }
        } catch (error) {
          // Continue trying other queues
          this.dependencies.logger.debug(`Job ${jobId} not found in queue ${queueName}`)
        }
      }
    } catch (error) {
      this.dependencies.logger.error('Failed to cancel job', { jobId, error })
      throw new JobQueueError(
        `Failed to cancel job: ${error instanceof Error ? error.message : String(error)}`,
        jobId
      )
    } finally {
      endTiming()
    }
  }

  /**
   * Get dependencies (for testing or advanced use cases)
   */
  getDependencies(): QueueServiceDependencies {
    return this.dependencies
  }
}

