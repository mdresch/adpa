import dotenv from 'dotenv'
import path from 'path'

// Load root .env.development
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') })

async function testImport() {
    try {
        console.log('Attempting to import { db } from ./lib/morphic/db...')
        const { db } = await import('./lib/morphic/db')
        console.log('✅ Import successful')
        
        console.log('Attempting a simple query using the db object...')
        // Try a simple count or select
        const result = await db.execute('SELECT NOW()')
        console.log('✅ Query successful:', result)
        process.exit(0)
    } catch (err: any) {
        console.error('❌ FAILED:', err)
        process.exit(1)
    }
}

testImport()
