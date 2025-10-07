import { createClient } from "redis"
import { logger } from "./logger"

// Hybrid connection approach: try IP addresses first, then hostnames
const redisConnectionMethods = [
  { host: "172.19.0.2", description: "Redis IP address" },
  { host: "redis", description: "Redis hostname" },
  { host: process.env.REDIS_HOST || "redis", description: "Environment hostname" }
]

const createRedisConfig = (host: string) => {
  const config = {
    url: `redis://${host}:${process.env.REDIS_PORT || "6379"}`,
    password: process.env.REDIS_PASSWORD,
    database: Number.parseInt(process.env.REDIS_DB || "0"),
    socket: {
      connectTimeout: 30000, // 30 seconds per attempt
      lazyConnect: true,
    }
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
  const maxRetriesPerMethod = 3
  const retryDelay = 5000 // 5 seconds
  
  // Try each connection method
  for (const method of redisConnectionMethods) {
    logger.info(`Trying Redis connection via ${method.description}: ${method.host}`)
    
    for (let attempt = 1; attempt <= maxRetriesPerMethod; attempt++) {
      try {
        logger.info(`Attempting to connect to Redis (attempt ${attempt}/${maxRetriesPerMethod}) via ${method.description}...`)
        
        // Create a new client for this connection method
        const testClient = createClient(createRedisConfig(method.host))
        
        // Attach event listeners
        testClient.on("error", (err: any) => {
          logger.error("Redis Client Error:", err)
        })
        testClient.on("connect", () => {
          logger.info("Redis client connected")
        })
        testClient.on("ready", () => {
          logger.info("Redis client ready")
        })
        
        await testClient.connect()
        
        // If successful, update the global client and return
        if (redisClient) {
          await redisClient.disconnect().catch(() => {})
        }
        redisClient = testClient
        logger.info(`Redis connection established successfully via ${method.description}`)
        return
      } catch (error) {
        logger.warn(`Redis connection attempt ${attempt} failed via ${method.description}:`, error)
        
        if (attempt < maxRetriesPerMethod) {
          logger.info(`Retrying Redis connection in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
  }
  
  // If all methods failed
  logger.error("All Redis connection methods failed")
  throw new Error("Unable to connect to Redis using any available method")
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
