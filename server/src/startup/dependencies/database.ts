import { Dependency } from "../dependencyGraph"
import { connectDatabase, getDatabasePoolSafe } from "../../database/connection"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const databaseDependency: Dependency = {
  name: "Database",
  critical: true,
  timeout: 65000, // 65 seconds to allow for 60s PG timeout + buffer
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
      const pool = getDatabasePoolSafe()
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
    const pool = getDatabasePoolSafe()
    if (!pool) return
    try {
      await pool.end()
    } catch (e) {
      logger.warn("Database shutdown failed (ignored)", { message: (e as any)?.message })
    }
  },
}
