import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"
import { startupManager } from "../serverBootstrap"
import { shouldRunWorkers } from "../../utils/processRole"

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
    if (!shouldRunWorkers()) {
      logger.info("Skipping worker monitoring and registration (Workers disabled via ADPA_PROCESS_ROLE)")
      updateDependencyHealth("Workers", "healthy")
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

      const { addJob } = require("../../services/queueService")
      const healthy = typeof addJob === "function"
      updateDependencyHealth("Workers", healthy ? "healthy" : "unhealthy")
      return healthy
    } catch (error) {
      logger.warn("Worker validation failed:", error)
      updateDependencyHealth("Workers", "unhealthy", 0, String(error))
      return false
    }
  },
}
