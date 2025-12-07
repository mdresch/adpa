/**
 * Performance Monitor Utility
 * Phase 5: Performance Monitoring
 * 
 * Tracks and reports performance metrics for key operations.
 */

import { logger } from './logger'

interface PerformanceStats {
  count: number
  avg: string
  min: string
  max: string
  p95: string
  p99: string
  total: string
}

export class PerformanceMonitor {
  private static timings: Map<string, number[]> = new Map()
  private static cacheStats: Map<string, { hits: number; misses: number }> = new Map()

  /**
   * Start timing an operation
   * @param label - Unique label for this operation
   * @returns Function to call when operation completes
   */
  static start(label: string): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      const timings = this.timings.get(label) || []
      timings.push(duration)
      this.timings.set(label, timings)

      // Log every 100th call to avoid log spam
      if (timings.length % 100 === 0) {
        const stats = this.getStats(label)
        if (stats) {
          logger.info('Performance metrics', {
            label,
            ...stats,
          })
        }
      }
    }
  }

  /**
   * Get performance statistics for a label
   */
  static getStats(label: string): PerformanceStats | null {
    const timings = this.timings.get(label) || []
    if (timings.length === 0) return null

    const sorted = [...timings].sort((a, b) => a - b)
    const sum = timings.reduce((a, b) => a + b, 0)
    const avg = sum / timings.length
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    return {
      count: timings.length,
      avg: `${avg.toFixed(2)}ms`,
      min: `${min}ms`,
      max: `${max}ms`,
      p95: `${p95}ms`,
      p99: `${p99}ms`,
      total: `${sum}ms`,
    }
  }

  /**
   * Get all performance statistics
   */
  static getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {}
    for (const label of this.timings.keys()) {
      const labelStats = this.getStats(label)
      if (labelStats) {
        stats[label] = labelStats
      }
    }
    return stats
  }

  /**
   * Record a cache hit
   */
  static recordCacheHit(label: string): void {
    const stats = this.cacheStats.get(label) || { hits: 0, misses: 0 }
    stats.hits++
    this.cacheStats.set(label, stats)
  }

  /**
   * Record a cache miss
   */
  static recordCacheMiss(label: string): void {
    const stats = this.cacheStats.get(label) || { hits: 0, misses: 0 }
    stats.misses++
    this.cacheStats.set(label, stats)
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(label: string): { hits: number; misses: number; hitRate: string } | null {
    const stats = this.cacheStats.get(label)
    if (!stats || (stats.hits === 0 && stats.misses === 0)) return null

    const total = stats.hits + stats.misses
    const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(2) : '0.00'

    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${hitRate}%`,
    }
  }

  /**
   * Get all cache statistics
   */
  static getAllCacheStats(): Record<string, { hits: number; misses: number; hitRate: string }> {
    const stats: Record<string, { hits: number; misses: number; hitRate: string }> = {}
    for (const label of this.cacheStats.keys()) {
      const labelStats = this.getCacheStats(label)
      if (labelStats) {
        stats[label] = labelStats
      }
    }
    return stats
  }

  /**
   * Reset all statistics
   */
  static reset(): void {
    this.timings.clear()
    this.cacheStats.clear()
  }

  /**
   * Reset statistics for a specific label
   */
  static resetLabel(label: string): void {
    this.timings.delete(label)
    this.cacheStats.delete(label)
  }

  /**
   * Log performance summary
   */
  static logSummary(): void {
    const perfStats = this.getAllStats()
    const cacheStats = this.getAllCacheStats()

    if (Object.keys(perfStats).length > 0) {
      logger.info('=== Performance Summary ===', { performance: perfStats })
    }

    if (Object.keys(cacheStats).length > 0) {
      logger.info('=== Cache Summary ===', { cache: cacheStats })
    }
  }
}

