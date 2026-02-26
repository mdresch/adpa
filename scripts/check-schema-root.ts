import { pool } from './server/src/database/connection'

async function checkSchema() {
    const client = await pool.connect()
    try {
        for (const table of ['resources', 'capacity_forecasts', 'risk_assessments']) {
            const result = await client.query(
                `SELECT column_name, is_nullable, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1 AND table_schema = 'public'`,
                [table]
            )
            console.log(`\n--- ${table} ---`)
            result.rows.forEach(r => console.log(`${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`))
        }
    } finally {
        client.release()
        await pool.end()
    }
}

checkSchema().catch(console.error)
