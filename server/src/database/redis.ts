/**
 * Redis Connection Module
 * Uses ioredis for consistency with Bull queue
 */

import Redis from 'ioredis'
import { logger } from '../utils/logger'

let redisClient: Redis | null = null

/**
 * Get or create Redis client with fallback logic
 */
export async function getRedisClient(): Promise<Redis> {
  if (redisClient) return redisClient

  const redisUrls = [
    process.env.REDIS_URL,
    process.env.UPSTASH_REDIS_URL,
    'redis://localhost:6379'
  ].filter(Boolean) as string[]

  for (const url of redisUrls) {
    try {
      const isUpstash = url.includes('upstash.io')
      const isSecure = url.startsWith('rediss://')
      
      logger.info(`[REDIS] Attempting connection via ${isUpstash ? 'Upstash' : 'Primary/Local'}: ${url.replace(/:[^:@]+@/, ':***@')}`)

      const client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 3) return null // Stop retrying this URL after 3 failures
          return Math.min(times * 100, 2000)
        },
        reconnectOnError: (err) => {
          logger.warn(`[REDIS] Reconnect on error: ${err.message}`)
          return true
        },
        // Secure options for Upstash/TLS
        tls: isSecure ? { rejectUnauthorized: false } : undefined
      })

      // Wait for connection to be ready or fail
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          client.off('error', onError)
          resolve()
        }
        const onError = (err: any) => {
          client.off('ready', onReady)
          reject(err)
        }
        client.once('ready', onReady)
        client.once('error', onError)
      })

      logger.info('[REDIS] ✅ Connection established')

      client.on('error', (error) => {
        logger.error({
          message: error.message,
          code: (error as any).code,
          stack: error.stack
        }, '[REDIS] ❌ Client Error:')
      })

      client.on('close', () => {
        logger.warn('[REDIS] ⚠️  Connection closed')
      })

      redisClient = client
      return redisClient
    } catch (err: any) {
      logger.warn(`[REDIS] Failed to connect to ${url.includes('upstash.io') ? 'Upstash' : 'Primary/Local'}: ${err.message}`)
      continue // Try next URL
    }
  }

  throw new Error('[REDIS] Fatal: All Redis connection methods failed')
}

/**
 * Get existing client or initialize (synchronous wrapper for compatibility)
 */
export function getRedis(): Redis {
  if (!redisClient) {
    // Return a proxy that initializes on first call if needed, 
    // but for now we just trigger the async init
    getRedisClient().catch(err => {
      logger.error('[REDIS] Background initialization failed:', err.message)
    })
    
    // Create a temporary client pointing to localhost as ultimate panic fallback
    // to avoid returning null to synchronous callers immediately
    const fallbackClient = new Redis('redis://localhost:6379', { lazyConnect: true })
    fallbackClient.on('error', (err) => {
      logger.debug(`[REDIS] Fallback client connection connection deferred or offline: ${err.message}`)
    })
    return fallbackClient
  }
  return redisClient
}

/**
 * Export singleton instance (lazily initialized in tests to avoid connection hangs)
 */
export const redis = process.env.NODE_ENV === 'test' 
  ? (null as unknown as Redis) 
  : getRedis()

/**
 * Disconnect Redis (for graceful shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    logger.info('[REDIS] Disconnected')
  }
}

