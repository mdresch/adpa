import { trace, SpanStatusCode } from "@opentelemetry/api"
import { cache, redisClient } from "../../utils/redis"
import { logger } from "../../utils/logger"
import { pool } from "../../database/connection"
import { aiService } from "../aiService"
import { ContextAwareAIService } from "../../modules/context/integration"
import { io } from "../../socket"
import { createQueueService } from "../jobs/queue/QueueServiceFactory"
import type { QueueName } from "../jobs/types"
import type { QueueServiceDependencies } from "../jobs/queue/QueueDependencies"
import type { IQueue } from "../jobs/queue/IQueue"
import { RabbitQueueAdapter, createRabbitConnection } from "../jobs/queue/RabbitQueueAdapter"

// Worker identity
export const WORKER_ID = `worker-${process.pid}-${Date.now()}`

// Rabbit connection and queue setup
const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost"
export const QUEUE_PREFETCH = parseInt(process.env.QUEUE_PREFETCH || "4", 10)

export const connection = createRabbitConnection(RABBIT_URL)

export function createRabbitQueue(
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

const extractionDlqMax = process.env.QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH
  ? parseInt(process.env.QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH, 10)
  : undefined

export const extractionQueue = createRabbitQueue("project-data-extraction", 3, 5000, {
  dlqMaxLength: extractionDlqMax && extractionDlqMax > 0 ? extractionDlqMax : undefined,
})
export const confluenceQueue = createRabbitQueue("confluence-publishing", 3, 2000)
export const digitalTwinEventQueue = createRabbitQueue("digital-twin-events", 3, 2000)
export const digitalTwinTriggerQueue = createRabbitQueue("digital-twin-triggers", 3, 3000)
export const gkgSyncQueue = createRabbitQueue("gkg-sync", 2, 5000)
export const semanticProcessingQueue = createRabbitQueue("semantic-processing", 3, 5000)

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

export const queues = [
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
  { name: "semantic-processing", queue: semanticProcessingQueue },
]
queues.forEach(({ name, queue }) => attachTracing(queue, name))

// Lazy QueueService instance
let queueServiceInstance: ReturnType<typeof createQueueService> | null = null

export function getQueueServiceInstance(): ReturnType<typeof createQueueService> {
  if (!queueServiceInstance) {
    const { getDatabasePool } = require("../../database/connection")
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

export type LlmProgressStepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface LlmProgressStep {
  id: string
  phase: string
  label: string
  heading?: string
  status: LlmProgressStepStatus
  provider?: string
  model?: string
  startedAt?: string
  completedAt?: string
  error?: string
}

/** Updates AI generation progress steps and emits job:step-update for the Job Monitor. */
export async function updateJobLlmProgress(
  jobId: string,
  update: {
    userId?: string
    currentStep?: string
    progress?: number
    llmProgressSteps?: LlmProgressStep[]
    patchStep?: { id: string; patch: Partial<LlmProgressStep> }
  }
): Promise<void> {
  if (!pool) return

  try {
    const row = await pool.query(
      `SELECT created_by, progress, data FROM jobs WHERE id = $1`,
      [jobId]
    )
    if (row.rows.length === 0) return

    const job = row.rows[0]
    const data = (job.data && typeof job.data === 'object') ? job.data : {}
    let steps: LlmProgressStep[] = Array.isArray(data.llmProgressSteps) ? [...data.llmProgressSteps] : []

    if (update.llmProgressSteps) {
      steps = update.llmProgressSteps
    } else if (update.patchStep) {
      const idx = steps.findIndex((s) => s.id === update.patchStep!.id)
      if (idx >= 0) {
        steps[idx] = { ...steps[idx], ...update.patchStep.patch }
      } else {
        steps.push({
          id: update.patchStep.id,
          phase: update.patchStep.patch.phase || 'drafting',
          label: update.patchStep.patch.label || update.patchStep.id,
          status: update.patchStep.patch.status || 'running',
          ...update.patchStep.patch,
        })
      }
    }

    const llmRequestCount = Array.isArray(data.llm_insights?.requests)
      ? data.llm_insights.requests.length
      : (typeof data.llmRequestCount === 'number' ? data.llmRequestCount : 0)

    const nextData = {
      ...data,
      llmProgressSteps: steps,
      llmRequestCount,
      ...(update.currentStep !== undefined ? { currentStep: update.currentStep } : {}),
    }

    const nextProgress = update.progress ?? job.progress ?? 0

    await pool.query(
      `UPDATE jobs SET data = $1::jsonb, progress = $2 WHERE id = $3`,
      [JSON.stringify(nextData), nextProgress, jobId]
    )

    const userId = update.userId || job.created_by
    io.emit('job:step-update', {
      jobId,
      userId,
      currentStep: update.currentStep ?? data.currentStep,
      progress: nextProgress,
      llmProgressSteps: steps,
      llmRequestCount,
    })
  } catch (error) {
    logger.warn('Failed to update LLM progress steps for job monitor', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    })
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

export async function getQueueServiceDependencies(): Promise<QueueServiceDependencies> {
  const { getDatabasePool, connectDatabase } = await import("../../database/connection")
  try {
    getDatabasePool()
  } catch (_err) {
    await connectDatabase()
  }
  return (await getQueueServiceInstance()).getDependencies()
}

export { redisClient }

export async function shutdownQueues(): Promise<void> {
  try {
    for (const queue of queues) {
      try {
        await queue.queue.close()
      } catch (e) {}
    }
    await connection.close();
  } catch (err) {
    console.error('Failed to close rabbit connection', err);
  }
}

export async function initializeQueues(): Promise<void> {
  logger.info("Queues initialized (RabbitMQ)")

  // Pillar 1: Orphan Job Recovery
  try {
    const { getDatabasePool } = await import("../../database/connection")
    const dbPool = getDatabasePool()
    if (dbPool) {
      const recoveryResult = await pool.query(
        `SELECT id, type, data FROM jobs 
         WHERE status = 'processing' 
           AND queue_name IN ('ai-processing', 'document-processing', 'document-regeneration', 'project-data-extraction')`
      )
      
      if (recoveryResult.rows.length > 0) {
        logger.info(`[QUEUE RECOVERY] Found ${recoveryResult.rows.length} orphaned jobs. Requeuing...`)
        
        for (const row of recoveryResult.rows) {
          try {
            // Requeue the job using the existing ID
            await queueService.addJob(row.type, row.data, { jobId: row.id })
            
            // Mark the old stuck execution as reset/pending
            await pool.query(
              `UPDATE jobs SET status = 'pending', worker_id = NULL WHERE id = $1`,
              [row.id]
            )
          } catch (requeueErr) {
            logger.error(`[QUEUE RECOVERY] Failed to requeue orphaned job ${row.id}:`, requeueErr)
          }
        }
        
        logger.info(`[QUEUE RECOVERY] Successfully recovered orphaned jobs.`)
      }
    }
  } catch (err) {
    logger.error("Failed to recover orphaned jobs during queue initialization", err)
  }
}
