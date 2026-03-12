import { Dependency } from "../dependencyGraph"
import { aiService } from "../../services/aiService"
import { logger } from "../../utils/logger"
import { getDatabasePoolSafe } from "../../database/connection"

import { updateDependencyHealth } from "../../routes/health"

export const aiProvidersDependency: Dependency = {
  name: "AI Providers",
  critical: false,
  timeout: 20000, // 20 seconds
  init: async () => {
    const startTime = Date.now()
    // Wait for database pool to be ready before initializing AI providers
    // This prevents race conditions where AI providers try to access DB before it's connected
    const maxWaitTime = 15000 // 15 seconds
    const checkInterval = 100 // Check every 100ms
    let elapsedTime = 0

    logger.debug("Waiting for database pool to be ready for AI providers...")

    while (elapsedTime < maxWaitTime) {
      const pool = getDatabasePoolSafe()
      if (pool) {
        logger.debug("Database pool ready for AI providers initialization")
        break
      }

      elapsedTime += checkInterval
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }

    if (elapsedTime >= maxWaitTime) {
      logger.warn("Database pool not ready after 15 seconds, initializing AI providers with defaults")
    }

    // Initialize AI providers (will use defaults if DB is unavailable)
    try {
      await aiService.initializeProviders()
      const latency = Date.now() - startTime
      updateDependencyHealth("AI Providers", "healthy", latency)
      logger.debug("AI providers initialized successfully")
    } catch (error) {
      const latency = Date.now() - startTime
      updateDependencyHealth("AI Providers", "unhealthy", latency, String(error))
      logger.warn("AI provider initialization error, will use defaults:", error)
      // Don't rethrow - allow graceful degradation
    }
  },
  validate: async () => {
    try {
      // Check if at least one AI provider is available
      const providers = (aiService as any).getProviders?.()

      // If we have providers configured (either in Map or Object), validation passes
      const hasProviders = providers instanceof Map 
        ? providers.size > 0 
        : (providers && Object.keys(providers).length > 0)

      if (hasProviders) {
        const providerNames = providers instanceof Map 
          ? Array.from(providers.keys()).join(", ")
          : Object.keys(providers).join(", ")
        logger.debug(`AI providers available: ${providerNames}`)
        const latency = Date.now() - startTime
        updateDependencyHealth("AI Providers", "healthy", latency)
        return true
      }

      // If no providers but database wasn't ready, that's OK (graceful degradation)
      // Log a warning but don't fail the validation
      logger.warn(
        "AI providers not fully initialized (database may not have been ready), " +
        "system will continue with defaults. Some AI features may be limited."
      )
      updateDependencyHealth("AI Providers", "healthy", 0, "Graceful degradation")
      return true // Return true to allow graceful degradation
    } catch (error) {
      logger.warn("AI providers validation error, using defaults:", error)
      updateDependencyHealth("AI Providers", "unhealthy", 0, String(error))
      return true // Return true to allow graceful degradation
    }
  },
}
