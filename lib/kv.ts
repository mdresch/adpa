/**
 * Vercel KV Utility Functions
 * 
 * This file provides utility functions for interacting with Vercel KV,
 * a Redis-compatible key-value store that's fully managed by Vercel.
 */

import { kv } from '@vercel/kv';

/**
 * CacheService provides utility methods for interacting with Vercel KV
 */
export class CacheService {
  /**
   * Retrieves a value from the cache by key
   * @param key The key to retrieve
   * @returns The value associated with the key, or null if not found
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      return await kv.get<T>(key);
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  /**
   * Stores a value in the cache with an optional TTL
   * @param key The key to store
   * @param value The value to store
   * @param ttl Time to live in seconds (optional)
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await kv.set(key, value, { ex: ttl });
      } else {
        await kv.set(key, value);
      }
    } catch (error) {
      console.error('KV set error:', error);
    }
  }

  /**
   * Deletes a key from the cache
   * @param key The key to delete
   */
  static async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('KV del error:', error);
    }
  }

  /**
   * Stores session data in the cache
   * @param sessionId The session ID
   * @param data The session data
   * @param ttl Time to live in seconds (default: 86400 - 24 hours)
   */
  static async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  /**
   * Retrieves session data from the cache
   * @param sessionId The session ID
   * @returns The session data, or null if not found
   */
  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  /**
   * Implements rate limiting functionality
   * @param key The rate limit key (usually includes user ID or IP)
   * @param limit Maximum number of requests allowed in the time window
   * @param window Time window in seconds
   * @returns Boolean indicating if the request should be allowed
   */
  static async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await kv.incr(key);
    if (current === 1) {
      await kv.expire(key, window);
    }
    return current <= limit;
  }
}

/**
 * Direct export of the kv instance for advanced use cases
 */
export { kv };