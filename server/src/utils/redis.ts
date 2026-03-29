import { createClient } from "redis"
import { logger } from "./logger"
import CircuitBreaker from "./circuitBreaker"

// Define connection methods - prioritize REDIS_URL, then host-based, then fallback to localhost
const redisConnectionMethods = [
  // Method 1: URL-based connection (Standard, Railway, Render, etc.)
  {
    url: process.env.REDIS_URL,
    description: "Primary REDIS_URL"
  },
  // Method 2: Host-based connection (Standard, local, etc.)
  {
    host: process.env.REDIS_HOST,
    description: "Primary REDIS_HOST"
  },
  // Method 3: Upstash fallback (if configured)
  {
    url: process.env.UPSTASH_REDIS_URL,
    description: "Upstash Serverless Redis (Fallback)"
  },
  // Method 4: Default Localhost fallback for development
  {
    host: "localhost",
    description: "Localhost Fallback"
  }
]

const createRedisConfig = (connectionString: string | undefined) => {
  if (!connectionString) return null;

  const isUrl = connectionString.includes('://');

  // Base socket configuration for resilience
  const socketConfig: any = {
    connectTimeout: 10000, // 10 seconds
    // keepAlive: 5000,       // TCP Keep-alive every 5 seconds (temporary disable to test)
    // noDelay: true,         // Disable Nagle's algorithm (temporary disable to test)
    reconnectStrategy: (retries: number) => {
      // Exponential backoff with a cap at 30 seconds
      const delay = Math.min(retries * 1000, 30000);
      logger.info(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    }
  }

  // If it's a full URL (e.g., from Upstash or Railway REDIS_URL)
  if (isUrl) {
    const config: any = {
      url: connectionString,
      socket: socketConfig
    }

    // Enable TLS ONLY if URL protocol is rediss:// (secure Redis)
    if (connectionString.startsWith('rediss://')) {
      config.socket.tls = true
      config.socket.rejectUnauthorized = false // For self-signed certificates
    }

    logger.info("Redis config from URL:", {
      url: config.url.replace(/:[^:@]+@/, ':***@'), // Hide password in logs
      tls: !!config.socket.tls,
      protocol: connectionString.split(':')[0]
    })
    return config
  }

  // Fallback: build config from host (Host, Port, Password)
  const config: any = {
    socket: {
      ...socketConfig,
      host: connectionString,
      port: Number.parseInt(process.env.REDIS_PORT || "6379"),
    },
    password: process.env.REDIS_PASSWORD,
    database: Number.parseInt(process.env.REDIS_DB || "0"),
  }

  logger.info("Redis config from host:", {
    host: config.socket.host,
    port: config.socket.port,
    hasPassword: !!config.password
  })
  return config
}

let redisClient: any = null
let isConnecting = false
let heartbeatInterval: NodeJS.Timeout | null = null

// Circuit breaker for Redis to avoid hammering a failing service
const redisBreaker = new CircuitBreaker(3, 30000) // open after 3 failures, reset after 30s

/**
 * Start a periodic heartbeat to keep the connection alive
 */
function startHeartbeat(client: any) {
  if (heartbeatInterval) clearInterval(heartbeatInterval)
  
  heartbeatInterval = setInterval(async () => {
    try {
      if (client.isOpen) {
        await client.ping()
      }
    } catch (err) {
      logger.error(err, "Redis heartbeat PING failed:")
    }
  }, 30000) // PING every 30 seconds
}

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
    return null 
  }

  if (!redisClient) {
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

  const maxRetriesPerMethod = 3 // Reduced since internal strategy will also retry
  const baseRetryDelay = 1000

  try {
    // Try each connection method
    for (const method of redisConnectionMethods) {
      const connStr = method.url || method.host;
      
      if (!connStr) continue;

      logger.info(`Trying Redis connection via ${method.description}: ${connStr.includes('://') ? connStr.split('@')[1] || connStr : connStr}`);

      for (let attempt = 1; attempt <= maxRetriesPerMethod; attempt++) {
        let testClient: any = null
        try {
          const config = createRedisConfig(connStr)
          if (!config) continue;

          testClient = createClient(config)

          // Attach event listeners
          testClient.on("error", (err: any) => {
            // Detailed logging for ALL errors during debugging
            const errorDetails = {
              message: err.message,
              code: err.code,
              name: err.name,
              stack: err.stack ? (err.stack.split('\n')[1] || '') : ''
            };
            
            logger.error(errorDetails, `[REDIS] ❌ Detailed Error: ${err.message}`);

            if (err.message && (err.message.includes('ECONNRESET') || err.message.includes('Socket closed'))) {
              logger.debug(err, "[REDIS] 🔄 Connection Reset (expected during proxy idle/restart):")
            }
          })
          
          testClient.on("connect", () => logger.info("Redis client connecting..."))
          testClient.on("ready", () => {
            logger.info("Redis client ready and functional")
            startHeartbeat(testClient)
          })
          testClient.on("reconnecting", () => logger.info("Redis client attempting to reconnect..."))
          testClient.on("end", () => {
            logger.warn("Redis connection ended")
            if (heartbeatInterval) clearInterval(heartbeatInterval)
          })

          // Add timeout to prevent hanging on initial connect
          const connectionTimeout = 10000 
          await Promise.race([
            testClient.connect(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Initial connection timeout after ${connectionTimeout}ms`)), connectionTimeout)
            )
          ])

          // If successful, update the global client
          if (redisClient && redisClient !== testClient) {
            await redisClient.disconnect().catch(() => { })
          }
          redisClient = testClient
          redisBreaker.recordSuccess()
          logger.info(`Redis connection established successfully via ${method.description}`)
          return
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.warn(`Redis connection attempt ${attempt} failed via ${method.description}:`, errorMessage)
          redisBreaker.recordFailure()

          if (testClient) {
            try {
              await testClient.disconnect().catch(() => { })
            } catch { }
          }

          if (attempt < maxRetriesPerMethod) {
            const delay = baseRetryDelay * Math.pow(2, attempt - 1)
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
