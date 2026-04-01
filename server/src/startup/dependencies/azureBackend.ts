import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import axios from "axios"

/**
 * Azure Backend dependency for the startup graph.
 * Validates that the backend is running in a correctly configured Azure Container environment
 * and is aware of its own public endpoint.
 */
export const azureBackendDependency: Dependency = {
  name: "Azure Backend Availability",
  critical: true,
  timeout: 10000,
  init: async () => {
    const isProduction = process.env.NODE_ENV === "production"
    const backendUrl = process.env.BACKEND_URL || "https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io"
    
    logger.info(`🌐 Validating Azure Backend configuration (${backendUrl})...`)

    // In production, we expect certain Azure environment variables to be present
    if (isProduction) {
      const azureEnvVars = [
        'CONTAINER_APP_NAME',
        'CONTAINER_APP_REVISION',
        'CONTAINER_APP_REPLICA_NAME'
      ]
      
      const missingVars = azureEnvVars.filter(v => !process.env[v])
      if (missingVars.length > 0 && !backendUrl.includes('localhost')) {
        logger.warn(`⚠️ Running in production but missing Azure metadata: ${missingVars.join(', ')}`)
      }
    }

    try {
      // Basic self-check: verify we can reach the health endpoint (best effort)
      // We skip this if it's localhost to avoid circular loops during dev
      if (backendUrl && !backendUrl.includes('localhost')) {
        const response = await axios.get(`${backendUrl}/health`, { timeout: 5000 });
        if (response.status === 200) {
          logger.info("✅ Azure Backend public endpoint is reachable.")
        }
      }
    } catch (error: any) {
      logger.warn(`⚠️ Azure Backend self-check ping failed: ${error.message}. This might be expected if the container is still booting or behind a tight firewall.`)
      // We don't throw here as it might be a circular dependency (container needs to be up to ping itself)
      // but we log it for visibility.
    }
  },
  validate: async () => {
    return true // Validation passes if init completed
  },
}
