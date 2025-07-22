import { kv } from '@vercel/kv';

/**
 * CacheService provides utilities for interacting with Vercel KV (Redis) cache
 * Includes methods for basic operations, session management, and rate limiting
 */
export class CacheService {
  /**
   * Retrieves a value from the cache by key
   * @param key The cache key to retrieve
   * @returns The cached value or null if not found or on error
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
   * Stores a value in the cache with an optional TTL (time to live)
   * @param key The cache key
   * @param value The value to store
   * @param ttl Optional time to live in seconds
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
   * Deletes a value from the cache by key
   * @param key The cache key to delete
   */
  static async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('KV del error:', error);
    }
  }

  /**
   * Stores session data with automatic expiry
   * @param sessionId The session identifier
   * @param data The session data to store
   * @param ttl Time to live in seconds (defaults to 24 hours)
   */
  static async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  /**
   * Retrieves session data by session ID
   * @param sessionId The session identifier
   * @returns The session data or null if not found
   */
  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  /**
   * Implements rate limiting with a sliding window approach
   * @param key The rate limit key (usually includes user identifier or IP)
   * @param limit Maximum number of requests allowed in the time window
   * @param window Time window in seconds
   * @returns Boolean indicating if the request is allowed (true) or rate limited (false)
   */
  static async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    try {
      // Get the current timestamp
      const now = Date.now();
      const windowStart = now - (window * 1000);
      
      // Add the current timestamp to the sorted set
      await kv.zadd(key, { score: now, member: now.toString() });
      
      // Remove timestamps outside the current window
      await kv.zremrangebyscore(key, 0, windowStart);
      
      // Set the key to expire after the window
      await kv.expire(key, window);
      
      // Count the number of requests in the current window
      const count = await kv.zcard(key);
      
      // Return true if under the limit, false if rate limited
      return count <= limit;
    } catch (error) {
      console.error('KV rate limit error:', error);
      // In case of error, allow the request to proceed
      return true;
    }
  }
}