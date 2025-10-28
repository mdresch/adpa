import { createClient } from "redis"
import { logger } from "./logger"

// Simple localhost Redis connection for local development
const redisConnectionMethods = [
  { host: process.env.REDIS_HOST || "localhost", description: "Localhost Redis" }
]

const createRedisConfig = (host: string) => {
  // If REDIS_URL is provided (e.g., from Railway), use it directly
  if (process.env.REDIS_URL) {
    const config: any = {
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000, // 10 seconds
        lazyConnect: true,
      }
    }
    
    // Enable TLS ONLY if URL protocol is rediss:// (secure Redis)
    // Railway internal Redis uses redis:// (no TLS needed)
    // External services like Upstash use rediss:// (TLS required)
    if (process.env.REDIS_URL.startsWith('rediss://')) {
      config.socket.tls = true
      config.socket.rejectUnauthorized = false // For self-signed certificates
    }
    
    logger.info("Redis config (from REDIS_URL):", { 
      url: config.url.replace(/:[^:@]+@/, ':***@'), // Hide password in logs
      tls: !!config.socket.tls,
      protocol: process.env.REDIS_URL.split(':')[0]
    })
    return config
  }
  
  // Fallback: build URL from parts (for local development)
  const config = {
    url: `redis://${host}:${process.env.REDIS_PORT || "6379"}`,
    password: process.env.REDIS_PASSWORD,
    database: Number.parseInt(process.env.REDIS_DB || "0"),
    socket: {
      connectTimeout: 10000,
      lazyConnect: true,
    }
  }
  logger.info("Redis config (built from parts):", { url: config.url, hasPassword: !!config.password })
  return config
}

let redisClient: any = null

const getRedisClient = () => {
  logger.info("getRedisClient called")
  if (!redisClient) {
    logger.info("Creating new Redis client")
    const host = process.env.REDIS_HOST || "localhost"
    redisClient = createClient(createRedisConfig(host))
    
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
  const maxRetriesPerMethod = 2
  const retryDelay = 2000 // 2 seconds
  
  // Try each connection method
  for (const method of redisConnectionMethods) {
    logger.info(`Trying Redis connection via ${method.description}: ${method.host}`)
    
    for (let attempt = 1; attempt <= maxRetriesPerMethod; attempt++) {
      let testClient: any = null
      try {
        logger.info(`Attempting to connect to Redis (attempt ${attempt}/${maxRetriesPerMethod}) via ${method.description}...`)
        
        // Create a new client for this connection method
        testClient = createClient(createRedisConfig(method.host))
        
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
        
        // Add timeout to prevent hanging
        const connectionTimeout = 5000 // 5 seconds
        await Promise.race([
          testClient.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Connection timeout after ${connectionTimeout}ms`)), connectionTimeout)
          )
        ])
        
        // If successful, update the global client and return
        if (redisClient) {
          await redisClient.disconnect().catch(() => {})
        }
        redisClient = testClient
        logger.info(`Redis connection established successfully via ${method.description}`)
        return
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error(`❌ Redis connection attempt ${attempt} failed via ${method.description}`)
        console.error(`   Error: ${errorMessage}`)
        if (errorStack) {
          console.error(`   Stack: ${errorStack.split('\n').slice(0, 3).join('\n')}`)
        }
        logger.warn(`Redis connection attempt ${attempt} failed via ${method.description}:`, errorMessage)
        
        // Clean up failed client
        if (testClient) {
          try {
            await testClient.disconnect().catch(() => {})
          } catch {}
        }
        
        if (attempt < maxRetriesPerMethod) {
          console.log(`🔄 Retrying Redis connection in ${retryDelay}ms...`)
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
