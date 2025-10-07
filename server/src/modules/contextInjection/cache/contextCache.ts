/**
 * Context Cache
 * Caches context data for performance optimization
 */

import { logger } from '../../../utils/logger'
import type { ContextResult } from '../types'

interface CacheEntry {
  value: ContextResult
  expiresAt: number
  createdAt: number
}

export class ContextCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number = 1000 // Maximum number of cache entries
  private defaultTtl: number = 300 // Default TTL in seconds (5 minutes)

  async get(key: string): Promise<ContextResult | null> {
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        logger.debug('Cache miss', { key })
        return null
      }

      // Check if entry has expired
      if (Date.now() > entry.expiresAt) {
        logger.debug('Cache entry expired', { key })
        this.cache.delete(key)
        return null
      }

      logger.debug('Cache hit', { key })
      return entry.value

    } catch (error) {
      logger.error('Cache get operation failed', { key, error: error.message })
      return null
    }
  }

  async set(key: string, value: ContextResult, ttl?: number): Promise<void> {
    try {
      // Check cache size and evict if necessary
      if (this.cache.size >= this.maxSize) {
        await this.evictOldest()
      }

      const now = Date.now()
      const ttlSeconds = ttl || this.defaultTtl
      const expiresAt = now + (ttlSeconds * 1000)

      const entry: CacheEntry = {
        value,
        expiresAt,
        createdAt: now
      }

      this.cache.set(key, entry)
      
      logger.debug('Cache entry set', { 
        key, 
        ttl_seconds: ttlSeconds,
        expires_at: new Date(expiresAt).toISOString()
      })

    } catch (error) {
      logger.error('Cache set operation failed', { key, error: error.message })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const deleted = this.cache.delete(key)
      logger.debug('Cache entry deleted', { key, was_present: deleted })
    } catch (error) {
      logger.error('Cache delete operation failed', { key, error: error.message })
    }
  }

  async clear(): Promise<void> {
    try {
      const size = this.cache.size
      this.cache.clear()
      logger.info('Cache cleared', { entries_cleared: size })
    } catch (error) {
      logger.error('Cache clear operation failed', { error: error.message })
    }
  }

  async getStats(): Promise<{
    size: number
    maxSize: number
    hitRate: number
    missRate: number
    oldestEntry: Date | null
    newestEntry: Date | null
  }> {
    const entries = Array.from(this.cache.values())
    
    if (entries.length === 0) {
      return {
        size: 0,
        maxSize: this.maxSize,
        hitRate: 0,
        missRate: 0,
        oldestEntry: null,
        newestEntry: null
      }
    }

    const createdDates = entries.map(entry => new Date(entry.createdAt))
    const oldestEntry = new Date(Math.min(...createdDates))
    const newestEntry = new Date(Math.max(...createdDates))

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses to calculate
      missRate: 0, // Would need to track hits/misses to calculate
      oldestEntry,
      newestEntry
    }
  }

  private async evictOldest(): Promise<void> {
    try {
      // Find the oldest entry
      let oldestKey: string | null = null
      let oldestTime = Date.now()

      for (const [key, entry] of this.cache.entries()) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt
          oldestKey = key
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey)
        logger.debug('Evicted oldest cache entry', { key: oldestKey })
      }

    } catch (error) {
      logger.error('Cache eviction failed', { error: error.message })
    }
  }

  async cleanup(): Promise<void> {
    try {
      const now = Date.now()
      let cleanedCount = 0

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cache cleanup completed', { entries_cleaned: cleanedCount })
      }

    } catch (error) {
      logger.error('Cache cleanup failed', { error: error.message })
    }
  }

  // Start periodic cleanup
  startCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Periodic cache cleanup failed', { error: error.message })
      })
    }, intervalMs)

    logger.info('Cache cleanup started', { interval_ms: intervalMs })
  }
}
