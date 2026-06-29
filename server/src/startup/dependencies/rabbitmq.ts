import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"
import { evaluateRabbitHealth } from "../../services/queue/queueHealth"

/**
 * RabbitMQ dependency — verifies the broker connection that the job queue runs on.
 *
 * The job queue (RabbitQueueAdapter) requires a live RabbitMQ connection. If the broker
 * is unreachable, publishes are buffered and generation jobs silently stay at 'pending'.
 * This check surfaces that as `unhealthy` instead of a misleading placeholder `healthy`.
 * See .agents/skills/adpa-doc-gen-queue-health/SKILL.md (REQ-001).
 */
export const rabbitmqDependency: Dependency = {
  name: "RabbitMQ",
  critical: false,
  timeout: 30000, // 30 seconds
  init: async () => {
    logger.debug("RabbitMQ dependency registered")
  },
  validate: async () => {
    const configured = !!process.env.RABBITMQ_URL
    if (!configured) {
      const verdict = evaluateRabbitHealth({ configured: false, connected: false })
      updateDependencyHealth("RabbitMQ", verdict.status, 0, verdict.reason)
      return true
    }

    let connected = false
    try {
      // Reuse the shared connection created by the queue client.
      const { connection } = await import("../../services/queue/queueClient")
      const isConnected = (connection as any)?.isConnected
      connected = typeof isConnected === "function" ? !!isConnected.call(connection) : false
    } catch (err) {
      logger.warn("RabbitMQ health check could not read connection state", err)
      connected = false
    }

    const verdict = evaluateRabbitHealth({ configured: true, connected })
    updateDependencyHealth("RabbitMQ", verdict.status, 0, verdict.reason)
    if (!verdict.ok) {
      logger.warn(`[RABBITMQ] ${verdict.reason}`)
    }
    // Optional dependency: do not block startup, but report the true state.
    return true
  },
}
