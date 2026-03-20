import { Dependency } from "../dependencyGraph"
import { connectRedis, redisClient } from "../../utils/redis"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const redisDependency: Dependency = {
  name: "Primary Redis",
  critical: false,
  timeout: 10000, // 10 seconds
  init: async () => {
    const startTime = Date.now()
    try {
      await connectRedis()
      const latency = Date.now() - startTime
      updateDependencyHealth("Redis", "healthy", latency)
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Redis", "unhealthy", latency, String(err))
      throw err
    }
  },
  validate: async () => {
    try {
      const client = redisClient()
      if (!client) {
        updateDependencyHealth("Redis", "unhealthy", 0, "Client not initialized")
        return false
      }
      const startTime = Date.now()
      const result = await client.ping()
      const latency = Date.now() - startTime
      if (result === "PONG") {
        updateDependencyHealth("Redis", "healthy", latency)
        return true
      }
      updateDependencyHealth("Redis", "unhealthy", latency, "Ping failed")
      return false
    } catch (error) {
      logger.warn("Redis validation failed:", error)
      updateDependencyHealth("Redis", "unhealthy", 0, String(error))
      return false
    }
  },
  shutdown: async () => {
    const client = redisClient()
    if (client) {
      await client.quit()
    }
  },
}
