import dotenv from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load root .env.development
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') })

async function testConnection() {
    const connectionString = process.env.MORPHIC_DATABASE_URL
    console.log('Testing Morphic DB connection to:', connectionString ? connectionString.substring(0, 50) + '...' : 'UNDEFINED')
    
    if (!connectionString) {
        console.error('MORPHIC_DATABASE_URL is not set')
        process.exit(1)
    }

    try {
        console.log('Attempting to connect...')
        const sql = postgres(connectionString, {
            ssl: false, // Try without SSL first
            connect_timeout: 10
        })
        
        const result = await sql`SELECT NOW()`
        console.log('✅ Connection successful (No SSL):', result)
        await sql.end()
    } catch (err: any) {
        console.warn('❌ Connection failed (No SSL):', err.message)
        
        try {
            console.log('Retrying with SSL (rejectUnauthorized: false)...')
            const sqlSsl = postgres(connectionString, {
                ssl: { rejectUnauthorized: false },
                connect_timeout: 10
            })
            const result = await sqlSsl`SELECT NOW()`
            console.log('✅ Connection successful (With SSL):', result)
            await sqlSsl.end()
        } catch (errSsl: any) {
            console.error('❌ Connection failed (With SSL):', errSsl.message)
        }
    }
}

testConnection()
