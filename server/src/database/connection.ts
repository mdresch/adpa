import dotenv from "dotenv"
// Only load .env if not in production (Railway injects env vars directly)
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

import { Pool } from "pg"
import type { PoolConfig } from "pg"
import { logger } from "../utils/logger"
import dns from "dns"
import { promisify } from "util"

const dnsResolve4 = promisify(dns.resolve4)

// Check if DATABASE_URL is provided (Railway, Heroku, etc.)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
console.log(`🔍 DATABASE_URL check: ${databaseUrl ? `Found (${databaseUrl.substring(0, 30)}...)` : 'Not found'}`)
console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`)

// Hybrid connection approach: try hostnames first, then IP addresses
const connectionMethods = [
  { host: process.env.DB_HOST || "localhost", description: `Environment hostname (${process.env.DB_HOST || 'localhost'})` },
  { host: "localhost", description: "Localhost fallback" },
  { host: "postgres", description: "PostgreSQL hostname (Docker)" },
  { host: "172.19.0.3", description: "PostgreSQL IP address (Docker)" }
]

const isTrustedPoolingProvider = (target?: string) =>
  !!target && (target.includes("supabase.co") || target.includes("azure"))

const shouldRejectUnauthorized = () => {
  // Default to strict TLS unless explicitly disabled for custom databases
  return process.env.ADPA_ALLOW_INSECURE_TLS === "true" ? false : true
}

export function buildSslConfig(target?: string) {
  if (isTrustedPoolingProvider(target)) {
    // Supabase/Azure with PgBouncer: certificate chain cannot be validated in dev environments
    return { rejectUnauthorized: false }
  }

  if (process.env.DB_SSL === "true") {
    return { rejectUnauthorized: shouldRejectUnauthorized() }
  }

  return false
}

const createPool = (host: string) => {
  // If DATABASE_URL is provided, use it directly
  if (databaseUrl && host === connectionMethods[0].host) {
    console.log('Using DATABASE_URL connection string')
    return new Pool({
      connectionString: databaseUrl,
      // SSL configuration for Supabase/Azure:
      // - Supabase uses PgBouncer (connection pooler) which causes cert chain issues
      // - Disable cert validation for Supabase (trusted provider)
      // - For custom databases, enable validation unless explicitly disabled
      ssl: buildSslConfig(databaseUrl),
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
    // SSL configuration for Supabase and other cloud providers
    // Supabase/Azure: disable validation (PgBouncer connection pooling causes cert issues)
    ssl: buildSslConfig(host),
  })
}

let pool: Pool | null = null // Initialize lazily to prevent hanging on module load

export function getDatabasePool(): Pool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call connectDatabase() before accessing the pool.")
  }
  return pool
}

export async function connectDatabase() {
  const maxRetriesPerMethod = 1 // Reduced retries for Railway timeout
  const retryDelay = 3000 // Reduced to 3 seconds
  
  // If DATABASE_URL is provided, try it first
  if (databaseUrl) {
    console.log(`🔌 Trying database connection via DATABASE_URL`)
    
    // Parse connection string to extract components
    // This allows us to force IPv4 by explicitly setting the family option
    let poolConfig: PoolConfig & { family?: number } = {
      ssl: buildSslConfig(databaseUrl),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    }
    
    // Parse URL and manually resolve to IPv4
    try {
      const dbUrl = new URL(databaseUrl)
      
      // Manually resolve hostname to IPv4 address using dns.resolve4 (queries A records only)
      console.log(`🔧 Resolving ${dbUrl.hostname} to IPv4 address (A records only)...`)
      const addresses = await dnsResolve4(dbUrl.hostname)
      
      // Validate that DNS resolution returned at least one IPv4 address
      if (!addresses || addresses.length === 0) {
        throw new Error(`No IPv4 addresses found for hostname: ${dbUrl.hostname}`)
      }
      
      const ipv4Address = addresses[0] // Use first IPv4 address
      console.log(`✅ Resolved to IPv4: ${ipv4Address}`)
      
      poolConfig = {
        ...poolConfig,
        host: ipv4Address, // Use resolved IPv4 address instead of hostname
        port: parseInt(dbUrl.port) || 5432,
        database: dbUrl.pathname.slice(1).split('?')[0],
        user: dbUrl.username,
        password: dbUrl.password,
      }
    } catch (e: any) {
      // Fallback: Parse connection string manually to apply SSL config and force IPv4
      console.warn('⚠️  Could not resolve hostname to IPv4, parsing connectionString with SSL config and IPv4 forcing:', e?.message || e)
      try {
        const dbUrl = new URL(databaseUrl)
        poolConfig = {
          host: dbUrl.hostname,
          port: parseInt(dbUrl.port) || 5432,
          database: dbUrl.pathname.slice(1).split('?')[0],
          user: dbUrl.username,
          password: dbUrl.password,
          ssl: buildSslConfig(databaseUrl),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        }
        console.log(`🔧 Using parsed connection with SSL and IPv4 forcing (rejectUnauthorized: false) to: ${dbUrl.hostname}`)
      } catch (parseError) {
        // Last resort: use connectionString as-is with IPv4 forcing
        console.error('⚠️  Could not parse DATABASE_URL, using raw connectionString with IPv4 forcing')
        poolConfig.connectionString = databaseUrl
      }
    }
    
    const testPool = new Pool(poolConfig)
    
    // Increase max listeners to prevent MaxListenersExceededWarning
    // This can happen when multiple connection attempts are made
    testPool.setMaxListeners(20)
    
    try {
      const client = await Promise.race([
        testPool.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 30000)) // Increased to 30s
      ]) as any
      await Promise.race([
        client.query("SELECT NOW()"),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 15000)) // Increased to 15s
      ])
      client.release()
      
      pool = testPool
      logger.info(`✅ Database connected successfully via DATABASE_URL`)
      return
    } catch (error) {
      console.error(`❌ DATABASE_URL connection error:`, error)
      logger.error(`Database connection via DATABASE_URL failed:`, { 
        error: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      })
      await testPool.end().catch(() => {})
    }
  }
  
  // Try each connection method as fallback
  for (const method of connectionMethods) {
    console.log(`🔌 Trying database connection via ${method.description}: ${method.host}`)
    
    // Create a new pool for this connection method
    const testPool = createPool(method.host)
    
    // Increase max listeners to prevent MaxListenersExceededWarning
    testPool.setMaxListeners(20)
    
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
