import { Dependency } from "../dependencyGraph"
import { isTracingEnabled, initTracing } from "../../tracing"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const langfuseDependency: Dependency = {
  name: "Langfuse",
  critical: false,
  timeout: 5000,
  init: async () => {
    try {
      // Tracing is auto-initialized on import in server.ts, 
      // but we can ensure it's ready here if needed.
      // Langfuse OTLP initialization is handled in tracing.ts
      logger.info("Langfuse tracing dependency registered")
      updateDependencyHealth("Langfuse", "healthy")
    } catch (error) {
      logger.warn("Langfuse initialization warning:", error)
      updateDependencyHealth("Langfuse", "unhealthy", 0, String(error))
    }
  },
  validate: async () => {
    // Langfuse is "healthy" if tracing is enabled and credentials are present
    const enabled = isTracingEnabled()
    const hasKeys = !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY)
    
    if (enabled && !hasKeys) {
      logger.warn("Langfuse tracing enabled but credentials missing")
      updateDependencyHealth("Langfuse", "unhealthy", 0, "Tracing enabled but credentials missing")
      return false
    }
    
    updateDependencyHealth("Langfuse", "healthy")
    return enabled ? hasKeys : true // If disabled, we consider it "ready" (skipped)
  },
}
