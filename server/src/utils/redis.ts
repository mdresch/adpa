import { createClient } from "redis"
import { logger } from "./logger"
import CircuitBreaker from "./circuitBreaker"

// Define connection methods - try environment variables first, then fallback to localhost
const redisConnectionMethods = [
  // Method 1: Host-based connection (Railway, local, etc.)
  {
    host: process.env.REDIS_HOST || "localhost",
    description: "Railway External/Proxy Redis"
  },
  // Method 2: Internal Railway Redis (for when running inside Railway)
  {
    host: "redis.railway.internal",
    description: "Railway Internal Redis"
  },
  // Method 3: Default Localhost
  {
    host: "localhost",
    description: "Localhost Redis"
  }
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

  // Fallback: build config from parts (Host, Port, Password)
  const config: any = {
    socket: {
      host: host,
      port: Number.parseInt(process.env.REDIS_PORT || "6379"),
      connectTimeout: 10000,
      lazyConnect: true,
    },
    password: process.env.REDIS_PASSWORD,
    database: Number.parseInt(process.env.REDIS_DB || "0"),
  }

  logger.info("Redis config built from parts:", {
    host: config.socket.host,
    port: config.socket.port,
    hasPassword: !!config.password
  })
  return config
}

let redisClient: any = null
let isConnecting = false
// Circuit breaker for Redis to avoid hammering a failing service
const redisBreaker = new CircuitBreaker(3, 30000) // open after 3 failures, reset after 30s

/**
 * Enhanced Redis client accessor that checks connection state
 */
const getRedisClient = () => {
  if (redisBreaker.isOpen()) {
    return null
  }

  // If client exists but is closed, we need to handle it
  if (redisClient && !redisClient.isOpen) {
    logger.warn("Redis client exists but is closed")
    // If not already connecting, trigger background reconnect
    if (!isConnecting) {
      logger.info("Triggering background Redis reconnection...")
      connectRedis().catch(err => {
        logger.error(err, "Background Redis reconnection failed:")
      })
    }
    return null // Return null so callers can degrade gracefully while we reconnect
  }

  if (!redisClient) {
    // If we've never had a client, we shouldn't create it synchronously here 
    // because connect() is async and createClient alone doesn't establish the socket.
    // The server should have called connectRedis() at startup.
    if (!isConnecting) {
      connectRedis().catch(err => {
        logger.error(err, "Initial background Redis connection failed:")
      })
    }
    return null
  }

  return redisClient
}

export async function connectRedis() {
  if (isConnecting) return
  isConnecting = true

  const maxRetriesPerMethod = 4
  const baseRetryDelay = 1000 // 1 second

  try {
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
            logger.error(err, "Redis Client Error:")
          })
          testClient.on("connect", () => {
            logger.info("Redis client connected")
          })
          testClient.on("ready", () => {
            logger.info("Redis client ready")
          })

          // Add timeout to prevent hanging
          const connectionTimeout = 5000 + (attempt - 1) * 2000
          await Promise.race([
            testClient.connect(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Connection timeout after ${connectionTimeout}ms`)), connectionTimeout)
            )
          ])

          // If successful, update the global client and return
          if (redisClient) {
            await redisClient.disconnect().catch(() => { })
          }
          redisClient = testClient
          redisBreaker.recordSuccess()
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
          redisBreaker.recordFailure()

          // Clean up failed client
          if (testClient) {
            try {
              await testClient.disconnect().catch(() => { })
            } catch { }
          }

          if (attempt < maxRetriesPerMethod) {
            const delay = baseRetryDelay * Math.pow(2, attempt - 1)
            console.log(`🔄 Retrying Redis connection in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
    }
  } finally {
    isConnecting = false
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
      if (!client) {
        logger.warn(`Redis client unavailable (circuit open or not connected) - get key ${key}`)
        return null
      }
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
      if (!client) {
        logger.warn(`Redis client unavailable (circuit open or not connected) - set key ${key}`)
        return false
      }
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
      if (!client) {
        logger.warn(`Redis client unavailable (circuit open or not connected) - del key ${key}`)
        return false
      }
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
      if (!client) {
        logger.warn(`Redis client unavailable (circuit open or not connected) - exists key ${key}`)
        return false
      }
      return await client.exists(key)
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  },

  async flush() {
    try {
      const client = getRedisClient()
      if (!client) {
        logger.warn(`Redis client unavailable (circuit open or not connected) - flushDb`)
        return false
      }
      await client.flushDb()
      return true
    } catch (error) {
      logger.error("Cache flush error:", error)
      return false
    }
  },
}

export { getRedisClient as redisClient }

export function getRedisCircuitState() {
  try {
    return redisBreaker.getState()
  } catch (e) {
    return 'unknown'
  }
}
