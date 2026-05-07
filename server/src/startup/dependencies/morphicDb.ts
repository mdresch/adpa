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
      // Perform schema validation and auto-bootstrap if needed
      const success = await morphicRepo.ensureSchema()
      
      const latency = Date.now() - startTime
      if (success) {
        updateDependencyHealth("Morphic DB", "healthy", latency)
        logger.info("[STARTUP] Morphic DB initialized and schema validated.")
      } else {
        throw new Error("Schema initialization returned false")
      }
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Morphic DB", "unhealthy", latency, String(err))
      logger.warn("[STARTUP] Morphic DB initialization failed. Check credentials and permissions.", err)
    }
  },
  validate: async () => {
    try {
      // Re-verify the most critical table exists
      const success = await morphicRepo.ensureSchema()
      if (!success) {
        // Morphic DB is optional; do not fail overall startup validation.
        updateDependencyHealth("Morphic DB", "unhealthy", 0, "Validation returned false")
        return true
      }
      return true
    } catch (error) {
      logger.error("Morphic DB validation failed:", error)
      updateDependencyHealth("Morphic DB", "unhealthy", 0, String(error))
      // Morphic DB is optional; do not fail overall startup validation.
      return true
    }
  },
  shutdown: async () => {
    // The MorphicRepository uses a static pool internally.
    try {
      const pool = (MorphicRepository as any)._pool
      if (pool) {
        await pool.end()
        logger.info("[SHUTDOWN] Morphic DB connection closed.")
      }
    } catch (error) {
      logger.error("Error closing Morphic DB connection:", error)
    }
  },
}
