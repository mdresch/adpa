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
      // Check if we can access the database
      const stats = await mongoVectorStore.getStats()
      const latency = Date.now() - startTime
      if (stats && stats.database) {
        logger.debug(`MongoDB connected to: ${stats.database}`)
        updateDependencyHealth("MongoDB Atlas", "healthy", latency)
        return true
      }
      updateDependencyHealth("MongoDB Atlas", "unhealthy", latency, "No database stats")
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
