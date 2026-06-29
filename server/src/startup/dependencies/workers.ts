import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"
import { startupManager } from "../serverBootstrap"
import { shouldRunWorkers } from "../../utils/processRole"
import { evaluateWorkerHealth, ensureWorkersRegistered } from "../../services/queue/queueHealth"

/** Poll until a consumer is attached to the queue, or timeout. */
async function waitForConsumer(
  queue: { isConsumerAttached?: () => boolean },
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now()
  const attached = () =>
    typeof queue.isConsumerAttached === "function" ? queue.isConsumerAttached() : false
  while (Date.now() - start < timeoutMs) {
    if (attached()) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return attached()
}

/** Re-publish stalled pending generation jobs (opt-in via QUEUE_PENDING_RECONCILE=true). */
async function runPendingReconcile(): Promise<void> {
  const { pool } = await import("../../database/connection")
  if (!pool) return
  const { aiQueue, documentQueue, regenerationQueue } = await import("../../services/queue/queueClient")
  const { reconcilePendingGenerationJobs } = await import("../../services/queue/queueReconciler")
  const queuesByName = new Map<string, any>([
    ["ai-processing", aiQueue],
    ["document-processing", documentQueue],
    ["document-regeneration", regenerationQueue],
  ])
  const result = await reconcilePendingGenerationJobs({
    query: (sql, params) => pool.query(sql, params) as any,
    queuesByName,
  })
  logger.info("[WORKERS] Pending generation reconcile complete", result)
}

export const workersDependency: Dependency = {
  name: "Workers",
  critical: false,
  timeout: 15000, // 15 seconds
  dependsOn: ['Database'],
  init: async () => {
    try {
      const { addJob } = require("../../services/queueService")
      if (!addJob) {
        throw new Error("Job queue service not available")
      }
      updateDependencyHealth("Workers", "healthy")
    } catch (error) {
      logger.warn("Worker initialization warning:", error)
      updateDependencyHealth("Workers", "unhealthy", 0, String(error))
    }
  },
  validate: async () => {
    const role = process.env.ADPA_PROCESS_ROLE || "all"

    if (!shouldRunWorkers()) {
      // role=api: workers run in a separate process — healthy without a consumer here.
      const verdict = evaluateWorkerHealth({ role, rabbitConnected: false, aiConsumerAttached: false })
      logger.info("Skipping worker registration (Workers disabled via ADPA_PROCESS_ROLE)")
      updateDependencyHealth("Workers", verdict.status, 0, verdict.reason)
      return true
    }

    try {
      // 1. Start system and worker resource monitoring
      const { SystemMonitoring } = require("../../utils/systemMonitoring")
      const { WorkerMonitoring } = require("../../utils/workerMonitoring")

      SystemMonitoring.start()
      const WORKER_ID = `worker-${process.pid}-${Date.now()}`
      // Small additional delay to ensure DB pool is fully stable
      setTimeout(() => {
        WorkerMonitoring.start(WORKER_ID, "Backend Worker")
        logger.info("System and worker resource monitoring started")
      }, 2000)

      // 2. Initialize document conversion queue worker
      logger.info("Initializing document conversion worker...")
      require("../../jobs/documentConversionJob")
      logger.info("Document conversion worker initialized")

      // 3. REQ-003: deterministically ensure queue processors are registered (idempotent)
      const { registerWorkers } = await import("../../services/queue/registerWorkers")
      const { aiQueue, connection } = await import("../../services/queue/queueClient")
      await ensureWorkersRegistered({ role, register: registerWorkers })

      // 4. REQ-002: verify a consumer actually attached to ai-processing. The consumer
      //    attaches asynchronously once RabbitMQ connects, so poll briefly.
      const aiConsumerAttached = await waitForConsumer(aiQueue as any, 10000)
      const isConnectedFn = (connection as any)?.isConnected
      const rabbitConnected = typeof isConnectedFn === "function" ? !!isConnectedFn.call(connection) : false

      const verdict = evaluateWorkerHealth({ role, rabbitConnected, aiConsumerAttached })
      updateDependencyHealth("Workers", verdict.status, 0, verdict.reason)
      if (!verdict.ok) {
        logger.warn(`[WORKERS] ${verdict.reason}`)
      }

      // 5. REQ-004: drain any stalled pending generation backlog (opt-in)
      if (verdict.ok && process.env.QUEUE_PENDING_RECONCILE === "true") {
        void runPendingReconcile().catch((e) => logger.error("[WORKERS] Pending reconcile failed", e))
      }

      // Optional dependency: report the true state via health, but do not block boot.
      return true
    } catch (error) {
      logger.warn("Worker validation failed:", error)
      updateDependencyHealth("Workers", "unhealthy", 0, String(error))
      return false
    }
  },
}
