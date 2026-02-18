import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const isDevelopment = process.env.NODE_ENV === 'development'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
}

const sslConfig =
    process.env.DATABASE_SSL_DISABLED === 'true'
        ? false
        : process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false

declare global {
    var morphicPostgresClient: any
}

const client =
    globalThis.morphicPostgresClient ??
    postgres(connectionString, {
        ssl: sslConfig,
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
    schema
})

export type Schema = typeof schema
