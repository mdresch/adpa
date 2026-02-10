import dotenv from "dotenv"
// Only load .env if not in production (Railway injects env vars directly)

import { Pool } from "pg"
import type { PoolConfig } from "pg"
import { logger } from "../utils/logger"
import CircuitBreaker from "../utils/circuitBreaker"
import dns from "dns"
import { promisify } from "util"

const dnsResolve4 = promisify(dns.resolve4)

// Check if DATABASE_URL is provided (Railway, Heroku, etc.)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
console.log(`🔍 DATABASE_URL check: ${databaseUrl ? `Found (${databaseUrl.substring(0, 30)}...)` : 'Not found'}`)
console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`)

// Connection methods for **non-DATABASE_URL** environments.
// IMPORTANT: Docker-specific hosts are intentionally **not** included because
// the ADPA project now uses Supabase/PostgreSQL directly (no Docker in dev).
// We only ever try the explicit DB_HOST (if set) and plain localhost.
const connectionMethods = [
  { host: process.env.DB_HOST || "localhost", description: `Environment hostname (${process.env.DB_HOST || 'localhost'})` },
  { host: "localhost", description: "Localhost fallback" }
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
      max: 50,
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
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Reduced to 10 seconds per attempt for Railway
    // SSL configuration for Supabase and other cloud providers
    // Supabase/Azure: disable validation (PgBouncer connection pooling causes cert issues)
    ssl: buildSslConfig(host),
  })
}

let pool: Pool | null = null // Initialize lazily to prevent hanging on module load
// Circuit breaker for DB to avoid hammering DB when it's unstable
const dbBreaker = new CircuitBreaker(3, 30000) // open after 3 failures, reset after 30s

function attachPoolErrorHandler(p: Pool) {
  try {
    // Prevent unhandled 'error' events from crashing the process when an idle client disconnects.
    // This is common with poolers (e.g., Supabase PgBouncer/transaction pooler).
    p.on("error", (err: any) => {
      try {
        logger.error("[DB] Pool error event (idle client)", { message: err?.message })
      } catch {
        // ignore
      }
      try {
        dbBreaker.recordFailure()
      } catch {
        // ignore
      }
    })
  } catch {
    // ignore
  }
}

function patchPoolQuery(p: Pool) {
  try {
    const orig = (p as any).query.bind(p)
      ; (p as any).query = async (text: any, params?: any) => {
        // If circuit is open, short-circuit and return null so callers can handle service-unavailable
        if (dbBreaker.isOpen()) {
          logger.warn('[DB-GUARD] Database circuit open - short-circuiting query', { sql: text, params })
          return null
        }

        try {
          const res = await orig(text, params)
          // record success on any successful query
          dbBreaker.recordSuccess()
          return res
        } catch (err: any) {
          console.error('[DB-GUARD] Unhandled pool.query error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
          logger.error('[DB-GUARD] Unhandled pool.query error', { sql: text, params, message: err?.message, stack: err?.stack })
          // record failure and possibly open circuit
          dbBreaker.recordFailure()
          return null
        }
      }
  } catch (err) {
    // ignore
  }
}

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
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    }

    // Parse URL and handle IPv4/IPv6 resolution
    try {
      const dbUrl = new URL(databaseUrl)

      // For Supabase, prefer connection pooler (port 6543) which has better IPv4 support
      // If using direct connection (port 5432), try to resolve to IPv4 first
      const isDirectConnection = dbUrl.port === '5432' || !dbUrl.port
      const isPoolerConnection =
        dbUrl.port === '6543' ||
        dbUrl.searchParams.has('pgbouncer') ||
        dbUrl.hostname.includes('pooler.supabase.com')

      if (isDirectConnection) {
        // Try to resolve to IPv4 for direct connections
        try {
          console.log(`🔧 Resolving ${dbUrl.hostname} to IPv4 address (A records only)...`)
          const addresses = await dnsResolve4(dbUrl.hostname)

          if (addresses && addresses.length > 0) {
            const ipv4Address = addresses[0]
            console.log(`✅ Resolved to IPv4: ${ipv4Address}`)

            poolConfig = {
              ...poolConfig,
              host: ipv4Address, // Use resolved IPv4 address instead of hostname
              port: parseInt(dbUrl.port) || 5432,
              database: dbUrl.pathname.slice(1).split('?')[0],
              user: dbUrl.username,
              password: dbUrl.password,
            }
          } else {
            throw new Error(`No IPv4 addresses found for hostname: ${dbUrl.hostname}`)
          }
        } catch (ipv4Error: any) {
          // If IPv4 resolution fails, suggest using pooler instead
          console.warn('⚠️  Could not resolve hostname to IPv4:', ipv4Error?.message || ipv4Error)
          console.warn('💡 TIP: Use connection pooler (port 6543) for better IPv4 compatibility')
          console.warn('   Example: postgresql://postgres:password@host:6543/db?pgbouncer=true')

          // Fall through to use hostname (might resolve to IPv6)
          throw ipv4Error
        }
      } else {
        // For pooler connections, use hostname directly (pooler handles IPv4/IPv6)
        const poolerType = dbUrl.hostname.includes('pooler.supabase.com') ? 'Supabase Transaction Pooler' : 'Connection Pooler'
        console.log(`🔧 Using ${poolerType} (port ${dbUrl.port}) - using hostname directly`)
        console.log(`   Hostname: ${dbUrl.hostname}`)
        console.log(`   Username: ${dbUrl.username}`)
        poolConfig = {
          ...poolConfig,
          host: dbUrl.hostname,
          port: parseInt(dbUrl.port) || 6543,
          database: dbUrl.pathname.slice(1).split('?')[0],
          user: dbUrl.username,
          password: dbUrl.password,
        }
      }
    } catch (e: any) {
      // Fallback: Parse connection string manually
      console.warn('⚠️  Could not resolve hostname, parsing connectionString with SSL config:', e?.message || e)
      try {
        const dbUrl = new URL(databaseUrl)
        poolConfig = {
          host: dbUrl.hostname,
          port: parseInt(dbUrl.port) || 5432,
          database: dbUrl.pathname.slice(1).split('?')[0],
          user: dbUrl.username,
          password: dbUrl.password,
          ssl: buildSslConfig(databaseUrl),
          max: 50,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
        }
        console.log(`🔧 Using parsed connection with SSL to: ${dbUrl.hostname}:${dbUrl.port}`)
      } catch (parseError) {
        // Last resort: use connectionString as-is
        console.error('⚠️  Could not parse DATABASE_URL, using raw connectionString')
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
      // Patch pool.query to avoid unhandled promise rejections from direct calls
      try { patchPoolQuery(pool) } catch (e) { }
      try { attachPoolErrorHandler(pool) } catch (e) { }
      logger.info(`✅ Database connected successfully via DATABASE_URL`)

      // Diagnostic: estimate expected queue concurrency by scanning queueService.ts
      try {
        const fs = await import('fs')
        const path = await import('path')
        const queueFile = path.resolve(__dirname, '..', 'services', 'queueService.ts')
        if (fs.existsSync(queueFile)) {
          const content = fs.readFileSync(queueFile, 'utf8')
          // Match .process(<name>, <concurrency>, ...) where name can be quoted or template literal
          const processCallRegex = /\.process\(\s*(?:[`'"])[^`'"`]+(?:[`'"`])\s*,\s*(\d+)/g
          let match
          let total = 0
          let found = 0
          while ((match = processCallRegex.exec(content)) !== null) {
            const c = parseInt(match[1], 10)
            if (!Number.isNaN(c)) {
              total += c
              found++
            }
          }

          // Also count .process calls without explicit concurrency => default 1
          const processNoConcurrencyRegex = /\.process\(\s*(?:[`'"])[^`'"`]+(?:[`'"`])\s*,\s*async|\.process\(\s*(?:[`'"])[^`'"`]+(?:[`'"`])\s*,\s*\(/g
          const noConcurMatches = content.match(processNoConcurrencyRegex)
          const noConcurCount = noConcurMatches ? noConcurMatches.length : 0

          const expectedConcurrency = total + noConcurCount

          const poolMax = (pool as any)?.options?.max || Number(process.env.PG_MAX) || 20

          if (expectedConcurrency && poolMax < expectedConcurrency) {
            logger.warn(`[DB-CONCURRENCY] Pool max (${poolMax}) is less than estimated queue concurrency (${expectedConcurrency}).`)
            logger.warn('  Suggestion: reduce per-queue concurrency, split workers, or increase pool max in connection.ts or via env PG_MAX.')
          } else {
            logger.info(`[DB-CONCURRENCY] Pool max (${poolMax}) >= estimated queue concurrency (${expectedConcurrency}).`)
          }
        }
      } catch (diagErr) {
        logger.debug('Could not run DB concurrency diagnostic', { error: (diagErr as any).message })
      }
      return
    } catch (error) {
      console.error(`❌ DATABASE_URL connection error:`, error)
      logger.error(`Database connection via DATABASE_URL failed:`, {
        error: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      })

      // Quick-retry for self-signed certs / dev environments: retry with insecure TLS
      const errMsg = (error && (error.message || '')).toLowerCase()
      const shouldRetryInsecure = !!process.env.ADPA_ALLOW_INSECURE_TLS || errMsg.includes('self-signed') || errMsg.includes('self signed') || errMsg.includes('certificate')
      if (shouldRetryInsecure) {
        try {
          logger.warn('Retrying DATABASE_URL connection with insecure TLS (ADPA_ALLOW_INSECURE_TLS) due to certificate error')
          const insecurePoolConfig = { ...poolConfig, ssl: { rejectUnauthorized: false } }
          const insecurePool = new Pool(insecurePoolConfig)
          insecurePool.setMaxListeners(20)

          const client = await Promise.race([
            insecurePool.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout (insecure retry)')), 30000))
          ]) as any

          await Promise.race([
            client.query("SELECT NOW()"),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout (insecure retry)')), 15000))
          ])
          client.release()

          pool = insecurePool
          try { patchPoolQuery(pool) } catch (e) { }
          try { attachPoolErrorHandler(pool) } catch (e) { }
          logger.info('✅ Database connected successfully via DATABASE_URL (insecure TLS)')
          return
        } catch (insecureErr) {
          logger.error('Retry with insecure TLS failed:', insecureErr?.message || insecureErr)
          try { await insecureErr?.end?.() } catch (e) { }
        }
      }

      await testPool.end().catch(() => { })
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
        try { patchPoolQuery(pool) } catch (e) { }
        try { attachPoolErrorHandler(pool) } catch (e) { }
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
    await testPool.end().catch(() => { })
  }

  // If all methods failed
  logger.error("All database connection methods failed")
  throw new Error("Unable to connect to database using any available method")
}

export { pool }

export function getDbCircuitState() {
  try {
    return dbBreaker.getState()
  } catch (e) {
    return 'unknown'
  }
}
