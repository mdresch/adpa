const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findProcessingJobs() {
    try {
        const res = await pool.query("SELECT id, type, status, queued_at, progress FROM jobs WHERE status = 'processing'");
        console.log('Processing Jobs:', JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error('Query error:', err.message);
        process.exit(1);
    }
}

findProcessingJobs();
