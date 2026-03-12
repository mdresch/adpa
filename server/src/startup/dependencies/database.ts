import { Dependency } from "../dependencyGraph"
import { connectDatabase, pool } from "../../database/connection"
import { logger } from "../../utils/logger"

export const databaseDependency: Dependency = {
  name: "Database",
  critical: true,
  timeout: 30000, // 30 seconds
  init: async () => {
    await connectDatabase()
  },
  validate: async () => {
    try {
      if (!pool) return false
      const result = await pool.query("SELECT NOW()")
      return result.rows.length > 0
    } catch (error) {
      logger.error("Database validation failed:", error)
      return false
    }
  },
  shutdown: async () => {
    if (pool) {
      await pool.end()
    }
  },
}
