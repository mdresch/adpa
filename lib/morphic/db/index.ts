import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'
import * as relations from './relations'

const isDevelopment = process.env.NODE_ENV === 'development'

const connectionString = process.env.MORPHIC_DATABASE_URL

if (!connectionString) {
    throw new Error('MORPHIC_DATABASE_URL environment variable is not set')
}

const sslConfig =
    process.env.DATABASE_SSL_DISABLED === 'true' || process.env.DB_SSL === 'false' || process.env.MORPHIC_DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: false }

// Force SSL for local development if not explicitly disabled or if remote host detected
const isRemoteDb = connectionString.includes('rlwy.net') || 
                   connectionString.includes('supabase') || 
                   connectionString.includes('pooler.supabase.com');
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const finalSslConfig = (isRemoteDb || (isDevelopment && process.env.DATABASE_SSL_DISABLED !== 'true')) && !isLocal
    ? { rejectUnauthorized: false } 
    : sslConfig

console.log(`[DB:INIT] Using node-postgres. NODE_ENV=${process.env.NODE_ENV}, isRemoteDb=${isRemoteDb}, finalSslConfig=${JSON.stringify(finalSslConfig)}`)

declare global {
    var morphicPgPool: Pool | undefined
}

const pool =
    globalThis.morphicPgPool ??
    new Pool({
        connectionString,
        ssl: finalSslConfig,
        max: isDevelopment ? 5 : 20,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
    })

if (isDevelopment && !globalThis.morphicPgPool) {
    globalThis.morphicPgPool = pool
}

export const db = drizzle(pool, {
    schema: { ...schema, ...relations }
})

export type Schema = typeof schema
