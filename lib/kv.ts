import { kv } from '@vercel/kv';

export class CacheService {
  // Basic KV get operation
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await kv.get(key);
      return value as T | null;
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  // Basic KV set operation with optional TTL
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


  // Basic KV delete operation
  static async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('KV delete error:', error);
    }
  }

  // Session management: set session with expiry
  static async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    try {
      await kv.set(`session:${sessionId}`, data, { ex: ttl });
    } catch (error) {
      console.error('Session set error:', error);
    }
  }

  // Session management: get session
  static async getSession<T>(sessionId: string): Promise<T | null> {
    try {
      const value = await kv.get(`session:${sessionId}`);
      return value as T | null;
    } catch (error) {
      console.error('Session get error:', error);
      return null;
    }
  }

  // Rate limiting: sliding window
  static async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `rate:${key}:${now - (now % window)}`;
    try {
      const count = (await kv.incr(windowKey)) as number;
      if (count === 1) {
        await kv.expire(windowKey, window);
      }
      return count <= limit;
    } catch (error) {
      console.error('Rate limit error:', error);
      return false;
    }
  }
}
