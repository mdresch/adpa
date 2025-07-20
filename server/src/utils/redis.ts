import { createClient } from "redis"
import { logger } from "./logger"

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  password: process.env.REDIS_PASSWORD,
  database: Number.parseInt(process.env.REDIS_DB || "0"),
})

redisClient.on("error", (err) => {
  logger.error("Redis Client Error:", err)
})

redisClient.on("connect", () => {
  logger.info("Redis client connected")
})

redisClient.on("ready", () => {
  logger.info("Redis client ready")
})

export async function connectRedis() {
  try {
    await redisClient.connect()
    logger.info("Redis connection established")
  } catch (error) {
    logger.error("Redis connection failed:", error)
    throw error
  }
}

export async function disconnectRedis() {
  try {
    await redisClient.disconnect()
    logger.info("Redis disconnected")
  } catch (error) {
    logger.error("Redis disconnect failed:", error)
  }
}

// Cache utilities
export const cache = {
  async get(key: string) {
    try {
      const value = await redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error)
      return null
    }
  },

  async set(key: string, value: any, ttl: number = 3600) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value))
      return true
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error)
      return false
    }
  },

  async del(key: string) {
    try {
      await redisClient.del(key)
      return true
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  },

  async exists(key: string) {
    try {
      return await redisClient.exists(key)
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  },

  async flush() {
    try {
      await redisClient.flushDb()
      return true
    } catch (error) {
      logger.error("Cache flush error:", error)
      return false
    }
  },
}

export { redisClient }
