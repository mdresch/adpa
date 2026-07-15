const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.test specifically (not the main .env) -- this is the file that
// carries AZURE_TEST_DB_HOST/USER/PASSWORD, deliberately kept separate from
// the real production DATABASE_URL in .env so this file can never end up
// pointed at production by an env-loading order mistake.
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const dbHost = process.env.AZURE_TEST_DB_HOST;
const dbPort = process.env.AZURE_TEST_DB_PORT || '5432';
const dbUser = process.env.AZURE_TEST_DB_USER;
const dbPassword = process.env.AZURE_TEST_DB_PASSWORD;

if (!dbHost || !dbUser || !dbPassword || dbPassword.startsWith('<FILL_IN')) {
  throw new Error(
    '[INTEGRATION-SETUP] AZURE_TEST_DB_HOST / AZURE_TEST_DB_USER / AZURE_TEST_DB_PASSWORD ' +
    'are not set in server/.env.test.'
  );
}

const templateDbName = 'test_template';
const workerId = process.env.JEST_WORKER_ID || '1';
const testDbName = `test_db_worker_${workerId}`;
const testDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${testDbName}?sslmode=require`;

// Guard rail: these are DROP/CREATE DATABASE target names -- refuse to run
// against anything that isn't clearly a disposable test database.
if (!testDbName.startsWith('test_db_worker_')) {
  throw new Error(`[INTEGRATION-SETUP] Refusing to run against database name "${testDbName}"`);
}

// IMPORTANT: Set DATABASE_URL BEFORE any app code is imported
process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';
process.env.DB_MAX_RETRIES_PER_METHOD = '5';
// codacy-disable-next-line
// Test-only harness talking to the disposable Azure test DB (see testDbUrl above),
// never production -- run-migrations.ts sets this same flag for the same cert-chain reason.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

// Mock @adobe/pdfservices-node-sdk: its own nested uuid@14 dependency ships an
// ESM-only dist-node build ("export { default as MAX } from './max.js'"),
// which throws "Unexpected token 'export'" under Jest's CJS transform the
// moment anything in the require chain (src/server.ts -> documentGenerator ->
// adobePdfService -> adobe-pdf.ts) touches it. src/integrations/adobe-pdf.ts
// only references PDFServicesSDK.* inside function bodies, never at module
// load time, so an empty namespace mock is safe here.
jest.mock('@adobe/pdfservices-node-sdk', () => ({}));

// Mock @paralleldrive/cuid2: also ESM-only ("import ... from './src/index.js'"
// with no CJS build), pulled in transitively via lib/morphic/db/schema.ts once
// src/server.ts's morphic routes are required. Only createId is actually used
// (lib/morphic/db/schema.ts's generateId()); the rest are stubbed for any other
// consumer further down the require chain.
// codacy-disable-next-line
// Math.random() here only fabricates a placeholder string for a mocked ID
// generator in test setup -- never used as a real identifier or for anything
// security-sensitive, so cryptographic strength is irrelevant.
jest.mock('@paralleldrive/cuid2', () => ({
  createId: () => `mock-cuid-${Math.random().toString(36).slice(2)}`,
  init: () => () => `mock-cuid-${Math.random().toString(36).slice(2)}`,
  getConstants: () => ({}),
  isCuid: () => true
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
  // No more localhost/127.0.0.1 fallback pair -- there's exactly one Azure
  // host now, not "maybe docker resolved as localhost, maybe as 127.0.0.1"
  // (the actual source of the old fallback loop). Retries still matter --
  // Azure connections can transiently fail under load -- but there's nothing
  // to fall back between anymore.
  const connectWithRetry = async (dbName = 'postgres') => {
    const url = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=require`;
    let lastErr;

    for (let attempt = 1; attempt <= 10; attempt++) {
      // idleTimeoutMillis is deliberately generous (not e.g. 1000ms), not a
      // localhost-docker-era leftover: the client.connect()/release() below is
      // a connectivity probe, and this pool is then handed back for real use
      // (adminPool.query(...) calls) moments later. A too-short idle timeout
      // destroys that probed connection before the first real query arrives,
      // forcing pg to open a second physical connection to Azure in a hurry --
      // which was observed to hang indefinitely against this server (unlike
      // the first, unhurried connection, which always succeeded), stalling
      // the whole test run on a pool that neither resolves nor rejects.
      const pool = new Pool({
        connectionString: url,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 30000
      });

      try {
        const client = await pool.connect();
        client.release();
        return pool;
      } catch (err) {
        lastErr = err;
        await pool.end().catch(() => {});
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw lastErr;
  };

  let retries = 10;
  let created = false;
  while (retries > 0 && !created) {
    let adminPool;
    try {
      adminPool = await connectWithRetry('postgres');
      
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
  const { setQueueServiceInstance } = require('../../src/services/queueService');
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
  setQueueServiceInstance(mockQueueService);
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

module.exports = {
  getMocks,
  get mockAIProvider() {
    return mockAIProvider;
  },
  get mockQueues() {
    return mockQueues;
  }
};
