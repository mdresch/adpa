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

  static async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  static async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await kv.incr(key);
    if (current === 1) {
      await kv.expire(key, window);
    }
    return current <= limit;
  }
}