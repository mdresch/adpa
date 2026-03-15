const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables for the test process
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const adminDbUrl = 'postgresql://test_user:test_pass@127.0.0.1:5433/postgres';
const templateDbName = 'test_template';
const workerId = process.env.JEST_WORKER_ID || '1';
const testDbName = `test_db_worker_${workerId}`;
const testDbUrl = `postgresql://test_user:test_pass@127.0.0.1:5433/${testDbName}`;

// IMPORTANT: Set DATABASE_URL BEFORE any app code is imported
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';
process.env.DB_MAX_RETRIES_PER_METHOD = '5'; // Increase safety for local Windows Docker

// Mock Langfuse to avoid dynamic import / experimental-vm-modules issues
jest.mock('langfuse', () => ({
  Langfuse: jest.fn().mockImplementation(() => ({
    trace: jest.fn().mockReturnValue({
      generation: jest.fn().mockReturnValue({
        end: jest.fn()
      }),
      end: jest.fn()
    }),
    flushAsync: jest.fn().mockResolvedValue(true)
  }))
}));

// Mock RabbitQueueAdapter to prevent REAL RabbitMQ connections during tests
jest.mock('../../src/services/jobs/queue/RabbitQueueAdapter', () => {
  return {
    RabbitQueueAdapter: jest.fn().mockImplementation((opts) => ({
      process: jest.fn(),
      add: jest.fn().mockResolvedValue({ id: 'mock-job-' + opts.queueName }),
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
      getName: () => opts.queueName
    })),
    createRabbitConnection: jest.fn().mockReturnValue({
      createChannel: jest.fn(),
      on: jest.fn(),
      close: jest.fn()
    })
  };
});

// Mock InfluxDB to avoid connection errors
jest.mock('../../src/services/influxdbService', () => ({
  __esModule: true,
  default: {
    writePoint: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined)
  },
  InfluxDBService: {
    writePoint: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock Redis to prevent real connections
jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    emit: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    status: 'ready'
  }));
  return MockRedis;
});

// Mock OpenAIConnector and other AI providers to prevent real timers/calls
jest.mock('../../src/modules/ai/openai', () => ({
  OpenAIConnector: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({ text: 'Mock AI Response' }),
    startRateLimitResetTimer: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock documenso/pdf-sign to prevent CustomGC handle leaks
jest.mock('@documenso/pdf-sign', () => ({
  signWithGoogleCloudHSM: jest.fn().mockResolvedValue(Buffer.from('mock-signed-pdf')),
  addSigningPlaceholder: jest.fn().mockResolvedValue(Buffer.from('mock-placeholder-pdf')),
  updateSigningPlaceholder: jest.fn().mockResolvedValue(Buffer.from('mock-updated-pdf'))
}));

// Shared state for hooks
let internalPool;
let connectDatabase;
let setInternalPool;
let getInternalPool;
let realPool;
let mockAIProvider;
let mockQueues;

beforeAll(async () => {
  const connectWithFallbacks = async () => {
    const hosts = ['127.0.0.1', 'localhost'];
    let lastErr;
    
    for (let attempt = 1; attempt <= 10; attempt++) {
      for (const host of hosts) {
        const url = `postgresql://test_user:test_pass@${host}:5433/postgres`;
        const pool = new Pool({ 
          connectionString: url, 
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 1000
        });
        
        try {
          const client = await pool.connect();
          client.release();
          return pool;
        } catch (err) {
          lastErr = err;
          await pool.end().catch(() => {});
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw lastErr;
  };

  let retries = 10;
  let created = false;
  while (retries > 0 && !created) {
    let adminPool;
    try {
      adminPool = await connectWithFallbacks();
      
      // Force disconnect other users before dropping
      await adminPool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid();
      `, [testDbName]).catch(() => {});

      await adminPool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await adminPool.query(`CREATE DATABASE ${testDbName} TEMPLATE ${templateDbName}`);
      created = true;
    } catch (err) {
      retries--;
      if (retries === 0) {
        if (adminPool) await adminPool.end().catch(() => {});
        throw err;
      }
      if (adminPool) await adminPool.end().catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    } finally {
      if (adminPool) await adminPool.end().catch(() => {});
    }
  }


  // 2. NOW it is safe to require modules that might have DB side-effects
  const connection = require('../../src/database/connection');
  internalPool = connection.pool;
  connectDatabase = connection.connectDatabase;
  setInternalPool = connection.setInternalPool;
  getInternalPool = connection.getInternalPool;

  const { aiProviderService } = require('../../src/services/aiProviderService');
  const { MockAIProvider } = require('../doubles/MockAIProvider');
  const { setQueueService } = require('../../src/services/queueService');
  const { createQueueService } = require('../../src/services/jobs/queue/QueueServiceFactory');
  const { MockQueue } = require('../doubles/MockQueue');
  const { io } = require('../../src/socket');
  const { cache } = require('../../src/utils/redis');
  const { aiService } = require('../../src/services/aiService');
  const { ContextAwareAIService } = require('../../src/modules/context/integration');

  mockAIProvider = new MockAIProvider('openai', 'openai');
  mockQueues = new Map();

  // Initialize app database connection
  await connectDatabase();
  realPool = getInternalPool();

  // Inject mocks
  aiProviderService.clearProviders();
  aiProviderService.setProvider('openai', mockAIProvider);

  const queueNames = [
    'ai-processing', 'document-processing', 'pipeline-processing',
    'baseline-processing', 'process-flow-processing', 'document-regeneration',
    'quality-audit', 'project-data-extraction', 'confluence-publishing',
    'gkg-sync'
  ];

  mockQueues.clear();
  queueNames.forEach(name => mockQueues.set(name, new MockQueue(name)));

  const mockQueueService = createQueueService(
    mockQueues, internalPool, io, cache, aiService, ContextAwareAIService
  );
  setQueueService(mockQueueService);
});

let transactionClient;
let originalRelease;

beforeEach(async () => {
  if (!internalPool) return;
  transactionClient = await internalPool.connect();
  await transactionClient.query('BEGIN');
  setInternalPool(transactionClient); // Pin global pool to this transaction client
  
  // Ensure app uses this client
  const { app } = require('../../src/server');
  app.locals.pool = transactionClient;
  
  originalRelease = transactionClient.release;
  transactionClient.release = jest.fn();
});

afterEach(async () => {
  try {
    if (transactionClient) await transactionClient.query('ROLLBACK');
  } catch (err) { 
    // console.error(`[Worker ${workerId}] ❌ afterEach Rollback Error: ${err.message}`);
  } finally {
    if (setInternalPool && realPool) {
        setInternalPool(realPool); // Reset global pool back to the real pool
    }
    if (transactionClient && originalRelease) {
      transactionClient.release = originalRelease;
      transactionClient.release();
    }
  }
});

afterAll(async () => {
  // Close Redis if it was somehow initialized
  try {
    const { redisClient } = require('../../src/database/redis');
    if (redisClient) {
        await redisClient.quit().catch(() => {});
    }
  } catch (e) {}

  // Close the main pool
  if (internalPool) {
      await internalPool.end().catch(() => {});
  }
});


// Getter helpers for tests that need access to mocks
const getMocks = () => ({ mockAIProvider, mockQueues });

module.exports = { getMocks };
