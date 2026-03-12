import { Dependency } from "../dependencyGraph"
import { mongoVectorStore } from "../../services/mongoVectorStore"
import { logger } from "../../utils/logger"

export const mongodbDependency: Dependency = {
  name: "MongoDB Atlas",
  critical: false,
  timeout: 15000, // 15 seconds
  init: async () => {
    await mongoVectorStore.connect()
  },
  validate: async () => {
    try {
      // Check if we can access the database
      const stats = await mongoVectorStore.getStats()
      if (stats && stats.database) {
        logger.debug(`MongoDB connected to: ${stats.database}`)
        return true
      }
      return false
    } catch (error) {
      logger.warn("MongoDB validation failed:", error)
      return false
    }
  },
  shutdown: async () => {
    await mongoVectorStore.disconnect()
  },
}
