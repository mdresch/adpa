import { kv } from '@vercel/kv';

// Cache utilities
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      return await kv.get<T>(key);
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await kv.setex(key, ttl, JSON.stringify(value));
      } else {
        await kv.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('KV set error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await kv.del(key);
    } catch (error) {
      console.error('KV del error:', error);
    }
  }

  // Session management
  static async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  // Pattern-based key deletion
  static async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await kv.keys(pattern);
      if (keys.length > 0) {
        await kv.del(...keys);
      }
    } catch (error) {
      console.error('KV delByPattern error:', error);
    }
  }
}