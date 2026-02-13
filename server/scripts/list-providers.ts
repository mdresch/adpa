import 'dotenv/config';
import { Pool } from 'pg';

async function listProviders() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const result = await pool.query("SELECT * FROM ai_providers");
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

listProviders();
