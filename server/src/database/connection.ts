import dotenv from "dotenv"
// Only load .env if not in production (Railway injects env vars directly)
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

import { Pool } from "pg"
import { logger } from "../utils/logger"

// Check if DATABASE_URL is provided (Railway, Heroku, etc.)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

// Hybrid connection approach: try hostnames first, then IP addresses
const connectionMethods = [
  { host: process.env.DB_HOST || "localhost", description: `Environment hostname (${process.env.DB_HOST || 'localhost'})` },
  { host: "localhost", description: "Localhost fallback" },
  { host: "postgres", description: "PostgreSQL hostname (Docker)" },
  { host: "172.19.0.3", description: "PostgreSQL IP address (Docker)" }
]

const createPool = (host: string) => {
  // If DATABASE_URL is provided, use it directly
  if (databaseUrl && host === connectionMethods[0].host) {
    console.log('Using DATABASE_URL connection string')
    return new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('azure') || process.env.DB_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }
  
  // Otherwise use individual connection parameters
  return new Pool({
    host: host,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "adpa_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Reduced to 10 seconds per attempt for Railway
    // SSL configuration for Neon and other cloud providers
    ssl: host.includes('neon.tech') || host.includes('azure') || process.env.DB_SSL === "true" 
      ? { rejectUnauthorized: false } 
      : false,
  })
}

let pool: Pool | null = null // Initialize lazily to prevent hanging on module load

export async function connectDatabase() {
  const maxRetriesPerMethod = 1 // Reduced retries for Railway timeout
  const retryDelay = 3000 // Reduced to 3 seconds
  
  // Try each connection method
  for (const method of connectionMethods) {
    console.log(`🔌 Trying database connection via ${method.description}: ${method.host}`)
    
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
        
        const client = await Promise.race([
          testPool.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
        ]) as any
        logger.info("Database client acquired, testing connection...")
        await Promise.race([
          client.query("SELECT NOW()"),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 5000))
        ])
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
