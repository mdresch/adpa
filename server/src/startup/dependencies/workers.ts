import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const workersDependency: Dependency = {
  name: "Workers",
  critical: false,
  timeout: 15000, // 15 seconds
  init: async () => {
    // HACK: Add a delay to wait for the database to be ready.
    // This is a temporary fix for a race condition.
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      // 1. Start system and worker resource monitoring
      const { SystemMonitoring } = require("../../utils/systemMonitoring")
      const { WorkerMonitoring } = require("../../utils/workerMonitoring")
      
      SystemMonitoring.start()
      const WORKER_ID = `worker-${process.pid}-${Date.now()}`
      WorkerMonitoring.start(WORKER_ID, "Backend Worker")
      logger.info("System and worker resource monitoring started")

      // 2. Initialize document conversion queue worker
      logger.info("Initializing document conversion worker...")
      require("../../jobs/documentConversionJob")
      logger.info("Document conversion worker initialized")

      // 3. Simple queue availability check
      const { addJob } = require("../../services/queueService")
      if (!addJob) {
        throw new Error("Job queue service not available")
      }
      updateDependencyHealth("Workers", "healthy")
    } catch (error) {
      logger.warn("Worker initialization warning:", error)
      updateDependencyHealth("Workers", "unhealthy", 0, String(error))
      // Allow continues - not critical for basic API functioning
    }
  },
  validate: async () => {
    try {
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
