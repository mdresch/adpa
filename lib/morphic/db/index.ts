import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'
import * as relations from './relations'

const isDevelopment = process.env.NODE_ENV === 'development'

const connectionString = process.env.MORPHIC_DATABASE_URL

// Helper to initialize the pool and db lazily
let lazyDb: any = null

function getDb() {
    if (lazyDb) return lazyDb

    if (!connectionString) {
        // During build time, we don't want to throw. We return a dummy or let it fail only when called.
        // If it's build time (NODE_ENV=production but no DB URL), we can return a proxy that logs or throws on actual use.
        if (process.env.NEXT_PHASE === 'phase-action-build' || !connectionString) {
             console.warn('[DB:INIT] MORPHIC_DATABASE_URL is missing. Database access will fail if called.')
        }
        
        // If we still don't have it and it's not build time, we should probably throw when actually used.
    }

    const sslConfig =
        process.env.DATABASE_SSL_DISABLED === 'true' || process.env.DB_SSL === 'false' || process.env.MORPHIC_DB_SSL === 'false'
            ? false
            : { rejectUnauthorized: false }

    // Force SSL for local development if not explicitly disabled or if remote host detected
    const isRemoteDb = connectionString?.includes('rlwy.net') || 
                       connectionString?.includes('supabase') || 
                       connectionString?.includes('pooler.supabase.com');
    const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');

    const finalSslConfig = (isRemoteDb || (isDevelopment && process.env.DATABASE_SSL_DISABLED !== 'true')) && !isLocal
        ? { rejectUnauthorized: false } 
        : sslConfig

    console.log(`[DB:INIT] Initializing pool. NODE_ENV=${process.env.NODE_ENV}, isRemoteDb=${isRemoteDb}`)

    const pool = new Pool({
        connectionString: connectionString || 'postgres://localhost:5432/placeholder',
        ssl: finalSslConfig,
        max: isDevelopment ? 5 : 20,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
    })

    lazyDb = drizzle(pool, {
        schema: { ...schema, ...relations }
    })
    return lazyDb
}

// Export a proxy as 'db' to maintain compatibility with existing imports
// We use a dummy initialization to capture the correct Drizzle type for the proxy
const _dummyDb = drizzle({} as any, { schema: { ...schema, ...relations } })
export type MorphicDb = typeof _dummyDb

export const db = new Proxy({} as any, {
    get(target, prop, receiver) {
        const instance = getDb()
        return Reflect.get(instance, prop, receiver)
    },
    apply(target, thisArg, argumentsList) {
        const instance = getDb()
        return Reflect.apply(instance as any, thisArg, argumentsList)
    }
}) as unknown as MorphicDb

export type Schema = typeof schema
