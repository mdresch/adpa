import { connectDatabase } from '@/server/src/database/connection'

export async function GET() {
    try {
        const db = await connectDatabase()
        const result = await db.execute('SELECT 1 as connected')
        return Response.json({ 
            status: 'morphic-test-ok', 
            database: 'connected',
            result,
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
