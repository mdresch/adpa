import { createClient } from "redis"
import { logger } from "./logger"

// Create Redis client with explicit configuration
const getRedisConfig = () => {
  const config = {
    url: "redis://redis:6379", // Hardcoded for testing
    password: process.env.REDIS_PASSWORD,
    database: Number.parseInt(process.env.REDIS_DB || "0"),
  }
  logger.info("Redis config:", { url: config.url, hasPassword: !!config.password, database: config.database })
  return config
}

let redisClient: any = null

const getRedisClient = () => {
  logger.info("getRedisClient called")
  if (!redisClient) {
    logger.info("Creating new Redis client")
    redisClient = createClient(getRedisConfig())
    
    redisClient.on("error", (err: any) => {
      logger.error("Redis Client Error:", err)
    })

    redisClient.on("connect", () => {
      logger.info("Redis client connected")
    })

    redisClient.on("ready", () => {
      logger.info("Redis client ready")
    })
  } else {
    logger.info("Using existing Redis client")
  }
  return redisClient
}

export async function connectRedis() {
  try {
    // Get the Redis client (creates it if it doesn't exist)
    redisClient = getRedisClient()
    
    // Ensure client is properly configured
    if (redisClient.options?.url !== "redis://redis:6379") {
      logger.info("Recreating Redis client with correct config")
      if (redisClient) {
        await redisClient.disconnect().catch(() => {})
      }
      redisClient = createClient(getRedisConfig())
      
      // Re-attach event listeners
      redisClient.on("error", (err: any) => {
        logger.error("Redis Client Error:", err)
      })
      redisClient.on("connect", () => {
        logger.info("Redis client connected")
      })
      redisClient.on("ready", () => {
        logger.info("Redis client ready")
      })
    }
    
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
      const client = getRedisClient()
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error)
      return null
    }
  },

  async set(key: string, value: any, ttl: number = 3600) {
    try {
      const client = getRedisClient()
      await client.setEx(key, ttl, JSON.stringify(value))
      return true
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error)
      return false
    }
  },

  async del(key: string) {
    try {
      const client = getRedisClient()
      await client.del(key)
      return true
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  },

  async exists(key: string) {
    try {
      const client = getRedisClient()
      return await client.exists(key)
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  },

  async flush() {
    try {
      const client = getRedisClient()
      await client.flushDb()
      return true
    } catch (error) {
      logger.error("Cache flush error:", error)
      return false
    }
  },
}

export { getRedisClient as redisClient }
