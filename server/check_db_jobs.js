const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDatabaseJobs() {
    try {
        const res = await pool.query("SELECT id, type, status, queued_at FROM jobs WHERE status = 'pending' ORDER BY queued_at ASC LIMIT 10");
        console.log('Pending Jobs in DB:', res.rows);

        const statusCounts = await pool.query("SELECT status, count(*) FROM jobs GROUP BY status");
        console.log('Global Status Counts:', statusCounts.rows);

        await pool.end();
    } catch (err) {
        console.error('Database query error:', err.message);
    }
}

checkDatabaseJobs();
