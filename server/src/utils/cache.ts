// Simple in-memory cache with TTL; can be swapped for Redis-backed implementation
// Supports stale-while-revalidate pattern

interface Entry<T> { 
  value: T
  expires: number
  staleAt: number // When data becomes stale (but still usable)
  refreshing?: boolean // Flag to prevent concurrent refreshes
}

const store = new Map<string, Entry<any>>()

export interface CacheResult<T> {
  value: T
  isStale: boolean
}

/**
 * Get cached value. Returns undefined if not found or expired.
 * For stale-while-revalidate, use getCacheWithStale() instead.
 */
export function getCache<T>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expires) {
    store.delete(key)
    return undefined
  }
  return e.value as T
}

/**
 * Get cached value with stale-while-revalidate support.
 * Returns the value even if stale, along with a flag indicating staleness.
 * If stale, caller should trigger background refresh.
 */
export function getCacheWithStale<T>(key: string): CacheResult<T> | undefined {
  const e = store.get(key)
  if (!e) return undefined
  
  const now = Date.now()
  const isStale = now > e.staleAt
  const isExpired = now > e.expires
  
  if (isExpired) {
    // Fully expired, remove from cache
    store.delete(key)
    return undefined
  }
  
  return {
    value: e.value as T,
    isStale
  }
}

/**
 * Set cache with TTL. Also sets staleAt to 80% of TTL for stale-while-revalidate.
 */
export function setCache<T>(key: string, value: T, ttlSeconds: number) {
  const now = Date.now()
  const expires = now + ttlSeconds * 1000
  const staleAt = now + (ttlSeconds * 0.8 * 1000) // Stale at 80% of TTL
  
  store.set(key, { 
    value, 
    expires,
    staleAt,
    refreshing: false
  })
}

/**
 * Mark a cache entry as being refreshed to prevent concurrent refreshes.
 */
export function markRefreshing(key: string): boolean {
  const e = store.get(key)
  if (!e || e.refreshing) return false
  e.refreshing = true
  return true
}

/**
 * Clear the refreshing flag after refresh completes.
 */
export function clearRefreshing(key: string) {
  const e = store.get(key)
  if (e) {
    e.refreshing = false
  }
}

/**
 * Generate a cache key from parts.
 */
export function makeKey(parts: (string | number | undefined | null)[]) {
  return parts.filter(Boolean).join(':')
}

/**
 * Clear a specific cache entry.
 */
export function clearCache(key: string) {
  store.delete(key)
}

/**
 * Clear all cache entries (useful for testing).
 */
export function clearAllCache() {
  store.clear()
}
