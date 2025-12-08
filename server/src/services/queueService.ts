import Bull from "bull"
import { redisClient } from "../utils/redis"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { aiService } from "./aiService"
import { ContextAwareAIService } from "../modules/context/integration"
import { io } from "../server"
import { v4 as uuidv4 } from "uuid"
import { PMBOK_DOMAINS } from "@/types/pmbok"
import type { PmbokDomain } from "@/types/pmbok"
import DocumentPurposeService from "./documentPurposeService"
import TemplateAnalyticsService from "./templateAnalyticsService"
import { EventEmitter } from "events"
// Phase 3: Type Safety and Validation
import type { JobType, JobData, JobOptions, QueueName } from "./jobs/types"
import { validateJobData, validateJobType } from "./jobs/validation"
// Phase 5: Queue Service Dependencies
import type { QueueServiceDependencies } from "./jobs/queue/QueueDependencies"
import {
  JobValidationError,
  JobTypeError,
  JobQueueError,
  JobDatabaseError,
  StuckJobsError,
} from "./jobs/errors"
// Phase 4: Query result caching
import { cache } from "../utils/redis"
// Phase 5: Performance monitoring utilities
import { PerformanceMonitor } from "../utils/performanceMonitor"

// Set global max listeners for all EventEmitters to prevent MaxListenersExceededWarning
// Bull queues create multiple Redis connections (Commander instances) with many event listeners
// With 8 queues, we need a higher limit to accommodate all listeners
EventEmitter.defaultMaxListeners = 150

// Helper function to parse Redis URL for Bull
function parseBullRedisConfig() {
  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    // Fallback to localhost
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
  
  // Parse Railway/cloud Redis URL (rediss://default:password@host:port)
  try {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username !== 'default' ? url.username : undefined,
      tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null, // Important for cloud Redis
      enableReadyCheck: false,
    }
  } catch (error) {
    logger.error('Failed to parse REDIS_URL, using localhost', error)
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}

const bullRedisConfig = parseBullRedisConfig()

// Create job queues using parsed Redis configuration
const aiQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    timeout: 600000, // 10 minutes timeout for AI generation
  },
  settings: {
    lockDuration: 600000, // 10 minutes lock (AI generation can take time)
    stallInterval: 30000, // Check for stalls every 30 seconds
    maxStalledCount: 2, // Allow 2 stalls before failing
  },
}

export const aiQueue = new Bull("ai-processing", aiQueueOptions)

const documentQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
  },
}

export const documentQueue = new Bull("document-processing", documentQueueOptions)

const pipelineQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    timeout: 600000, // 10 minutes timeout for pipeline jobs
  },
  settings: {
    lockDuration: 600000, // 10 minutes lock
    stallInterval: 30000, // Check every 30 seconds
    maxStalledCount: 2,
  },
}

export const pipelineQueue = new Bull("pipeline-processing", pipelineQueueOptions)

const baselineQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep baseline jobs for audit
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    timeout: 300000, // 5 minutes timeout for baseline extraction
  },
}

export const baselineQueue = new Bull("baseline-processing", baselineQueueOptions)

const processFlowQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    timeout: 3600000, // 60 minutes timeout for process flow (compression is slow with many docs)
  },
  settings: {
    lockDuration: 3600000, // 60 minutes lock for long-running process flow (handles dynamic document sets with AI compression and caching)
    stallInterval: 60000, // Check every 60 seconds (less aggressive)
    maxStalledCount: 3, // Allow 3 stalls before failing
  },
}

export const processFlowQueue = new Bull("process-flow-processing", processFlowQueueOptions)

const regenerationQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    timeout: 600000, // 10 minutes timeout for regeneration
  },
  settings: {
    lockDuration: 600000, // 10 minutes lock
    stallInterval: 30000,
    maxStalledCount: 2,
  },
}

export const regenerationQueue = new Bull("document-regeneration", regenerationQueueOptions)

// Quality Audit Queue Options
const qualityAuditQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    timeout: 120000, // 2 minutes timeout for AI quality analysis
  },
}

export const qualityAuditQueue = new Bull("quality-audit", qualityAuditQueueOptions)

// Project Data Extraction Queue Options
const extractionQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    timeout: 600000, // 10 minutes timeout for AI extraction (13 parallel calls)
  },
}

export const extractionQueue = new Bull("project-data-extraction", extractionQueueOptions)

// Helper function to set max listeners on all queue Redis connections
// This prevents MaxListenersExceededWarning when multiple queues share Redis connections
// Bull queues use ioredis internally, which creates Commander instances that can have many listeners
function setQueueMaxListeners() {
  const queues = [
    aiQueue,
    documentQueue,
    pipelineQueue,
    baselineQueue,
    processFlowQueue,
    regenerationQueue,
    qualityAuditQueue,
    extractionQueue,
  ]
  
  queues.forEach((queue) => {
    try {
      // Bull uses ioredis, which has a client property
      // The client may not be initialized immediately, so we try to set it
      // and also set it when the queue is ready
      // Set to 150 to safely accommodate 8 queues with multiple event listeners each
      // Bull creates multiple Redis connections per queue (commander, subscriber, etc.)
      // Each connection can have many listeners (error, ready, end, job events, etc.)
      const maxListeners = 150
      
      if (queue.client) {
        // Set max listeners on the main client
        if (typeof queue.client.setMaxListeners === 'function') {
          queue.client.setMaxListeners(maxListeners)
        }
        
        // Also set on the commander (subscriber) if it exists
        // Commander is the Redis connection used for commands
        const commander = (queue.client as any).commander
        if (commander && typeof commander.setMaxListeners === 'function') {
          commander.setMaxListeners(maxListeners)
        }
        
        // Set on subscriber if it exists (for pub/sub)
        const subscriber = (queue.client as any).subscriber
        if (subscriber && typeof subscriber.setMaxListeners === 'function') {
          subscriber.setMaxListeners(maxListeners)
        }
        
        // Set on all internal Redis connections that Bull might create
        // Bull creates multiple connections: one for commands, one for subscriptions, etc.
        try {
          const allConnections = [
            queue.client,
            (queue.client as any).connector,
            (queue.client as any).commandQueue,
            (queue.client as any).commandTimeout,
            (queue.client as any).connector?.connection,
          ].filter(Boolean)
          
          allConnections.forEach((conn: any) => {
            if (conn && typeof conn.setMaxListeners === 'function') {
              conn.setMaxListeners(maxListeners)
            }
            // Also check for commander on connections
            if (conn?.commander && typeof conn.commander.setMaxListeners === 'function') {
              conn.commander.setMaxListeners(maxListeners)
            }
            if (conn?.subscriber && typeof conn.subscriber.setMaxListeners === 'function') {
              conn.subscriber.setMaxListeners(maxListeners)
            }
          })
        } catch (err) {
          // Ignore errors - not critical
        }
      }
      
      // Also set on the queue's event emitter itself
      if (typeof queue.setMaxListeners === 'function') {
        queue.setMaxListeners(maxListeners)
      }
    } catch (error) {
      // Silently fail - not critical if we can't set max listeners
      logger.debug(`Could not set max listeners for queue ${queue.name}:`, error)
    }
  })
  
  logger.info('Set max listeners on all Bull queue Redis connections')
}

// Set max listeners after all queues are created
setQueueMaxListeners()

// Also set max listeners when queues are ready (in case clients weren't initialized yet)
const allQueues = [
  aiQueue,
  documentQueue,
  pipelineQueue,
  baselineQueue,
  processFlowQueue,
  regenerationQueue,
  qualityAuditQueue,
  extractionQueue,
]

allQueues.forEach((queue) => {
  queue.on('ready', () => {
    try {
      const maxListeners = 150 // Match the value in setQueueMaxListeners
      if (queue.client && typeof queue.client.setMaxListeners === 'function') {
        queue.client.setMaxListeners(maxListeners)
        const commander = (queue.client as any).commander
        if (commander && typeof commander.setMaxListeners === 'function') {
          commander.setMaxListeners(maxListeners)
        }
        const subscriber = (queue.client as any).subscriber
        if (subscriber && typeof subscriber.setMaxListeners === 'function') {
          subscriber.setMaxListeners(maxListeners)
        }
        
        // Set on all internal connections
        const allConnections = [
          queue.client,
          (queue.client as any).connector,
          (queue.client as any).commandQueue,
        ].filter(Boolean)
        
        allConnections.forEach((conn: any) => {
          if (conn && typeof conn.setMaxListeners === 'function') {
            conn.setMaxListeners(maxListeners)
          }
          if (conn?.commander && typeof conn.commander.setMaxListeners === 'function') {
            conn.commander.setMaxListeners(maxListeners)
          }
          if (conn?.subscriber && typeof conn.subscriber.setMaxListeners === 'function') {
            conn.subscriber.setMaxListeners(maxListeners)
          }
        })
      }
    } catch (error) {
      // Ignore errors
    }
  })
})

// Job processors
// Phase 5: Updated to pass dependencies to job services
aiQueue.process("ai-generate", async (job) => {
  // Delegate to AIGenerationJobService (extracted in Phase 2 refactoring)
  const { AIGenerationJobService } = await import('./jobs/AIGenerationJobService')
  const deps = await getQueueServiceDependencies()
  return await AIGenerationJobService.processJob(job, {
    workerId: WORKER_ID,
    updateJobStatus,
    dependencies: deps
  }, deps)
})

documentQueue.process("document-convert", async (job) => {
  // Delegate to DocumentConversionJobService (extracted in Phase 2 refactoring)
  // Phase 5: Pass dependencies to job service
  const { DocumentConversionJobService } = await import('./jobs/DocumentConversionJobService')
  const deps = await getQueueServiceDependencies()
  return await DocumentConversionJobService.processJob(job, {
    workerId: WORKER_ID,
    updateJobStatus,
    dependencies: deps
  }, deps)
})

baselineQueue.process("baseline-extract", async (job) => {
  // Delegate to BaselineExtractionJobService (extracted in Phase 2 refactoring)
  // Phase 5: Pass dependencies to job service
  const { BaselineExtractionJobService } = await import('./jobs/BaselineExtractionJobService')
  const deps = await getQueueServiceDependencies()
  return await BaselineExtractionJobService.processJob(job, {
    workerId: WORKER_ID,
    updateJobStatus,
    dependencies: deps
  }, deps)
})

// Process Flow job processor
processFlowQueue.process("process-flow", async (job) => {
  const { jobId, userId, config } = job.data

  try {
    // Safety check: ensure pool is available
    if (!pool) {
      logger.error(`Process-flow job ${jobId}: Database connection pool is not available`)
      // Can't update status without pool, fail gracefully
      throw new Error('Database connection pool is not available')
    }
    
    // Update job status to processing
    await updateJobStatus(jobId, "processing", 5, WORKER_ID, "process-flow-processing")
    
    // Get project name for better job identification
    let projectName = 'Unknown Project'
    let documentName = config.documentName || config.templateName || 'Process Flow Document'
    try {
      const projectResult = await pool.query(
        'SELECT name FROM projects WHERE id = $1',
        [config.projectId]
      )
      if (projectResult.rows.length > 0) {
        projectName = projectResult.rows[0].name
      }
    } catch (error) {
      logger.warn(`Could not fetch project name for ${config.projectId}`)
    }
    
    logger.info(`Starting process-flow job ${jobId} for project: ${projectName} (${config.projectId})`)
    
    // Update job data with initial steps
    const totalSteps = config.includeStakeholders ? 7 : 6
    await pool.query(
      `UPDATE jobs 
       SET data = jsonb_set(
         COALESCE(data, '{}'::jsonb), 
         '{currentStep}', 
         to_jsonb($1::text)
       )
       WHERE id = $2`,
      ['Initializing workflow...', jobId]
    )
    
    // Get the ProcessFlowService
    const ProcessFlowService = (await import('./processFlowService')).default
    const processFlowService = new ProcessFlowService(pool)
    
    await updateJobStatus(jobId, "processing", 10)
    
    // Create a progress callback to update job status during processing
    const updateStepProgress = async (stepName: string, stepNumber: number, totalSteps: number) => {
      const progress = Math.floor(10 + (stepNumber / totalSteps) * 80) // 10% to 90%
      
      await pool.query(
        `UPDATE jobs 
         SET data = jsonb_set(
           jsonb_set(
             COALESCE(data, '{}'::jsonb), 
             '{currentStep}', 
             to_jsonb($1::text)
           ),
           '{stepProgress}',
           to_jsonb($2::int)
         ),
         progress = $3
         WHERE id = $4`,
        [stepName, stepNumber, progress, jobId]
      )
      
      // Emit real-time step update
      io.emit("job:step-update", {
        jobId,
        userId,
        currentStep: stepName,
        stepNumber,
        totalSteps,
        progress
      })
      
      logger.info(`Process-flow job ${jobId}: Step ${stepNumber}/${totalSteps} - ${stepName}`)
    }
    
    // Track documents with their start times across batches
    const documentStartTimes = new Map<string, number>()
    
    // Create progress callback for document compression
    const onCompressionProgress = async (stepName: string, current: number, total: number, details?: any) => {
      // Calculate progress: 10% (init) + up to 70% for compression + 20% for finalization
      const compressionProgress = Math.floor(10 + (current / total) * 70)
      
      // Track document start time when first seen
      if (details?.documentId && !documentStartTimes.has(details.documentId)) {
        documentStartTimes.set(details.documentId, Date.now())
      }
      
      // Get provider assignments from details (passed from processFlowService)
      const providerAssignments = details?.providerAssignments || []
      const assignedProvider = details?.assignedProvider
      
      // Build message showing current processing status
      const stepMessage = providerAssignments.length > 0
        ? `AI providers processing ${providerAssignments.length} document${providerAssignments.length > 1 ? 's' : ''} (${current}/${total} completed)`
        : `${stepName}: ${current}/${total} - ${details?.documentName || 'processing...'}`
      
      await pool.query(
        `UPDATE jobs 
         SET data = jsonb_set(
           jsonb_set(
             jsonb_set(
               jsonb_set(
                 COALESCE(data, '{}'::jsonb), 
                 '{currentStep}', 
                 to_jsonb($1::text)
               ),
               '{compressionProgress}',
               to_jsonb($2::jsonb)
             ),
             '{currentDocument}',
             to_jsonb($3::jsonb)
           ),
           '{providerAssignments}',
           to_jsonb($6::jsonb)
         ),
         progress = $4
         WHERE id = $5`,
        [
          stepMessage, 
          JSON.stringify({ current, total, percentage: Math.floor((current / total) * 100) }),
          JSON.stringify(details || {}),
          compressionProgress,
          jobId,
          JSON.stringify(providerAssignments)
        ]
      )
      
      // Emit real-time update with provider assignments
      io.emit("job:step-update", {
        jobId,
        userId,
        currentStep: stepMessage,
        compressionProgress: { current, total, percentage: Math.floor((current / total) * 100) },
        currentDocument: details,
        providerAssignments,
        parallelCount: providerAssignments.length,
        progress: compressionProgress,
        projectId: config?.projectId,
        projectName,
        documentName,
        templateName: config?.templateName
      })
    }
    
    await updateStepProgress('Initializing workflow', 1, totalSteps)
    
    // Run the workflow processing with progress callback
    const configWithCallback = {
      ...config,
      onProgress: onCompressionProgress
    }
    
    const result = await processFlowService.startWorkflowProcessing(configWithCallback)
    
    await updateJobStatus(jobId, "processing", 95)
    await updateStepProgress('Finalizing document...', totalSteps, totalSteps)
    
    // Update job to completed with detailed result
    await pool.query(
      `UPDATE jobs 
       SET status = 'completed', 
           result = $1, 
           progress = 100, 
           completed_at = CURRENT_TIMESTAMP,
           data = jsonb_set(
             COALESCE(data, '{}'::jsonb),
             '{currentStep}',
             to_jsonb('Completed'::text)
           )
       WHERE id = $2`,
      [JSON.stringify({
        workflowId: result.workflowId,
        documentId: result.savedDocument.id,
        documentName: result.savedDocument.name,
        stepsCompleted: result.steps.length,
        steps: result.steps,
        finalDocumentLength: result.finalDocument.length,
        totalTokens: result.steps.reduce((sum, step) => sum + step.tokens, 0)
      }), jobId]
    )
    
    // Emit success notification
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      message: `Process flow workflow completed: ${result.savedDocument.name}`,
      projectId: config.projectId,
      documentId: result.savedDocument.id,
      documentName: result.savedDocument.name
    })
    
    logger.info(`Process-flow job completed: ${jobId}`)
    
  } catch (error: any) {
    logger.error(`Process-flow job failed: ${jobId}`, error)
    
    // Only update database if pool is available
    if (pool) {
      await pool.query(
        `UPDATE jobs 
         SET status = 'failed', 
             error_message = $1, 
             completed_at = CURRENT_TIMESTAMP,
             data = jsonb_set(
               COALESCE(data, '{}'::jsonb),
               '{currentStep}',
               to_jsonb('Failed'::text)
             )
         WHERE id = $2`,
        [error.message || "Process-flow job failed", jobId]
      )
    }
    
    io.emit("job:failed", {
      jobId,
      userId,
      status: "failed",
      error: error.message || "Process-flow job failed",
      projectId: config?.projectId,
    })
    
    throw error
  }
})

// Document Regeneration job processor
regenerationQueue.process("document-regeneration", async (job) => {
  const { jobId, documentId, templateId, provider, model, versionType, temperature, userId } = job.data

  try {
    logger.info(`Starting document regeneration job ${jobId} for document ${documentId}`)
    
    // Execute regeneration using the service
    const { DocumentRegenerationService } = await import('./documentRegenerationService')
    await DocumentRegenerationService.executeRegenerationJob({
      documentId,
      templateId,
      provider,
      model,
      versionType,
      temperature,
      userId,
      jobId
    })
    
    logger.info(`Document regeneration job completed: ${jobId}`)
    
    return { success: true, jobId }
  } catch (error) {
    logger.error(`Document regeneration job failed: ${jobId}`, error)
    throw error
  }
})

// Regeneration queue event listeners
regenerationQueue.on("completed", (job, result) => {
  logger.info(`Regeneration job completed: ${job.id}`)
})

regenerationQueue.on("failed", (job, err) => {
  logger.error(`Regeneration job failed: ${job.id}`, err)
})

// Quality Audit job processor
qualityAuditQueue.process("quality-audit", async (job) => {
  const { jobId, documentId, documentContent, documentType, projectContext, userId } = job.data

  try {
    // Update job status to processing and assign worker
    await updateJobStatus(jobId, "processing", 10, WORKER_ID, "quality-audit")

    logger.info(`[QUALITY-AUDIT-JOB] Starting quality audit job ${jobId} for document ${documentId}`)

    // Import quality audit service
    const { qualityAuditService } = await import('./qualityAuditService')

    // Run the audit
    const auditResult = await qualityAuditService.auditDocument(
      documentId,
      documentContent,
      documentType,
      projectContext,
      userId
    )

    // Update job status to completed
    await updateJobStatus(jobId, "completed", 100, WORKER_ID, "quality-audit")

    logger.info(`[QUALITY-AUDIT-JOB] Quality audit completed: ${jobId}`, {
      overallScore: auditResult.overallScore,
      grade: auditResult.overallGrade
    })

    return { success: true, auditResult, jobId }
  } catch (error) {
    logger.error(`[QUALITY-AUDIT-JOB] Quality audit job failed: ${jobId}`, error)
    
    // Update job status to failed
    await updateJobStatus(
      jobId, 
      "failed", 
      0, 
      WORKER_ID, 
      "quality-audit"
    )
    
    throw error
  }
})

// Quality Audit queue event listeners
qualityAuditQueue.on("completed", (job, result) => {
  logger.info(`Quality audit job completed: ${job.id}`)
})

qualityAuditQueue.on("failed", (job, err) => {
  logger.error(`Quality audit job failed: ${job.id}`, err)
})

// Project Data Extraction job processor
// Define entity types for granular extraction
// Includes all PMBOK 8 performance domain entities and knowledge area domain entities
const ENTITY_TYPES = [
  // Core entities (existing)
  'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
  'success_criteria', 'best_practices', 'phases', 'resources',
  'technologies', 'quality_standards', 'compliance_security', 'deliverables', 'scope_items', 'activities',
  
  // PMBOK 8 Performance Domain entities
  'team_agreements', 'development_approaches', 'project_iterations', 'work_items',
  'capacity_plans', 'performance_measurements', 'earned_value_metrics', 'opportunities', 'risk_responses',
  'performance_actuals',
  
  // PMBOK 8 Knowledge Area Domain entities (Tier 2)
  // Governance Domain
  'governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance',
  // Scope Domain
  'scope_baselines', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
  // Schedule Domain
  'schedule_baselines', 'schedule_activities', 'critical_path_activities', 'schedule_variances', 'schedule_forecasts',
  // Finance Domain
  'budget_baselines', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs',
  // Resources Domain
  'resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding',
  // Risk Domain
  'risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics',
  // Stakeholders Ops Domain
  'engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health'
] as const

type EntityType = typeof ENTITY_TYPES[number]

// Note: DOMAIN_ENTITY_MAP, DomainCountSummary, ENTITY_COUNT_KEY_MAP, and related helper functions
// have been moved to ExtractionOrchestrationService.ts as part of Phase 2 refactoring

/**
 * Parent Job: Orchestrate extraction by creating child jobs for each entity type
 */
logger.info('[EXTRACTION-QUEUE] Registering extraction queue processor for "extract-project-data"')
extractionQueue.process("extract-project-data", 1, async (job) => {
  // Delegate to ExtractionOrchestrationService (extracted in Phase 2 refactoring)
  // Phase 5: Pass dependencies to job service
  const { ExtractionOrchestrationService } = await import('./jobs/ExtractionOrchestrationService')
  const deps = await getQueueServiceDependencies()
  return await ExtractionOrchestrationService.processJob(job, {
    workerId: WORKER_ID,
    updateJobStatus,
    dependencies: deps
  }, deps)
})

/**
 * Child Job: Extract and save a single entity type
 * Register handlers for each entity type explicitly
 * 
 * Note: Child processors remain in queueService.ts as they're straightforward
 * and don't require extraction into a separate service.
 */
ENTITY_TYPES.forEach((entityType) => {
  extractionQueue.process(`extract-entity-${entityType}`, 5, async (job) => {
    const { parentJobId, projectId, userId, aiProvider, aiModel, documentIds } = job.data
    
    try {
      logger.info(`[EXTRACTION-CHILD] Extracting ${entityType} for job ${parentJobId}`)
      
      const { projectDataExtractionService } = await import('./projectDataExtractionService')
      
      // Extract this specific entity type
      const entities = await projectDataExtractionService.extractSingleEntityType(
        projectId,
        userId,
        entityType,
        { aiProvider, aiModel, documentIds }
      )
      
      logger.info(`[EXTRACTION-CHILD] Extracted ${entities.length} ${entityType}`)
      
      // Save immediately after extraction (resilient)
      await projectDataExtractionService.saveSingleEntityType(
        projectId,
        userId,
        entityType,
        entities
      )
      
      logger.info(`[EXTRACTION-CHILD] Saved ${entities.length} ${entityType}`)
      
      return { entityType, count: entities.length }
      
    } catch (error: any) {
      logger.error(`[EXTRACTION-CHILD] Failed to extract ${entityType}: ${error.message}`, {
        parentJobId,
        entityType,
        projectId,
        error: error.message,
        stack: error.stack,
        provider: aiProvider,
        model: aiModel
      })
      throw error // Bull will retry automatically (up to 3 attempts)
    }
  })
})

// Extraction queue event listeners
extractionQueue.on("completed", (job, result) => {
  logger.info(`[EXTRACTION-JOB] Completed: ${job.id}`, { totalEntities: result.totalEntities })
})

extractionQueue.on("failed", (job, err) => {
  logger.error(`[EXTRACTION-JOB] Failed: ${job.id}`, err)
})

// Job management functions
// Phase 5: Migrated to use QueueService.addJob() with full stuck job checking and caching
export async function addJob(
  type: string,
  data: unknown,
  options?: JobOptions
): Promise<string> {
  try {
    // Phase 5: Use QueueService for all job creation logic
    const queueService = await getQueueServiceInstance()
    return await queueService.addJob(type as JobType, data, options)
  } catch (error) {
    // Re-throw JobError instances as-is
    if (error instanceof JobValidationError || error instanceof JobTypeError || error instanceof StuckJobsError || error instanceof JobQueueError || error instanceof JobDatabaseError) {
      throw error
    }
    // Wrap unexpected errors
    logger.error("Failed to add job:", error)
    throw error
  }
}

export interface JobStatusResult {
  id: string
  type: JobType
  status: JobStatus
  progress: number | null
  data: JobData
  created_by: string | null
  project_id: string | null
  project_name: string | null
  template_name: string | null
  document_name: string | null
  queue_name: QueueName | null
  error_message: string | null
  result: unknown
  created_at: Date
  started_at: Date | null
  completed_at: Date | null
  processing_started_at: Date | null
  queued_at: Date | null
}

export async function getJobStatus(jobId: string): Promise<JobStatusResult | null> {
  try {
    // Phase 5: Use QueueService if available, fallback to direct query
    const queueService = await getQueueServiceInstance()
    if (queueService) {
      const status = await queueService.getJobStatus(jobId)
      return status as JobStatusResult | null
    }
    
    // Fallback to direct query
    const result = await pool.query(
      "SELECT * FROM jobs WHERE id = $1",
      [jobId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as JobStatusResult
  } catch (error) {
    logger.error(`Failed to get job status: ${jobId}`, error)
    return null
  }
}

// Generate unique worker ID for this process
const WORKER_ID = `worker-${process.pid}-${Date.now()}`

export async function updateJobStatus(
  jobId: string, 
  status: JobStatus, 
  progress?: number, 
  workerId?: string,
  queueName?: QueueName | string,
  errorMessage?: string
): Promise<void> {
  try {
    // Phase 5: Use QueueService for basic update, then add additional features
    const queueService = await getQueueServiceInstance()
    if (queueService) {
      // Use QueueService for the basic database update
      await queueService.updateJobStatus(jobId, status, progress, workerId, queueName)
    } else {
      // Fallback to direct query (shouldn't happen, but safety first)
      await pool.query(
        `UPDATE jobs SET status = $1 WHERE id = $2`,
        [status, jobId]
      )
    }

    // Additional features beyond QueueService (worker process ID, data JSONB update, etc.)
    const updateFields = ["status = $2"]
    const params: any[] = [jobId, status]
    let paramCount = 2

    if (progress !== undefined) {
      paramCount++
      updateFields.push(`progress = $${paramCount}`)
      params.push(progress.toString())
    }

    // Add worker ID and process ID when job starts processing
    if (workerId) {
      paramCount++
      updateFields.push(`worker_id = $${paramCount}`)
      params.push(workerId)
      
      // Add worker process ID
      paramCount++
      updateFields.push(`worker_process_id = $${paramCount}`)
      params.push(process.pid)
      
      // Update data JSONB to include worker_id for backward compatibility
      paramCount++
      updateFields.push(`data = jsonb_set(COALESCE(data, '{}'::jsonb), '{worker_id}', to_jsonb($${paramCount}::text))`)
      params.push(workerId)
    }

    // Add error message if provided
    if (errorMessage) {
      paramCount++
      updateFields.push(`error_message = $${paramCount}`)
      params.push(errorMessage)
    }

    // Add queue name
    if (queueName) {
      paramCount++
      updateFields.push(`queue_name = $${paramCount}`)
      params.push(queueName)
    }

    if (status === "processing" && progress === 10) {
      updateFields.push(`started_at = CURRENT_TIMESTAMP`)
      updateFields.push(`processing_started_at = CURRENT_TIMESTAMP`)
    }

    // Prevent long-running workers (especially extraction monitors) from
    // resurrecting jobs that have already been marked as failed/cancelled.
    // When transitioning *to* "processing", only update rows that are still
    // in a "pending" or "processing" state AND don't have error messages.
    const whereClauses = ['id = $1']
    if (status === "processing") {
      whereClauses.push(`status IN ('pending','processing')`)
      whereClauses.push(`error_message IS NULL`) // Don't reset jobs with errors back to processing
    }

    // Apply additional updates
    if (updateFields.length > 1 || whereClauses.length > 1) {
      await pool.query(
        `UPDATE jobs SET ${updateFields.join(", ")} WHERE ${whereClauses.join(" AND ")}`,
        params
      )
    }

    // Emit real-time update with enriched data
    const jobResult = await pool.query(`
      SELECT j.*, 
             p.name as project_name, 
             t.name as template_name, 
             u.name as user_name,
             u.email as user_email
      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      LEFT JOIN templates t ON (j.data->>'template_id')::uuid = t.id
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = $1
    `, [jobId])
    
    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0]
      io.emit("job:status", {
        jobId,
        userId: job.created_by,
        status,
        progress,
        workerId,
        queueName,
        projectName: job.project_name,
        templateName: job.template_name,
        userName: job.user_name,
      })
    }
  } catch (error) {
    logger.error(`Failed to update job status: ${jobId}`, error)
  }
}

export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    // Phase 5: Use QueueService for basic cancellation, then add special handling
    const queueService = await getQueueServiceInstance()
    if (queueService) {
      try {
        await queueService.cancelJob(jobId)
      } catch (error) {
        // QueueService might not find the job, continue with special handling
        logger.debug(`QueueService cancelJob didn't find job ${jobId}, trying special handling`)
      }
    }

    // Special handling for extraction jobs and active jobs
    // Try to remove from ALL queues with special logic
    const queues = [
      { queue: aiQueue, name: 'aiQueue' },
      { queue: documentQueue, name: 'documentQueue' },
      { queue: pipelineQueue, name: 'pipelineQueue' },
      { queue: processFlowQueue, name: 'processFlowQueue' },
      { queue: regenerationQueue, name: 'regenerationQueue' },
      { queue: qualityAuditQueue, name: 'qualityAuditQueue' },
      { queue: extractionQueue, name: 'extractionQueue' },
      { queue: baselineQueue, name: 'baselineQueue' }
    ]

    let jobFound = false

    for (const { queue, name } of queues) {
      try {
        let job = await queue.getJob(jobId)

        // Special handling for extraction jobs:
        // project-data-extraction parents are enqueued without using jobId as the Bull ID,
        // so we need to locate them by payload.jobId instead.
        if (!job && name === 'extractionQueue') {
          const candidateJobs = await queue.getJobs(['active', 'waiting', 'delayed'])
          job = candidateJobs.find((j: any) => j.data?.jobId === jobId) || null
        }

        if (job) {
          // Check if job is currently processing
          const state = await job.getState()
          
          if (state === 'active') {
            // Job is actively running - move to failed instead of removing
            await job.moveToFailed({ message: 'Cancelled by user' }, true)
            logger.info(`Moved active job ${jobId} from ${name} to failed (was processing)`)
          } else {
            // Job is waiting/delayed - safe to remove
            await job.remove()
            logger.info(`Removed job ${jobId} from ${name}`)
          }
          
          jobFound = true
          break // Found it, no need to check other queues
        }
      } catch (queueError: any) {
        // Queue doesn't have this job, continue to next
        logger.debug(`Job ${jobId} not in ${name}`)
      }
    }

    if (!jobFound) {
      logger.warn(`Job ${jobId} not found in any queue`)
    }

    // Update database
    await pool.query(
      `
      UPDATE jobs 
      SET status = 'cancelled', 
          completed_at = CURRENT_TIMESTAMP,
          data = jsonb_set(
            COALESCE(data, '{}'::jsonb),
            '{currentStep}',
            to_jsonb('Cancelled by user'::text)
          )
      WHERE id = $1 AND status IN ('pending', 'processing')
    `,
      [jobId]
    )

    // Clear any monitoring intervals for extraction jobs
    if ((global as any).extractionIntervals) {
      const interval = (global as any).extractionIntervals.get(jobId)
      if (interval) {
        clearInterval(interval)
        ;(global as any).extractionIntervals.delete(jobId)
        logger.info(`Cleared monitoring interval for cancelled job: ${jobId}`)
      }
    }

    logger.info(`Job cancelled: ${jobId}`)
    
    // Emit WebSocket event to notify UI
    io.emit("job:cancelled", {
      jobId,
      status: "cancelled",
      timestamp: new Date().toISOString()
    })
    
    return true
  } catch (error) {
    logger.error(`Failed to cancel job: ${jobId}`, error)
    return false
  }
}

// Placeholder document conversion function
// Queue event handlers
aiQueue.on("completed", (job, result) => {
  logger.info(`AI job completed: ${job.id}`)
})

aiQueue.on("failed", (job, err) => {
  logger.error(`AI job failed: ${job.id}`, err)
})

documentQueue.on("completed", (job, result) => {
  logger.info(`Document job completed: ${job.id}`)
})

documentQueue.on("failed", (job, err) => {
  logger.error(`Document job failed: ${job.id}`, err)
})

// Pipeline queue processor
pipelineQueue.process("pipeline-processing", async (job) => {
  const { processPipelineJob } = await import("../workers/pipelineWorker")
  return await processPipelineJob(job)
})

// Pipeline queue event listeners
pipelineQueue.on("completed", (job, result) => {
  logger.info(`Pipeline job completed: ${job.id}`, { jobId: job.data.jobId })
})

pipelineQueue.on("failed", (job, err) => {
  logger.error(`Pipeline job failed: ${job.id}`, { jobId: job.data.jobId, error: err.message })
})

pipelineQueue.on("progress", (job, progress) => {
  logger.debug(`Pipeline job progress: ${job.id} - ${progress}%`)
})

// Initialize queues
export async function initializeQueues() {
  try {
    await aiService.initializeProviders()
    logger.info("Job queues initialized")
  } catch (error) {
    logger.error("Failed to initialize queues:", error)
  }
}

// Export queue service object
export const queueService = {
  addJob,
  getJobStatus,
  updateJobStatus,
  cancelJob,
  initializeQueues,
  aiQueue,
  documentQueue,
  pipelineQueue,
  baselineQueue,
  processFlowQueue,
  regenerationQueue,
  qualityAuditQueue,
  extractionQueue, // Add extraction queue to exports
}

// Phase 5: Helper function to get QueueServiceDependencies for job processors
// This allows processors to pass dependencies to job services
async function getQueueServiceDependencies() {
  const endTiming = PerformanceMonitor.start('getQueueServiceDependencies')
  try {
    const {
      PoolDatabaseAdapter,
      SocketIOWebSocketAdapter,
      RedisCacheAdapter,
      WinstonLoggerAdapter,
    } = await import('./jobs/queue/QueueDependencies')
    const { logger: winstonLogger } = await import('../utils/logger')
    const DocumentPurposeService = (await import('./documentPurposeService')).default
    const TemplateAnalyticsService = (await import('./templateAnalyticsService')).default

    // Note: AI services are passed directly (they don't need adapters as they're already interfaces)
    const dependencies: QueueServiceDependencies = {
      database: new PoolDatabaseAdapter(pool),
      websocket: new SocketIOWebSocketAdapter(io),
      cache: new RedisCacheAdapter(cache),
      aiService: aiService as any, // AI service is already compatible
      contextAwareAIService: ContextAwareAIService as any, // Context-aware AI service is already compatible
      logger: new WinstonLoggerAdapter(winstonLogger),
      documentPurposeService: DocumentPurposeService,
      templateAnalyticsService: TemplateAnalyticsService,
    }

    return dependencies
  } finally {
    endTiming()
  }
}

// Phase 5: Create QueueService instance with dependency injection
// This provides the new abstraction layer while maintaining backward compatibility
let queueServiceInstance: any = null

export async function getQueueServiceInstance() {
  if (queueServiceInstance) {
    return queueServiceInstance
  }

  // Lazy initialization to avoid circular dependencies
  const { createQueueService } = await import('./jobs/queue/QueueServiceFactory')
  const { logger: winstonLogger } = await import('../utils/logger')
  const DocumentPurposeService = (await import('./documentPurposeService')).default
  const TemplateAnalyticsService = (await import('./templateAnalyticsService')).default

  // Create map of queues
  const queuesMap = new Map([
    ['ai-processing', aiQueue],
    ['document-processing', documentQueue],
    ['pipeline-processing', pipelineQueue],
    ['baseline-processing', baselineQueue],
    ['process-flow-processing', processFlowQueue],
    ['document-regeneration', regenerationQueue],
    ['quality-audit', qualityAuditQueue],
    ['project-data-extraction', extractionQueue],
  ])

  queueServiceInstance = createQueueService(
    queuesMap,
    pool,
    io,
    cache,
    aiService,
    ContextAwareAIService,
    winstonLogger,
    DocumentPurposeService,
    TemplateAnalyticsService
  )

  return queueServiceInstance
}

// Export the new QueueService class and factory for advanced use cases
export { QueueService } from './jobs/queue/QueueService'
export { createQueueService, createMockQueueService } from './jobs/queue/QueueServiceFactory'
export type { IQueue, IQueueJob, IQueueOptions } from './jobs/queue/IQueue'
export type { QueueServiceDependencies } from './jobs/queue/QueueDependencies'
