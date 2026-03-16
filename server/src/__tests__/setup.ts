const dotenv = require("dotenv")
dotenv.config({ path: ".env.test" })

import { connectDatabase, setInternalPool, getDatabasePool } from "../database/connection"
import { Pool, PoolClient } from "pg"

// Set test environment
(process.env as any).NODE_ENV = "test"
process.env.JWT_SECRET = "test-jwt-secret"
process.env.DB_PORT = "5433"
process.env.DB_USER = "test_user"
process.env.DB_PASSWORD = "test_pass"
process.env.DB_NAME = "adpa_test_db"

// Increase timeout for database operations
jest.setTimeout(30000)

let testPool: Pool | null = null
let currentClient: PoolClient | null = null

beforeAll(async () => {
  // Ensure we are using the test database
  console.log(`[TEST-SETUP] Connecting to test database: ${process.env.DB_NAME}`)
  try {
    await connectDatabase()
    testPool = getDatabasePool()
  } catch (err) {
    console.error("[TEST-SETUP] Failed to connect to test database:", err)
    throw err
  }
})

beforeEach(async () => {
  if (!testPool) throw new Error("Test pool not initialized")
  
  // Get a client for the transaction
  currentClient = await testPool.connect()
  
  // Start transaction
  await currentClient.query("BEGIN")
  
  // Inject the client as the internal pool
  // The Proxy in connection.ts will handle pool.query and pool.connect calls
  setInternalPool(currentClient)
})

afterEach(async () => {
  if (currentClient) {
    try {
      // Rollback transaction to ensure test isolation
      await currentClient.query("ROLLBACK")
    } catch (err) {
      console.warn("[TEST-SETUP] Rollback failed:", err)
    } finally {
      // Release client back to the pool
      currentClient.release()
      currentClient = null
    }
  }
  
  // Reset internal pool to the original pool
  if (testPool) {
    setInternalPool(testPool)
  }
})

afterAll(async () => {
  if (testPool) {
    await testPool.end()
  }
})
