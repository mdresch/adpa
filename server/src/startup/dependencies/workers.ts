import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"

export const workersDependency: Dependency = {
  name: "Workers",
  critical: false,
  timeout: 15000, // 15 seconds
  init: async () => {
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
    } catch (error) {
      logger.warn("Worker initialization warning:", error)
      // Allow continues - not critical for basic API functioning
    }
  },
  validate: async () => {
    try {
      const { addJob } = require("../../services/queueService")
      return typeof addJob === "function"
    } catch (error) {
      logger.warn("Worker validation failed:", error)
      return false
    }
  },
}
