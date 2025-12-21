
import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function check() {
    try {
        console.log('Checking table existence...');
        const res = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'worker_heartbeats')");
        console.log('Table exists:', res.rows[0]);

        if (!res.rows[0].exists) {
            console.log('Creating table...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS worker_heartbeats (
                  worker_id TEXT PRIMARY KEY,
                  worker_process_id INTEGER NOT NULL,
                  queue_name TEXT NOT NULL,
                  cpu_usage_percent FLOAT NOT NULL,
                  memory_usage_mb FLOAT NOT NULL,
                  last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Table created.');
        }

        console.log('Creating index...');
        await pool.query("CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_heartbeat ON worker_heartbeats(last_heartbeat)");
        console.log('Index created.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
