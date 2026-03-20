import { Dependency } from "../dependencyGraph"
import { createClient } from "redis"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const upstashDependency: Dependency = {
  name: "Upstash Redis",
  critical: false,
  timeout: 10000, // 10 seconds
  init: async () => {
    const url = process.env.UPSTASH_REDIS_URL
    if (!url) {
      logger.info("[STARTUP] Upstash Redis not configured, skipping init")
      return
    }

    const startTime = Date.now()
    let client: any = null
    try {
      client = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          tls: url.startsWith('rediss://'),
          rejectUnauthorized: false
        }
      })

      client.on('error', (err: any) => {
        logger.debug(`[STARTUP] Upstash validation error: ${err.message}`)
      })

      await client.connect()
      const result = await client.ping()
      const latency = Date.now() - startTime

      if (result === "PONG") {
        updateDependencyHealth("Upstash Redis", "healthy", latency)
        logger.info(`[STARTUP] ✅ Upstash Redis validated successfully (${latency}ms)`)
      } else {
        throw new Error("PING response was not PONG")
      }
    } catch (err: any) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Upstash Redis", "unhealthy", latency, String(err))
      logger.warn(`[STARTUP] ⚠️  Upstash Redis validation failed: ${err.message}`)
      // Don't throw since it's an optional fallback
    } finally {
      if (client) {
        await client.disconnect().catch(() => {})
      }
    }
  },
  validate: async () => {
    // Validation is done in init for this dependency
    return true 
  },
}
