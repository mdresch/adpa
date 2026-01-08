
const db = require('../src/lib/db');
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verify() {
    try {
        console.log('Querying worker_heartbeats...');
        const res = await db.query("SELECT * FROM worker_heartbeats");
        console.log('Rows found:', res.rowCount);
        res.rows.forEach(row => {
            console.log(`Worker: ${row.worker_id}, PID: ${row.worker_process_id}, CPU: ${row.cpu_usage_percent}%, Mem: ${row.memory_usage_mb} MB, Last: ${row.last_heartbeat}`);
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        try { await db.end() } catch (e) {}
    }
}

verify();
