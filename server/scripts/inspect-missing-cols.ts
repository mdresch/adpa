import 'dotenv/config';
import { Pool } from 'pg';

async function inspectSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const tables = ['best_practices', 'lessons_learned', 'baselines', 'document_history'];
        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
            console.table(cols.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
