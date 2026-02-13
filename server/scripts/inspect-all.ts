import 'dotenv/config';
import { Pool } from 'pg';

async function inspectAll() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const tables = ['best_practices', 'lessons_learned', 'baselines', 'document_history'];
        for (const table of tables) {
            console.log(`\n\n=== ${table.toUpperCase()} ===`);
            const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
            res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectAll();
