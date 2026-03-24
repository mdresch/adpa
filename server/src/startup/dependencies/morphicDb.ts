import { Dependency } from "../dependencyGraph"
import { MorphicRepository } from "../../modules/morphic/MorphicRepository"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

// We'll use a dummy instance to force connection init and validation
const morphicRepo = new MorphicRepository()

export const morphicDbDependency: Dependency = {
  name: "Morphic DB",
  critical: false, // Not critical for the main ADPA system
  timeout: 30000,
  init: async () => {
    const startTime = Date.now()
    try {
      // Force a simple query to initialize the connection pool
      await (morphicRepo as any).query`SELECT 1 as initialized`
      const latency = Date.now() - startTime
      updateDependencyHealth("Morphic DB", "healthy", latency)
      logger.info("[STARTUP] Morphic DB connection initialized successfully.")
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Morphic DB", "unhealthy", latency, String(err))
      logger.warn("[STARTUP] Morphic DB connection failed or is using fallback.", err)
      // Since it's not critical, we don't throw to crash the startup unless we want fail-fast for it.
      // The instructions say it's separate from main ADPA, so let's log and proceed.
    }
  },
  validate: async () => {
    try {
      const result = await (morphicRepo as any).query`SELECT 1 as ok`
      if (result && result.length > 0 && result[0].ok === 1) {
        return true
      }
      return false
    } catch (error) {
      logger.error("Morphic DB validation failed:", error)
      updateDependencyHealth("Morphic DB", "unhealthy", 0, String(error))
      return false
    }
  },
  shutdown: async () => {
    // The MorphicRepository uses a static client internally.
    // We can gracefully end it if it's available.
    try {
      const client = (MorphicRepository as any)._client
      if (client) {
        await client.end()
        logger.info("[SHUTDOWN] Morphic DB connection closed.")
      }
    } catch (error) {
      logger.error("Error closing Morphic DB connection:", error)
    }
  },
}
