/**
 * Resolution Cache
 * Caches variable resolution results for performance
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type { TemplateVariable, VariableResolution } from '../types'

export class ResolutionCache {
  private cache: Map<string, VariableResolution> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly defaultTTL = 3600000 // 1 hour in milliseconds

  async get(variable: TemplateVariable): Promise<VariableResolution | null> {
    try {
      const cacheKey = this.generateCacheKey(variable)

      // Check memory cache first
      if (this.cache.has(cacheKey)) {
        const expiry = this.cacheExpiry.get(cacheKey) || 0
        if (Date.now() < expiry) {
          logger.debug('Cache hit (memory)', { cacheKey })
          return this.cache.get(cacheKey)!
        } else {
          // Expired, remove from memory cache
          this.cache.delete(cacheKey)
          this.cacheExpiry.delete(cacheKey)
        }
      }

      // Check database cache
      const dbResult = await this.getFromDatabase(cacheKey)
      if (dbResult) {
        // Store in memory cache
        this.cache.set(cacheKey, dbResult)
        this.cacheExpiry.set(cacheKey, Date.now() + this.defaultTTL)
        
        logger.debug('Cache hit (database)', { cacheKey })
        return dbResult
      }

      logger.debug('Cache miss', { cacheKey })
      return null

    } catch (error) {
      logger.error('Failed to get from cache', {
        variableId: variable.variable_id,
        error: error.message
      })
      return null
    }
  }

  async set(variable: TemplateVariable, resolution: VariableResolution): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(variable)

      // Store in memory cache
      this.cache.set(cacheKey, resolution)
      this.cacheExpiry.set(cacheKey, Date.now() + this.defaultTTL)

      // Store in database cache
      await this.setInDatabase(cacheKey, resolution)

      logger.debug('Resolution cached', { cacheKey })

    } catch (error) {
      logger.error('Failed to cache resolution', {
        variableId: variable.variable_id,
        error: error.message
      })
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // Clear specific pattern from memory cache
        const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern))
        for (const key of keysToDelete) {
          this.cache.delete(key)
          this.cacheExpiry.delete(key)
        }

        // Clear from database cache
        await this.clearFromDatabase(pattern)
      } else {
        // Clear all from memory cache
        this.cache.clear()
        this.cacheExpiry.clear()

        // Clear all from database cache
        await this.clearAllFromDatabase()
      }

      logger.info('Cache cleared', { pattern: pattern || 'all' })

    } catch (error) {
      logger.error('Failed to clear cache', {
        pattern,
        error: error.message
      })
    }
  }

  private generateCacheKey(variable: TemplateVariable): string {
    // Create a unique cache key based on variable characteristics
    const keyComponents = [
      variable.variable_id,
      variable.variable_name,
      variable.variable_type,
      JSON.stringify(variable.variable_definition),
      JSON.stringify(variable.resolution_hints)
    ]
    
    return keyComponents.join('|')
  }

  private async getFromDatabase(cacheKey: string): Promise<VariableResolution | null> {
    try {
      const result = await pool.query(
        'SELECT resolution_data FROM variable_resolution_cache WHERE cache_key = $1 AND expires_at > NOW()',
        [cacheKey]
      )

      if (result.rows.length > 0) {
        return JSON.parse(result.rows[0].resolution_data)
      }

      return null

    } catch (error) {
      logger.error('Failed to get from database cache', {
        cacheKey,
        error: error.message
      })
      return null
    }
  }

  private async setInDatabase(cacheKey: string, resolution: VariableResolution): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO variable_resolution_cache (cache_key, resolution_data, expires_at, created_at)
        VALUES ($1, $2, NOW() + INTERVAL '1 hour', NOW())
        ON CONFLICT (cache_key) 
        DO UPDATE SET 
          resolution_data = EXCLUDED.resolution_data,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
        `,
        [cacheKey, JSON.stringify(resolution)]
      )

    } catch (error) {
      logger.error('Failed to set in database cache', {
        cacheKey,
        error: error.message
      })
    }
  }

  private async clearFromDatabase(pattern: string): Promise<void> {
    try {
      await pool.query(
        'DELETE FROM variable_resolution_cache WHERE cache_key LIKE $1',
        [`%${pattern}%`]
      )

    } catch (error) {
      logger.error('Failed to clear from database cache', {
        pattern,
        error: error.message
      })
    }
  }

  private async clearAllFromDatabase(): Promise<void> {
    try {
      await pool.query('DELETE FROM variable_resolution_cache')

    } catch (error) {
      logger.error('Failed to clear all from database cache', {
        error: error.message
      })
    }
  }
}

