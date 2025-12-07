/**
 * Queue Service Dependencies
 * Phase 5: Add Abstraction Layers and Dependency Injection
 * 
 * Defines the dependencies required by the queue service and job processors.
 * This allows for dependency injection and easier testing.
 */

import type { Pool } from 'pg'
import type { Server as SocketIOServer } from 'socket.io'
import type { Logger } from 'winston'

/**
 * Database interface (abstraction over pg.Pool)
 */
export interface IDatabase {
  query(text: string, params?: any[]): Promise<any>
  connect(): Promise<any>
  end(): Promise<void>
}

/**
 * WebSocket Server interface (abstraction over Socket.IO)
 */
export interface IWebSocketServer {
  emit(event: string, ...args: any[]): boolean
  to(room: string): {
    emit(event: string, ...args: any[]): boolean
  }
  on(event: string, handler: (...args: any[]) => void): void
  off(event: string, handler: (...args: any[]) => void): void
}

/**
 * Cache interface (abstraction over Redis cache)
 */
export interface ICache {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

/**
 * AI Service interface (abstraction over AI service)
 */
export interface IAIService {
  generateText(params: any): Promise<any>
  [key: string]: any // Allow for other methods
}

/**
 * Logger interface (abstraction over Winston)
 */
export interface ILogger {
  info(message: string, meta?: any): void
  error(message: string, meta?: any): void
  warn(message: string, meta?: any): void
  debug(message: string, meta?: any): void
}

/**
 * Queue Service Dependencies
 * 
 * All dependencies required by the queue service and job processors.
 * This allows for dependency injection and easier testing.
 */
export interface QueueServiceDependencies {
  database: IDatabase
  websocket: IWebSocketServer
  cache: ICache
  aiService: IAIService
  contextAwareAIService?: IAIService
  logger: ILogger
  documentPurposeService?: any
  templateAnalyticsService?: any
}

/**
 * Adapter for pg.Pool to IDatabase
 */
export class PoolDatabaseAdapter implements IDatabase {
  constructor(private pool: Pool) {}

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params)
  }

  async connect(): Promise<any> {
    return this.pool.connect()
  }

  async end(): Promise<void> {
    return this.pool.end()
  }
}

/**
 * Adapter for Socket.IO Server to IWebSocketServer
 */
export class SocketIOWebSocketAdapter implements IWebSocketServer {
  constructor(private io: SocketIOServer) {}

  emit(event: string, ...args: any[]): boolean {
    return this.io.emit(event, ...args)
  }

  to(room: string): {
    emit(event: string, ...args: any[]): boolean
  } {
    return this.io.to(room)
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this.io.on(event, handler)
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.io.off(event, handler)
  }
}

/**
 * Adapter for Redis cache to ICache
 */
export class RedisCacheAdapter implements ICache {
  constructor(private cache: any) {}

  async get(key: string): Promise<string | null> {
    return this.cache.get(key)
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cache.set(key, value, 'EX', ttl)
    } else {
      await this.cache.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.cache.exists(key)
    return result === 1
  }
}

/**
 * Adapter for Winston logger to ILogger
 */
export class WinstonLoggerAdapter implements ILogger {
  constructor(private logger: Logger) {}

  info(message: string, meta?: any): void {
    this.logger.info(message, meta)
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta)
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta)
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta)
  }
}

