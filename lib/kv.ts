import Redis from 'ioredis';

// Use CHAT_REDIS_URL if available, otherwise fallback to REDIS_URL or ADPA_KV_URL
const redisUrl = process.env.CHAT_REDIS_URL || process.env.REDIS_URL || process.env.ADPA_KV_URL;

let redis: Redis | null = null;

if (redisUrl) {
  console.log('[KV-REDIS] Initializing Redis client for Chat/Search performance');
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('error', (err) => {
    console.error('[KV-REDIS] ❌ Redis error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[KV-REDIS] ✅ Connected to Redis');
  });
} else {
  console.warn('[KV-REDIS] ⚠️ CHAT_REDIS_URL, REDIS_URL, or ADPA_KV_URL not set. KV operations will be disabled.');
}

export class CacheService {
  /**
   * Basic KV get operation
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      const value = await redis.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error('[KV-REDIS] get error:', error);
      return null;
    }
  }

  /**
   * Basic KV set operation with optional TTL
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!redis) return;
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await redis.set(key, stringValue, 'EX', ttl);
      } else {
        await redis.set(key, stringValue);
      }
    } catch (error) {
      console.error('[KV-REDIS] set error:', error);
    }
  }

  /**
   * Basic KV delete operation
   */
  static async del(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error('[KV-REDIS] delete error:', error);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  static async delByPattern(pattern: string): Promise<void> {
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('[KV-REDIS] delByPattern error:', error);
    }
  }

  /**
   * Session management: set session with expiry
   */
  static async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  /**
   * Session management: get session
   */
  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  /**
   * Rate limiting: sliding window
   */
  static async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    if (!redis) return true; // Fail open if Redis is down

    const now = Math.floor(Date.now() / 1000);
    const windowKey = `rate:${key}:${now - (now % window)}`;

    try {
      const multi = redis.multi();
      multi.incr(windowKey);
      multi.expire(windowKey, window + 5); // Add buffer to TTL

      const results = await multi.exec();
      const count = results?.[0]?.[1] as number;

      return count <= limit;
    } catch (error) {
      console.error('[KV-REDIS] Rate limit error:', error);
      return true; // Fail open
    }
  }
}

// Export the client instance for advanced usage if needed
export { redis as kv };
