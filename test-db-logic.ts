import * as dotenv from 'dotenv'
import path from 'path'
// Load root .env BEFORE importing anything that uses process.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Now import the DB
import { db } from './lib/morphic/db/index.ts'
import { sql } from 'drizzle-orm'

async function testLogic() {
    console.log('Testing DB logic with currently loaded environment...')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('DATABASE_SSL_DISABLED:', process.env.DATABASE_SSL_DISABLED)
    console.log('DB_SSL:', process.env.DB_SSL)
    console.log('MORPHIC_DB_SSL:', process.env.MORPHIC_DB_SSL)
    
    try {
        console.log('Attempting to execute SELECT NOW() via drizzle/db...')
        // Use the drizzle-wrapped db which uses the internal connection logic
        const result = await db.execute(sql`SELECT NOW()`)
        console.log('✅ Success! Result:', result)
    } catch (err: any) {
        console.error('❌ Failed using application DB logic:', err.message)
        if (err.stack) {
            console.error('Stack trace:', err.stack)
        }
    } finally {
        process.exit(0)
    }
}

testLogic()
