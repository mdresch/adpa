/**
 * Queue Service Factory
 * Phase 5: Add Abstraction Layers and Dependency Injection
 * 
 * Factory function to create QueueService with all dependencies wired up.
 * This provides a clean way to instantiate the service with real implementations.
 */

import { QueueService } from './QueueService'
import { BullQueueAdapter } from './BullQueueAdapter'
import type { QueueServiceDependencies } from './QueueDependencies'
import {
  PoolDatabaseAdapter,
  SocketIOWebSocketAdapter,
  RedisCacheAdapter,
  WinstonLoggerAdapter,
} from './QueueDependencies'
import type Bull from 'bull'
import type { Pool } from 'pg'
import type { Server as SocketIOServer } from 'socket.io'
import type { Logger } from 'winston'
import type { QueueName } from '../types'

// Import logger utilities with correct path
const { logger } = require('../../../utils/logger')

/**
 * Create QueueService with real dependencies
 * 
 * This factory function wires up all the real implementations
 * (Bull queues, PostgreSQL pool, Socket.IO, etc.) with their adapters.
 */
export function createQueueService(
  queues: Map<QueueName, Bull.Queue>,
  pool: Pool,
  io: SocketIOServer,
  cache: any,
  aiService: any,
  contextAwareAIService?: any,
  logger?: Logger,
  documentPurposeService?: any,
  templateAnalyticsService?: any
): QueueService {
  // Import logger utilities with fallback
  let effectiveLogger;
  try {
    effectiveLogger = require('../../../utils/logger').logger;
  } catch (error) {
    console.warn('⚠️ Logger module import failed, using console fallback:', error.message);
    // Fallback to console logger if the module import fails
    effectiveLogger = {
      info: console.info,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    };
  }

  // Create adapters
  const databaseAdapter = new PoolDatabaseAdapter(pool)
  const websocketAdapter = new SocketIOWebSocketAdapter(io)
  const cacheAdapter = new RedisCacheAdapter(cache)
  const loggerAdapter = new WinstonLoggerAdapter(effectiveLogger)

  // Create dependencies object
  const dependencies: QueueServiceDependencies = {
    database: databaseAdapter,
    websocket: websocketAdapter,
    cache: cacheAdapter,
    aiService,
    contextAwareAIService,
    logger: loggerAdapter,
    documentPurposeService,
    templateAnalyticsService,
  }

  // Create queue service
  const queueService = new QueueService(dependencies)

  // Register all queues with adapters
  for (const [queueName, bullQueue] of queues) {
    const adapter = new BullQueueAdapter(bullQueue)
    queueService.registerQueue(queueName, adapter)
  }

  return queueService
}

/**
 * Create QueueService with mock dependencies (for testing)
 */
export function createMockQueueService(
  mockDependencies: Partial<QueueServiceDependencies>
): QueueService {
  // Create minimal mock dependencies
  const dependencies: QueueServiceDependencies = {
    database: mockDependencies.database || {
      query: async () => ({ rows: [] }),
      connect: async () => ({}),
      end: async () => { },
    },
    websocket: mockDependencies.websocket || {
      emit: () => true,
      to: () => ({ emit: () => true }),
      on: () => { },
      off: () => { },
    },
    cache: mockDependencies.cache || {
      get: async () => null,
      set: async () => { },
      del: async () => { },
      exists: async () => false,
    },
    aiService: mockDependencies.aiService || {},
    contextAwareAIService: mockDependencies.contextAwareAIService,
    logger: mockDependencies.logger || {
      info: () => { },
      error: () => { },
      warn: () => { },
      debug: () => { },
    },
    documentPurposeService: mockDependencies.documentPurposeService,
    templateAnalyticsService: mockDependencies.templateAnalyticsService,
  }

  return new QueueService(dependencies)
}

