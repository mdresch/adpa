import { connectDatabase, pool } from '@/server/src/database/connection'

export async function GET() {
    try {
        await connectDatabase()
        const result = await pool.query('SELECT 1 as connected')
        return Response.json({ 
            status: 'morphic-test-ok', 
            database: 'connected',
            result: result.rows[0],
            timestamp: new Date().toISOString() 
        })
    } catch (error: any) {
        return Response.json({ 
            status: 'morphic-test-error', 
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString() 
        }, { status: 500 })
    }
}
