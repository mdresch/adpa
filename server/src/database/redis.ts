/**
 * Redis Connection Module
 * Uses ioredis for consistency with Bull queue
 */

import Redis from 'ioredis'
import { logger } from '../utils/logger'

let redisClient: Redis | null = null

/**
 * Get or create Redis client
 */
export function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    logger.info('[REDIS] Creating new Redis client', {
      url: redisUrl.replace(/:[^:@]+@/, ':***@') // Hide password in logs
    })
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })
    
    redisClient.on('connect', () => {
      logger.info('[REDIS] ✅ Connected')
    })
    
    redisClient.on('ready', () => {
      logger.info('[REDIS] ✅ Ready')
    })
    
    redisClient.on('error', (error) => {
      logger.error('[REDIS] ❌ Error:', error.message)
    })
    
    redisClient.on('close', () => {
      logger.warn('[REDIS] ⚠️  Connection closed')
    })
    
    redisClient.on('reconnecting', () => {
      logger.info('[REDIS] 🔄 Reconnecting...')
    })
  }
  
  return redisClient
}

/**
 * Export singleton instance
 */
export const redis = getRedis()

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

