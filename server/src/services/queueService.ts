import { trace, SpanStatusCode } from "@opentelemetry/api"
import ProcessFlowService from "./processFlowService"
import { cache, redisClient } from "../utils/redis"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { aiService } from "./aiService"
import { ContextAwareAIService } from "../modules/context/integration"
import { io } from "../socket"
import { createQueueService } from "./jobs/queue/QueueServiceFactory"
import type { QueueName } from "./jobs/types"
import type { QueueServiceDependencies } from "./jobs/queue/QueueDependencies"
import type { IQueue } from "./jobs/queue/IQueue"
import { RabbitQueueAdapter, createRabbitConnection } from "./jobs/queue/RabbitQueueAdapter"
import { safeQuery, safeUpdate } from "./jobs/dbGuards"

// Worker identity
const WORKER_ID = `worker-${process.pid}-${Date.now()}`

// Rabbit connection and queue setup
const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost"
const QUEUE_PREFETCH = parseInt(process.env.QUEUE_PREFETCH || "4", 10)

const connection = createRabbitConnection(RABBIT_URL)

function createRabbitQueue(
  queueName: string,
  defaultAttempts: number,
  defaultBackoffMs: number,
  options?: { maxLength?: number; dlqMaxLength?: number }
) {
  return new RabbitQueueAdapter({
    connection,
    queueName,
    prefetch: QUEUE_PREFETCH,
    defaultAttempts,
    defaultBackoffMs,
    ...options,
  })
}

export const aiQueue = createRabbitQueue("ai-processing", 3, 2000)
export const documentQueue = createRabbitQueue("document-processing", 2, 5000)
export const documentUploadQueue = createRabbitQueue("document-upload", 3, 2000)
export const pipelineQueue = createRabbitQueue("pipeline-processing", 3, 5000)
export const baselineQueue = createRabbitQueue("baseline-processing", 2, 3000)
export const processFlowQueue = createRabbitQueue("process-flow-processing", 2, 10000)
export const regenerationQueue = createRabbitQueue("document-regeneration", 3, 3000)
export const qualityAuditQueue = createRabbitQueue("quality-audit", 2, 3000)
// DLQ max length: set QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH (e.g. 50000) to avoid DLQ hitting broker limit (e.g. 20000). Only applies when queue is created.
const extractionDlqMax = process.env.QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH
  ? parseInt(process.env.QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH, 10)
  : undefined
// 3 attempts + 5s backoff to better absorb transient AI/network errors (extraction jobs dominate DLQ failures)
export const extractionQueue = createRabbitQueue("project-data-extraction", 3, 5000, {
  dlqMaxLength: extractionDlqMax && extractionDlqMax > 0 ? extractionDlqMax : undefined,
})
export const confluenceQueue = createRabbitQueue("confluence-publishing", 3, 2000)
export const digitalTwinEventQueue = createRabbitQueue("digital-twin-events", 3, 2000)
export const digitalTwinTriggerQueue = createRabbitQueue("digital-twin-triggers", 3, 3000)
export const gkgSyncQueue = createRabbitQueue("gkg-sync", 2, 5000)

// Trace attachment (lightweight)
const tracer = trace.getTracer("adpa-queue-service")
const _activeJobSpans = new Map<string, import("@opentelemetry/api").Span>()

function attachTracing(queue: any, name: string) {
  queue.on("active", (job: any) => {
    try {
      const span = tracer.startSpan(`job.${job?.data?.type || "unnamed"}`, {
        attributes: {
          "queue.name": name,
          "job.id": job?.id?.toString?.() || String(job?.id || ""),
          "job.name": job?.data?.type,
        },
      })
      _activeJobSpans.set(`${name}:${job?.id}`, span)
    } catch (e) { }
  })
  queue.on("completed", (job: any) => {
    const key = `${name}:${job?.id}`
    const span = _activeJobSpans.get(key)
    if (span) {
      try {
        span.setStatus({ code: SpanStatusCode.OK })
      } catch (e) { }
      span.end()
      _activeJobSpans.delete(key)
    }
  })
  queue.on("failed", (job: any, err: any) => {
    const key = `${name}:${job?.id}`
    const span = _activeJobSpans.get(key)
    if (span) {
      try {
        span.recordException(err)
        span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message })
      } catch (e) { }
      span.end()
      _activeJobSpans.delete(key)
    }
  })
}

const queues = [
  { name: "ai-processing", queue: aiQueue },
  { name: "document-processing", queue: documentQueue },
  { name: "document-upload", queue: documentUploadQueue },
  { name: "pipeline-processing", queue: pipelineQueue },
  { name: "baseline-processing", queue: baselineQueue },
  { name: "process-flow-processing", queue: processFlowQueue },
  { name: "document-regeneration", queue: regenerationQueue },
  { name: "quality-audit", queue: qualityAuditQueue },
  { name: "project-data-extraction", queue: extractionQueue },
  { name: "confluence-publishing", queue: confluenceQueue },
  { name: "digital-twin-events", queue: digitalTwinEventQueue },
  { name: "digital-twin-triggers", queue: digitalTwinTriggerQueue },
  { name: "gkg-sync", queue: gkgSyncQueue },
]
queues.forEach(({ name, queue }) => attachTracing(queue, name))

// Lazy QueueService instance
let queueServiceInstance: ReturnType<typeof createQueueService> | null = null

function getQueueServiceInstance(): ReturnType<typeof createQueueService> {
  if (!queueServiceInstance) {
    const { getDatabasePool } = require("../database/connection")
    let currentPool = pool
    if (!currentPool) {
      currentPool = getDatabasePool()
    }

    queueServiceInstance = createQueueService(
      new Map<QueueName, IQueue>(queues.map(({ name, queue }) => [name as QueueName, queue as IQueue])),
      currentPool,
      io,
      cache,
      aiService,
      ContextAwareAIService
    )
  }
  return queueServiceInstance
}

let processFlowServiceInstance: ProcessFlowService | null = null

async function getProcessFlowServiceInstance(): Promise<ProcessFlowService> {
  if (!processFlowServiceInstance) {
    const { getDatabasePool, connectDatabase } = await import("../database/connection")
    let currentPool = pool
    if (!currentPool) {
      try {
        currentPool = getDatabasePool()
      } catch (_err) {
        await connectDatabase()
        currentPool = getDatabasePool()
      }
    }
    processFlowServiceInstance = new ProcessFlowService(currentPool)
  }
  return processFlowServiceInstance
}

// Exported helpers delegating to QueueService
export async function addJob(...args: Parameters<ReturnType<typeof createQueueService>["addJob"]>) {
  return (await getQueueServiceInstance()).addJob(...args)
}

export async function getJobStatus(...args: Parameters<ReturnType<typeof createQueueService>["getJobStatus"]>) {
  return (await getQueueServiceInstance()).getJobStatus(...args)
}

export async function cancelJob(...args: Parameters<ReturnType<typeof createQueueService>["cancelJob"]>) {
  return (await getQueueServiceInstance()).cancelJob(...args)
}

export async function updateJobStatus(
  jobId: string,
  status: string,
  progress?: number,
  workerId?: string,
  queueName?: string,
  errorMessage?: string
): Promise<void> {
  try {
    await (await getQueueServiceInstance()).updateJobStatus(jobId, status, progress, workerId, queueName, errorMessage)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Database pool not initialized')) {
      logger.warn('[QUEUE] Skipping job status update while database is initializing', {
        jobId,
        status,
        queueName,
      })
      return
    }
    throw error
  }
}

export function getQueueService() {
  return getQueueServiceInstance()
}

export const queueService = new Proxy({} as ReturnType<typeof createQueueService>, {
  get(_target, prop) {
    return (getQueueServiceInstance() as any)[prop]
  },
})

export { getQueueServiceInstance }

export async function initializeQueues(): Promise<void> {
  logger.info("Queues initialized (RabbitMQ)")
}

export async function getQueueServiceDependencies(): Promise<QueueServiceDependencies> {
  const { getDatabasePool, connectDatabase } = await import("../database/connection")
  try {
    getDatabasePool()
  } catch (_err) {
    await connectDatabase()
  }
  return (await getQueueServiceInstance()).getDependencies()
}

// Processors (Rabbit consumers)

aiQueue.process("ai-generate", QUEUE_PREFETCH, async (job) => {
  logger.info(`[WORKER] AI generation worker ${WORKER_ID} picked up job: ${job.id}`)
  const { AIGenerationJobService } = await import("./jobs/AIGenerationJobService")
  const deps = await getQueueServiceDependencies()
  const actualJobId = (job.data as any)?.jobId || job.id.toString()
  logger.info(`[WORKER] Processing AI generation job with ID: ${actualJobId} using worker: ${WORKER_ID}`)
  return await AIGenerationJobService.processJob(job as any, {
    workerId: WORKER_ID,
    updateJobStatus,
    dependencies: deps,
  }, deps)
})

logger.info(`[QUEUE] Registered ai-generate processor on aiQueue (Rabbit) with worker ID: ${WORKER_ID}`)

// Document convert
import("./jobs/DocumentConversionJobService").then(({ DocumentConversionJobService }) => {
  documentQueue.process("document-convert", QUEUE_PREFETCH, async (job) => {
    const deps = await getQueueServiceDependencies()
    return await DocumentConversionJobService.processJob(job as any, {
      workerId: WORKER_ID,
      updateJobStatus,
      dependencies: deps,
    }, deps)
  })
})

// Document upload
import("./documentUploadService").then(({ processUploadedFile }) => {
  documentUploadQueue.process("file-process", QUEUE_PREFETCH, async (job) => {
    logger.info(`[WORKER] document-upload worker ${WORKER_ID} picked up job: ${job.id}`)
    try {
      return await processUploadedFile(job as any)
    } catch (err) {
      logger.error("[WORKER] document-upload processing error", err)
      throw err
    }
  })
  logger.info(`[QUEUE] Registered document-upload processor on documentUploadQueue (Rabbit) with worker ID: ${WORKER_ID}`)
})

// Baseline extraction
import("./jobs/BaselineExtractionJobService").then(({ BaselineExtractionJobService }) => {
  baselineQueue.process("baseline-extract", QUEUE_PREFETCH, async (job) => {
    const deps = await getQueueServiceDependencies()
    return await BaselineExtractionJobService.processJob(job as any, {
      workerId: WORKER_ID,
      updateJobStatus,
      dependencies: deps,
    }, deps)
  })
})

// Process Flow
processFlowQueue.process("process-flow", QUEUE_PREFETCH, async (job) => {
  const { jobId, userId, config } = job.data as any
  let dbPool = pool
  try {
    const { getDatabasePool, connectDatabase } = await import("../database/connection")
    if (!dbPool) {
      try {
        dbPool = getDatabasePool()
      } catch (_err) {
        await connectDatabase()
        dbPool = getDatabasePool()
      }
    }
    if (!dbPool) {
      throw new Error("Database connection pool is not available")
    }

    const processFlowService = await getProcessFlowServiceInstance()
    await updateJobStatus(jobId, "processing", 5, WORKER_ID, "process-flow-processing")
    let projectName = "Unknown Project"
    let documentName = config.documentName || config.templateName || "Process Flow Document"
    try {
      const projectResult = await safeQuery(dbPool, "SELECT name FROM projects WHERE id = $1", [config.projectId])
      if (projectResult?.rows?.length > 0) {
        projectName = projectResult.rows[0].name
      }
    } catch (error) {
      logger.warn(`Could not fetch project name for ${config.projectId}`)
    }
    logger.info(`Starting process-flow job ${jobId} for project: ${projectName} (${config.projectId})`)
    const totalSteps = config.includeStakeholders ? 7 : 6
    const updateStepProgress = async (stepName: string, stepNumber: number, totalSteps: number) => {
      const progress = Math.floor(10 + (stepNumber / totalSteps) * 80)
      await safeUpdate(dbPool,
        `UPDATE jobs 
         SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{currentStep}', to_jsonb($1::text)),
             progress = $2
         WHERE id = $3`,
        [stepName, progress, jobId]
      )
      io.emit("job:step-update", { jobId, userId, currentStep: stepName, stepNumber, totalSteps, progress })
      logger.info(`Process-flow job ${jobId}: Step ${stepNumber}/${totalSteps} - ${stepName}`)
    }
    const documentStartTimes = new Map<string, number>()
    const onCompressionProgress = async (stepName: string, current: number, total: number, details?: any) => {
      const compressionProgress = Math.floor(10 + (current / total) * 70)
      if (details?.documentId && !documentStartTimes.has(details.documentId)) {
        documentStartTimes.set(details.documentId, Date.now())
      }
      const providerAssignments = details?.providerAssignments || []
      const stepMessage = providerAssignments.length > 0
        ? `AI providers processing ${providerAssignments.length} document${providerAssignments.length > 1 ? "s" : ""} (${current}/${total} completed)`
        : `${stepName}: ${current}/${total} - ${details?.documentName || "processing..."}`
      await safeUpdate(dbPool,
        `UPDATE jobs 
         SET data = jsonb_set(
           jsonb_set(
             jsonb_set(COALESCE(data, '{}'::jsonb), '{currentStep}', to_jsonb($1::text)),
             '{compressionProgress}', to_jsonb($2::jsonb)
           ),
           '{currentDocument}', to_jsonb($3::jsonb)
         ),
         progress = $4
         WHERE id = $5`,
        [
          stepMessage,
          JSON.stringify({ current, total, percentage: Math.floor((current / total) * 100) }),
          JSON.stringify(details || {}),
          compressionProgress,
          jobId,
        ]
      )
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
        templateName: config?.templateName,
      })
    }
    await updateStepProgress("Initializing workflow", 1, totalSteps)
    const configWithCallback = { ...config, onProgress: onCompressionProgress }
    const result = await processFlowService.startWorkflowProcessing(configWithCallback)
    await updateJobStatus(jobId, "processing", 95, WORKER_ID, "process-flow-processing")
    await updateStepProgress("Finalizing document...", totalSteps, totalSteps)
    await safeUpdate(dbPool,
      `UPDATE jobs 
       SET status = 'completed',
           result = $1,
           progress = 100,
           worker_id = COALESCE(worker_id, $3),
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
           completed_at = CURRENT_TIMESTAMP,
           data = jsonb_set(COALESCE(data, '{}'::jsonb), '{currentStep}', to_jsonb('Completed'::text))
       WHERE id = $2`,
      [JSON.stringify({
        workflowId: result.workflowId,
        documentId: result.savedDocument.id,
        documentName: result.savedDocument.name,
        stepsCompleted: result.steps.length,
        steps: result.steps,
        finalDocumentLength: result.finalDocument.length,
        totalTokens: result.steps.reduce((sum, step) => sum + step.tokens, 0),
      }), jobId, WORKER_ID]
    )
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      message: `Process flow workflow completed: ${result.savedDocument.name}`,
      projectId: config.projectId,
      documentId: result.savedDocument.id,
      documentName: result.savedDocument.name,
    })
    logger.info(`Process-flow job completed: ${jobId}`)
  } catch (error: any) {
    logger.error(`Process-flow job failed: ${jobId}`, error)
    if (dbPool) {
      await safeUpdate(dbPool,
        `UPDATE jobs 
         SET status = 'failed',
             error_message = $1,
             worker_id = COALESCE(worker_id, $3),
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
             completed_at = CURRENT_TIMESTAMP,
             data = jsonb_set(COALESCE(data, '{}'::jsonb), '{currentStep}', to_jsonb('Failed'::text))
         WHERE id = $2`,
        [error.message || "Process-flow job failed", jobId, WORKER_ID]
      )
    }
    io.emit("job:failed", { jobId, userId, status: "failed", error: error.message || "Process-flow job failed", projectId: config?.projectId })
    throw error
  }
})

// Document regeneration
regenerationQueue.process("document-regeneration", QUEUE_PREFETCH, async (job) => {
  const { jobId, documentId, templateId, provider, model, versionType, temperature, userId } = job.data as any
  try {
    await updateJobStatus(jobId, "processing", 10, WORKER_ID, "document-regeneration")
    logger.info(`Starting document regeneration job ${jobId} for document ${documentId}`)
    const { DocumentRegenerationService } = await import("./documentRegenerationService")
    await DocumentRegenerationService.executeRegenerationJob({ documentId, templateId, provider, model, versionType, temperature, userId, jobId })
    await updateJobStatus(jobId, "completed", 100, WORKER_ID, "document-regeneration")
    logger.info(`Document regeneration job completed: ${jobId}`)
    return { success: true, jobId }
  } catch (error) {
    logger.error(`Document regeneration job failed: ${jobId}`, error)
    await updateJobStatus(jobId, "failed", 0, WORKER_ID, "document-regeneration", error instanceof Error ? error.message : String(error))
    throw error
  }
})

regenerationQueue.on("completed", (job, result) => {
  logger.info(`Regeneration job completed: ${job.id}`)
})
regenerationQueue.on("failed", (job, err) => {
  logger.error(`Regeneration job failed: ${job.id}`, err)
})

// Confluence publishing
confluenceQueue.process("publish-to-confluence", QUEUE_PREFETCH, async (job) => {
  try {
    const { PublishToConfluenceJobService } = await import("./jobs/PublishToConfluenceJobService")
    return await PublishToConfluenceJobService.processJob(job as any)
  } catch (error) {
    logger.error(`[PUBLISH-CONFLUENCE] Job failed: ${job.id}`, error)
    throw error
  }
})

confluenceQueue.on("completed", (job, result) => {
  logger.info(`Confluence publishing job completed: ${job.id}`, { pageUrl: (result as any)?.pageUrl })
})
confluenceQueue.on("failed", (job, err) => {
  logger.error(`Confluence publishing job failed: ${job.id}`, err)
})

// Quality Audit
qualityAuditQueue.process("quality-audit", QUEUE_PREFETCH, async (job) => {
  const { jobId, documentId, documentContent, documentType, projectContext, userId } = job.data as any
  try {
    await updateJobStatus(jobId, "processing", 10, WORKER_ID, "quality-audit")
    logger.info(`[QUALITY-AUDIT-JOB] Starting quality audit job ${jobId} for document ${documentId}`)
    const { qualityAuditService } = await import("./qualityAuditService")
    const auditResult = await qualityAuditService.auditDocument(documentId, documentContent, documentType, projectContext, userId)
    await updateJobStatus(jobId, "completed", 100, WORKER_ID, "quality-audit")
    logger.info(`[QUALITY-AUDIT-JOB] Quality audit completed: ${jobId}`, { overallScore: (auditResult as any).overallScore, grade: (auditResult as any).overallGrade })
    return { success: true, auditResult, jobId }
  } catch (error) {
    logger.error(`[QUALITY-AUDIT-JOB] Quality audit job failed: ${jobId}`, error)
    await updateJobStatus(jobId, "failed", 0, WORKER_ID, "quality-audit")
    throw error
  }
})

qualityAuditQueue.on("completed", (job, result) => logger.info(`Quality audit job completed: ${job.id}`))
qualityAuditQueue.on("failed", (job, err) => logger.error(`Quality audit job failed: ${job.id}`, err))

// Project Data Extraction parent
extractionQueue.process("extract-project-data", QUEUE_PREFETCH, async (job) => {
  const { ExtractionOrchestrationService } = await import("./jobs/ExtractionOrchestrationService")
  const deps = await getQueueServiceDependencies()
  return await ExtractionOrchestrationService.processJob(job as any, { workerId: WORKER_ID, updateJobStatus }, deps)
})

  // Child entity extractors - Register immediately using async IIFE
  ; (async () => {
    const { projectDataExtractionService } = await import("./projectDataExtractionService")

    const ENTITY_TYPES = [
      'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
      'success_criteria', 'best_practices', 'phases', 'resources',
      'technologies', 'quality_standards', 'compliance_security', 'deliverables', 'scope_items', 'activities',
      'team_agreements', 'development_approaches', 'project_iterations', 'work_items',
      'capacity_plans', 'performance_measurements', 'earned_value_metrics', 'opportunities', 'risk_responses',
      'performance_actuals', 'schedule_baselines', 'governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance',
      'scope_baseline', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
      'dt_assets',
      'schedule_baseline', 'schedule_activities', 'critical_path_activities', 'critical_path', 'schedule_variances', 'schedule_forecasts',
      'budget_baselines', 'budget_baseline', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs',
      'resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding',
      'risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics',
      'engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health'
    ] as const

    ENTITY_TYPES.forEach((entityType) => {
      extractionQueue.process(`extract-entity-${entityType}`, QUEUE_PREFETCH, async (job) => {

        const {
          parentJobId,
          projectId,
          userId,
          aiProvider,
          aiModel,
          documentIds,
          batchingEnabled,
          maxBatchTokens,
          maxDocsPerBatch,
          entityIndex,
          totalEntities,
        } = job.data as any
        const jobId = (job.data as any).jobId || job.id
        try {
          logger.info(`[EXTRACTION-CHILD] Extracting ${entityType} for job ${parentJobId} (child job: ${jobId})`)

          // Update status to processing
          await updateJobStatus(jobId, "processing", 10, WORKER_ID, "project-data-extraction")

          const entities = await projectDataExtractionService.extractSingleEntityType(projectId, userId, entityType, {
            aiProvider,
            aiModel,
            documentIds,
            batchingEnabled,
            maxBatchTokens,
            maxDocsPerBatch,
            parentJobId,
            childJobId: String(jobId),
            entityIndex,
            totalEntities,
          })

          await projectDataExtractionService.saveSingleEntityType(projectId, userId, entityType, entities)

          // DT assets: extracted as entities (extracted_dt_assets). Import into Digital Twin Assets Register
          // is an explicit step (POST /api/digital-twin/assets/import), same as WBS import for tasks.

          // Update status to completed
          await updateJobStatus(jobId, "completed", 100, WORKER_ID, "project-data-extraction")

          return { entityType, count: entities.length }


        } catch (error: any) {
          logger.error(`[EXTRACTION-CHILD] Failed to extract ${entityType}: ${error.message}`, {
            parentJobId,
            entityType,
            projectId,
            error: error.message,
            stack: error.stack,
            provider: aiProvider,
            model: aiModel,
          })

          try {
            // Update status to failed
            await updateJobStatus(jobId, "failed", 0, WORKER_ID, "project-data-extraction", error.message)
          } catch (updateErr) {
            logger.error(`[EXTRACTION-CHILD] Failed to update job status to failed: ${jobId}`, updateErr)
          }

          throw error
        }

      })
    })

    logger.info(`[QUEUE] Registered ${ENTITY_TYPES.length} entity extraction processors on extractionQueue (Rabbit)`)
  })()

// Digital Twin Event Processing
import("./digitalTwinEventService").then(({ processEvent }) => {
  digitalTwinEventQueue.process("process-event", QUEUE_PREFETCH, async (job) => {
    const { eventId } = job.data as { eventId: string }
    logger.info(`[WORKER] Digital Twin event worker ${WORKER_ID} processing event: ${eventId}`)
    try {
      await processEvent(eventId)
      logger.info(`[WORKER] Digital Twin event processed successfully: ${eventId}`)
      return { eventId, status: 'completed' }
    } catch (error: any) {
      logger.error(`[WORKER] Digital Twin event processing failed: ${eventId}`, { error: error.message })
      throw error
    }
  })
  logger.info(`[QUEUE] Registered process-event processor on digitalTwinEventQueue (Rabbit) with worker ID: ${WORKER_ID}`)
})

// Digital Twin Document Trigger Processing
import("./digitalTwinTriggerService").then(({ processDocumentTrigger }) => {
  digitalTwinTriggerQueue.process("process-trigger", QUEUE_PREFETCH, async (job) => {
    const { triggerId } = job.data as { triggerId: string }
    logger.info(`[WORKER] Digital Twin trigger worker ${WORKER_ID} processing trigger: ${triggerId}`)
    try {
      const document = await processDocumentTrigger(triggerId)
      logger.info(`[WORKER] Digital Twin document trigger processed successfully: ${triggerId}`, { documentId: document?.id })
      return { triggerId, documentId: document?.id, status: 'completed' }
    } catch (error: any) {
      logger.error(`[WORKER] Digital Twin trigger processing failed: ${triggerId}`, { error: error.message })
      throw error
    }
  })
  logger.info(`[QUEUE] Registered process-trigger processor on digitalTwinTriggerQueue (Rabbit) with worker ID: ${WORKER_ID}`)
})

  // GKG sync processing
  ; (async () => {
    try {
      console.log("[GKG] Registering GKG sync processors...")
      const { getNeo4jDriver, getNeo4jDatabase } = await import("../utils/neo4j")
      const { getDatabasePool } = await import("../database/connection")
      const { runBootstrap, runSyncProject, runSyncDocument, runGkgFullReconciliation } = await import("./gkg")

      gkgSyncQueue.process("gkg-bootstrap", QUEUE_PREFETCH, async (job) => {
        console.log("[GKG] Processing gkg-bootstrap")
        try {
          const driver = getNeo4jDriver()
          if (!driver) throw new Error("Neo4j not configured or unavailable")
          const db = getNeo4jDatabase()
          const result = await runBootstrap(driver, db)
          console.log("[GKG] Bootstrap completed", result)
          logger.info("[GKG] Bootstrap completed", result)
          return result
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error("[GKG] Bootstrap failed:", msg)
          throw err
        }
      })

      gkgSyncQueue.process("gkg-sync-project", QUEUE_PREFETCH, async (job) => {
        const { projectId } = (job.data as { projectId?: string }) ?? {}
        if (!projectId) throw new Error("gkg-sync-project: projectId required")
        console.log("[GKG] Processing gkg-sync-project", { projectId })
        try {
          const driver = getNeo4jDriver()
          if (!driver) throw new Error("Neo4j not configured or unavailable")
          const pool = getDatabasePool()
          const db = getNeo4jDatabase()
          const result = await runSyncProject(pool, driver, db, projectId)
          console.log("[GKG] Sync project completed", { projectId, ...result })
          logger.info("[GKG] Sync project completed", { projectId, ...result })
          return result
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error("[GKG] Sync project failed:", projectId, msg)
          throw err
        }
      })

      gkgSyncQueue.process("gkg-sync-document", QUEUE_PREFETCH, async (job) => {
        const { documentId } = (job.data as { documentId?: string }) ?? {}
        if (!documentId) throw new Error("gkg-sync-document: documentId required")
        console.log("[GKG] Processing gkg-sync-document", { documentId })
        try {
          const driver = getNeo4jDriver()
          if (!driver) throw new Error("Neo4j not configured or unavailable")
          const pool = getDatabasePool()
          const db = getNeo4jDatabase()
          const result = await runSyncDocument(pool, driver, db, documentId)
          console.log("[GKG] Sync document completed", { documentId, ...result })
          logger.info("[GKG] Sync document completed", { documentId, ...result })
          return result
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error("[GKG] Sync document failed:", documentId, msg)
          throw err
        }
      })

      gkgSyncQueue.process("gkg-reconcile", QUEUE_PREFETCH, async (job) => {
        const { cleanup, batchSize } =
          (job.data as { cleanup?: boolean; batchSize?: number }) ?? {}
        console.log("[GKG] Processing gkg-reconcile", {
          cleanup: cleanup === true,
          batchSize,
        })
        try {
          const driver = getNeo4jDriver()
          if (!driver) throw new Error("Neo4j not configured or unavailable")
          const pool = getDatabasePool()
          const db = getNeo4jDatabase()
          const result = await runGkgFullReconciliation(pool, driver, db, {
            cleanup: cleanup === true,
            batchSize,
          })
          logger.info("[GKG] Full reconcile completed", {
            cleanup: cleanup === true,
            batchSize: result.scanned.batchSize,
            staleCounts: result.staleCounts,
            deletedNodes: result.cleanup.deletedNodes,
            deletedEdges: result.cleanup.deletedEdges,
          })
          return result
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error("[GKG] Full reconcile failed:", msg)
          throw err
        }
      })

      logger.info(`[QUEUE] Registered GKG sync processors on gkgSyncQueue (Rabbit)`)
      console.log("✅ GKG sync processors registered for queue: gkg-sync")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Failed to register GKG sync processors", { error: msg })
      console.error("[GKG] Failed to register GKG sync processors:", msg)
    }
  })()

// Export Redis client for legacy consumers
export { redisClient }
