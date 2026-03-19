import dotenv from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Try to load .env first, then fall back to .env.development
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath })
console.log('Loading environment from:', envPath)

async function testConnection() {
    const connectionString = process.env.MORPHIC_DATABASE_URL
    console.log('Testing Morphic DB connection to:', connectionString ? connectionString.substring(0, 80) + '...' : 'UNDEFINED')
    
    if (!connectionString) {
        console.error('MORPHIC_DATABASE_URL is not set')
        process.exit(1)
    }

    try {
        console.log('\n--- Attempting WITHOUT SSL ---')
        const sql = postgres(connectionString, {
            ssl: false,
            connect_timeout: 10,
            onnotice: (notice) => console.log('Notice:', notice)
        })
        
        const result = await sql`SELECT NOW()`
        console.log('✅ Connection successful (No SSL):', result)
        await sql.end()
    } catch (err: any) {
        console.warn('❌ Connection failed (No SSL):', err.message)
    }

    try {
        console.log('\n--- Attempting WITH SSL (rejectUnauthorized: false) ---')
        const sqlSsl = postgres(connectionString, {
            ssl: { rejectUnauthorized: false },
            connect_timeout: 10,
            onnotice: (notice) => console.log('Notice:', notice)
        })
        const result = await sqlSsl`SELECT NOW()`
        console.log('✅ Connection successful (With SSL):', result)
        await sqlSsl.end()
    } catch (errSsl: any) {
        console.error('❌ Connection failed (With SSL):', errSsl.message)
    }
}

testConnection()
