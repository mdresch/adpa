import 'dotenv/config';
import { Pool } from 'pg';

async function run() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    const tables = ['best_practices', 'lessons_learned'];
    for (const table of tables) {
        console.log('TABLE:', table);
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
        console.log(res.rows.map(r => r.column_name));
    }
    await pool.end();
}
run();
