/**
 * AI Cache Service
 * Caches AI responses to reduce API calls and costs
 * Uses Redis with content-based hashing for cache keys
 */

import { createHash } from 'crypto'
import { redis } from '../database/redis'
import { logger } from '../utils/logger'

export class AICacheService {
  private readonly DEFAULT_TTL = 60 * 60 * 24 * 7 // 7 days (extractions are stable)
  private readonly CACHE_PREFIX = 'ai:extraction:'

  /**
   * Generate cache key based on content hash and entity type
   */
  private generateCacheKey(
    projectId: string,
    documentContent: string,
    entityType: string,
    aiProvider?: string,
    aiModel?: string
  ): string {
    // Ensure documentContent is a string (handle undefined/null)
    const safeContent = documentContent || ''

    // Hash the document content (same documents = same hash)
    const contentHash = createHash('sha256')
      .update(safeContent)
      .digest('hex')
      .substring(0, 16) // First 16 chars for brevity

    // Include provider/model in key to avoid mixing different provider responses
    const providerKey = aiProvider ? `${aiProvider}:${aiModel || 'default'}` : 'default'

    return `${this.CACHE_PREFIX}${projectId}:${contentHash}:${entityType}:${providerKey}`
  }

  /**
   * Get cached AI response
   */
  async get(
    projectId: string,
    documentContent: string,
    entityType: string,
    aiProvider?: string,
    aiModel?: string,
    correlationId?: string
  ): Promise<any[] | null> {
    try {
      // Validate inputs
      if (!projectId || !entityType) {
        logger.debug('[AI-CACHE] Invalid cache parameters, skipping cache', { projectId, entityType })
        return null
      }

      const cacheKey = this.generateCacheKey(projectId, documentContent || '', entityType, aiProvider, aiModel)

      const cached = await redis.get(cacheKey)

      if (cached) {
        const data = JSON.parse(cached)
        logger.info(`[AI-CACHE] ✅ Cache HIT for ${entityType}`, {
          projectId,
          correlationId,
          entityType,
          cachedCount: data.length,
          cacheKey: cacheKey.substring(0, 50) + '...'
        })
        return data
      }

      logger.debug(`[AI-CACHE] ❌ Cache MISS for ${entityType}`, { projectId, entityType, correlationId })
      return null
    } catch (error: any) {
      logger.warn('[AI-CACHE] Cache read error, proceeding without cache', {
        error: error.message,
        entityType
      })
      return null
    }
  }

  /**
   * Set AI response in cache
   */
  async set(
    projectId: string,
    documentContent: string,
    entityType: string,
    entities: any[],
    aiProvider?: string,
    aiModel?: string,
    correlationId?: string,
    ttl?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(projectId, documentContent, entityType, aiProvider, aiModel)

      await redis.setex(
        cacheKey,
        ttl || this.DEFAULT_TTL,
        JSON.stringify(entities)
      )

      logger.info(`[AI-CACHE] 💾 Cached ${entities.length} ${entityType}`, {
        projectId,
        correlationId,
        entityType,
        ttl: ttl || this.DEFAULT_TTL,
        cacheKey: cacheKey.substring(0, 50) + '...'
      })
    } catch (error: any) {
      logger.warn('[AI-CACHE] Cache write error, continuing without caching', {
        error: error.message,
        entityType,
        correlationId
      })
      // Don't throw - caching is optional optimization
    }
  }

  /**
   * Invalidate cache for a project (when documents change)
   */
  async invalidateProject(projectId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}${projectId}:*`
      const keys = await redis.keys(pattern)

      if (keys.length > 0) {
        await redis.del(...keys)
        logger.info(`[AI-CACHE] 🗑️ Invalidated ${keys.length} cache entries`, { projectId })
      }
    } catch (error: any) {
      logger.warn('[AI-CACHE] Cache invalidation error', {
        error: error.message,
        projectId
      })
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(projectId: string): Promise<{
    totalCached: number
    cacheKeys: string[]
  }> {
    try {
      const pattern = `${this.CACHE_PREFIX}${projectId}:*`
      const keys = await redis.keys(pattern)

      return {
        totalCached: keys.length,
        cacheKeys: keys
      }
    } catch (error: any) {
      logger.warn('[AI-CACHE] Failed to get stats', { error: error.message })
      return { totalCached: 0, cacheKeys: [] }
    }
  }

  /**
   * Warm cache for a project (pre-populate before extraction)
   */
  async warmCache(
    projectId: string,
    documentContent: string,
    entityTypes: string[],
    aiProvider?: string,
    aiModel?: string
  ): Promise<void> {
    logger.info('[AI-CACHE] 🔥 Warming cache for project', {
      projectId,
      entityTypes: entityTypes.length,
      provider: aiProvider
    })

    // Cache keys are generated, actual data comes from extraction
    // This is useful for checking what's already cached
    const stats = await this.getStats(projectId)
    logger.info(`[AI-CACHE] Current cache: ${stats.totalCached} entries`, { projectId })
  }
}

export const aiCacheService = new AICacheService()

