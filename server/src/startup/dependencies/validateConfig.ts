import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"

/**
 * Validates the security configuration to ensure production environments
 * do not bypass TLS verification.
 */
export function validateSecurityConfig(): void {
  const isProduction = process.env.NODE_ENV === "production"
  const tlsUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0"

  if (isProduction && tlsUnauthorized) {
    const errorMsg = "CRITICAL SECURITY WARNING: NODE_TLS_REJECT_UNAUTHORIZED=0 is set in production. This bypasses TLS verification and is highly unsafe. Startup aborted."
    logger.error(errorMsg)
    throw new Error(errorMsg)
  }
}

/**
 * Security validation dependency for the startup graph.
 * Ensures the server fails to start if insecure configurations are detected.
 */
export const securityValidationDependency: Dependency = {
  name: "Security Configuration Validation",
  critical: true,
  timeout: 5000,
  init: async () => {
    logger.info("🔒 Validating security configuration...")
    validateSecurityConfig()
  },
  validate: async () => {
    return true // If init didn't throw, validation passed
  },
}
