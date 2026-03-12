import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"

/**
 * RabbitMQ dependency - currently a placeholder for future use.
 * Not yet integrated into the ADPA codebase.
 */
export const rabbitmqDependency: Dependency = {
  name: "RabbitMQ",
  critical: false,
  timeout: 10000, // 10 seconds
  init: async () => {
    // RabbitMQ is not yet implemented in ADPA
    // This is a placeholder for future integration
    logger.debug("RabbitMQ dependency registered but not configured")
  },
  validate: async () => {
    // Skip validation if RabbitMQ is not configured
    if (!process.env.RABBITMQ_URL) {
      return true
    }
    // For now, allow RabbitMQ to pass as it is a known optional placeholder
    logger.info("RabbitMQ is currently a placeholder - skipping deep validation")
    return true
  },
}
