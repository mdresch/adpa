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
      await mongoVectorStore.connect()
      const latency = Date.now() - startTime
      updateDependencyHealth("MongoDB Atlas", "healthy", latency)
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("MongoDB Atlas", "unhealthy", latency, String(err))
      throw err
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
