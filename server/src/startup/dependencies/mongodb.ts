import { Dependency } from "../dependencyGraph"
import { mongoVectorStore } from "../../services/mongoVectorStore"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const mongodbDependency: Dependency = {
  name: "MongoDB Atlas",
  critical: false,
  timeout: 15000, // 15 seconds
  init: async () => {
    const startTime = Date.now()
    try {
      if (!process.env.MONGODB_URI) {
        logger.warn("MongoDB (Optional) not configured, skipping initialization")
        updateDependencyHealth("MongoDB Atlas", "healthy", 0, "Not configured")
        return
      }
      await mongoVectorStore.connect()
      const latency = Date.now() - startTime
      updateDependencyHealth("MongoDB Atlas", "healthy", latency)
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("MongoDB Atlas", "unhealthy", latency, String(err))
      // Only throw if critical, but this dependency is optional
      logger.error("MongoDB initialization failed:", err)
    }
  },
  validate: async () => {
    const startTime = Date.now()
    try {
      // Use ping for lightweight connectivity check during startup
      const isHealthy = await mongoVectorStore.ping()
      const latency = Date.now() - startTime
      if (isHealthy) {
        updateDependencyHealth("MongoDB Atlas", "healthy", latency)
        return true
      }
      updateDependencyHealth("MongoDB Atlas", "unhealthy", latency, "Ping failed")
      return false
    } catch (error) {
      logger.warn("MongoDB validation failed:", error)
      updateDependencyHealth("MongoDB Atlas", "unhealthy", 0, String(error))
      return false
    }
  },
  shutdown: async () => {
    await mongoVectorStore.disconnect()
  },
}
