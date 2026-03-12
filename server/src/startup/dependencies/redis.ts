import { Dependency } from "../dependencyGraph"
import { connectRedis, redisClient } from "../../utils/redis"
import { logger } from "../../utils/logger"

export const redisDependency: Dependency = {
  name: "Redis",
  critical: false,
  timeout: 10000, // 10 seconds
  init: async () => {
    await connectRedis()
  },
  validate: async () => {
    try {
      const client = redisClient()
      if (!client) return false
      const result = await client.ping()
      return result === "PONG"
    } catch (error) {
      logger.warn("Redis validation failed:", error)
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
