import dotenv from "dotenv"
import { Pool, PoolClient } from "pg"
import { setInternalPool } from "../database/connection"

// Load test environment variables
dotenv.config({ path: ".env.test", override: true })

// Ensure critical env vars are set properly for the entire test lifecycle
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-jwt-secret"

const shouldSkipDatabaseBootstrap = process.env.ADPA_SKIP_TEST_DB_BOOTSTRAP === "1"

/**
 * PRE-EMPTIVE POOL INITIALIZATION
 */
setInternalPool({
  query: () => { throw new Error("Database not ready: Query called before beforeAll completed.") },
  connect: () => { throw new Error("Database not ready: Connect called before beforeAll completed.") }
})

/**
 * Global mocks for background services.
 */

// Mock bcryptjs for speed
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockImplementation((pw) => Promise.resolve(`mocked-hash-${pw}`)),
  compare: jest.fn().mockImplementation((pw, hash) => Promise.resolve(hash === `mocked-hash-${pw}`)),
  genSalt: jest.fn().mockResolvedValue("mocked-salt"),
  getRounds: jest.fn().mockReturnValue(1)
}))

// Mock faker (ESM issue)
jest.mock("@faker-js/faker", () => ({
  faker: {
    internet: {
      email: jest.fn().mockImplementation(() => `auth-test-${Math.random()}@example.com`),
      userName: jest.fn().mockReturnValue('testuser'),
      password: jest.fn().mockReturnValue('password123')
    },
    person: {
      fullName: jest.fn().mockReturnValue('Test User')
    },
    string: {
      uuid: jest.fn().mockReturnValue('00000000-0000-0000-0000-000000000000')
    },
    company: {
        name: jest.fn().mockReturnValue('Test Company')
    },
    lorem: {
        paragraph: jest.fn().mockReturnValue('Test paragraph')
    },
    system: {
        fileName: jest.fn().mockReturnValue('test.txt')
    }
  }
}))

// Mock Email Service (very heavy)
jest.mock("../services/emailNotificationService", () => ({
  emailNotificationService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    getUsersByRoles: jest.fn().mockResolvedValue([]),
    sendPositiveDriftNotification: jest.fn().mockResolvedValue(true),
    sendBudgetOverrunAlert: jest.fn().mockResolvedValue(true),
    sendScopeCreepAlert: jest.fn().mockResolvedValue(true),
    testEmailConfiguration: jest.fn().mockResolvedValue(true)
  }
}))

// Mock Route Registry
jest.mock("../routes/registry", () => ({
  registerRoutes: jest.fn().mockResolvedValue(true),
  discoverRoutes: jest.fn().mockResolvedValue([])
}))

// Mock AI Connector
jest.mock("../modules/ai/openai", () => ({
  OpenAIConnector: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({ text: "mocked response" }),
    startRateLimitResetTimer: jest.fn()
  }))
}))

// Mock Signature Service
jest.mock("../services/signatureService", () => ({
  signatureService: {
    sign: jest.fn().mockResolvedValue({ success: true })
  }
}))

// Mock Analytics
jest.mock("../middleware/analyticsMiddleware", () => ({
  analyticsMiddleware: (req: any, res: any, next: any) => next(),
  trackActivity: {
    login: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(true),
    pageView: jest.fn().mockResolvedValue(true)
  }
}))

// Mock tracing
jest.mock("../tracing", () => ({
  initTracing: jest.fn()
}))

let testPool: Pool
let currentClient: PoolClient | null = null

beforeAll(async () => {
  if (shouldSkipDatabaseBootstrap) {
    jest.setTimeout(30000)
    return
  }

  const connectionString = 
    process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'test_user'}:${process.env.DB_PASSWORD || 'test_pass'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'adpa_test_db'}`
  
  console.log(`[TEST-SETUP] Connecting to test database: ${process.env.DB_NAME || 'adpa_test_db'}`)
  
  testPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  })

  try {
    const client = await testPool.connect()
    console.log(`[TEST-SETUP] Database connection verified.`)
    client.release()
    setInternalPool(testPool)
  } catch (err: any) {
    console.error(`[TEST-SETUP] FAILED to connect to database: ${err.message}`)
    throw err
  }
  
  jest.setTimeout(30000)
})

beforeEach(async () => {
  if (shouldSkipDatabaseBootstrap || !testPool) return
  currentClient = await testPool.connect()
  await currentClient.query("BEGIN")
  setInternalPool(currentClient)
})

afterEach(async () => {
  if (shouldSkipDatabaseBootstrap) {
    currentClient = null
    return
  }

  if (currentClient) {
    try {
      await currentClient.query("ROLLBACK")
    } catch (e) {
      // ignore
    } finally {
      currentClient.release()
      currentClient = null
    }
  }
  setInternalPool(testPool)
})

afterAll(async () => {
  if (testPool) {
    setInternalPool(null as any)
    await testPool.end()
    console.log(`[TEST-SETUP] Test pool closed.`)
  }

  try {
    const { shutdownQueues } = await import('../services/queueService')
    await shutdownQueues()
    console.log(`[TEST-SETUP] RabbitMQ queues closed.`)
  } catch (err) {
    console.error(`[TEST-SETUP] Failed to shutdown RabbitMQ queues`, err)
  }

  try {
    const { disconnectRedis } = await import('../utils/redis')
    await disconnectRedis()
    console.log("[TEST-SETUP] Redis disconnected.")
  } catch (err) {
    console.error("[TEST-SETUP] Failed to disconnect Redis", err)
  }
})
