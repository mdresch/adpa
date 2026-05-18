// Load environment variables

import { Pool } from "pg"
import type { PoolConfig } from "pg"
import { logger } from "../utils/logger"
import CircuitBreaker from "../utils/circuitBreaker"
import dns from "dns"
import { promisify } from "util"

const dnsLookup = promisify(dns.lookup)

/** Thrown when the DB circuit breaker is open — callers must not treat this as an empty result set. */
export class DatabaseCircuitOpenError extends Error {
  readonly code = "DB_CIRCUIT_OPEN" as const
  constructor() {
    super("Database temporarily unavailable (circuit open)")
    this.name = "DatabaseCircuitOpenError"
  }
}

// Helper to get current database URL (allows dynamic updates in tests)
const getDatabaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL

// timeouts and retry defaults can be configured via environment variables
const DEFAULT_DB_CONN_TIMEOUT_MS = parseInt(process.env.DB_CONN_TIMEOUT_MS || '60000', 10)
const DEFAULT_DB_QUERY_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT_MS || '15000', 10)
const DEFAULT_DB_MAX_RETRIES_PER_METHOD = parseInt(process.env.DB_MAX_RETRIES_PER_METHOD || '1', 10)
// Later code may bump these values when making manual connection attempts

// Connection methods for **non-DATABASE_URL** environments.
// IMPORTANT: Docker-specific hosts are intentionally **not** included because
// the ADPA project now uses Supabase/PostgreSQL directly (no Docker in dev).
// We only ever try the explicit DB_HOST (if set) and plain localhost.
const connectionMethods = [
  { host: process.env.DB_HOST || "localhost", description: `Environment hostname (${process.env.DB_HOST || 'localhost'})` },
  { host: "localhost", description: "Localhost fallback" }
]

const isTrustedPoolingProvider = (target?: string) =>
  !!target && (target.includes("supabase.co") || target.includes("supabase.com") || target.includes("azure"))

const shouldRejectUnauthorized = () => {
  // Default to strict TLS unless explicitly disabled for custom databases
  return process.env.ADPA_ALLOW_INSECURE_TLS === "true" ? false : true
}

/**
 * libpq-style ssl query params in the URL cause node-postgres to replace/ignore a merged `ssl`
 * object on the Pool, which breaks Supabase pooler TLS on some hosts (SELF_SIGNED_CERT_IN_CHAIN).
 * @see https://github.com/brianc/node-postgres/issues/2375
 */
function stripLibpqSslQueryParams(connectionUrl: URL): string {
  const u = new URL(connectionUrl.toString())
  for (const k of ["sslmode", "sslcert", "sslkey", "sslrootcert", "sslcrl"]) {
    u.searchParams.delete(k)
  }
  return u.toString()
}

export function buildSslConfig(target?: string) {
  if (isTrustedPoolingProvider(target)) {
    // Supabase/Azure with PgBouncer: certificate chain cannot be validated in dev environments
    return { rejectUnauthorized: false }
  }

  // Disable SSL for local connections
  const isLocal = target?.includes('localhost') || target?.includes('127.0.0.1')
  if (isLocal) {
    return false
  }

  if (process.env.DB_SSL === "true") {
    return { rejectUnauthorized: shouldRejectUnauthorized() }
  }

  return false
}

const createPool = (host: string) => {
  const currentDbUrl = getDatabaseUrl()
  // If DATABASE_URL is provided, use it directly
  if (currentDbUrl && host === connectionMethods[0].host) {
    console.log('Using DATABASE_URL connection string')
    let connStr = currentDbUrl
    try {
      connStr = stripLibpqSslQueryParams(new URL(currentDbUrl))
    } catch {
      /* keep raw string */
    }
    return new Pool({
      connectionString: connStr,
      ssl: buildSslConfig(currentDbUrl),
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  // Use local Docker credentials if host is localhost AND process.env.DB_HOST was different
  const isLocalFallback = host === 'localhost' && process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
  const user = isLocalFallback ? 'myuser' : (process.env.DB_USER || "postgres")
  const password = isLocalFallback ? 'mypassword' : (process.env.DB_PASSWORD || "password")
  const database = isLocalFallback ? 'adpa' : (process.env.DB_NAME || "adpa_db")

  if (isLocalFallback) {
    console.log(`🔧 Using Local Docker credentials for ${host} (${user})`)
  }

  // Otherwise use individual connection parameters
  return new Pool({
    host: host,
    port: Number(process.env.DB_PORT) || 5432,
    database: database,
    user: user,
    password: password,
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: buildSslConfig(host),
  })
}

let internalPool: Pool | null = null
let connectionPromise: Promise<void> | null = null

// Backward-compatible export for existing code that imports { pool }
// This provides lazy initialization - the pool getter will throw if accessed before connection
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    if (!internalPool) {
      throw new Error(`Database not connected. Property '${String(prop)}' accessed before connectDatabase() completed.`)
    }

    // Special handling for pool.connect() when internalPool is actually a transaction client
    if (prop === 'connect' && !(internalPool instanceof Pool)) {
      return async (callback?: (err: Error | null, client: any, release: () => void) => void) => {
        const mockClient = internalPool as any;
        const mockRelease = () => { /* no-op for transaction client */ };
        
        if (callback) {
          callback(null, mockClient, mockRelease);
          return;
        }
        
        // Return a client-like object that has a release method
        return Object.create(mockClient, {
          release: { value: mockRelease },
          query: { value: (text: any, params: any) => mockClient.query(text, params) }
        });
      };
    }

    return (internalPool as any)[prop]
  }
})

/**
 * For testing purposes: allows overriding the internal pool with a transaction client or a different pool.
 */
export function setInternalPool(p: Pool | any) {
  internalPool = p
}

export function getInternalPool(): Pool | null {
  return internalPool
}

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
          logger.warn('[DB-GUARD] Database circuit open - rejecting query', { sql: text, params })
          throw new DatabaseCircuitOpenError()
        }

        try {
          const res = await orig(text, params)
          // record success on any successful query
          dbBreaker.recordSuccess()
          return res
        } catch (err: any) {
          logger.error('[DB-GUARD] Unhandled pool.query error', { sql: text, params, message: err?.message, stack: err?.stack })
          // record failure and possibly open circuit
          dbBreaker.recordFailure()
          throw err // Re-throw to allow callers (like migration runner) to catch it
        }
      }
  } catch (err) {
    // ignore
  }
}

export function getDatabasePool(): Pool {
  if (!internalPool) {
    // Return a null object pattern instead of throwing to prevent crashes
    // Services should handle null pools gracefully
    console.warn('[DB-GUARD] getDatabasePool called but pool not ready yet')
    throw new Error("Database pool not initialized. Call connectDatabase() and await it before accessing the pool.")
  }
  return internalPool
}

// Safe accessor that won't throw
export function getDatabasePoolSafe(): Pool | null {
  return internalPool
}

export async function connectDatabase(): Promise<void> {
  // If a connection is already in progress, wait for it
  if (connectionPromise) {
    console.log('⏳ Database connection already in progress, waiting...')
    await connectionPromise
    return
  }

  // If already connected, return immediately
  if (internalPool) {
    console.log('✅ Database already connected, reusing existing pool')
    return
  }

  // Create a new connection promise
  connectionPromise = connectDatabaseInternal()
    .finally(() => {
      // Clear the promise once connection attempt completes
      connectionPromise = null
    })

  await connectionPromise
}

async function connectDatabaseInternal(): Promise<void> {
  // retry configuration: can be tuned via env vars (e.g. DB_MAX_RETRIES_PER_METHOD)
  const maxRetriesPerMethod = DEFAULT_DB_MAX_RETRIES_PER_METHOD
  const retryDelay = 3000 // 3 seconds

  const currentDbUrl = getDatabaseUrl()
  console.log(`🔍 DATABASE_URL check: ${currentDbUrl ? `Found (${currentDbUrl.substring(0, 30)}...)` : 'Not found'}`)
  console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV || 'undefined (defaulting to development)'}`)
  console.log(`🔧 DB config: connect timeout=${DEFAULT_DB_CONN_TIMEOUT_MS}ms, query timeout=${DEFAULT_DB_QUERY_TIMEOUT_MS}ms, max retries per method=${maxRetriesPerMethod}`)

  // If DATABASE_URL is provided, try it first
  if (currentDbUrl) {
    console.log(`🔌 Attempting connection via DATABASE_URL...`)
    for (let attempt = 1; attempt <= maxRetriesPerMethod; attempt++) {
      console.log(`🔌 Trying database connection via DATABASE_URL (attempt ${attempt}/${maxRetriesPerMethod})`)

      // Parse connection string to extract components
      // This allows us to force IPv4 by explicitly setting the family option
      let poolConfig: any = {
        ssl: buildSslConfig(currentDbUrl),
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: DEFAULT_DB_CONN_TIMEOUT_MS,
      }

      // Parse URL and handle IPv4/IPv6 resolution
      try {
        const dbUrl = new URL(currentDbUrl)

        // For Supabase, prefer connection pooler (port 6543) which has better IPv4 support
        // If using direct connection (port 5432), try to resolve to IPv4 first
        const isLocal = dbUrl.hostname === 'localhost' || dbUrl.hostname === '127.0.0.1'
        const isDirectConnection = dbUrl.port === '5432' || !dbUrl.port || isLocal || dbUrl.port === '5433'
        const isPoolerConnection =
          dbUrl.port === '6543' ||
          dbUrl.searchParams.has('pgbouncer') ||
          dbUrl.hostname.includes('pooler.supabase.com')

        // HARDENING: If it's a pooler connection and missing pgbouncer=true, add it!
        if (isPoolerConnection && !dbUrl.searchParams.has('pgbouncer')) {
          console.log('🔧 Auto-appending pgbouncer=true for transaction pooler compatibility')
          dbUrl.searchParams.set('pgbouncer', 'true')
        }

        if (isDirectConnection) {
          // Try to resolve to IPv4 for direct connections (Postgres port 5432)
          try {
            console.log(`🔧 Resolving direct connection ${dbUrl.hostname} via dns.lookup...`)
            const { address } = await dnsLookup(dbUrl.hostname, { family: 4 })

            if (address) {
              console.log(`✅ Resolved to IPv4: ${address}`)
              poolConfig = {
                ...poolConfig,
                host: address, 
                port: parseInt(dbUrl.port) || 5432,
                database: dbUrl.pathname.slice(1).split('?')[0],
                user: dbUrl.username,
                password: decodeURIComponent(dbUrl.password),
              }
              // Add pgbouncer if we detected it was needed but we are using parsed config
              if (isPoolerConnection) {
                poolConfig.connectionString = stripLibpqSslQueryParams(dbUrl)
              }
            }
          } catch (ipv4Error: any) {
            console.warn('⚠️  IPv4 resolution skipped/failed:', ipv4Error?.message)
            // Fallback: use connection string directly in the catch-all below
          }
        } else {
          // Transaction pooler (e.g. Supabase :6543 + pgbouncer): use the URL hostname as-is.
          // Do NOT substitute IPv4 into `host` while also passing `connectionString` — node-postgres
          // can end up with a broken TLS handshake (SELF_SIGNED_CERT_IN_CHAIN) on PaaS like Render.
          console.log(`🔧 Pooler (${dbUrl.hostname}:${dbUrl.port}): using connection string as-is (no IPv4 substitution)`)
          poolConfig.connectionString = stripLibpqSslQueryParams(dbUrl)
          poolConfig.ssl = buildSslConfig(currentDbUrl)
        }
        
        // Final sanity check: if advanced parsing didn't set a host, use the (potentially patched) URL string
        if (!poolConfig.host && !poolConfig.connectionString) {
          poolConfig.connectionString = stripLibpqSslQueryParams(dbUrl)
        }
      } catch (e: any) {
        // Ultimate Fallback: Just use the raw connectionString with our determined SSL config
        console.warn('⚠️  Advanced parsing failed or was bypassed, ensuring raw string use')
        try {
          poolConfig.connectionString = stripLibpqSslQueryParams(new URL(currentDbUrl))
        } catch {
          poolConfig.connectionString = currentDbUrl
        }
      }

      // Optimize pool size for Supabase (default 20 is safer for shared clusters)
      poolConfig.max = Number(process.env.PG_MAX) || 20

      const testPool = new Pool(poolConfig)

      // Increase max listeners to prevent MaxListenersExceededWarning
      // This can happen when multiple connection attempts are made
      testPool.setMaxListeners(20)

      // CRITICAL: attach error handler BEFORE connecting to prevent
      // 'Connection terminated unexpectedly' from becoming an uncaught
      // exception that crashes the process (Supabase wake-up scenario).
      testPool.on('error', (err) => {
        console.warn('[DB] testPool connection error (during startup probe):', err?.message)
      })

      try {
        console.log(`📡 Connecting to ${poolConfig.host || poolConfig.connectionString} as ${poolConfig.user}...`)
        const client = await Promise.race([
          testPool.connect(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Database connection timeout')), DEFAULT_DB_CONN_TIMEOUT_MS)
          )
        ])

        // Use a generous timeout for the probe query: Supabase free-tier projects pause
        // after inactivity and the first query after waking can take 20-30+ seconds.
        // We use nearly the full connection timeout here so the server doesn't crash-loop
        // while Supabase is resuming.
        const probeTimeout = Math.max(DEFAULT_DB_CONN_TIMEOUT_MS - 5000, 30000)
        await Promise.race([
          client.query("SELECT NOW()"),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), probeTimeout)
          )
        ])
        client.release()
        console.log(`✅ DATABASE_URL connection successful on attempt ${attempt}`)

        internalPool = testPool
        patchPoolQuery(internalPool)
        attachPoolErrorHandler(internalPool)
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

            const poolMax = (internalPool as any)?.options?.max || Number(process.env.PG_MAX) || 20

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
      } catch (error: any) {
        console.warn(`⚠️ DATABASE_URL attempt ${attempt} failed: ${error.message}`)
        logger.warn(`Database connection attempt ${attempt} failed via DATABASE_URL:`, {
          error: error?.message,
          code: error?.code
        })

        if (attempt < maxRetriesPerMethod) {
          logger.info(`Retrying database connection in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        } else {
          // Clean up the test pool before moving to fallback methods
          if (testPool) await testPool.end().catch(() => { })
        }
      }
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
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Database connection timeout')), 10000)
          )
        ])
        
        await Promise.race([
          client.query("SELECT NOW()"),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 5000)
          )
        ])
        client.release()

        // If successful, update the global pool and return
        internalPool = testPool
        patchPoolQuery(internalPool)
        attachPoolErrorHandler(internalPool)
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

export function getDbCircuitState(): string {
  try {
    return dbBreaker.getState()
  } catch {
    return 'unknown'
  }
}
