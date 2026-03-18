import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'
import * as relations from './relations'

const isDevelopment = process.env.NODE_ENV === 'development'

const connectionString = process.env.MORPHIC_DATABASE_URL
const isProduction = process.env.NODE_ENV === 'production'

if (!connectionString) {
    throw new Error('MORPHIC_DATABASE_URL environment variable is not set')
}

const sslConfig =
    process.env.DATABASE_SSL_DISABLED === 'true' || process.env.DB_SSL === 'false' || process.env.MORPHIC_DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: false }

// Force SSL for local development if not explicitly disabled
const finalSslConfig = isDevelopment && process.env.DATABASE_SSL_DISABLED !== 'true' 
    ? { rejectUnauthorized: false } 
    : sslConfig

declare global {
    var morphicPostgresClient: any
}

const client =
    globalThis.morphicPostgresClient ??
    postgres(connectionString, {
        ssl: finalSslConfig,
        prepare: false,
        max: isDevelopment ? 1 : 20,
        connect_timeout: 30,
        idle_timeout: 10,
        onnotice: () => { }
    })

if (isDevelopment && !globalThis.morphicPostgresClient) {
    globalThis.morphicPostgresClient = client
}

export const db = drizzle(client, {
    schema: { ...schema, ...relations }
})

export type Schema = typeof schema
