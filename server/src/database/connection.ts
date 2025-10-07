import dotenv from "dotenv"
dotenv.config()

import { Pool } from "pg"
import { logger } from "../utils/logger"

// Hybrid connection approach: try hostnames first, then IP addresses
const connectionMethods = [
  { host: "postgres", description: "PostgreSQL hostname" },
  { host: process.env.DB_HOST || "postgres", description: "Environment hostname" },
  { host: "172.19.0.3", description: "PostgreSQL IP address" }
]

const createPool = (host: string) => {
  return new Pool({
    host: host,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "adpa_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000, // 60 seconds per attempt
    // acquireTimeoutMillis: 60000,    // 60 seconds per attempt - not available in this version
    // SSL can be enabled by setting DB_SSL=true. Many managed Postgres services require SSL.
    // When enabled we default to rejectUnauthorized: false to allow self-signed certs in dev.
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  })
}

let pool = createPool(connectionMethods[0].host) // Start with IP address

export async function connectDatabase() {
  const maxRetriesPerMethod = 5
  const retryDelay = 10000 // 10 seconds
  
  // Try each connection method
  for (const method of connectionMethods) {
    logger.info(`Trying database connection via ${method.description}: ${method.host}`)
    
    // Create a new pool for this connection method
    const testPool = createPool(method.host)
    
    for (let attempt = 1; attempt <= maxRetriesPerMethod; attempt++) {
      try {
        logger.info(`Attempting to connect to database (attempt ${attempt}/${maxRetriesPerMethod}) via ${method.description}...`, {
          host: method.host,
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || "adpa_db",
          user: process.env.DB_USER || "postgres",
          timeout: "30 seconds"
        })
        
        const client = await testPool.connect()
        logger.info("Database client acquired, testing connection...")
        await client.query("SELECT NOW()")
        client.release()
        
        // If successful, update the global pool and return
        pool = testPool
        logger.info(`Database connection established successfully via ${method.description}`)
        return
      } catch (error) {
        logger.warn(`Database connection attempt ${attempt} failed via ${method.description}:`, {
          error: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        })
        
        if (attempt < maxRetriesPerMethod) {
          logger.info(`Retrying database connection in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    
    // Clean up the test pool
    await testPool.end().catch(() => {})
  }
  
  // If all methods failed
  logger.error("All database connection methods failed")
  throw new Error("Unable to connect to database using any available method")
}

export { pool }
