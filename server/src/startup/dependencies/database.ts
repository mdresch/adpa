import { Dependency } from "../dependencyGraph"
import { connectDatabase, pool } from "../../database/connection"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const databaseDependency: Dependency = {
  name: "Database",
  critical: true,
  timeout: 30000, // 30 seconds
  init: async () => {
    const startTime = Date.now()
    try {
      await connectDatabase()
      const latency = Date.now() - startTime
      updateDependencyHealth("Database", "healthy", latency)
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Database", "unhealthy", latency, String(err))
      throw err
    }
  },
  validate: async () => {
    try {
      if (!pool) {
        updateDependencyHealth("Database", "unhealthy", 0, "Pool not initialized")
        return false
      }
      const result = await pool.query("SELECT NOW()")
      return result.rows.length > 0
    } catch (error) {
      logger.error("Database validation failed:", error)
      updateDependencyHealth("Database", "unhealthy", 0, String(error))
      return false
    }
  },
  shutdown: async () => {
    if (pool) {
      await pool.end()
    }
  },
}
